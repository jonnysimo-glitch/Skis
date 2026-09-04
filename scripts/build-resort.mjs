/**
 * Build a resort graph from OpenStreetMap. Run with: npm run resort -- <id>
 *
 *   npm run resort -- monterosa            build, fetching what it needs
 *   npm run resort -- kronplatz --offline  build from cached data only
 *   npm run resort -- --all                every resort in scripts/resorts/
 *   npm run resort -- kronplatz --dry      report without writing
 *   npm run resort -- kronplatz --tolerance=60
 *
 * The point of this file existing is that adding a resort should be a config
 * file and a command, not a week of typing. Everything specific to one resort
 * lives in scripts/resorts/<id>.json; everything else is the same for all of
 * them.
 */
import { readFile, writeFile, readdir } from "node:fs/promises";
import { fetchResort, query } from "./osm/overpass.mjs";
import { build } from "./osm/graph.mjs";
import { prune, check } from "./osm/validate.mjs";
import { elevationFor } from "./osm/elevation.mjs";
import { emit } from "./osm/emit.mjs";
import { writeRegistry } from "./osm/registry.mjs";

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const value = (name, fallback) => {
  const found = args.find((a) => a.startsWith(`--${name}=`));
  return found ? found.slice(name.length + 3) : fallback;
};
const ids = args.filter((a) => !a.startsWith("--"));

const CONFIG_DIR = new URL("./resorts/", import.meta.url).pathname;
const OUT_DIR = new URL("../src/resorts/", import.meta.url).pathname;

async function configFor(id) {
  try {
    return JSON.parse(await readFile(`${CONFIG_DIR}${id}.json`, "utf8"));
  } catch {
    const available = (await readdir(CONFIG_DIR))
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(/\.json$/, ""));
    throw new Error(`No config for "${id}". Available: ${available.join(", ") || "none"}`);
  }
}

/**
 * Lift hours and queues are not in OSM and never will be: they are operational
 * facts the resort owns, which is also why resorts are the customer. The config
 * gives a default and any per-lift exceptions, matched on the OSM name.
 */
function applyOperations(graph, config) {
  const ops = config.lifts || {};
  const fallback = ops.default || { lastUp: config.lastDown ?? 16 * 60, queue: 5 };
  let matched = 0;

  const LIFTS = graph.LIFTS.map((lift) => {
    const override = ops.byName?.[lift.name];
    if (override) matched++;
    return {
      ...lift,
      lastUp: override?.lastUp ?? fallback.lastUp,
      queue: override?.queue ?? fallback.queue,
    };
  });

  // Bases are editorial: which valley stations a skier would drive to and park
  // at. Matched on name so the config survives a graph rebuild renumbering.
  const wanted = new Set(config.bases || []);
  const NODES = { ...graph.NODES };
  let bases = 0;
  for (const [key, node] of Object.entries(NODES)) {
    if (wanted.has(node.name) || wanted.has(key)) {
      NODES[key] = { ...node, base: true, area: config.areas?.[node.name] ?? node.area };
      bases++;
    } else if (config.areas?.[node.name]) {
      NODES[key] = { ...node, area: config.areas[node.name] };
    }
  }

  return { ...graph, NODES, LIFTS, report: { ...graph.report, liftHoursMatched: matched, bases } };
}

/**
 * Every node needs an area for the "most variety" objective to mean anything.
 * Where the config has not named one, the nearest named base lends its own, so
 * the mountain is divided the way a skier would divide it.
 */
function fillAreas(graph, config) {
  const { NODES } = graph;
  const anchors = Object.entries(NODES).filter(([, n]) => n.area);
  if (!anchors.length) {
    for (const key of Object.keys(NODES)) NODES[key] = { ...NODES[key], area: config.name };
    return graph;
  }
  const dist = (a, b) => (a.lat - b.lat) ** 2 + (a.lon - b.lon) ** 2;
  for (const [key, node] of Object.entries(NODES)) {
    if (node.area) continue;
    let best = anchors[0];
    for (const anchor of anchors) if (dist(node, anchor[1]) < dist(node, best[1])) best = anchor;
    NODES[key] = { ...node, area: best[1].area };
  }
  return graph;
}

