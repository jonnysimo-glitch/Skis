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
import { applyOperations, fillAreas } from "./osm/operations.mjs";
import { contractChains, nameRuns } from "./osm/simplify.mjs";

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
  // After the bases are marked, because a base is never contracted away, and
  // before the prune, so connectivity is judged on the graph the app will use.
  graph = contractChains(graph);
  graph = prune(graph);
  // Last, so an unsigned run is described by the nodes that survived the
  // merge and the prune, under the names they ended up with.
  graph = nameRuns(graph);

  const r = graph.report;
  if (r.runsNamedByEndpoints) {
    console.log(`  named       ${r.runsNamedByEndpoints} unsigned run(s) named after where they go`);
  }
  if (r.chainsMerged) {
    console.log(`  simplified  ${r.chainsMerged} way-end joins contracted, ` +
      `${r.nodesContracted} node(s) that were only a continuation removed`);
  }
  console.log(`  connected   kept ${r.nodesKept} of ${r.nodesKept + r.nodesDropped} nodes ` +
    `(${r.components} components), dropped ${r.liftsDropped} lifts and ${r.runsDropped} runs`);
  // Two different faults, and the numbers tell them apart. Nodes outside the
  // largest undirected piece are places the data never joined to the mountain
  // at all — a clipped valley, a lift stopping short of its piste, endpoints
  // beyond the stitching tolerance. Nodes inside that piece but outside the
  // strongly connected core are places you can reach and not leave, which is a
  // missing or one-way lift. The first wants a wider bbox or more tolerance;
  // the second wants a look at the lifts.
  const unjoined = r.nodesKept + r.nodesDropped - r.largestPiece;
  if (unjoined || r.strandedOnly) {
    console.log(`  broken      ${r.pieces} unjoined piece(s): ${unjoined} node(s) never touch the ` +
      `mountain, ${r.strandedOnly} more can be reached but not left`);
  }
  if (r.difficultyAssumed) console.log(`  assumed     ${r.difficultyAssumed} pistes had no difficulty, taken as red`);
  // Loud, because an altitude-less node is a node the solver cannot rank and
  // `check` will refuse the whole graph over. It means the DEM did not cover
  // somewhere a piste reached, which is a bbox to widen rather than a mystery.
  if (r.noAltitude) console.log(`  NO HEIGHT   ${r.noAltitude} node(s) fell outside the elevation tiles`);
  if (r.bases !== undefined) {
    console.log(`  bases       ${r.bases} matched from config` +
      (r.duplicateBases ? `, ${r.duplicateBases} same-named node(s) not marked` : ""));
  }

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
