/**
 * Writing a resort module.
 *
 * The output is the same shape src/resort.js already has, so the solver, the
 * map layer and the offline cache all read it without knowing where it came
 * from. The difference is the provenance header: a generated file says when it
 * was built, from what, and what had to be assumed, because the failure mode
 * this whole pipeline exists to prevent is data that looks authoritative and
 * is not.
 */

const pad = (text, width) => String(text).padEnd(width);
const quote = (text) => JSON.stringify(text);

/**
 * The registry entry for a resort, derived from its own graph.
 *
 * Everything the selection panel, the map camera and the offline tile warmer
 * read has to come from somewhere, and hand-typing it per resort is the manual
 * step this pipeline exists to remove. So it is computed here, at build time,
 * from the graph and the config — and every number below says where it came
 * from.
 */
function registryEntry({ id, config, NODES, LIFTS, RUNS }) {
  const nodes = Object.values(NODES);
  const lats = nodes.map((n) => n.lat);
  const lons = nodes.map((n) => n.lon);
  const alts = nodes.map((n) => n.alt);
  const lat0 = (Math.min(...lats) + Math.max(...lats)) / 2;
  const lon0 = (Math.min(...lons) + Math.max(...lons)) / 2;

  // The governing span is the wider of the two once longitude is corrected for
  // latitude, because that is the dimension that has to fit on screen.
  const span = Math.max(
    Math.max(...lats) - Math.min(...lats),
    (Math.max(...lons) - Math.min(...lons)) * Math.cos((lat0 * Math.PI) / 180)
  );
  // Calibrated against Monterosa, whose 11.6 was set by eye to frame the
  // mountain with a little room around it: this formula returns 11.61 for it.
  // Clamped because a one-lift resort should not open zoomed into a lift
  // station and a linked-valley giant should not open from orbit.
  const zoom = Math.round(Math.min(13.5, Math.max(9.5, Math.log2(360 / span) + 0.35)) * 10) / 10;

  const baseKeys = Object.keys(NODES).filter((k) => NODES[k].base);
  const lowestBase = baseKeys.length
    ? baseKeys.reduce((a, b) => (NODES[b].alt < NODES[a].alt ? b : a))
    : null;
  // The config names the base the app should open on, because which valley
  // that is cannot be derived: it is the one a skier would drive to, not the
  // lowest or the biggest. Matched on name so it survives a graph rebuild
  // renumbering the keys, and falling back to the lowest base if the named one
  // did not survive the connectivity prune.
  // Matched the way base names are matched, not by exact equality: the config
  // asks for "Staffal" and OSM writes "Stafal", so an exact test found nothing
  // and the app opened its default day at whichever base happened to be
  // lowest — which was an unnamed way endpoint.
  const fold = (t) => String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const sameish = (a, b) => {
    const x = fold(a);
    const y = fold(b);
    return Boolean(x && y) && (x === y || x.includes(y) || y.includes(x));
  };
  const namedBase = config.defaultBase
    ? baseKeys.find((k) => sameish(NODES[k].name, config.defaultBase))
    : null;
  const highest = Object.keys(NODES).reduce((a, b) => (NODES[b].alt > NODES[a].alt ? b : a));

  // Look from the valley you would park in towards the high point, so the day
  // opens facing up the mountain. This is NOT what Monterosa's hand-set -24
  // does — the derivation gives -52 there — so that entry keeps its own value
  // and a config may override this one. It is derived rather than invented,
  // which is the rule that matters.
  let bearing = 0;
  if (lowestBase && lowestBase !== highest) {
    const a = NODES[lowestBase];
    const b = NODES[highest];
    const dLon = (b.lon - a.lon) * Math.cos((((a.lat + b.lat) / 2) * Math.PI) / 180);
    bearing = Math.round((Math.atan2(dLon, b.lat - a.lat) * 180) / Math.PI);
  }

  const areas = new Set(baseKeys.map((k) => NODES[k].area).filter(Boolean));

  return {
    id,
    name: config.name,
    region: config.region,
    country: config.country,
    available: true,
    center: [Math.round(lon0 * 1e5) / 1e5, Math.round(lat0 * 1e5) / 1e5],
    zoom,
    pitch: config.camera?.pitch ?? 62,
    bearing: config.camera?.bearing ?? bearing,
    bbox: config.bbox,
    bases: baseKeys,
    defaultBase: namedBase ?? lowestBase ?? Object.keys(NODES)[0],
    firstLift: config.firstLift,
    lastDown: config.lastDown,
    stats: {
      lifts: LIFTS.length,
      runs: RUNS.length,
      top: Math.max(...alts),
      bottom: Math.min(...alts),
      valleys: areas.size || 1,
    },
    blurb: config.note ?? null,
    /**
     * What the resort itself publishes, where the config records it, so the
     * app can say how much of the mountain it actually holds. A planner
     * quietly missing thirteen of thirty-two lifts will tell a skier there is
     * no way across when there is, and that is the failure this whole pipeline
     * exists to prevent.
     */
    published: config.published ?? null,
  };
}