async function buildOne(id) {
  const config = await configFor(id);
  console.log(`\n${config.name}`);
  console.log("-".repeat(config.name.length));

  if (flag("query")) {
    console.log(query(config.bbox));
    return true;
  }

  if (flag("turbo")) {
    // overpass-turbo takes the query in the URL, so this is a link rather than
    // a copy-and-paste. Run it, then Export -> raw data -> download, and save
    // the file where the message says.
    const url = `https://overpass-turbo.eu/?Q=${encodeURIComponent(query(config.bbox))}&R`;
    console.log(`\n  Open this, press Run, then Export -> data -> "raw data directly from Overpass API":\n`);
    console.log(`  ${url}\n`);
    console.log(`  Save the download as:  data/osm/${config.id}.json`);
    console.log(`  Then:                  npm run resort -- ${config.id} --offline\n`);
    return true;
  }

  const osm = await fetchResort(config, { offline: flag("offline"), force: flag("force") });
  console.log(`  osm         ${osm.elements.length} elements from ${osm.source}`);

  const elevation = await elevationFor(config.bbox, { offline: flag("offline") });
  console.log(`  elevation   ${elevation.tiles} tiles${elevation.missing.length ? `, ${elevation.missing.length} missing` : ""}`);

  const tolerance = Number(value("tolerance", config.tolerance ?? 45));
  let graph = build(osm, { tolerance, elevation });
  console.log(`  raw         ${Object.keys(graph.NODES).length} nodes, ${graph.LIFTS.length} lifts, ${graph.RUNS.length} runs`);

  graph = applyOperations(graph, config);
  graph = fillAreas(graph, config);
  graph = prune(graph);

  const r = graph.report;
  console.log(`  connected   kept ${r.nodesKept} of ${r.nodesKept + r.nodesDropped} nodes ` +
    `(${r.components} components), dropped ${r.liftsDropped} lifts and ${r.runsDropped} runs`);
  if (r.difficultyAssumed) console.log(`  assumed     ${r.difficultyAssumed} pistes had no difficulty, taken as red`);
  if (r.bases !== undefined) console.log(`  bases       ${r.bases} matched from config`);

  const problems = check(graph);
  if (problems.length) {
    console.log(`\n  ${problems.length} PROBLEM${problems.length === 1 ? "" : "S"}:`);
    for (const p of problems.slice(0, 15)) console.log(`    ${p}`);
    if (problems.length > 15) console.log(`    ...and ${problems.length - 15} more`);
    console.log("\n  Not written. A graph that fails these would strand someone.");
    return false;
  }

  const module = emit({ id, meta: config, ...graph, fetchedAt: osm.fetchedAt });
  if (flag("dry")) {
    console.log(`\n  dry run, ${module.split("\n").length} lines not written`);
    return true;
  }
  await writeFile(`${OUT_DIR}${id}.js`, module);
  console.log(`  written     src/resorts/${id}.js`);
  // The whole promise of this pipeline is that adding a resort is a config
  // file and a command. Leaving someone to import the new module by hand would
  // break that, so the import list is regenerated from what is on disk.
  const wired = await writeRegistry();
  console.log(`  registry    src/resorts/graphs.js now lists ${wired.join(", ")}`);
  return true;
}

const targets = flag("all")
  ? (await readdir(CONFIG_DIR)).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, ""))
  : ids;

if (!targets.length) {
  console.error("Usage: npm run resort -- <id> [--all] [--offline] [--dry] [--query] [--turbo]");
  process.exit(2);
}

/**
 * Between resorts, when there is more than one and we are actually fetching.
 *
 * overpass-api.de gives a client two slots. Three resorts back to back means
 * the second asks while the first is still holding one, and the answer is a
 * 429 rather than a queue. The fetch retries those now, but not asking in the
 * first place is better manners and faster than being told to wait.
 */
const SPACING_MS = 20000;
const fetching = !flag("offline") && !flag("dry") && !flag("query");

let ok = true;
for (const [index, id] of targets.entries()) {
  if (index && fetching && targets.length > 1) {
    console.log(`\n  pausing ${SPACING_MS / 1000}s so Overpass has a free slot\n`);
    await new Promise((resolve) => setTimeout(resolve, SPACING_MS));
  }
  try {
    if (!(await buildOne(id))) ok = false;
  } catch (error) {
    console.error(`\n${id}: ${error.message}\n`);
    ok = false;
  }
}

// The summary matters when this runs unattended: the workflow reads stdout into
// the run page, and "which of the three worked" is the first question.
console.log(`\n${ok ? "All" : "Some"} of ${targets.length} resort(s) built: ${targets.join(", ")}`);
process.exit(ok ? 0 : 1);
