/**
 * Thirty-one people, each using the whole app their own way, on every live
 * resort.
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
import { serve, launch, newPage, toForm, solve, routeCount, openRoute, openLegs, reachNext, atRest, multiTouch, openTools, zoomBy } from "./harness.mjs";
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
async function swingBy(page, { key, withFood, eat, junction } = {}) {
  await toForm(page);
  const row = await page.$(".disclose");
  if (!row) return null;
  if ((await row.getAttribute("aria-expanded")) === "false") await row.click();
  await page.waitForSelector("#p-via", { timeout: 8000 });
  const options = await page.$$eval("#p-via option", (ns) =>
    ns.filter((n) => n.value && !n.disabled).map((n) => ({ v: n.value, t: n.textContent })));
  if (!options.length) return null;
  /*
   * `junction` rather than a caller reading the options itself.
   *
   * The one caller that wanted a node key read `#p-via` to find one and
   * passed the result as an argument to this function — which is evaluated
   * before this function runs, and therefore before the row it lives in has
   * been opened. It never found the element and the journey never ran. Asking
   * for the kind you want is the version of that which cannot be ordered
   * wrongly.
   */
  const pick =
    (key && options.find((o) => o.v === key)) ||
    (junction && options.find((o) => !o.v.startsWith("eat:"))) ||
    (eat && options.find((o) => o.v.startsWith("eat:"))) ||
    (withFood && options.find((o) => o.t.includes(" — "))) ||
    options[0];
  await page.selectOption("#p-via", pick.v);
  await page.waitForSelector(".viachip", { timeout: 8000 });
  return pick;
}

/** Turn the sit-down lunch chip on, if this mode offers one. */
async function withLunch(page) {
  await toForm(page);
  const chip = await page.$('.chip:text-is("Sit-down lunch")');
  if (!chip) return false;
  if ((await chip.getAttribute("aria-pressed")) !== "true") await chip.click();
  return true;
}

/**
 * All the way to the navigation screen on the resort at `index`, with the
 * maptest hooks on.
 *
 * Four of the people below start here, because what they came to look at is
 * the follow camera and there are seven taps in front of it. A persona that
 * spells those out is a persona that breaks when a button moves, which is not
 * what these journeys are for. Reports its own failure and leaves the page on
 * whatever screen it got stuck on, so the caller can bail without a second
 * message about the same thing.
 */
