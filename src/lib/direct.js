/**
 * Getting from A to B, as fast as the mountain allows.
 *
 * This is a different question from the one solver.js answers. That one plans
 * a day: given a time budget, find the best closed walk that fills it. This
 * one is the opposite — you are stranded at a col, or a friend is at Crest and
 * you want to be there, and the only thing that matters is arriving.
 *
 * So it is a plain Dijkstra rather than sampling, and it lives here rather
 * than in the solver, which stays what it is.
 *
 * The same hard constraints apply: nothing above your ability, nothing that
 * boards a lift after it has shut, and no drags if you have said so.
 */
import { NODES, DIFFICULTY_RANK, buildEdges } from "../resort.js";
import { measure } from "../solver.js";

const EDGES = buildEdges();

function allowed(edge, opts) {
  if (edge.kind === "run") {
    return DIFFICULTY_RANK[edge.difficulty] <= DIFFICULTY_RANK[opts.ability];
  }
  if (opts.noDrags && edge.liftType === "drag") return false;
  return true;
}

/**
 * Fastest legal path from `start` to `finish`.
 *
 * Cost is minutes, and the lift-hours constraint depends on when you get
 * there, so the arrival clock is carried through the search rather than
 * checked afterwards: a lift you could have caught at 15:40 is no use if this
 * path only reaches it at 16:10.
 *
 * @param {object} opts
 * @param {string} opts.start
 * @param {string} opts.finish
 * @param {'blue'|'red'|'black'} opts.ability
 * @param {number} opts.startClock  minute of day you set off
 * @param {boolean} [opts.noDrags]
 * @returns {null | object}  a measured route, or null if there is no way
 */
export function directRoute(opts) {
  if (opts.start === opts.finish) return null;

  const adj = {};
  for (const key in NODES) adj[key] = [];
  for (const edge of EDGES) if (allowed(edge, opts)) adj[edge.from].push(edge);

  const best = {};       // node -> minutes from start
  const via = {};        // node -> the edge taken to reach it
  for (const key in NODES) best[key] = Infinity;
  best[opts.start] = 0;

  const queue = [[0, opts.start]];
  while (queue.length) {
    queue.sort((a, b) => a[0] - b[0]);
    const [elapsed, node] = queue.shift();
    if (elapsed > best[node]) continue;
    if (node === opts.finish) break;

    for (const edge of adj[node]) {
      // A lift you reach after its last departure is not an option.
      if (edge.kind === "lift" && opts.startClock + elapsed > edge.lastUp) continue;
      const next = elapsed + edge.min;
      if (next < best[edge.to]) {
        best[edge.to] = next;
        via[edge.to] = edge;
        queue.push([next, edge.to]);
      }
    }
  }

  if (best[opts.finish] === Infinity) return null;

  const segments = [];
  let node = opts.finish;
  let guard = 0;
  while (node !== opts.start && guard++ < 80) {
    const edge = via[node];
    if (!edge) return null;
    segments.unshift(edge);
    node = edge.from;
  }
  if (node !== opts.start) return null;

  return {
    ...measure({ segments, minutes: best[opts.finish] }),
    label: "Straight there",
    title: `To ${NODES[opts.finish].name}`,
    direct: true,
  };
}
