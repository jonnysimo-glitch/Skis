/**
 * Checks on the active-resort bindings. Run: node src/active-resort.test.js
 *
 * Two things here are load-bearing and neither is obvious from reading the
 * module. The first is that an ES module binding is live, so reassigning
 * `NODES` inside active-resort.js is visible to a file that imported it — the
 * whole design rests on that and it deserves an assertion rather than a
 * comment. The second is the failure mode that follows from it: a value
 * derived at module load freezes the first resort's data forever, and it does
 * it silently. That one is caught by reading the source, because no runtime
 * check can see a constant that was correct when it was computed.
 */
import { readdir, readFile } from "node:fs/promises";
import * as active from "./active-resort.js";
import {
  NODES, LIFTS, RUNS, SHORT_NAMES, DIFFICULTY_RANK, buildEdges,
  setActiveResort, activeGraph, activeResortId, activeProjector, ensureActive, BUILT_IN_ID,
} from "./active-resort.js";
import { solve } from "./solver.js";

let failures = 0;
let ran = 0;
const check = (name, pass, detail = "") => {
  ran++;
  if (!pass) failures++;
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
};

/** A second mountain, small but genuinely skiable. */
const OTHER = {
  NODES: {
    base: { name: "Otherbase", lat: 46.50, lon: 11.90, alt: 1100, base: true, area: "Other" },
    mid:  { name: "Othermid",  lat: 46.52, lon: 11.92, alt: 1800, area: "Other" },
    top:  { name: "Othertop",  lat: 46.54, lon: 11.94, alt: 2500, area: "Other" },
  },
  LIFTS: [
    ["base", "mid", "Other gondola", "gondola", 8, 1020, 4],
    ["mid", "top", "Other chair", "chair", 7, 1020, 3],
  ],
  RUNS: [
    ["top", "mid", "Other upper", "red", 2.4, 9],
    ["mid", "base", "Other lower", "blue", 3.1, 11],
    ["top", "base", "Other direct", "red", 5.2, 19],
  ],
  DIFFICULTY_RANK: { blue: 1, red: 2, black: 3 },
  SHORT_NAMES: { top: "Othertop" },
  buildEdges() {
    const edges = [];
    OTHER.LIFTS.forEach(([from, to, name, liftType, ride, lastUp, queue], i) => {
      edges.push({ id: `L${i}`, kind: "lift", from, to, name, liftType, ride, lastUp, queue,
        min: ride + queue, gain: OTHER.NODES[to].alt - OTHER.NODES[from].alt });
    });
    OTHER.RUNS.forEach(([from, to, name, difficulty, km, min], i) => {
      edges.push({ id: `R${i}`, kind: "run", from, to, name, difficulty, km, min,
        drop: OTHER.NODES[from].alt - OTHER.NODES[to].alt });
    });
    return edges;
  },
};

console.log("\nNOTHING IS ACTIVE UNTIL SOMETHING SAYS SO");
// The bindings have to be usable from the moment the module loads, but the id
// must not claim a resort is selected. It used to start as "monterosa", so
// ensureActive("monterosa") decided the right graph was already in place while
// these still held the hand-typed thirteen-node one — and the app posted that
// to the solver with node keys from the built graph. Every solve after a
// reload died inside the adjacency walk with "not iterable".
check("no resort is active yet", activeResortId() === null, String(activeResortId()));
check("but the bindings are usable anyway", Object.keys(NODES).length > 0);
check("ensureActive swaps in the built graph rather than deciding it is there",
  ensureActive(BUILT_IN_ID) === BUILT_IN_ID && Object.keys(NODES).length > 20,
  `${Object.keys(NODES).length} nodes after ensureActive`);
const monterosaNodeCount = Object.keys(NODES).length;
check("with its nodes", monterosaNodeCount > 0, `${monterosaNodeCount} nodes`);

console.log("\nA SWAP REACHES A FILE THAT ALREADY IMPORTED THE BINDING");
// The imports at the top of this file were resolved before setActiveResort was
// ever called. If the binding were a copy rather than live, every check below
// would still see Monterosa and the whole approach would be broken.
setActiveResort("other", OTHER);
check("the id changes", activeResortId() === "other");
check("NODES follows", NODES.base?.name === "Otherbase", NODES.base?.name);
check("LIFTS follows", LIFTS.length === 2, `${LIFTS.length} lifts`);
check("RUNS follows", RUNS.length === 3, `${RUNS.length} runs`);
check("SHORT_NAMES follows", SHORT_NAMES.top === "Othertop");
check("DIFFICULTY_RANK follows", DIFFICULTY_RANK.black === 3);
check("buildEdges follows", buildEdges().length === 5, `${buildEdges().length} edges`);
check("the namespace import agrees with the named ones", active.NODES === NODES);
check("and the projector centres on the new mountain",
  Math.abs(activeProjector().lat0 - 46.52) < 0.001, activeProjector().lat0.toFixed(3));

