/**
 * The translations. Run with: node src/lib/say.test.js
 *
 * Three kinds of check, and only the third is about words.
 *
 * The first is structural: the two dictionaries have to carry the same keys,
 * because a key in German and not in Italian is an Italian screen with one
 * English word in the middle of it and nobody notices until a skier does.
 *
 * The second is about layout. German compounds are long — "Bis zur nächsten
 * Kreuzung" against "To next junction" — and this app puts its labels in a
 * narrow left column with the value right-aligned opposite. A translation that
 * is twice the English will wrap to two lines and push the row out of the
 * eight-point grid the audit enforces. The bar is measured against the widest
 * thing already shipping rather than invented.
 *
 * The third asserts the sourced ski vocabulary by value: seggiovia, ultima
 * salita, letzte Bergfahrt. Those came from published sources and a later
 * edit that "tidies" one of them into something a dictionary would suggest is
 * a regression, not a tidy. This is the copy that a mistranslation makes
 * dangerous rather than merely wrong.
 */
import { DICTS, t, useLanguage, language } from "./say.js";

let failures = 0;
let checks = 0;
function is(name, condition, detail = "") {
  checks++;
  if (!condition) failures++;
  console.log(`  ${condition ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
}

const langs = Object.keys(DICTS);

console.log("\nTHE SAME KEYS IN EVERY LANGUAGE");
is("there are two languages", langs.length === 2, langs.join(", "));
const keys = langs.map((l) => new Set(Object.keys(DICTS[l])));
const all = new Set(langs.flatMap((l) => Object.keys(DICTS[l])));
for (const l of langs) {
  const missing = [...all].filter((k) => !DICTS[l][k]);
  is(`${l} carries every key the others do`, missing.length === 0,
    missing.length ? `missing: ${missing.join(", ")}` : `${keys[langs.indexOf(l)].size} keys`);
}
for (const l of langs) {
  const empty = Object.entries(DICTS[l]).filter(([, v]) => typeof v !== "string" || !v.trim());
  is(`${l} has no empty translation`, empty.length === 0, empty.map(([k]) => k).join(", "));
}
/*
 * And nothing is left in English by accident. A value identical to its key is
 * either a word that is genuinely the same in both — "Optional" is, in German
 * — or a line somebody meant to come back to. The ones that really are
 * identical are listed, so adding a new one is a deliberate act.
 */
const SAME_ON_PURPOSE = new Set(["Optional", "Start"]);
for (const l of langs) {
  const untouched = Object.entries(DICTS[l])
    .filter(([k, v]) => k === v && !SAME_ON_PURPOSE.has(k))
    .map(([k]) => k);
  is(`${l} has nothing left in English unremarked`, untouched.length === 0, untouched.join(", "));
}

console.log("\nSHORT ENOUGH FOR THE ROW IT SITS IN");
/*
 * Two and a half times the English, above a floor of sixteen characters.
 *
 * Both numbers are measured. The ratio alone fails the wrong thing: "drag" ->
 * "Schlepplift" is 2.8x and is a word eleven characters long, which cannot
 * wrap anything. What breaks this layout is absolute width in a narrow label
 * column, and the English labels in here run to thirty-one characters
 * ("Everything else stays as it is."), so nothing shorter than sixteen is
 * capable of causing the fault whatever its ratio.
 *
 * Above the floor the ratio is the right measure, and 2.5 is chosen against
 * what already ships: the longest German is "Bis zur nächsten Kreuzung" for
 * "To next junction" at 1.35x, and the longest Italian is "Non è quello che
 * cerchi?" for "Not quite?" at 2.40x. Two and a half clears both and still
 * catches a label that has become a sentence.
 */
const LIMIT = 2.5;
const FLOOR = 16;
for (const l of langs) {
  const rows = Object.entries(DICTS[l])
    .map(([k, v]) => ({ k, v, r: v.length / Math.max(1, k.length) }));
  const wide = rows
    .filter((x) => x.v.length > FLOOR && x.r > LIMIT)
    .sort((a, b) => b.r - a.r);
  const worst = rows
    .filter((x) => x.v.length > FLOOR)
    .reduce((a, b) => (b.r > a.r ? b : a), { k: "-", r: 0 });
  const longest = rows.reduce((a, b) => (b.v.length > a.v.length ? b : a));
  is(`${l} has no label more than ${LIMIT}x the English above ${FLOOR} chars`, wide.length === 0,
    wide.length
      ? wide.slice(0, 3).map((x) => `"${x.k}" -> "${x.v}" (${x.r.toFixed(1)}x)`).join("; ")
      : `widest ratio "${worst.k}" at ${worst.r.toFixed(2)}x, longest "${longest.v}" at ${longest.v.length} chars`);
}

console.log("\nTHE VOCABULARY THAT CAME FROM A SOURCE");
/*
 * The lift types, the grades, and the last lift. See the provenance note at
 * the top of say.js for where each of these was taken from.
 */
const SOURCED = {
  it: {
    chair: "seggiovia", gondola: "cabinovia", "cable car": "funivia", drag: "sciovia",
    carpet: "tappeto mobile", blue: "blu", red: "rossa", black: "nera",
    "Last lift": "Ultima salita", Lifts: "Impianti", "What is open": "Impianti aperti",
    "Most vertical": "Più dislivello",
  },
  de: {
    chair: "Sessellift", gondola: "Gondelbahn", "cable car": "Seilbahn", drag: "Schlepplift",
    carpet: "Zauberteppich", blue: "blau", red: "rot", black: "schwarz",
    "Last lift": "Letzte Bergfahrt", Lifts: "Lifte",
    "Longest descent": "Längste Abfahrt", "Most vertical": "Meiste Höhenmeter",
  },
};
for (const [l, want] of Object.entries(SOURCED)) {
  const wrong = Object.entries(want).filter(([k, v]) => DICTS[l][k] !== v);
  is(`${l} still uses the published words`, wrong.length === 0,
    wrong.length
      ? wrong.map(([k, v]) => `"${k}" should be "${v}", is "${DICTS[l][k]}"`).join("; ")
      : `${Object.keys(want).length} terms`);
}
/*
 * The three grades must stay three different words. They are the one piece of
 * vocabulary in here that is a safety signal rather than a label: a skier who
 * reads "rossa" for a black run takes a run they cannot ski.
 */
for (const l of langs) {
  const grades = ["blue", "red", "black"].map((g) => DICTS[l][g]);
  is(`${l} keeps the three grades distinct`, new Set(grades).size === 3, grades.join(", "));
}

console.log("\nWHAT HAPPENS TO A STRING NOBODY TRANSLATED");
useLanguage("it");
is("a key that exists is translated", t("Last lift") === "Ultima salita", t("Last lift"));
is("a key that does not falls back to itself",
  t("Snow report for tomorrow") === "Snow report for tomorrow", t("Snow report for tomorrow"));
is("and the language reports itself", language() === "it", String(language()));
useLanguage("de");
is("German too", t("Last lift") === "Letzte Bergfahrt", t("Last lift"));
useLanguage(null);
is("no language means English", t("Last lift") === "Last lift", t("Last lift"));
is("and an unknown language also means English",
  (useLanguage("fr"), t("Last lift") === "Last lift"), t("Last lift"));
/*
 * And it survives whatever a call site hands it. These render on the busiest
 * screen in the app, so a null must not throw where a word was expected.
 */
useLanguage("it");
is("a non-string is passed straight through",
  t(undefined) === undefined && t(null) === null && t(7) === 7);

console.log("\nEVERY t() CALL HAS SOMETHING TO RETURN");
/*
 * The dictionary and the call sites drifting apart is the failure this whole
 * file exists to make loud, and it happened while the screens were being
 * wired: t("Turn one back off") was written in ChooseScreen against no entry
 * at all. The fallback means it renders in English rather than breaking, so
 * nothing fails and nothing looks wrong — on an English phone. On an Italian
 * one it is a single English phrase in the middle of a translated screen,
 * which is exactly the fault the key-symmetry check above was written for and
 * cannot see, because it only compares the dictionaries to each other.
 *
 * So this reads the source. Every literal handed to t() across src/ has to be
 * a key, and a call with a variable argument — t(a.label), t(route.label) — is
 * skipped, because what those resolve to is the solver's own vocabulary and is
 * covered by the route-character entries.
 */
const { readdirSync, readFileSync, statSync } = await import("node:fs");
const walk = (dir) => readdirSync(dir).flatMap((f) => {
  const full = `${dir}/${f}`;
  return statSync(full).isDirectory() ? walk(full) : [full];
});
const src = walk(new URL("..", import.meta.url).pathname)
  .filter((f) => /\.jsx?$/.test(f) && !/\.test\.js$/.test(f) && !f.endsWith("say.js"));
const called = new Map();
for (const f of src) {
  const text = readFileSync(f, "utf8");
  for (const m of text.matchAll(/\bt\(\s*(["'])((?:\\.|(?!\1)[^\\])*)\1\s*\)/g)) {
    const key = m[2].replace(/\\'/g, "'").replace(/\\"/g, '"');
    if (!called.has(key)) called.set(key, f.split("/").slice(-1)[0]);
  }
}
const orphan = [...called].filter(([k]) => !all.has(k));
is("every literal passed to t() is a key", orphan.length === 0,
  orphan.length
    ? orphan.map(([k, f]) => `"${k}" in ${f}`).join("; ")
    : `${called.size} literals across ${src.length} files`);
/*
 * And the other direction, reported rather than failed: an entry nothing calls
 * is dead weight, but it is also the normal state of a dictionary written
 * ahead of the screens being wired, so it is a number to watch and not a
 * failure to chase.
 */
const unused = [...all].filter((k) => !called.has(k));
console.log(`        (${all.size - unused.length} of ${all.size} entries wired` +
  (unused.length ? `, ${unused.length} not yet: ${unused.slice(0, 6).join(", ")}${unused.length > 6 ? " …" : ""}` : "") + ")");

console.log("\nTHE MOUNTAIN'S OWN NAMES ARE NOT TRANSLATED");
/*
 * The sign at the top of the run says Cimalegna. Translating a piste or a
 * station name would break the one thing the reader is doing with it, which is
 * matching the screen to the post in the snow. This holds that: no key in
 * here is a name from any of the graphs.
 */
const { RESORTS } = await import("../resorts/index.js");
const { graphFor } = await import("../resorts/graphs.js");
const names = new Set();
for (const r of RESORTS.filter((x) => x.available)) {
  const g = graphFor(r.id);
  if (!g) continue;
  for (const n of Object.values(g.NODES)) names.add(n.name);
  for (const run of g.RUNS) names.add(run[2]);
  for (const lift of g.LIFTS) names.add(lift[2]);
}
const collide = [...all].filter((k) => names.has(k));
is("no place, piste or lift name is in the dictionary", collide.length === 0,
  collide.join(", ") || `checked against ${names.size} names from the graphs`);

console.log("\n" + (failures ? `  ${failures} FAILING of ${checks}` : `  the translations hold, all ${checks} checks`));
process.exit(failures ? 1 : 0);
