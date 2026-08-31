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
import { NODES } from "../src/resort.js";
import { SKIRT_LIT, SKIRT_SHADE, BASE_COLOUR } from "../src/map/field.js";
import { DWELL_MS as DWELL } from "../src/lib/progress.js";
import {
  serve,
  newPage,
  launch,
  toPlan,
  toForm,
  multiTouch,
  solve,
  routeCount,
  toMinutes,
} from "./harness.mjs";

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
    if (document.querySelector(".routecard, .sheet .chips .chip")) return "choose";
    if (document.querySelector(".legs")) return "detail";
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
  await page.selectOption("#p-start", "salati");
  await page.selectOption("#p-finish", "champoluc");
  check("picking two different ends re-enables it", !(await page.$eval(".page__foot .btn", (n) => n.disabled)));

  await page.click("text=Take me there");
  await page.waitForSelector(".legs, .empty", { timeout: 20000 });
  check("it goes straight to the route, with nothing to choose between", (await where(page)) === "detail");

  const body = await text(page);
  check("the route is named for where it is going", /To Champoluc/.test(body), body.split("\n")[1] || "");
  check("it is not dressed up as one of several options", !body.includes("Most vertical"));

  const legs = await page.$$eval(".leg", (n) => n.length);
  check("it has legs to follow", legs > 0, `${legs} legs`);

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
  // The discriminating case. Salati to Champoluc is 54 minutes on red and does
  // not exist at all on blue. So a leftover "Easier" from a day plan does not
  // merely shade the answer, it turns a real transfer into "no way there".
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

  await page.click('.iconbtn[aria-label="Back"]');
  await page.waitForSelector("#p-t1", { timeout: 10000 });
  await page.click('.segmented__opt:has-text("Straight there")');
  await page.selectOption("#p-start", "salati");
  await page.selectOption("#p-finish", "champoluc");
  await page.fill("#p-t0", "11:00");
  await page.fill("#p-t1", "12:20");
  await page.click("text=Take me there");
  await page.waitForSelector(".legs, .empty", { timeout: 20000 });

  check(
    "the transfer is found on the ability you actually set",
    (await where(page)) === "detail",
    await where(page)
  );
  const body = await text(page);
  check("it goes where you asked", /To Champoluc/.test(body));
  check(
    "an 80 minute window is not quietly cut to 48 by a stale Shorter",
    !/further than that/.test(body)
  );
  const legs = await page.$$eval(".leg", (n) => n.map((l) => l.textContent.trim()));
  check("it uses red terrain, which blue-only would have ruled out", legs.length > 0, `${legs.length} legs`);
  check("the legs are real named runs and lifts", legs.every((l) => l.length > 3));
  check("it is one answer, not a shortlist", (await routeCount(page)) === 0, `${await routeCount(page)} cards`);

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
  await page.selectOption("#p-start", "salati");
  await page.selectOption("#p-finish", "gabiet");
  await page.fill("#p-t0", "11:30");
  await page.fill("#p-t1", "16:00");
  await solve(page);
  const n = await routeCount(page);
  check("a day between two mid-mountain points solves", n > 0, `${n} routes`);

  if (n > 0) {
    await page.click(".routecard");
    await page.waitForSelector(".legs", { timeout: 15000 });
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

  const chips = await page.$$eval(".sheet .chip", (n) => n.map((b) => b.textContent.trim()));
  check("the refine chips are one tap away", chips.length >= 6, chips.join(", "));
  for (const want of ["Shorter", "Longer", "Easier", "Harder", "More vertical", "No drags", "Lunch"]) {
    check(`"${want}" is offered`, chips.includes(want));
  }

  // Each chip re-solves in place.
  for (const chip of ["Shorter", "More vertical", "No drags"]) {
    const btn = await page.$(`.sheet .chip:text-is("${chip}")`);
    if (!btn || (await btn.isDisabled())) { check(`"${chip}" is tappable`, false, "disabled"); continue; }
    await btn.click();
    await page.waitForTimeout(700);
    check(`"${chip}" keeps you on the options`, (await where(page)) === "choose", await where(page));
    check(`"${chip}" is now on`, (await btn.getAttribute("aria-pressed")) === "true");
  }

  // Opposites cancel rather than stacking.
  const longer = await page.$('.sheet .chip:text-is("Longer")');
  await longer.click();
  await page.waitForTimeout(700);
  const shorterOn = await page.$eval('.sheet .chip:text-is("Shorter")', (b) => b.getAttribute("aria-pressed"));
  check("turning on Longer turns Shorter off rather than stacking", shorterOn !== "true", `shorter=${shorterOn}`);

  // Tapping twice in quick succession must not leave a stale answer on screen.
  // Selectors rather than handles: a re-solve re-renders the row underneath.
  const routesBefore = await routeCount(page);
  await page.click('.sheet .chip:text-is("Easier")');
  await page.click('.sheet .chip:text-is("Harder")', { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const easierOn = await page.$eval('.sheet .chip:text-is("Easier")', (x) => x.getAttribute("aria-pressed"));
  const harderOn = await page.$eval('.sheet .chip:text-is("Harder")', (x) => x.getAttribute("aria-pressed"));
  check(
    "opposites never end up both on",
    !(easierOn === "true" && harderOn === "true"),
    `easier=${easierOn} harder=${harderOn}`
  );
  check("the list settles rather than emptying", (await routeCount(page)) > 0, `${await routeCount(page)} (was ${routesBefore})`);
  check("and it is not left spinning", !(await page.$(".chip--busy")), "still busy");

  check("still on the options after all of that", (await where(page)) === "choose");
  check("never once back at the form", (await page.$("#p-t1")) === null);

  // The chip that rules everything out is the make-or-break case: it must not
  // throw the user onto a screen whose only exit is the form.
  for (const chip of ["Shorter", "More vertical", "No drags", "Longer", "Easier"]) {
    const el = await page.$(`.sheet .chip:text-is("${chip}")`);
    if (el && !(await el.isDisabled()) && (await el.getAttribute("aria-pressed")) !== "true") {
      await el.click();
      await page.waitForTimeout(800);
    }
  }
  const emptied = (await routeCount(page)) === 0;
  check("stacking every refinement can rule the day out", emptied, `${await routeCount(page)} routes`);
  if (emptied) {
    check("and it says so rather than showing an empty list", /rules everything out/i.test(await text(page)));
    check("it is not the dead-end empty screen", (await where(page)) === "choose", await where(page));
    check("the chips are still there to undo it", (await page.$$(".sheet .chip")).length > 0);
    check("the offending chip is still tappable", !(await page.$eval('.sheet .chip:text-is("Easier")', (b) => b.disabled)));
    check("the budget is stated as time, not raw minutes", !/\b\d{3,} minutes\b/.test(await text(page)));
    await page.click('.sheet .chip:text-is("Easier")');
    await page.waitForTimeout(1200);
    check("undoing it brings the options straight back", (await routeCount(page)) > 0, `${await routeCount(page)} routes`);
    check("without ever passing through the form", (await page.$("#p-t1")) === null);
  }
  check("no page errors", page.errors.length === 0, page.errors.join(" | "));
  await page.context_.close();
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
  await page.click(".routecard");
  await page.waitForSelector(".sheet__foot .btn", { timeout: 15000 });
  await page.click("text=/Save offline and start|^Start$/");
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
    await manual.click();
    await page.waitForTimeout(400);
    check("tapping Reached advances a leg", (await legNumber()) === before + 1, `${before} to ${await legNumber()}`);
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
  await page.click(".routecard");
  await page.waitForSelector(".sheet__foot .btn", { timeout: 15000 });
  await page.click("text=/Save offline and start|^Start$/");
  await page.waitForSelector(".nav", { timeout: 20000 });

  for (let i = 0; i < 120; i++) {
    const b = await page.$('.nav__foot .btn:has-text("Reached")');
    if (!b) break;
    await b.click();
    await page.waitForTimeout(20);
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
    (await page.$$(".maptools .iconbtn")).length === 3);

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
  await page.click(".routecard");
  await page.waitForSelector(".sheet__foot .btn", { timeout: 15000 });
  check("the route detail is still a sheet", (await page.$(".sheet")) !== null);

  await page.click("text=/Save offline and start|^Start$/");
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
  check("the mountain does, and they are all there", (await chrome()) >= 3, `${await chrome()}`);

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
  await page.click(".routecard");
  await page.waitForSelector(".legs", { timeout: 15000 });
  await record("detail");
  await page.click("text=/Save offline and start|^Start$/");
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
    const enough = Math.max(3, rest * 0.35);

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
    await page.click("[aria-label='Face north and tilt']");
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
      await page.tap("[aria-label='Face north and tilt']");
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
    check("a twist rotates", Math.abs(b.bearing - a.bearing) > 5,
      `${a.bearing.toFixed(0)} to ${b.bearing.toFixed(0)}`);
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
    await twoFinger(hand((t, i) => pair(90 * (1 + 0.02 * t), rad(26) * t, 0, 8 * t, i)));
    b = await view();
    const panMoved = await page.evaluate(() => {
      const v = window.__skisView;
      return Math.round(Math.hypot(v.panX, v.panY));
    });
    check("a real hand's twist rotates", Math.abs(b.bearing - a.bearing) > 8,
      `${(b.bearing - a.bearing).toFixed(0)} degrees`);
    check("and does not slide the mountain at the same time", panMoved < 6,
      `${panMoved}px of pan`);
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
    check("no page errors", page.errors.length === 0, page.errors.join(" | "));
    await page.context_.close();
  }
}

} finally {
  await browser.close();
  server.close();
}

console.log(`\n  ${[...counts].map(([k, v]) => `${v} in "${k.split(":")[0]}"`).join(", ")}`);
console.log(failures ? `\n  ${failures} FAILING of ${ran} checks\n` : `\n  all ${ran} feature checks passed\n`);
process.exit(failures ? 1 : 0);
