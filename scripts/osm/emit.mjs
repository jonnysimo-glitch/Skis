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

export function buildEdges() {
  const edges = [];
  LIFTS.forEach(([from, to, name, liftType, ride, lastUp, queue], i) => {
    edges.push({
      id: \`L\${i}\`, kind: "lift", from, to, name, liftType, ride, lastUp, queue,
      min: ride + queue,
      gain: NODES[to].alt - NODES[from].alt,
    });
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
