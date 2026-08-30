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
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, normalize } from "node:path";

const ROOT = new URL("../dist/", import.meta.url).pathname;
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

const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".webmanifest": "application/manifest+json",
  ".png": "image/png", ".svg": "image/svg+xml", ".woff2": "font/woff2",
};

async function serve() {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    let path = join(ROOT, normalize(url.pathname));
    try {
      const info = await stat(path);
      if (info.isDirectory()) path = join(path, "index.html");
    } catch {
      path = join(ROOT, "index.html"); // SPA fallback
    }
    try {
      const body = await readFile(path);
      res.writeHead(200, {
        "Content-Type": MIME[extname(path)] || "application/octet-stream",
        "Cache-Control": "no-cache",
      });
      res.end(body);
    } catch {
      res.writeHead(404).end("not found");
    }
  });
  await new Promise((r) => server.listen(0, "0.0.0.0", r));
  const port = server.address().port;
  return { server, port, url: `http://127.0.0.1:${port}/` };
}

// ------------------------------------------------------------- page setup --

/** Freeze the clock so entry contexts and "due back" are deterministic. */
const freezeClock = (hours, minutes) => `
  (() => {
    const fixed = new Date();
    fixed.setHours(${hours}, ${minutes}, 0, 0);
    const Real = Date;
    class Frozen extends Real {
      constructor(...a) { return a.length ? new Real(...a) : new Real(fixed.getTime()); }
      static now() { return fixed.getTime(); }
    }
    globalThis.Date = Frozen;
  })();
`;

async function newPage(browser, { at = [9, 5], geolocation, permissions = [], offline = false } = {}) {
  const context = await browser.newContext({
    viewport: { width: 430, height: 900 },
    ...(geolocation ? { geolocation } : {}),
    permissions,
  });
  await context.addInitScript(freezeClock(at[0], at[1]));
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(`${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console: ${m.text()}`);
  });
  page.errors = errors;
  if (offline) await context.setOffline(true);
  page.context_ = context;
  return page;
}

/** Resort screen → plan screen. */
async function toPlan(page, url) {
  // Not networkidle: the map streams elevation tiles for as long as it is on
  // screen, so the network never goes quiet. Wait for the UI instead.
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".hero", { timeout: 20000 });
  await page.click(".hero");
  await page.click("text=Plan a day");
  await page.waitForSelector("#p-t1", { timeout: 10000 });
}

const routeCount = (page) => page.$$eval(".routecard", (n) => n.length);
const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
const solve = async (page) => {
  await page.click("text=Find routes");
  await page.waitForSelector(".routecard, .empty", { timeout: 15000 });
};

// ------------------------------------------------------------------- run --

const { server, port, url } = await serve();
/**
 * Find a Chromium to drive.
 *
 * Playwright's own lookup is right on a normal machine. Some sandboxes ship a
 * pre-installed browser at a fixed path instead, so fall back to that before
 * giving up — and when neither exists, say what to run rather than throwing a
 * path that means nothing to the reader.
 */
function chromiumPath() {
  try {
    const found = chromium.executablePath();
    if (found && existsSync(found)) return undefined; // let Playwright handle it
  } catch {
    /* not installed through Playwright */
  }
  for (const candidate of [
    process.env.CHROMIUM_PATH,
    "/opt/pw-browsers/chromium",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome",
  ]) {
    if (candidate && existsSync(candidate)) return candidate;
  }
  console.error(
    "\n  No Chromium found.\n" +
      "  Run:  npx playwright install chromium\n" +
      "  Or point CHROMIUM_PATH at an existing browser binary.\n"
  );
  process.exit(2);
}

const executablePath = chromiumPath();
const browser = await chromium.launch({
  ...(executablePath ? { executablePath } : {}),
  headless: !HEADED,
});

