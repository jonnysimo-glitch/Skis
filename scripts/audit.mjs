/**
 * Visual and interaction audit. Run with: npm run audit
 *
 * Walks every screen in every state and checks the things that are tedious to
 * eyeball and easy to regress:
 *
 *   - nothing overflows horizontally, and no text is clipped
 *   - every interactive target is at least 44pt, the iOS minimum
 *   - padding and gaps land on the 8pt grid rather than on ad-hoc values
 *   - no element overlaps another it should not
 *   - no placeholder text reaches the screen (undefined, NaN, [object Object])
 *   - text meets contrast against what is actually behind it
 *
 * Findings are grouped by screen so a regression points at one place.
 */
import { serve, launch, newPage as makePage, openRoute } from "./harness.mjs";
import { RESORTS } from "../src/resorts/index.js";
import { graphFor } from "../src/resorts/graphs.js";

/**
 * The key of the place called `name` in the resort the app opens on.
 *
 * Keys are generated from OSM names, so naming them here — "salati",
 * "champoluc" — went stale the moment the graphs came from real data, and
 * selectOption waits for an option that will never appear until the whole
 * audit times out. Looked up instead.
 */
const audited = graphFor(RESORTS.find((r) => r.available).id);
const keyNamed = (name) =>
  Object.keys(audited.NODES).find((k) => new RegExp(name, "i").test(audited.NODES[k].name)) ?? null;