export function emit({ id, meta, NODES, LIFTS, RUNS, report, fetchedAt }) {
  const nodeKeys = Object.keys(NODES);
  const keyWidth = Math.max(...nodeKeys.map((k) => k.length)) + 2;
  const nameWidth = Math.max(...nodeKeys.map((k) => quote(NODES[k].name).length)) + 1;

  const nodeLines = nodeKeys.map((key) => {
    const n = NODES[key];
    const extras = [
      n.area ? `area: ${quote(n.area)}` : null,
      n.base ? "base: true" : null,
      n.rifugio ? "rifugio: true" : null,
    ].filter(Boolean);
    return `  ${pad(key + ":", keyWidth)}{ name: ${pad(quote(n.name) + ",", nameWidth)} ` +
      `lat: ${n.lat.toFixed(5)}, lon: ${n.lon.toFixed(5)}, alt: ${n.alt}` +
      (extras.length ? `, ${extras.join(", ")}` : "") + " },";
  });

  const liftLines = LIFTS.map((l) =>
    `  [${quote(l.from)}, ${quote(l.to)}, ${quote(l.name)}, ${quote(l.kind)}, ` +
    `${l.minutes}, ${l.lastUp}, ${l.queue}],`
  );

  const runLines = RUNS.map((r) =>
    `  [${quote(r.from)}, ${quote(r.to)}, ${quote(r.name)}, ${quote(r.difficulty)}, ` +
    `${r.km}, ${r.minutes}],`
  );

  const assumed = [
    report.difficultyAssumed
      ? `${report.difficultyAssumed} piste${report.difficultyAssumed === 1 ? "" : "s"} had no ` +
        `piste:difficulty and were taken as red`
      : null,
    report.unnamedRuns
      ? `${report.unnamedRuns} run${report.unnamedRuns === 1 ? "" : "s"} were unnamed and are ` +
        `described by their endpoints`
      : null,
    report.geometryHoles
      ? `${report.geometryHoles} vertices across ${report.waysWithHoles} ` +
        `way${report.waysWithHoles === 1 ? "" : "s"} came back from Overpass unresolved; those ` +
        `ways are measured straight across the gap and so read slightly short`
      : null,
    `${report.nodesDropped} node${report.nodesDropped === 1 ? "" : "s"}, ` +
      `${report.liftsDropped} lift${report.liftsDropped === 1 ? "" : "s"} and ` +
      `${report.runsDropped} run${report.runsDropped === 1 ? "" : "s"} were outside the largest ` +
      `strongly connected component and were dropped`,
    `endpoints within ${report.tolerance} m of each other were treated as the same place`,
  ].filter(Boolean);

  return `/**
 * ${meta.name} — resort graph.
 *
 * GENERATED. Do not edit by hand: run \`npm run resort -- ${id}\` instead.
 *
 * Source:    OpenStreetMap via the Overpass API, ${fetchedAt || "date unrecorded"}
 * Elevation: AWS Terrain Tiles (terrarium), zoom 13
 * Licence:   OSM data is ODbL. Attribution is required wherever this is shown.
 *
 * What had to be assumed:
${assumed.map((line) => ` *   - ${line}`).join("\n")}
 *
 * NOT from OpenStreetMap, because it is not in there: last-lift times and
 * queue estimates. Those come from the resort and are the numbers behind the
 * app's promise that nothing will strand you, so they are listed separately in
 * scripts/resorts/${id}.json rather than buried in the graph.
 *
 * Node coordinates are [lat, lon]. They exist so the 3D layer can place the
 * graph on real terrain; the solver itself never reads them.
 */

export const NODES = {
${nodeLines.join("\n")}
};

/** [from, to, name, type, rideMinutes, lastUpMinuteOfDay, typicalQueueMinutes] */
export const LIFTS = [
${liftLines.join("\n")}
];

/** [from, to, name, difficulty, km, minutes] */
export const RUNS = [
${runLines.join("\n")}
];

export const DIFFICULTY_RANK = { blue: 1, red: 2, black: 3 };

export const SHORT_NAMES = ${JSON.stringify(meta.shortNames || {}, null, 2)};

/**
 * How the app lists and frames this resort. Derived from the graph above and
 * scripts/resorts/${id}.json at build time, so adding a resort does not mean
 * hand-typing a camera position.
 */
export const META = ${JSON.stringify(registryEntry({ id, config: meta, NODES, LIFTS, RUNS }), null, 2)};

/**
 * Lift kinds a skier can also ride down.
 *
 * You board a gondola or a cable car in either direction; a drag lift or a
 * chair you do not. Leaving this out was not a small omission: with lifts
 * modelled as one-way up, any base whose valley descent is graded red was
 * unreachable for a blue skier, so Monterosa offered a beginner exactly one
 * place to stand and Kronplatz and Paganella offered none at all. Riding the
 * gondola down is what a real skier does there. Adding it takes a blue skier
 * at Stafal from 1 place to 10, and a red skier from 26 to 56.
 *
 * Conservative on purpose: only the kinds that certainly carry passengers
 * downhill. Whether a particular chairlift allows it is the resort's own
 * operating detail, and inventing it is how you strand someone at the top.
 */
const DOWNLOADABLE = new Set(["gondola", "cable car", "funicular"]);

export function buildEdges() {
  const edges = [];
  LIFTS.forEach(([from, to, name, liftType, ride, lastUp, queue], i) => {
    edges.push({
      id: \`L\${i}\`, kind: "lift", from, to, name, liftType, ride, lastUp, queue,
      min: ride + queue,
      gain: NODES[to].alt - NODES[from].alt,
    });
    // The same ride, the other way. Still a lift, so the last-up time still
    // applies — a gondola you cannot board at 16:20 cannot take you down at
    // 16:20 either — and the route reads as a lift ride, which it is.
    if (DOWNLOADABLE.has(liftType)) {
      edges.push({
        id: \`L\${i}d\`, kind: "lift", from: to, to: from, name, liftType, ride, lastUp, queue,
        min: ride + queue,
        gain: NODES[from].alt - NODES[to].alt,
        down: true,
      });
    }
  });
  RUNS.forEach(([from, to, name, difficulty, km, min], i) => {
    edges.push({
      id: \`R\${i}\`, kind: "run", from, to, name, difficulty, km, min,
      drop: NODES[from].alt - NODES[to].alt,
    });
  });
  return edges;
}
`;
}
