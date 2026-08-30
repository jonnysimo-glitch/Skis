/**
 * How long does one solve actually take?
 *
 * The brief says to move the solver to a worker only if it blocks the UI, and
 * to measure first. Refine chips re-solve in place on every tap, so the number
 * that matters is the p95 of a single solve, not the average.
 */
import { solve } from "../src/solver.js";

const cases = [
  ["full day, red", { start: "staffal", finish: "staffal", ability: "red", budget: 405, startClock: 555 }],
  ["full day, black", { start: "staffal", finish: "staffal", ability: "black", budget: 405, startClock: 555 }],
  ["blue only", { start: "staffal", finish: "staffal", ability: "blue", budget: 405, startClock: 555 }],
  ["2pm, 90 min, cross-valley", { start: "salati", finish: "champoluc", ability: "red", budget: 90, startClock: 840 }],
  ["six options", { start: "staffal", finish: "staffal", ability: "black", budget: 405, startClock: 555, count: 6 }],
];

console.log("\n  solve() timings — 20 runs each\n");
let worst = 0;
for (const [name, opts] of cases) {
  const times = [];
  for (let i = 0; i < 20; i++) {
    const t = performance.now();
    solve(opts);
    times.push(performance.now() - t);
  }
  times.sort((a, b) => a - b);
  const p50 = times[10];
  const p95 = times[19];
  worst = Math.max(worst, p95);
  console.log(`  ${name.padEnd(28)} p50 ${p50.toFixed(0).padStart(4)}ms   p95 ${p95.toFixed(0).padStart(4)}ms`);
}
console.log(
  `\n  worst p95: ${worst.toFixed(0)}ms on this machine.\n` +
  `  A phone is roughly 2-4x slower, so budget ${(worst * 3).toFixed(0)}ms.\n` +
  `  Anything over ~50ms drops frames on a chip tap — hence the worker.\n`
);