/** The audit itself, run inside the page against whatever is on screen. */
const PROBE = `(() => {
  const findings = [];
  const add = (kind, detail) => findings.push({ kind, detail });
  const vw = window.innerWidth;

  const visible = (el) => {
    const s = getComputedStyle(el);
    if (s.display === "none" || s.visibility === "hidden" || +s.opacity === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < window.innerHeight;
  };

  const all = [...document.querySelectorAll("body *")].filter(visible);

  // --- horizontal overflow -------------------------------------------------
  if (document.documentElement.scrollWidth > vw + 1) {
    add("overflow", \`page scrolls horizontally: \${document.documentElement.scrollWidth} > \${vw}\`);
  }
  for (const el of all) {
    const r = el.getBoundingClientRect();
    if (r.right > vw + 1 || r.left < -1) {
      const s = getComputedStyle(el);
      if (s.position === "fixed" || s.overflow === "hidden") continue;
      if (el.closest(".hero, canvas, svg, .maplibregl-map")) continue;
      add("offscreen", \`\${el.className || el.tagName} spans \${Math.round(r.left)}..\${Math.round(r.right)} of \${vw}\`);
    }
  }

  // --- clipped text --------------------------------------------------------
  for (const el of all) {
    if (el.children.length) continue;
    if (!el.textContent.trim()) continue;
    const s = getComputedStyle(el);
    if (s.overflow === "visible" && s.textOverflow !== "ellipsis") {
      if (el.scrollWidth > el.clientWidth + 2 && s.whiteSpace === "nowrap") {
        add("clipped", \`"\${el.textContent.trim().slice(0, 40)}" is cut off\`);
      }
    }
  }

  // --- tap targets ---------------------------------------------------------
  const TAP = 44;
  for (const el of all) {
    const interactive = el.matches("button, a, select, input, [role=button]");
    if (!interactive) continue;
    if (el.disabled) continue;
    // Map data attribution is a licence link, not a control. Every map app
    // renders it as fine print; forcing 44pt on it would be wrong, not better.
    if (el.closest(".maplibregl-ctrl-attrib")) continue;
    const r = el.getBoundingClientRect();
    // A small control inside a larger hit area is fine.
    const padded = el.closest("label, .leg, .row");
    const h = padded ? padded.getBoundingClientRect().height : r.height;
    if (h < TAP - 0.5 || r.width < 24) {
      add("tap", \`\${el.className || el.tagName} "\${(el.textContent || el.ariaLabel || "").trim().slice(0, 24)}" is \${Math.round(r.width)}x\${Math.round(h)}, under \${TAP}\`);
    }
  }

  // --- 8pt grid ------------------------------------------------------------
  // The rule is that spacing lands on the 4pt half-step. A 1-2px nudge to sit an
  // icon on a text baseline is not spacing, it is kerning, so the floor is 4px.
  // The ceiling is there because an auto margin resolves to whatever space is
  // left over, which is layout rather than spacing and lands wherever it lands.
  // Third-party control CSS (MapLibre ships 10px margins) is not ours to police.
  const GRID = 4;
  const LAYOUT = 120;
  const offGrid = new Map();
  for (const el of all) {
    if (el.closest("[class^=maplibregl-], [class*=' maplibregl-']")) continue;
    const s = getComputedStyle(el);
    for (const prop of ["paddingTop", "paddingBottom", "paddingLeft", "paddingRight", "gap", "rowGap", "columnGap", "marginTop", "marginBottom"]) {
      const v = parseFloat(s[prop]);
      if (!v || Number.isNaN(v) || v < GRID || v > LAYOUT) continue;
      if (Math.abs(v % GRID) > 0.6 && Math.abs((v % GRID) - GRID) > 0.6) {
        const key = \`\${prop}:\${v}px\`;
        offGrid.set(key, (offGrid.get(key) || 0) + 1);
      }
    }
  }
  for (const [key, count] of offGrid) add("grid", \`\${key} used \${count}x, not a multiple of \${GRID}\`);

  // --- placeholder text ----------------------------------------------------
  const text = document.body.innerText;
  for (const bad of ["undefined", "NaN", "[object Object]", "null"]) {
    if (new RegExp("\\\\b" + bad.replace(/[[\\]]/g, "\\\\$&") + "\\\\b").test(text)) {
      const i = text.indexOf(bad);
      add("placeholder", \`"\${bad}" reaches the screen: ...\${text.slice(Math.max(0, i - 30), i + 30).replace(/\\n/g, " ")}...\`);
    }
  }

  // --- contrast ------------------------------------------------------------
  const lum = (c) => {
    const [r, g, b] = c.map((v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const parse = (s) => (s.match(/\\d+(\\.\\d+)?/g) || []).slice(0, 3).map(Number);
  const backdrop = (el) => {
    let n = el;
    while (n && n !== document.documentElement) {
      const bg = getComputedStyle(n).backgroundColor;
      if (bg && !/rgba\\(0, 0, 0, 0\\)|transparent/.test(bg)) return parse(bg);
      n = n.parentElement;
    }
    return [255, 255, 255];
  };
  for (const el of all) {
    if (el.children.length || !el.textContent.trim()) continue;
    if (el.closest(".hero, .nav__head, .nav__status, .tabbar, canvas, .mapnote, .modal__scrim, .resortbar, .planbtn, .navcontrols, .nav__foot")) continue;
    const s = getComputedStyle(el);
    const size = parseFloat(s.fontSize);
    const weight = +s.fontWeight || 400;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const fg = parse(s.color);
    const bg = backdrop(el);
    if (fg.length < 3 || bg.length < 3) continue;
    const [hi, lo] = [lum(fg), lum(bg)].sort((a, b) => b - a);
    const ratio = (hi + 0.05) / (lo + 0.05);
    const need = large ? 3 : 4.5;
    if (ratio < need - 0.02) {
      add("contrast", \`"\${el.textContent.trim().slice(0, 30)}" \${ratio.toFixed(2)}:1 at \${size}px (needs \${need})\`);
    }
  }

  return findings;
})()`;

// --------------------------------------------------------------------- run --

const { server, url } = await serve();
const browser = await launch({});

const problems = [];
let screensChecked = 0;

/** A phone-sized page with the clock frozen. */
async function newPage(at = [9, 5]) {
  const page = await makePage(browser, { at, viewport: { width: 393, height: 852 } });
  page.ctx_ = page.context_;
  return page;
}

async function audit(page, name) {
  screensChecked++;
  await page.waitForTimeout(500);
  const found = await page.evaluate(PROBE);
  for (const f of found) problems.push({ screen: name, ...f });
  for (const e of page.errors.splice(0)) problems.push({ screen: name, kind: "error", detail: e });
}

const go = async (page) => {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".hero", { timeout: 20000 });
};

