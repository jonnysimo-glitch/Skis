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
import { DWELL_MS as DWELL } from "../src/lib/progress.js";
import {
  serve,
  newPage,
  launch,
  toPlan,
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
if (feature("8. The skiing tab opens on the mountain")) {
  const page = await newPage(browser, { at: [9, 30] });
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".hero", { timeout: 20000 });
  await page.click(".hero");
  await page.click("text=Go skiing");
  await page.waitForSelector(".planbtn", { timeout: 15000 });

  check("it is not a form", (await page.$("#p-t1")) === null);
  check("the map is there", (await page.$("canvas")) !== null);
  check("the resort card is fixed, not a sheet you drag",
    (await page.$(".resortpanel")) !== null && (await page.$(".sheet__grab")) === null);
  const body = await text(page);
  check("it names the resort", /Monterosa Ski/.test(body));
  // innerText returns text-transform: uppercase as uppercase.
  check("and says where that is", /valle d'aosta/i.test(body), body.match(/VALLE[^\n]*/i)?.[0] || "");
  check("it shows what the mountain has", /lifts/i.test(body) && /runs/i.test(body), body.match(/\d+\s*\n?LIFTS/i)?.[0] || "");
  check("including when the lifts stop", /last down/i.test(body));

  const planText = await page.$eval(".planbtn", (b) => b.textContent.trim());
  check("there is one button and it says Plan", /Plan/.test(planText), planText);
  const planBox = await page.$eval(".planbtn", (b) => { const r = b.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; });
  check("it is a real target", planBox.h >= 44 && planBox.w >= 80, `${planBox.w}x${planBox.h}`);

  check("the resort name is not truncated", await page.$eval(".resortpill__nm", (n) => n.scrollWidth <= n.clientWidth + 1),
    await page.$eval(".resortpill__nm", (n) => `${n.scrollWidth} in ${n.clientWidth}`));
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

  await page.click(".nav__stop");
  await page.waitForTimeout(500);
  check("stopping returns to the route", (await page.$(".sheet")) !== null);
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