try {
  // =========================================================== A. RESORT ==
  if (section("A. Resort selection")) {
    const page = await newPage(browser);
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".hero");

    check("only one resort is offered as live", (await page.$$(".hero")).length === 1);
    check(
      "the live resort is Monterosa",
      (await page.$eval(".hero__nm", (n) => n.textContent)).includes("Monterosa")
    );
    check("resorts not ready are listed and marked", (await page.$$(".resortcard--soon")).length >= 3);
    check(
      "an unavailable resort is not a button",
      await page.$$eval(".resortcard--soon", (n) => n.every((x) => x.tagName !== "BUTTON"))
    );
    check(
      "continuing is blocked until a resort is chosen",
      await page.$eval(".sheet__foot .btn", (n) => n.disabled)
    );
    check(
      "the blocked button says what to do",
      (await page.$eval(".sheet__foot .btn", (n) => n.textContent)).toLowerCase().includes("choose")
    );

    await page.click(".hero");
    check(
      "choosing enables it and it becomes the next step",
      !(await page.$eval(".sheet__foot .btn", (n) => n.disabled)) &&
        (await page.$eval(".sheet__foot .btn", (n) => n.textContent)).includes("Plan a day")
    );
    check("the choice is shown on the card", (await page.$$(".hero__tick")).length === 1);
    check("no page errors", page.errors.length === 0, page.errors.join(" | "));
    await page.context_.close();
  }

  // ========================================================== B. CONTEXTS ==
  if (section("B. Entry contexts change defaults, not screens")) {
    const cases = [
      ["night before, 21:30", [21, 30], "Tomorrow", "Start", "Finish at", 13],
      ["first lift, 08:20", [8, 20], "First lift", "Start", "Finish at", 13],
      ["mid-day reset, 14:00", [14, 0], "Mid-day reset", "You are at", "Car is at", 13],
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
      check(`${label}: it is still the plan screen`, /time for|car/i.test(got.screen), got.screen);
      check(`${label}: finish time is before the last lift`, got.t1 <= "16:30", got.t1);
      check(`${label}: start is before finish`, got.t0 < got.t1, `${got.t0} → ${got.t1}`);
      check(`${label}: no page errors`, page.errors.length === 0, page.errors.join(" | "));
      await page.context_.close();
    }

    // Mid-day is the one that must let you start anywhere on the hill.
    const midday = await newPage(browser, { at: [14, 0] });
    await toPlan(midday, url);
    const middayOpts = await midday.$$eval("#p-start option", (n) => n.length);
    const nightOpts = await (async () => {
      const p = await newPage(browser, { at: [21, 30] });
      await toPlan(p, url);
      const n = await p.$$eval("#p-start option", (x) => x.length);
      await p.context_.close();
      return n;
    })();
    check(
      "mid-day lets you start anywhere, the night before starts at a base",
      middayOpts > nightOpts,
      `${middayOpts} vs ${nightOpts} options`
    );
    await midday.context_.close();
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
      await page.click(".routecard");
      await page.waitForSelector(".leg__nm", { timeout: 10000 });
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
      check("a fix at Staffal snaps the start to Staffal", r.start === "staffal", r.start);
      check("the button confirms which station it used", /Staffal/.test(r.button), r.button);
      check("the select actually shows it", /Staffal/.test(r.shown ?? ""), String(r.shown));
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
      check(
        "and the route really does start where the form says",
        eff !== null && /Salati|Olen|Lys/.test(eff.firstLeg) === /Salati/.test(r.shown ?? ""),
        `picker "${r.shown}" vs first leg "${eff?.firstLeg}"`
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
      check("mid-day fix at Passo dei Salati snaps there", r.start === "salati", r.start);
      check("and the picker can show it", /Salati/.test(r.shown ?? ""), String(r.shown));

      // Then the whole scenario: car at Champoluc, 90 minutes.
      await page.selectOption("#p-finish", "champoluc");
      await page.fill("#p-t1", "15:30");
      await solve(page);
      const n = await routeCount(page);
      check("90 minutes from Salati to Champoluc still finds a route", n > 0, `${n} routes`);
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
      check(`a fix at ${key} snaps to ${key}`, r.start === key, r.start);
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
      await page.click("text=Change the basics");
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

    // Every chip, in turn, from a clean state.
    for (const chip of ["Easier", "Harder", "More vertical", "No drags", "Lunch"]) {
      const el = await page.$(`.sectionrule button.chip:text-is("${chip}")`);
      const disabled = await el.evaluate((n) => n.disabled);
      if (disabled) {
        check(`"${chip}" is disabled when it cannot change anything`, true, "disabled");
        continue;
      }
      await el.click();
      await page.waitForTimeout(900);
      const stillHere = await onChoose();
      const count = await routeCount(page);
      const empty = (await page.$(".empty")) !== null;
      check(`"${chip}" re-solves without leaving the screen`, stillHere || empty, stillHere ? "on choose" : "empty state");
      check(`"${chip}" leaves something on screen`, count > 0 || empty, `${count} routes`);
      if (!stillHere) break;
    }

    check("no page errors", page.errors.length === 0, page.errors.join(" | "));
    await page.context_.close();
  }

  // ==================================== F. DETAIL, COMMIT, NAVIGATE, END ==
  if (section("F. Detail, commit, navigate, summary")) {
    const page = await newPage(browser);
    await toPlan(page, url);
    await solve(page);
    await page.click(".routecard");
    await page.waitForSelector(".sheet__foot .btn");

    check("detail shows a labelled route", (await page.$(".eyebrow--accent")) !== null);
    check("detail shows the profile with a scale", (await page.$(".profile__scale")) !== null);
    check("detail shows the difficulty mix with percentages", (await page.$(".mixbar__key")) !== null);
    check("detail lists every leg", (await page.$$eval(".leg", (n) => n.length)) > 0);
    check(
      "leg times run forward",
      await page.$$eval(".leg__t", (n) => {
        const t = n.map((e) => e.textContent);
        return t.every((v, i) => i === 0 || v >= t[i - 1]);
      })
    );

    await page.click("text=/Save offline and start|^Start$/");
    await page.waitForSelector(".banner", { timeout: 10000 });

    const stored = await page.evaluate(() => {
      const raw = JSON.parse(localStorage.getItem("skis.v1") || "{}");
      return { legs: raw.committed?.route?.segments?.length ?? 0, resort: raw.committed?.resortId };
    });
    check("committing stores the route for offline use", stored.legs > 0, `${stored.legs} legs`);
    check("and records which resort it belongs to", stored.resort === "monterosa", String(stored.resort));

    check("navigate names the next junction, not a turn", /junction/i.test(await page.$eval(".metrics", (n) => n.textContent)));
    check(
      "the button says where you are going",
      /Reached/.test(await page.$eval(".sheet__foot .btn", (n) => n.textContent))
    );

    const legs = await page.$$eval(".leg", (n) => n.length);
    const firstBanner = await page.$eval(".banner__d", (n) => n.textContent);
    await page.click('.sheet__foot .btn:has-text("Reached")');
    await page.waitForTimeout(350);
    check("advancing changes the instruction", (await page.$eval(".banner__d", (n) => n.textContent)) !== firstBanner);
    check("and marks the leg behind you as done", (await page.$$(".leg--done")).length >= 1);
    check("exactly one leg is current", (await page.$$(".leg--now")).length === 1);

    // Walk to the end.
    for (let i = 0; i < legs + 4; i++) {
      const next = await page.$('.sheet__foot .btn:has-text("Reached")');
      if (!next) break;
      await next.click();
      await page.waitForTimeout(45);
    }
    const finish = await page.$('.sheet__foot .btn:has-text("Finish")');
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
      if (opts.finish) await page.selectOption("#p-finish", opts.finish);
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
    await page.click("text=Plan a day");
    await page.waitForSelector("#p-t1");
    await solve(page);
    await page.click(".routecard");
    await page.waitForSelector(".sheet__foot .btn");
    await page.click("text=/Save offline and start|^Start$/");
    await page.waitForSelector(".banner", { timeout: 10000 });

    await page.context_.setOffline(true);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);

    check("the app cold-loads with the radio off", (await page.$(".sheet")) !== null);
    check("the map still draws", (await page.$("canvas, .maplibregl-canvas")) !== null);
    check("the committed route survived", (await page.evaluate(() => !!JSON.parse(localStorage.getItem("skis.v1") || "{}").committed)));

    await page.waitForSelector("#p-t1", { timeout: 10000 });
    await solve(page);
    const offlineRoutes = await routeCount(page);
    check("and it can still solve a new day offline", offlineRoutes > 0, `${offlineRoutes} routes`);
    await page.context_.close();
  }

  // ============================================================ I. SHEET ==
  if (section("I. The sheet and the map")) {
    const page = await newPage(browser);
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".hero");

    const height = () => page.$eval(".sheet", (n) => Math.round(n.getBoundingClientRect().height));
    const rest = await height();
    check("the map is never fully covered", rest < 900 * 0.92, `sheet is ${rest} of 900`);

    const head = await (await page.$(".sheet__head")).boundingBox();
    await page.mouse.move(head.x + head.width / 2, head.y + 8);
    await page.mouse.down();
    await page.mouse.move(head.x + head.width / 2, head.y - 220, { steps: 12 });
    await page.mouse.up();
    await page.waitForTimeout(600);
    const dragged = await height();
    check("the sheet drags up from its header", dragged > rest, `${rest} → ${dragged}`);
    check("even dragged up, terrain is still visible", dragged < 900, `${dragged} of 900`);

    await page.evaluate(() => { document.querySelector(".sheet__body").scrollTop = 200; });
    const beforeScroll = await height();
    const body = await (await page.$(".sheet__body")).boundingBox();
    await page.mouse.move(body.x + body.width / 2, body.y + 120);
    await page.mouse.down();
    await page.mouse.move(body.x + body.width / 2, body.y + 300, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(400);
    check("scrolling the body does not resize the sheet", (await height()) === beforeScroll, `${beforeScroll} → ${await height()}`);

    check(
      "map controls get out of the way when the sheet covers them",
      await page.$eval(".maptools", (n) => getComputedStyle(n).visibility === "hidden")
    );
    check(
      "and while hidden they cannot take focus",
      // Not just aria-hidden: focusable buttons inside an aria-hidden subtree
      // are worse than not hiding them. Prove focus genuinely bounces off.
      await page.$eval(".maptools", (n) => {
        const btn = n.querySelector(".iconbtn");
        btn.focus();
        return document.activeElement !== btn;
      })
    );

    // Settle the sheet back down and use them for real.
    await page.mouse.move(head.x + head.width / 2, head.y - 220);
    await page.mouse.down();
    await page.mouse.move(head.x + head.width / 2, head.y + 260, { steps: 12 });
    await page.mouse.up();
    await page.waitForTimeout(700);
    check(
      "and they come back when it is dragged away",
      await page.$eval(".maptools", (n) => getComputedStyle(n).visibility === "visible")
    );

    const tools = await page.$$(".maptools .iconbtn");
    check("the map has orbit and zoom controls", tools.length >= 4, `${tools.length} controls`);
    for (const t of tools) {
      await t.click();
      await page.waitForTimeout(120);
    }
    await page.waitForTimeout(700);
    check("using them does not break anything", page.errors.length === 0, page.errors.join(" | "));
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
    await page.click('button.chip:text-is("Blue")');
    await solve(page);

    const n = await routeCount(page);
    check("a blue-only skier still gets a day planned", n > 0, `${n} routes`);

    const notice = await page.$eval(".sheet__body", (b) => b.textContent);
    check(
      "and is told plainly these are variations on the same runs",
      /variations on the same runs/i.test(notice)
    );
    check(
      "and told why, naming the terrain that is short",
      // Meaning, not wording: the notice has to say the ability level is the
      // constraint. Asserting the exact sentence just breaks on a copy edit.
      /blue terrain/i.test(notice) && /not much|isn't much|little/i.test(notice),
      notice.replace(/\s+/g, " ").match(/[^.]*blue terrain[^.]*/i)?.[0]?.trim() ?? "no message found"
    );

    // The whole mountain, by contrast, should offer real choice and hide the
    // extras behind an affordance rather than dumping six options.
    //
    // The window matters: a longer day forces routes to cover more of the same
    // terrain, so the overlap check rejects the extras and three is genuinely
    // all there is. 09:15-16:00 is where five distinct days exist.
    await page.click("text=Change the basics");
    await page.waitForSelector("#p-t1");
    await page.click('button.chip:text-is("Anything")');
    await page.fill("#p-t0", "09:15");
    await page.fill("#p-t1", "16:00");
    await solve(page);
    const rich = await page.$eval(".sheet__body", (b) => b.textContent);
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
    await page.waitForSelector("#p-t1", { timeout: 10000 });
    check("the resort is remembered, so you land on the plan screen", (await page.$("#p-t1")) !== null);
    check(
      "ability is set once in the profile and remembered",
      await page.$eval('button.chip:text-is("Anything")', (n) => n.getAttribute("aria-pressed") === "true")
    );

    // And it is still overridable from here.
    await page.click('button.chip:text-is("Blue")');
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector("#p-t1");
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

    // And the route has to actually pass somewhere to eat.
    await page.click(".routecard");
    await page.waitForSelector(".sheet__foot .btn", { timeout: 10000 });
    check(
      "the route detail confirms it passes a rifugio",
      /rifugio/i.test(await page.$eval(".sheet__body", (b) => b.textContent))
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
      await page.click(".routecard");
      await page.waitForSelector(".sheet__foot .btn");
      await page.click("text=/Save offline and start|^Start$/");
      await page.waitForSelector(".banner", { timeout: 10000 });
      return page;
    }

    // --- on the hill, but far too late to finish the route -------------
    {
      const page = await startNavigatingAt([14, 30]);
      const body = await page.$eval(".sheet__body", (b) => b.textContent);
      check("timings are live, not read off the plan", !/Times are from your plan/.test(body));
      check("being unable to finish in time is stated", /minutes? over/i.test(body), body.match(/\d+ minutes? over/)?.[0] ?? "no overrun warning");

      const replan = await page.$('button:has-text("Re-plan from")');
      check("and the fix offered is to re-solve from where you are", replan !== null);
      if (replan) {
        const from = (await replan.textContent()).trim();
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
      const body = await page.$eval(".sheet__body", (b) => b.textContent);
      check("previewing outside the window says the times come from the plan", /Times are from your plan/.test(body));
      check(
        "and does not invent an overrun from the wrong clock",
        !/minutes? over/i.test(body),
        body.match(/\d+ minutes? over/)?.[0] ?? "none, correct"
      );
      const due = await page.$$eval(".metric__v", (n) => n.map((e) => e.textContent));
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
    const page = await newPage(browser);
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".hero", { timeout: 20000 });

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
    await page.click(".hero");
    await page.click("text=Plan a day");
    await page.waitForSelector("#p-t1", { timeout: 15000 });
    await solve(page);
    check("the app works whichever map is showing", (await routeCount(page)) > 0, `${await routeCount(page)} routes`);
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
