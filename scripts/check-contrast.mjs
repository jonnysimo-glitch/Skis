/**
 * Palette check. Run with: node scripts/check-contrast.mjs
 *
 * Two things have to hold, and neither is obvious by eye:
 *
 *   1. Text meets WCAG AA against the surface it sits on.
 *   2. The brand accent stays clearly distinct from the piste difficulty
 *      colours. Blue, red and black are safety signals on a mountain — an
 *      accent a skier could mistake for "blue run" is a real problem, not a
 *      taste one. Distance is measured in CIE Lab, which tracks how different
 *      two colours actually look, rather than in RGB, which does not.
 */
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../src/styles/tokens.css", import.meta.url), "utf8");
/** Resolve a token to a hex, following `var(--other)` aliases. */
const token = (name, seen = new Set()) => {
  if (seen.has(name)) throw new Error(`token --${name} is circular`);
  seen.add(name);
  const m = css.match(new RegExp(`--${name}:\\s*([^;]+);`));
  if (!m) throw new Error(`token --${name} not found`);
  const value = m[1].trim();
  if (/^#[0-9a-fA-F]{6}$/.test(value)) return value;
  const alias = value.match(/^var\(--([\w-]+)\)$/);
  if (alias) return token(alias[1], seen);
  throw new Error(`token --${name} is not a plain hex or alias: ${value}`);
};

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

const luminance = (hex) => {
  const [r, g, b] = rgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

/** sRGB → CIE Lab, so "how different do these look" is a real number. */
function lab(hex) {
  let [r, g, b] = rgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  const y = r * 0.2126 + g * 0.7152 + b * 0.0722;
  const z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}
const deltaE = (a, b) => {
  const [l1, a1, b1] = lab(a);
  const [l2, a2, b2] = lab(b);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
};

let bad = 0;
const check = (name, ok, detail) => {
  if (!ok) bad++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
};

console.log("\nTEXT CONTRAST (WCAG AA)");
const white = "#ffffff";
// Against the surface tokens rather than a hardcoded white. Every one of
// these read "on white" while the app was a light theme, so flipping it to
// dark left them all checking a background that is no longer behind anything.
const surface = token("surface");
const pairs = [
  ["white on the primary button", white, token("accent"), 4.5],
  ["accent text on the surface", token("accent-ink"), surface, 4.5],
  ["body text on the surface", token("ink"), surface, 4.5],
  ["secondary text on the surface", token("ink-2"), surface, 4.5],
  ["tertiary text on the surface", token("ink-3"), surface, 4.5],
  ["body text on the tinted surface", token("ink"), token("surface-2"), 4.5],
  ["secondary text on the tinted surface", token("ink-2"), token("surface-2"), 4.5],
  // The pair that was missing. Most small print in this app — hints, notes,
  // stat labels — sits on the tinted surface rather than the base one, and
  // checking only the base one let 23 failures through to the audit.
  ["tertiary text on the tinted surface", token("ink-3"), token("surface-2"), 4.5],
  ["text on the app background", token("ink"), token("n-95"), 4.5],
];
for (const [name, fg, bg, min] of pairs) {
  const c = contrast(fg, bg);
  check(name, c >= min, `${c.toFixed(2)}:1 (needs ${min})`);
}

console.log("\nACCENT vs PISTE SIGNALS");
// 25 is roughly where two colours stop being confusable at a glance.
const MIN_DELTA = 25;
for (const piste of ["piste-blue", "piste-red", "piste-black"]) {
  for (const brand of ["accent", "accent-line"]) {
    const d = deltaE(token(brand), token(piste));
    check(`${brand} is distinct from ${piste}`, d >= MIN_DELTA, `deltaE ${d.toFixed(1)}`);
  }
}

console.log("\nPISTE SIGNALS STAY DISTINCT FROM EACH OTHER");
const grades = ["piste-blue", "piste-red", "piste-black"];
for (let i = 0; i < grades.length; i++) {
  for (let j = i + 1; j < grades.length; j++) {
    const d = deltaE(token(grades[i]), token(grades[j]));
    check(`${grades[i]} vs ${grades[j]}`, d >= MIN_DELTA, `deltaE ${d.toFixed(1)}`);
  }
}

console.log("\n" + (bad ? `${bad} FAILING` : "palette is sound"));
process.exit(bad ? 1 : 0);