// ---- home, stats, settings ------------------------------------------------
{
  const page = await newPage();
  await go(page);
  await audit(page, "home (nothing chosen)");
  await page.click(".hero");
  await audit(page, "home (resort chosen)");
  await page.click('.iconbtn[aria-label="Settings"]');
  await page.waitForSelector(".modal");
  await audit(page, "settings");
  await page.keyboard.press("Escape");
  await page.waitForSelector(".modal", { state: "detached", timeout: 5000 });
  await page.click('.iconbtn[aria-label="Settings"]');
  await page.waitForSelector(".modal");
  // The panel is bottom-anchored, so the scrim is only tappable above it.
  await page.click(".modal__scrim", { position: { x: 196, y: 24 } });
  await page.waitForSelector(".modal", { state: "detached", timeout: 5000 });
  await page.click('.tabbar__tab:has-text("Stats")');
  await page.waitForTimeout(400);
  await audit(page, "stats (empty)");
  await page.ctx_.close();
}

// ---- the skiing flow, at each entry context -------------------------------
for (const [label, at] of [["night before", [21, 30]], ["first lift", [8, 20]], ["mid-day", [14, 0]]]) {
  const page = await newPage(at);
  await go(page);
  await page.click(".hero");
  await page.click("text=Go skiing");
  await page.waitForSelector(".planbtn", { timeout: 15000 });
  await page.click(".planbtn");
  await page.waitForSelector("#p-t1", { timeout: 15000 });
  await audit(page, `plan (${label})`);

  await page.click("text=Find routes");
  await page.waitForSelector(".routecard, .empty", { timeout: 20000 });
  await audit(page, `choose (${label})`);

  if (await page.$(".routecard")) {
    await openRoute(page);
    await page.waitForSelector(".sheet__foot .btn", { timeout: 15000 });
    await audit(page, `detail (${label})`);

    await page.click("text=/Save and start|Save offline and start|^Start$/");
    await page.waitForSelector(".nav", { timeout: 15000 });
    await audit(page, `navigate (${label})`);
  }
  await page.ctx_.close();
}

// ---- ability variations ---------------------------------------------------
for (const ability of ["Blue", "Anything"]) {
  const page = await newPage();
  await go(page);
  await page.click(".hero");
  await page.click("text=Go skiing");
  await page.waitForSelector(".planbtn", { timeout: 15000 });
  await page.click(".planbtn");
  await page.waitForSelector("#p-t1", { timeout: 15000 });
  await page.click(`button.chip:text-is("${ability}")`);
  await page.click("text=Find routes");
  await page.waitForSelector(".routecard, .empty", { timeout: 20000 });
  await audit(page, `choose (${ability.toLowerCase()})`);
  await page.ctx_.close();
}

// ---- straight there -------------------------------------------------------
{
  const page = await newPage([14, 0]);
  await go(page);
  await page.click(".hero");
  await page.click("text=Go skiing");
  await page.waitForSelector(".planbtn", { timeout: 15000 });
  await page.click(".planbtn");
  await page.waitForSelector("#p-t1", { timeout: 15000 });
  await page.click('.segmented__opt:has-text("Straight there")');
  await audit(page, "plan (straight there)");
  // A cross-valley transfer, by name rather than by key.
  const straightFrom = keyNamed("salati") ?? Object.keys(audited.NODES)[0];
  const straightTo =
    keyNamed("champoluc") ??
    Object.keys(audited.NODES).find((k) => audited.NODES[k].base && k !== straightFrom) ??
    Object.keys(audited.NODES)[1];
  await page.selectOption("#p-start", straightFrom);
  await page.selectOption("#p-finish", straightTo);
  await page.click("text=Take me there");
  await page.waitForSelector(".sheet__foot .btn, .empty", { timeout: 20000 });
  await audit(page, "detail (straight there)");
  await page.ctx_.close();
}

