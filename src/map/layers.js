/**
 * Route and graph layers.
 *
 * The route is a first-class graphic object, not a hairline. Three layers make
 * it read over both snow and rock:
 *
 *   1. casing  — wide, accent-coloured, the thing your eye finds first
 *   2. body    — runs solid and coloured by difficulty, lifts thin and dashed
 *   3. nodes   — start, finish and the junction you are heading for
 *
 * Difficulty colours follow European piste convention. They are domain
 * signals, not decoration — the casing is where the brand accent goes.
 */

const SRC_GRAPH = "skis-graph";
const SRC_ROUTE = "skis-route";
const SRC_PINS = "skis-pins";

export const ACCENT = "#f26b1d";

/** Widths interpolate with zoom so the route stays legible framed or close in. */
const w = (a, b, c) => [
  "interpolate", ["linear"], ["zoom"],
  10, a, 13, b, 16, c,
];

export function addRouteLayers(map, { graph, route, pins }) {
  if (!map.getSource(SRC_GRAPH)) {
    map.addSource(SRC_GRAPH, { type: "geojson", data: graph });
  }
  if (!map.getSource(SRC_ROUTE)) {
    map.addSource(SRC_ROUTE, { type: "geojson", data: route });
  }
  if (!map.getSource(SRC_PINS)) {
    map.addSource(SRC_PINS, { type: "geojson", data: pins });
  }

  // The rest of the mountain, faint. Context for the route without competing.
  if (!map.getLayer("graph-line")) {
    map.addLayer({
      id: "graph-line",
      type: "line",
      source: SRC_GRAPH,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": "#ffffff",
        "line-opacity": ["case", ["==", ["get", "kind"], "lift"], 0.28, 0.4],
        "line-width": w(1, 1.6, 2.4),
        "line-dasharray": [2, 2],
      },
    });
  }

  if (!map.getLayer("route-casing")) {
    map.addLayer({
      id: "route-casing",
      type: "line",
      source: SRC_ROUTE,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": ACCENT,
        "line-width": w(7, 11, 16),
        "line-opacity": ["case", ["get", "done"], 0.22, 0.95],
        "line-blur": 0.4,
      },
    });
  }

  // A thin white halo between casing and body keeps the difficulty colour
  // readable where the accent would otherwise bleed into it.
  if (!map.getLayer("route-halo")) {
    map.addLayer({
      id: "route-halo",
      type: "line",
      source: SRC_ROUTE,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": "#ffffff",
        "line-width": w(4.5, 7, 10),
        "line-opacity": ["case", ["get", "done"], 0.25, 0.9],
      },
    });
  }

  if (!map.getLayer("route-runs")) {
    map.addLayer({
      id: "route-runs",
      type: "line",
      source: SRC_ROUTE,
      filter: ["==", ["get", "kind"], "run"],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": ["get", "colour"],
        "line-width": w(2.6, 4.2, 6),
        "line-opacity": ["case", ["get", "done"], 0.4, 1],
      },
    });
  }

  if (!map.getLayer("route-lifts")) {
    map.addLayer({
      id: "route-lifts",
      type: "line",
      source: SRC_ROUTE,
      filter: ["==", ["get", "kind"], "lift"],
      layout: { "line-cap": "butt", "line-join": "round" },
      paint: {
        "line-color": "#33505f",
        "line-width": w(1.6, 2.4, 3.2),
        "line-dasharray": [1.6, 1.6],
        "line-opacity": ["case", ["get", "done"], 0.4, 1],
      },
    });
  }

  if (!map.getLayer("pin-dot")) {
    map.addLayer({
      id: "pin-dot",
      type: "circle",
      source: SRC_PINS,
      paint: {
        "circle-radius": ["case", ["==", ["get", "role"], "now"], 8, 6],
        "circle-color": [
          "match", ["get", "role"],
          "now", ACCENT,
          "finish", "#0b1a24",
          "#ffffff",
        ],
        "circle-stroke-width": 2.5,
        "circle-stroke-color": [
          "match", ["get", "role"],
          "now", "#ffffff",
          "finish", "#ffffff",
          "#0b1a24",
        ],
      },
    });
  }

  if (!map.getLayer("pin-label")) {
    map.addLayer({
      id: "pin-label",
      type: "symbol",
      source: SRC_PINS,
      layout: {
        "text-field": ["get", "name"],
        "text-size": 12,
        "text-offset": [0, 1.35],
        "text-anchor": "top",
        "text-allow-overlap": false,
        "text-font": ["Noto Sans Bold", "Open Sans Bold", "Arial Unicode MS Bold"],
      },
      paint: {
        "text-color": "#0b1a24",
        "text-halo-color": "#ffffff",
        "text-halo-width": 1.6,
      },
    });
  }
}

export function setData(map, which, data) {
  const id = { graph: SRC_GRAPH, route: SRC_ROUTE, pins: SRC_PINS }[which];
  const source = map.getSource(id);
  if (source) source.setData(data);
}

/** Dim everything already skied. Used by navigate. */
export function markProgress(map, doneThrough) {
  for (const layer of ["route-casing", "route-halo", "route-runs", "route-lifts"]) {
    if (!map.getLayer(layer)) continue;
    const key = layer === "route-casing" ? 0.22 : layer === "route-halo" ? 0.25 : 0.4;
    const live = layer === "route-casing" ? 0.95 : layer === "route-halo" ? 0.9 : 1;
    map.setPaintProperty(layer, "line-opacity", [
      "case", ["<", ["get", "i"], doneThrough], key, live,
    ]);
  }
}
