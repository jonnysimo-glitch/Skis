/**
 * Which stitching tolerance to give a resort. Run: npm run resort:tune -- <id>
 *
 * The tolerance is how far apart two endpoints can be and still be treated as
 * the same place. It is the single most consequential number in the pipeline
 * and there is no right answer for it in general: too small and a mountain
 * traced by twenty people falls into pieces, too large and separate lift
 * stations merge into one and the graph claims links that do not exist.
 *
 * So it is measured rather than guessed. This builds the same resort at several
 * tolerances and prints what each one costs.
 *
 * The number that decides it is not the percentage of nodes kept. A graph that
 * keeps ninety per cent of one valley is worse than one that keeps seventy per
 * cent of three, because the resort a skier bought a pass for is the linked
 * area. So the ranking is: how many of the configured bases survive, then how
 * much vertical, then how many lifts. Everything is printed either way.
 *
 * Needs the OSM export already cached; it never touches the network.
 */
import { readFile, readdir } from "node:fs/promises";
import { build } from "./osm/graph.mjs";
import { prune, check } from "./osm/validate.mjs";
import { applyOperations, fillAreas } from "./osm/operations.mjs";
import { elevationFor } from "./osm/elevation.mjs";

const CONFIG_DIR = new URL("./resorts/", import.meta.url).pathname;
const CACHE = (id) => new URL(`../data/osm/${id}.json`, import.meta.url).pathname;

const args = process.argv.slice(2);
const value = (name, fallback) => {
  const found = args.find((a) => a.startsWith(`--${name}=`));
  return found ? found.slice(name.length + 3) : fallback;
};
const ids = args.filter((a) => !a.startsWith("--"));
const STEPS = value("steps", "30,45,60,75,90,110").split(",").map(Number);

