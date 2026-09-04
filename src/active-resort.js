/**
 * The graph of whichever resort is currently selected.
 *
 * Thirteen modules — App, eight screens, geo, plan, progress and direct —
 * imported `NODES` straight from `resort.js`, which was correct while there
 * was one mountain. This module keeps that shape: it re-exports the same names
 * with the same meanings, so those modules change an import path and nothing
 * else, and it swaps what they point at when the resort changes.
 *
 * These are `let` exports on purpose. An ES module binding is live, so a
 * consumer that did `import { NODES } from "./active-resort.js"` sees the new
 * object the moment `setActiveResort` reassigns it — no plumbing, no context,
 * no state library, which the working agreements ask us not to reach for until
 * something hurts.
 *
 * What that costs, stated plainly: it is mutable module state, and any value
 * *derived* at module load — `const EDGES = buildEdges()` at the top of a file
 * — would freeze the first resort's data and silently never update. The rule
 * is therefore: read these inside a function, a component body or a memo, and
 * never at module scope. `npm test` asserts the swap actually reaches an
 * importer, and src/active-resort.test.js explains why.
 *
 * There is exactly one writer, `App.jsx`, and it calls this before the state
 * update that re-renders the tree, so a render never straddles two mountains.
 */
import * as builtIn from "./resort.js";
import { projectorFor } from "./lib/projector.js";

/**
 * Monterosa from `resort.js` is the built-in. It predates the OSM pipeline and
 * is still what the app opens on, so it is the default rather than a special
 * case to be handled.
 */
export const BUILT_IN_ID = "monterosa";

let current = { id: BUILT_IN_ID, module: builtIn };

export let NODES = builtIn.NODES;
export let LIFTS = builtIn.LIFTS;
export let RUNS = builtIn.RUNS;
export let SHORT_NAMES = builtIn.SHORT_NAMES;
export let DIFFICULTY_RANK = builtIn.DIFFICULTY_RANK;
export let buildEdges = builtIn.buildEdges;

/** Which resort these bindings currently describe. */
export const activeResortId = () => current.id;

/**
 * Point every binding at another resort's module.
 *
 * Returns the id that is now active, which is the caller's confirmation: a
 * module that turns out to be missing an export leaves the previous resort in
 * place rather than half-swapping, because a graph with no runs and the last
 * resort's nodes would route someone into terrain that is not there.
 */
export function setActiveResort(id, module) {
  if (!module) throw new Error(`No graph module for resort "${id}"`);
  for (const name of ["NODES", "LIFTS", "RUNS", "DIFFICULTY_RANK", "buildEdges"]) {
    if (!module[name]) throw new Error(`Resort "${id}" is missing ${name}`);
  }

  current = { id, module };
  NODES = module.NODES;
  LIFTS = module.LIFTS;
  RUNS = module.RUNS;
  // A generated module has no short names of its own unless its config gave it
  // some, and an empty object is the honest answer there.
  SHORT_NAMES = module.SHORT_NAMES || {};
  DIFFICULTY_RANK = module.DIFFICULTY_RANK;
  buildEdges = module.buildEdges;
  return current.id;
}

/**
 * The graph as plain data, for the solver.
 *
 * `solve()` reads only NODES, EDGES and SHORT_NAMES, all of which survive
 * structuredClone — which is what lets the whole graph be posted to the worker
 * rather than the worker importing one mountain at build time.
 */
export function activeGraph() {
  return { NODES, SHORT_NAMES, EDGES: buildEdges() };
}

/** The 3D layer wants a thunk, and every resort's is the same maths. */
export const activeProjector = () => projectorFor(NODES);
