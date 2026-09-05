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

import { runMinutes, liftMinutes as cableMinutes, BOARDING_MINUTES } from "../../src/lib/pace.js";

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
 * Where it is not, cable speed by lift type is a far better estimate than a
 * constant: a cable car covers ground several times faster than a drag.
 *
 * Either way boarding is added on top. The mapped duration is the cable time
 * between stations and does not include walking into the cabin at the bottom
 * or out of it at the top, and a day is thirty of those.
 */
export function liftMinutes(el, lengthM) {
  const tagged = el.tags?.["aerialway:duration"];
  if (tagged) {
    // Mapped as minutes, sometimes "5:30" for five and a half.
    const parts = String(tagged).split(":").map(Number);
    const mins = parts.length === 2 ? parts[0] + parts[1] / 60 : Number(tagged);
    if (Number.isFinite(mins) && mins > 0 && mins < 60) {
      return Math.round(mins) + BOARDING_MINUTES;
    }
  }
  return cableMinutes(lengthM, LIFT_KIND[el.tags.aerialway]);
}

// How long a run takes lives in src/lib/pace.js, which the app's own resort
// data is generated from too. There used to be a model here and a different
// one in the hand-typed data, disagreeing by a factor of two, so the planner
// and the pipeline described different mountains.
export { runMinutes };

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

  /**
   * Places you would go to that are not junctions: somewhere to eat, and
   * somewhere to hire skis.
   *
   * They are not part of the routing — the solver already uses `rifugio` to
   * route past lunch — but they are most of what a skier looks for on a piste
   * map and none of it was on ours. Kept whole here, with a kind and a name,
   * and narrowed down to the ones actually on the mountain at emit time, when
   * the final node set is known.
   */
  const KIND = (t) =>
    t.tourism === "alpine_hut" || t.tourism === "wilderness_hut" ? "hut"
      : t.amenity === "restaurant" ? "restaurant"
        : t.amenity === "cafe" ? "cafe"
          : t.shop === "ski" || t.shop === "rental" || t.amenity === "ski_rental" ? "rental"
            : null;
  const places = elements
    .filter((el) => el.tags?.name && KIND(el.tags))
    .map((el) => ({
      name: el.tags.name,
      kind: KIND(el.tags),
      lat: el.lat ?? el.center?.lat,
      lon: el.lon ?? el.center?.lon,
    }))
    .filter((pl) => Number.isFinite(pl.lat) && Number.isFinite(pl.lon));

  const report = {
    lifts: lifts.length,
    pistes: pistes.length,
    namedPlaces: named.length,
    huts: huts.length,
    places: places.length,
    tolerance,
    droppedNoGeometry: 0,
    difficultyAssumed: 0,
    unnamedRuns: 0,
    geometryHoles: 0,
    waysWithHoles: 0,
    junctions: 0,
    noAltitude: 0,
  };

  if (!lifts.length) throw new Error("No aerialways in the data. Check the bounding box.");
  if (!pistes.length) throw new Error("No downhill pistes in the data. Check the bounding box.");

  // A piste splits off another where the two share an OSM node, so without
  // node references there are no junctions to find and every piste becomes one
  // unsplittable top-to-bottom edge. That produces a graph that looks
  // plausible and is not connected — the worst kind of wrong — so it is worth
  // refusing rather than reporting. `out geom tags` omits refs; `out geom`
  // includes them. See scripts/osm/overpass.mjs.
  if (!pistes.some((el) => Array.isArray(el.nodes) && el.nodes.length)) {
    throw new Error(
      "No way carries node references, so no junction can be found and every\n" +
      "  piste would become a single unsplittable edge. The export was made with\n" +
      "  `out geom tags`, which omits refs. Re-fetch with `out geom`:\n" +
      "    npm run resort -- <id> --force"
    );
  }

  // Overpass leaves a null in the geometry array for any vertex it will not
  // resolve, keeping the array the same length as the node refs. Real data has
  // them; the fixtures never did. Strip them from geometry and refs together
  // so the two stay index-aligned, because the junction logic indexes one by
  // the other. A run that loses an interior vertex is measured straight across
  // the gap, so it reads slightly short — recorded rather than hidden.
  for (const el of [...lifts, ...pistes]) {
    if (!Array.isArray(el.geometry)) continue;
    const holes = el.geometry.reduce((n, p) => n + (p ? 0 : 1), 0);
    if (!holes) continue;
    const keep = el.geometry.map((p, i) => (p ? i : -1)).filter((i) => i >= 0);
    el.geometry = keep.map((i) => el.geometry[i]);
    if (Array.isArray(el.nodes)) el.nodes = keep.map((i) => el.nodes[i]);
    report.geometryHoles += holes;
    report.waysWithHoles++;
  }

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
    // Spreading a null here would make a cluster with no coordinates, which
    // then poisons every distance it takes part in without ever throwing.
    if (!a || !b) { report.droppedNoGeometry++; continue; }
    endpointRef.set(`${el.id}:start`, clusters.add({ ...a, wayId: el.id, role: "end" }));
    endpointRef.set(`${el.id}:end`, clusters.add({ ...b, wayId: el.id, role: "end" }));
  }

  // A junction is an interior point of a piste that some other way also uses.
  //
  // Every way's every node ref is counted, endpoints included, because the
  // commonest junction on a mountain is a T: one piste ends in the middle of
  // another, which OSM maps by sharing a node. Counting only interior uses
  // would miss those and leave the joining piste a dead end.
  //
  // The threshold has to be two. Counting interior points with a use count of
  // one made a graph node out of every single vertex of every piste — nine
  // hundred and fifty for Monterosa instead of a few dozen — so pistes were
  // chopped into hundred-metre fragments and neighbouring vertices, usually
  // closer together than the stitching tolerance, merged into each other and
  // chained whole valleys into one blob. The largest strongly connected
  // component came out as a single valley and everything else was pruned away.
  const uses = new Map();
  for (const el of [...lifts, ...pistes]) {
    if (!Array.isArray(el.nodes)) continue;
    for (const nodeId of el.nodes) uses.set(nodeId, (uses.get(nodeId) || 0) + 1);
  }

  const junctionRef = new Map();
  for (const el of pistes) {
    if (!el.geometry || !el.nodes) continue;
    el.nodes.forEach((nodeId, i) => {
      if (i === 0 || i === el.nodes.length - 1) return;
      if (junctionRef.has(nodeId)) return;
      if ((uses.get(nodeId) || 0) < 2) return;
      const at = el.geometry[i];
      if (!at) return;
      junctionRef.set(nodeId, clusters.add({ ...at, role: "junction" }));
    });
  }
  report.junctions = junctionRef.size;

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
    // Not Math.round: the sampler answers null for a point it has no tile
    // for, and Math.round(null) is zero. A silent sea-level node in the Alps
    // poisons every gradient it takes part in, so it stays null and `check`
    // refuses the graph rather than shipping an invented altitude.
    const sampled = elevation(lat, lon);
    const alt = sampled === null || !Number.isFinite(sampled) ? null : Math.round(sampled);
    if (alt === null) report.noAltitude++;

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
      // Persons per hour, where a mapper has recorded it. Not decoration: it
      // is the only thing in OSM that bears on how long you wait.
      capacity: Number(el.tags["aerialway:capacity"]) || null,
      osmId: el.id,
    });
  }

  for (const el of pistes) {
    if (!el.geometry || el.geometry.length < 2) continue;
    const raw = el.tags["piste:difficulty"];
    let difficulty = DIFFICULTY[raw];
    if (!difficulty) { difficulty = "red"; report.difficultyAssumed++; }
    // The name a skier reads on the signpost, wherever OSM put it. `name` is
    // the obvious place, but a third of Kronplatz's pistes carry it as
    // `piste:name` instead, and some are signed only by number. Reading just
    // `name` threw away nineteen real names — Seewiese, Arndt, Plateau, Sonne
    // — and replaced them with a pair of junction names.
    const signed =
      el.tags.name ||
      el.tags["piste:name"] ||
      (el.tags["piste:ref"] || el.tags["piste:number"]
        ? `Piste ${el.tags["piste:ref"] || el.tags["piste:number"]}`
        : null);
    if (!signed) report.unnamedRuns++;

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
        // Left null on purpose when nothing is signed. The endpoint fallback
        // is applied by nameRuns() after the junctions have their own names
        // and the chains have merged: built here it froze the placeholder, so
        // a run came out as "Point 61 to Arndt" between two nodes since
        // renamed "Above Plateau" and "Arndt".
        name: signed,
        difficulty,
        km: Math.round((length / 1000) * 10) / 10,
        minutes: runMinutes(length, drop, difficulty),
        metres: Math.round(length),
        osmId: el.id,
      });
    }
  }

  /**
   * Give the unnamed places a name a skier could say out loud.
   *
   * OSM names lift stations, summits and cols; it does not name the junction
   * where two pistes part company. Those came out as "Point 74", and the plan
   * form offered seventy-odd of them as somewhere you might be standing —
   * which is useless to the one person who needs it most, someone stranded
   * mid-mountain trying to say where they are.
   *
   * They cannot simply be dropped: a GPS fix snaps to the nearest node in the
   * graph, and that is often one of these. So each takes its name from what is
   * actually there — the piste it sits on, or the named place it is above or
   * below. `named` stays false, which is how the map knows to draw the route
   * through it without cluttering the mountain with a label.
   */
  {
    const namedNodes = Object.entries(NODES).filter(([, n]) => n.named);
    const touching = {};
    for (const edge of [...LIFTS, ...RUNS]) {
      // Only a signed name locates a junction. Nothing is generated yet, so
      // this no longer has to guess which names were.
      if (!edge.name) continue;
      (touching[edge.from] ||= new Set()).add(edge.name);
      (touching[edge.to] ||= new Set()).add(edge.name);
    }

    for (const [key, node] of Object.entries(NODES)) {
      if (node.named) continue;
      const here = [...(touching[key] || [])];
      if (here.length === 1) {
        NODES[key] = { ...node, name: `${here[0]} junction` };
        continue;
      }
      // Nearest named place, and which side of it you are on. "Above Gabiet"
      // locates someone; "Point 74" does not.
      let nearest = null;
      for (const [, other] of namedNodes) {
        const d = metres(node.lat, node.lon, other.lat, other.lon);
        if (!nearest || d < nearest.d) nearest = { d, other };
      }
      NODES[key] = nearest
        ? { ...node, name: `${node.alt >= nearest.other.alt ? "Above" : "Below"} ${nearest.other.name}` }
        : node;
    }
  }

  return { NODES, LIFTS, RUNS, PLACES: places, report };
}
