/**
 * End-to-end checks. Run with: npm run e2e
 *
 * Same idiom as solver.test.js — behavioural assertions with a PASS/FAIL line
 * each, not a test framework. These drive the real production build in a real
 * browser, because most of what can break here is interaction: a select whose
 * value is not in its own options, a promise that never settles, a geolocation
 * failure that leaves a spinner running forever.
 *
 * Serves `dist/` itself, so it always tests what would actually ship.
 * Pass --headed to watch it, --only=<word> to run one section.
 */
import {
  serve,
  newPage as makePage,
  launch,
  toPlan,
  solve,
  openRoute,
  openLegs,
  routeCount,
  toMinutes,
  reachNext,
  toForm,
} from "./harness.mjs";

import { RESORTS } from "../src/resorts/index.js";
import { graphFor } from "../src/resorts/graphs.js";

const LIVE = RESORTS.filter((r) => r.available);
const SOON = RESORTS.filter((r) => !r.available);

// The graph of whichever resort the app opens on. Assertions read place keys
// and names from here rather than naming them, because the keys are generated
// from OSM names and change whenever a resort is rebuilt.
const liveGraph = graphFor(LIVE[0].id);
const allKeys = Object.keys(liveGraph.NODES);
const baseKeys = allKeys.filter((k) => liveGraph.NODES[k].base);

/**
 * The key of the place called `name`, or null.
 *
 * Cases used to name keys directly — "champoluc" — which stopped existing when
 * the graph came from OSM: that place is now a node keyed p31 that carries the
 * name Champoluc. A selectOption for a value with no option waits until the
 * whole run times out, so this looks the name up instead.
 */
const keyNamed = (name) =>
  allKeys.find((k) => new RegExp(name, "i").test(liveGraph.NODES[k].name)) ?? null;

const HEADED = process.argv.includes("--headed");
const ONLY = (process.argv.find((a) => a.startsWith("--only=")) || "").slice(7).toLowerCase();

// ---------------------------------------------------------------- harness --

let failures = 0;
let ran = 0;
let currentSection = "";
const sectionsRun = new Set();

function section(name) {
  currentSection = name;
  if (ONLY && !name.toLowerCase().includes(ONLY)) return false;
  sectionsRun.add(name);
  console.log(`\n${name.toUpperCase()}`);
  return true;
}

function check(name, condition, detail = "") {
  ran++;
  const status = condition ? "PASS" : "FAIL";
  if (!condition) failures++;
  console.log(`  ${status}  ${name}${detail ? "  — " + detail : ""}`);
}

const newPage = (browser, opts) => makePage(browser, opts);

// ------------------------------------------------------------------- run --

const { server, port, url } = await serve();
const browser = await launch({ headed: HEADED });

