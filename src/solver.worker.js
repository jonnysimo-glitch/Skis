/**
 * The solver off the main thread.
 *
 * Measured (npm run bench): 89ms p95 on a laptop for a full day, so roughly
 * 200-300ms on a phone. Refine chips re-solve on every tap and refine is
 * make-or-break — a quarter-second of dropped frames per tap is exactly the
 * "feels slow" failure the brief warns about. So it runs here.
 *
 * The solver imports nothing but its own graph, which is what makes this a
 * three-line file. Keep it that way.
 */
import { solve } from "./solver.js";

self.onmessage = (event) => {
  const { id, opts } = event.data;
  const started = performance.now();
  try {
    const routes = solve(opts);
    self.postMessage({ id, routes, ms: Math.round(performance.now() - started) });
  } catch (error) {
    self.postMessage({ id, error: String(error?.message || error) });
  }
};
