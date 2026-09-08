/**
 * Fifteen people, each using the whole app their own way, on every live resort.
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
import { serve, launch, newPage, toForm, solve, routeCount, openRoute, openLegs, reachNext, atRest, multiTouch } from "./harness.mjs";
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

/**
 * Open the places-to-swing-by row and pick one, by node key or by what is at
 * it. Returns what was picked, or null if the resort offers nothing.
 *
 * Five of the people below use this, so it lives here: a persona that has to
 * know the markup of a disclosure row is a persona that breaks when the row
 * is restyled, which is not what these journeys are for.
 */
async function swingBy(page, { key, withFood } = {}) {
  await toForm(page);
  const row = await page.$(".disclose");
  if (!row) return null;
  if ((await row.getAttribute("aria-expanded")) === "false") await row.click();
  await page.waitForSelector("#p-via", { timeout: 8000 });
  const options = await page.$$eval("#p-via option", (ns) =>
    ns.filter((n) => n.value && !n.disabled).map((n) => ({ v: n.value, t: n.textContent })));
  if (!options.length) return null;
  const pick =
    (key && options.find((o) => o.v === key)) ||
    (withFood && options.find((o) => o.t.includes(" — "))) ||
    options[0];
  await page.selectOption("#p-via", pick.v);
  await page.waitForSelector(".viachip", { timeout: 8000 });
  return pick;
}

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
        /*
         * Either honest reason will do. On a mountain with no linked blue at
         * all the answer names the grade; on one where there is some but not
         * four hours of it, the answer is about the terrain and the clock.
         * Asserting the first alone read a correct message as a failure the
         * moment a resort gained enough blue to change which one applies.
         */
        check(`${resort.id}: ${this.who} is told why in words she would use`,
          /blue|terrain|enough/i.test(body) && !/NaN|undefined/.test(body),
          body.replace(/\s+/g, " ").slice(0, 80));
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
      for (const chip of ["Shorter", "Longer", "Harder", "More vertical", "Lunch"]) {
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
  /* ---- the five who use what was built last ------------------------- */
  {
    id: "lunchstop",
    who: "wants to stop somewhere on the way",
    at: [9, 15],
    async run(page, url, index, resort) {
      await arrive(page, url, index);
      const pick = await swingBy(page, { withFood: true });
      check(`${resort.id}: ${this.who} is offered somewhere to swing by`, Boolean(pick),
        pick ? pick.t : "nothing in the picker");
      if (!pick) return;
      // The row has to say how many even closed, or a day with a stop in it
      // looks like a day without one.
      const count = await page.$eval(".disclose__n", (n) => n.textContent.trim());
      check(`${resort.id}: ${this.who} can see it is set`, /1 of 3/.test(count), count);
      await screen(page, this.who, "plan with a stop");
      await solve(page);
      let n = await routeCount(page);
      // A mountain that cannot take it in must say which place — and then the
      // fix it offers has to work. Either outcome is a pass; a dead end is not.
      if (!n) {
        const said = (await page.$(".empty"))
          ? await page.$eval(".empty", (e) => e.innerText.replace(/\n+/g, " "))
          : "";
        const named = pick.t.split(" — ")[0];
        check(`${resort.id}: ${this.who} is told which place is the problem`,
          said.includes(named), said.slice(0, 90) || "nothing said");
        const fix = await takeAFix(page);
        n = fix?.routes ?? 0;
        check(`${resort.id}: ${this.who} is offered a way out of it`, n > 0,
          fix ? `${fix.label} → ${n} routes` : "no fix offered");
        return;
      }
      check(`${resort.id}: ${this.who} gets a day that goes past it`, n > 0, `${n} routes`);
      await openRoute(page);
      await page.waitForSelector(".sheet__foot .btn", { timeout: 15000 });
      await screen(page, this.who, "route through a stop");
      await openLegs(page);
      const s2 = await screen(page, this.who, "legs");
      check(`${resort.id}: ${this.who} can read the day leg by leg`,
        (await page.$$(".leg")).length > 3 && !/NaN|undefined/.test(s2.text),
        `${(await page.$$(".leg")).length} legs`);
    },
  },
  {
    id: "threestops",
    who: "wants three stops and is told when that is too many",
    at: [9, 0],
    async run(page, url, index, resort) {
      await arrive(page, url, index);
      let last = null;
      for (let i = 0; i < 4; i++) last = (await swingBy(page)) ?? last;
      const chips = (await page.$$(".viachip")).length;
      // Three is the cap, and the fourth tap must be refused visibly rather
      // than silently dropped: a select that swallows a choice reads as broken.
      check(`${resort.id}: ${this.who} is held to three`, chips > 0 && chips <= 3, `${chips} chosen`);
      if (chips === 3) {
        const shut = await page.$eval("#p-via", (n) => n.disabled);
        check(`${resort.id}: ${this.who} sees the picker close rather than ignore her`, shut === true);
        const why = await page.$eval(".via .note", (n) => n.textContent.trim());
        check(`${resort.id}: ${this.who} is told why`, /most/i.test(why), why.slice(0, 60));
      }
      // Taking one off has to work, and has to be a real tap target.
      const x = await page.$(".viachip__x");
      check(`${resort.id}: ${this.who} can take one off again`, Boolean(x));
      if (x) {
        const box = await x.boundingBox();
        check(`${resort.id}: ${this.who} can hit it with a glove on`,
          box && box.height >= 44, box ? `${Math.round(box.width)}x${Math.round(box.height)}` : "no box");
        await x.click();
        await page.waitForTimeout(200);
        check(`${resort.id}: ${this.who} sees it go`, (await page.$$(".viachip")).length === chips - 1);
      }
      await screen(page, this.who, "plan with stops");
      await solve(page);
      const n = await routeCount(page);
      if (!n) {
        const fix = await takeAFix(page);
        check(`${resort.id}: ${this.who} is never left without a way forward`, (fix?.routes ?? 0) > 0,
          fix ? `${fix.label}` : "no fix offered");
      } else {
        check(`${resort.id}: ${this.who} gets her day`, n > 0, `${n} routes`);
      }
    },
  },
  {
    id: "changedstart",
    who: "changes where she is starting from after choosing a stop",
    at: [10, 0],
    async run(page, url, index, resort) {
      await arrive(page, url, index);
      const pick = await swingBy(page);
      if (!pick) { check(`${resort.id}: ${this.who} has somewhere to swing by`, false, "nothing offered"); return; }
      /*
       * Then she sets the start TO that place.
       *
       * The plan outlives the form. A stop that has become the start is
       * satisfied before the day begins, draws as a second pin under the
       * first, and for one of the two-node names came back as "you cannot get
       * to Alagna on red" to somebody standing in Alagna.
       */
      const keys = await page.$$eval("#p-start option", (ns) => ns.map((n) => n.value));
      if (keys.includes(pick.v)) {
        await page.selectOption("#p-start", pick.v);
        await page.waitForTimeout(250);
        check(`${resort.id}: ${this.who} does not end up starting at her own stop`,
          (await page.$$(".viachip")).length === 0,
          `${(await page.$$(".viachip")).length} left`);
      } else {
        check(`${resort.id}: ${this.who} finds her stop among the starts`, false,
          `${pick.v} is not offered as a start`);
      }
      await screen(page, this.who, "plan after moving the start");
      await solve(page);
      let n = await routeCount(page);
      if (!n) { const f = await takeAFix(page); n = f?.routes ?? 0; }
      check(`${resort.id}: ${this.who} still gets a day`, n > 0, `${n} routes`);
    },
  },
  {
    id: "numberwatcher",
    who: "follows the numbers on the mountain rather than the words",
    at: [9, 30],
    async run(page, url, index, resort) {
      // maptest, because the numbers are painted on a canvas and there is
      // nothing else to assert against.
      await page.goto(`${url}?maptest=1`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector(".hero", { timeout: 20000 });
      (await page.$$(".hero"))[index].click();
      await page.click("text=Go skiing");
      await page.waitForSelector(".planbtn", { timeout: 20000 });
      await plan(page, { ability: "Blue and red" });
      let n = await routeCount(page);
      if (!n) { const f = await takeAFix(page); n = f?.routes ?? 0; }
      if (!n) { check(`${resort.id}: ${this.who} has a day to look at`, false, "no routes"); return; }

      const badges = () => page.evaluate(() => (window.__skisStepBadges ?? []).map((b) => b.step));
      await atRest(page, { quiet: 600, limit: 16000 });
      check(`${resort.id}: ${this.who} sees numbers before she has picked one`,
        (await badges()).length > 0, `${(await badges()).length} numbers`);

      await openRoute(page);
      await page.waitForSelector(".sheet__foot .btn", { timeout: 15000 });
      await atRest(page, { quiet: 700, limit: 16000 });
      const onRoute = await badges();
      check(`${resort.id}: ${this.who} sees them on the route too`, onRoute.length > 0,
        `${onRoute.length} numbers`);
      check(`${resort.id}: ${this.who} finds step one among them`, onRoute.includes(1),
        onRoute.slice(0, 8).join(", "));

      // And the list she can look them up in agrees, one to one.
      await openLegs(page);
      const numbers = await page.$$eval(".leg__n", (ns) => ns.map((x) => Number(x.textContent)));
      const legs = (await page.$$(".leg")).length;
      check(`${resort.id}: ${this.who} can look a number up in the list`,
        numbers.length === legs && numbers.every((x, i) => x === i + 1),
        `1..${numbers[numbers.length - 1]} over ${legs} legs`);
      check(`${resort.id}: every number on the map is in the list`,
        onRoute.every((x) => x >= 1 && x <= legs),
        `highest badge ${Math.max(...onRoute)} against ${legs} legs`);

      await page.click('[aria-label="Back to the map"]');
      await page.waitForSelector(".detail__legs", { timeout: 15000 });
      await page.click("text=/Save and start/");
      await page.waitForSelector(".nav__head", { timeout: 20000 });
      await atRest(page, { quiet: 700, limit: 16000 });
      const navving = await badges();
      check(`${resort.id}: ${this.who} still has a number while navigating`, navving.length > 0,
        navving.join(", "));
      /*
       * And only the ones either side of her.
       *
       * A ski day loops through its own base, so the first leg out of Stafal
       * used to put seventeen numbers on the screen — 27 through 59, from
       * three hours later — because that is where their geometry lands.
       */
      check(`${resort.id}: ${this.who} is not shown numbers from hours later`,
        navving.length <= 3, `${navving.length} numbers: ${navving.join(", ")}`);
      // The instruction is the one thing read at arm's length in flat light.
      // Two lines are allowed; a cut-off name is not.
      const cut = await page.$eval(".nav__do", (h) => ({
        text: h.textContent.trim(),
        over: h.scrollHeight > h.clientHeight + 2,
      }));
      check(`${resort.id}: ${this.who} can read the whole instruction`, !cut.over, cut.text);
      await screen(page, this.who, "navigating");
    },
  },
  {
    id: "driver",
    who: "looks up where the car is before setting off",
    at: [15, 30],
    async run(page, url, index, resort) {
      await page.goto(`${url}?maptest=1`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector(".hero", { timeout: 20000 });
      (await page.$$(".hero"))[index].click();
      await page.click("text=Go skiing");
      await page.waitForSelector(".planbtn", { timeout: 20000 });
      // In close, which is where the car parks and the huts are.
      for (let i = 0; i < 8; i++) {
        const zoom = await page.$('.maptools .iconbtn[aria-label="Zoom in"]');
        if (!zoom) break;
        await zoom.click();
      }
      await atRest(page, { quiet: 600, limit: 16000 });
      const marks = await page.evaluate(() =>
        (window.__skisPlaces ?? []).map((p) => ({ full: p.full, x: Math.round(p.x), y: Math.round(p.y) })));
      check(`${resort.id}: ${this.who} finds something to tap`, marks.length > 0, `${marks.length} markers`);
      if (!marks.length) return;

      /*
       * The label is short; the card is not.
       *
       * "Parcheggio Riservato Klein Finnland" lay across three pistes at
       * navigation zoom. The category words come off for the marker and the
       * card keeps the full name, because the card is where you check you
       * have got the right place.
       */
      const drawn = await page.evaluate(() =>
        (window.__skisPlaceLabels ?? []).map((l) => l.name));
      check(`${resort.id}: ${this.who} reads no car-park boilerplate on the mountain`,
        drawn.every((nm) => !/^(Parcheggio|Parkplatz|Parkhaus|Parking|Car park)\b/i.test(nm)),
        drawn.filter((nm) => /^(Parcheggio|Parkplatz|Parking)/i.test(nm)).join(", ") ||
          `${drawn.length} labels, all short`);

      const m = marks[0];
      await multiTouch(page, [[[m.x, m.y]]], { settle: 30 });
      await page.waitForTimeout(600);
      const card = await page.$(".placecard");
      check(`${resort.id}: ${this.who} can open one`, Boolean(card));
      if (!card) return;
      check(`${resort.id}: ${this.who} sees the full name on the card`,
        (await page.$eval(".placecard__n", (n) => n.textContent.trim())) === m.full,
        await page.$eval(".placecard__n", (n) => n.textContent.trim()));
      // Never four lines. The card floats over the mountain it is describing.
      const box = await card.boundingBox();
      check(`${resort.id}: ${this.who} is not handed a paragraph`, box && box.height <= 104,
        box ? `${Math.round(box.height)}px tall` : "no box");
      const link = await page.$eval(".placecard__go", (a) => ({
        href: a.getAttribute("href"),
        target: a.getAttribute("target"),
        rel: a.getAttribute("rel") || "",
      }));
      check(`${resort.id}: ${this.who} gets a Google Maps link that will open`,
        /^https:\/\/(www\.)?google\.[a-z.]+\/maps/.test(link.href), link.href);
      check(`${resort.id}: ${this.who} does not lose the app to it`,
        link.target === "_blank" && /noreferrer/.test(link.rel), `${link.target} ${link.rel}`);
      const go = await page.$(".placecard__go");
      const gbox = await go.boundingBox();
      check(`${resort.id}: ${this.who} can hit the link with a glove on`,
        gbox && gbox.height >= 44, gbox ? `${Math.round(gbox.width)}x${Math.round(gbox.height)}` : "no box");
      await screen(page, this.who, "place card");
    },
  },
];

const { url } = await serve();
const browser = await launch();

console.log(`\n${PEOPLE.length} PEOPLE, ${LIVE.length} RESORTS\n`);
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