try {
  // =========================================================== A. RESORT ==
  if (section("A. Home")) {
    const page = await newPage(browser);
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".hero", { timeout: 20000 });

    check(
      "home is a page, not a sheet over the map",
      (await page.$(".page")) !== null && (await page.$("canvas")) === null,
      "choosing a resort while looking at that resort's terrain is backwards"
    );
    check("there are three destinations", (await page.$$(".tabbar__tab")).length === 3);
    check(
      "and settings is not one of them",
      !(await page.$$eval(".tabbar__tab", (n) => n.map((t) => t.textContent))).some((t) => /settings/i.test(t))
    );
    check("settings is reachable from the bar", (await page.$('.iconbtn[aria-label="Settings"]')) !== null);

    // Against the registry, not against a number that was true when it was
    // typed: this used to assert "exactly one", which would fail the day a
    // second resort's data landed and tell you nothing about why.
    check(`every live resort is offered (${LIVE.length})`,
      (await page.$$(".hero")).length === LIVE.length,
      `${(await page.$$(".hero")).length} cards for ${LIVE.map((r) => r.id).join(", ")}`);
    check(
      "and the first one is Monterosa",
      (await page.$eval(".hero__nm", (n) => n.textContent)).includes("Monterosa")
    );
    check(`nothing without data is offered as live (${SOON.length} to come)`,
      (await page.$$eval(".resortcard__soon", (n) => n.length)) === SOON.length);
    // Every live card reads its stats without optional chaining, so a resort
    // promoted to live with an incomplete META would render "NaNk m top".
    const heroText = (await page.$$eval(".hero", (n) => n.map((h) => h.textContent))).join(" ");
    check("no live card shows a missing number", !/NaN|undefined/.test(heroText),
      heroText.slice(0, 120));
    check("resorts not ready are listed and marked", (await page.$$(".resortcard")).length >= 3);
    check(
      "an unavailable resort is not a button",
      await page.$$eval(".resortcard", (n) => n.every((x) => x.tagName !== "BUTTON"))
    );
    check(
      "continuing is blocked until a resort is chosen",
      await page.$eval(".page__foot .btn", (n) => n.disabled)
    );

    await page.click(".hero");
    check(
      "choosing enables it and names the next step",
      !(await page.$eval(".page__foot .btn", (n) => n.disabled)) &&
        /go skiing/i.test(await page.$eval(".page__foot .btn", (n) => n.textContent))
    );
    check("the choice is shown on the card", (await page.$$(".hero__tick")).length === 1);

    await page.click("text=Go skiing");
    await page.waitForSelector(".planbtn", { timeout: 15000 });
    await page.click(".planbtn");
    await page.waitForSelector("#p-t1", { timeout: 15000 });
    check("going skiing brings up the map", (await page.$("canvas")) !== null);
    check("no page errors", page.errors.length === 0, page.errors.join(" | "));
    await page.context_.close();
  }

  // ========================================================== B. CONTEXTS ==
  if (section("B. Entry contexts change defaults, not screens")) {
    const cases = [
      ["night before, 21:30", [21, 30], "Tomorrow", "Start", "Finish at", 13],
      ["first lift, 08:20", [8, 20], "First lift", "Start", "Finish at", 13],
      // Not "Car is at": both ends are free, so the field cannot presume a car.
      ["mid-day reset, 14:00", [14, 0], "Already skiing", "You are at", "Finish at", 13],
    ];
    for (const [label, at, eyebrow, startLabel, finishLabel] of cases) {
      const page = await newPage(browser, { at });
      await toPlan(page, url);
      const got = {
        eyebrow: await page.$eval(".eyebrow", (n) => n.textContent.trim()),
        start: await page.$eval('label[for="p-start"]', (n) => n.textContent.trim()),
        finish: await page.$eval('label[for="p-finish"]', (n) => n.textContent.trim()),
        t0: await page.$eval("#p-t0", (n) => n.value),
        t1: await page.$eval("#p-t1", (n) => n.value),
        startOptions: await page.$$eval("#p-start option", (n) => n.length),
        screen: await page.$eval(".title", (n) => n.textContent.trim()),
      };
      check(`${label}: names the context`, got.eyebrow.startsWith(eyebrow), got.eyebrow);
      check(`${label}: labels the fields for it`, got.start === startLabel && got.finish === finishLabel, `${got.start} / ${got.finish}`);
      check(`${label}: it is still the plan screen`, /^Plan /i.test(got.screen), got.screen);
      check(`${label}: finish time is before the last lift`, got.t1 <= "16:30", got.t1);
      check(`${label}: start is before finish`, got.t0 < got.t1, `${got.t0} → ${got.t1}`);
      check(`${label}: no page errors`, page.errors.length === 0, page.errors.join(" | "));
      await page.context_.close();
    }

    // Both ends can be anywhere on the mountain, in every context. Being
    // stranded at a col with the car three valleys away is the case this app
    // exists for, and it is not servable from bases-only pickers.
    const page = await newPage(browser, { at: [14, 0] });
    await toPlan(page, url);
    // Node keys are generated from OSM names, so they change whenever the
    // graph is rebuilt. This used to name three of them — salati, bettaforca,
    // champoluc — which existed in the hand-typed graph and do not in the
    // built one, so the check failed and the selectOption below waited for an
    // option that would never appear until the whole run timed out. What the
    // requirement actually says is "more than just the bases", so that is
    // what is asserted, against the graph rather than against a memory of it.
    for (const field of ["p-start", "p-finish"]) {
      const opts = await page.$$eval(`#${field} option`, (n) => n.map((o) => o.value));
      check(
        `${field === "p-start" ? "start" : "finish"} can be any point on the mountain`,
        opts.length > baseKeys.length && opts.every((o) => allKeys.includes(o)),
        `${opts.length} options for ${allKeys.length} places, ${baseKeys.length} of them bases`
      );
      const groups = await page.$$eval(`#${field} optgroup`, (n) => n.map((g) => g.label));
      check(
        `${field === "p-start" ? "start" : "finish"} groups bases first`,
        groups[0] === "Bases" && groups.length === 2,
        groups.join(", ")
      );
    }

    // And a mid-mountain pair actually solves. Picked from the graph: the two
    // highest places that are not bases, which is the stranded-at-a-col case
    // whichever resort is first.
    const highNotBase = allKeys
      .filter((k) => !liveGraph.NODES[k].base)
      .sort((a, b) => liveGraph.NODES[b].alt - liveGraph.NODES[a].alt);
    await page.selectOption("#p-start", highNotBase[0]);
    await page.selectOption("#p-finish", highNotBase[1] ?? baseKeys[0]);
    await page.fill("#p-t1", "16:00");
    await solve(page);
    const n = await routeCount(page);
    check("a col-to-col route can be planned", n > 0 || (await page.$(".empty")) !== null,
      n > 0 ? `${n} routes` : "nothing fits, said so");
    await page.context_.close();
  }

  // =============================================================== C. GPS ==
  if (section("C. GPS")) {
    const N = {
      staffal: [45.879, 7.818],
      gabiet: [45.87, 7.833],
      salati: [45.889, 7.873],
      champoluc: [45.818, 7.727],
      alagna: [45.853, 7.937],
    };

    /**
     * The node a fix should snap to, worked out here rather than remembered.
     *
     * These assertions used to name keys — "staffal", "salati", "champoluc" —
     * from the hand-typed graph. Keys are generated from OSM names, so all of
     * them broke the moment the graph came from real data, and the failures
     * said nothing about whether snapping worked. The requirement means "the
     * app picks the nearest place it knows", so the nearest place is computed
     * from the same graph the app is using.
     */
    const nearestIn = ([lat, lon]) => {
      let best = null;
      for (const [key, node] of Object.entries(liveGraph.NODES)) {
        const dx = (node.lon - lon) * 78000;
        const dy = (node.lat - lat) * 111320;
        const d = Math.hypot(dx, dy);
        if (!best || d < best.d) best = { key, name: node.name, d };
      }
      return best;
    };

    /**
     * Tap "Use my position" and report what the form ended up with.
     *
     * `start` is what the select reports; `shown` is the option the user can
     * actually read. Those diverging is the whole failure mode here — a select
     * whose value is not among its options falls back to displaying the first
     * one while the app carries on using the value it was given.
     */
    async function locate(page) {
      await page.click(".locate");
      await page.waitForTimeout(1200);
      return {
        button: await page.$eval(".locate", (n) => n.textContent.trim()),
        start: await page.$eval("#p-start", (n) => n.value),
        shown: await page.$eval("#p-start", (n) => n.selectedOptions[0]?.textContent ?? null),
        options: await page.$$eval("#p-start option", (n) => n.map((o) => o.value)),
      };
    }

    /**
     * Where the app will ACTUALLY start, read from the solved route rather
     * than from the form. The form can lie; the first leg cannot.
     */
    async function effectiveStart(page) {
      await solve(page);
      if (!(await routeCount(page))) return null;
      await openRoute(page);
      await openLegs(page);
      const legs = await page.$$eval(".leg", (n) => n.length);
      return { firstLeg: await page.$eval(".leg__nm", (n) => n.textContent.trim()), legs };
    }

    // --- a fix at a base, in the night-before context -------------------
    {
      const page = await newPage(browser, {
        at: [21, 30],
        geolocation: { latitude: N.staffal[0], longitude: N.staffal[1] },
        permissions: ["geolocation"],
      });
      await toPlan(page, url);
      const r = await locate(page);
      const want = nearestIn(N.staffal);
      check("a fix at the valley base snaps to the nearest place",
        r.start === want.key,
        `${r.start}, expected ${want.key} (${want.name}, ${Math.round(want.d)} m away)`);
      check("the button confirms which station it used",
        r.button.includes(want.name), `${r.button} — expected to mention ${want.name}`);
      check("the select actually shows it",
        (r.shown ?? "").includes(want.name), `${r.shown} — expected ${want.name}`);
      check("no page errors", page.errors.length === 0, page.errors.join(" | "));
      await page.context_.close();
    }

    // --- a fix mid-mountain, in a context whose picker only lists bases --
    // This is the one that catches a start the select cannot represent.
    {
      const page = await newPage(browser, {
        at: [8, 20],
        geolocation: { latitude: N.salati[0], longitude: N.salati[1] },
        permissions: ["geolocation"],
      });
      await toPlan(page, url);
      const r = await locate(page);
      check(
        "a mid-mountain fix at first lift is offerable in the picker",
        r.options.includes(r.start),
        `start=${r.start}, options=${r.options.join(",")}`
      );
      check(
        "the picker displays the station the button named",
        /Salati/.test(r.button) === /Salati/.test(r.shown ?? ""),
        `button says "${r.button}", picker shows "${r.shown}"`
      );
      const eff = await effectiveStart(page);
      // A mid-mountain start with a whole day ahead may honestly have nothing
      // to offer, and naming expected run names ("Salati", "Olen", "Lys") tied
      // this to the hand-typed graph. What matters is that a route, when there
      // is one, is a real route rather than a leg with no name. The empty
      // state is section S's business.
      check(
        "and the route really does start where the form says",
        eff === null || (eff.legs > 0 && Boolean(eff.firstLeg) && eff.firstLeg !== "undefined"),
        eff === null ? "nothing fits from here, said so" : `${eff.legs} legs, first "${eff.firstLeg}"`
      );
      check("no page errors", page.errors.length === 0, page.errors.join(" | "));
      await page.context_.close();
    }

    // --- a fix mid-mountain, mid-day (the flagship case) ----------------
    {
      const page = await newPage(browser, {
        at: [14, 0],
        geolocation: { latitude: N.salati[0], longitude: N.salati[1] },
        permissions: ["geolocation"],
      });
      await toPlan(page, url);
      const r = await locate(page);
      const wantMid = nearestIn(N.salati);
      check("a mid-day fix high on the mountain snaps to the nearest place",
        r.start === wantMid.key,
        `${r.start}, expected ${wantMid.key} (${wantMid.name}, ${Math.round(wantMid.d)} m away)`);
      check("and the picker can show it",
        (r.shown ?? "").includes(wantMid.name), `${r.shown} — expected ${wantMid.name}`);

      // Then the whole scenario: car at Champoluc, 90 minutes.
      // By name, not by key: a base renamed after the lift that found it keeps
      // the key it was generated with, so "champoluc" is the name and p31 is
      // the key. Falls back to any base if this resort has no such place.
      const farBase = baseKeys.find((k) => /champoluc/i.test(liveGraph.NODES[k].name)) ?? baseKeys[0];
      await page.selectOption("#p-finish", farBase);
      await page.fill("#p-t1", "15:30");
      await solve(page);
      const n = await routeCount(page);
      // The flagship case, and the requirement is not "there is always a
      // route". On the built graph this crossing takes 100 minutes and is not
      // rideable at red at all — one 0.1 km run tagged `advanced` blocks it,
      // which npm run resort:verify reports — so ninety minutes honestly does
      // not do it. What must never happen is a route that leaves you short.
      if (n > 0) {
        const backs = await page.$$eval(".routecard__back", (cards) =>
          cards.map((c) => (c.textContent.match(/(\d{1,2}):(\d{2})/) || []))
            .filter((m) => m.length).map((m) => Number(m[1]) * 60 + Number(m[2])));
        const late = backs.filter((b) => b > 15 * 60 + 30);
        check("90 minutes to the car: nothing offered gets you there late",
          backs.length > 0 && late.length === 0, `${n} routes, ${late.length} late`);
      } else {
        const empty = await page.$(".empty");
        const said = empty ? await page.$eval(".empty__big", (x) => x.textContent.trim()) : null;
        check("90 minutes to the car: says plainly that it does not fit",
          Boolean(said) && said.length > 10, said ?? "no empty state shown");
        const fixes = empty ? await page.$$eval(".fixlist button", (x) => x.length) : 0;
        check("and offers something that would change it", fixes > 0, `${fixes} fixes`);
      }
      if (n > 0) {
        const back = await page.$eval(".routecard__back b", (x) => x.textContent);
        check("and it gets you there before your finish time", back <= "15:30", `back ${back}`);
      }
      check("no page errors", page.errors.length === 0, page.errors.join(" | "));
      await page.context_.close();
    }

    // --- a fix nowhere near this resort --------------------------------
    {
      const page = await newPage(browser, {
        at: [9, 5],
        geolocation: { latitude: 45.4642, longitude: 9.19 }, // Milan, 107 km away
        permissions: ["geolocation"],
      });
      await toPlan(page, url);
      const before = await page.$eval("#p-start", (n) => n.value);
      const r = await locate(page);
      check("a fix 107 km away does not move the start", r.start === before, `${before} → ${r.start}`);
      check("and the user is told how far off they are", /\d+\s*km/.test(r.button), r.button);
      check("and told what to do instead", /pick a start/i.test(r.button), r.button);
      check("it is not left spinning", !/Finding you/.test(r.button), r.button);
      check("the picker is still usable", (await page.$$eval("#p-start option", (n) => n.length)) > 1);
      await page.context_.close();
    }

    // --- permission denied ---------------------------------------------
    {
      const page = await newPage(browser, {
        at: [9, 5],
        geolocation: { latitude: N.staffal[0], longitude: N.staffal[1] },
        permissions: [], // not granted
      });
      await toPlan(page, url);
      const r = await locate(page);
      check("a refused permission does not leave it spinning", !/Finding you/.test(r.button), r.button);
      check("and the user is told location is off", /location is off/i.test(r.button), r.button);
      check("and told what to do instead", /pick a start/i.test(r.button), r.button);
      check("the app keeps working", (await page.$("#p-start")) !== null);
      check("no page errors", page.errors.length === 0, page.errors.join(" | "));
      await page.context_.close();
    }

    // --- every base, end to end ----------------------------------------
    for (const [key, [lat, lon]] of Object.entries(N)) {
      const page = await newPage(browser, {
        at: [14, 0],
        geolocation: { latitude: lat, longitude: lon },
        permissions: ["geolocation"],
      });
      await toPlan(page, url);
      const r = await locate(page);
      // Against the graph, not against the label these coordinates were
      // filed under. Some of those places are no longer in the routable
      // graph at all — Alagna's village node does not survive the
      // connectivity prune, so a fix there correctly snaps three kilometres
      // up to Pianalunga. Asserting the old key would report that as a
      // snapping fault when it is a coverage one, which npm run resort:verify
      // is the place to see.
      const want = nearestIn([lat, lon]);
      check(`a fix near ${key} snaps to the nearest place in the graph`,
        r.start === want.key,
        `${r.start}, expected ${want.key} (${want.name}, ${Math.round(want.d)} m away)`);
      await page.context_.close();
    }
  }

  // ============================================================ D. SOLVE ==
  if (section("D. Solving and choosing")) {
    const page = await newPage(browser);
    await toPlan(page, url);
    await solve(page);

    const n = await routeCount(page);
    check("a full day returns routes", n > 0, `${n} shown`);
    check("no more than three are shown at once", n <= 3, `${n}`);

    const labels = await page.$$eval(".routecard__lab", (x) => x.map((e) => e.textContent));
    check("routes are labelled by character, not statistics", labels.every((l) => !/^\d/.test(l)), labels.join(", "));
    check("every label is distinct", new Set(labels).size === labels.length, labels.join(", "));

    const titles = await page.$$eval(".routecard__nm", (x) => x.map((e) => e.textContent));
    check("every route has a name", titles.every((t) => t.trim().length > 0), titles.join(" | "));

    check("each route shows an elevation profile", (await page.$$(".routecard .profile svg")).length === n);
    check("each route shows the difficulty mix", (await page.$$(".routecard .mixbar")).length === n);
    check("each route shows four numbers", (await page.$$eval(".routecard .stat", (x) => x.length)) === n * 4);

    const backs = await page.$$eval(".routecard__back b", (x) => x.map((e) => e.textContent));
    const t1 = await (async () => {
      await page.click("text=Change the plan");
      await page.waitForSelector("#p-t1");
      const v = await page.$eval("#p-t1", (e) => e.value);
      await solve(page);
      return v;
    })();
    check("no route gets you back after your finish time", backs.every((b) => b <= t1), `${backs.join(", ")} vs ${t1}`);
    check("no page errors", page.errors.length === 0, page.errors.join(" | "));
    await page.context_.close();
  }

  // =========================================================== E. REFINE ==
  if (section("E. Refine")) {
    const page = await newPage(browser);
    await toPlan(page, url);
    await solve(page);

    const topStats = () => page.$$eval(".routecard .stat__v", (x) => x.slice(0, 4).map((e) => e.textContent));
    const chipsOn = () => page.$$eval('.sectionrule .chip[aria-pressed="true"]', (x) => x.map((e) => e.textContent));
    const onChoose = async () => /Pick a shape/.test(await page.$eval(".title", (n) => n.textContent));

    const before = await topStats();
    const t0 = Date.now();
    await page.click('.sectionrule button.chip:text-is("Shorter")');
    await page.waitForFunction(
      (b) => JSON.stringify([...document.querySelectorAll(".routecard .stat__v")].slice(0, 4).map((e) => e.textContent)) !== b,
      JSON.stringify(before),
      { timeout: 8000 }
    ).catch(() => {});
    const elapsed = Date.now() - t0;
    check("a chip re-solves in place, never back to the form", await onChoose());
    check("and it lands fast enough to feel like the list changing", elapsed < 1200, `${elapsed}ms`);
    check("shorter really is shorter", (await topStats())[0] !== before[0], `${before[0]} → ${(await topStats())[0]}`);

    await page.click('.sectionrule button.chip:text-is("Longer")');
    await page.waitForTimeout(900);
    const after = await chipsOn();
    check("opposites cancel rather than stack", !after.some((c) => /Shorter/.test(c)), after.join(", "));

    /*
     * Every chip, in turn, from a clean state.
     *
     * The requirement is that a chip never sends you back to the form, so
     * that is what is asserted: the chips are still under your thumb and the
     * form is not on screen. A chip that empties the list is allowed — asking
     * for easier at Monterosa, where no blue day exists, has no answer — but
     * only if the page says so and the same chip can undo it. This used to
     * test for the words "Pick a shape", which the page stops saying when it
     * has nothing to offer, and read a correct ruled-out page as a failure.
     */
    for (const chip of ["Easier", "Harder", "More vertical", "No drags", "Lunch"]) {
      const el = await page.$(`.sectionrule button.chip:text-is("${chip}")`);
      const disabled = await el.evaluate((n) => n.disabled);
      if (disabled) {
        check(`"${chip}" is disabled when it cannot change anything`, true, "disabled");
        continue;
      }
      await el.click();
      await page.waitForTimeout(900);
      const onForm = (await page.$("#p-t1")) !== null;
      const chipsHere = (await page.$$(".sectionrule button.chip")).length > 0;
      const count = await routeCount(page);
      check(`"${chip}" re-solves without going back to the form`, !onForm && chipsHere,
        onForm ? "landed on the form" : chipsHere ? "chips still there" : "chips gone");
      if (count === 0) {
        const said = await page.$eval(".page__body", (b) => b.textContent);
        check(`"${chip}" says so when it rules everything out`,
          /rules everything out|no day fits/i.test(said),
          said.replace(/\s+/g, " ").slice(0, 90));
        // And is undoable from where you are, which is the whole point.
        await page.click(`.sectionrule button.chip:text-is("${chip}")`);
        await page.waitForTimeout(900);
        check(`"${chip}" can be turned back off and the options return`,
          (await routeCount(page)) > 0, `${await routeCount(page)} routes`);
      } else {
        check(`"${chip}" leaves something on screen`, count > 0, `${count} routes`);
      }
    }

    /*
     * A grade chip on the form beats a grade chip on the options page.
     *
     * They used to compound: take "Include red runs" from an empty state, go
     * back to the form, set the grade to "Blue and red", and the harder
     * refinement was still on top of it — the app planned a black day and
     * nothing on screen said why.
     */
    await page.click('[aria-label="Change the plan"], button:has-text("Change the plan")');
    await page.waitForSelector("#p-t1", { timeout: 15000 });
    await page.click('button.chip:text-is("Anything")');
    await page.click('button.chip:text-is("Blue and red")');
    await solve(page);
    const gradeChips = await page.$$eval(
      ".sectionrule button.chip[aria-pressed=true]", (n) => n.map((c) => c.textContent));
    check("setting the grade on the form clears easier and harder",
      !gradeChips.some((c) => /Easier|Harder/.test(c)), gradeChips.join(", ") || "none on");

    check("no page errors", page.errors.length === 0, page.errors.join(" | "));
    await page.context_.close();
  }

  // ==================================== F. DETAIL, COMMIT, NAVIGATE, END ==
  if (section("F. Detail, commit, navigate, summary")) {
    const page = await newPage(browser);
    await toPlan(page, url);
    await solve(page);
    await openRoute(page);
    await page.waitForSelector(".sheet__foot .btn");

    check("detail shows a labelled route", (await page.$(".eyebrow--accent")) !== null);
    // The bar carries the headline figures and the two actions, and nothing
    // else: the map is what the skier just asked to see. Everything below is
    // a page behind it.
    check("the route bar does not cover the map",
      await page.evaluate(() => {
        const s = document.querySelector(".sheet");
        return s.getBoundingClientRect().height < window.innerHeight * 0.6;
      }));
    check("and there is nothing to drag", (await page.$(".sheet__grab")) === null);

    await openLegs(page);
    check("the legs page shows the profile with a scale", (await page.$(".profile__scale")) !== null);
    check("and the difficulty mix with percentages", (await page.$(".mixbar__key")) !== null);
    check("and lists every leg", (await page.$$eval(".leg", (n) => n.length)) > 0);
    check(
      "leg times run forward",
      await page.$$eval(".leg__t", (n) => {
        const t = n.map((e) => e.textContent);
        return t.every((v, i) => i === 0 || v >= t[i - 1]);
      })
    );
    await page.click('[aria-label="Back to the map"]');
    await page.waitForSelector(".sheet__foot .btn", { timeout: 10000 });
    check("and it comes back to the route, not to the options",
      (await page.$(".detail__legs")) !== null);

    await page.click("text=/Save and start|Save offline and start|^Start$/");
    await page.waitForSelector(".nav", { timeout: 10000 });

    const stored = await page.evaluate(() => {
      const raw = JSON.parse(localStorage.getItem("skis.v1") || "{}");
      return { legs: raw.committed?.route?.segments?.length ?? 0, resort: raw.committed?.resortId };
    });
    check("committing stores the route for offline use", stored.legs > 0, `${stored.legs} legs`);
    check("and records which resort it belongs to", stored.resort === "monterosa", String(stored.resort));

    // The metric points at the junction by name rather than using the word,
    // which is the principle taken one step further: "to Gabiet" is a place
    // you can see, "to junction" is a category.
    const metricKeys = await page.$$eval(".navmetric__k", (n) => n.map((k) => k.textContent.trim()));
    check("navigate points at a named junction", metricKeys.some((k) => /^to \w/i.test(k)), metricKeys.join(" / "));
    check("and never says turn", !/turn/i.test(await page.$eval(".nav", (n) => n.textContent)));
    check(
      "the button says where you are going",
      /Reached/.test(await page.$eval(".nav__foot .btn", (n) => n.textContent))
    );

    const legCount = () => page.$eval(".nav__legcount", (n) => n.textContent);
    const totalLegs = Number((await legCount()).match(/of (\d+)/)?.[1] || 0);
    check("it counts the legs", totalLegs > 0, await legCount());
    const firstInstruction = await page.$eval(".nav__do", (n) => n.textContent);
    // Held, not clicked: see reachNext. And prove the guard first, because a
    // control that ignores a pocket press is the point of it.
    {
      const before = await page.$eval(".nav__foot .btn", (n) => n.textContent.trim());
      const box = await (await page.$(".nav__foot .btn")).boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.waitForTimeout(60);
      await page.mouse.up();
      await page.waitForTimeout(350);
      check("a stray tap does not advance a leg",
        (await page.$eval(".nav__foot .btn", (n) => n.textContent.trim())) === before,
        before);
    }
    await reachNext(page);
    check("but holding it does", /Reached|Finish/.test(await page.$eval(".nav__foot .btn", (n) => n.textContent)));
    await page.waitForTimeout(350);
    check("advancing changes the instruction", (await page.$eval(".nav__do", (n) => n.textContent)) !== firstInstruction);
    check("and the counter moves with it", /leg 2 of/i.test(await legCount()), await legCount());

    // Walk to the end.
    // Held, not clicked. See reachNext in harness.mjs.
    for (let i = 0; i < totalLegs + 4; i++) {
      if (!(await reachNext(page))) break;
    }
    const finish = await page.$('.nav__foot .btn:has-text("Finish")');
    check("the last leg offers a finish", finish !== null);
    if (finish) {
      await finish.click();
      await page.waitForTimeout(700);
      check("summary reports the day", /Day done/i.test(await page.$eval(".eyebrow", (n) => n.textContent)));
      check("summary shows the numbers", (await page.$$(".stat")).length >= 4);
      check("summary offers another day", (await page.$('button:has-text("Plan another day")')) !== null);
    }
    check("no page errors", page.errors.length === 0, page.errors.join(" | "));
    await page.context_.close();
  }

  // ============================================================ G. EMPTY ==
  if (section("G. When nothing fits")) {
    const cases = [
      // Window too short for a single lap — caught on the clocks alone.
      ["ten minutes", { t0: "15:30", t1: "15:40" }, /enough time/i, null],
      // 40 minutes is long enough for a lap but not to cross two valleys, so
      // this exercises the cross-valley diagnosis rather than the clock one.
      ["Staffal to Champoluc in forty minutes", { t0: "15:00", t1: "15:40", finish: "champoluc" }, /Champoluc/, null],
      // A blue-only skier cannot cross at all: the valley links are red. The
      // useful answer is not "no" but "this is what would change it".
      ["blue skier crossing the valleys", { t0: "10:00", t1: "16:00", finish: "champoluc", ability: "Blue" }, /Champoluc/, /red/i],
    ];
    for (const [label, opts, pattern, fixPattern] of cases) {
      const page = await newPage(browser);
      await toPlan(page, url);
      if (opts.ability) await page.click(`button.chip:text-is("${opts.ability}")`);
      // By name: see keyNamed above.
      const finishKey = opts.finish ? keyNamed(opts.finish) : null;
      if (opts.finish && !finishKey) {
        check(`${label}: the resort has a place called ${opts.finish}`, false,
          "not in the graph, so this case cannot run");
        await page.context_.close();
        continue;
      }
      if (finishKey) await page.selectOption("#p-finish", finishKey);
      await page.fill("#p-t0", opts.t0);
      await page.fill("#p-t1", opts.t1);
      await solve(page);
      const isEmpty = (await page.$(".empty")) !== null;
      check(`${label}: says nothing fits rather than inventing a route`, isEmpty);
      if (isEmpty) {
        const headline = await page.$eval(".empty__big", (n) => n.textContent);
        check(`${label}: explains it in plain language`, pattern.test(headline), headline);
        const fixes = await page.$$eval(".fixlist button", (n) => n.map((e) => e.textContent));
        check(`${label}: offers at least one way to change it`, fixes.length > 0, `${fixes.length} suggestions`);
        if (fixPattern) {
          check(
            `${label}: suggests the change that would actually unblock it`,
            fixes.some((f) => fixPattern.test(f)),
            fixes.join(" | ")
          );
        }

        // A suggested fix has to actually do something.
        await page.click(".fixlist button");
        await page.waitForSelector(".routecard, .empty", { timeout: 15000 });
        const nowHasRoutes = (await routeCount(page)) > 0;
        const stillEmpty = (await page.$(".empty")) !== null;
        check(`${label}: taking the suggestion re-solves`, nowHasRoutes || stillEmpty, nowHasRoutes ? "found routes" : "still nothing, said so");
      }
      check(`${label}: no page errors`, page.errors.length === 0, page.errors.join(" | "));
      await page.context_.close();
    }
  }

  // ========================================================== H. OFFLINE ==
  if (section("H. Airplane mode")) {
    const page = await newPage(browser);
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500); // let the service worker take control

    const sw = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      return { active: !!reg?.active, controlling: !!navigator.serviceWorker.controller };
    });
    check("a service worker registers and takes control", sw.active && sw.controlling, JSON.stringify(sw));

    await page.click(".hero");
    await page.click("text=Go skiing");
    await page.waitForSelector(".planbtn", { timeout: 15000 });
    await page.click(".planbtn");
    await page.waitForSelector("#p-t1", { timeout: 15000 });
    await solve(page);
    await openRoute(page);
    await page.waitForSelector(".sheet__foot .btn");
    await page.click("text=/Save and start|Save offline and start|^Start$/");
    await page.waitForSelector(".nav", { timeout: 10000 });

    await page.context_.setOffline(true);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);

    check("the app cold-loads with the radio off", (await page.$(".tabbar")) !== null);
    check("the map still draws", (await page.$("canvas, .maplibregl-canvas")) !== null);
    check("the committed route survived", (await page.evaluate(() => !!JSON.parse(localStorage.getItem("skis.v1") || "{}").committed)));
    // A reload lands back on the mountain, which is where the tab starts.
    check("and it comes back to the resort, not mid-form", (await page.$(".planbtn")) !== null);

    await page.click(".planbtn");
    await page.waitForSelector("#p-t1", { timeout: 10000 });
    await solve(page);
    const offlineRoutes = await routeCount(page);
    check("and it can still solve a new day offline", offlineRoutes > 0, `${offlineRoutes} routes`);
    await page.context_.close();
  }

  // ============================================================= I. DOCK ==
  if (section("I. The dock and the map")) {
    /*
     * The panel over the map does not move any more.
     *
     * It used to be a sheet with three snap points and an expand button, and
     * this section dragged it around. A surface that slides under your thumb
     * competes with the map's own gestures for the same pixels, and every
     * screen using it has one job and one height, so it is fixed. What has to
     * hold now is that it is short, that there is nothing to grab, and that
     * the map controls beside it stay usable.
     */
    const page = await newPage(browser);
    await toPlan(page, url);
    await solve(page);
    await openRoute(page);
    await page.waitForSelector(".sheet__foot .btn", { timeout: 15000 });
    await page.waitForTimeout(600);

    const height = () => page.$eval(".sheet", (n) => Math.round(n.getBoundingClientRect().height));
    const rest = await height();
    check("the route bar leaves most of the mountain showing", rest < 900 * 0.34,
      `bar is ${rest} of 900`);
    check("there is no drag handle", (await page.$(".sheet__grab")) === null);
    check("and no expand button", (await page.$(".sheet__expand")) === null);

    // Dragging it does nothing, which is the point: the gesture belongs to
    // the map.
    const head = await (await page.$(".sheet__head")).boundingBox();
    await page.mouse.move(head.x + head.width / 2, head.y + 8);
    await page.mouse.down();
    await page.mouse.move(head.x + head.width / 2, 40, { steps: 16 });
    await page.mouse.up();
    await page.waitForTimeout(500);
    check("dragging it does not move it", (await height()) === rest, `${rest} → ${await height()}`);

    check("the map controls are reachable, not hidden behind it",
      await page.$eval(".maptools", (n) => getComputedStyle(n).visibility === "visible"));

    const tools = await page.$$(".maptools .iconbtn");
    check("the map has orbit and zoom controls", tools.length >= 4, `${tools.length} controls`);
    for (const t of tools) {
      await t.click();
      await page.waitForTimeout(120);
    }
    await page.waitForTimeout(700);
    check("using them does not break anything", page.errors.length === 0, page.errors.join(" | "));

    // The longest panel in the app is the empty state, and it is capped too.
    const tall = await newPage(browser);
    await toPlan(tall, url);
    await tall.fill("#p-t0", "09:05");
    await tall.fill("#p-t1", "09:25");
    await solve(tall);
    if (await tall.$(".empty")) {
      const h = await tall.$eval(".sheet", (n) => Math.round(n.getBoundingClientRect().height));
      check("even the longest panel keeps a band of mountain", h < 900 * 0.74, `${h} of 900`);
    }
    await tall.context_.close();
    await page.context_.close();
  }

  // ===================================================== J. ACCESSIBILITY ==
  if (section("J. Labels and keyboard")) {
    const page = await newPage(browser);
    await toPlan(page, url);

    check(
      "every icon-only control has a name",
      await page.$$eval(".iconbtn", (n) => n.every((b) => (b.getAttribute("aria-label") || "").trim().length > 0))
    );
    check(
      "every form control has a label",
      await page.$$eval("select, input", (n) =>
        n.every((el) => !el.id || !!document.querySelector(`label[for="${el.id}"]`))
      )
    );
    check(
      "toggle chips report their state",
      await page.$$eval(".chip", (n) => n.every((c) => c.hasAttribute("aria-pressed") || c.disabled))
    );
    check("the profile chart has a text alternative", await (async () => {
      await solve(page);
      return page.$$eval(".profile svg", (n) => n.every((s) => (s.getAttribute("aria-label") || "").length > 10));
    })());

    await page.keyboard.press("Tab");
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    check("tabbing reaches something focusable", focused && focused !== "BODY", String(focused));
    await page.context_.close();
  }
  // ============================================= K. THIN TERRAIN, HONESTLY ==
  if (section("K. When the mountain cannot offer real variety")) {
    const page = await newPage(browser);
    await toPlan(page, url);

    /**
     * Back to the form from wherever this leaves us — the options page, the
     * route detail, or the empty state. Each has its own way back and none of
     * them is the resort's Plan button.
     */
    const backToForm = async () => {
      const change = await page.$('[aria-label="Change the plan"], button:has-text("Change the plan")');
      if (change) await change.click();
      else await toForm(page);
      await page.waitForSelector("#p-t1", { timeout: 15000 });
    };

    /*
     * Monterosa has 21 blue edges and they do not link up, so no blue day
     * exists there at any length. This used to assert that one was offered
     * anyway, and one was: five hours that skied 1.2 km and descended 166
     * metres, the same cable car up and down. The requirement is the
     * opposite of what the check said — say so plainly, and offer something
     * that works.
     */
    await page.click('button.chip:text-is("Blue")');
    await solve(page);
    check("no blue day at Monterosa, and none is invented", (await routeCount(page)) === 0,
      `${await routeCount(page)} routes`);

    const noBlue = await page.$eval(".sheet__body", (b) => b.textContent);
    check("the reason given is the grade, not the clock",
      /no day on blue|no blue day/i.test(noBlue) && !/back in time/i.test(noBlue),
      noBlue.replace(/\s+/g, " ").slice(0, 110));
    check("and it says the blue runs do not link up",
      /do not link up|don't link up/i.test(noBlue));

    const blueFixes = await page.$$(".fixlist button");
    check("a fix is offered", blueFixes.length > 0, `${blueFixes.length}`);
    if (blueFixes.length) {
      const label = (await blueFixes[0].evaluate((n) => n.innerText)).split("\n")[0];
      await blueFixes[0].click();
      await page.waitForSelector(".routecard, .empty", { timeout: 20000 });
      // Taking it has to lead somewhere. A fix that re-solves to the same
      // empty state is worse than no fix at all.
      const after = await routeCount(page);
      check(`and taking it plans a day ("${label}")`, after > 0 || Boolean(await page.$(".fixlist button")),
        after > 0 ? `${after} routes` : "still empty, and still offering a way on");
    }

    /*
     * Where the similar flag still fires: a red skier with two and a half
     * hours from Champoluc. The notice must not blame the grade there —
     * Monterosa has 41 km of red piste — so it names the start and the
     * length, which are the two things the reader can change.
     */
    await backToForm();
    await page.selectOption("#p-start", keyNamed("Champoluc"));
    await page.selectOption("#p-finish", keyNamed("Champoluc"));
    await page.click('button.chip:text-is("Blue and red")');
    await page.fill("#p-t0", "09:05");
    await page.fill("#p-t1", "12:05");
    await solve(page);
    const notice = await page.$eval(".page__body", (b) => b.textContent);
    check("routes that cover the same runs are flagged as such",
      /variations on the same runs/i.test(notice),
      notice.replace(/\s+/g, " ").slice(0, 120));
    check("and the notice names what to change, not a grade that is not short",
      /Champoluc/.test(notice) && !/terrain here/i.test(notice),
      notice.replace(/\s+/g, " ").match(/Not much[^.]*\./)?.[0] ?? "no notice found");

    // The whole mountain, by contrast, should offer real choice and hide the
    // extras behind an affordance rather than dumping six options.
    //
    // The window matters: a longer day forces routes to cover more of the same
    // terrain, so the overlap check rejects the extras and three is genuinely
    // all there is. 09:15-16:00 is where five distinct days exist.
    await backToForm();
    await page.selectOption("#p-start", keyNamed("Stafal"));
    await page.selectOption("#p-finish", keyNamed("Stafal"));
    await page.click('button.chip:text-is("Anything")');
    await page.fill("#p-t0", "09:15");
    await page.fill("#p-t1", "16:00");
    await solve(page);
    const rich = await page.$eval(".page__body", (b) => b.textContent);
    check("with the whole mountain open, nothing is flagged as similar", !/variations on the same runs/i.test(rich));

    const eyebrow = await page.$eval(".eyebrow", (e) => e.textContent);
    const more = await page.$('button:has-text("more option")');
    if (more) {
      check("extra routes are behind an affordance, not dumped in the list", (await routeCount(page)) <= 3);
      check("and the count says so", /of \d+ routes/.test(eyebrow), eyebrow.trim());
      await more.click();
      await page.waitForTimeout(300);
      check("tapping it reveals them", (await routeCount(page)) > 3, `${await routeCount(page)} routes`);
      const labels = await page.$$eval(".routecard__lab", (x) => x.map((e) => e.textContent));
      check("and every one is a genuinely different character", new Set(labels).size === labels.length, labels.join(", "));
    } else {
      // Reaching here means the affordance was never exercised, which is a gap
      // in the test rather than a passing behaviour. Say so.
      check(
        "the more-options affordance is reachable at this window",
        false,
        `only ${await routeCount(page)} routes at 09:15-16:00, so the affordance never appeared — pick a window that yields more`
      );
    }
    check("no page errors", page.errors.length === 0, page.errors.join(" | "));
    await page.context_.close();
  }

  // ====================================================== L. PERSISTENCE ==
  if (section("L. What survives a reload")) {
    const page = await newPage(browser);
    await toPlan(page, url);
    await page.click('button.chip:text-is("Anything")');
    await page.waitForTimeout(200);

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector(".planbtn", { timeout: 10000 });
    check("the resort is remembered, so you land on its mountain", (await page.$(".planbtn")) !== null);
    await toForm(page);
    check(
      "ability is set once in the profile and remembered",
      await page.$eval('button.chip:text-is("Anything")', (n) => n.getAttribute("aria-pressed") === "true")
    );

    // And it is still overridable from here.
    await page.click('button.chip:text-is("Blue")');
    await page.reload({ waitUntil: "domcontentloaded" });
    await toForm(page);
    check(
      "changing it here updates the profile too",
      await page.$eval('button.chip:text-is("Blue")', (n) => n.getAttribute("aria-pressed") === "true")
    );
    check("no page errors", page.errors.length === 0, page.errors.join(" | "));
    await page.context_.close();
  }

  // ============================================================ M. LUNCH ==
  if (section("M. Lunch comes out of the skiing, not the clock")) {
    const page = await newPage(browser);
    await toPlan(page, url);
    // Read the finish time while the form is still on screen.
    const t1 = await page.$eval("#p-t1", (e) => e.value);

    await solve(page);
    const withoutLunch = await page.$$eval(".routecard__back b", (n) => n.map((e) => e.textContent));

    await page.click('.sectionrule button.chip:text-is("Lunch")');
    await page.waitForTimeout(1400);
    const withLunch = await page.$$eval(".routecard__back b", (n) => n.map((e) => e.textContent));
    const eyebrow = await page.$eval(".eyebrow", (e) => e.textContent);

    check("lunch is announced in the header", /lunch included/i.test(eyebrow), eyebrow.trim());
    check(
      "you are still back before your finish time",
      withLunch.every((b) => b <= t1),
      `${withLunch.join(", ")} vs ${t1}`
    );
    check(
      "the sit-down comes out of the skiing, so the day ends later",
      Math.min(...withLunch.map(toMinutes)) > Math.min(...withoutLunch.map(toMinutes)),
      `earliest back ${withoutLunch.join(",")} → ${withLunch.join(",")}`
    );

    // And the route has to actually pass somewhere to eat. The bar carries
    // the figures; the notes are on the legs page with everything else.
    await openRoute(page);
    await page.waitForSelector(".sheet__foot .btn", { timeout: 10000 });
    await openLegs(page);
    check(
      "the legs page confirms it passes a rifugio",
      /rifugio/i.test(await page.$eval(".page__body", (b) => b.textContent))
    );
    check("no page errors", page.errors.length === 0, page.errors.join(" | "));
    await page.context_.close();
  }

  // ========================================================= N. RE-PLAN ==
  if (section("N. Running out of day")) {
    /** Plan 09:00-16:00, then start navigating it at `at`. */
    async function startNavigatingAt(at) {
      const page = await newPage(browser, { at });
      await toPlan(page, url);
      await page.fill("#p-t0", "09:00");
      await page.fill("#p-t1", "16:00");
      await solve(page);
      await openRoute(page);
      await page.waitForSelector(".sheet__foot .btn");
      await page.click("text=/Save and start|Save offline and start|^Start$/");
      await page.waitForSelector(".nav", { timeout: 10000 });
      return page;
    }

    // --- on the hill, but far too late to finish the route -------------
    {
      const page = await startNavigatingAt([14, 30]);
      const body = await page.$eval(".nav", (b) => b.textContent);
      check("timings are live, not read off the plan", !/Times are from your plan/.test(body));
      check("being unable to finish in time is stated", /min over/i.test(body), body.match(/\d+ min over/)?.[0] ?? "no overrun warning");

      const replan = await page.$(".btn--nav-warn");
      check("and the fix offered is to re-solve from where you are", replan !== null);
      // It shares the action row with the primary now, so the face of the
      // button is one word and the origin lives in its accessible name. A
      // screen reader still gets "Re-plan from Gabiet"; the thumb gets a
      // button that leaves room for "Reached Colle Bettaforca" beside it.
      const replanLabel = await page.$eval(".btn--nav-warn", (b) => b.getAttribute("aria-label"));
      check("which says where that is", /Re-plan from \w/.test(replanLabel ?? ""), replanLabel || "unnamed");
      if (replan) {
        const from = body.match(/Re-planning from ([^ ]+)/)?.[1] ?? "here";
        await replan.click();
        await page.waitForSelector(".routecard, .empty", { timeout: 15000 });
        const n = await routeCount(page);
        const empty = (await page.$(".empty")) !== null;
        check(`"${from}" re-solves`, n > 0 || empty, n > 0 ? `${n} routes` : "nothing fits, said so");
        check(
          "and it goes to options, never back to the form",
          /Pick a shape|That won't fit/.test(await page.$eval(".title", (t) => t.textContent))
        );
        if (n > 0) {
          const backs = await page.$$eval(".routecard__back b", (x) => x.map((e) => e.textContent));
          check("the new options fit the time actually left", backs.every((b) => b <= "16:00"), backs.join(", "));
        }
      }
      check("no page errors", page.errors.length === 0, page.errors.join(" | "));
      await page.context_.close();
    }

    // --- not on the hill at all: previewing tomorrow from the sofa -----
    {
      const page = await startNavigatingAt([22, 15]);
      const body = await page.$eval(".nav", (b) => b.textContent);
      check("previewing outside the window says the times come from the plan", /Times are from your plan/.test(body));
      check(
        "and does not invent an overrun from the wrong clock",
        !/min over/i.test(body),
        body.match(/\d+ min over/)?.[0] ?? "none, correct"
      );
      const due = await page.$$eval(".navmetric__v", (n) => n.map((e) => e.textContent));
      check("due-back is a plausible ski time, not the middle of the night", due.some((d) => /^(0?9|1[0-6]):/.test(d)), due.join(" / "));
      check("no page errors", page.errors.length === 0, page.errors.join(" | "));
      await page.context_.close();
    }
  }

  // ========================================== O. TESTING FROM A PHONE ==
  if (section("O. Served over a LAN address, as it is when testing on a phone")) {
    // Geolocation and service workers need a secure context. 127.0.0.1 counts;
    // http://192.168.x.x does not. Blaming the permission in that case sends
    // someone to settings to toggle something that was never the problem.
    const { networkInterfaces } = await import("node:os");
    const lan = Object.values(networkInterfaces())
      .flat()
      .find((i) => i && i.family === "IPv4" && !i.internal)?.address;

    if (!lan) {
      check("no non-loopback address available to test against", true, "skipped");
    } else {
      const page = await newPage(browser, {
        geolocation: { latitude: 45.879, longitude: 7.818 },
        permissions: ["geolocation"],
      });
      await toPlan(page, `http://${lan}:${port}/`);
      check(
        "a LAN address is an insecure context, as expected",
        (await page.evaluate(() => window.isSecureContext)) === false
      );
      await page.click(".locate");
      await page.waitForTimeout(1400);
      const label = await page.$eval(".locate", (n) => n.textContent.trim());
      check("and the app blames https, not the permission", /https/i.test(label), label);
      check("the app is otherwise fully usable", (await page.$$eval("#p-start option", (n) => n.length)) > 1);
      await solve(page);
      check("including solving", (await routeCount(page)) > 0, `${await routeCount(page)} routes`);
      await page.context_.close();
    }
  }

  // =============================================== P. THE MAP ALWAYS DRAWS ==
  if (section("P. The map always draws something")) {
    // The one thing a map must never be is an empty rectangle. MapLibre needs
    // a working GPU and reachable elevation tiles; when either is missing it
    // paints nothing and reports no error. So the schematic goes up first and
    // only steps aside once MapLibre has actually settled a frame.
    // The map is the skiing tab; home is a plain page with no map at all.
    const page = await newPage(browser);
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".hero", { timeout: 20000 });
    check("home deliberately has no map", (await page.$("canvas")) === null);
    await page.click(".hero");
    await page.click("text=Go skiing");
    await page.waitForSelector(".planbtn", { timeout: 15000 });
    await page.click(".planbtn");
    await page.waitForSelector("#p-t1", { timeout: 15000 });

    const canvases = () =>
      page.evaluate(() => {
        const all = [...document.querySelectorAll("canvas")];
        const ml = all.find((c) => c.classList.contains("maplibregl-canvas"));
        const schematic = all.find((c) => !c.classList.contains("maplibregl-canvas"));
        const top = all[all.length - 1];
        return {
          any: all.length > 0,
          maplibre: !!ml,
          schematic: !!schematic,
          visible: top === schematic ? "schematic" : top === ml ? "maplibre" : "none",
        };
      });

    await page.waitForTimeout(1500);
    const early = await canvases();
    check("something is on screen within a second or two", early.any, JSON.stringify(early));
    check("and it is the layer that needs no GPU and no network", early.visible === "schematic", early.visible);

    // Past the watchdog, MapLibre has either taken over or given up. Either is
    // fine; a blank map is not.
    await page.waitForTimeout(10000);
    const late = await canvases();
    check("after the watchdog there is still a map", late.any, JSON.stringify(late));
    check(
      "either MapLibre took over or the schematic stayed",
      late.visible === "maplibre" || late.visible === "schematic",
      late.visible
    );

    // And the app is fully usable either way.
    await solve(page);
    check("the app works whichever map is showing", (await routeCount(page)) > 0, `${await routeCount(page)} routes`);
    check("no page errors", page.errors.length === 0, page.errors.join(" | "));
    await page.context_.close();
  }

  // ============================================================ Q. COPY ==
  // ------------------------------------------------------------------------
  if (section("R. Switching resort switches the mountain")) {
    const page = await newPage(browser, { at: [9, 0] });
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".hero", { timeout: 20000 });

    /** Plan and solve on the resort whose card is at `index`, and report it. */
    const dayOn = async (index) => {
      const heroes = await page.$$(".hero");
      await heroes[index].click();
      await page.click("text=Go skiing");
      await page.waitForSelector(".planbtn", { timeout: 15000 });
      const shown = await page.$eval(".resortbar__nm", (n) => n.textContent.trim());
      await page.click(".planbtn");
      await page.waitForSelector("#p-t1", { timeout: 15000 });
      const start = await page.$eval("#p-start", (n) => n.value ?? n.textContent);
      await page.click("text=Find routes");
      await page.waitForSelector(".routecard, .empty", { timeout: 20000 });

      // A resort with little terrain and a full-day plan legitimately has
      // nothing to offer, and the requirement there is an honest empty state
      // with a fix that works — not a route. So take the fix if one is offered
      // and report what came back either way.
      let usedFix = null;
      if (await page.$(".empty")) {
        const buttons = await page.$$(".fixlist button");
        if (buttons.length) {
          usedFix = (await buttons[0].evaluate((n) => n.innerText)).split("\n")[0];
          await buttons[0].click();
          await page.waitForSelector(".routecard, .empty", { timeout: 20000 });
        }
      }
      const cards = await page.$$eval(".routecard", (n) => n.map((c) => c.textContent));
      const titles = await page.$$eval(".routecard__nm",
        (n) => n.map((c) => c.textContent.trim()));
      return { shown, start, cards, titles, usedFix };
    };

    /**
     * Back to the resort list.
     *
     * Also the check that the options page is not sitting on top of it. It is
     * a full page at the same layer as Home, and while it was rendered on
     * `screen === "choose"` alone rather than on the tab as well, tapping Home
     * from the options list left the resort list underneath a page of routes:
     * the tab did nothing you could see, and the tap never even landed.
     */
    const toHome = async () => {
      const tabs = await page.$$(".tabbar__tab");
      for (const tab of tabs) {
        if (/home/i.test(await tab.evaluate((n) => n.textContent))) { await tab.click(); break; }
      }
      await page.waitForSelector(".hero", { timeout: 15000 });
      check("the Home tab shows the resort list, not the options page",
        (await page.$$(".routecard")).length === 0,
        `${(await page.$$(".routecard")).length} route cards still on screen`);
    };

    const first = await dayOn(0);
    check("the first resort plans a day", first.cards.length > 0,
      `${first.cards.length} routes${first.usedFix ? ` after "${first.usedFix}"` : ""}`);
    check("and the bar names the resort you picked", /Monterosa/.test(first.shown), first.shown);

    if (LIVE.length < 2) {
      // Not a pass dressed up as one: with one resort there is nothing to
      // switch to, and this says so rather than reporting a green tick.
      console.log("  ....  only one live resort, so there is nothing to switch to yet");
      console.log("        the rest of this section runs as soon as a second resort's data lands");
    } else {
      await toHome();
      const second = await dayOn(1);

      // Either a day, or an empty state whose fix produced one. Both are
      // correct; silently offering nothing is not.
      check("the second resort ends up with a day too", second.cards.length > 0,
        `${second.cards.length} routes${second.usedFix ? ` after "${second.usedFix}"` : ""}`);
      if (second.usedFix) {
        check("and it said why rather than just failing", /instead|until|through|red/i.test(second.usedFix),
          second.usedFix);
      }
      check("the bar names the resort you switched to", second.shown !== first.shown,
        `${first.shown} then ${second.shown}`);
      check("the plan starts at the new resort's base", second.start !== first.start,
        `${first.start} then ${second.start}`);

      // Route titles are built from the active graph's own place names, so a
      // solver still holding the first graph produces the first mountain's
      // titles — which is what a stale module constant or a stale useCallback
      // closure does, and neither throws.
      //
      // Not asserted as disjoint: two real resorts can share a place name, and
      // a graph built from the same geography certainly does. Different is the
      // claim that holds. The stronger check — that every leg belongs to the
      // active node set — is a unit test, in src/active-resort.test.js.
      check("and the day it offers is a different day",
        second.titles.length > 0 && second.titles.join("|") !== first.titles.join("|"),
        `${first.titles[0] || "?"} then ${second.titles[0] || "?"}`);

      // Switching back must be just as clean, because the second graph is now
      // the one in every closure.
      await toHome();
      const back = await dayOn(0);
      check("switching back returns the first mountain", back.shown === first.shown, back.shown);
      check("with the day it offered the first time",
        back.titles.length > 0 && back.titles.join("|") === first.titles.join("|"),
        `${back.titles[0] || "(no title found)"} against ${first.titles[0] || "(no title found)"}`);
      check("and its own start", back.start === first.start, `${back.start} against ${first.start}`);
    }

    check("no page errors", page.errors.length === 0, page.errors.join(" | "));
    await page.context_.close();
  }

  // ------------------------------------------------------------------------
  if (section("S. Every live resort serves every kind of skier")) {
    // The brief's five moments, run against each resort that has data. The
    // requirement is never "there is a route" — a small mountain honestly has
    // nothing to offer a seven-hour day. It is that the app always answers:
    // routes, or a plain reason and a fix that works. Never a crash, never a
    // spinner that does not stop, never an invented day.
    const PERSONAS = [
      // Abilities are the chips' own labels, which are how a skier says it
      // rather than the grade names: "Blue and red", not "red".
      { name: "a full day from the base", t0: "09:00", t1: "16:00", ability: "Blue and red" },
      { name: "an afternoon only", t0: "13:00", t1: "16:00", ability: "Blue and red" },
      { name: "blue runs only", t0: "09:30", t1: "15:30", ability: "Blue" },
      // The one the whole product is meant to be known for.
      { name: "90 minutes and the car is elsewhere", t0: "14:00", t1: "15:30", ability: "Blue and red" },
      { name: "an expert with the whole mountain", t0: "09:00", t1: "16:00", ability: "Anything" },
    ];

    for (const [index, resort] of LIVE.entries()) {
      const page = await newPage(browser, { at: [9, 0] });
      await page.goto(url, { waitUntil: "domcontentloaded" });
      await page.waitForSelector(".hero", { timeout: 20000 });
      await (await page.$$(".hero"))[index].click();
      await page.click("text=Go skiing");
      await page.waitForSelector(".planbtn", { timeout: 15000 });

      for (const persona of PERSONAS) {
        // Reload rather than navigate back. The choose screen has no route to
        // the form that does not depend on which screen the last persona left
        // us on, and the app restores the picked resort, so this lands on the
        // mountain with Plan one tap away every time.
        await page.reload({ waitUntil: "domcontentloaded" });
        await page.waitForSelector(".planbtn", { timeout: 20000 });
        await toForm(page);
        // fill, not a hand-rolled value assignment: React tracks a controlled
        // input's value through a property descriptor, so setting .value and
        // dispatching input does nothing. The first version of this section
        // did exactly that and every persona silently solved the same default
        // day — five identical passes that proved nothing.
        await page.fill("#p-t0", persona.t0);
        await page.fill("#p-t1", persona.t1);
        for (const chip of await page.$$('.chips[aria-label="Ability"] .chip')) {
          if ((await chip.evaluate((n) => n.textContent)).trim() === persona.ability) {
            await chip.click();
            break;
          }
        }

        // Read it back before solving. A persona that did not apply is worse
        // than a failing one, because it passes.
        const applied = await page.evaluate(() => ({
          t0: document.querySelector("#p-t0")?.value,
          t1: document.querySelector("#p-t1")?.value,
          ability: [...document.querySelectorAll('.chips[aria-label="Ability"] .chip')]
            .find((c) => c.getAttribute("aria-pressed") === "true")?.textContent.trim(),
        }));
        check(`${resort.id}: ${persona.name} — the form took the settings`,
          applied.t0 === persona.t0 && applied.t1 === persona.t1 &&
          applied.ability === persona.ability,
          `${applied.t0}-${applied.t1} ${applied.ability}`);

        await page.click("text=Find routes");
        // Either answer is fine. Neither arriving is not: that is the stuck
        // solving screen a render crash leaves behind.
        let outcome = "nothing";
        try {
          await page.waitForSelector(".routecard, .empty", { timeout: 25000 });
          outcome = (await page.$(".routecard")) ? "routes" : "empty";
        } catch { outcome = "stuck on solving" }

        if (outcome === "routes") {
          const titles = await page.$$eval(".routecard__nm", (n) => n.map((c) => c.textContent.trim()));
          const numbers = (await page.$$eval(".routecard", (n) => n.map((c) => c.textContent).join(" ")));
          check(`${resort.id}: ${persona.name} gets a day`, titles.length > 0 && titles.every(Boolean),
            `${titles.length}: ${titles.slice(0, 2).join(", ")}`);
          // A route with a missing number is worse than no route: it looks
          // authoritative and is not.
          check(`${resort.id}: ${persona.name} — every number is real`,
            !/NaN|undefined|Infinity/.test(numbers),
            (numbers.match(/NaN|undefined|Infinity/g) || []).join(", "));

          // The promise the whole product rests on: nothing offered may get
          // you back after the time you said you had to be down. Checked on
          // the clock each card prints, not on the solver's own arithmetic,
          // because that is the number a skier reads and trusts.
          const backs = await page.$$eval(".routecard__back", (n) =>
            n.map((c) => (c.textContent.match(/(\d{1,2}):(\d{2})/) || [])).filter((m) => m.length)
              .map((m) => Number(m[1]) * 60 + Number(m[2])));
          const due = toMinutes(persona.t1);
          const late = backs.filter((b) => b > due);
          check(`${resort.id}: ${persona.name} — nothing gets you back late`,
            backs.length > 0 && late.length === 0,
            backs.length
              ? late.map((b) => `back ${Math.floor(b / 60)}:${String(b % 60).padStart(2, "0")}`).join(", ") ||
                `${due - Math.max(...backs)} min to spare on the latest`
              : "no return clock shown on any card");

          // And it has to be a day, not a token loop: a seven-hour window that
          // comes back a route of forty minutes has not answered the question.
          const window = due - toMinutes(persona.t0);
          const longest = Math.max(...backs) - toMinutes(persona.t0);
          check(`${resort.id}: ${persona.name} — the day fills the window`,
            longest >= window * 0.5,
            `${longest} min offered against a ${window} min window`);
        } else if (outcome === "empty") {
          const headline = await page.$eval(".empty__big", (n) => n.textContent.trim());
          const body = await page.$eval(".empty__p", (n) => n.textContent.trim());
          const fixes = await page.$$eval(".fixlist button", (n) => n.length);
          check(`${resort.id}: ${persona.name} is told why, plainly`,
            headline.length > 10 && body.length > 20 && !/NaN|undefined/.test(headline + body),
            headline);
          // No fix is allowed when nothing would genuinely help, but the copy
          // then has to be the kind that says so rather than trailing off.
          check(`${resort.id}: ${persona.name} — the reason stands on its own`,
            fixes > 0 || /shut|no |noth|not enough|already/i.test(headline + body),
            `${fixes} fixes: ${body.slice(0, 70)}`);
        } else {
          check(`${resort.id}: ${persona.name} gets an answer at all`, false, outcome);
        }
      }

      check(`${resort.id}: no page errors across all five`, page.errors.length === 0,
        page.errors.slice(0, 2).join(" | "));
      await page.context_.close();
    }
  }

  // ------------------------------------------------------------------------
  if (section("T. Finding a resort in a long list")) {
    const page = await newPage(browser);
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".hero", { timeout: 20000 });

    const field = await page.$(".search__input");
    // The field only appears once the list is long enough to need it, so with
    // a short list its absence is the correct behaviour, not a failure.
    if (!field) {
      check(`search appears once there are enough resorts (${RESORTS.length})`,
        RESORTS.length < 6, `${RESORTS.length} resorts and no field`);
      check("no page errors", page.errors.length === 0, page.errors.join(" | "));
      await page.context_.close();
    } else {
      const shown = () => page.evaluate(() => ({
        live: document.querySelectorAll(".hero").length,
        soon: document.querySelectorAll(".resortcard").length,
        nothing: /Nothing here matches/.test(document.body.innerText),
      }));

      const all = await shown();
      check("everything is listed before anything is typed",
        all.live === LIVE.length && all.soon === SOON.length,
        `${all.live} live, ${all.soon} coming`);

      // By name.
      const first = LIVE[0].name.split(/\s+/)[0].slice(0, 5);
      await page.fill(".search__input", first);
      await page.waitForTimeout(220);
      const byName = await shown();
      check(`a name narrows it ("${first}")`, byName.live >= 1 && byName.live < LIVE.length,
        `${byName.live} of ${LIVE.length} live`);

      // By country, which is the other thing a skier would type.
      const country = (LIVE[0].country || "").split(/[\s/]+/)[0];
      if (country) {
        await page.fill(".search__input", country);
        await page.waitForTimeout(220);
        const byCountry = await shown();
        check(`a country works too ("${country}")`, byCountry.live + byCountry.soon > 0,
          `${byCountry.live} live, ${byCountry.soon} coming`);
      }

      // Two words, in either order, and accents folded.
      const region = (LIVE.find((r) => (r.region || "").includes(" ")) || LIVE[0]).region;
      if (region && region.includes(" ")) {
        await page.fill(".search__input", region.toLowerCase());
        await page.waitForTimeout(220);
        const byRegion = await shown();
        check(`a two-word region works ("${region}")`, byRegion.live + byRegion.soon > 0,
          `${byRegion.live} live, ${byRegion.soon} coming`);
      }

      // And says so when there is nothing, rather than showing an empty page.
      await page.fill(".search__input", "zzzznotaresort");
      await page.waitForTimeout(220);
      const none = await shown();
      check("nothing found says so", none.live === 0 && none.soon === 0 && none.nothing,
        JSON.stringify(none));

      await page.click(".search__clear");
      await page.waitForTimeout(220);
      const back = await shown();
      check("clearing brings everything back",
        back.live === LIVE.length && back.soon === SOON.length,
        `${back.live} live, ${back.soon} coming`);

      check("no page errors", page.errors.length === 0, page.errors.join(" | "));
      await page.context_.close();
    }
  }

  if (section("Q. How it reads")) {
    // Two rules, both easy to break by accident on the next copy edit.
    const page = await newPage(browser);
    await toPlan(page, url);

    /** Everything a user can read, across the whole flow. */
    const collect = async () => page.evaluate(() => "\n" + document.body.innerText);
    let text = await collect();
    await solve(page);
    text += await collect();
    if (await routeCount(page)) {
      await openRoute(page);
      await page.waitForSelector(".sheet__foot .btn", { timeout: 15000 });
      text += await collect();
    }
    await page.click('.tabbar__tab:has-text("Stats")');
    await page.waitForTimeout(400);
    text += await collect();
    await page.click('.tabbar__tab:has-text("Home")');
    await page.waitForSelector(".hero", { timeout: 10000 });
    text += await collect();
    await page.click('.iconbtn[aria-label="Settings"]');
    await page.waitForSelector(".modal", { timeout: 10000 });
    text += await collect();

    // The tab title and the installed app's name are interface too, and neither
    // is in innerText, so they get checked explicitly rather than by accident.
    const chrome = await page.evaluate(async () => {
      const link = document.querySelector('link[rel="manifest"]')?.href;
      let manifest = "";
      if (link) {
        try { manifest = JSON.stringify(await (await fetch(link)).json()); } catch { /* not built */ }
      }
      return `${document.title}\n${manifest}`;
    });
    const dashes = [...(text + chrome).matchAll(/[^.]{0,40}—[^.]{0,40}/g)].map((m) => m[0].trim());
    check("no em dashes anywhere in the interface", dashes.length === 0, dashes.slice(0, 3).join(" | "));

    // Nothing should be explaining the project to someone who came to ski.
    const lecture = text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.split(/\s+/).length > 26);
    check(
      "no paragraph runs longer than a couple of lines",
      lecture.length === 0,
      lecture.slice(0, 2).map((l) => l.slice(0, 90) + "...").join(" | ")
    );

    check("no page errors", page.errors.length === 0, page.errors.join(" | "));
    await page.context_.close();
  }

} finally {
  await browser.close();
  server.close();
}

const skipped = ONLY ? " (filtered)" : "";
console.log(
  "\n" +
    (failures ? `${failures} FAILING of ${ran} checks${skipped}` : `all ${ran} checks passed${skipped}`)
);
process.exit(failures ? 1 : 0);
