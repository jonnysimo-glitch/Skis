/**
 * OpenStreetMap ways to a routable ski graph.
 *
 * This is the part the brief warns about: the data is messy in specific,
 * predictable ways, and each one has to be handled deliberately rather than
 * hoped away.
 *
 *   - Piste segments do not always connect. Two ways that plainly meet on the
 *     mountain can be four metres apart in OSM, because two mappers traced
 *     them from different imagery.
 *   - Lifts do not touch the pistes they serve. A gondola is drawn as a
 *     straight line between two stations; the piste beside it was traced from
 *     a GPS track and starts twenty metres away.
 *   - Difficulty is often missing, and where present uses OSM's own scale
 *     rather than the European piste colours.
 *   - Names are missing, duplicated, or on the wrong element.
 *
 * The approach is to cluster endpoints that are close enough to be the same
 * place, and to be honest in the report about how much stitching that took. A
 * graph that needed a hundred-metre tolerance to connect is telling you the
 * data is not good enough, and you want to know that rather than ship it.
 */

/** How close a mountain restaurant has to be to count as lunch at that node. */
const RIFUGIO_METRES = 120;

/** Metres between two lat/lon points. */
export function metres(aLat, aLon, bLat, bLon) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Length of a coordinate list, in metres. */
export const wayLength = (geom) => {
  let total = 0;
  for (let i = 1; i < geom.length; i++) {
    total += metres(geom[i - 1].lat, geom[i - 1].lon, geom[i].lat, geom[i].lon);
  }
  return total;
};

/**
 * OSM's difficulty scale to European piste colours.
 *
 * These are safety signals, not decoration. OSM's `novice` is a nursery slope
 * and `easy` is a blue; both are blue here because this app has no green grade
 * and sending a beginner somewhere marked easier than it is would be the worst
 * possible failure. Anything above intermediate is black: an "advanced" run in
 * OSM is a European red-black borderline, and rounding it down is the unsafe
 * direction to round.
 */
export const DIFFICULTY = {
  novice: "blue",
  easy: "blue",
  intermediate: "red",
  advanced: "black",
  expert: "black",
  freeride: "black",
  extreme: "black",
};

/** OSM aerialway values to the three the app draws differently. */
export const LIFT_KIND = {
  cable_car: "cable car",
  gondola: "gondola",
  mixed_lift: "gondola",
  funicular: "funicular",
  chair_lift: "chair",
  drag_lift: "drag",
  "t-bar": "drag",
  "j-bar": "drag",
  platter: "drag",
  rope_tow: "drag",
  magic_carpet: "carpet",
};

/**
 * Union-find over candidate points, so that endpoints close enough to be the
 * same place become one graph node.
 */
class Clusters {
  constructor(toleranceMetres) {
    this.tolerance = toleranceMetres;
    this.points = [];
    this.parent = [];
  }

  find(i) {
    while (this.parent[i] !== i) {
      this.parent[i] = this.parent[this.parent[i]];
      i = this.parent[i];
    }
    return i;
  }

  union(a, b) {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent[rb] = ra;
  }

  /** Add a candidate point, merging it into any cluster within tolerance. */
  add(point) {
    const index = this.points.length;
    this.points.push(point);
    this.parent.push(index);
    for (let i = 0; i < index; i++) {
      if (metres(point.lat, point.lon, this.points[i].lat, this.points[i].lon) <= this.tolerance) {
        this.union(i, index);
      }
    }
    return index;
  }

  /** Cluster id -> the points in it. */
  groups() {
    const out = new Map();
    for (let i = 0; i < this.points.length; i++) {
      const root = this.find(i);
      if (!out.has(root)) out.set(root, []);
      out.get(root).push(this.points[i]);
    }
    return out;
  }
}

const isLift = (el) => el.type === "way" && el.tags?.aerialway && LIFT_KIND[el.tags.aerialway];
const isPiste = (el) => el.type === "way" && el.tags?.["piste:type"] === "downhill";

/**
 * Ride time in minutes.
 *
 * `aerialway:duration` is the mapped value and is used whenever it is there.
 * Where it is not, speed by lift type is a far better estimate than a constant:
 * a cable car covers ground several times faster than a drag.
 */
const LIFT_SPEED_MS = {
  "cable car": 8.0, gondola: 5.5, funicular: 7.0,
  chair: 2.6, drag: 2.2, carpet: 0.6,
};

