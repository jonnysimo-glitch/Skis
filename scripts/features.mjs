/**
 * Per-feature depth. Run with: npm run features
 *
 * `e2e.mjs` walks the product once and asks whether each screen works.
 * This asks a harder question of a smaller surface: for one feature, what are
 * the twenty ways it goes wrong? Empty inputs, both ends the same, state left
 * over from the last time, a permission denied halfway, a tap that arrives
 * before the last one finished.
 *
 * Pass --only=<word> to run one feature.
 */
import { RESORTS } from "../src/resorts/index.js";
import { graphFor } from "../src/resorts/graphs.js";
import { SKIRT_LIT, SKIRT_SHADE, BASE_COLOUR } from "../src/map/field.js";
import { DWELL_MS as DWELL } from "../src/lib/progress.js";
import { PNG } from "pngjs";
import {
  serve,
  newPage,
  launch,
  toPlan,
  toForm,
  multiTouch,
  solve,
  openRoute,
  routeCount,
  toMinutes,
  reachNext,
  openLegs,
} from "./harness.mjs";

/*
 * The graph the app is actually running, not the hand-typed one.
 *
 * This file used to read `src/resort.js` and name its keys directly —
 * "salati", "champoluc", "gabiet". None of them exists in a graph built from
 * OpenStreetMap: Champoluc is a node keyed p30 that carries the name. A
 * selectOption for a value with no option does not fail, it waits, so the
 * whole suite timed out on the first one.
 */
const NODES = graphFor(RESORTS.find((r) => r.available).id).NODES;
/** The key of the place called `name`, or null. */
const keyNamed = (name) =>
  Object.keys(NODES).find((k) => new RegExp(name, "i").test(NODES[k].name)) ?? null;

const HEADED = process.argv.includes("--headed");
const ONLY = (process.argv.find((a) => a.startsWith("--only=")) || "").slice(7).toLowerCase();

let failures = 0;
let ran = 0;
const counts = new Map();
let current = "";

function feature(name) {
  current = name;
  if (ONLY && !name.toLowerCase().includes(ONLY)) return false;
  console.log(`\n${name.toUpperCase()}`);
  counts.set(name, 0);
  return true;
}