async function tune(id) {
  const config = JSON.parse(await readFile(`${CONFIG_DIR}${id}.json`, "utf8"));
  let osm;
  try {
    osm = JSON.parse(await readFile(CACHE(id), "utf8"));
  } catch {
    // Not an error worth a stack trace: the commonest reason to run this is
    // right after adding a config, before anything has been fetched.
    throw new Error(`no cached export at data/osm/${id}.json — fetch it first`);
  }
  const elevation = await elevationFor(config.bbox, { offline: true });
  console.log(`\n${config.name} (${id})`);
  console.log("  tol   raw   kept  lifts   runs      km  valleys  vertical        pieces  usable");
  console.log("  ----  ----  ----  -----  -----  ------  -------  --------------  ------  ------");

  const rows = [];
  for (const tolerance of STEPS) {
    let row;
    try {
      // The same steps, in the same order, as build-resort.mjs. Without the
      // operations step there are no bases for `check` to test reachability
      // between — it called a nineteen-node fragment usable — and no areas to
      // count.
      let graph = build(osm, { tolerance, elevation });
      graph = fillAreas(applyOperations(graph, config), config);
      const pruned = prune(graph);
      const alts = Object.values(pruned.NODES).map((n) => n.alt);
      // Valleys, not base names: the config lists OSM spelling variants
      // ("Staffal" and "Stafal" are one place), so counting names overstates
      // the target and understates what survived. The number that matters is
      // how many separate areas a skier can still start a day in.
      const valleys = new Set(
        Object.values(pruned.NODES).filter((n) => n.base).map((n) => n.area)
      );
      const problems = check(pruned);
      row = {
        tolerance,
        raw: Object.keys(graph.NODES).length,
        kept: Object.keys(pruned.NODES).length,
        lifts: pruned.LIFTS.length,
        rawLifts: graph.LIFTS.length,
        runs: pruned.RUNS.length,
        rawRuns: graph.RUNS.length,
        // Kilometres, not run count. The count rises as the tolerance falls,
        // because pistes fragment into more and shorter edges — so it measures
        // fragmentation, not how much mountain survived. Length does not care
        // how the same piste is cut up.
        km: pruned.RUNS.reduce((sum, r) => sum + (r.km || 0), 0),
        valleys: valleys.size,
        low: alts.length ? Math.min(...alts) : 0,
        high: alts.length ? Math.max(...alts) : 0,
        pieces: pruned.report.pieces,
        problems,
      };
    } catch (error) {
      row = { tolerance, failed: error.message.split("\n")[0] };
    }
    rows.push(row);

    if (row.failed) {
      console.log(`  ${String(row.tolerance).padStart(4)}  ${row.failed}`);
      continue;
    }
    const span = `${row.low}-${row.high}m`;
    console.log(
      `  ${String(row.tolerance).padStart(4)}  ${String(row.raw).padStart(4)}  ` +
      `${String(row.kept).padStart(4)}  ${String(`${row.lifts}/${row.rawLifts}`).padStart(5)}  ` +
      `${String(`${row.runs}/${row.rawRuns}`).padStart(5)}  ${row.km.toFixed(1).padStart(6)}  ` +
      `${String(row.valleys).padStart(7)}  ` +
      `${span.padEnd(14)}  ${String(row.pieces).padStart(6)}  ` +
      (row.problems.length ? `no: ${row.problems[0].slice(0, 30)}` : "yes")
    );
  }

  const usable = rows.filter((r) => !r.failed && !r.problems.length);
  if (!usable.length) {
    console.log("\n  Nothing in that range produces a usable graph.");
    const best = rows.find((r) => !r.failed);
    if (best) console.log(`  Closest was ${best.tolerance}: ${best.problems?.[0] || "unknown"}`);
    return null;
  }

  /**
   * Valleys, then vertical, then lifts, then kilometres, then the smaller
   * tolerance — because merging two places that are not the same place is the
   * error that invents links, and an invented link is what strands someone.
   *
   * Two of those are compared loosely on purpose. Vertical is bucketed to
   * 25 m, because cluster centroids shift by a few metres as the tolerance
   * changes and three metres of noise was picking the tolerance for
   * Kronplatz. And one extra lift is not worth much, so anything within one
   * lift of the best counts as equal and the choice falls to kilometres: 110
   * bought Kronplatz a twentieth lift and cost it eleven kilometres of piste.
   */
  const mostLifts = Math.max(...usable.map((r) => r.lifts));
  const bucket = (r) => Math.round((r.high - r.low) / 25);
  const best = usable.reduce((a, b) => {
    if (a.valleys !== b.valleys) return a.valleys > b.valleys ? a : b;
    if (bucket(a) !== bucket(b)) return bucket(a) > bucket(b) ? a : b;
    const closeA = a.lifts >= mostLifts - 1;
    const closeB = b.lifts >= mostLifts - 1;
    if (closeA !== closeB) return closeA ? a : b;
    if (Math.abs(a.km - b.km) > 1) return a.km > b.km ? a : b;
    return a.tolerance < b.tolerance ? a : b;
  });

  console.log(`\n  Suggested: --tolerance=${best.tolerance}`);
  console.log(`    ${best.valleys} valley(s) you can start a day in, ` +
    `${best.high - best.low} m of vertical, ${best.lifts} lifts, ` +
    `${best.km.toFixed(0)} km over ${best.runs} runs`);
  if (best.tolerance !== (config.tolerance ?? 45)) {
    console.log(`    The config currently says ${config.tolerance ?? 45}.`);
  }
  return best;
}

const targets = ids.length
  ? ids
  : (await readdir(CONFIG_DIR)).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, ""));

let ran = 0;
for (const id of targets) {
  try {
    await tune(id);
    ran++;
  } catch (error) {
    console.log(`\n${id}: ${error.message.split("\n")[0]}`);
  }
}
if (!ran) {
  console.log("\nNothing to tune. Fetch a resort's data first: npm run resort -- <id>");
  process.exit(1);
}