export function liftMinutes(el, lengthM) {
  const tagged = el.tags?.["aerialway:duration"];
  if (tagged) {
    // Mapped as minutes, sometimes "5:30" for five and a half.
    const parts = String(tagged).split(":").map(Number);
    const mins = parts.length === 2 ? parts[0] + parts[1] / 60 : Number(tagged);
    if (Number.isFinite(mins) && mins > 0 && mins < 60) return Math.round(mins);
  }
  const kind = LIFT_KIND[el.tags.aerialway];
  const speed = LIFT_SPEED_MS[kind] ?? 3;
  return Math.max(1, Math.round(lengthM / speed / 60));
}

/**
 * How long a run takes.
 *
 * Not distance over a constant speed: a gentle blue and a steep black of the
 * same length take similar times for different reasons, because the skier who
 * is comfortable on the black skis it fast and everyone else traverses it. The
 * gradient term is deliberately weak for that reason, and the floor stops a
 * fifty-metre link segment being reported as instantaneous.
 */
export function runMinutes(lengthM, dropM, difficulty) {
  const base = { blue: 190, red: 230, black: 250 }[difficulty] ?? 210; // metres/min
  const gradient = dropM > 0 ? Math.min(dropM / lengthM, 0.6) : 0;
  const speed = base * (1 + gradient * 0.8);
  return Math.max(1, Math.round(lengthM / speed));
}

/**
 * Build the graph.
 *
 * @param {object} osm            raw Overpass response
 * @param {object} options
 * @param {number} options.tolerance  metres within which two endpoints are one place
 * @param {(lat:number, lon:number) => number} options.elevation  metres above sea level
 */
