/**
 * Making the graph safe to route on.
 *
 * The app's promise is that nothing it plans will strand you. That promise is
 * only keepable if the graph itself cannot strand you, so this does not merely
 * check connectivity, it enforces it: anything outside the largest strongly
 * connected component is removed before the graph is ever written.
 *
 * Strongly connected, not merely connected. A piste you can ski down but never
 * climb back from is exactly the trap the app exists to prevent, and it looks
 * perfectly fine to an undirected connectivity check.
 *
 * What gets dropped is reported rather than silently discarded. A resort that
 * loses forty per cent of its pistes to this is telling you the OSM data is
 * poorly connected and the tolerance needs looking at, not that the resort is
 * small.
 */

/** Tarjan's algorithm, iterative: alpine graphs are small but recursion is avoidable. */
function stronglyConnected(nodeKeys, edges) {
  const adj = new Map(nodeKeys.map((k) => [k, []]));
  for (const e of edges) adj.get(e.from)?.push(e.to);

  const index = new Map();
  const low = new Map();
  const onStack = new Set();
  const stack = [];
  const components = [];
  let counter = 0;

  for (const root of nodeKeys) {
    if (index.has(root)) continue;
    const work = [[root, 0]];
    while (work.length) {
      const frame = work[work.length - 1];
      const [node, childIndex] = frame;

      if (childIndex === 0) {
        index.set(node, counter);
        low.set(node, counter);
        counter++;
        stack.push(node);
        onStack.add(node);
      }

      const children = adj.get(node) || [];
      if (childIndex < children.length) {
        frame[1]++;
        const next = children[childIndex];
        if (!index.has(next)) work.push([next, 0]);
        else if (onStack.has(next)) low.set(node, Math.min(low.get(node), index.get(next)));
        continue;
      }

      if (low.get(node) === index.get(node)) {
        const component = [];
        let popped;
        do {
          popped = stack.pop();
          onStack.delete(popped);
          component.push(popped);
        } while (popped !== node);
        components.push(component);
      }

      work.pop();
      if (work.length) {
        const parent = work[work.length - 1][0];
        low.set(parent, Math.min(low.get(parent), low.get(node)));
      }
    }
  }

  return components;
}

/**
 * Prune to the largest strongly connected component and report what that cost.
 *
 * @returns {{ NODES, LIFTS, RUNS, report }}
 */
/**
 * Pieces of the mountain that are not joined by any edge at all, in either
 * direction.
 *
 * This is a different fault from the strongly connected one below, and needs a
 * different fix. Undirected pieces mean the data does not physically join up:
 * a lift that stops short of the piste it serves, a valley whose lower slopes
 * were clipped by the bounding box, endpoints further apart than the stitching
 * tolerance. More strongly connected components than undirected pieces means
 * the opposite — the mountain does join up and you cannot get back, which is a
 * missing or one-way lift.
 *
 * Reported rather than acted on, because telling the two apart is the first
 * thing anyone looking at a disappointing graph needs to know.
 */
function undirectedPieces(keys, edges) {
  const adj = {};
  for (const key of keys) adj[key] = [];
  for (const e of edges) {
    if (!adj[e.from] || !adj[e.to]) continue;
    adj[e.from].push(e.to);
    adj[e.to].push(e.from);
  }
  const seen = new Set();
  const pieces = [];
  for (const key of keys) {
    if (seen.has(key)) continue;
    const stack = [key];
    const piece = [];
    seen.add(key);
    while (stack.length) {
      const at = stack.pop();
      piece.push(at);
      for (const next of adj[at]) if (!seen.has(next)) { seen.add(next); stack.push(next); }
    }
    pieces.push(piece);
  }
  return pieces.sort((a, b) => b.length - a.length);
}

