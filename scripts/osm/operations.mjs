/**
 * Everything that turns a raw OSM graph into a resort.
 *
 * Lift hours, queues, which valley stations count as bases and which area each
 * place belongs to are not in OpenStreetMap and never will be: they are
 * operational and editorial facts, which is also why resorts are the customer.
 * They come from scripts/resorts/<id>.json.
 *
 * This lives apart from build-resort.mjs so that anything measuring a graph
 * measures the same graph the build produces. The tolerance tuner skipped this
 * step and its numbers were wrong in two ways as a result: `check` never saw a
 * base, so it called a nineteen-node fragment usable, and there were no areas
 * to count, so it could not say how many valleys you could start a day in.
 */

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
  //
  // One name can match several nodes. OSM names a lift station, a car park and
  // a hamlet the same thing, and stitching only merges them if they fall
  // within the tolerance of each other — Monterosa came out with two separate
  // "Stafal" bases twenty metres apart in altitude, which in the app is two
  // identical choices in the base picker. So each configured name marks one
  // node: the busiest, since a base is where lifts start, and the lowest of
  // those if they tie, since that is where the road reaches.
  const wanted = new Set(config.bases || []);
  const NODES = { ...graph.NODES };

  const degree = {};
  for (const edge of [...graph.LIFTS, ...graph.RUNS]) {
    degree[edge.from] = (degree[edge.from] || 0) + 1;
    degree[edge.to] = (degree[edge.to] || 0) + 1;
  }
  const candidates = new Map(); // matched name -> node keys
  for (const [key, node] of Object.entries(NODES)) {
    const match = wanted.has(node.name) ? node.name : wanted.has(key) ? key : null;
    if (!match) continue;
    if (!candidates.has(match)) candidates.set(match, []);
    candidates.get(match).push(key);
  }

  const chosen = new Set();
  for (const keys of candidates.values()) {
    chosen.add(keys.reduce((best, key) => {
      const d = degree[key] || 0;
      const bestD = degree[best] || 0;
      if (d !== bestD) return d > bestD ? key : best;
      return NODES[key].alt < NODES[best].alt ? key : best;
    }));
  }

  let bases = 0;
  const duplicateBases = [...candidates.values()].reduce((n, keys) => n + keys.length - 1, 0);
  for (const [key, node] of Object.entries(NODES)) {
    if (chosen.has(key)) {
      NODES[key] = { ...node, base: true, area: config.areas?.[node.name] ?? node.area };
      bases++;
    } else if (config.areas?.[node.name]) {
      NODES[key] = { ...node, area: config.areas[node.name] };
    }
  }

  return { ...graph, NODES, LIFTS, report: { ...graph.report, liftHoursMatched: matched, bases, duplicateBases } };
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

export { applyOperations, fillAreas };