export function build(osm, { tolerance = 45, elevation }) {
  const elements = osm.elements || [];
  const lifts = elements.filter(isLift);
  const pistes = elements.filter(isPiste);
  const named = elements.filter(
    (el) => el.type === "node" && el.tags?.name && (el.tags.aerialway === "station" || el.tags.natural === "peak" || el.tags.mountain_pass === "yes")
  );
  // Anywhere you can sit down and eat. Ways and relations come back with a
  // `center` rather than a position of their own.
  const huts = elements
    .filter((el) => el.tags && (
      el.tags.tourism === "alpine_hut" || el.tags.tourism === "wilderness_hut" ||
      el.tags.amenity === "restaurant" || el.tags.amenity === "cafe"))
    .map((el) => ({ lat: el.lat ?? el.center?.lat, lon: el.lon ?? el.center?.lon, name: el.tags.name }))
    .filter((h) => Number.isFinite(h.lat) && Number.isFinite(h.lon));

  const report = {
    lifts: lifts.length,
    pistes: pistes.length,
    namedPlaces: named.length,
    huts: huts.length,
    tolerance,
    droppedNoGeometry: 0,
    difficultyAssumed: 0,
    unnamedRuns: 0,
  };

  if (!lifts.length) throw new Error("No aerialways in the data. Check the bounding box.");
  if (!pistes.length) throw new Error("No downhill pistes in the data. Check the bounding box.");

  // --- candidate graph points ------------------------------------------------
  // Lift ends always are. Piste ends always are. Interior piste points are only
  // where two pistes genuinely share an OSM node, which is what a mapped
  // junction looks like.
  const clusters = new Clusters(tolerance);
  const endpointRef = new Map(); // way id + end -> cluster index

  const ends = (el) => [el.geometry?.[0], el.geometry?.[el.geometry.length - 1]];

  for (const el of [...lifts, ...pistes]) {
    if (!el.geometry || el.geometry.length < 2) { report.droppedNoGeometry++; continue; }
    const [a, b] = ends(el);
    endpointRef.set(`${el.id}:start`, clusters.add({ ...a, wayId: el.id, role: "end" }));
    endpointRef.set(`${el.id}:end`, clusters.add({ ...b, wayId: el.id, role: "end" }));
  }

  // Shared interior nodes: a junction where one piste splits off another.
  const seen = new Map();
  for (const el of pistes) {
    if (!el.geometry || !el.nodes) continue;
    el.nodes.forEach((nodeId, i) => {
      if (i === 0 || i === el.nodes.length - 1) return;
      if (!seen.has(nodeId)) { seen.set(nodeId, { count: 0, at: el.geometry[i] }); }
      seen.get(nodeId).count++;
    });
  }
  const junctionRef = new Map();
  for (const [nodeId, { count, at }] of seen) {
    if (count < 1 || !at) continue;
    junctionRef.set(nodeId, clusters.add({ ...at, role: "junction" }));
  }

  // --- clusters become nodes -------------------------------------------------
  const groups = clusters.groups();
  const nodeIdOf = new Map(); // cluster root -> node key
  const NODES = {};
  let counter = 0;

  const slug = (text) =>
    text.normalize("NFD").replace(/[̀-ͯ]/g, "")
      .toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 22) || `n${counter}`;

  for (const [root, points] of groups) {
    const lat = points.reduce((s, p) => s + p.lat, 0) / points.length;
    const lon = points.reduce((s, p) => s + p.lon, 0) / points.length;
    const alt = Math.round(elevation(lat, lon));

    // The best name within tolerance: a mapped station or peak beats anything
    // we could invent, and it is what the mountain's signs say.
    let best = null;
    let bestM = Infinity;
    for (const place of named) {
      const d = metres(lat, lon, place.lat, place.lon);
      if (d < bestM && d <= tolerance * 3) { bestM = d; best = place; }
    }

    counter++;
    const base = best ? slug(best.tags.name) : `p${counter}`;
    let key = base;
    let n = 2;
    while (NODES[key]) key = `${base}${n++}`;

    // Lunch has to be somewhere you would actually stop, so the radius is
    // tighter than the naming radius: a restaurant 150 m away is in the village
    // below, not at the lift station.
    const rifugio = huts.some((h) => metres(lat, lon, h.lat, h.lon) <= RIFUGIO_METRES);

    NODES[key] = {
      name: best?.tags.name || `Point ${counter}`,
      lat: Math.round(lat * 1e5) / 1e5,
      lon: Math.round(lon * 1e5) / 1e5,
      alt,
      named: Boolean(best),
      ...(rifugio ? { rifugio: true } : {}),
    };
    nodeIdOf.set(root, key);
  }

  const keyFor = (clusterIndex) => nodeIdOf.get(clusters.find(clusterIndex));

  // --- edges -----------------------------------------------------------------
  const LIFTS = [];
  const RUNS = [];

  for (const el of lifts) {
    if (!el.geometry || el.geometry.length < 2) continue;
    const a = keyFor(endpointRef.get(`${el.id}:start`));
    const b = keyFor(endpointRef.get(`${el.id}:end`));
    if (!a || !b || a === b) continue;
    // A lift goes up. Whichever end is higher is the top, whatever order the
    // way happens to be drawn in.
    const [from, to] = NODES[a].alt <= NODES[b].alt ? [a, b] : [b, a];
    const length = wayLength(el.geometry);
    LIFTS.push({
      from, to,
      name: el.tags.name || el.tags["aerialway:name"] || NODES[to].name,
      kind: LIFT_KIND[el.tags.aerialway],
      minutes: liftMinutes(el, length),
      metres: Math.round(length),
      osmId: el.id,
    });
  }

  for (const el of pistes) {
    if (!el.geometry || el.geometry.length < 2) continue;
    const raw = el.tags["piste:difficulty"];
    let difficulty = DIFFICULTY[raw];
    if (!difficulty) { difficulty = "red"; report.difficultyAssumed++; }
    if (!el.tags.name) report.unnamedRuns++;

    // Split the way wherever it passes through a graph node, so a run that
    // three others join is three edges rather than one uninterruptible slide.
    const cuts = [0];
    (el.nodes || []).forEach((nodeId, i) => {
      if (i > 0 && i < el.nodes.length - 1 && junctionRef.has(nodeId)) cuts.push(i);
    });
    cuts.push(el.geometry.length - 1);

    for (let c = 0; c < cuts.length - 1; c++) {
      const span = el.geometry.slice(cuts[c], cuts[c + 1] + 1);
      if (span.length < 2) continue;
      const startRef = cuts[c] === 0
        ? endpointRef.get(`${el.id}:start`)
        : junctionRef.get(el.nodes[cuts[c]]);
      const endRef = cuts[c + 1] === el.geometry.length - 1
        ? endpointRef.get(`${el.id}:end`)
        : junctionRef.get(el.nodes[cuts[c + 1]]);
      const a = keyFor(startRef);
      const b = keyFor(endRef);
      if (!a || !b || a === b) continue;

      // A run goes down.
      const [from, to] = NODES[a].alt >= NODES[b].alt ? [a, b] : [b, a];
      const length = wayLength(span);
      if (length < 40) continue; // a stub, not a run
      const drop = NODES[from].alt - NODES[to].alt;
      RUNS.push({
        from, to,
        name: el.tags.name || `${NODES[from].name} to ${NODES[to].name}`,
        difficulty,
        km: Math.round((length / 1000) * 10) / 10,
        minutes: runMinutes(length, drop, difficulty),
        metres: Math.round(length),
        osmId: el.id,
      });
    }
  }

  return { NODES, LIFTS, RUNS, report };
}
