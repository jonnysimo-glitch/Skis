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

  /**
   * Direction. A dashed line heading downhill on the profile is a gondola
   * ride, and the only reason it is trustworthy is that these hold: nothing
   * flagged `down` is a drag lift or a chair, and no run ever climbs. If a
   * future dataset breaks either one the app is drawing a lie.
   */
  const edges = mod.buildEdges();
  const RIDEABLE_DOWN = new Set(["gondola", "cable car", "funicular"]);
  const badDown = edges.filter((e) =>
    e.down && (!RIDEABLE_DOWN.has(e.liftType) || !(e.gain < 0)));
  check(`${id}: every ride down is a gondola, cable car or funicular`, badDown.length === 0,
    badDown.slice(0, 3).map((e) => `${e.name} (${e.liftType}, ${e.gain} m)`).join("; "));
  const badUp = edges.filter((e) => e.kind === "lift" && !e.down && !(e.gain > 0));
  check(`${id}: every lift ridden up gains height`, badUp.length === 0,
    badUp.slice(0, 3).map((e) => `${e.name} (${e.gain} m)`).join("; "));
  // Zero is allowed: a flat link across a plateau or between two valley
  // stations is a real piste, and three of them exist across these resorts.
  // A negative drop is not — that is a run drawn the wrong way round.
  const uphillRuns = edges.filter((e) => e.kind === "run" && !(e.drop >= 0));
  check(`${id}: no run goes uphill`, uphillRuns.length === 0,
    uphillRuns.slice(0, 3).map((e) => `${e.name} (${e.drop} m)`).join("; "));

  /**
   * Nothing on the mountain is called Point 61.
   *
   * Every node gets a name a skier could say out loud, and so does every run.
   * A placeholder leaking into either is the specific thing that made the plan
   * form useless, and it came back once already through a stage ordering.
   */
  const placeholder = /Point \d+|\bundefined\b|\bnull\b|^\s*$/;
  const badNames = [
    ...keys.filter((k) => placeholder.test(NODES[k].name || "")).map((k) => `node ${k}: ${NODES[k].name}`),
    ...edges.filter((e) => placeholder.test(e.name || "")).map((e) => `${e.kind}: ${e.name}`),
  ];
  check(`${id}: nothing is called Point 61`, badNames.length === 0,
    badNames.slice(0, 3).join("; "));

  const bases = keys.filter((k) => NODES[k].base);
  if (!check(`${id}: has at least one base to start and finish at`, bases.length > 0,
    "no node matched the config's `bases`")) return;

  /**
   * The real test: can the solver plan a day on this mountain, and for whom?
   *
   * A graph can be structurally valid and still be useless. Monterosa's OSM
   * graph gives a black skier all 76 places from Stafal, a red skier 26, and a
   * blue skier exactly one — nowhere at all — because the blue runs are real
   * but do not form a round trip. A resort that silently offers a beginner
   * nothing is the "looks authoritative and is not" failure this pipeline
   * exists to prevent, so it is measured per grade and stated.
   *
   * Failing is reserved for a resort that serves nobody. A grade with nothing
   * for it is reported, because the fix is a wider bbox or a look at the piste
   * map, not something a build can decide.
   */
  const graph = asGraph({ NODES, SHORT_NAMES, buildEdges });
  const ABILITIES = ["blue", "red", "black"];
  /**
   * Every route this resort offers anybody, so what it offers can be checked
   * rather than assumed. A day is a plan somebody will follow off a lift.
   */
  const offered = [];
  for (const start of bases) {
    const served = [];
    const longest = {};
    for (const ability of ABILITIES) {
      // The longest day each grade supports, rather than a pass/fail at six
      // hours: a small mountain honestly cannot fill one and that is not a
      // fault, whereas a grade that cannot fill ninety minutes is.
      let best = 0;
      for (const budget of [90, 150, 240, 360]) {
        const routes = solve({
          graph, start, finish: start, ability,
          budget, startClock: 9 * 60, count: 1,
        });
        if (routes.length) best = Math.max(best, routes[0].minutes);
        for (const route of routes) offered.push({ start, ability, budget, route });
      }
      longest[ability] = best;
      if (best >= 90) served.push(ability);
    }
    check(`${id}: ${NODES[start].name} works for somebody`, served.length > 0,
      `blue ${longest.blue}min, red ${longest.red}min, black ${longest.black}min`);
    const unserved = ABILITIES.filter((a) => !served.includes(a));
    if (served.length && unserved.length) {
      console.log(`  note  ${id}: nothing for ${unserved.join(" or ")} from ` +
        `${NODES[start].name} — longest day: ` +
        ABILITIES.map((a) => `${a} ${longest[a]}min`).join(", "));
    }
  }

  /**
   * What is in the days it offers.
   *
   * A route can satisfy every clock and still be nonsense. Riding one cable
   * car up and down for five hours passes the budget check, the last-lift
   * check and the repeat cap, and it was what a blue skier at Monterosa was
   * handed: 0.1 km skied, 17 metres of descent, and 44% of the day spent
   * riding a lift downhill. So the shape of a day is checked too.
   */
  if (offered.length) {
    const transport = offered.filter(({ route }) => {
      let ski = 0, down = 0;
      for (const e of route.segments) {
        if (e.kind === "run") ski += e.min;
        else if (e.down) down += e.min;
      }
      return down > ski;
    });
    check(`${id}: no day spends longer riding down than skiing`, transport.length === 0,
      transport.slice(0, 3).map(({ ability, route }) =>
        `${ability}: ${route.km} km, ${route.vertical} m`).join("; "));

    const reversals = offered.filter(({ route }) => route.segments.some((e, i) => {
      const prev = route.segments[i - 1];
      return prev && prev.kind === "lift" && e.kind === "lift" &&
        prev.from === e.to && prev.to === e.from;
    }));
    check(`${id}: no day rides a lift straight back the way it came`, reversals.length === 0,
      reversals.slice(0, 3).map(({ ability, route }) => `${ability}: ${route.title}`).join("; "));

    const trivial = offered.filter(({ route }) => route.vertical < 150 || route.km < 1);
    check(`${id}: every day skis somewhere`, trivial.length === 0,
      trivial.slice(0, 3).map(({ ability, route }) =>
        `${ability}: ${route.km} km, ${route.vertical} m in ${route.minutes} min`).join("; "));

    const late = offered.filter(({ route, budget }) => {
      let t = 9 * 60;
      return route.segments.some((e) => {
        const bad = e.kind === "lift" && t > e.lastUp;
        t += e.min;
        return bad;
      }) || route.minutes > budget;
    });
    check(`${id}: nothing boards a lift after it has shut, or overruns`, late.length === 0,
      late.slice(0, 3).map(({ ability, route }) => `${ability}: ${route.title}`).join("; "));
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