function check(name, condition, detail = "") {
  ran++;
  counts.set(current, (counts.get(current) || 0) + 1);
  if (!condition) failures++;
  console.log(`  ${condition ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
}

/** Where the flow currently is, read off the DOM rather than guessed. */
const where = (page) =>
  page.evaluate(() => {
    const tab = document.querySelector('.tabbar__tab[aria-current="page"] span')?.textContent;
    if (tab === "Home") return "home";
    if (tab === "Stats") return "stats";
    if (document.querySelector(".empty")) return "empty";
    if (document.querySelector(".nav")) return "navigate";
    if (document.querySelector(".solving")) return "solving";
    // A time input only exists on the form, and the form has chips of its own,
    // so it has to be ruled out before falling back to them.
    if (document.querySelector("#p-t1")) return "plan";
    // Route cards do not make it the choose screen: a refinement can rule
    // every one of them out and the screen stays put. The chips do.
    if (document.querySelector(".routecard, .sectionrule .chips .chip")) return "choose";
    // The route bar, which no longer carries the legs themselves: they moved
    // to a page of their own so the map underneath stays uncovered.
    if (document.querySelector(".detail__legs")) return "detail";
    if (document.querySelector(".legs")) return "legs";
    if (document.querySelector(".sheet")) return "summary";
    return "?";
  });

const text = (page) => page.evaluate(() => document.body.innerText);

const { server, url } = await serve();
const browser = await launch({ headed: HEADED });

try {

// ==================================================== 1. STRAIGHT THERE ==
if (feature("1. Straight there: getting to one place, now")) {
  const page = await newPage(browser, { at: [14, 0] });
  await toPlan(page, url);

  const modes = await page.$$eval(".segmented__opt", (n) => n.map((b) => b.textContent.trim()));
  check("the two questions are offered as one control", modes.length === 2, modes.join(" / "));
  check("planning a day is the default", await page.$eval('.segmented__opt', (b) => b.getAttribute("aria-pressed")) === "true");

  await page.click('.segmented__opt:has-text("Straight there")');
  check("switching modes stays on the same screen", (await where(page)) === "plan");
  check(
    "the finish field stops being a finish and becomes a destination",
    (await page.$eval('label[for="p-finish"]', (n) => n.textContent.trim())) === "Take me to"
  );
  check(
    "the deadline is a deadline, not a time on the hill",
    (await page.$eval('label[for="p-t1"]', (n) => n.textContent.trim())) === "By"
  );
  check(
    "the action says what it does",
    /Take me there/.test(await page.$eval(".page__foot .btn", (n) => n.textContent))
  );
  check(
    "lunch is not offered for a transfer",
    !(await text(page)).includes("Sit-down lunch")
  );
  check(
    "no drags still is, because a drag can be impassable",
    (await text(page)).includes("No drag lifts")
  );

  // Both ends the same.
  const startVal = await page.$eval("#p-start", (n) => n.value);
  await page.selectOption("#p-finish", startVal);
  check(
    "asking to be taken where you already are is refused",
    await page.$eval(".page__foot .btn", (n) => n.disabled)
  );
  check(
    "and it says which end to change rather than greying out in silence",
    /already at/.test(await text(page)),
    (await text(page)).match(/You are already at [^.]*\./)?.[0] || "no reason given"
  );

  // A real transfer.
  await page.selectOption("#p-start", keyNamed("Colle Salati"));
  await page.selectOption("#p-finish", keyNamed("Champoluc"));
  check("picking two different ends re-enables it", !(await page.$eval(".page__foot .btn", (n) => n.disabled)));

  await page.click("text=Take me there");
  await page.waitForSelector(".detail__legs, .empty", { timeout: 20000 });
  check("it goes straight to the route, with nothing to choose between", (await where(page)) === "detail");

  const body = await text(page);
  check("the route is named for where it is going", /To Champoluc/.test(body), body.split("\n")[1] || "");
  check("it is not dressed up as one of several options", !body.includes("Most vertical"));

  await openLegs(page);
  const legs = await page.$$eval(".leg", (n) => n.length);
  check("it has legs to follow", legs > 0, `${legs} legs`);
  await page.click('[aria-label="Back to the map"]');
  await page.waitForSelector(".detail__legs", { timeout: 10000 });

  // Back from a transfer goes to the form, not to a route list that never existed.
  await page.click('.iconbtn[aria-label="Back"]');
  await page.waitForTimeout(300);
  check("back from a transfer returns to the form", (await where(page)) === "plan");
  check("and the mode is still Straight there", await page.$eval('.segmented__opt:nth-child(2)', (b) => b.getAttribute("aria-pressed")) === "true");

  // Not enough time.
  await page.fill("#p-t1", "14:05");
  await page.click("text=Take me there");
  await page.waitForSelector(".empty", { timeout: 20000 });
  const empty = await text(page);
  check("a transfer that cannot be made in time says so", (await where(page)) === "empty");
  check("and says how long it would actually take", /\d+ minutes/.test(empty), empty.split("\n").slice(0, 4).join(" | "));
  check("and offers more time as the fix", /Give yourself until/.test(empty));
  check("no page errors", page.errors.length === 0, page.errors.join(" | "));
  await page.context_.close();
}

// =============================== 2. A TRANSFER IGNORES A DAY'S REFINEMENTS ==
if (feature("2. A transfer is not a refined day")) {
  // The discriminating case. Salati to Champoluc crosses the whole mountain on
  // red and does not exist at all on blue. So a leftover "Easier" from a day
  // plan does not merely shade the answer, it turns a real transfer into "no
  // way there". The window has to fit the crossing while 60% of it does not,
  // which is what a stale "Shorter" would leave.
  const page = await newPage(browser, { at: [11, 0] });
  await toPlan(page, url);
  await page.fill("#p-t0", "11:00");
  await page.fill("#p-t1", "16:00");
  await solve(page);
  check("a day plan solves first", (await routeCount(page)) > 0);

  const easier = await page.$('.chip:text-is("Easier")');
  check("the day can be refined easier", easier !== null && !(await easier.isDisabled()));
  await easier.click();
  await page.waitForTimeout(600);
  const shorter = await page.$('.chip:text-is("Shorter")');
  await shorter.click();
  await page.waitForTimeout(600);
  const refined = await page.$$eval('.chip[aria-pressed="true"]', (n) => n.map((b) => b.textContent.trim()));
  check("two refinements are on", refined.length === 2, refined.join(", "));

  // The options page is a page now, and its way back says what it does:
  // "Change the plan", not "Back". Asking for Back here matched a button on
  // a sheet underneath and waited out the clock trying to reach it.
  await page.click('[aria-label="Change the plan"]');
  await page.waitForSelector("#p-t1", { timeout: 10000 });
  await page.click('.segmented__opt:has-text("Straight there")');
  await page.selectOption("#p-start", keyNamed("Colle Salati"));
  await page.selectOption("#p-finish", keyNamed("Champoluc"));
  await page.fill("#p-t0", "11:00");
  await page.fill("#p-t1", "12:45");
  await page.click("text=Take me there");
  await page.waitForSelector(".detail__legs, .empty", { timeout: 20000 });

  check(
    "the transfer is found on the ability you actually set",
    (await where(page)) === "detail",
    await where(page)
  );
  const body = await text(page);
  check("it goes where you asked", /To Champoluc/.test(body));
  check(
    "the window is not quietly cut to 60% of itself by a stale Shorter",
    !/further than that/.test(body)
  );
  check("it is one answer, not a shortlist", (await routeCount(page)) === 0, `${await routeCount(page)} cards`);

  await openLegs(page);
  const legs = await page.$$eval(".leg", (n) => n.map((l) => l.textContent.trim()));
  check("it uses red terrain, which blue-only would have ruled out", legs.length > 0, `${legs.length} legs`);
  check("the legs are real named runs and lifts", legs.every((l) => l.length > 3));
  await page.click('[aria-label="Back to the map"]');
  await page.waitForSelector(".detail__legs", { timeout: 10000 });

  // And the plan screen shows no refinement state for a transfer.
  await page.click('.iconbtn[aria-label="Back"]');
  await page.waitForSelector("#p-t1", { timeout: 10000 });
  // The ability chip is legitimately pressed here; refine chips must not exist.
  const REFINE_LABELS = ["Shorter", "Longer", "Easier", "Harder", "More vertical"];
  const chips = await page.$$eval(".chip", (n) => n.map((b) => b.textContent.trim()));
  const leaked = chips.filter((c) => REFINE_LABELS.includes(c));
  check("no day refinements are shown on a transfer form", leaked.length === 0, leaked.join(", ") || "none");
  check("no page errors", page.errors.length === 0, page.errors.join(" | "));
  await page.context_.close();
}

// ================================================ 3. BOTH ENDS ARE FREE ==
if (feature("3. Route between any two points")) {
  for (const [label, at] of [["night before", [21, 30]], ["first lift", [8, 20]], ["mid-day", [14, 0]]]) {
    const page = await newPage(browser, { at });
    await toPlan(page, url);
    const starts = await page.$$eval("#p-start option", (n) => n.length);
    const finishes = await page.$$eval("#p-finish option", (n) => n.length);
    const groups = await page.$$eval("#p-start optgroup", (n) => n.map((g) => g.label));
    check(`${label}: the start can be anywhere on the mountain`, starts > 4, `${starts} options`);
    check(`${label}: so can the finish`, finishes === starts, `${finishes} options`);
    check(`${label}: bases are grouped apart from mid-mountain`, groups.join("/") === "Bases/On the mountain", groups.join("/"));
    check(
      `${label}: the finish field does not presume a car`,
      !/car/i.test(await page.$eval('label[for="p-finish"]', (n) => n.textContent))
    );
    await page.context_.close();
  }

  // A day that starts and ends at two different mid-mountain points.
  const page = await newPage(browser, { at: [11, 30] });
  await toPlan(page, url);
  await page.selectOption("#p-start", keyNamed("Colle Salati"));
  await page.selectOption("#p-finish", keyNamed("Gabiet"));
  await page.fill("#p-t0", "11:30");
  await page.fill("#p-t1", "16:00");
  await solve(page);
  const n = await routeCount(page);
  check("a day between two mid-mountain points solves", n > 0, `${n} routes`);

  if (n > 0) {
    await openRoute(page);
    await openLegs(page);
    const ends = await page.evaluate(() => {
      const legs = [...document.querySelectorAll(".leg")];
      return legs.length ? document.body.innerText : "";
    });
    check("the route it gives actually ends at the point asked for", /Gabiet/.test(ends));
    check("and starts from the point asked for", /Salati/.test(ends));
  }
  check("no page errors", page.errors.length === 0, page.errors.join(" | "));
  await page.context_.close();
}

// ================================================== 4. REFINE IN PLACE ==
if (feature("4. Refine never sends you back to the form")) {
  const page = await newPage(browser, { at: [9, 0] });
  await toPlan(page, url);
  await solve(page);
  const before = await page.$$eval(".routecard", (n) => n.map((c) => c.textContent.trim().slice(0, 40)));
  check("there are routes to refine", before.length > 0, `${before.length}`);

  // Scoped to the refine group, not to a sheet: the options screen is a full
  // page now, so `.sheet .chip` matched nothing and every chip check failed
  // as "not offered" rather than as "not found".
  const chips = await page.$$eval(".sectionrule .chip", (n) => n.map((b) => b.textContent.trim()));
  check("the refine chips are one tap away", chips.length >= 6, chips.join(", "));
  for (const want of ["Shorter", "Longer", "Easier", "Harder", "More vertical", "No drags", "Lunch"]) {
    check(`"${want}" is offered`, chips.includes(want));
  }

  // Each chip re-solves in place.
  for (const chip of ["Shorter", "More vertical", "No drags"]) {
    const btn = await page.$(`.sectionrule .chip:text-is("${chip}")`);
    if (!btn || (await btn.isDisabled())) { check(`"${chip}" is tappable`, false, "disabled"); continue; }
    await btn.click();
    await page.waitForTimeout(700);
    check(`"${chip}" keeps you on the options`, (await where(page)) === "choose", await where(page));
    check(`"${chip}" is now on`, (await btn.getAttribute("aria-pressed")) === "true");
  }

  // Opposites cancel rather than stacking.
  const longer = await page.$('.sectionrule .chip:text-is("Longer")');
  await longer.click();
  await page.waitForTimeout(700);
  const shorterOn = await page.$eval('.sectionrule .chip:text-is("Shorter")', (b) => b.getAttribute("aria-pressed"));
  check("turning on Longer turns Shorter off rather than stacking", shorterOn !== "true", `shorter=${shorterOn}`);

  // Tapping twice in quick succession must not leave a stale answer on screen.
  // Selectors rather than handles: a re-solve re-renders the row underneath.
  const routesBefore = await routeCount(page);
  await page.click('.sectionrule .chip:text-is("Easier")');
  await page.click('.sectionrule .chip:text-is("Harder")', { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const easierOn = await page.$eval('.sectionrule .chip:text-is("Easier")', (x) => x.getAttribute("aria-pressed"));
  const harderOn = await page.$eval('.sectionrule .chip:text-is("Harder")', (x) => x.getAttribute("aria-pressed"));
  check(
    "opposites never end up both on",
    !(easierOn === "true" && harderOn === "true"),
    `easier=${easierOn} harder=${harderOn}`
  );
  check("the list settles rather than emptying", (await routeCount(page)) > 0, `${await routeCount(page)} (was ${routesBefore})`);
  check("and it is not left spinning", !(await page.$(".chip--busy")), "still busy");

  check("still on the options after all of that", (await where(page)) === "choose");
  check("never once back at the form", (await page.$("#p-t1")) === null);

  check("no page errors so far", page.errors.length === 0, page.errors.join(" | "));
  await page.context_.close();

  // The chip that rules everything out is the make-or-break case: it must not
  // throw the user onto a screen whose only exit is the form.
  //
  // On its own page with a window a refinement can actually empty. Stacking
  // chips on a whole day used to do it; at a recreational pace the solver just
  // finds a shorter day, and the check quietly became "three routes are still
  // three routes".
  const tight = await newPage(browser, { at: [11, 0] });
  await toPlan(tight, url);
  await tight.fill("#p-t0", "11:00");
  await tight.fill("#p-t1", "12:30");
  await solve(tight);
  check("the tight window offers something to begin with", (await routeCount(tight)) > 0,
    `${await routeCount(tight)} routes`);
  for (const chip of ["Shorter", "Lunch"]) {
    const el = await tight.$(`.sectionrule .chip:text-is("${chip}")`);
    if (el && !(await el.isDisabled()) && (await el.getAttribute("aria-pressed")) !== "true") {
      await el.click();
      await tight.waitForTimeout(900);
    }
  }
  await tight.waitForTimeout(500);
  const emptied = (await routeCount(tight)) === 0;
  check("stacking refinements can rule the day out", emptied, `${await routeCount(tight)} routes`);
  if (emptied) {
    check("and it says so rather than showing an empty list", /rules everything out/i.test(await text(tight)));
    check("it is not the dead-end empty screen", (await where(tight)) === "choose", await where(tight));
    check("the chips are still there to undo it", (await tight.$$(".sectionrule .chip")).length > 0);
    check("the offending chip is still tappable", !(await tight.$eval('.sectionrule .chip:text-is("Lunch")', (b) => b.disabled)));
    check("the budget is stated as time, not raw minutes", !/\b\d{3,} minutes\b/.test(await text(tight)));
    await tight.click('.sectionrule .chip:text-is("Lunch")');
    await tight.waitForTimeout(1200);
    check("undoing it brings the options straight back", (await routeCount(tight)) > 0, `${await routeCount(tight)} routes`);
    check("without ever passing through the form", (await tight.$("#p-t1")) === null);
  }
  check("no page errors on the tight window", tight.errors.length === 0, tight.errors.join(" | "));
  await tight.context_.close();
}

// ============================================ 5. FOLLOWING YOU ON THE HILL ==
if (feature("5. Navigation follows the GPS")) {
  const staffal = { latitude: 45.8869, longitude: 7.8244 };
  const page = await newPage(browser, {
    at: [9, 30],
    geolocation: staffal,
    permissions: ["geolocation"],
  });
  await toPlan(page, url);
  await solve(page);
  check("a day to navigate", (await routeCount(page)) > 0);
  await openRoute(page);
  await page.waitForSelector(".sheet__foot .btn", { timeout: 15000 });
  await page.click("text=/Save and start|Save offline and start|^Start$/");
  await page.waitForSelector(".nav", { timeout: 20000 });
  check("navigation starts", (await where(page)) === "navigate");

  const first = await text(page);
  check("it opens on leg one", /leg 1 of \d+/i.test(first), first.match(/leg \d+ of \d+/i)?.[0] || "no leg counter");
  // Naming the junction beats using the word: "to Gabiet" is a place you can
  // see from the chairlift, "to junction" is a category.
  const keys = await page.$$eval(".navmetric__k", (n) => n.map((k) => k.textContent.trim()));
  check("it points at the next junction by name", keys.some((k) => /^to \w/i.test(k)), keys.join(" / "));
  check("it never says 'turn'", !/turn/i.test(first));
  check("it says it is following you", /Following you/.test(first), first.match(/Following you[^.]*\./)?.[0] || "not following");
  check("the tab bar is out of the way while navigating", await page.$eval(".tabbar", (n) => n.className.includes("hidden")));

  // Walk the phone to the end of leg one. The screen should advance itself.
  const target = await page.evaluate(() => {
    const m = document.body.innerText.match(/Reached ([^\n]+?)\s*$/m);
    return m ? m[1].trim() : null;
  });
  check("the manual fallback names where you are going", target !== null, target || "");

  const legNumber = async () =>
    Number((await page.$eval(".nav__legcount", (n) => n.textContent)).match(/(\d+) of/i)?.[1] || 0);
  check("the leg counter reads one", (await legNumber()) === 1, `${await legNumber()}`);

  // The headline behaviour: walk the phone to the junction and the screen
  // should advance itself. No tap.
  const here = NODES[target && Object.keys(NODES).find((k) => NODES[k].name === target)];
  check("the junction is a real node with coordinates", !!here, target || "unknown");

  if (here) {
    // With a fix the first metric is a real distance rather than the planned
    // minutes, because metres are checkable against what you can see. This
    // page has had a fix since it loaded, so the thing to assert is that the
    // distance is real: it shrinks as the phone moves to the junction.
    const distance = () =>
      page.evaluate(() => {
        const cell = document.querySelector(".navmetric");
        const unit = cell.querySelector(".navmetric__u").textContent.trim();
        const value = parseFloat(cell.querySelector(".navmetric__v").textContent);
        return { unit, metres: unit === "km" ? value * 1000 : value };
      });
    const far = await distance();
    check("with a fix it shows a distance, not the planned minutes", ["m", "km"].includes(far.unit), far.unit);

    await page.context_.setGeolocation({ latitude: here.lat, longitude: here.lon });
    // One fix is deliberately not enough; two consecutive ones are.
    await page.waitForTimeout(1600);
    const near = await distance();
    check("and it shrinks as you get there", near.metres < far.metres,
      `${Math.round(far.metres)} m to ${Math.round(near.metres)} m`);

    // Two fixes advance immediately; one fix and silence takes the dwell.
    await page.waitForFunction(
      () => /leg 2 of/i.test(document.querySelector(".nav__legcount")?.textContent || ""),
      { timeout: 15000 }
    ).catch(() => {});
    check("arriving at the junction advances the leg without a tap", (await legNumber()) === 2, `on leg ${await legNumber()}`);

    // And it does not run away. Leg 2 goes on from here, so its junction is
    // somewhere else: sitting at leg 1's junction must not keep advancing.
    await page.context_.setGeolocation({ latitude: here.lat + 0.06, longitude: here.lon + 0.06 });
    await page.waitForTimeout(DWELL + 3000);
    check("a fix nowhere near the next junction does not advance", (await legNumber()) === 2, `on leg ${await legNumber()}`);
  }

  const before = await legNumber();
  const manual = await page.$('.nav__foot .btn:has-text("Reached")');
  if (manual) {
    // Held, not tapped. The button guards against a pocket brush, so a bare
    // click is ignored on purpose and this read as "advancing is broken".
    await reachNext(page);
    await page.waitForTimeout(400);
    check("holding Reached advances a leg", (await legNumber()) === before + 1, `${before} to ${await legNumber()}`);
  }

  check("no page errors", page.errors.length === 0, page.errors.join(" | "));
  await page.context_.close();
}

// ==================================== 6. LOCATION THAT DOES NOT WORK ==
if (feature("6. Every location failure says something")) {
  // Denied.
  {
    const page = await newPage(browser, { at: [9, 0] });
    await page.context_.grantPermissions([]);
    await toPlan(page, url);
    await page.click(".locate");
    await page.waitForTimeout(1200);
    const body = await text(page);
    check("a denied permission is stated", /Location is off|Location needs https|No location/.test(body), body.match(/Location[^\n]*/)?.[0] || "silent");
    check("and it still says what to do instead", /Pick a start below/.test(body));
    check("the button is not left spinning", !/Finding you/.test(body));
    check("the form still works", !(await page.$eval(".page__foot .btn", (n) => n.disabled)));
    await solve(page);
    check("and solving is unaffected", (await routeCount(page)) > 0);
    check("no page errors", page.errors.length === 0, page.errors.join(" | "));
    await page.context_.close();
  }

  // Somewhere else entirely.
  {
    const page = await newPage(browser, {
      at: [9, 0],
      geolocation: { latitude: 48.8566, longitude: 2.3522 }, // Paris
      permissions: ["geolocation"],
    });
    await toPlan(page, url);
    await page.click(".locate");
    await page.waitForTimeout(1500);
    const body = await text(page);
    check("a fix in another country is refused, not snapped", /km from Monterosa/.test(body), body.match(/You're[^\n]*/)?.[0] || "snapped anyway");
    check("and the distance is given so it is obviously right", /\d+ km/.test(body));
    check("the start is left where it was", (await page.$eval("#p-start", (n) => n.value)).length > 0);
    check("no page errors", page.errors.length === 0, page.errors.join(" | "));
    await page.context_.close();
  }

  // Actually there.
  {
    const page = await newPage(browser, {
      at: [9, 0],
      geolocation: { latitude: 45.8869, longitude: 7.8244 },
      permissions: ["geolocation"],
    });
    await toPlan(page, url);
    await page.click(".locate");
    await page.waitForTimeout(1500);
    const body = await text(page);
    check("a fix on the hill is used", /Using your position/.test(body), body.match(/Using[^\n]*/)?.[0] || "not used");
    const startVal = await page.$eval("#p-start", (n) => n.value);
    const options = await page.$$eval("#p-start option", (n) => n.map((o) => o.value));
    check("and the start it picks is one the picker actually offers", options.includes(startVal), `${startVal} in [${options.length}]`);
    check("it names the station rather than a coordinate", /Nearest is \w/.test(body), body.match(/Nearest is [^\n]*/)?.[0] || "");

    // The three that must agree: button, picker, and where the route starts.
    const shown = await page.$eval("#p-start", (n) => n.options[n.selectedIndex].textContent.trim());
    check("what the button says matches what the picker shows", body.includes(shown), shown);
    await solve(page);
    check("and it solves from there", (await routeCount(page)) > 0);
    check("no page errors", page.errors.length === 0, page.errors.join(" | "));
    await page.context_.close();
  }

  // Over http on a LAN address, which is how you open this on a phone.
  {
    const page = await newPage(browser, { at: [9, 0] });
    await page.goto(url.replace("127.0.0.1", "0.0.0.0"), { waitUntil: "domcontentloaded" }).catch(() => {});
    const insecure = await page.evaluate(() => window.isSecureContext === false).catch(() => false);
    check("a LAN address is an insecure context", insecure === true, `secure=${!insecure}`);
    if (insecure) {
      await page.waitForSelector(".hero", { timeout: 20000 });
      await page.click(".hero");
      await page.click("text=Go skiing");
      await page.waitForSelector(".planbtn", { timeout: 15000 });
      await page.click(".planbtn");
      await page.waitForSelector("#p-t1", { timeout: 15000 });
      await page.click(".locate");
      await page.waitForTimeout(900);
      const body = await text(page);
      check("it blames https, not the permission", /needs https/i.test(body), body.match(/Location[^\n]*/)?.[0] || "");
      check("it does not send you to settings for the wrong thing", !/Location is off/.test(body));
      await solve(page);
      check("and the rest of the app is unaffected", (await routeCount(page)) > 0);
    }
    check("no page errors", page.errors.length === 0, page.errors.join(" | "));
    await page.context_.close();
  }
}

// ================================================ 7. THE RECORD OF A DAY ==
if (feature("7. Finishing a day writes it down, once")) {
  const page = await newPage(browser, { at: [9, 0] });
  await toPlan(page, url);
  await solve(page);
  await openRoute(page);
  await page.waitForSelector(".sheet__foot .btn", { timeout: 15000 });
  await page.click("text=/Save and start|Save offline and start|^Start$/");
  await page.waitForSelector(".nav", { timeout: 20000 });

  // 120 was enough when a day was 39 legs; a full day on the real graph runs
  // to 65 and more, and the loop has to hold each one rather than tap it.
  for (let i = 0; i < 200; i++) {
    if (!(await reachNext(page))) break;
  }
  const finish = await page.$('button:has-text("Finish")');
  check("the last leg offers a finish", finish !== null);
  await finish.click();
  await page.waitForTimeout(800);
  check("finishing shows the summary", /Down at|Back at/.test(await text(page)));

  // Everything durable lives under one key; history is a field inside it.
  const days = () =>
    page.evaluate(() => (JSON.parse(localStorage.getItem("skis.v1") || "{}").history || []).length);
  check("the day is written to the record", (await days()) === 1, `${await days()} days`);

  // The one that used to double-count: back out of the summary and finish again.
  check("there is no way back out of a finished day", (await page.$('.iconbtn[aria-label="Back"]')) === null);

  await page.click('.tabbar__tab:has-text("Stats")');
  await page.waitForTimeout(600);
  const stats = await text(page);
  check("stats shows the day", (await where(page)) === "stats");
  check("with a distance", /\d+(\.\d+)?\s*km/i.test(stats), stats.slice(0, 80).replace(/\n/g, " "));
  check("with a vertical", /\bm\b/.test(stats));
  check("and exactly one day, not two", (await days()) === 1, `${await days()}`);

  check("the day is labelled the way a person refers to it", /today/i.test(stats), stats.match(/Today|Yesterday/i)?.[0] || "no label");
  check("and carries the route's character title", /circuit|valleys|miles|vertical|variety|cruis/i.test(stats));

  // The season totals on home come from the same record.
  await page.click('.tabbar__tab:has-text("Home")');
  await page.waitForTimeout(500);
  const home = await text(page);
  check("home shows the season once there is a day in it", /this season/i.test(home));
  check("and the empty state is gone", !/no days yet/i.test(home));

  // It survives a reload: this is the phone's memory, not the session's.
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector(".hero, .tabbar", { timeout: 20000 });
  check("the record survives a reload", (await days()) === 1, `${await days()}`);

  await page.click('.tabbar__tab:has-text("Stats")');
  await page.waitForTimeout(500);

  // Clearing is confirmed rather than instant, and cancelling really cancels.
  const clear = await page.$('button:has-text("Clear history")');
  check("there is a way to clear the record", clear !== null);
  if (clear) {
    await clear.click();
    await page.waitForTimeout(400);
    check("clearing asks first", /Delete everything/i.test(await text(page)));
    check("and says what will be lost", /no copy anywhere else/i.test(await text(page)));
    check("the day is still there until confirmed", (await days()) === 1);

    await page.click('button:has-text("Keep")');
    await page.waitForTimeout(400);
    check("keeping it actually keeps it", (await days()) === 1, `${await days()}`);
    check("and the confirmation goes away", !/Delete everything/i.test(await text(page)));

    await page.click('button:has-text("Clear history")');
    await page.waitForTimeout(300);
    await page.click('button:has-text("Delete")');
    await page.waitForTimeout(500);
    check("deleting it empties the record", (await days()) === 0, `${await days()}`);
    check("and the empty state comes back", /no days yet/i.test(await text(page)));
  }
  check("no page errors", page.errors.length === 0, page.errors.join(" | "));
  await page.context_.close();
}

// ============================================ 8. BROWSE BEFORE YOU PLAN ==
if (feature("8. The skiing tab is the mountain and one button")) {
  const page = await newPage(browser, { at: [9, 30] });
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".hero", { timeout: 20000 });
  await page.click(".hero");
  await page.click("text=Go skiing");
  await page.waitForSelector(".planbtn", { timeout: 15000 });

  check("it is not a form", (await page.$("#p-t1")) === null);
  check("the map is there", (await page.$("canvas")) !== null);
  check("there is no panel over it", (await page.$(".sheet, .resortpanel")) === null);
  check("and nothing to drag", (await page.$(".sheet__grab")) === null);
  check("the map has its controls here, where there is a map",
    (await page.$$(".maptools .iconbtn")).length >= 4,
    `${(await page.$$(".maptools .iconbtn")).length} controls`);

  const body = await text(page);
  check("it names the resort", /Monterosa Ski/.test(body), body.replace(/\n/g, " ").slice(0, 60));
  // The resort's statistics belong on Home, where you are choosing between
  // resorts and they mean something. Here they would just cover the mountain.
  check("but does not restate its statistics over the map", !/lifts/i.test(body) && !/last down/i.test(body));

  // The map really does get the whole screen.
  const covered = await page.evaluate(() => {
    const tab = document.querySelector(".tabbar").getBoundingClientRect().top;
    const pill = document.querySelector(".resortbar").getBoundingClientRect().bottom;
    const mid = document.elementFromPoint(window.innerWidth / 2, (pill + tab) / 2);
    return { hits: mid?.tagName.toLowerCase(), gap: Math.round(tab - pill) };
  });
  check("between the pill and the tab bar there is only map", ["canvas", "div"].includes(covered.hits), covered.hits);
  check("and that is most of the screen", covered.gap > 600, `${covered.gap}px`);

  // Count, not just find. A duplicate rendered off-screen passes every check
  // that reads the first match, which is exactly how one survived a rewrite.
  const plans = await page.$$eval(".planbtn", (n) => n.map((b) => b.textContent.trim()));
  check("there is exactly one Plan button", plans.length === 1, plans.join(" | ") || "none");
  check("and it says Plan", /Plan/.test(plans[0] || ""), plans[0]);
  const planBox = await page.$eval(".planbtn", (b) => {
    const r = b.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height), mid: r.top + r.height / 2, vh: window.innerHeight };
  });
  check("it is a real target", planBox.h >= 44 && planBox.w >= 80, `${planBox.w}x${planBox.h}`);
  // The thumb zone, not a top corner. This is a phone in one gloved hand.
  check("and it is within thumb reach at the bottom", planBox.mid > planBox.vh * 0.75,
    `centre at ${Math.round((planBox.mid / planBox.vh) * 100)}% down`);
  check("it spans the screen rather than hiding in a corner", planBox.w > planBox.vh * 0.35, `${planBox.w}px wide`);

  // And the map controls are not underneath it.
  const overlap = await page.evaluate(() => {
    const plan = document.querySelector(".planbtn").getBoundingClientRect();
    const tools = document.querySelector(".maptools").getBoundingClientRect();
    return Math.round(plan.top - tools.bottom);
  });
  check("the map controls stack above it, not behind it", overlap > 0, `${overlap}px clear`);

  check("the resort name is not truncated", await page.$eval(".resortbar__nm", (n) => n.scrollWidth <= n.clientWidth + 1),
    await page.$eval(".resortbar__nm", (n) => `${n.scrollWidth} in ${n.clientWidth}`));
  check("changing resort is offered once, not twice",
    (await page.$$('text=/Ski somewhere else/')).length === 0);

  // Plan is the verb.
  await page.click(".planbtn");
  await page.waitForSelector("#p-t1", { timeout: 15000 });
  check("Plan opens the form", (await where(page)) === "plan");
  check("and the form is a page, not a panel over the map",
    (await page.$(".page")) !== null && (await page.$(".sheet")) === null);
  // Back on a full page is the chevron in its bar, not a button in a footer.
  await page.click('.page__bar .iconbtn');
  await page.waitForSelector(".planbtn", { timeout: 10000 });
  check("and backing out returns to the mountain, not out of the tab",
    (await page.$(".planbtn")) !== null && (await page.$eval('.tabbar__tab[aria-current="page"] span', (n) => n.textContent)) === "Skiing");
  check("no page errors", page.errors.length === 0, page.errors.join(" | "));
  await page.context_.close();
}

// ================================= 9. NAVIGATION IS A DIFFERENT INTERFACE ==
if (feature("9. Navigating is pinned, not dragged")) {
  const page = await newPage(browser, { at: [9, 30] });
  await toPlan(page, url);
  await solve(page);
  await openRoute(page);
  await page.waitForSelector(".sheet__foot .btn", { timeout: 15000 });
  check("the route detail is still a sheet", (await page.$(".sheet")) !== null);

  await page.click("text=/Save and start|Save offline and start|^Start$/");
  await page.waitForSelector(".nav", { timeout: 20000 });

  check("navigating is not a sheet", (await page.$(".sheet")) === null);
  check("there is nothing to drag", (await page.$(".sheet__grab")) === null);
  check("the tab bar is out of the way", await page.$eval(".tabbar", (n) => n.className.includes("hidden")));

  const head = await page.$eval(".nav__head", (n) => n.getBoundingClientRect().top);
  check("the instruction is pinned to the top", head <= 1, `${Math.round(head)}px`);

  const nav = await page.evaluate(() => ({
    doing: document.querySelector(".nav__do")?.textContent.trim(),
    then: document.querySelector(".nav__then")?.textContent.trim(),
    grade: document.querySelector(".nav__grade")?.textContent.trim(),
    metrics: [...document.querySelectorAll(".navmetric__k")].map((m) => m.textContent.trim()),
    action: document.querySelector(".nav__foot .btn")?.textContent.trim(),
  }));
  check("it says what to do", /^(Ride|Ski) /.test(nav.doing || ""), nav.doing);
  check("and what comes after", /^then (ride|ski) /.test(nav.then || ""), nav.then);
  check("the grade is stated", ["gondola", "chair", "drag", "cable car", "blue", "red", "black"].includes((nav.grade || "").toLowerCase()), nav.grade);
  check("there are three numbers, no more", nav.metrics.length === 3, nav.metrics.join(" / "));
  check("one of them is the junction", nav.metrics.some((m) => /^to /i.test(m)), nav.metrics.join(" / "));
  check("one of them is when you are back", nav.metrics.some((m) => /due back|over/i.test(m)), nav.metrics.join(" / "));
  check("the action names where you are going", /^Reached /.test(nav.action || ""), nav.action);

  // Nothing hidden behind a vague label.
  check("there is no Controls button", (await page.$(".navcontrols")) === null);
  check("and no drawer to open", (await page.$(".nav__drawer")) === null);
  check("stopping is one control in the corner", (await page.$(".nav__stop")) !== null);

  const stopBox = await page.$eval(".nav__stop", (b) => { const r = b.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; });
  check("and it is a real target", stopBox.w >= 44 && stopBox.h >= 44, `${stopBox.w}x${stopBox.h}`);

  // The map has to be reachable between the panels.
  const gap = await page.evaluate(() => {
    const head = document.querySelector(".nav__metrics").getBoundingClientRect().bottom;
    const foot = document.querySelector(".nav__foot").getBoundingClientRect().top;
    const mid = document.elementFromPoint(window.innerWidth / 2, (head + foot) / 2);
    return { height: Math.round(foot - head), hits: mid?.tagName?.toLowerCase() };
  });
  check("there is map between the panels", gap.height > 200, `${gap.height}px`);
  check("and a tap in it reaches the map, not the chrome", ["canvas", "div"].includes(gap.hits), gap.hits);

  // The tab bar slides off the bottom while navigating, which hides it from
  // the eye and the thumb but not from the tab key. Three buttons sat just
  // past the edge of the screen and tabbing reached them, and landing on Stats
  // halfway down a run is not something anyone meant to do.
  // It is hidden with opacity and a transform, which stops the eye and the
  // thumb but not the tab key. Its three buttons stayed in the tab order, and
  // landing on Stats halfway down a run is not something anyone meant to do.
  check("the hidden tab bar is out of the tab order, not just out of sight",
    await page.$eval(".tabbar", (n) => n.hasAttribute("inert")));

  await page.evaluate(() => document.querySelector(".nav__stop")?.focus());
  let hitTabBar = false;
  for (let i = 0; i < 16; i++) {
    await page.keyboard.press("Tab");
    if (await page.evaluate(() => !!document.activeElement?.closest(".tabbar"))) hitTabBar = true;
  }
  check("so sixteen tabs never land on it", !hitTabBar);

  await page.click(".nav__stop");
  await page.waitForTimeout(500);
  check("stopping returns to the route", (await page.$(".sheet")) !== null);
  check("no page errors", page.errors.length === 0, page.errors.join(" | "));
  await page.context_.close();
}

// ================================ 10. NO CONTROLS FOR A MAP THAT IS NOT THERE ==
if (feature("10. Map chrome only where there is a map")) {
  const page = await newPage(browser, { at: [9, 30] });
  const chrome = () => page.$$eval(".maptools .iconbtn, .mapnote__x", (n) => n.length);
  const focusable = () =>
    page.evaluate(() =>
      [...document.querySelectorAll(".maptools button, .mapnote button")].filter(
        (b) => !b.closest("[inert]") && b.offsetParent !== null
      ).length
    );

  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".hero", { timeout: 20000 });
  check("home has no map, so no map controls", (await chrome()) === 0, `${await chrome()}`);
  check("and none of them in the tab order", (await focusable()) === 0, `${await focusable()}`);

  await page.click(".hero");
  await page.click('.iconbtn[aria-label="Settings"]');
  await page.waitForSelector(".modal", { timeout: 10000 });
  check("nor behind the settings sheet", (await chrome()) === 0, `${await chrome()}`);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);

  await page.click('.tabbar__tab:has-text("Stats")');
  await page.waitForTimeout(400);
  check("stats has no map either", (await chrome()) === 0, `${await chrome()}`);

  await page.click('.tabbar__tab:has-text("Home")');
  await page.waitForTimeout(300);
  await page.click("text=Go skiing");
  await page.waitForSelector(".planbtn", { timeout: 15000 });
  check("the mountain does, and they are all there", (await chrome()) >= 4, `${await chrome()}`);

  await page.click(".planbtn");
  await page.waitForSelector("#p-t1", { timeout: 15000 });
  check("the plan form covers the map, so they go away again", (await chrome()) === 0, `${await chrome()}`);
  check("no page errors", page.errors.length === 0, page.errors.join(" | "));
  await page.context_.close();
}

// ================================================= 11. USABLE WITHOUT SIGHT ==
if (feature("11. It works without a mouse or a screen")) {
  const page = await newPage(browser, { at: [9, 30] });

  const semantics = () =>
    page.evaluate(() => {
      const vis = (el) => {
        const s = getComputedStyle(el), r = el.getBoundingClientRect();
        return s.display !== "none" && s.visibility !== "hidden" && r.width > 0 && r.height > 0;
      };
      const unnamed = [...document.querySelectorAll("button, a[href], select")]
        .filter(vis)
        .filter((el) => !((el.getAttribute("aria-label") || el.textContent || "").trim()
          || el.labels?.[0]?.textContent.trim()))
        .map((el) => el.tagName.toLowerCase() + "." + (el.className || "").split(" ")[0]);
      const loudIcons = [...document.querySelectorAll("svg")]
        .filter(vis)
        .filter((s) => !s.hasAttribute("aria-hidden") && !s.hasAttribute("role") && !s.querySelector("title"))
        .length;
      const headings = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].filter(vis).map((h) => +h.tagName[1]);
      return { unnamed, loudIcons, headings, main: !!document.querySelector("main, [role=main]") };
    });

  const screens = [];
  const record = async (name) => { await page.waitForTimeout(300); screens.push([name, await semantics()]); };

  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".hero", { timeout: 20000 });
  await record("home");
  await page.click(".hero");
  await page.click("text=Go skiing");
  await page.waitForSelector(".planbtn", { timeout: 15000 });
  await record("explore");
  await page.click(".planbtn");
  await page.waitForSelector("#p-t1", { timeout: 15000 });
  await record("plan");
  await solve(page);
  await record("choose");
  await openRoute(page);
  await page.waitForSelector(".detail__legs", { timeout: 15000 });
  await record("detail");
  await openLegs(page);
  await record("legs");
  await page.click('[aria-label="Back to the map"]');
  await page.waitForSelector(".detail__legs", { timeout: 10000 });
  await page.click("text=/Save and start|Save offline and start|^Start$/");
  await page.waitForSelector(".nav", { timeout: 20000 });
  await record("navigate");

  const bad = (pick) => screens.filter(([, v]) => pick(v)).map(([n]) => n);
  check("every control has a name a screen reader can read",
    bad((v) => v.unnamed.length).length === 0,
    screens.flatMap(([n, v]) => v.unnamed.map((u) => `${n}:${u}`)).join(", ") || "all named");
  check("decorative icons are hidden from it, so it is not read noise",
    bad((v) => v.loudIcons > 0).length === 0,
    screens.map(([n, v]) => `${n}:${v.loudIcons}`).filter((x) => !x.endsWith(":0")).join(", ") || "none announced");
  check("there is exactly one h1 per screen", bad((v) => v.headings.filter((h) => h === 1).length > 1).length === 0);
  check("and heading levels do not skip",
    bad((v) => v.headings.some((h, i) => i && h - v.headings[i - 1] > 1)).length === 0,
    screens.map(([n, v]) => `${n}:${v.headings.join("")}`).join(" "));
  check("there is a main landmark to skip the chrome with", bad((v) => !v.main).length === 0);
  await page.context_.close();

  // The settings dialog says aria-modal. That has to be true.
  {
    const page = await newPage(browser, { at: [9, 30] });
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".hero", { timeout: 20000 });
    await page.click(".hero");
    await page.click('.iconbtn[aria-label="Settings"]');
    await page.waitForSelector(".modal", { timeout: 10000 });

    const inside = () => page.evaluate(() => !!document.activeElement?.closest(".modal"));
    check("opening it moves focus into the dialog", await inside());

    let escaped = 0;
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press("Tab");
      if (!(await inside())) { escaped = i + 1; break; }
    }
    check("tabbing cannot walk out of it", escaped === 0, escaped ? `escaped after ${escaped} tabs` : "12 tabs, still inside");

    for (let i = 0; i < 6; i++) await page.keyboard.press("Shift+Tab");
    check("nor can shift-tabbing", await inside());

    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    check("escape closes it", (await page.$(".modal")) === null);
    check("and focus goes back to what opened it",
      await page.evaluate(() => document.activeElement?.getAttribute("aria-label") === "Settings"));
    check("no page errors", page.errors.length === 0, page.errors.join(" | "));
    await page.context_.close();
  }
}

// ================================= 12. THE MAP CANNOT BE THROWN AWAY ==
if (feature("12. You cannot scroll the mountain off the screen")) {
  const page = await newPage(browser, { at: [9, 30] });
  // maptest exposes the camera. Pixels prove the mountain is still on screen;
  // only the numbers show whether the wall gave before it held.
  await page.goto(`${url}?maptest=1`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".hero", { timeout: 20000 });
  await page.click(".hero");
  await page.click("text=Go skiing");
  await page.waitForSelector(".planbtn", { timeout: 15000 });
  await page.waitForTimeout(1400);

  const SEL = "canvas[aria-label*='Terrain view']";
  if (!(await page.$(SEL))) {
    check("the schematic terrain is the layer on screen", false, "MapLibre took over; nothing to measure");
    await page.context_.close();
  } else {
    /** How much of the canvas is not sky. Sky is the only blue-dominant thing. */
    const land = () =>
      page.$eval(SEL, (c) => {
        const g = c.getContext("2d");
        const { data, width, height } = g.getImageData(0, 0, c.width, c.height);
        let hit = 0;
        let total = 0;
        for (let y = 0; y < height; y += 8) {
          for (let x = 0; x < width; x += 8) {
            const i = (y * width + x) * 4;
            total++;
            if (!(data[i + 2] > data[i] + 12 && data[i + 2] > data[i + 1] + 6)) hit++;
          }
        }
        return Math.round((hit / total) * 100);
      });

    const box = await page.$eval(SEL, (c) => {
      const r = c.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    });
    const fling = async (dx, dy) => {
      for (let i = 0; i < 4; i++) {
        await page.mouse.move(box.x + box.w / 2, box.y + box.h / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + box.w / 2 + dx, box.y + box.h / 2 + dy, { steps: 8 });
        await page.mouse.up();
      }
      await page.waitForTimeout(1100);
    };

    const rest = await land();
    check("there is terrain on screen to begin with", rest > 6, `${rest}% of the canvas`);
    // Relative, not absolute. The mountain is a model sitting in sky, so the
    // resting fraction is naturally low and a fixed threshold measures how big
    // the model happens to be rather than whether it is still there.
    //
    // A fifth, not a third. The pan limit is half the subject, so that you can
    // bring the far end of the resort to the middle of the screen, and at that
    // extreme half the mountain is off frame by design. Pushed to both limits
    // at once only a corner is left. What this still catches is the mountain
    // going entirely, which is what the limit exists for.
    const enough = Math.max(3, rest * 0.18);

    // Pan is a screen-space offset with nothing bounding it by nature, so each
    // direction gets flung hard enough to clear the viewport several times over.
    for (const [dir, dx, dy] of [
      ["left", -240, 0], ["up", 0, -240], ["right", 480, 0],
      ["down", 0, 480], ["diagonally", -300, 300],
    ]) {
      await fling(dx, dy);
      const seen = await land();
      check(`flinging ${dir} cannot empty the screen`, seen >= enough,
        `${seen}% still terrain, needs ${enough.toFixed(0)}%`);
    }

    // And zoomed in you must still be able to reach the far side, or the clamp
    // has traded one problem for another.
    await page.$eval(SEL, (c) => {
      const r = c.getBoundingClientRect();
      for (let i = 0; i < 6; i++) {
        c.dispatchEvent(new WheelEvent("wheel", { deltaY: -240, clientX: r.x + r.width / 2, clientY: r.y + r.height / 2, bubbles: true }));
      }
    });
    await page.waitForTimeout(900);
    // Comparing the land percentage is too weak: the same fraction of sky can
    // survive a view that has genuinely moved. Fingerprint the pixels instead.
    const print = () =>
      page.$eval(SEL, (c) => {
        const { data, width, height } = c.getContext("2d").getImageData(0, 0, c.width, c.height);
        let h = 0;
        for (let y = 0; y < height; y += 16) {
          for (let x = 0; x < width; x += 16) {
            const i = (y * width + x) * 4;
            h = (h * 31 + data[i] + data[i + 1] * 3 + data[i + 2] * 7) | 0;
          }
        }
        return h;
      });
    // Fling back the other way. Flinging further into the stop is correctly a
    // no-op, so pushing the same direction again proves nothing: the first
    // version of this check read "identical pixels" and blamed the app.
    const before = await print();
    await fling(200, -120);
    const after = await print();
    const shifted = await land();
    check("zoomed in, panning still moves the view", before !== after, before === after ? "identical pixels" : "view moved");
    check("and still cannot empty it", shifted >= enough, `${shifted}%, needs ${enough.toFixed(0)}%`);

    // The wall gives before it holds. A hard clamp stops dead under your
    // thumb, which reads as the app having stopped listening rather than as
    // the map having an edge; every touch platform resists and springs back.
    const pan = () => page.evaluate(() => {
      const v = window.__skisView;
      return { x: v.panX, lim: v.panLimit?.x ?? 0 };
    });
    await page.click("[aria-label='Recentre the view']");
    await page.waitForTimeout(700);
    const cxx = box.x + box.w / 2;
    const cyy = box.y + box.h / 2;
    await page.mouse.move(cxx, cyy);
    await page.mouse.down();
    for (let i = 1; i <= 20; i++) await page.mouse.move(cxx + i * 30, cyy, { steps: 2 });
    await page.waitForTimeout(200);
    const held = await pan();
    check("dragging past the wall still moves, under resistance",
      held.x > held.lim + 8 && held.x < held.lim + 300,
      `${Math.round(held.x - held.lim)}px past it, of 600px dragged`);
    await page.mouse.up();
    await page.waitForTimeout(140);
    const mid = await pan();
    check("and it eases back rather than snapping", mid.x > held.lim + 1,
      `${Math.round(mid.x - held.lim)}px past it a frame after release`);
    await page.waitForTimeout(1000);
    const sprung = await pan();
    check("settling exactly on the wall", Math.abs(sprung.x - sprung.lim) < 2,
      `${Math.round(sprung.x)} against ${Math.round(sprung.lim)}`);
    check("no page errors", page.errors.length === 0, page.errors.join(" | "));
    await page.context_.close();
  }
}

// ============ 13. THE BLOCK IS UNDER THE MOUNTAIN, NOT IN FRONT OF IT ==
// The terrain sits on a slab. Built the obvious way, as a box with walls
// dropping to the floor, the wall facing the camera starts on the summit ridge
// and hangs down the screen over the resort. In the blue-white the slab is
// drawn in, that is invisible: it looks like snow, and the piste lines draw on
// top of it, so the view reads as fine while half the mountain is behind a
// wall. It got past a careful look twice. Hence pixels.
//
// The slab faces are filled flat, with no slope shading and no haze, so their
// RGB values are exact and no terrain pixel can collide with them.
if (feature("13. The block is under the mountain, not in front of it")) {
  const page = await newPage(browser, { at: [9, 30] });
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".hero", { timeout: 20000 });
  await page.click(".hero");
  await page.click("text=Go skiing");
  await page.waitForSelector(".planbtn", { timeout: 15000 });
  await page.waitForTimeout(1400);

  const SEL = "canvas[aria-label*='Terrain view']";
  if (!(await page.$(SEL))) {
    check("the schematic terrain is the layer on screen", false, "MapLibre took over; nothing to measure");
    await page.context_.close();
  } else {
    // Passed in from the module that defines them. A copy of these numbers
    // lived here once and went stale the first time the slab was recoloured,
    // which read as the slab having vanished.
    const shot = await page.$eval(SEL, (c, FLAT) => {
      const g = c.getContext("2d");
      const { data, width, height } = g.getImageData(0, 0, c.width, c.height);
      let slab = 0, terrain = 0, top = 1e9, bottom = -1;
      const rows = [];
      for (let y = 0; y < height; y += 4) {
        let rTerrain = 0, rSlab = 0;
        for (let x = 0; x < width; x += 4) {
          const i = (y * width + x) * 4;
          const [r, gg, b] = [data[i], data[i + 1], data[i + 2]];
          const isSky = b > r + 12 && b > gg + 6;
          if (isSky) continue;
          const isSlab = FLAT.some((f) => f[0] === r && f[1] === gg && f[2] === b);
          if (isSlab) { slab++; rSlab++; } else { terrain++; rTerrain++; }
          if (y < top) top = y;
          if (y > bottom) bottom = y;
        }
        rows.push({ y, rTerrain, rSlab });
      }
      // How the model divides above and below its own middle. A wall over the
      // mountain shows up here: the upper half goes flat.
      const mid = (top + bottom) / 2;
      let upperTerrain = 0, upperSlab = 0;
      for (const r of rows) {
        if (r.y >= mid) continue;
        upperTerrain += r.rTerrain;
        upperSlab += r.rSlab;
      }
      return { slab, terrain, upperTerrain, upperSlab };
    }, [SKIRT_LIT, SKIRT_SHADE, BASE_COLOUR]);

    const model = shot.slab + shot.terrain;
    const slabPct = (shot.slab / model) * 100;
    const upper = shot.upperTerrain + shot.upperSlab;
    const upperTerrainPct = (shot.upperTerrain / (upper || 1)) * 100;

    check("there is a model on screen to measure", model > 500, `${model} sampled pixels`);
    check("the slab is drawn at all", slabPct > 2, `${slabPct.toFixed(0)}% of the model`);
    check("and it is a rim and a base, not a wall", slabPct < 34, `${slabPct.toFixed(0)}%, must stay under 34%`);
    check("the top half of the model is mountain, not flat fill",
      upperTerrainPct > 70, `${upperTerrainPct.toFixed(0)}% terrain, needs 70%`);
    check("no page errors", page.errors.length === 0, page.errors.join(" | "));
    await page.context_.close();
  }
}

// ==================== 14. THE REAL MAP CANNOT LEAVE THE RESORT ==
// Section 12 walls in the schematic view. This is the same promise for the
// MapLibre map that replaces it when the terrain loads, which had no wall at
// all: it panned and zoomed to the whole globe, and past the world's edge
// MapLibre draws repeated copies, so the start pin appeared three times
// receding toward the horizon.
//
// It went unnoticed because the real map never started. Its worker 404ed, so
// every session fell back to the schematic and this code path was dead.
if (feature("14. The real map cannot leave the resort")) {
  const page = await newPage(browser, { at: [9, 30] });
  await page.goto(`${url}?maptest=1`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".hero", { timeout: 20000 });
  await page.click(".hero");
  await page.click("text=Go skiing");
  await page.waitForSelector(".planbtn", { timeout: 15000 });

  // The cut-out is the map now and the button that swapped to the world one is
  // gone, so this drives the same state through the maptest hook. The code is
  // still shipped and still has to stay walled in.
  await page.evaluate(() => window.__skisSetMapMode?.("world"));

  let present = true;
  try {
    await page.waitForFunction(() => !!window.__skisMap, { timeout: 15000 });
  } catch {
    present = false;
  }

  if (!present) {
    check("MapLibre reached style.load, so there is a camera to test", false,
      "__skisMap never appeared");
    await page.context_.close();
  } else {
    const state = await page.evaluate(() => {
      const m = window.__skisMap;
      const b = m.getMaxBounds();
      // jumpTo is the bluntest instrument available. A wall that holds against
      // it holds against a fling.
      m.jumpTo({ center: [2.35, 48.85], zoom: 3 }); // Paris
      const away = m.getCenter();
      const awayZoom = m.getZoom();
      m.jumpTo({ zoom: 22 });
      const deep = m.getZoom();
      return {
        worldCopies: m.getRenderWorldCopies?.() ?? null,
        bounds: b && [[b.getWest(), b.getSouth()], [b.getEast(), b.getNorth()]],
        minZoom: m.getMinZoom(), maxZoom: m.getMaxZoom(),
        away: [away.lng, away.lat], awayZoom, deep,
      };
    });

    check("the camera has a wall at all", !!state.bounds,
      state.bounds ? "maxBounds set" : "maxBounds is null");
    if (state.bounds) {
      const [[w, s], [e, n]] = state.bounds;
      const [lng, lat] = state.away;
      check("jumping to Paris lands back on the resort",
        lng >= w && lng <= e && lat >= s && lat <= n,
        `${lng.toFixed(3)}, ${lat.toFixed(3)} in ${w.toFixed(2)}..${e.toFixed(2)}`);
      check("and it is a resort sized wall, not a country sized one",
        e - w < 1 && n - s < 1, `${(e - w).toFixed(2)} by ${(n - s).toFixed(2)} degrees`);
    }
    check("zooming out to the country is refused",
      state.minZoom > 9 && state.awayZoom > 9,
      `reached ${state.awayZoom.toFixed(1)}, floor ${state.minZoom.toFixed(1)}`);
    check("zooming in past the terrain is refused",
      state.maxZoom <= 18 && state.deep <= 18,
      `reached ${state.deep}, ceiling ${state.maxZoom}`);
    check("the world is not drawn more than once", state.worldCopies === false,
      `renderWorldCopies ${state.worldCopies}`);
    check("no page errors", page.errors.length === 0, page.errors.join(" | "));
    await page.context_.close();
  }
}

// ========= 15. GESTURES AND THE SLOPES DRAWN OVER THE TERRAIN ==
// Two things about the cut-out that are easy to break and hard to see.
//
// A drag is not a tap. Double tap to zoom used to fire on any second
// pointerdown inside 300ms, whatever happened in between, so two quick drags
// in a row zoomed the map and four put it at the ceiling. It surfaced as a
// confusing pan-clamp failure rather than as itself.
//
// And the pistes are drawn over the terrain rather than draped into it, so a
// run on the far side of a ridge is still visible. That is deliberate: on a
// route planner the shape of the day has to be legible in one look, and half a
// route hidden behind a mountain is not.
if (feature("15. Gestures, and slopes drawn over the terrain")) {
  const page = await newPage(browser, { at: [9, 30] });
  await page.goto(`${url}?maptest=1`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".hero", { timeout: 20000 });
  await page.click(".hero");
  await page.click("text=Go skiing");
  await page.waitForSelector(".planbtn", { timeout: 15000 });
  await page.waitForTimeout(1300);

  const SEL = "canvas[aria-label*='Terrain view']";
  if (!(await page.$(SEL))) {
    check("the cut-out is on screen", false, "no schematic canvas");
    await page.context_.close();
  } else {
    const box = await page.$eval(SEL, (c) => {
      const r = c.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    });
    const zoom = () => page.evaluate(() => window.__skisView?.targetZoom);

    const before = await zoom();
    // Two drags in quick succession, the gesture that used to zoom.
    for (let i = 0; i < 2; i++) {
      await page.mouse.move(box.x + box.w / 2, box.y + box.h / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.w / 2 - 120, box.y + box.h / 2, { steps: 6 });
      await page.mouse.up();
    }
    await page.waitForTimeout(500);
    check("two quick drags do not zoom the map", Math.abs((await zoom()) - before) < 0.01,
      `${before?.toFixed(2)} then ${(await zoom())?.toFixed(2)}`);

    // A real double tap still does, or the gesture has been broken instead.
    for (let i = 0; i < 2; i++) {
      await page.mouse.move(box.x + box.w / 2, box.y + box.h / 2);
      await page.mouse.down();
      await page.mouse.up();
      await page.waitForTimeout(60);
    }
    await page.waitForTimeout(500);
    check("a real double tap still zooms", (await zoom()) > before + 0.1,
      `${before?.toFixed(2)} then ${(await zoom())?.toFixed(2)}`);

    // ---- slopes over terrain ---------------------------------------------
    await toForm(page);
    await solve(page);
    await page.waitForSelector(".routecard", { timeout: 15000 });
    await page.waitForTimeout(1200);

    /** Pixels close to the route casing colour, #2ac4ee. */
    const routePixels = () =>
      page.$eval(SEL, (c) => {
        const g = c.getContext("2d");
        const { data, width, height } = g.getImageData(0, 0, c.width, c.height);
        let n = 0;
        for (let y = 0; y < height; y += 2) {
          for (let x = 0; x < width; x += 2) {
            const i = (y * width + x) * 4;
            if (Math.abs(data[i] - 0x2a) < 46 && Math.abs(data[i + 1] - 0xc4) < 46 &&
                Math.abs(data[i + 2] - 0xee) < 46) n++;
          }
        }
        return n;
      });

    const front = await routePixels();
    check("the route is drawn on the mountain", front > 40, `${front} sampled pixels`);

    // From the other side, terrain that was behind the route is now in front
    // of it. A depth test would take a large bite out of the line here.
    await page.evaluate(() => window.__skisSetBearing(152));
    await page.waitForTimeout(1400);
    const bearing = await page.evaluate(() => window.__skisView?.bearing);
    const back = await routePixels();
    check("orbiting actually turned the mountain", Math.abs((bearing ?? 0) + 28) > 25,
      `bearing ${bearing?.toFixed(0)}`);
    check("and the route is still fully drawn from the far side",
      back > front * 0.45, `${back} pixels against ${front} before`);
    check("no page errors", page.errors.length === 0, page.errors.join(" | "));
    await page.context_.close();
  }
}

// ============== 16. ONE GESTURE AT A TIME ==
// Two fingers can mean zoom, rotate or tilt, and all three used to be applied
// on every frame of every two finger gesture. Fingers never move perfectly
// symmetrically, so a plain pinch also rotated and tilted a few degrees and
// the whole view wobbled through the zoom. Each now waits for its own
// threshold, and a tilt locks out the other two.
if (feature("16. One gesture at a time")) {
  // A real touchscreen, not a mouse. Without hasTouch every gesture arrives as
  // pointerType "mouse" and the browser applies none of its touch behaviour,
  // so touch-action and pointercancel go untested and the suite passes while
  // the phone does not.
  const page = await newPage(browser, { at: [9, 30], touch: true });
  await page.goto(`${url}?maptest=1`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".hero", { timeout: 20000 });
  await page.click(".hero");
  await page.click("text=Go skiing");
  await page.waitForSelector(".planbtn", { timeout: 15000 });
  await page.waitForTimeout(1300);

  const SEL = "canvas[aria-label*='Terrain view']";
  if (!(await page.$(SEL))) {
    check("the cut-out is on screen", false, "no schematic canvas");
    await page.context_.close();
  } else {
    const box = await page.$eval(SEL, (c) => {
      const r = c.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    });
    const cx = box.x + box.w / 2;
    const cy = box.y + box.h / 2;
    const view = async () => {
      const v = await page.evaluate(() => ({ ...window.__skisView }));
      return { zoom: v.targetZoom, bearing: v.bearing, pitch: v.pitch };
    };
    const reset = async () => {
      await page.tap("[aria-label='Recentre the view']");
      await page.waitForTimeout(500);
    };
    const twoFinger = (frames) =>
      multiTouch(page, frames.map((f) => [[f[0], f[1]], [f[2], f[3]]]));

    // Deliberately imperfect, because a perfect pinch is not a test: with the
    // fingers exactly opposite and exactly level, even the old code that
    // applied all three at once had nothing to rotate or tilt by. Real hands
    // twist a few degrees and drift down the screen while they spread, and
    // both stay under their thresholds here.
    const NOISE_TWIST = (6 * Math.PI) / 180; // total, under the 8 degree gate
    const NOISE_DRIFT = 16;                  // pixels, under the 22 pixel gate
    await reset();
    let a = await view();
    const pinch = [];
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      const d = 60 + i * 12;
      const th = NOISE_TWIST * t;
      const dy = NOISE_DRIFT * t;
      pinch.push([
        cx - d * Math.cos(th), cy + dy - d * Math.sin(th),
        cx + d * Math.cos(th), cy + dy + d * Math.sin(th),
      ]);
    }
    await twoFinger(pinch);
    let b = await view();
    check("a pinch zooms", b.zoom > a.zoom * 1.2, `${a.zoom.toFixed(2)} to ${b.zoom.toFixed(2)}`);
    check("and does not rotate the map on the way", Math.abs(b.bearing - a.bearing) < 2,
      `bearing moved ${(b.bearing - a.bearing).toFixed(1)} degrees`);
    check("nor tilt it", Math.abs(b.pitch - a.pitch) < 2,
      `pitch moved ${(b.pitch - a.pitch).toFixed(1)} degrees`);

    await reset();
    a = await view();
    const twist = [];
    for (let i = 0; i <= 14; i++) {
      const th = (i * 4 * Math.PI) / 180;
      const R = 90;
      twist.push([cx - R * Math.cos(th), cy - R * Math.sin(th), cx + R * Math.cos(th), cy + R * Math.sin(th)]);
    }
    await twoFinger(twist);
    b = await view();
    // Direction, not just magnitude. Every twist check here used to ask
    // whether the bearing moved and never which way, so an inverted sign sat
    // in the code untouched: the mountain turned against the fingers.
    //
    // These fingers twist clockwise on screen. Increasing the bearing turns
    // the picture anticlockwise, which field.test.js pins, so a clockwise
    // twist has to bring the bearing down.
    check("a twist rotates, and with the fingers not against them",
      b.bearing - a.bearing < -5, `${a.bearing.toFixed(0)} to ${b.bearing.toFixed(0)}`);
    check("and does not zoom on the way", Math.abs(b.zoom - a.zoom) < 0.05,
      `zoom moved ${(b.zoom - a.zoom).toFixed(3)}`);

    await reset();
    a = await view();
    // Same again: hands spread slightly as they slide, by less than the pinch
    // threshold, so a tilt used to zoom a little too.
    const tilt = [];
    for (let i = 0; i <= 14; i++) {
      const half = 80 * (1 + 0.03 * (i / 14));
      tilt.push([cx - half, cy - i * 6, cx + half, cy - i * 6]);
    }
    await twoFinger(tilt);
    b = await view();
    check("two fingers travelling together tilts", Math.abs(b.pitch - a.pitch) > 5,
      `${a.pitch.toFixed(0)} to ${b.pitch.toFixed(0)}`);
    check("and does not zoom", Math.abs(b.zoom - a.zoom) < 0.02, `zoom moved ${(b.zoom - a.zoom).toFixed(3)}`);
    check("nor rotate", Math.abs(b.bearing - a.bearing) < 2,
      `bearing moved ${(b.bearing - a.bearing).toFixed(1)} degrees`);

    // ---- and the same three with a hand rather than a machine --------------
    // Reported from a real phone: a twist turned the mountain and slid it
    // across the screen at once, and a two finger drag refused to change the
    // elevation. Neither showed up above, because a hand does not hold its
    // fingers exactly opposite, exactly level, or put them both down on the
    // same tick. These do all three.
    const hand = (build) => {
      const frames = [];
      for (let i = 0; i <= 16; i++) frames.push(build(i / 16, i));
      return frames;
    };
    const jit = (i, k) => Math.sin(i * 12.9898 + k * 78.233) * 1.6;
    const pair = (half, th, dx, dy, i) => [
      cx + dx - half * Math.cos(th) + jit(i, 0), cy + dy - half * Math.sin(th) + jit(i, 1),
      cx + dx + half * Math.cos(th) + jit(i, 2), cy + dy + half * Math.sin(th) + jit(i, 3),
    ];
    const rad = (deg) => (deg * Math.PI) / 180;

    await reset();
    a = await view();
    // A twist, with the hand sliding and spreading a little as it turns.
    // 40 degrees, because the arc-length gate eats the first 18 or so before
    // rotation engages at all. That deadzone is the point of it.
    await twoFinger(hand((t, i) => pair(90 * (1 + 0.02 * t), rad(40) * t, 0, 8 * t, i)));
    b = await view();
    check("a real hand's twist rotates the way the hand turned",
      b.bearing - a.bearing < -8, `${(b.bearing - a.bearing).toFixed(0)} degrees`);
    // This used to read panX/panY and require them to stay near zero. That was
    // a fair proxy for "the twist did not also slide the map" right up until
    // rotation started pivoting on the fingers, which is IMPLEMENTED as a pan
    // correction — 45px of it here, all of it doing its job. The property the
    // check was always about is that the subject does not translate under the
    // gesture, so it measures that directly now: the mountain is where it was,
    // turned.
    const centreDrift = await page.evaluate(() => {
      const ns = Object.values(window.__skisNodes);
      const lat = ns.reduce((t, n) => t + n.lat, 0) / ns.length;
      const lon = ns.reduce((t, n) => t + n.lon, 0) / ns.length;
      const p = window.__skisProject(lon, lat);
      return { x: p.x, y: p.y };
    });
    check("and does not slide the mountain out from under the turn",
      Math.abs(centreDrift.x - cx) < 130 && Math.abs(centreDrift.y - cy) < 190,
      `middle of the resort is ${Math.round(centreDrift.x - cx)},${Math.round(centreDrift.y - cy)} from the fingers`);
    check("nor zoom it", Math.abs(b.zoom - a.zoom) < 0.02, `zoom moved ${(b.zoom - a.zoom).toFixed(3)}`);

    await reset();
    a = await view();
    // A two finger drag up, with the hand spreading 12% as it slides, which is
    // what hands do and what used to make this register as a pinch.
    await twoFinger(hand((t, i) => pair(80 * (1 + 0.12 * t), rad(6) * t, 0, -100 * t, i)));
    b = await view();
    check("a real hand's two finger drag changes the elevation",
      Math.abs(b.pitch - a.pitch) > 8, `pitch moved ${(b.pitch - a.pitch).toFixed(0)} degrees`);
    check("and does not zoom instead", Math.abs(b.zoom - a.zoom) < 0.02,
      `zoom moved ${(b.zoom - a.zoom).toFixed(3)}`);

    // ---- and the compass means north ---------------------------------------
    // A compass button has exactly one meaning. It used to return to the
    // opening view, which is a composition at bearing 152 and not north at all.
    const needle = () => page.evaluate(() =>
      Number(getComputedStyle(document.documentElement).getPropertyValue("--map-north")));
    await page.evaluate(() => window.__skisSetBearing(40));
    await page.waitForTimeout(500);
    const turned = await needle();
    // ---- one gesture can be two things -----------------------------------
  //
  // The complaint that produced this: pinch to zoom, then twist without lifting
  // a finger, and nothing rotated until the fingers came off. Zoom and rotate
  // were one exclusive latch, so whichever crossed its threshold first owned
  // the whole gesture. MapLibre registers them as separate handlers that name
  // each other as allowed —
  //   _add("touchRotate", touchRotate, ["touchPan", "touchZoom"]);
  //   _add("touchZoom",   touchZoom,   ["touchPan", "touchRotate"]);
  //   _add("touchPitch",  touchPitch);
  // so those two run together and only pitch, with no allow-list, excludes
  // everything else.
  //
  // Asymmetric on purpose, like the pinch above: a real hand does not move two
  // fingers as mirror images.
  const grip = (r, th, noise) => [
    cx + Math.cos(th) * r + noise, cy + Math.sin(th) * r,
    cx - Math.cos(th) * r, cy - Math.sin(th) * r - noise,
  ];
  const run = async (frames) => {
    await reset();
    const from = await view();
    await twoFinger(frames);
    await page.waitForTimeout(420);
    const to = await view();
    return {
      bearing: Math.abs(to.bearing - from.bearing),
      zoom: Math.abs(to.zoom - from.zoom),
    };
  };

  const pinchThenTwist = [];
  for (let i = 0; i <= 10; i++) pinchThenTwist.push(grip(70 + i * 5, 0, i * 0.3));
  for (let i = 1; i <= 14; i++) pinchThenTwist.push(grip(120, (i * Math.PI) / 40, i * 0.3));
  const r1 = await run(pinchThenTwist);
  check("a pinch that becomes a twist rotates without lifting a finger",
    r1.bearing > 8, `${r1.bearing.toFixed(0)} degrees`);
  check("and keeps the zoom it had already done", r1.zoom > 0.15, `${r1.zoom.toFixed(2)}`);

  const twistThenPinch = [];
  for (let i = 0; i <= 14; i++) twistThenPinch.push(grip(110, (i * Math.PI) / 40, i * 0.3));
  for (let i = 1; i <= 10; i++) twistThenPinch.push(grip(110 + i * 6, (14 * Math.PI) / 40, i * 0.3));
  const r2 = await run(twistThenPinch);
  check("a twist that becomes a pinch zooms without lifting a finger",
    r2.zoom > 0.15, `${r2.zoom.toFixed(2)}`);
  check("and keeps the rotation it had already done", r2.bearing > 8, `${r2.bearing.toFixed(0)} degrees`);

  // The thresholds still have to hold, or this is only the cross-talk that the
  // exclusivity was there to stop.
  const plainPinch = [];
  for (let i = 0; i <= 14; i++) plainPinch.push(grip(70 + i * 5, 0, i * 0.4));
  const r3 = await run(plainPinch);
  check("a pinch alone still does not rotate", r3.bearing < 2, `${r3.bearing.toFixed(1)} degrees`);
  const plainTwist = [];
  for (let i = 0; i <= 16; i++) plainTwist.push(grip(110, (i * Math.PI) / 36, i * 0.4));
  const r4 = await run(plainTwist);
  check("and a twist alone still does not zoom", r4.zoom < 0.05, `${r4.zoom.toFixed(3)}`);

  // ---- rotation pivots on the fingers, and eases off close in ----------
  //
  // "When you are super close it feels like it rotates too much." Two causes.
  // Bearing pivoted on the middle of the resort while pinch already pivoted on
  // the fingers, so zoomed in and panned the pivot was off the side of the
  // screen; and the camera re-fits the subject to the viewport every frame, so
  // turning also rescales and recentres it, which zoom multiplies.
  //
  // The anchor is found by searching the app's OWN forward projection for the
  // lat/lon that lands under the fingers. Independent of the projection maths
  // the fix uses, so this cannot pass because both share a mistake.
  const anchorAt = (sx, sy) => page.evaluate(({ sx, sy }) => {
    const ns = Object.values(window.__skisNodes);
    let lo = [Math.min(...ns.map((n) => n.lat)), Math.min(...ns.map((n) => n.lon))];
    let hi = [Math.max(...ns.map((n) => n.lat)), Math.max(...ns.map((n) => n.lon))];
    let best = null;
    for (let pass = 0; pass < 5; pass++) {
      for (let i = 0; i <= 20; i++) {
        for (let j = 0; j <= 20; j++) {
          const lat = lo[0] + ((hi[0] - lo[0]) * i) / 20;
          const lon = lo[1] + ((hi[1] - lo[1]) * j) / 20;
          const p = window.__skisProject(lon, lat);
          if (!p) continue;
          const d = Math.hypot(p.x - sx, p.y - sy);
          if (!best || d < best.d) best = { lat, lon, d };
        }
      }
      const rLat = (hi[0] - lo[0]) / 10, rLon = (hi[1] - lo[1]) / 10;
      lo = [best.lat - rLat, best.lon - rLon];
      hi = [best.lat + rLat, best.lon + rLon];
    }
    return best;
  }, { sx, sy });

  const turnAt = async (zoomIns) => {
    await reset();
    for (let i = 0; i < zoomIns; i++) {
      await page.tap("[aria-label='Zoom in']");
      await page.waitForTimeout(150);
    }
    await page.waitForTimeout(500);
    const a = await anchorAt(cx, cy);
    const from = await view();
    const p0 = await page.evaluate((q) => window.__skisProject(q.lon, q.lat), a);
    const frames = [];
    for (let i = 0; i <= 16; i++) frames.push(grip(100, (i * Math.PI) / 45, i * 0.3));
    await twoFinger(frames);
    await page.waitForTimeout(450);
    const to = await view();
    const p1 = await page.evaluate((q) => window.__skisProject(q.lon, q.lat), a);
    return {
      anchorFrom: a.d,
      drift: Math.hypot(p1.x - p0.x, p1.y - p0.y),
      turned: Math.abs(to.bearing - from.bearing),
      zoom: from.zoom,
    };
  };

  const near = await turnAt(0);
  const far = await turnAt(8);
  check("the search really did find the point under the fingers",
    near.anchorFrom < 6 && far.anchorFrom < 6,
    `${near.anchorFrom.toFixed(0)}px and ${far.anchorFrom.toFixed(0)}px away`);
  // Without the pivot fix this was 126px and 1080px for the same two twists.
  check("what is under your fingers roughly stays under them",
    near.drift < 80, `${near.drift.toFixed(0)}px at zoom ${near.zoom.toFixed(1)}`);
  check("and it does not run away when you are close in",
    far.drift < 620, `${far.drift.toFixed(0)}px at zoom ${far.zoom.toFixed(1)}`);
  check("the same twist turns less the closer you are",
    far.turned < near.turned * 0.85,
    `${near.turned.toFixed(0)} degrees out, ${far.turned.toFixed(0)} degrees in`);
  check("but never so little that turning round takes four goes",
    far.turned > near.turned * 0.45,
    `${(far.turned / near.turned).toFixed(2)} of the far rate`);

  check("the needle turns with the map", Math.min(turned, 360 - turned) > 20,
      `${turned} degrees round from up`);
    await page.tap("[aria-label='Face north']");
    await page.waitForTimeout(700);
    const home = await needle();
    check("and tapping it faces north", Math.min(home, 360 - home) < 2,
      `${home} degrees round from up`);
    check("no page errors", page.errors.length === 0, page.errors.join(" | "));
    await page.context_.close();
  }
}

// ===================== 17. THE ARROW POINTS WHERE YOU ARE GOING ==
// The dot on the map carries a tip showing which way to go next. It is painted
// on a canvas in the dot's own colour, so checking it needs the projection: ask
// the map where the ends of the current leg land, then look at which way the
// pixels beyond the dot's edge lie.
if (feature("17. The arrow points where you are going")) {
  const page = await newPage(browser, { at: [9, 30] });
  await toPlan(page, `${url}?maptest=1`);
  await solve(page);
  await openRoute(page);
  await page.waitForSelector(".sheet__foot .btn");
  await page.click("text=/Save and start|Save offline and start|^Start$/");
  await page.waitForSelector(".nav", { timeout: 10000 });
  await page.waitForTimeout(1800);

  const SEL = "canvas[aria-label*='Terrain view']";
  if (!(await page.$(SEL))) {
    check("the cut-out is on screen", false, "no schematic canvas");
    await page.context_.close();
  } else {
    const offBy = async () => {
      // The direction you actually leave in, not the direction of the far end:
      // a piste that snakes points through the mountain if you aim at its
      // finish. A fifth of the way along the leg's own geometry is what the
      // arrow follows, so that is what this measures against, with the far end
      // kept as a sanity bound that it is not pointing backwards.
      const ends = await page.evaluate(() => {
        const l = window.__skisNavLeg;
        if (!l || !window.__skisProject) return null;
        const pts = l.coords;
        const seg = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
        let total = 0;
        for (let i = 1; i < pts.length; i++) total += seg(pts[i - 1], pts[i]);
        let run = 0;
        let early = pts[pts.length - 1];
        for (let i = 1; i < pts.length; i++) {
          run += seg(pts[i - 1], pts[i]);
          if (run >= total * 0.2) { early = pts[i]; break; }
        }
        const at = (q) => window.__skisProject(q[0], q[1]);
        return { from: at(pts[0]), to: at(early), far: at(pts[pts.length - 1]) };
      });
      if (!ends?.from || !ends?.to) return null;
      const arrow = await page.evaluate(({ sel, at }) => {
        const c = document.querySelector(sel);
        const dpr = c.width / c.getBoundingClientRect().width;
        const R = 40;
        const x0 = Math.max(0, Math.round((at.x - R) * dpr));
        const y0 = Math.max(0, Math.round((at.y - R) * dpr));
        const w = Math.min(c.width - x0, Math.round(2 * R * dpr));
        const h = Math.min(c.height - y0, Math.round(2 * R * dpr));
        if (w <= 0 || h <= 0) return null;
        const { data } = c.getContext("2d").getImageData(x0, y0, w, h);
        // Only past the dot's own edge: it is r=8 with a 2px ring, so anything
        // beyond 11px from its centre is arrow. The centroid of dot plus arrow
        // shifts about a pixel, which is far too little to take an angle from.
        let vx = 0, vy = 0, far = 0;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4;
            if (!(Math.abs(data[i]) < 14 && Math.abs(data[i + 1] - 0x77) < 14 && Math.abs(data[i + 2] - 0xa3) < 14)) continue;
            const px = (x0 + x) / dpr - at.x;
            const py = (y0 + y) / dpr - at.y;
            const d = Math.hypot(px, py);
            if (d < 11) continue;
            vx += px / d; vy += py / d; far++;
          }
        }
        return far ? { ang: Math.atan2(vy, vx), far } : null;
      }, { sel: SEL, at: ends.from });
      if (!arrow) return null;
      const off = (t) => {
        const want = Math.atan2(t.y - ends.from.y, t.x - ends.from.x);
        return Math.abs((((arrow.ang - want) * 180) / Math.PI + 540) % 360 - 180);
      };
      return { deg: off(ends.to), toFar: off(ends.far), far: arrow.far };
    };

    // Four legs, because a single one can be right by accident: the first
    // happened to sit close to the direction of travel even when the reading
    // was pure noise.
    const seen = [];
    for (let step = 0; step < 4; step++) {
      const r = await offBy();
      if (r) seen.push(r);
      check(`leg ${step + 1}: the arrow points the way this leg sets off`,
        r !== null && r.deg < 12, r ? `${r.deg.toFixed(0)} degrees off, ${r.far} arrow pixels` : "could not read it");
      check(`leg ${step + 1}: and not back the way you came`,
        r !== null && r.toFar < 90, r ? `${r.toFar.toFixed(0)} degrees from the far end` : "could not read it");
      const next = await page.$(".nav__foot .btn--nav");
      if (!next) break;
      await next.click();
      await page.waitForTimeout(900);
    }
    check("and it was actually drawn every time", seen.length === 4 && seen.every((r) => r.far >= 4),
      seen.map((r) => r.far).join(", "));
    check("no page errors", page.errors.length === 0, page.errors.join(" | "));
    await page.context_.close();
  }
}

// ===================== 19. NAVIGATE KEEPS ITS MAP CONTROLS ==
// The compass, the recentre and the zoom buttons hide when a sheet is dragged
// up over the map. Navigate has no sheet — its panel is pinned — so it used to
// inherit whatever the detail sheet had last been dragged to. Pull the route
// detail up to read the numbers, tap start, and the whole descent had no map
// controls at all.
if (feature("19. Navigate keeps its map controls")) {
  const page = await newPage(browser, { at: [9, 30] });
  await toPlan(page, url);
  await solve(page);
  await openRoute(page);
  await page.waitForSelector(".sheet__foot .btn");
  await page.waitForTimeout(700);

  const read = () => page.evaluate(() => {
    const t = document.querySelector(".maptools");
    if (!t) return { present: false };
    const r = t.getBoundingClientRect();
    return {
      present: true,
      shown: getComputedStyle(t).opacity === "1",
      buttons: [...t.querySelectorAll("button")].map((b) => b.getAttribute("aria-label")),
      onScreen: r.y >= 0 && r.bottom <= window.innerHeight + 1,
    };
  });

  /*
   * The controls stay. This used to drag the sheet up over them and check
   * they got out of the way, which was the right behaviour for a panel that
   * moved. The panel does not move any more and is short enough that they
   * never collide, so what has to hold is that they are there and usable
   * while the route is on screen.
   */
  const onRoute = await read();
  check("the map controls are there on the route", onRoute.shown === true, JSON.stringify(onRoute));
  check("and on screen, not under the bar", onRoute.onScreen === true);
  const gap = await page.evaluate(() => {
    const t = document.querySelector(".maptools").getBoundingClientRect();
    const s = document.querySelector(".sheet").getBoundingClientRect();
    return Math.round(s.y - t.bottom);
  });
  check("clear of the route bar", gap >= 0, `${gap}px above it`);

  await page.click("text=/Save and start|Save offline and start|^Start$/");
  await page.waitForSelector(".nav", { timeout: 10000 });
  await page.waitForTimeout(1500);

  const nav = await read();
  check("but starting from there still gives you them", nav.shown === true, JSON.stringify(nav));
  // Five since the map chooser joined them. Named rather than counted, so the
  // next one to arrive does not read as a regression.
  check("all of them, by name",
    ["Face north", "Recentre the view", "Zoom in", "Zoom out", "Choose the map"]
      .every((label) => (nav.buttons || []).includes(label)),
    (nav.buttons || []).join(", "));
  check("the compass among them", (nav.buttons || []).includes("Face north"));
  check("and they are on screen, not under the footer", nav.onScreen === true);

  // They must clear the panel they stack above, whatever it is carrying.
  const clear = await page.evaluate(() => {
    const t = document.querySelector(".maptools").getBoundingClientRect();
    const f = document.querySelector(".nav__foot").getBoundingClientRect();
    const h = document.querySelector(".nav__metrics").getBoundingClientRect();
    return { overFoot: Math.round(f.y - t.bottom), underHead: Math.round(t.y - h.bottom) };
  });
  check("clear of the footer", clear.overFoot >= 0, `${clear.overFoot}px above it`);
  check("and clear of the instruction", clear.underHead >= 0, `${clear.underHead}px below it`);
  check("no page errors", page.errors.length === 0, page.errors.join(" | "));
  await page.context_.close();
}

// ===================== 18. THE REST OF THE DAY, WITHOUT LEAVING NAVIGATION ==
// Navigate is pinned on purpose: nothing on it can be dragged out of the way by
// a glove. That is also why the whole route needs a button rather than a drag —
// on a chairlift the question is the way home, not the next hundred metres.
if (feature("18. The rest of the day, without leaving navigation")) {
  const page = await newPage(browser, { at: [9, 30] });
  await toPlan(page, url);
  await solve(page);
  await openRoute(page);
  await page.waitForSelector(".sheet__foot .btn");
  await page.click("text=/Save and start|Save offline and start|^Start$/");
  await page.waitForSelector(".nav", { timeout: 10000 });
  await page.waitForTimeout(1200);

  // Three legs in, so there is a past, a present and a future to show.
  // Held rather than clicked: the button ignores a tap on purpose.
  for (let i = 0; i < 3; i++) {
    await reachNext(page, ".nav__foot .btn--nav");
    await page.waitForTimeout(400);
  }
  await page.waitForTimeout(600);

  const legTotal = await page.evaluate(() => window.__skisRouteLegs ?? null);
  check("the map is what you see until you ask for the list",
    (await page.$(".nav__all")) === null, "no panel at rest");

  const handle = await page.$(".nav__more");
  check("and there is a button to ask with", handle !== null);

  await page.click(".nav__more");
  await page.waitForTimeout(500);

  const rows = await page.$$(".nav__all .leg");
  check("it opens the whole route, not just what is left",
    legTotal === null ? rows.length > 8 : rows.length === legTotal,
    `${rows.length} legs listed`);

  const nowRows = await page.$$(".nav__all .leg--now");
  check("with the leg you are on marked once", nowRows.length === 1, `${nowRows.length} marked now`);

  const nowIndex = await page.evaluate(() =>
    [...document.querySelectorAll(".nav__all .leg")].findIndex((n) => n.classList.contains("leg--now")));
  check("and it is the leg navigation is actually on", nowIndex === 3, `index ${nowIndex}, expected 3`);

  // A leg behind you has a real arrival time and this is not it, so it shows
  // none rather than the pace implied by where you are now.
  const times = await page.evaluate(() =>
    [...document.querySelectorAll(".nav__all .leg")].map((n) => ({
      done: n.classList.contains("leg--done"),
      t: n.querySelector(".leg__t")?.textContent.trim() ?? "",
    })));
  check("legs behind you do not carry an invented clock time",
    times.slice(0, 3).every((r) => r.done && r.t === ""), JSON.stringify(times.slice(0, 3)));
  check("legs ahead of you all carry one",
    times.slice(3).every((r) => /^\d\d:\d\d$/.test(r.t)),
    times.slice(3).map((r) => r.t).join(" ") || "none");
  // Reading down the list, the times only ever go forward.
  const ahead = times.slice(3).map((r) => Number(r.t.slice(0, 2)) * 60 + Number(r.t.slice(3)));
  check("and they run forwards", ahead.every((v, i) => i === 0 || v >= ahead[i - 1]),
    `${ahead[0]} to ${ahead[ahead.length - 1]}`);

  // The point of a pinned screen is that the thing you came to tap is still
  // there. Opening the route must not bury it.
  const stillThere = await page.$(".nav__foot .btn--nav");
  check("the button you came to tap is still on screen", stillThere !== null);
  const covered = await page.evaluate(() => {
    const b = document.querySelector(".nav__foot .btn--nav")?.getBoundingClientRect();
    if (!b) return null;
    const hit = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
    return hit?.closest(".btn--nav") !== null;
  });
  check("and nothing is sitting on top of it", covered === true);

  // No hole through to the terrain: the panel and its footer are one surface.
  // Read the composited screen, not the DOM. elementFromPoint answers "what
  // would a tap hit", and the footer catches taps whether or not you can see
  // through it — so it called a fully transparent footer solid. What matters
  // here is only what the eye gets.
  const box = await page.evaluate(() => {
    const f = document.querySelector(".nav__foot").getBoundingClientRect();
    return { y: Math.round(f.y) + 3, h: Math.round(f.height) - 6, w: Math.round(window.innerWidth) };
  });
  const png = PNG.sync.read(await page.screenshot());
  const at = (x, y) => {
    const i = (png.width * y + x) << 2;
    return [png.data[i], png.data[i + 1], png.data[i + 2]];
  };
  const scale = png.width / box.w;
  // The panel is one flat colour. Terrain behind a translucent footer is not:
  // it carries the sky gradient, the shading and the route line.
  const surface = at(Math.round(4 * scale), Math.round((box.y - 30) * scale));
  let seam = null;
  for (const x of [3, box.w - 4]) {
    for (let y = box.y; y < box.y + box.h && seam === null; y += 3) {
      const px = at(Math.round(x * scale), Math.round(y * scale));
      const off = Math.max(...px.map((v, i) => Math.abs(v - surface[i])));
      if (off > 18) seam = `${x},${y} is ${px.join()} against ${surface.join()}`;
    }
  }
  check("the map does not show through the panel's footer", seam === null,
    seam === null ? "solid" : `terrain visible at ${seam}`);

  // The chrome belongs to the map, so it goes away with it.
  const gone = await page.evaluate(() => {
    const t = document.querySelector(".maptools");
    return t === null || getComputedStyle(t).opacity === "0";
  });
  check("the map controls go with the map", gone === true);

  await page.click(".nav__more");
  await page.waitForTimeout(500);
  check("and it puts the map back", (await page.$(".nav__all")) === null);
  const backAgain = await page.evaluate(() => {
    const t = document.querySelector(".maptools");
    return t !== null && getComputedStyle(t).opacity === "1";
  });
  check("and the controls with it", backAgain === true);
  check("with the instruction never having gone away",
    (await page.$(".nav__head .nav__do")) !== null);
  check("no page errors", page.errors.length === 0, page.errors.join(" | "));
  await page.context_.close();
}

// ===================== 20. THE MOUNTAIN IS LABELLED ==
// A route that says "Champoluc" means nothing against an unlabelled ridge, and
// knowing which side of the mountain you are looking at is the whole mid-day
// case. Canvas text leaves no DOM, so the placement is read from the hook the
// renderer publishes under ?maptest=1.
if (feature("20. The mountain is labelled")) {
  const page = await newPage(browser, { at: [9, 30] });
  await page.goto(`${url}?maptest=1`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".hero", { timeout: 20000 });
  await page.click(".hero");
  await page.click("text=Go skiing");
  await page.waitForSelector(".planbtn", { timeout: 15000 });
  await page.waitForTimeout(2000);

  const labels = async () => (await page.evaluate(() => window.__skisLabels)) ?? [];
  const first = await labels();
  check("places are named without being asked", first.length >= 5, `${first.length} names`);
  const names = first.map((l) => l.name);
  /*
   * The bases this graph actually has, not four remembered from the
   * hand-typed one. Monterosa's OSM data spells it Stafal, and Alagna and
   * Frachey are not named nodes at all, so a fixed list of four could only
   * ever match one and the check was asserting a memory.
   */
  const bases = Object.values(NODES).filter((n) => n.base).map((n) => n.name);
  const shown = bases.filter((n) => names.includes(n));
  // At least one, not all of them: a base at the far end of the resort can be
  // outside the frame at rest, and a name that is off screen is not a name
  // that was dropped. What matters is that the ones in view are labelled.
  check("a valley base among them", shown.length >= 1,
    `${shown.join(", ") || "none"} of ${bases.join(", ")}`);

  // Overlapping names show fewer names than showing some of them.
  const clash = first.find((a, i) =>
    first.slice(i + 1).some((b) => a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t));
  check("and none of them overlaps another", !clash, clash ? clash.name : "clear");

  // The chrome is DOM over this canvas: whatever it covers, it covers.
  const chrome = await page.evaluate(() =>
    [".maptools", ".resortbar", ".planbtn", ".sheet"]
      .map((sel) => document.querySelector(sel))
      .filter((n) => n && getComputedStyle(n).opacity !== "0")
      .map((n) => { const r = n.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom }; }));
  const buried = first.find((a) =>
    chrome.some((c) => a.l < c.r && a.r > c.l && a.t < c.b && a.b > c.t));
  check("none is laid out under the app's own chrome", !buried,
    buried ? `${buried.name} at ${Math.round(buried.l)},${Math.round(buried.t)}` : "clear");

  const offEdge = first.find((a) => a.l < -1 || a.r > 431);
  check("and none runs off the side of the screen", !offEdge,
    offEdge ? `${offEdge.name} at ${Math.round(offEdge.l)}..${Math.round(offEdge.r)}` : "clear");

  // Zoom in and the names that lost the room come back.
  await page.evaluate(() => window.__skisView && null);
  for (let i = 0; i < 3; i++) {
    await page.click("[aria-label='Zoom in']");
    await page.waitForTimeout(320);
  }
  await page.waitForTimeout(700);
  const closer = await labels();
  check("zooming in does not lose them", closer.length >= 3, `${closer.length} names`);

  check("no page errors", page.errors.length === 0, page.errors.join(" | "));
  await page.context_.close();

  // Once a route is on screen the pins own their names; two copies of
  // "Staffal" in different styles reads as a printing fault.
  const routed = await newPage(browser, { at: [9, 30] });
  await toPlan(routed, `${url}?maptest=1`);
  await solve(routed);
  await routed.waitForTimeout(2000);
  const withRoute = (await routed.evaluate(() => window.__skisLabels)) ?? [];
  check("a place that is already a pin is not named twice",
    new Set(withRoute.map((l) => l.name)).size === withRoute.length,
    withRoute.map((l) => l.name).join(", "));

  /*
   * And nothing runs off the edge. Place names were pulled inside the frame
   * and route pins were not, so the route's own start and finish — the two
   * names that matter most on that screen — were the ones getting sliced:
   * Kronplatz drew "I - Valdaora I" against the left edge.
   */
  const pinned = (await routed.evaluate(() => window.__skisPinLabels)) ?? [];
  const vw = await routed.evaluate(() => innerWidth);
  const offscreen = [...withRoute, ...pinned].filter((l) => l.l < 0 || l.r > vw);
  check("every name on the map is inside the frame, pins included",
    offscreen.length === 0 && pinned.length > 0,
    offscreen.length ? offscreen.map((l) => `${l.name} ${Math.round(l.l)}..${Math.round(l.r)}`).join("; ")
      : `${withRoute.length} places, ${pinned.length} pins, frame ${vw}px`);
  check("no page errors on the routed map", routed.errors.length === 0, routed.errors.join(" | "));
  await routed.context_.close();
}

// ===================== 29. WHICH MAP YOU ARE LOOKING AT ==
// The drawn mountain is the one that needs nothing, and it is what a committed
// route falls back to on a chairlift with no signal. It should not be the only
// one on offer: a photograph of the same terrain is a different way of reading
// the same hill, and which one you want is a preference.
if (feature("29. Which map you are looking at")) {
  const page = await newPage(browser, { at: [9, 30] });
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".hero", { timeout: 20000 });
  await page.click(".hero");
  await page.click("text=Go skiing");
  await page.waitForSelector(".planbtn", { timeout: 15000 });
  await page.waitForTimeout(1500);

  const opener = await page.$('[aria-label="Choose the map"]');
  check("there is a way to change the map", opener !== null);
  if (!opener) { await page.context_.close(); }
  else {
    await opener.click();
    await page.waitForTimeout(400);
    const opts = await page.$$eval(".layers__opt", (n) => n.map((o) => ({
      // The option is its name and nothing else. Anything it cannot do is in
      // the small `i` beside it.
      name: (o.childNodes[0]?.textContent ?? "").trim(),
      why: o.querySelector("i")?.textContent ?? "",
      on: o.getAttribute("aria-pressed") === "true",
      disabled: o.disabled,
    })));
    check("it offers the drawn mountain and a photograph of it", opts.length >= 2,
      opts.map((o) => o.name).join(", "));
    check("one of them is the one you are on", opts.filter((o) => o.on).length === 1,
      opts.filter((o) => o.on).map((o) => o.name).join(", ") || "none marked");
    // Names, not sentences. A list of three things you can already see does
    // not need explaining, and the explanation was in the way of the choice.
    check("each is named and not explained", opts.every((o) => o.name.length > 2),
      opts.map((o) => o.name).join(", "));

    /*
     * The two MapTiler ones need a key. Without one they are shown and
     * disabled with the reason beside them rather than hidden: a feature you
     * cannot find is worse than one you cannot yet use, and the reason is
     * also the instruction.
     */
    const locked = opts.filter((o) => o.disabled);
    check("and anything unavailable says why, rather than vanishing",
      locked.every((o) => /key/i.test(o.why)),
      locked.map((o) => `${o.name}: ${o.why}`).join(" | ") || "nothing locked");

    // The drawn mountain never needs anything, so it is never the locked one.
    const drawn = opts.find((o) => /terrain/i.test(o.name));
    check("the one that needs nothing is always available", drawn && !drawn.disabled,
      drawn ? `${drawn.name} enabled` : "no terrain option");
    check("no page errors", page.errors.length === 0, page.errors.join(" | "));
    await page.context_.close();
  }
}

// ===================== 28. THE RUNS HAVE THEIR NAMES ON THEM ==
// A piste map names its pistes on the pistes. Ours named the junctions at
// either end and left the run between them anonymous, so you could see there
// was a red there and not that it was the Bettaforca.
if (feature("28. The runs have their names on them")) {
  const page = await newPage(browser, { at: [9, 30] });
  await page.goto(`${url}?maptest=1`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".hero", { timeout: 20000 });
  await page.click(".hero");
  await page.click("text=Go skiing");
  await page.waitForSelector(".planbtn", { timeout: 15000 });
  await page.waitForTimeout(1800);

  const names = () => page.evaluate(() => window.__skisRunNames ?? []);
  const far = await names();
  // Zoomed out the whole network is thirty overlapping names and the mountain
  // disappears under them, so at rest there are none.
  check("the mountain is not buried in piste names at rest", far.length === 0,
    `${far.length} names`);

  const zoomIn = await page.$('.maptools .iconbtn[aria-label="Zoom in"]');
  for (let i = 0; i < 5; i++) { await zoomIn.click(); await page.waitForTimeout(430); }
  await page.waitForTimeout(800);
  const near = await names();
  check("zooming in writes them along the runs", near.length >= 5,
    `${near.length}: ${near.slice(0, 4).join(", ")}`);
  check("and they are the names the resort uses",
    near.every((n) => typeof n === "string" && n.length > 1 && !/Point \d/.test(n)),
    near.find((n) => !n || /Point \d/.test(n)) ?? "all real");
  check("each piste is named once, not once per fragment",
    new Set(near).size === near.length,
    near.length - new Set(near).size + " duplicates");
  check("no page errors", page.errors.length === 0, page.errors.join(" | "));
  await page.context_.close();
}

// ===================== 27. HOW FAR IS THAT ==
// A map with no scale on it is a picture. This is the one thing on the
// mountain that answers "how far", and it has to keep answering it as the
// camera moves rather than being a number printed once.
if (feature("27. How far is that")) {
  const page = await newPage(browser, { at: [9, 30] });
  // The resort screen, not the plan form: the form is a full page and there is
  // no map behind it to put a scale on.
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".hero", { timeout: 20000 });
  await page.click(".hero");
  await page.click("text=Go skiing");
  await page.waitForSelector(".planbtn", { timeout: 15000 });
  await page.waitForTimeout(1800);

  const read = () => page.evaluate(() => {
    const el = document.querySelector(".mapscale");
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { label: el.textContent.trim(), px: Math.round(r.width), left: Math.round(r.left) };
  });

  const rest = await read();
  check("there is a scale on the map", rest !== null, rest ? `${rest.label} over ${rest.px}px` : "none");
  if (!rest) { await page.context_.close(); }
  else {
    check("it reads as a round distance", /^\d+(\.\d)? ?(m|km)$/.test(rest.label), rest.label);
    // Long enough to measure against and short enough to fit: a two pixel bar
    // and a bar off the side of the screen are both useless.
    check("the bar is a usable length", rest.px >= 50 && rest.px <= 170, `${rest.px}px`);
    check("and it is out of the way, bottom left", rest.left < 60, `${rest.left}px from the left`);

    const zoomIn = await page.$('.maptools .iconbtn[aria-label="Zoom in"]');
    for (let i = 0; i < 4; i++) { await zoomIn.click(); await page.waitForTimeout(420); }
    const close = await read();
    check("zooming in makes the same bar mean less ground",
      close && (close.metres ?? Number(close.label.replace(/[^\d.]/g, ""))) !== undefined &&
      close.label !== rest.label,
      `${rest.label} to ${close.label}`);
    check("and it is still a usable length", close.px >= 50 && close.px <= 170, `${close.px}px`);
    check("no page errors", page.errors.length === 0, page.errors.join(" | "));
    await page.context_.close();
  }
}

// ===================== 26. SOMEWHERE TO EAT, AND SOMEWHERE TO HIRE SKIS ==
// Most of what a skier reads off a piste map is not junctions: it is the huts.
// The app had every lift and every run on the mountain and not one restaurant.
if (feature("26. Somewhere to eat")) {
  const page = await newPage(browser, { at: [9, 30] });
  await page.goto(`${url}?maptest=1`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".hero", { timeout: 20000 });
  await page.click(".hero");
  await page.click("text=Go skiing");
  await page.waitForSelector(".planbtn", { timeout: 15000 });
  await page.waitForTimeout(2200);

  const drawn = (await page.evaluate(() => window.__skisPlaces)) ?? [];
  check("the mountain restaurants are on the map", drawn.length >= 8,
    `${drawn.length} drawn — ${drawn.slice(0, 3).map((d) => d.name).join(", ")}`);
  check("every one of them has a real name", drawn.every((d) => d.name && d.name.length > 2),
    drawn.map((d) => d.name).find((n) => !n || n.length <= 2) ?? "all named");

  // Markers go down before the station names take the room. Ranked the other
  // way round, four of Monterosa's twenty-five got drawn at all.
  const labels = (await page.evaluate(() => window.__skisLabels)) ?? [];
  const clash = drawn.find((a) => labels.some((b) => a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t));
  check("and none of them sits under a place name", !clash, clash ? clash.name : "clear");

  // And they are listed, because "is there anywhere to eat up there" is a
  // question you ask before you leave the car park.
  await page.click(".resortbar__main");
  await page.waitForTimeout(600);
  const listed = await page.evaluate(() => document.body.innerText);
  check("and listed in the resort panel", /On the mountain/i.test(listed));
  check("with what kind of place each one is, and how high",
    /(Mountain restaurant|Mountain hut|Summit restaurant|Restaurant|Bar|Ski hire), [\d,]+ m/.test(listed),
    listed.match(/(Mountain restaurant|Mountain hut|Restaurant|Bar|Ski hire), [\d,]+ m/)?.[0] ?? "no description");

  /*
   * And named the way a signpost names them. OSM carries the category in the
   * name — "Bar Ristorante Ostafa", "Gipfel Restaurant Cima" — which is the
   * same three words on every marker and the one word a skier wants buried in
   * the middle of them.
   */
  check("the names have their category words taken off",
    !/Bar Ristorante|Gipfel Restaurant|Baita Rifugio|Tavola Calda/i.test(listed),
    listed.match(/Bar Ristorante[^\n]*|Gipfel Restaurant[^\n]*|Baita Rifugio[^\n]*/i)?.[0] ?? "clean");
  check("and none of them came out blank",
    !/\n\s*\n\s*(Mountain|Restaurant|Bar|Ski hire)/.test(listed));
  check("no page errors", page.errors.length === 0, page.errors.join(" | "));
  await page.context_.close();
}

// ===================== 21. THE PANEL DOES NOT MOVE ==
// It used to be a sheet with three snap points, a drag handle and an expand
// button, and this feature checked that one tap reached the top. None of that
// exists now: over a map, a surface that slides under your thumb competes with
// the map's own gestures, so the panel is fixed and everything past the
// headline figures is a page of its own. What has to hold is that it stays put
// and stays short.
if (feature("21. The panel does not move")) {
  const page = await newPage(browser, { at: [9, 30] });
  await toPlan(page, url);
  await solve(page);
  await openRoute(page);
  await page.waitForSelector(".sheet__foot .btn", { timeout: 15000 });
  await page.waitForTimeout(700);

  const read = () => page.evaluate(() => {
    const s = document.querySelector(".sheet");
    return {
      h: Math.round(s.getBoundingClientRect().height),
      vh: window.innerHeight,
      grab: !!document.querySelector(".sheet__grab"),
      expand: !!document.querySelector(".sheet__expand"),
    };
  });

  const at = await read();
  check("there is nothing to drag", at.grab === false);
  check("and nothing to expand", at.expand === false);
  check("it takes a quarter of the screen, not half", at.h < at.vh * 0.3, `${at.h} of ${at.vh}`);

  // A drag over it is a drag over the map behind it, or nothing at all.
  const box = await page.$eval(".sheet", (n) => {
    const r = n.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width };
  });
  await page.mouse.move(box.x + box.w / 2, box.y + 12);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(box.x + box.w / 2, box.y + 12 - (300 * i) / 10);
  await page.mouse.up();
  await page.waitForTimeout(600);
  const after = await read();
  check("and dragging it changes nothing", after.h === at.h, `${at.h} to ${after.h}`);

  // The rest of the route is a tap away, and comes back.
  await openLegs(page);
  check("the legs are one tap away", (await page.$$(".leg")).length > 0,
    `${(await page.$$(".leg")).length} legs`);
  await page.click('[aria-label="Back to the map"]');
  await page.waitForSelector(".detail__legs", { timeout: 10000 });
  check("and the map comes back", (await page.$(".sheet")) !== null);
  check("no page errors", page.errors.length === 0, page.errors.join(" | "));
  await page.context_.close();
}

// ===================== 22. BROWSE THE OPTIONS BEFORE COMMITTING TO ONE ==
// Tapping a card used to jump straight to the detail screen, and a phone has
// no hover, so there was no way to see a day drawn on the mountain without
// picking it first and coming back. Comparing three days on the map is the
// whole job of this screen.
if (feature("22. Browse the options before committing to one")) {
  const page = await newPage(browser, { at: [9, 30] });
  await toPlan(page, `${url}?maptest=1`);
  await solve(page);
  await page.waitForTimeout(1600);

  const state = () => page.evaluate(() => ({
    onChoose: !!document.querySelector(".routecard"),
    cards: [...document.querySelectorAll(".routecard")].map((n) => ({
      title: n.querySelector(".routecard__nm")?.textContent,
      active: n.classList.contains("routecard--active"),
      pressed: n.querySelector(".routecard__body")?.getAttribute("aria-pressed"),
    })),
    go: [...document.querySelectorAll(".routecard__act .btn")]
      .map((b) => (b.classList.contains("btn--ghost") ? "quiet" : "primary")),
  }));

  // A signature of the route layer, so "the map changed" is measured rather
  // than assumed.
  const drawn = () => page.evaluate(() => {
    const c = document.querySelector("canvas[aria-label*='Terrain view']");
    const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
    let h = 0;
    for (let i = 0; i < d.length; i += 53) h = (Math.imul(h, 31) + d[i]) >>> 0;
    return h;
  });

  const first = await state();
  check("more than one day to compare", first.cards.length >= 2, `${first.cards.length} cards`);
  check("one of them is selected to start with",
    first.cards.filter((c) => c.active).length === 1,
    first.cards.map((c) => c.active).join(","));
  check("every day carries its own way in", first.go.length === first.cards.length, first.go.join(","));
  check("and only the selected one is the primary",
    first.go[0] === "primary" && first.go.slice(1).every((g) => g === "quiet"), first.go.join(","));

  const before = await drawn();

  const bodies = await page.$$(".routecard__body");
  await bodies[1].click();
  await page.waitForTimeout(1200);
  const second = await state();

  check("tapping another card does not leave the screen", second.onChoose === true);
  check("it moves the selection", second.cards[1].active && !second.cards[0].active,
    second.cards.map((c) => c.active).join(","));
  check("says so to a screen reader too", second.cards[1].pressed === "true",
    second.cards.map((c) => c.pressed).join(","));
  check("the weight follows the selection",
    second.go[1] === "primary" && second.go[0] === "quiet", second.go.join(","));
  check("and the mountain redraws with that day on it", (await drawn()) !== before);

  // The one that would make this pointless: opening the wrong day.
  const acts = await page.$$(".routecard__act .btn");
  await acts[1].click();
  await page.waitForTimeout(1400);
  const opened = await page.evaluate(() => ({
    title: document.querySelector(".sheet__head .title")?.textContent,
    // The primary, not merely the first: the footer's first button is now
    // "Back", which shares the row with it.
    start: document.querySelector(".sheet__foot .btn:not(.btn--quiet):not(.btn--ghost)")?.textContent.trim(),
  }));
  check("a card's button opens that card's day", opened.title === second.cards[1].title,
    `${opened.title} against ${second.cards[1].title}`);
  check("which is the one you commit from", /Save and start|Save offline and start|^Start$/.test(opened.start), opened.start);

  // Coming back must not silently reset to the first option.
  await page.click(".sheet__foot .btn--quiet");
  await page.waitForTimeout(1200);
  const returned = await state();
  check("going back keeps the day you were looking at",
    returned.cards[1]?.active === true, returned.cards.map((c) => c.active).join(","));

  // Selecting a card scrolls it into view, and it has to bring the whole card.
  // The browser scrolls the element it focused, which is the card body — the
  // card minus its button — so it used to stop with the label above the clip
  // and the button under the footer's fade.
  const framed = await page.evaluate(() => {
    const card = document.querySelector(".routecard--active");
    // The options are a full page, not a sheet body.
    const body = document.querySelector(".page__body").getBoundingClientRect();
    const lab = card.querySelector(".routecard__lab").getBoundingClientRect();
    const act = card.querySelector(".routecard__act .btn").getBoundingClientRect();
    return {
      label: Math.round(lab.top - body.top),
      // 20px of the bottom is the scroll fade; a primary action must clear it.
      button: Math.round(body.bottom - 20 - act.bottom),
    };
  });
  check("the selected card is not scrolled through its own label", framed.label >= -1,
    `${framed.label}px inside the top`);
  check("and its button is not left under the fade", framed.button >= -2,
    `${framed.button}px clear of the fade`);

  check("no page errors", page.errors.length === 0, page.errors.join(" | "));
  await page.context_.close();

  // Refine until nothing is left. A ninety minute window that solves, then
  // Shorter and Lunch on top of it, genuinely empties the list — an earlier
  // version of this check used a window the solver could always fill, so it
  // asserted nothing.
  const empty = await newPage(browser, { at: [9, 30] });
  await toPlan(empty, url);
  await empty.fill("#p-t0", "11:00");
  await empty.fill("#p-t1", "12:30");
  await solve(empty);
  await empty.waitForTimeout(900);
  const startedWith = await empty.$$eval(".routecard", (n) => n.length);
  check("a window that does offer days to begin with", startedWith > 0, `${startedWith} cards`);
  for (const label of ["Shorter", "Lunch"]) {
    const chip = await empty.$(`.chips button:text-is("${label}")`);
    if (chip) { await chip.click(); await empty.waitForTimeout(1000); }
  }
  await empty.waitForTimeout(700);
  const gone = await empty.evaluate(() => ({
    cards: document.querySelectorAll(".routecard").length,
    warn: !!document.querySelector(".warn"),
    go: document.querySelectorAll(".routecard__act .btn").length,
  }));
  check("the refinement really did rule everything out", gone.cards === 0 && gone.warn,
    JSON.stringify(gone));
  check("and nothing is offering to open a day that is not there", gone.go === 0,
    `${gone.go} buttons`);
  check("the chips are still there, because they are the way back",
    (await empty.$$(".chips .chip")).length > 0);
  check("no page errors while refining", empty.errors.length === 0, empty.errors.join(" | "));
  await empty.context_.close();
}

// ===================== 23. THE PEOPLE YOU SKI WITH ==
// Added by phone number, because that is the thing two people already have for
// each other. The number is the identity, so the form is fussy about it: get
// it wrong and you share your position with a stranger.
if (feature("23. The people you ski with")) {
  const page = await newPage(browser, { at: [9, 30] });
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".hero", { timeout: 20000 });

  const section = await page.$(".rowhead:has-text('Skiing with')");
  check("there is a place for them on the home screen", section !== null);

  // Not a disclaimer. Someone who believes their group can find them on a
  // mountain, and is wrong, is in more trouble than someone who knows.
  // On the substance, not the sentence: this line has been reworded twice and
  // an exact-phrase match broke both times without anything being wrong.
  const warned = await page.evaluate(() =>
    // Either weight of callout. What is asserted here is the substance, and
    // pinning the class as well made a quieter banner read as a missing one.
    [...document.querySelectorAll(".banner--warn p, .banner--note p")].some((n) => {
      const t = n.textContent.toLowerCase();
      return /not connected|nothing is sent|no(body|t) .*see you/.test(t)
        && /this phone|sent anywhere|connected/.test(t);
    }));
  check("and it says up front that nobody can see you yet", warned === true,
    await page.evaluate(() => document.querySelector(".banner--warn p")?.textContent.trim()));
  check("nobody on the list to begin with", (await page.$$(".friend")).length === 0);

  const add = async (name, phone) => {
    await page.click("text=Add someone");
    await page.waitForSelector(".modal", { timeout: 5000 });
    await page.fill("#f-name", name);
    await page.fill("#f-phone", phone);
    await page.click(".modal .btn[type=submit]");
    await page.waitForTimeout(500);
  };

  await page.click("text=Add someone");
  await page.waitForSelector(".modal");
  const fields = await page.$$eval(".modal input", (n) => n.map((i) => i.id));
  check("it asks for a name and a number and nothing else",
    fields.length === 2 && fields.includes("f-name") && fields.includes("f-phone"),
    fields.join(", "));
  check("and never for a picture",
    (await page.$(".modal input[type=file]")) === null);

  // The case that matters. "3331112222" is one person to an Italian reader and
  // a different person to a British one.
  await page.fill("#f-name", "Ana");
  await page.fill("#f-phone", "3331112222");
  await page.click(".modal .btn[type=submit]");
  await page.waitForTimeout(400);
  const refused = await page.$eval(".note--bad", (n) => n.textContent.trim()).catch(() => "");
  check("a number with no country code is refused", /country code/i.test(refused), refused);
  check("and nobody was added", (await page.$$(".friend")).length === 0);
  await page.fill("#f-phone", "+39 333 111 2222");
  await page.click(".modal .btn[type=submit]");
  await page.waitForTimeout(600);
  check("with the country code it goes through", (await page.$(".modal")) === null);
  check("and they are on the list", (await page.$$(".friend")).length === 1);
  check("with their number shown, because two people share a first name",
    /333/.test(await page.$eval(".friend__no", (n) => n.textContent)));

  // The same person typed another way must not become a second record: the
  // switch you flipped would be on the one nobody reads.
  await page.click("text=Add someone");
  await page.waitForSelector(".modal");
  await page.fill("#f-name", "Ana again");
  await page.fill("#f-phone", "0039 333 111 2222");
  await page.click(".modal .btn[type=submit]");
  await page.waitForTimeout(400);
  const dup = await page.$eval(".note--bad", (n) => n.textContent.trim()).catch(() => "");
  check("the same number spelled differently is one person", /already on the list/i.test(dup), dup);
  await page.click(".modal [aria-label='Close']");
  await page.waitForTimeout(400);
  check("still one of them", (await page.$$(".friend")).length === 1);

  // Sharing is off until you turn it on, and cannot be turned on anonymously.
  check("nobody is shared with just by being added",
    (await page.$eval(".friend .chip", (b) => b.getAttribute("aria-pressed"))) === "false");
  check("and it cannot be turned on before you say who you are",
    (await page.$eval(".friend .chip", (b) => b.disabled)) === true);
  check("with a line saying what to do about it", (await page.$(".promptrow")) !== null);

  await page.click("[aria-label='Settings']");
  await page.waitForSelector("#s-name", { timeout: 5000 });
  check("the profile is in settings", (await page.$("#s-phone")) !== null);
  check("and it has no picture either", (await page.$(".modal input[type=file]")) === null);
  await page.fill("#s-name", "Simo");
  await page.fill("#s-phone", "+39 333 123 4567");
  await page.click("#s-name");
  await page.waitForTimeout(400);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(600);

  check("once you have, sharing can be turned on",
    (await page.$eval(".friend .chip", (b) => b.disabled)) === false);
  check("and the prompt to set it up is gone", (await page.$(".promptrow")) === null);

  await add("Bo", "+39 333 111 3333");
  check("a second person can be added", (await page.$$(".friend")).length === 2);
  const chips = await page.$$(".friend .chip");
  await chips[0].click();
  await page.waitForTimeout(500);
  const state = await page.$$eval(".friend .chip", (n) =>
    n.map((b) => b.getAttribute("aria-pressed")));
  check("sharing with one does not share with the other", state.join(",") === "true,false", state.join(","));

  // Your own number is not a friend.
  await page.click("text=Add someone");
  await page.waitForSelector(".modal");
  await page.fill("#f-name", "Me");
  await page.fill("#f-phone", "+393331234567");
  await page.click(".modal .btn[type=submit]");
  await page.waitForTimeout(400);
  check("you cannot add yourself",
    /your own number/i.test(await page.$eval(".note--bad", (n) => n.textContent).catch(() => "")));
  await page.click(".modal [aria-label='Close']");
  await page.waitForTimeout(300);

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector(".hero", { timeout: 20000 });
  await page.waitForTimeout(700);
  const kept = await page.$$eval(".friend .chip", (n) => n.map((b) => b.getAttribute("aria-pressed")));
  check("all of it survives a reload", kept.join(",") === "true,false", kept.join(","));
  check("including who you are",
    (await page.$$(".promptrow")).length === 0);

  const x = await page.$$(".friend__x");
  await x[1].click();
  await page.waitForTimeout(500);
  const left = await page.$$eval(".friend__nm", (n) => n.map((e) => e.textContent));
  check("and someone can be taken off the list", left.join(",") === "Ana", left.join(","));
  check("no page errors", page.errors.length === 0, page.errors.join(" | "));
  await page.context_.close();
}

// ===================== 24. THE MOUNTAIN IS GRADED BEFORE YOU PLAN ANYTHING ==
// The network used to be drawn in white dashes, so an unplanned mountain told
// you where the pistes were but not which of them you could ski. Knowing which
// side of the hill is blue is the first thing anyone wants off a ski map, and
// it should not require choosing a day first.
if (feature("24. The mountain is graded before you plan anything")) {
  const page = await newPage(browser, { at: [9, 30] });
  await page.goto(`${url}?maptest=1`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".hero", { timeout: 20000 });
  await page.click(".hero");
  await page.click("text=Go skiing");
  await page.waitForSelector(".planbtn", { timeout: 15000 });
  await page.waitForTimeout(2000);

  // Count pixels near each grade's hue — but only ones that belong to a LINE.
  //
  // The first version of this counted the sky: the washed-out blue of a blue
  // run is, unsurprisingly, close to the colour of a sky, and it reported
  // fifty thousand blue pixels on a mountain with about four hundred. The sky
  // is a vertical gradient, so it barely changes from one pixel to the next
  // across the screen, while a drawn line differs sharply from what is beside
  // it. Requiring that horizontal step is what separates the two.
  const tally = () => page.evaluate(() => {
    const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const targets = {
      tintBlue: hex("#6ea6e4"), tintRed: hex("#db7f87"),
      fullBlue: hex("#1d6fcc"), fullRed: hex("#c22b37"),
    };
    const c = document.querySelector("canvas[aria-label*='Terrain view']");
    const { data, width, height } = c.getContext("2d").getImageData(0, 0, c.width, c.height);
    const at = (x, y) => { const i = (y * width + x) << 2; return [data[i], data[i + 1], data[i + 2]]; };
    const out = { tintBlue: 0, tintRed: 0, fullBlue: 0, fullRed: 0 };
    for (let y = 0; y < height; y++) {
      for (let x = 4; x < width - 4; x++) {
        const px = at(x, y);
        const near = Math.max(...px.map((v, i) => Math.abs(v - at(x - 4, y)[i])));
        if (near < 22) continue; // flat: sky, snowfield, slab
        for (const k in targets) {
          const t = targets[k];
          if (Math.abs(px[0] - t[0]) < 24 && Math.abs(px[1] - t[1]) < 24 &&
              Math.abs(px[2] - t[2]) < 24) { out[k]++; break; }
        }
      }
    }
    return out;
  });

  const rest = await tally();
  check("blue runs are drawn blue with nothing planned", rest.tintBlue > 40, `${rest.tintBlue} px`);
  check("and red runs red", rest.tintRed > 40, `${rest.tintRed} px`);
  check("so the network is graded, not one colour",
    rest.tintBlue > 40 && rest.tintRed > 40,
    `blue ${rest.tintBlue}, red ${rest.tintRed}`);
  check("and it is the washed-out weight, not the route's",
    rest.tintBlue + rest.tintRed > rest.fullBlue + rest.fullRed,
    `tint ${rest.tintBlue + rest.tintRed}, full ${rest.fullBlue + rest.fullRed}`);

  // With a day on the map the route has to be unmistakably the route, and the
  // rest of the mountain still has to be there.
  await page.click(".planbtn");
  await page.waitForSelector("#p-t1", { timeout: 15000 });
  await page.click("text=Find routes");
  await page.waitForSelector(".routecard", { timeout: 20000 });
  await page.waitForTimeout(2000);
  const withRoute = await tally();
  check("a planned route is drawn at full strength",
    withRoute.fullBlue + withRoute.fullRed > 100,
    `${withRoute.fullBlue + withRoute.fullRed} px`);
  check("and it outweighs the network behind it",
    withRoute.fullBlue + withRoute.fullRed > withRoute.tintBlue + withRoute.tintRed,
    `route ${withRoute.fullBlue + withRoute.fullRed}, network ${withRoute.tintBlue + withRoute.tintRed}`);
  check("which is still there rather than switched off",
    withRoute.tintBlue + withRoute.tintRed > 20,
    `${withRoute.tintBlue + withRoute.tintRed} px of network`);
  check("no page errors", page.errors.length === 0, page.errors.join(" | "));
  await page.context_.close();
}

// ===================== 25. RUNNING LATE COSTS ONE ROW, NOT THREE ==
// The overrun state used to stack three full-width rows over the map: the
// "rest of the day" handle, a banner with a full-width re-plan inside it, and
// the primary. On a screen whose job is showing you the mountain that is most
// of the mountain gone.
if (feature("25. Running late costs one row, not three")) {
  const page = await newPage(browser, { at: [14, 30] });
  await toPlan(page, url);
  await page.fill("#p-t0", "09:00");
  await page.fill("#p-t1", "16:00");
  await solve(page);
  await openRoute(page, 0);
  await page.waitForSelector(".sheet__foot .btn", { timeout: 15000 });
  await page.click("text=/Save and start|Save offline and start|^Start$/");
  await page.waitForSelector(".nav", { timeout: 10000 });
  await page.waitForTimeout(1400);

  const shape = () => page.evaluate(() => {
    const foot = document.querySelector(".nav__foot").getBoundingClientRect();
    const btns = [...document.querySelectorAll(".nav__actions .btn")];
    return {
      over: !!document.querySelector(".nav__over"),
      footH: Math.round(foot.height),
      map: Math.round(foot.y),
      rows: btns.length,
      sameRow: btns.length === 2
        && Math.abs(btns[0].getBoundingClientRect().y - btns[1].getBoundingClientRect().y) < 4,
      tall: Math.max(...btns.map((b) => Math.round(b.getBoundingClientRect().height))),
      labels: btns.map((b) => b.innerText.replace(/\s+/g, " ").trim()),
      dismiss: !!document.querySelector(".nav__overx"),
    };
  });

  const late = await shape();
  check("the plan does overrun, so there is something to show", late.over === true);
  check("re-plan sits beside the primary, not above it", late.sameRow === true,
    late.labels.join(" | "));
  check("and the primary is still the one that says where you are going",
    /^Reached /.test(late.labels[1] ?? ""), late.labels[1]);

  // A junction name is up to sixteen characters, and the row must not grow
  // to swallow it.
  for (let i = 0; i < 14; i++) {
    const btns = await page.$$(".nav__actions .btn");
    const b = btns[btns.length - 1];
    if (!b || !(await page.$(".nav__foot"))) break;
    if (/Passo dei Salati|Colle Bettaforca/.test((await b.textContent()).trim())) break;
    await b.click();
    await page.waitForTimeout(150);
  }
  if (await page.$(".nav__foot")) {
    const long = await shape();
    check("the longest junction name does not stretch the row",
      long.tall <= late.tall + 2, `${long.tall}px against ${late.tall}px — ${long.labels[1]}`);
    check("and both buttons are still a proper tap target", long.tall >= 44, `${long.tall}px`);

    // Seen it, put it away. The re-plan has to stay: it is the way out.
    check("the overrun note can be dismissed", long.dismiss === true);
    await page.click(".nav__overx");
    await page.waitForTimeout(500);
    const gone = await shape();
    check("dismissing it gives the map the row back", gone.map > long.map + 40,
      `${long.map}px of map became ${gone.map}px`);
    check("the note is gone", gone.over === false);
    check("but re-plan is not", gone.rows === 2 && /Re-plan/.test(gone.labels[0] ?? ""),
      gone.labels.join(" | "));
  }
  check("no page errors", page.errors.length === 0, page.errors.join(" | "));
  await page.context_.close();
}

} finally {
  await browser.close();
  server.close();
}

console.log(`\n  ${[...counts].map(([k, v]) => `${v} in "${k.split(":")[0]}"`).join(", ")}`);
console.log(failures ? `\n  ${failures} FAILING of ${ran} checks\n` : `\n  all ${ran} feature checks passed\n`);
process.exit(failures ? 1 : 0);