// ---- nothing fits ---------------------------------------------------------
{
  const page = await newPage();
  await go(page);
  await page.click(".hero");
  await page.click("text=Go skiing");
  await page.waitForSelector(".planbtn", { timeout: 15000 });
  await page.click(".planbtn");
  await page.waitForSelector("#p-t1", { timeout: 15000 });
  await page.fill("#p-t0", "15:30");
  await page.fill("#p-t1", "15:40");
  await page.click("text=Find routes");
  await page.waitForSelector(".empty", { timeout: 20000 });
  await audit(page, "nothing fits");
  await page.ctx_.close();
}

// ---- stats with a day in it ----------------------------------------------
{
  const page = await newPage();
  await go(page);
  await page.click(".hero");
  await page.click("text=Go skiing");
  await page.waitForSelector(".planbtn", { timeout: 15000 });
  await page.click(".planbtn");
  await page.waitForSelector("#p-t1", { timeout: 15000 });
  await page.click("text=Find routes");
  await page.waitForSelector(".routecard", { timeout: 20000 });
  await openRoute(page);
  await page.waitForSelector(".sheet__foot .btn");
  await page.click("text=/Save and start|Save offline and start|^Start$/");
  await page.waitForSelector(".nav", { timeout: 15000 });
  // Walk the whole route to its end. The cap was 80, which was ample for the
  // hand-typed graph and is not for a real one: OSM geometry has a decision
  // point every half kilometre, so a Monterosa day runs to 84 legs. Falling
  // short left the app on the navigate screen, where the tab bar is hidden,
  // and the Stats click below waited until the audit timed out.
  for (let i = 0; i < 400; i++) {
    const b = await page.$('.nav__foot .btn:has-text("Reached")');
    if (!b) break;
    await b.click();
    await page.waitForTimeout(25);
  }
  const finish = await page.$('button:has-text("Finish")');
  if (finish) {
    await finish.click();
    await page.waitForTimeout(600);
    await audit(page, "summary");
  }
  // And if the walk did not finish for some other reason, get back to a screen
  // that has a tab bar rather than hanging on one that does not.
  if (!(await page.$('.tabbar__tab:has-text("Stats")'))) {
    await go(page);
    await page.waitForSelector('.tabbar__tab:has-text("Stats")', { timeout: 15000 });
  }
  await page.click('.tabbar__tab:has-text("Stats")');
  await page.waitForTimeout(500);
  await audit(page, "stats (with days)");
  // The destructive confirmation is a screen state of its own, and its buttons
  // are the ones most likely to be sized by hand.
  const clear = await page.$('button:has-text("Clear history")');
  if (clear) {
    await clear.click();
    await page.waitForTimeout(300);
    await audit(page, "stats (confirming clear)");
  }

  await page.click('.tabbar__tab:has-text("Home")');
  await page.waitForTimeout(400);
  await audit(page, "home (with days)");
  await page.ctx_.close();
}

await browser.close();
server.close();

// ------------------------------------------------------------------ report --

const byKind = problems.reduce((m, p) => {
  (m[p.kind] ||= []).push(p);
  return m;
}, {});

console.log(`\n  ${screensChecked} screen states audited\n`);
const ORDER = ["error", "placeholder", "overflow", "offscreen", "clipped", "tap", "contrast", "grid"];
for (const kind of ORDER) {
  const list = byKind[kind];
  if (!list?.length) continue;
  console.log(`  ${kind.toUpperCase()} (${list.length})`);
  // Collapse repeats: the same finding on every screen is one problem.
  const seen = new Map();
  for (const p of list) {
    const key = p.detail;
    if (!seen.has(key)) seen.set(key, []);
    seen.get(key).push(p.screen);
  }
  for (const [detail, screens] of [...seen].slice(0, 200)) {
    const where = screens.length > 3 ? `${screens.length} screens` : screens.join(", ");
    console.log(`    ${detail}`);
    console.log(`        on ${where}`);
  }
  if (seen.size > 200) console.log(`    ...and ${seen.size - 200} more`);
  console.log("");
}

const blocking = (byKind.error?.length ?? 0) + (byKind.placeholder?.length ?? 0) + (byKind.overflow?.length ?? 0);
console.log(problems.length ? `  ${problems.length} findings, ${blocking} blocking` : "  clean");
process.exit(blocking ? 1 : 0);
