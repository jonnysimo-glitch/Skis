/**
 * Route → GeoJSON, plus the geometry helpers the map layers need.
 *
 * `resort.js` carries [lat, lon] on every node precisely so the 3D layer can
 * place the graph on real terrain. The solver never reads them.
 */

import { NODES } from "../active-resort.js";

export const PISTE_COLOUR = {
  blue: "#1d6fcc",
  red: "#c22b37",
  black: "#101820",
};
export const LIFT_COLOUR = "#7d95a5";

/**
 * The same three grades, washed out, for the network that is always on the
 * map whether or not a day has been planned.
 *
 * Not decoration: a skier looking at an unlabelled mountain wants to know
 * which side of it is blue before they choose anything. The hue is the piste
 * convention and stays that way; only the weight changes, so the planned route
 * drawn over the top is unmistakably the route and everything else is context.
 *
 * Black had to move away from grey rather than simply lighten, or it would
 * have arrived at the lift colour. Lifts are also dashed and thinner, so there
 * are two signals rather than one.
 */
export const PISTE_TINT = {
  blue: "#6ea6e4",
  red: "#db7f87",
  black: "#5f6c77",
};
export const LIFT_TINT = "#b9c6d0";

const lngLat = (key) => [NODES[key].lon, NODES[key].lat];

/**
 * Bend a straight A→B into a slight arc. Real pistes are not straight lines
 * between stations; a dead-straight segment reads as a wire over the terrain
 * rather than something on it. The offset is deterministic in the edge id so
 * the same run always draws the same way.
 */
function arc(from, to, id, bendScale) {
  const a = lngLat(from);
  const b = lngLat(to);
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffff;
  const bend = ((h % 200) / 100 - 1) * bendScale;
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  // Perpendicular offset at the midpoint.
  const cx = mx - dy * bend;
  const cy = my + dx * bend;

  const pts = [];
  const STEPS = 14;
  for (let i = 0; i <= STEPS; i++) {
    const t = i / STEPS;
    const u = 1 - t;
    pts.push([
      u * u * a[0] + 2 * u * t * cx + t * t * b[0],
      u * u * a[1] + 2 * u * t * cy + t * t * b[1],
    ]);
  }
  return pts;
}

/** Lifts run taut; pistes wander. */
const bendFor = (edge) => (edge.kind === "lift" ? 0.02 : 0.16);

export function edgeCoords(edge) {
  return arc(edge.from, edge.to, edge.id, bendFor(edge));
}

/**
 * One Feature per segment, in route order. Segment index rides along so the
 * navigate screen can dim what is already skied.
 */
export function routeToGeoJSON(route) {
  if (!route) return { type: "FeatureCollection", features: [] };
  return {
    type: "FeatureCollection",
    features: route.segments.map((edge, i) => ({
      type: "Feature",
      id: i,
      properties: {
        i,
        kind: edge.kind,
        name: edge.name,
        difficulty: edge.difficulty || null,
        colour: edge.kind === "lift" ? LIFT_COLOUR : PISTE_COLOUR[edge.difficulty],
      },
      geometry: { type: "LineString", coordinates: edgeCoords(edge) },
    })),
  };
}

/** The whole mountain, drawn faintly under the route for context. */
export function graphToGeoJSON(edges) {
  return {
    type: "FeatureCollection",
    features: edges.map((edge) => ({
      type: "Feature",
      properties: { kind: edge.kind, difficulty: edge.difficulty || null },
      geometry: { type: "LineString", coordinates: edgeCoords(edge) },
    })),
  };
}

export function nodesToGeoJSON(keys, extra = () => ({})) {
  return {
    type: "FeatureCollection",
    features: keys.map((key) => ({
      type: "Feature",
      properties: { key, name: NODES[key].name, alt: NODES[key].alt, ...extra(key) },
      geometry: { type: "Point", coordinates: lngLat(key) },
    })),
  };
}

/** [w, s, e, n] over a route's nodes, padded. */
export function routeBounds(route, pad = 0.012) {
  if (!route) return null;
  const keys = [route.segments[0].from, ...route.segments.map((e) => e.to)];
  const lons = keys.map((k) => NODES[k].lon);
  const lats = keys.map((k) => NODES[k].lat);
  return [
    Math.min(...lons) - pad,
    Math.min(...lats) - pad,
    Math.max(...lons) + pad,
    Math.max(...lats) + pad,
  ];
}

/** Great-circle metres. Used to snap a GPS fix to the nearest graph node. */
export function metresBetween(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Nearest graph node to a fix, with the distance so callers can reject it. */
export function nearestNode(lat, lon, keys = Object.keys(NODES)) {
  let best = null;
  let bestM = Infinity;
  for (const key of keys) {
    const m = metresBetween(lat, lon, NODES[key].lat, NODES[key].lon);
    if (m < bestM) {
      bestM = m;
      best = key;
    }
  }
  return { key: best, metres: bestM };
}
