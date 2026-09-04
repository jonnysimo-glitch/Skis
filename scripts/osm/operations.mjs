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
  const wanted = config.bases || [];
  const NODES = { ...graph.NODES };

  const degree = {};
  for (const edge of [...graph.LIFTS, ...graph.RUNS]) {
    degree[edge.from] = (degree[edge.from] || 0) + 1;
    degree[edge.to] = (degree[edge.to] || 0) + 1;
  }

  /**
   * Matching a configured base name to a node.
   *
   * Exact equality was too strict to be useful. OSM does not name a valley
   * station after the village: Kronplatz's Olang base is a node called "Olang
   * I - Valdaora I", so a config asking for "Olang" matched nothing and the
   * whole resort came out with nowhere to start. The place name is in there,
   * as a word, and often it is in the name of the lift rather than the node —
   * which is why lift names count too.
   *
   * As a word, not a substring: "Ried" must not match "Friedrichshof".
   * Diacritics and case are ignored, because "Gressoney-La-Trinité" is written
   * four ways across a mountain.
   */
  const fold = (text) =>
    String(text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const mentions = (haystack, needle) => {
    const h = fold(haystack);
    const nd = fold(needle);
    if (!h || !nd) return false;
    const at = h.indexOf(nd);
    if (at < 0) return false;
    const before = at === 0 ? "" : h[at - 1];
    const after = h[at + nd.length] || "";
    return !/[a-z0-9]/.test(before) && !/[a-z0-9]/.test(after);
  };

  // The name of every lift that starts at a node, so a station named only by
  // its lift is still findable.
  const liftNamesAt = {};
  for (const lift of graph.LIFTS) {
    (liftNamesAt[lift.from] ||= []).push(lift.name);
    (liftNamesAt[lift.to] ||= []).push(lift.name);
  }

  /**
   * A base is in the valley. Restricting candidates to the lower part of the
   * resort's own range keeps "Olang" from marking the 2066 m mid-station of
   * the Olang II lift as somewhere you could park a car.
   */
  const alts = Object.values(NODES).map((n) => n.alt).filter(Number.isFinite);
  const floor = alts.length ? Math.min(...alts) : 0;
  const ceiling = alts.length ? Math.max(...alts) : 0;
  const valleyBelow = floor + (ceiling - floor) * 0.35;

  const candidates = new Map(); // configured name -> node keys
  for (const [key, node] of Object.entries(NODES)) {
    for (const name of wanted) {
      const named = key === name || mentions(node.name, name);
      const byLift = !named && (liftNamesAt[key] || []).some((l) => mentions(l, name));
      if (!named && !byLift) continue;
      // An exact node-key match is explicit and trusted; anything inferred
      // from a name has to be somewhere you could actually drive to.
      if (key !== name && !(Number.isFinite(node.alt) && node.alt <= valleyBelow)) continue;
      if (!candidates.has(name)) candidates.set(name, []);
      candidates.get(name).push(key);
    }
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
  let renamedBases = 0;
  const duplicateBases = [...candidates.values()].reduce((n, keys) => n + keys.length - 1, 0);
  // Which configured name picked each chosen node, so an unnamed one can take it.
  const chosenBy = new Map();
  for (const [name, keys] of candidates) {
    for (const key of keys) if (chosen.has(key) && !chosenBy.has(key)) chosenBy.set(key, name);
  }
  const generated = (name) => /^Point \d+$/.test(String(name || ""));

  for (const [key, node] of Object.entries(NODES)) {
    if (chosen.has(key)) {
      // A base matched through a lift's name often has no name of its own:
      // Monterosa's Alagna gondola station is just a way endpoint, so the app
      // opened its default day at "Point 31". The configured name that found
      // it is the right name for it, and the one a skier would use.
      const name = generated(node.name) ? chosenBy.get(key) ?? node.name : node.name;
      if (name !== node.name) renamedBases++;
      NODES[key] = {
        ...node,
        name,
        base: true,
        area: config.areas?.[name] ?? config.areas?.[node.name] ?? node.area,
      };
      bases++;
    } else if (config.areas?.[node.name]) {
      NODES[key] = { ...node, area: config.areas[node.name] };
    }
  }

  return { ...graph, NODES, LIFTS, report: { ...graph.report, liftHoursMatched: matched, bases, duplicateBases, renamedBases } };
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