async function toNav(page, url, index, resort, who) {
  await page.goto(`${url}?maptest=1`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".hero", { timeout: 20000 });
  (await page.$$(".hero"))[index].click();
  await page.click("text=Go skiing");
  await page.waitForSelector(".planbtn", { timeout: 20000 });
  await plan(page, {});
  if (!(await routeCount(page))) await takeAFix(page);
  if (!(await routeCount(page))) {
    check(`${resort.id}: ${who} has a day to ski`, false, "no routes");
    return false;
  }
  await openRoute(page);
  await page.waitForSelector(".sheet__foot .btn", { timeout: 15000 });
  await page.click("text=/Save and start/");
  await page.waitForSelector(".nav__head", { timeout: 25000 });
  await atRest(page, { quiet: 700, limit: 16000 });
  return true;
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
      /*
       * Four taps, and the fourth has to be refused. `selectOption` on a
       * disabled select waits for it to become enabled and then times out
       * after thirty seconds, which is the check passing and the harness
       * failing — so the loop asks whether the picker is still open first.
       */
      for (let i = 0; i < 4; i++) {
        const shut = await page.$eval("#p-via", (n) => n.disabled).catch(() => false);
        if (shut) break;
        last = (await swingBy(page)) ?? last;
      }
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
      /*
       * A junction, not a place to eat.
       *
       * The point of this journey is setting the START to the stop she picked,
       * and the start picker offers node keys. An `eat:` id is not one — it
       * resolves to one — so asking for it there is asking the wrong question.
       */
      const pick = await swingBy(page, { junction: true });
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
       * The ones either side of her, and then a sequence.
       *
       * A ski day loops through its own base, so the first leg out of Stafal
       * puts legs 27 to 52 of the same day on the ground in front of her.
       * This used to demand no more than three numbers in total, which was
       * the old hard window — the leg behind, the leg on, the leg ahead — and
       * that window was deliberately replaced: the numbers further up the day
       * are the shape of what is coming, and a reader wants to see it.
       *
       * What must not happen is the pile: nineteen numbers in a 480 m frame,
       * eighteen of them from three hours later, which is what the stride of 1
       * at this framing produced before NAV_FAR_STRIDE. So the rule to check
       * is the rule as built — everything near her, and anything past the
       * lookahead only every fifth — and separately that the frame is not
       * crowded whatever the arithmetic says.
       */
      const later = navving.filter((n) => n > navving[0] + 2);
      check(`${resort.id}: ${this.who} reads the ones from later as a sequence`,
        later.every((n) => n % 5 === 0), navving.join(", "));
      check(`${resort.id}: ${this.who} is not shown a pile of them`,
        navving.length <= 8, `${navving.length} numbers: ${navving.join(", ")}`);
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
      /*
       * In close, which is where the car parks and the huts are — and the
       * tools have to be opened first or the zoom button is not rendered at
       * all. Without that this broke out of the loop on the first pass, read
       * the place tier at the opening framing where it is deliberately empty,
       * and reported "0 markers" as though the pins had gone.
       */
      await openTools(page);
      const zoomed = await zoomBy(page, 8, "in");
      check(`${resort.id}: ${this.who} can actually zoom in`, zoomed === 8,
        `${zoomed} of 8 taps landed`);
      await atRest(page, { quiet: 600, limit: 16000 });
      /*
       * And back off until there is something in shot.
       *
       * Eight taps of zoom-in from the opening framing lands on whatever
       * happens to be under the middle of the screen, and on two of the four
       * resorts that is empty ground: the check read "0 markers" about an app
       * whose markers were fine and a few hundred metres off frame. A person
       * looking for the car park does not stand there reading an empty
       * screen, they pull back until they can see something — so that is what
       * this does, and the claim is that the places are findable rather than
       * that they are under one particular pixel.
       */
      const places = () => page.evaluate(() =>
        (window.__skisPlaces ?? []).map((p) => ({ full: p.full, x: Math.round(p.x), y: Math.round(p.y) })));
      let marks = await places();
      for (let i = 0; i < 5 && !marks.length; i++) {
        if (!(await zoomBy(page, 1, "out"))) break;
        await atRest(page, { quiet: 600, limit: 16000 });
        marks = await places();
      }
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
  /* ---- the ten who use what was built this round -------------------- */
  {
    id: "lunchnamed",
    who: "asks for lunch and expects to be told where",
    at: [9, 15],
    async run(page, url, index, resort) {
      await arrive(page, url, index);
      const has = await withLunch(page);
      check(`${resort.id}: ${this.who} finds the lunch option`, has === true);
      if (!has) return;
      await solve(page);
      if (!(await routeCount(page))) await takeAFix(page);
      if (!(await routeCount(page))) { check(`${resort.id}: ${this.who} has a day`, false, "no routes"); return; }
      await openRoute(page);
      await page.waitForSelector(".sheet__foot .btn", { timeout: 15000 });
      await openLegs(page);
      const stop = await page.$(".leg--stop");
      check(`${resort.id}: ${this.who} sees the stop in the itinerary`, Boolean(stop),
        stop ? (await stop.innerText()).replace(/\n/g, " | ") : "no lunch row");
      if (stop) {
        const said = (await stop.innerText()).replace(/\n/g, " ");
        // A stop with no name is the thing this replaced.
        check(`${resort.id}: ${this.who} is told which place`,
          /Lunch at \S/.test(said) && !/NaN|undefined/.test(said), said.slice(0, 70));
      }
      const notes = await page.$$eval(".info", (ns) => ns.map((n) => n.innerText.replace(/\n/g, " ")));
      const line = notes.find((n) => /Lunch at/.test(n));
      check(`${resort.id}: ${this.who} reads it under the route too`, Boolean(line),
        line ? line.slice(0, 90) : notes.join(" / ").slice(0, 90));
      /*
       * And the clocks take the sit-down.
       *
       * They did not: backAt added the forty-five minutes at the end, so the
       * finish was right and every leg after lunch was three-quarters of an
       * hour early — which showed up as a lunch row and the next leg both
       * reading 12:21.
       */
      const rows = await page.$$eval(".leg", (ns) => ns.map((n) => ({
        stop: n.classList.contains("leg--stop"),
        t: n.querySelector(".leg__t")?.textContent?.trim() ?? "",
      })));
      const at = rows.findIndex((r) => r.stop);
      if (at > 0 && at < rows.length - 1) {
        const mins = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
        const gap = mins(rows[at + 1].t) - mins(rows[at].t);
        check(`${resort.id}: ${this.who} is not asked to eat in no time at all`,
          gap >= 40, `${gap} minutes between the stop and the next leg`);
      }
      await screen(page, this.who, "legs with lunch");
    },
  },
  {
    id: "byname",
    who: "picks the rifugio by name",
    at: [9, 30],
    async run(page, url, index, resort) {
      await arrive(page, url, index);
      const pick = await swingBy(page, { eat: true });
      check(`${resort.id}: ${this.who} can choose a place to eat by name`,
        Boolean(pick) && pick.v.startsWith("eat:"), pick ? pick.t : "nothing offered");
      if (!pick) return;
      const chip = await page.$eval(".viachip", (n) => n.innerText.replace(/\n/g, " | "));
      check(`${resort.id}: ${this.who} sees which station it is at`, chip.includes("|"), chip);
      await solve(page);
      let n = await routeCount(page);
      if (!n) {
        const said = (await page.$(".empty"))
          ? await page.$eval(".empty", (e) => e.innerText.replace(/\n+/g, " "))
          : "";
        // Named, not "nothing fits" — and the name has to be the one she chose.
        check(`${resort.id}: ${this.who} is told which place is the problem`,
          said.includes(pick.t.split(" — ")[0]), said.slice(0, 100));
        n = (await takeAFix(page))?.routes ?? 0;
        check(`${resort.id}: ${this.who} is offered a way on`, n > 0);
        return;
      }
      check(`${resort.id}: ${this.who} gets a day through it`, n > 0, `${n} routes`);
      await screen(page, this.who, "chosen by name");
    },
  },
  {
    id: "twoandlunch",
    who: "wants two stops and lunch as well",
    at: [9, 0],
    async run(page, url, index, resort) {
      await arrive(page, url, index);
      await swingBy(page, { eat: true });
      await swingBy(page);
      await withLunch(page);
      const chips = (await page.$$(".viachip")).length;
      check(`${resort.id}: ${this.who} can hold both`, chips >= 1, `${chips} stops`);
      await screen(page, this.who, "plan with two stops and lunch");
      await solve(page);
      let n = await routeCount(page);
      if (!n) {
        const f = await takeAFix(page);
        n = f?.routes ?? 0;
        check(`${resort.id}: ${this.who} is never left at a dead end`, n > 0,
          f ? f.label : "no fix offered");
        return;
      }
      check(`${resort.id}: ${this.who} gets a day`, n > 0, `${n} routes`);
    },
  },
  {
    id: "nodrags",
    who: "goes looking for the drag-lift switch",
    at: [10, 0],
    async run(page, url, index, resort) {
      await arrive(page, url, index);
      await toForm(page);
      const body = await page.$eval("body", (n) => n.innerText);
      check(`${resort.id}: ${this.who} does not find it on the form`,
        !/drag lift/i.test(body), (body.match(/.{0,24}drag lift.{0,24}/i) || ["gone"])[0]);
      await solve(page);
      if (!(await routeCount(page))) await takeAFix(page);
      const chips = await page.$$eval(".chips .chip, .chip", (ns) => ns.map((n) => n.textContent.trim()));
      check(`${resort.id}: ${this.who} does not find it among the refine chips`,
        !chips.some((c) => /drag/i.test(c)), chips.join(", ").slice(0, 90));
      check(`${resort.id}: ${this.who} still has the chips that matter`,
        chips.some((c) => /Shorter/i.test(c)) && chips.some((c) => /Lunch/i.test(c)),
        chips.join(", ").slice(0, 90));
    },
  },
  {
    id: "readsform",
    who: "reads the plan form top to bottom",
    at: [9, 30],
    async run(page, url, index, resort) {
      await arrive(page, url, index);
      await toForm(page);
      /*
       * The order is the order a day is decided in: where and when, then what
       * you are happy on, then anywhere you want to go past, then the extras.
       * Places to swing by used to sit below the extras, which read as an
       * afterthought.
       */
      const order = await page.evaluate(() =>
        [...document.querySelectorAll(".flabel, .disclose__t")]
          .filter((n) => n.offsetParent !== null)
          .map((n) => n.textContent.trim()));
      const at = (re) => order.findIndex((t) => re.test(t));
      check(`${resort.id}: ${this.who} is asked where before what`,
        at(/^Start$|You are at/) < at(/Comfortable on/), order.join(" → ").slice(0, 110));
      check(`${resort.id}: ${this.who} finds the stops under Comfortable on`,
        at(/Comfortable on/) >= 0 && at(/Places to swing by/) > at(/Comfortable on/),
        order.join(" → ").slice(0, 130));
      check(`${resort.id}: ${this.who} finds the extras last`,
        at(/^Also$/) === -1 || at(/^Also$/) > at(/Places to swing by/),
        order.join(" → ").slice(0, 130));
      await screen(page, this.who, "plan form");
    },
  },
  {
    id: "pullsback",
    who: "pulls back while navigating to see the whole day",
    at: [9, 30],
    async run(page, url, index, resort) {
      await page.goto(`${url}?maptest=1`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector(".hero", { timeout: 20000 });
      (await page.$$(".hero"))[index].click();
      await page.click("text=Go skiing");
      await page.waitForSelector(".planbtn", { timeout: 20000 });
      await plan(page, { ability: "Blue and red" });
      if (!(await routeCount(page))) await takeAFix(page);
      if (!(await routeCount(page))) { check(`${resort.id}: ${this.who} has a day`, false, "no routes"); return; }
      await openRoute(page);
      await page.waitForSelector(".sheet__foot .btn", { timeout: 15000 });
      await page.click("text=/Save and start/");
      await page.waitForSelector(".nav__head", { timeout: 25000 });
      await atRest(page, { quiet: 700, limit: 16000 });
      const read = () => page.evaluate(() => ({
        steps: (window.__skisStepBadges ?? []).map((b) => b.step),
        nodes: (window.__skisLabels ?? []).length,
        places: (window.__skisPlaces ?? []).length,
        runs: (window.__skisRunNames ?? []).length,
      }));
      const near = await read();
      check(`${resort.id}: ${this.who} sees the leg she is on`, near.steps.includes(1),
        near.steps.join(", ") || "no numbers");
      await openTools(page);
      const pulled = await zoomBy(page, 5, "out");
      check(`${resort.id}: ${this.who} can pull back`, pulled === 5, `${pulled} of 5 taps landed`);
      await atRest(page, { quiet: 700, limit: 16000 });
      const far = await read();
      /*
       * Pulled back at Kronplatz this used to show fourteen station names and
       * seven restaurant pins at a five-kilometre scale — the far view of a
       * piste map with the close-up's labelling, because labelZoom returned a
       * constant while following.
       */
      check(`${resort.id}: ${this.who} is not shown the restaurants from five kilometres up`,
        far.places === 0, `${far.places} place markers`);
      check(`${resort.id}: ${this.who} is not shown run names either`,
        far.runs <= near.runs, `${far.runs} against ${near.runs} close in`);
      check(`${resort.id}: ${this.who} still sees where the day goes`,
        far.steps.length >= near.steps.length, `${far.steps.length} numbers against ${near.steps.length}`);
      // Every fifth, which is the point: 1, 5, 10, 15 says which way round it runs.
      const beyond = far.steps.filter((n) => n > 2);
      check(`${resort.id}: ${this.who} reads them as a sequence, not a crowd`,
        beyond.length === 0 || beyond.every((n) => n % 5 === 0), far.steps.join(", "));
      await screen(page, this.who, "navigating, pulled back");
    },
  },
  {
    id: "pointer",
    who: "follows the pointer rather than the words",
    at: [9, 30],
    async run(page, url, index, resort) {
      await page.goto(`${url}?maptest=1`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector(".hero", { timeout: 20000 });
      (await page.$$(".hero"))[index].click();
      await page.click("text=Go skiing");
      await page.waitForSelector(".planbtn", { timeout: 20000 });
      await plan(page, { ability: "Blue and red" });
      if (!(await routeCount(page))) await takeAFix(page);
      if (!(await routeCount(page))) { check(`${resort.id}: ${this.who} has a day`, false, "no routes"); return; }
      await openRoute(page);
      await page.waitForSelector(".sheet__foot .btn", { timeout: 15000 });
      await page.click("text=/Save and start/");
      await page.waitForSelector(".nav__head", { timeout: 25000 });
      await atRest(page, { quiet: 700, limit: 16000 });
      check(`${resort.id}: ${this.who} is on the map`, Boolean(await page.$("canvas")));
      /*
       * A dot with a cone of heading, which is what every phone map draws.
       *
       * She is not reading the words, so the marker has to say two things on
       * its own: where you are, and which way you are pointing. What she is
       * checked against is the shape as drawn — the cone is translucent and
       * the route line it points along is the same cyan, so colour cannot
       * separate them. Blue-over-red inside the wedge against the same radii
       * across it can: the cyan adds it and the hillside does not.
       */
      const cone = await page.evaluate(() => window.__skisNavCone ?? null);
      check(`${resort.id}: ${this.who} has a heading to follow`, Boolean(cone),
        cone ? `${Math.round((cone.ang * 180) / Math.PI)} degrees` : "no cone");
      if (cone) {
        const seen = await page.evaluate((k) => {
          const c = document.querySelector("canvas[aria-label*='Terrain view']");
          if (!c) return null;
          const dpr = c.width / c.getBoundingClientRect().width;
          const ctx = c.getContext("2d");
          const tint = (off, rad) => {
            const x = Math.round((k.x + Math.cos(k.ang + off) * rad) * dpr);
            const y = Math.round((k.y + Math.sin(k.ang + off) * rad) * dpr);
            if (x < 0 || y < 0 || x >= c.width || y >= c.height) return null;
            const d = ctx.getImageData(x, y, 1, 1).data;
            return d[2] - d[0];
          };
          const band = (off) => [0.5, 0.65, 0.8]
            .map((f) => tint(off, k.reach * f)).filter((n) => n !== null);
          const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
          return {
            inside: mean([...band(k.half * 0.6), ...band(-k.half * 0.6)]),
            across: mean([...band(Math.PI / 2), ...band(-Math.PI / 2)]),
            behind: mean(band(Math.PI)),
          };
        }, cone);
        if (seen && seen.inside !== null && seen.across !== null) {
          check(`${resort.id}: ${this.who} can see which way it points`,
            seen.inside - seen.across > 10,
            `${Math.round(seen.inside)} in front, ${Math.round(seen.across)} across`);
          // And it is a cone rather than a halo: nothing behind her.
          if (seen.behind !== null) {
            check(`${resort.id}: ${this.who} sees nothing pointing backwards`,
              seen.inside - seen.behind > 10,
              `${Math.round(seen.inside)} in front, ${Math.round(seen.behind)} behind`);
          }
        }
      }
      await screen(page, this.who, "navigating");
    },
  },
  {
    id: "parks",
    who: "leaves the car somewhere she is allowed to",
    at: [8, 30],
    async run(page, url, index, resort) {
      await arrive(page, url, index);
      // The resort's own list of what is on the mountain.
      const bar = await page.$(".resortbar__main");
      if (bar) { await bar.click(); await page.waitForTimeout(700); }
      const rows = await page.$$eval(".rows .row", (ns) => ns.map((n) => n.innerText.replace(/\n/g, " · ")));
      const cars = rows.filter((r) => /Parking/i.test(r));
      /*
       * Nothing that belongs to a hotel, and no motorhome bays.
       *
       * "Parcheggio Hotel La Rouja" and "Parcheggio Riservato Klein Finnland"
       * were both access=private, which is a barrier at the end of a drive in
       * ski boots — and a car park is the one place on this map you commit to
       * before you can check it.
       */
      const forbidden = cars.filter((r) =>
        /hotel|albergo|garni|residence|camper|camping|riservato|privat/i.test(r));
      check(`${resort.id}: ${this.who} is not sent to somebody's hotel car park`,
        forbidden.length === 0, forbidden.join(" / ").slice(0, 110) || `${cars.length} car parks, all public`);
      await screen(page, this.who, "what is on the mountain");
    },
  },
  {
    id: "hires",
    who: "needs to hire skis before she starts",
    at: [8, 45],
    async run(page, url, index, resort) {
      await arrive(page, url, index);
      const bar = await page.$(".resortbar__main");
      if (bar) { await bar.click(); await page.waitForTimeout(700); }
      const body = await page.$eval("body", (n) => n.innerText);
      const rows = await page.$$eval(".rows .row", (ns) => ns.map((n) => n.innerText.replace(/\n/g, " · ")));
      const hire = rows.filter((r) => /Ski hire/i.test(r));
      /*
       * Either there is hire listed, or the app says whose gap it is. Silence
       * reads as "there is none here", which is a claim about the mountain
       * that the data cannot support.
       */
      check(`${resort.id}: ${this.who} either finds hire or is told why not`,
        hire.length > 0 || /No ski hire here yet/i.test(body),
        hire.length ? `${hire.length} listed` : "no hire and no explanation");
      if (!hire.length) {
        check(`${resort.id}: ${this.who} is told it is the map and not the mountain`,
          /not that there is none/i.test(body), body.match(/No ski hire[^.]*\./)?.[0] ?? "");
      }
    },
  },
  {
    id: "changesmind",
    who: "changes her mind twice before setting off",
    at: [9, 30],
    async run(page, url, index, resort) {
      await arrive(page, url, index);
      await swingBy(page, { eat: true });
      await swingBy(page);
      const before = (await page.$$(".viachip")).length;
      for (const x of await page.$$(".viachip__x")) { await x.click(); await page.waitForTimeout(150); }
      check(`${resort.id}: ${this.who} can take them all off again`,
        (await page.$$(".viachip")).length === 0, `${before} on, then none`);
      // And switching to a transfer must not leave a stop stranded on it.
      const modes = await page.$$(".segmented__opt");
      if (modes.length > 1) {
        await modes[1].click();
        await page.waitForTimeout(300);
        const body = await page.$eval("body", (n) => n.innerText);
        check(`${resort.id}: ${this.who} is not offered stops on a transfer`,
          !/Places to swing by/i.test(body));
        await modes[0].click();
        await page.waitForTimeout(300);
        check(`${resort.id}: ${this.who} gets them back on a day`,
          Boolean(await page.$(".disclose")));
      }
      await swingBy(page);
      await solve(page);
      let n = await routeCount(page);
      if (!n) { const f = await takeAFix(page); n = f?.routes ?? 0; }
      check(`${resort.id}: ${this.who} still ends up with a day`, n > 0, `${n} routes`);
      await screen(page, this.who, "after changing her mind");
    },
  },
  /*
   * ---- and six more, on the round of work that followed -------------------
   *
   * Every one of these uses something built after the last persona round: the
   * lean the ground allows, the recentre that undoes whatever you did to the
   * view, the mountain going back to being a mountain, and the step numbers
   * easing instead of blinking. A feature check knows what it is looking for;
   * these arrive at it the way a person does, which is how the last four
   * rounds found what they found.
   */
  {
    id: "wrecksview",
    who: "shoves the map about with gloves on and wants it back",
    at: [10, 15],
    async run(page, url, index, resort) {
      await toNav(page, url, index, resort, this.who);
      if (!(await page.$(".nav__head"))) return;
      const view = () => page.evaluate(() => ({ ...window.__skisView }));
      // A gloved hand does not deliver a tidy gesture. Long, off-axis, fast.
      // No empty last frame: multiTouch sends a touchMove for every frame it
      // is given and then its own touchEnd, and Chrome rejects a touchMove
      // with no points in it.
      await multiTouch(page, [
        [[200, 260]],
        [[240, 340]], [[290, 430]], [[330, 520]], [[350, 610]], [[360, 700]],
      ]);
      await openTools(page);
      await zoomBy(page, 3, "in");
      await atRest(page, { quiet: 600, limit: 14000 });
      const bad = await view();
      /*
       * She has to be able to tell she has broken it, or the check is
       * measuring nothing. Either the map moved off centre or the zoom went
       * somewhere she did not mean.
       */
      const moved = Math.hypot(bad.panX ?? 0, bad.panY ?? 0) > 40 || Math.abs((bad.zoom ?? 1) - 1) > 0.4;
      check(`${resort.id}: ${this.who} can get the view into a mess`, moved,
        `zoom ${(bad.zoom ?? 0).toFixed(2)}, pan ${Math.round(bad.panX ?? 0)},${Math.round(bad.panY ?? 0)}`);
      await openTools(page);
      const home = await page.$('.maptools .iconbtn[aria-label="Recentre the view"]');
      check(`${resort.id}: ${this.who} finds one button to fix it`, Boolean(home));
      if (home) {
        await home.click();
        await atRest(page, { quiet: 700, limit: 16000 });
        const now = await view();
        check(`${resort.id}: ${this.who} gets the follow view back`,
          Math.hypot(now.panX ?? 0, now.panY ?? 0) < 14 && Math.abs((now.zoom ?? 0) - 1) < 0.15,
          `zoom ${(now.zoom ?? 0).toFixed(2)}, pan ${Math.round(now.panX ?? 0)},${Math.round(now.panY ?? 0)}`);
        const drawn = await page.evaluate(() =>
          (window.__skisRouteDrawn ?? []).reduce((n, l) => n + l.pts, 0));
        check(`${resort.id}: ${this.who} can see the route again`, drawn > 100, `${drawn} points`);
      }
      await screen(page, this.who, "after fixing the view");
    },
  },
  {
    id: "ridesup",
    who: "rides the long lift and wants to see where she is going",
    at: [9, 0],
    async run(page, url, index, resort) {
      await toNav(page, url, index, resort, this.who);
      if (!(await page.$(".nav__head"))) return;
      /*
       * The complaint this is for: "sometimes it gets inside the mountain".
       * Riding up, the hillside in front rises faster than the sight line and
       * fills the frame. So she rides a dozen junctions and, at each one,
       * asks whether the camera is leaning further over than the ground ahead
       * allows and whether the route is still drawn.
       */
      const buried = [];
      const blank = [];
      let ridden = 0;
      for (let i = 0; i < 12; i++) {
        await atRest(page, { quiet: 500, limit: 14000 });
        const v = await page.evaluate(() => ({
          pitch: window.__skisView?.pitch ?? null,
          cap: window.__skisView?.pitchCap ?? null,
          route: (window.__skisRouteDrawn ?? []).reduce((n, l) => n + l.pts, 0),
          leg: document.querySelector(".nav__legcount")?.textContent?.trim() ?? "",
        }));
        ridden++;
        if (Number.isFinite(v.cap) && v.pitch > v.cap + 1) buried.push(`${v.leg} ${Math.round(v.pitch)}>${Math.round(v.cap)}`);
        if (!(v.route > 20)) blank.push(v.leg);
        if (!(await reachNext(page))) break;
        await page.waitForTimeout(400);
      }
      check(`${resort.id}: ${this.who} rides the day`, ridden >= 5, `${ridden} legs`);
      check(`${resort.id}: ${this.who} never ends up inside the hill`,
        buried.length === 0, buried.slice(0, 3).join(", "));
      check(`${resort.id}: ${this.who} can see the route at every junction`,
        blank.length === 0, blank.slice(0, 3).join(", "));
      await screen(page, this.who, "part way up");
    },
  },
  {
    id: "startsover",
    who: "abandons the day and expects the mountain back",
    at: [11, 0],
    async run(page, url, index, resort) {
      await toNav(page, url, index, resort, this.who);
      if (!(await page.$(".nav__head"))) return;
      await reachNext(page);
      await page.waitForTimeout(500);
      /*
       * Out the way she came in: stop navigating, off the detail, change the
       * plan, off the form. Four taps, four screens that could each have kept
       * the day, which is why it is walked rather than jumped.
       */
      for (const sel of [
        '[aria-label="Stop navigating"]',
        ".sheet__foot .btn--quiet",
        '[aria-label="Change the plan"]',
        '[aria-label="Back to the resort"]',
      ]) {
        const el = await page.$(sel);
        if (el) { await el.click().catch(() => {}); await page.waitForTimeout(700); }
      }
      const home = Boolean(await page.$(".planbtn"));
      check(`${resort.id}: ${this.who} gets back to the mountain`, home);
      if (!home) return;
      await atRest(page, { quiet: 700, limit: 16000 });
      const left = await page.evaluate(() => ({
        route: (window.__skisRouteDrawn ?? []).reduce((n, l) => n + l.pts, 0),
        badges: (window.__skisStepBadges ?? []).length,
      }));
      check(`${resort.id}: ${this.who} finds it clean, not yesterday's day`,
        left.route === 0 && left.badges === 0,
        `${left.route} route points, ${left.badges} numbers`);
      // And it still works: a reset that leaves a dead mountain is no better.
      await plan(page, {});
      let n = await routeCount(page);
      if (!n) { const f = await takeAFix(page); n = f?.routes ?? 0; }
      check(`${resort.id}: ${this.who} can plan a fresh one`, n > 0, `${n} routes`);
      await screen(page, this.who, "starting over");
    },
  },
  {
    id: "watchesnumbers",
    who: "pinches in and out and notices things blinking",
    at: [9, 45],
    async run(page, url, index, resort) {
      await toNav(page, url, index, resort, this.who);
      if (!(await page.$(".nav__head"))) return;
      const badges = () => page.evaluate(() => window.__skisStepBadges ?? []);
      await openTools(page);
      /*
       * "There's a bit of a glitching." Sampled fast across a zoom out,
       * because a tier that eases and a tier that pops have the same
       * endpoints and differ only in the middle.
       */
      const samples = [];
      for (let i = 0; i < 3; i++) {
        if (!(await zoomBy(page, 1, "out"))) break;
        for (let j = 0; j < 10; j++) { samples.push(await badges()); await page.waitForTimeout(50); }
      }
      const easing = samples.filter((s) => s.some((b) => b.fade > 0.05 && b.fade < 0.95)).length;
      /*
       * A fade needs something to fade.
       *
       * Where the day is short or the mountain small, pulling back does not
       * change which numbers are on screen — and a set that does not change
       * has nothing to ease, which is the map being right rather than the map
       * popping. So the claim is conditional on the set actually moving, and
       * the sets are compared to find out.
       */
      const shapes = new Set(samples.map((s) =>
        s.filter((b) => !b.going).map((b) => b.step).sort((a, c) => a - c).join(",")));
      const changed = shapes.size > 1;
      check(`${resort.id}: ${this.who} sees the numbers ease rather than blink`,
        !changed || easing > 0,
        changed
          ? `${easing} of ${samples.length} samples caught one part way`
          : `the same numbers throughout, nothing to fade`);
      await atRest(page, { quiet: 700, limit: 16000 });
      const far = (await badges()).filter((b) => !b.going).map((b) => b.step);
      check(`${resort.id}: ${this.who} still has numbers to read`, far.length > 0,
        far.sort((a, b) => a - b).join(", "));
      await screen(page, this.who, "zoomed out mid-day");
    },
  },
  {
    id: "countsstops",
    who: "reads the order of the day off the map at a glance",
    at: [8, 45],
    async run(page, url, index, resort) {
      await page.goto(`${url}?maptest=1`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector(".hero", { timeout: 20000 });
      (await page.$$(".hero"))[index].click();
      await page.click("text=Go skiing");
      await page.waitForSelector(".planbtn", { timeout: 20000 });
      await plan(page, { t0: "09:00", t1: "16:00" });
      if (!(await routeCount(page))) await takeAFix(page);
      if (!(await routeCount(page))) { check(`${resort.id}: ${this.who} has a day`, false, "no routes"); return; }
      await openRoute(page);
      await page.waitForSelector(".detail__legs", { timeout: 15000 });
      await atRest(page, { quiet: 700, limit: 16000 });
      const shown = (await page.evaluate(() => window.__skisStepBadges ?? []))
        .filter((b) => !b.going).map((b) => b.step).sort((a, b) => a - b);
      /*
       * What she is doing is reading which way round the day goes, and that
       * needs a first number and a sequence after it. Not every number: a
       * sixty-leg day cannot put sixty on a phone, and the whole design of
       * this tier is that it thins.
       */
      check(`${resort.id}: ${this.who} finds where the day starts`, shown[0] === 1,
        shown.join(", "));
      check(`${resort.id}: ${this.who} can see the order without zooming`,
        shown.length >= 3, `${shown.length} numbers: ${shown.join(", ")}`);
      check(`${resort.id}: ${this.who} is not shown so many they stop meaning anything`,
        shown.length <= 16, `${shown.length} numbers`);
      // And the list says the same thing in words, in the same order.
      await openLegs(page);
      const numbers = await page.$$eval(".leg__n", (ns) => ns.map((n) => n.textContent.trim()));
      check(`${resort.id}: ${this.who} finds the same order written down`,
        numbers.length === 0 || numbers[0] === "1", numbers.slice(0, 6).join(" "));
      await screen(page, this.who, "reading the day");
    },
  },
  {
    id: "thumbsit",
    who: "does the whole thing one-handed on a bus",
    at: [7, 50],
    async run(page, url, index, resort) {
      await page.goto(`${url}?maptest=1`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector(".hero", { timeout: 20000 });
      (await page.$$(".hero"))[index].click();
      await page.click("text=Go skiing");
      await page.waitForSelector(".planbtn", { timeout: 20000 });
      /*
       * A thumb on a bus taps low, wide and twice. Nothing here should
       * dead-end, double-fire, or leave a screen half open — and the ability
       * chip and the stops row are the two things she will hit by accident.
       */
      await toForm(page);
      const row = await page.$(".disclose");
      if (row) {
        await row.click(); await page.waitForTimeout(200);
        await row.click(); await page.waitForTimeout(200);
        check(`${resort.id}: ${this.who} can close the stops row again`,
          (await row.getAttribute("aria-expanded")) === "false");
      }
      const chips = await page.$$('.chips[aria-label="Ability"] .chip');
      for (const c of chips.slice(0, 2)) { await c.click(); await page.waitForTimeout(150); }
      const pressed = await page.$$eval('.chips[aria-label="Ability"] .chip',
        (ns) => ns.filter((n) => n.getAttribute("aria-pressed") === "true").length);
      check(`${resort.id}: ${this.who} ends up with exactly one ability set`, pressed === 1,
        `${pressed} pressed`);
      await solve(page);
      let n = await routeCount(page);
      if (!n) { const f = await takeAFix(page); n = f?.routes ?? 0; }
      check(`${resort.id}: ${this.who} gets a day out of it`, n > 0, `${n} routes`);
      if (!n) return;
      /*
       * Opening a route is two taps, and the thumb hazard is on the second.
       *
       * Tapping the card body expands it; the button inside the expanded card
       * is what opens the route. Tapping the body twice just expands and
       * collapses it, which is the card working and was this journey waiting
       * fifteen seconds for a screen it had never asked for.
       */
      const body = (await page.$$(".routecard__body"))[0];
      await body.click();
      await page.waitForTimeout(260);
      const go = (await page.$$(".routecard__act .btn"))[0];
      check(`${resort.id}: ${this.who} finds the way in after one tap`, Boolean(go));
      if (!go) return;
      await go.click();
      // The second tap of a double: it lands after the screen has changed, so
      // it must hit nothing rather than open a second one.
      await go.click().catch(() => {});
      await page.waitForSelector(".detail__legs", { timeout: 15000 });
      check(`${resort.id}: ${this.who} opens one route, not two`,
        (await page.$$(".detail__legs")).length === 1,
        `${(await page.$$(".detail__legs")).length} detail screens`);
      await screen(page, this.who, "one-handed");
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
