/**
 * Does the solver still feel instant on a real resort? Run: npm run bench:scale
 *
 * Every timing in the README comes from Monterosa: 12 lifts, 17 runs, 29
 * edges. Kronplatz is 32 lifts and ~120 pistes, which after splitting at
 * junctions is several hundred. Refine re-solves on every chip tap, so if cost
 * grew with the graph the interaction the product depends on would break on
 * the first real dataset.
 *
 * The mountains here are synthetic, so the absolute numbers mean little: a
 * real graph branches differently and more walks survive, which costs more per
 * sample. What the shape of the results shows is the thing worth knowing, and
 * it matches the algorithm: the sampler runs a fixed number of walks of a fixed
 * maximum length, so its cost is set by those constants rather than by how much
 * mountain there is. Only the adjacency build and the Dijkstra grow with size,
 * and both are cheap.
 */
import { solve, asGraph } from "../src/solver.js";

/** A connected mountain: `valleys` bases, each a chain of `levels` stations. */
function mountain(valleys, levels) {
  const NODES = {};
  const LIFTS = [];
  const RUNS = [];
  for (let v = 0; v < valleys; v++) {
    for (let l = 0; l < levels; l++) {
      const key = `v${v}l${l}`;
      NODES[key] = {
        name: `Station ${v}-${l}`,
        lat: 46.7 + v * 0.01 + l * 0.004,
        lon: 11.9 + v * 0.012,
        alt: 1000 + l * 260,
        area: `Valley ${v}`,
        base: l === 0,
        rifugio: l === 1,
      };
      if (l > 0) {
        LIFTS.push([`v${v}l${l - 1}`, `v${v}l${l}`, `Lift ${v}-${l}`, "chair", 6, 960, 4]);
        // Two ways down each pitch, at different grades.
        RUNS.push([`v${v}l${l}`, `v${v}l${l - 1}`, `Blue ${v}-${l}`, "blue", 2.2, 6]);
        RUNS.push([`v${v}l${l}`, `v${v}l${l - 1}`, `Red ${v}-${l}`, "red", 1.8, 5]);
      }
    }
    // A high link to the next valley, both ways, as a real linked area has.
    if (v > 0) {
      const top = levels - 1;
      RUNS.push([`v${v}l${top}`, `v${v - 1}l${top - 1}`, `Link ${v}`, "red", 3.1, 8]);
      RUNS.push([`v${v - 1}l${top}`, `v${v}l${top - 1}`, `Link ${v} back`, "red", 3.0, 8]);
    }
  }
  const buildEdges = () => {
    const edges = [];
    LIFTS.forEach(([from, to, name, liftType, ride, lastUp, queue], i) =>
      edges.push({ id: `L${i}`, kind: "lift", from, to, name, liftType, ride, lastUp, queue,
        min: ride + queue, gain: NODES[to].alt - NODES[from].alt }));
    RUNS.forEach(([from, to, name, difficulty, km, min], i) =>
      edges.push({ id: `R${i}`, kind: "run", from, to, name, difficulty, km, min,
        drop: NODES[from].alt - NODES[to].alt }));
    return edges;
  };
  return { graph: asGraph({ NODES, SHORT_NAMES: {}, buildEdges }), lifts: LIFTS.length, runs: RUNS.length };
}

const CASES = [
  ["Monterosa-sized", 3, 4],
  ["Kronplatz-sized", 6, 7],
  ["a big linked area", 12, 8],
  ["Dolomiti Superski", 30, 10],
];

const RUNS_PER = 7;
console.log("\n  scenario              lifts   runs  edges  budget     p50      p95  routes");
for (const [name, valleys, levels] of CASES) {
  const { graph, lifts, runs } = mountain(valleys, levels);
  // Find a budget this mountain can actually fill. A budget it cannot fill is
  // rejected early, and timing that measures the rejection rather than the
  // search: the first version of this benchmark reported 14ms and zero routes.
  let budget = 0;
  for (const b of [420, 360, 300, 240, 180, 120, 90, 60]) {
    if (solve({ start: "v0l0", finish: "v0l0", ability: "black", budget: b, startClock: 540, count: 3, graph }).length) {
      budget = b;
      break;
    }
  }
  if (!budget) { console.log(`  ${name.padEnd(20)} no budget produced a route; fixture, not solver`); continue; }
  const opts = { start: "v0l0", finish: "v0l0", ability: "black", budget, startClock: 540, count: 3, graph };
  const times = [];
  let found = 0;
  for (let i = 0; i < RUNS_PER; i++) {
    const t = performance.now();
    const r = solve(opts);
    times.push(performance.now() - t);
    found = r.length;
  }
  times.sort((a, b) => a - b);
  const p50 = times[Math.floor(times.length / 2)];
  const p95 = times[Math.min(times.length - 1, Math.floor(times.length * 0.95))];
  console.log(
    `  ${name.padEnd(20)} ${String(lifts).padStart(5)} ${String(runs).padStart(6)} ${String(graph.EDGES.length).padStart(6)}` +
    ` ${String(budget).padStart(6)} ${p50.toFixed(0).padStart(6)}ms ${p95.toFixed(0).padStart(6)}ms ${String(found).padStart(7)}`
  );
}
console.log("\n  A phone is 2-4x slower. Refine re-solves on every tap.\n");
