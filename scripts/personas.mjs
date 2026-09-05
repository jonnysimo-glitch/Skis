/**
 * Ten people, each using the whole app their own way, on every live resort.
 *
 * The other suites test the product a behaviour at a time. This one tests it a
 * person at a time: open the app cold, pick a mountain, plan the day you
 * actually came to ski, choose between what is offered, read it, ski it, and
 * see it written down afterwards. A journey can fail in ways no single check
 * catches — a screen that never arrives, a number that reads NaN three screens
 * after the thing that produced it, an image that does not load, a dead end
 * with no way out.
 *
 * Every persona records the same four things at every step: where the app took
 * them, whether anything on screen is broken text, whether every image
 * actually loaded, and whether the page threw. Run with npm run personas.
 */
import { serve, launch, newPage, toForm, solve, routeCount, openRoute, openLegs, reachNext } from "./harness.mjs";
import { RESORTS } from "../src/resorts/index.js";

const LIVE = RESORTS.filter((r) => r.available);
const ONLY = (process.argv.find((a) => a.startsWith("--only=")) || "").slice(7).toLowerCase();

let failures = 0;
let checks = 0;
const note = [];
function check(name, ok, detail = "") {
  checks++;
  if (!ok) failures++;
  console.log(`    ${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
}

/**
 * Everything that can be wrong with a screen without anything throwing.
 *
 * Broken text is the one that matters most: "NaN m" and "undefined" look
 * authoritative and are the fastest way to lose a user's trust in the numbers.
 */
const inspect = (page) => page.evaluate(() => {
  const text = document.body.innerText;
  const broken = text.match(/\bNaN\b|\bundefined\b|\bnull\b|\[object |Infinity/g) || [];
  const images = [...document.querySelectorAll("img")].map((i) => ({
    src: i.currentSrc || i.src,
    ok: i.complete && i.naturalWidth > 0,
  }));
  // A control with no accessible name is a button nobody can describe.
  const unnamed = [...document.querySelectorAll("button, a")]
    .filter((b) => b.offsetParent !== null)
    .filter((b) => !(b.textContent || "").trim() && !b.getAttribute("aria-label"))
    .length;
  // Text wider than its box is text somebody cannot read.
  // Not the screen-reader-only headings: those are a 1px box on purpose, and
  // "clipped" is exactly what they are meant to be.
  const clipped = [...document.querySelectorAll("h1, .title, .btn, .routecard__nm, .row, .leg__nm")]
    .filter((e) => e.offsetParent !== null && !e.closest(".visually-hidden"))
    .filter((e) => !e.classList.contains("visually-hidden"))
    .filter((e) => e.scrollWidth > e.clientWidth + 2)
    .map((e) => (e.textContent || "").trim().slice(0, 32));
  return { broken: [...new Set(broken)], images, unnamed, clipped, text };
});

async function screen(page, persona, where) {
  const s = await inspect(page);
  const bad = s.images.filter((i) => !i.ok).map((i) => i.src.split("/").pop());
  if (s.broken.length) note.push(`${persona} / ${where}: broken text ${s.broken.join(", ")}`);
  if (bad.length) note.push(`${persona} / ${where}: image did not load ${bad.join(", ")}`);
  if (s.unnamed) note.push(`${persona} / ${where}: ${s.unnamed} control(s) with no name`);
  if (s.clipped.length) note.push(`${persona} / ${where}: text clipped "${s.clipped[0]}"`);
  return s;
}

/** Home, cold, on the resort at `index`. */
async function arrive(page, url, index) {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".hero", { timeout: 20000 });
  const heroes = await page.$$(".hero");
  await heroes[index].click();
  await page.click("text=Go skiing");
  await page.waitForSelector(".planbtn", { timeout: 20000 });
}

const plan = async (page, { t0, t1, ability, also, start, finish }) => {
  await toForm(page);
  if (start) await page.selectOption("#p-start", start);
  if (finish) await page.selectOption("#p-finish", finish);
  if (t0) await page.fill("#p-t0", t0);
  if (t1) await page.fill("#p-t1", t1);
  if (ability) {
    for (const chip of await page.$$('.chips[aria-label="Ability"] .chip')) {
      if ((await chip.evaluate((n) => n.textContent)).trim() === ability) { await chip.click(); break; }
    }
  }
  if (also) {
    const extra = await page.$(`.chip:text-is("${also}")`);
    if (extra) await extra.click();
  }
  await solve(page);
};

/** Take the first offered fix, if there is one. Returns what it led to. */
async function takeAFix(page) {
  const fixes = await page.$$(".fixlist button");
  if (!fixes.length) return null;
  const label = (await fixes[0].evaluate((n) => n.innerText)).split("\n")[0];
  await fixes[0].click();
  await page.waitForSelector(".routecard, .empty", { timeout: 25000 });
  return { label, routes: await routeCount(page) };
}

const PEOPLE = [
  {
    id: "nightbefore",
    who: "plans tomorrow from the sofa",
    at: [21, 30],
    async run(page, url, index, resort) {
      await arrive(page, url, index);
      await screen(page, this.who, "resort");
      await plan(page, { ability: "Blue and red" });
      let n = await routeCount(page);
      if (!n) { const f = await takeAFix(page); n = f?.routes ?? 0; }
      check(`${resort.id}: ${this.who} gets somewhere to start`, n > 0, `${n} routes`);
      if (!n) return;
      await openRoute(page);
      await page.waitForSelector(".sheet__foot .btn", { timeout: 15000 });
      await screen(page, this.who, "route");
      await page.click("text=/Save and start/");
      await page.waitForSelector(".nav", { timeout: 20000 });
      check(`${resort.id}: ${this.who} can start the day she saved`, (await page.$(".nav")) !== null);
    },
  },
  {
    id: "firstlift",
    who: "is at the first lift",
    at: [8, 20],
    async run(page, url, index, resort) {
      await arrive(page, url, index);
      await plan(page, { ability: "Blue and red" });
      let n = await routeCount(page);
      if (!n) { const f = await takeAFix(page); n = f?.routes ?? 0; }
      check(`${resort.id}: ${this.who} is offered a day`, n > 0, `${n} routes`);
      if (!n) return;
      // Reads the numbers before committing, which is the whole point of the
      // options page.
      const cards = await page.$$eval(".routecard", (c) => c.map((x) => x.textContent));
      check(`${resort.id}: ${this.who} can compare them on their numbers`,
        cards.every((t) => /km/.test(t) && /\d/.test(t)), `${cards.length} cards`);
      await screen(page, this.who, "options");
    },
  },
  {
    id: "midday",
    who: "is stranded at 2pm",
    at: [14, 0],
    async run(page, url, index, resort) {
      await arrive(page, url, index);
      // The flagship case: ninety minutes, and the car is somewhere else.
      await toForm(page);
      const starts = await page.$$eval("#p-start option", (o) => o.map((x) => x.value));
      const finishes = await page.$$eval("#p-finish option", (o) => o.map((x) => x.value));
      const start = starts[Math.min(6, starts.length - 1)];
      const finish = finishes[0];
      await plan(page, { t0: "14:00", t1: "15:30", ability: "Blue and red", start, finish });
      const n = await routeCount(page);
      const empty = (await page.$(".empty")) !== null;
      check(`${resort.id}: ${this.who} gets an answer either way`, n > 0 || empty,
        n ? `${n} routes` : "an honest empty state");
      if (empty) {
        const fixed = await takeAFix(page);
        check(`${resort.id}: ${this.who} is offered a way on`, fixed !== null,
          fixed ? `${fixed.label} -> ${fixed.routes} routes` : "no fix offered");
      }
      await screen(page, this.who, "ninety minutes");
    },
  },
  {
    id: "beginner",
    who: "has only ever skied blues",
    at: [9, 30],
    async run(page, url, index, resort) {
      await arrive(page, url, index);
      await plan(page, { t0: "10:00", t1: "14:00", ability: "Blue" });
      const n = await routeCount(page);
      const empty = (await page.$(".empty")) !== null;
      check(`${resort.id}: ${this.who} is never left with nothing said`, n > 0 || empty,
        n ? `${n} routes` : "empty state");
      if (empty) {
        const body = await page.$eval(".empty", (e) => e.textContent);
        check(`${resort.id}: ${this.who} is told why in words she would use`,
          /blue/i.test(body) && !/NaN|undefined/.test(body), body.replace(/\s+/g, " ").slice(0, 80));
        const fixed = await takeAFix(page);
        check(`${resort.id}: ${this.who} is given something that works`,
          fixed === null || fixed.routes > 0 || (await page.$(".fixlist button")) !== null,
          fixed ? `${fixed.label} -> ${fixed.routes} routes` : "no fix");
      }
      await screen(page, this.who, "blue only");
    },
  },
  {
    id: "expert",
    who: "wants the biggest day on the hill",
    at: [8, 45],
    async run(page, url, index, resort) {
      await arrive(page, url, index);
      await plan(page, { t0: "09:00", t1: "16:00", ability: "Anything" });
      let n = await routeCount(page);
      if (!n) { const f = await takeAFix(page); n = f?.routes ?? 0; }
      check(`${resort.id}: ${this.who} gets a day`, n > 0, `${n} routes`);
      if (!n) return;
      await openRoute(page);
      await page.waitForSelector(".sheet__foot .btn", { timeout: 15000 });
      await openLegs(page);
      const legs = await page.$$eval(".leg", (l) => l.length);
      const s = await screen(page, this.who, "every leg");
      check(`${resort.id}: ${this.who} can read every leg of it`, legs > 4, `${legs} legs`);
      check(`${resort.id}: ${this.who} sees a real descent figure`,
        /\d[\d,]*\s*m/.test(s.text) && !/NaN/.test(s.text));
    },
  },
  {
    id: "lunch",
    who: "is skiing with the family and wants lunch",
    at: [9, 0],
    async run(page, url, index, resort) {
      await arrive(page, url, index);
      await plan(page, { t0: "09:30", t1: "15:30", ability: "Blue and red", also: "Sit-down lunch" });
      let n = await routeCount(page);
      if (!n) { const f = await takeAFix(page); n = f?.routes ?? 0; }
      check(`${resort.id}: ${this.who} gets a day with lunch in it`, n > 0, `${n} routes`);
      if (!n) return;
      const said = await page.$eval(".page__body", (b) => b.textContent);
      check(`${resort.id}: ${this.who} is told lunch is accounted for`,
        /lunch/i.test(said), said.replace(/\s+/g, " ").match(/[^.]*lunch[^.]*/i)?.[0]?.slice(0, 70) ?? "no mention");
      await screen(page, this.who, "with lunch");
    },
  },
  {
    id: "refiner",
    who: "never likes the first answer",
    at: [9, 15],
    async run(page, url, index, resort) {
      await arrive(page, url, index);
      await plan(page, { t0: "09:30", t1: "15:00", ability: "Blue and red" });
      if (!(await routeCount(page))) await takeAFix(page);
      if (!(await routeCount(page))) { check(`${resort.id}: ${this.who} has something to refine`, false, "no routes"); return; }
      let stuck = null;
      for (const chip of ["Shorter", "Longer", "Harder", "More vertical", "No drags"]) {
        const el = await page.$(`.sectionrule .chip:text-is("${chip}")`);
        if (!el || (await el.isDisabled())) continue;
        await el.click();
        await page.waitForTimeout(900);
        const onForm = (await page.$("#p-t1")) !== null;
        if (onForm) { stuck = chip; break; }
        // Undo, so each chip is tested from a clean state.
        const off = await page.$(`.sectionrule .chip:text-is("${chip}")`);
        if (off && !(await off.isDisabled())) { await off.click(); await page.waitForTimeout(700); }
      }
      check(`${resort.id}: ${this.who} is never thrown back to the form`, stuck === null,
        stuck ? `"${stuck}" did` : "every chip re-solved in place");
      await screen(page, this.who, "refining");
    },
  },
  {
    id: "browser",
    who: "wants to see each day on the mountain first",
    at: [9, 0],
    async run(page, url, index, resort) {
      await arrive(page, url, index);
      await plan(page, { t0: "09:15", t1: "15:15", ability: "Anything" });
      if (!(await routeCount(page))) await takeAFix(page);
      const cards = await page.$$(".routecard__body");
      check(`${resort.id}: ${this.who} has more than one to look at`, cards.length >= 2,
        `${cards.length} cards`);
      for (let i = 0; i < Math.min(3, cards.length); i++) {
        await (await page.$$(".routecard__body"))[i].click();
        await page.waitForTimeout(500);
      }
      const active = await page.$$eval(".routecard--active", (c) => c.length);
      check(`${resort.id}: ${this.who} always has exactly one selected`, active === 1, `${active} selected`);
      await screen(page, this.who, "browsing");
    },
  },
  {
    id: "offline",
    who: "loses signal on the chairlift",
    at: [9, 0],
    async run(page, url, index, resort) {
      await arrive(page, url, index);
      await plan(page, { t0: "09:30", t1: "14:30", ability: "Blue and red" });
      if (!(await routeCount(page))) await takeAFix(page);
      if (!(await routeCount(page))) { check(`${resort.id}: ${this.who} has a day to save`, false, "no routes"); return; }
      await openRoute(page);
      await page.waitForSelector(".sheet__foot .btn", { timeout: 15000 });
      await page.click("text=/Save and start/");
      await page.waitForSelector(".nav", { timeout: 20000 });
      await page.context_.setOffline(true);
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForTimeout(2500);
      const s = await screen(page, this.who, "with the radio off");
      check(`${resort.id}: ${this.who} still has the app`, /\w/.test(s.text) && s.text.length > 40,
        `${s.text.length} characters on screen`);
      check(`${resort.id}: ${this.who} still has the mountain`, (await page.$("canvas")) !== null);
      await page.context_.setOffline(false);
    },
  },
  {
    id: "finisher",
    who: "skis the whole day and looks at it afterwards",
    at: [9, 0],
    async run(page, url, index, resort) {
      await arrive(page, url, index);
      await plan(page, { t0: "09:30", t1: "12:00", ability: "Blue and red" });
      if (!(await routeCount(page))) await takeAFix(page);
      if (!(await routeCount(page))) { check(`${resort.id}: ${this.who} has a day to ski`, false, "no routes"); return; }
      await openRoute(page);
      await page.waitForSelector(".sheet__foot .btn", { timeout: 15000 });
      await page.click("text=/Save and start/");
      await page.waitForSelector(".nav", { timeout: 20000 });
      for (let i = 0; i < 200; i++) if (!(await reachNext(page))) break;
      const finish = await page.$('button:has-text("Finish")');
      check(`${resort.id}: ${this.who} reaches the end of it`, finish !== null);
      if (!finish) return;
      await finish.click();
      await page.waitForTimeout(900);
      const s = await screen(page, this.who, "summary");
      check(`${resort.id}: ${this.who} is told how the day went`,
        /down at|back at|\d/i.test(s.text) && !/NaN|undefined/.test(s.text),
        s.text.replace(/\s+/g, " ").slice(0, 70));
      // And it is written down.
      for (const tab of await page.$$(".tabbar__tab")) {
        if (/stats/i.test(await tab.evaluate((n) => n.textContent))) { await tab.click(); break; }
      }
      await page.waitForTimeout(700);
      const stats = await screen(page, this.who, "stats");
      check(`${resort.id}: ${this.who} finds the day in her record`,
        /\d/.test(stats.text) && !/NaN|undefined/.test(stats.text),
        stats.text.replace(/\s+/g, " ").slice(0, 70));
    },
  },
];

const { url } = await serve();
const browser = await launch();

console.log(`\nTEN PEOPLE, ${LIVE.length} RESORTS\n`);
for (const [index, resort] of LIVE.entries()) {
  console.log(`\n${resort.name.toUpperCase()}`);
  for (const person of PEOPLE) {
    if (ONLY && !person.id.includes(ONLY)) continue;
    console.log(`  ${person.who}`);
    const page = await newPage(browser, { at: person.at });
    try {
      await person.run(page, url, index, resort);
    } catch (error) {
      check(`${resort.id}: ${person.who} gets through the app`, false, String(error).split("\n")[0].slice(0, 110));
    }
    const errors = page.errors.filter(Boolean);
    check(`${resort.id}: ${person.who} sees no error`, errors.length === 0, errors.slice(0, 2).join(" | "));
    await page.context_.close();
  }
}

await browser.close();

if (note.length) {
  console.log(`\nWHAT THEY SAW THAT THEY SHOULD NOT HAVE (${note.length})`);
  for (const n of [...new Set(note)]) console.log(`  ${n}`);
}
console.log(`\n${failures ? `${failures} FAILING of ${checks}` : `all ${checks} journeys held up`}`);
process.exit(failures || note.length ? 1 : 0);
