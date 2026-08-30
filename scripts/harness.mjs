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

export async function newPage(
  browser,
  { at = [9, 5], geolocation, permissions = [], offline = false, viewport } = {}
) {
  const context = await browser.newContext({
    viewport: viewport || { width: 430, height: 900 },
    ...(geolocation ? { geolocation } : {}),
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

export const solve = async (page) => {
  await page.click("text=Find routes");
  await page.waitForSelector(".routecard, .empty", { timeout: 15000 });
};

export const routeCount = (page) => page.$$eval(".routecard", (n) => n.length);

export const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