console.log("\nTHE SOLVER CAN PLAN ON WHATEVER IS ACTIVE");
const graph = activeGraph();
check("the graph is plain data the worker can be posted",
  (() => { try { structuredClone(graph); return true; } catch { return false; } })());
const routes = solve({ graph, start: "base", finish: "base", ability: "red",
  budget: 6 * 60, startClock: 9 * 60, count: 3 });
check("and it plans a day on the second mountain", routes.length > 0, `${routes.length} routes`);
check("using that mountain's runs, not Monterosa's",
  routes[0].segments.every((e) => OTHER.NODES[e.from] && OTHER.NODES[e.to]));

console.log("\nA BROKEN MODULE LEAVES THE PREVIOUS RESORT ALONE");
// Half-swapping is the dangerous outcome: one resort's nodes with another's
// runs would route someone into terrain that is not there.
let refused = "accepted it";
try { setActiveResort("broken", { NODES: OTHER.NODES, LIFTS: [] }); }
catch (error) { refused = error.message; }
check("a module with no RUNS is refused", refused.includes("missing RUNS"), refused);
check("and the active resort is untouched", activeResortId() === "other" && RUNS.length === 3);
let nulled = "accepted it";
try { setActiveResort("nothing", null); }
catch (error) { nulled = error.message; }
check("so is no module at all", nulled.includes("No graph module"), nulled);

console.log("\nAND BACK");
// Through ensureActive, not by importing resort.js: "monterosa" means whatever
// graphs.js says it means, which is the generated graph once one exists. The
// hand-typed file is only the fallback for an id with no data.
ensureActive(BUILT_IN_ID);
check("Monterosa returns intact", activeResortId() === BUILT_IN_ID &&
  Object.keys(NODES).length === monterosaNodeCount,
  `${Object.keys(NODES).length} nodes, expected ${monterosaNodeCount}`);

console.log("\nNOTHING DERIVES THESE AT MODULE LOAD");
/**
 * The one way this design fails silently. `const EDGES = buildEdges()` at the
 * top of a file runs once, at import, and keeps the first resort's edges for
 * the life of the page — no error, no warning, just a route drawn on the wrong
 * mountain. A lazy read is fine, so an arrow or a function body does not count.
 */
const BINDINGS = ["NODES", "LIFTS", "RUNS", "SHORT_NAMES", "DIFFICULTY_RANK", "buildEdges"];
async function jsFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) out.push(...(await jsFiles(path)));
    else if (/\.(js|jsx)$/.test(entry.name) && !entry.name.includes(".test.")) out.push(path);
  }
  return out;
}
const offenders = [];
for (const path of await jsFiles("src")) {
  const source = await readFile(path, "utf8");
  if (!/from "\.{1,2}\/(\.\.\/)*active-resort\.js"/.test(source)) continue;
  source.split("\n").forEach((line, i) => {
    // Top level only: an indented line is inside something that runs later.
    if (!/^(const|let|var) \w+ *=/.test(line)) return;
    if (line.includes("=>") || line.includes("function")) return;
    if (!BINDINGS.some((name) => new RegExp(`\\b${name}\\b`).test(line))) return;
    offenders.push(`${path}:${i + 1} ${line.trim()}`);
  });
}
check("no importer computes a value from the graph at module scope",
  offenders.length === 0, offenders.join(" | "));

/**
 * The other way to read the wrong mountain.
 *
 * `measure` and `altitudeSeries` take an optional graph and fall back to
 * Monterosa when they are not given one. That default is right for the solver,
 * which is the only caller that can be sure, and a trap everywhere else:
 * ElevationProfile called altitudeSeries(route) and crashed the render with
 * "Cannot read properties of undefined (reading 'alt')" on any other resort,
 * leaving the app stuck on the solving screen. direct.js had the same call and
 * failed silently — the route was right and every number attached to it was
 * read off Monterosa.
 *
 * Both only need NODES, so passing `{ NODES }` costs nothing. Checked by
 * source, because a single-argument call is correct-looking code.
 */
const FALLBACK_FNS = ["measure", "altitudeSeries"];
const graphless = [];
for (const path of await jsFiles("src")) {
  if (path.endsWith("src/solver.js")) continue; // the one caller that owns the default
  const source = await readFile(path, "utf8");
  source.split("\n").forEach((line, i) => {
    for (const fn of FALLBACK_FNS) {
      // One argument means no graph: `fn(route)` rather than `fn(route, g)`.
      if (new RegExp(`\\b${fn}\\(\\s*[^,()]*\\)`).test(line)) {
        graphless.push(`${path}:${i + 1} ${line.trim()}`);
      }
    }
  });
}
check("nothing calls measure or altitudeSeries without a node set",
  graphless.length === 0, graphless.join(" | "));

console.log("\n" + (failures ? `${failures} FAILING` : `active-resort holds, all ${ran} checks`));
process.exit(failures ? 1 : 0);
