/**
 * Gate on generated resort data.
 *
 * `npm run resort` refuses to write a graph that fails `validate.mjs`, so a
 * file in src/resorts/ was sound when it was written. This checks the things
 * that go wrong *after* that: a registry entry that says a resort is live
 * before its data exists, an available resort missing the camera or bbox
 * fields the map and the offline cache read, a graph that passes a structural
 * check but that the solver cannot actually plan a day on.
 *
 * It exists because the resort pipeline now runs unattended on a GitHub runner
 * and commits its own output. `npm test` was gating that commit while checking
 * only Monterosa and some synthetic graphs — it would have waved through a
 * newly stitched mountain the solver could not route across. This is the gate
 * that would notice.
 *
 * Run: node scripts/check-resorts.mjs   (part of `npm test`)
 */
import { readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { solve, asGraph } from "../src/solver.js";
import { RESORTS } from "../src/resorts/index.js";
import { graphFor, withGraphs } from "../src/resorts/graphs.js";

const OUT_DIR = new URL("../src/resorts/", import.meta.url);
const OSM_DIR = new URL("../data/osm/", import.meta.url);
const CONFIG_DIR = new URL("../scripts/resorts/", import.meta.url);

/**
 * Monterosa is live from src/resort.js, which predates the pipeline. Until the
 * generated monterosa.js replaces it, "available with no generated module" is
 * the truth for exactly this one id rather than a fault.
 */
const BUILT_IN = "monterosa";

/** Fields the map camera and the offline tile warmer read off a live resort. */
const LIVE_FIELDS = ["center", "zoom", "bbox", "defaultBase", "firstLift", "lastDown"];

let failures = 0;
let checks = 0;

function check(label, ok, detail = "") {
  checks++;
  if (ok) return true;
  failures++;
  console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
  return false;
}

const finite = (n) => typeof n === "number" && Number.isFinite(n);

function checkGraph(id, mod) {
  const before = failures;
  const { NODES, LIFTS, RUNS, SHORT_NAMES, DIFFICULTY_RANK, buildEdges } = mod;

  if (!check(`${id}: exports a graph`,
    NODES && LIFTS && RUNS && DIFFICULTY_RANK && typeof buildEdges === "function")) return;
  if (!check(`${id}: exports SHORT_NAMES`, SHORT_NAMES && typeof SHORT_NAMES === "object")) return;

  const keys = Object.keys(NODES);
  check(`${id}: has nodes`, keys.length > 0);

  // A node with a bad coordinate does not throw; it puts the route line in the
  // sea. Worth catching here rather than on a phone on a chairlift.
  const badCoords = keys.filter((k) => {
    const n = NODES[k];
    return !n.name || !finite(n.lat) || !finite(n.lon) || !finite(n.alt) ||
      Math.abs(n.lat) > 90 || Math.abs(n.lon) > 180;
  });
  check(`${id}: every node has a name and real coordinates`, badCoords.length === 0,
    badCoords.slice(0, 5).join(", "));

  const dangling = [
    ...LIFTS.filter(([f, t]) => !NODES[f] || !NODES[t]).map(([f, t, name]) => `lift ${name} (${f}->${t})`),
    ...RUNS.filter(([f, t]) => !NODES[f] || !NODES[t]).map(([f, t, name]) => `run ${name} (${f}->${t})`),
  ];
  // Must stop here on failure: buildEdges() dereferences the missing node, and
  // that throw would otherwise surface as "module loads", which is not the fault.
  if (!check(`${id}: every edge lands on a node`, dangling.length === 0,
    dangling.slice(0, 3).join("; "))) return;

  // Lift hours and queues are the numbers behind "nothing will strand you".
  // A missing lastUp reads as 0 and the solver would refuse every lift.
  const badOps = LIFTS.filter(([, , , , ride, lastUp, queue]) =>
    !finite(ride) || ride <= 0 || !finite(lastUp) || lastUp <= 0 || !finite(queue) || queue < 0);
  check(`${id}: every lift has a ride time, last-up and queue`, badOps.length === 0,
    badOps.slice(0, 3).map((l) => l[2]).join(", "));

  const bases = keys.filter((k) => NODES[k].base);
  if (!check(`${id}: has at least one base to start and finish at`, bases.length > 0,
    "no node matched the config's `bases`")) return;

  // The real test: can the solver plan a day on this mountain? A graph can be
  // structurally valid and still be two halves joined by a lift that shuts at
  // noon. Red covers blue too, so it is the ability that should always work.
  const graph = asGraph({ NODES, SHORT_NAMES, buildEdges });
  for (const start of bases) {
    const routes = solve({
      graph, start, finish: start, ability: "red",
      budget: 6 * 60, startClock: 9 * 60, count: 3,
    });
    check(`${id}: solves a six-hour day from ${NODES[start].name}`, routes.length > 0);
  }

  const total = RUNS.reduce((sum, r) => sum + (r[4] || 0), 0);
  const shape = `${keys.length} nodes, ${LIFTS.length} lifts, ${RUNS.length} runs, ` +
    `${total.toFixed(1)} km, ${bases.length} base(s)`;
  console.log(failures === before ? `  ok    ${id}: ${shape}` : `        ${id}: ${shape}`);
}

// index.js is the registry and graphs.js is the generated import list; neither
// is a resort.
const NOT_RESORTS = new Set(["index.js", "graphs.js"]);
const generated = (await readdir(OUT_DIR))
  .filter((f) => f.endsWith(".js") && !NOT_RESORTS.has(f) && !f.endsWith(".test.js"))
  .map((f) => f.replace(/\.js$/, ""));

console.log(`\nResort data: ${generated.length || "no"} generated module(s)`);

for (const id of generated) {
  try {
    checkGraph(id, await import(pathToFileURL(new URL(`${id}.js`, OUT_DIR).pathname).href));
  } catch (error) {
    check(`${id}: module loads`, false, error.message);
  }
}

// Registry consistency. Getting this wrong is how a resort ends up offered in
// the selection panel with nothing behind it.
for (const resort of RESORTS) {
  check(`registry: ${resort.id} has a name`, Boolean(resort.name));
  if (!resort.available) continue;

  check(`registry: ${resort.id} is available and has data`,
    resort.id === BUILT_IN || generated.includes(resort.id),
    "marked available with no generated module");

  // The path the app actually takes when you tap a resort. A file on disk that
  // graphs.js does not import is a resort the picker offers and cannot open.
  const wired = graphFor(resort.id);
  check(`registry: ${resort.id} resolves through graphs.js`, Boolean(wired),
    "graphs.js has no import for it — run: npm run resort -- " + resort.id);
  if (wired) {
    check(`registry: ${resort.id}'s wired module is a graph`,
      Boolean(wired.NODES && wired.LIFTS && wired.RUNS && wired.buildEdges));
  }

  const missing = LIVE_FIELDS.filter((f) => resort[f] === undefined);
  check(`registry: ${resort.id} has the fields a live resort needs`, missing.length === 0,
    `missing ${missing.join(", ")}`);
}

const orphans = generated.filter((id) => !RESORTS.some((r) => r.id === id));
check("registry: every generated resort is listed", orphans.length === 0, orphans.join(", "));

// Raw export but no module means the fetch worked and the build did not. The
// first workflow run left exactly this on the branch — a committed Monterosa
// export with no graph beside it — and the suite passed, because there was no
// generated module to find anything wrong with. Silence there is the problem.
const exports_ = existsSync(OSM_DIR.pathname)
  ? (await readdir(OSM_DIR)).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, ""))
  : [];
const unbuilt = exports_.filter((id) => !generated.includes(id));
// And the reverse: a module nobody imports is dead weight that looks live.
const unwired = generated.filter((id) => !withGraphs().includes(id));
check("pipeline: every generated graph is imported by graphs.js", unwired.length === 0,
  `${unwired.join(", ")} on disk but not in graphs.js — run: npm run resort -- ${unwired[0] || "<id>"} --offline`);
check("pipeline: every fetched export produced a graph", unbuilt.length === 0,
  `${unbuilt.join(", ")} fetched but not built — run: npm run resort -- ${unbuilt[0] || "<id>"} --offline`);

// Not a failure: data can land before someone writes the camera position and
// flips the flag. Say so, because otherwise it is silently invisible in the app.
const waiting = generated.filter((id) =>
  RESORTS.some((r) => r.id === id && !r.available));
if (waiting.length) {
  console.log(`  note  built but not live yet: ${waiting.join(", ")}`);
  console.log(`        add ${LIVE_FIELDS.join(", ")} and set available: true in src/resorts/index.js`);
}

console.log(`${failures ? "FAILED" : "passed"}: ${checks - failures}/${checks} resort checks\n`);
process.exit(failures ? 1 : 0);