export function prune({ NODES, LIFTS, RUNS, PLACES = [], report = {} }) {
  const keys = Object.keys(NODES);
  const edges = [...LIFTS, ...RUNS];
  const pieces = undirectedPieces(keys, edges);
  const components = stronglyConnected(keys, edges);
  components.sort((a, b) => b.length - a.length);
  const keep = new Set(components[0] || []);

  const keptNodes = {};
  for (const key of keys) if (keep.has(key)) keptNodes[key] = NODES[key];
  const keptLifts = LIFTS.filter((e) => keep.has(e.from) && keep.has(e.to));
  const keptRuns = RUNS.filter((e) => keep.has(e.from) && keep.has(e.to));

  return {
    NODES: keptNodes,
    LIFTS: keptLifts,
    RUNS: keptRuns,
    // Untouched: a hut is not part of the connectivity argument. It is
    // narrowed against the nodes that survived, in emit().
    PLACES,
    report: {
      ...report,
      components: components.length,
      pieces: pieces.length,
      largestPiece: pieces[0]?.length ?? 0,
      strandedOnly: (pieces[0]?.length ?? 0) - Object.keys(keptNodes).length,
      nodesKept: Object.keys(keptNodes).length,
      nodesDropped: keys.length - Object.keys(keptNodes).length,
      liftsKept: keptLifts.length,
      liftsDropped: LIFTS.length - keptLifts.length,
      runsKept: keptRuns.length,
      runsDropped: RUNS.length - keptRuns.length,
    },
  };
}

/**
 * Everything that has to be true before a graph is allowed to reach a skier.
 *
 * Returns problems rather than throwing, so the build can print all of them at
 * once instead of one per run.
 */
export function check({ NODES, LIFTS, RUNS }) {
  const problems = [];
  const keys = Object.keys(NODES);

  if (keys.length < 4) problems.push(`only ${keys.length} nodes; that is not a resort`);
  if (!LIFTS.length) problems.push("no lifts survived pruning");
  if (!RUNS.length) problems.push("no runs survived pruning");

  for (const [key, node] of Object.entries(NODES)) {
    if (!Number.isFinite(node.alt)) problems.push(`${key} has no altitude`);
    if (node.alt < -500 || node.alt > 5000) problems.push(`${key} altitude ${node.alt} m is not alpine`);
    if (!Number.isFinite(node.lat) || !Number.isFinite(node.lon)) problems.push(`${key} has no position`);
  }

  for (const lift of LIFTS) {
    if (NODES[lift.to].alt < NODES[lift.from].alt) {
      problems.push(`lift "${lift.name}" goes downhill, ${lift.from} to ${lift.to}`);
    }
    if (!(lift.minutes > 0)) problems.push(`lift "${lift.name}" takes no time`);
  }

  for (const run of RUNS) {
    if (NODES[run.to].alt > NODES[run.from].alt) {
      problems.push(`run "${run.name}" goes uphill, ${run.from} to ${run.to}`);
    }
    if (!(run.minutes > 0)) problems.push(`run "${run.name}" takes no time`);
    if (!["blue", "red", "black"].includes(run.difficulty)) {
      problems.push(`run "${run.name}" has difficulty "${run.difficulty}"`);
    }
  }

  // Every base has to be able to reach every other base and come home, or the
  // cross-valley planning the app is for silently does not work.
  const bases = keys.filter((k) => NODES[k].base);
  // And there has to be one. With none, `defaultBase` falls back to whichever
  // node happens to be first, so the app opens a day at some mid-mountain
  // junction instead of a car park — and "your car is at Champoluc" is the
  // problem this whole thing exists to solve. A stitching tolerance that
  // fragments the valleys leaves exactly this: a plausible graph with no way
  // in or out of it.
  if (!bases.length) {
    problems.push("no base survived pruning; there is nowhere to start or finish a day");
  }
  if (bases.length) {
    const adj = new Map(keys.map((k) => [k, []]));
    for (const e of [...LIFTS, ...RUNS]) adj.get(e.from).push(e.to);
    const reach = (start) => {
      const seen = new Set([start]);
      const queue = [start];
      while (queue.length) {
        for (const next of adj.get(queue.shift())) if (!seen.has(next)) { seen.add(next); queue.push(next); }
      }
      return seen;
    };
    for (const from of bases) {
      const reachable = reach(from);
      for (const to of bases) {
        if (from !== to && !reachable.has(to)) problems.push(`${from} cannot reach ${to}`);
      }
    }
  }

  return problems;
}
