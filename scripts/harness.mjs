/**
 * Shared browser harness for the behavioural suites.
 *
 * `e2e.mjs` walks the whole product; `features.mjs` goes deep on one feature at
 * a time. Both need the same things: a server for `dist/`, a frozen clock, a
 * page that collects real errors while ignoring network noise, and a Chromium
 * to drive. They live here so the two suites cannot drift apart on what counts
 * as a page error or which browser gets used.
 */
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, normalize } from "node:path";

const ROOT = new URL("../dist/", import.meta.url).pathname;

const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".webmanifest": "application/manifest+json",
  ".png": "image/png", ".svg": "image/svg+xml", ".woff2": "font/woff2",
};

/** Serve the real build, so the suites test what would actually ship. */
export async function serve() {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    let path = join(ROOT, normalize(url.pathname));
    try {
      const info = await stat(path);
      if (info.isDirectory()) path = join(path, "index.html");
    } catch {
      // SPA fallback, but only for routes. Handing index.html back for a
      // missing .js would turn a broken asset into a MIME-type error three
      // steps away from the cause.
      if (extname(path)) {
        res.writeHead(404).end("not found");
        return;
      }
      path = join(ROOT, "index.html");
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

/** Freeze the clock so entry contexts and "due back" are deterministic. */
export const freezeClock = (hours, minutes) => `
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

/**
 * Tile fetches failing is the network, not the app: the sandbox proxy rejects
 * the elevation host, and a real device on a chairlift drops requests too. The
 * app is built to survive that. Keeping these would bury a real error.
 */
const NETWORK_NOISE =
  /ERR_CERT|ERR_CONNECTION|ERR_FAILED|ERR_NAME_NOT_RESOLVED|ERR_ABORTED|Failed to load resource/;

/**
 * A page to test against.
 *
 * `touch` gives the context a real touchscreen, which matters more than it
 * looks: without it every gesture arrives as `pointerType: "mouse"` and the
 * browser applies none of its touch behaviour, so `touch-action`, the gesture
 * recogniser and `pointercancel` are all untested. Off by default because most
 * checks here drive a mouse; on for anything about gestures.
 */
export async function newPage(
  browser,
  { at = [9, 5], geolocation, permissions = [], offline = false, viewport, touch = false } = {}
) {
  const context = await browser.newContext({
    viewport: viewport || { width: 430, height: 900 },
    ...(geolocation ? { geolocation } : {}),
    ...(touch ? { hasTouch: true, isMobile: true } : {}),
    permissions,
  });
  await context.addInitScript(freezeClock(at[0], at[1]));
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(`${e.message}`));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const text = m.text();
    if (NETWORK_NOISE.test(text)) return;
    errors.push(`console: ${text}`);
  });
  page.errors = errors;
  if (offline) await context.setOffline(true);
  page.context_ = context;
  return page;
}

/**
 * Find a Chromium to drive.
 *
 * Playwright's own lookup is right on a normal machine. Some sandboxes ship a
 * pre-installed browser at a fixed path instead, so fall back to that before
 * giving up — and when neither exists, say what to run rather than throwing a
 * path that means nothing to the reader.
 */
export function chromiumPath() {
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

export async function launch({ headed = false } = {}) {
  const executablePath = chromiumPath();
  return chromium.launch({
    ...(executablePath ? { executablePath } : {}),
    headless: !headed,
  });
}

/**
 * Open the map control stack, which the app now keeps collapsed.
 *
 * One button sits over the mountain and the other five are behind it, so any
 * check that presses zoom, the compass or the recentre has to ask for them
 * first — the same as a person does. Idempotent: if the stack is already open
 * this does nothing, so it is safe to call before every use.
 */
export async function openTools(page) {
  const opener = await page.$('.maptools .iconbtn[aria-label="Map controls"]');
  if (!opener) return;
  await opener.click();
  await page.waitForSelector('.maptools .iconbtn[aria-label="Zoom in"]', { timeout: 5000 });
}

/**
 * Tap zoom `n` times, reopening the map tools whenever they have closed.
 *
 * The tools panel collapses on its own — the map is the hero and the chrome
 * gets out of the way — so a handle grabbed once and clicked eight times
 * clicks a detached element. Both suites had written that loop, in ten places
 * between them, and it failed in two different ways: with `if (!button) break`
 * it silently stopped zooming and reported whatever the opening framing showed,
 * which is how "0 markers" was read as the car parks having gone from two
 * resorts; without the guard it threw mid-section and took the run down with
 * it ("elementHandle.click: Element is not attached to the DOM", section 38).
 *
 * A person taps the control again. Returns how many taps actually landed, so
 * a caller can assert on that rather than assume.
 */
export async function zoomBy(page, n, way = "in", { settle = 220 } = {}) {
  const find = () => page.$(`.maptools .iconbtn[aria-label="Zoom ${way}"]`);
  let landed = 0;
  for (let i = 0; i < n; i++) {
    let btn = await find();
    if (!btn) {
      await openTools(page);
      btn = await find();
    }
    if (!btn) return landed;
    if (await btn.click().then(() => true).catch(() => false)) landed++;
    else {
      // Detached between the look-up and the click. Reopen and retry once.
      await openTools(page);
      const again = await find();
      if (again && (await again.click().then(() => true).catch(() => false))) landed++;
    }
    await page.waitForTimeout(settle);
  }
  return landed;
}

/**
 * Tap one map control, reopening the panel if it has closed.
 *
 * Same hazard as zoomBy and the same cause: the stack collapses on its own, so
 * a locator that resolved a moment ago can detach before the tap lands. It
 * showed up as a crash rather than a failure — "page.tap: Timeout 30000ms
 * exceeded, locator resolved to <button aria-label='Recentre the view'>" —
 * which took a whole features run down at 309 checks of 691 while four suites
 * were sharing the machine. Section 16 passes 26 of 26 on its own, so it is
 * load, and load is not something a check should be sensitive to.
 *
 * `touch` picks tap over click, for the sections driving a touchscreen.
 */
export async function tapControl(page, label, { touch = false, tries = 3 } = {}) {
  const sel = `.maptools .iconbtn[aria-label="${label}"]`;
  for (let i = 0; i < tries; i++) {
    if (!(await page.$(sel))) await openTools(page);
    const el = await page.$(sel);
    if (!el) continue;
    const done = touch
      ? await el.tap().then(() => true).catch(() => false)
      : await el.click().then(() => true).catch(() => false);
    if (done) return true;
  }
  return false;
}

/** Home → pick the resort → the skiing tab's plan screen. */
export async function toPlan(page, url) {
  // Not networkidle: the map streams elevation tiles for as long as it is on
  // screen, so the network never goes quiet. Wait for the UI instead.
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".hero", { timeout: 20000 });
  await page.click(".hero");
  await page.click("text=Go skiing");
  // The skiing tab opens on the resort now, not on the form. Plan is the verb.
  await page.waitForSelector(".planbtn", { timeout: 15000 });
  await page.click(".planbtn");
  await page.waitForSelector("#p-t1", { timeout: 15000 });
}

/**
 * Get to the plan form from wherever the app currently is.
 *
 * The skiing tab starts on the resort, so after a reload, or after backing out
 * of anything, the form is one Plan tap away rather than already on screen.
 */
export async function toForm(page) {
  const plan = await page.$(".planbtn");
  if (plan) await plan.click();
  await page.waitForSelector("#p-t1", { timeout: 15000 });
}

export const solve = async (page) => {
  await page.click("text=Find routes");
  await page.waitForSelector(".routecard, .empty", { timeout: 15000 });
};

export const routeCount = (page) => page.$$eval(".routecard", (n) => n.length);

/**
 * Open one of the offered days.
 *
 * Two taps now, not one: the card selects a day and draws it on the mountain,
 * and the footer's button opens the one that is selected. Browsing the options
 * against the terrain is the point of that screen, so a test that reaches the
 * detail view has to do what a skier does.
 */
export const openRoute = async (page, i = 0) => {
  const bodies = await page.$$(".routecard__body");
  if (!bodies.length) throw new Error("no routes offered");
  const n = Math.min(i, bodies.length - 1);
  await bodies[n].click();
  await page.waitForTimeout(220);
  const buttons = await page.$$(".routecard__act .btn");
  await buttons[n].click();
};

/**
 * Advance a leg on the navigate screen.
 *
 * "Reached X" is held rather than tapped: it moves a skier's route on, and a
 * pocket produces taps. So a test that clicks it does nothing, which is the
 * button working.
 */
/**
 * From the route bar to the list of legs.
 *
 * The detail screen is a fixed bar over a full map now, not a sheet you drag
 * up: everything past the three headline figures lives on a page of its own,
 * one tap away. A suite that looked for `.leg` on the detail screen waited out
 * the clock instead of failing.
 */
export async function openLegs(page) {
  const more = await page.$(".detail__legs");
  if (!more) return false;
  await more.click();
  await page.waitForSelector(".leg__nm", { timeout: 10000 });
  return true;
}

export async function reachNext(page, selector = '.nav__foot .btn:has-text("Reached")') {
  const button = await page.$(selector);
  if (!button) return false;
  const box = await button.boundingBox();
  if (!box) return false;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(420);
  await page.mouse.up();
  await page.waitForTimeout(90);
  return true;
}

export const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/**
 * Wait until the map has stopped drawing.
 *
 * Anything that samples pixels has to know the frame it is sampling is
 * finished, and a fixed `waitForTimeout` only knows that on an idle machine.
 * Under load — which is most of a full suite run, with a browser context per
 * section — 1600 ms is not enough for a satellite drape to re-composite after
 * a zoom, and the reading comes back low: the drape check dropped from 48% of
 * neighbouring pixels differing to 12%, and from 14% to 1% at the ceiling,
 * with nothing about the renderer having changed. Three phantom failures a
 * run, which is worse than no check, because it teaches you to ignore it.
 *
 * `__skisFadeClock` accumulates a frame's dt every time the map paints, so it
 * stops advancing exactly when the map comes to rest. Poll it, and return once
 * it has been still for `quiet`. Gives up at `limit` rather than hanging, and
 * says which happened.
 */
export async function atRest(page, { quiet = 400, limit = 9000 } = {}) {
  const clock = () => page.evaluate(() => window.__skisFadeClock ?? -1);
  const started = Date.now();
  let last = await clock();
  let since = Date.now();
  while (Date.now() - started < limit) {
    await page.waitForTimeout(120);
    const now = await clock();
    if (now !== last) {
      last = now;
      since = Date.now();
      continue;
    }
    if (Date.now() - since >= quiet) return true;
  }
  return false;
}

/**
 * A gesture held open across several steps.
 *
 * `multiTouch` opens and closes a CDP session per call, so it can only ever
 * express one complete gesture. The interesting ones are not complete: a
 * second finger arriving mid-drag, one of two lifting while the other carries
 * on, a leg advancing under a thumb that is still down. Those need the
 * session held open, which is what this is.
 *
 *   const hand = await fingers(page);
 *   await hand.down([[215, 420]]);
 *   await hand.move([[200, 400]]);
 *   await hand.down([[200, 400, 1], [300, 500, 2]]);   // a second finger
 *   await hand.up([[300, 500, 2]]);                    // and it lifts
 *   await hand.release();
 *   await hand.close();
 *
 * A point is [x, y] or [x, y, id]; ids default to position in the list, which
 * is what you want for a single finger and not what you want once two are
 * down and one of them leaves.
 */
export async function fingers(page) {
  const cdp = await page.context_.newCDPSession(page);
  const pts = (list) =>
    list.map((p, i) => ({
      x: p[0], y: p[1], id: p[2] ?? i + 1, radiusX: 12, radiusY: 12, force: 1,
    }));
  const send = (type, list = []) =>
    cdp.send("Input.dispatchTouchEvent", { type, touchPoints: pts(list) });
  return {
    down: (list) => send("touchStart", list),
    move: (list) => send("touchMove", list),
    up: (list) => send("touchEnd", list),
    /*
     * Every finger off the glass, and no complaint if they already are.
     *
     * Chrome refuses a touchEnd with no touch in progress — "Must send a
     * TouchStart first" — and that refusal, uncaught, killed the whole feature
     * suite from inside one check: the process died before the summary line,
     * so forty sections' results vanished and the run looked like it had
     * simply produced nothing. A gesture helper cannot be allowed to do that.
     * Lifting a hand that is already up is a no-op, which is what it means.
     */
    release: () => send("touchEnd", []).catch(() => {}),
    close: () => cdp.detach().catch(() => {}),
  };
}

/**
 * A real one-finger drag, in `steps` moves.
 *
 * Not `page.mouse`: a mouse drag skips touch-action, the browser's gesture
 * recogniser and pointercancel, so the suite passes on gestures the phone
 * does not deliver. Every drag a check makes should be this one.
 */
export function touchDrag(page, from, to, { steps = 14, settle = 18 } = {}) {
  const frames = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    frames.push([[from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t]]);
  }
  return multiTouch(page, frames, { settle });
}

/** Where a selector's middle is, in viewport pixels, or null if it is not there. */
export async function centreOf(page, selector) {
  const el = await page.$(selector);
  if (!el) return null;
  const box = await el.boundingBox();
  return box
    ? [Math.round(box.x + box.width / 2), Math.round(box.y + box.height / 2)]
    : null;
}

/** A tap with a finger. False when there was nothing there to tap. */
export async function touchTap(page, selector, { settle = 30 } = {}) {
  const at = await centreOf(page, selector);
  if (!at) return false;
  await multiTouch(page, [[at]], { settle });
  return true;
}

/**
 * A finger held still on a point, for `ms`.
 *
 * With jitter, because a real hand has some and a browser reconsiders whether
 * a still touch is turning into a scroll. `reachNext` holds the mouse down,
 * which is not the same event stream at all: the hold button listens to
 * pointer events and the browser can cancel a touch mid-hold.
 */
export async function touchHold(page, x, y, ms) {
  const cdp = await page.context_.newCDPSession(page);
  const at = (dx) => [{ x: x + dx, y, id: 1, radiusX: 12, radiusY: 12, force: 1 }];
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: at(0) });
  const step = 40;
  for (let t = 0; t < ms; t += step) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: at(t % 80 ? 0.4 : -0.4),
    });
    await page.waitForTimeout(step);
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await page.waitForTimeout(120);
  await cdp.detach().catch(() => {});
}

/**
 * Multi-touch, dispatched through the browser's own input pipeline.
 *
 * Playwright's mouse is one pointer and its touchscreen only taps, so two
 * finger gestures have to go through CDP. Synthetic PointerEvents from
 * page.evaluate are not a substitute: they skip hit-testing, touch-action and
 * the browser's gesture recogniser, so they pass whatever the app does.
 *
 * `frames` is a list of finger positions per step: [[[x, y], [x, y]], ...].
 */
export async function multiTouch(page, frames, { settle = 16 } = {}) {
  const cdp = await page.context_.newCDPSession(page);
  const send = (type, points) =>
    cdp.send("Input.dispatchTouchEvent", {
      type,
      touchPoints: points.map((p, i) => ({ x: p[0], y: p[1], id: i + 1, radiusX: 12, radiusY: 12, force: 1 })),
    });
  await send("touchStart", frames[0]);
  for (const f of frames) {
    await send("touchMove", f);
    await page.waitForTimeout(settle);
  }
  await send("touchEnd", []);
  await page.waitForTimeout(400);
  await cdp.detach().catch(() => {});
}
