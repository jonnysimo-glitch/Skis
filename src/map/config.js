/**
 * Map sources.
 *
 * There are three rungs, best first:
 *
 *   1. MapTiler winter basemap + MapTiler terrain. Needs a key. Pistes, lifts
 *      and lift names come from the basemap itself, which is a large head start.
 *   2. No key: real terrain anyway. AWS Terrain Tiles publish global elevation
 *      as terrarium-encoded PNGs with no key and no signup, and MapLibre can
 *      both extrude and colour a DEM directly. That gives the real shape of
 *      Monte Rosa — you just do not get a basemap under it, so the pistes on
 *      screen are the ones from our own graph rather than OSM's.
 *   3. If even that fails, a schematic terrain built from the graph's own node
 *      altitudes, which is offline by construction. See FallbackTerrain.
 *
 * Rung 2 is what most people will see, so it has to be good rather than a
 * consolation prize.
 */

export const MAPTILER_KEY = (import.meta.env?.VITE_MAPTILER_KEY || "").trim();

export const hasMapKey =
  MAPTILER_KEY.length > 0 && MAPTILER_KEY !== "your_key_here";

/**
 * Winter basemap: pistes and lifts are already in it. Outdoor is the fallback
 * if the winter style ever moves.
 */
export const styleUrl = (name = "winter-v2") =>
  `https://api.maptiler.com/maps/${name}/style.json?key=${MAPTILER_KEY}`;

export const STYLE_CHAIN = ["winter-v2", "winter", "outdoor-v2"];

/**
 * The photograph of the mountain, from above.
 *
 * MapTiler's satellite style is imagery with no cartography on it, which is
 * exactly right here: the pistes, the lifts, the route and the huts are all
 * drawn by this app, so a basemap that also draws them would fight it. Draped
 * over the same terrain mesh as everything else, so it is the real shape of
 * the mountain under a real picture of it.
 *
 * The fallback chain below applies to it too. Satellite has been at this name
 * for years, but a style that moves should degrade to the winter basemap
 * rather than to a grey box.
 */
export const SATELLITE_CHAIN = ["satellite", "hybrid", "winter-v2"];

export const maptilerTerrain = {
  type: "raster-dem",
  url: `https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json?key=${MAPTILER_KEY}`,
  tileSize: 256,
};

/**
 * Global elevation, terrarium-encoded, no key.
 *
 * AWS Terrain Tiles serve EU-DEM over the Alps. Overridable so the tiles can be
 * self-hosted — worth doing before this carries real traffic, both to be a good
 * citizen and because a resort's own tiles can be pinned for offline use.
 */
export const TERRAIN_TILES =
  (import.meta.env?.VITE_TERRAIN_TILES || "").trim() ||
  "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";

/** The highest terrain zoom worth holding; see `maxzoom` on the source below. */
export const TERRAIN_MAX_ZOOM = 13;

const demSource = () => ({
  type: "raster-dem",
  tiles: [TERRAIN_TILES],
  encoding: "terrarium",
  tileSize: 256,
  minzoom: 0,
  // z13 terrarium is about 10 m per pixel at this latitude, which is more than
  // enough for terrain shape and keeps the offline tile set small.
  maxzoom: TERRAIN_MAX_ZOOM,
  attribution:
    '<a href="https://registry.opendata.aws/terrain-tiles/">AWS Terrain Tiles</a>',
});

export const openTerrain = demSource();

/** Real alpine terrain looks flat at 1.0 on a phone. */
export const TERRAIN_EXAGGERATION = 1.5;

/**
 * Colour by height, the way a ski map is coloured: forest in the valley, rock
 * and scree through the middle, snow up top. Stops are chosen for the Alps —
 * Monterosa runs from 1,191 m at Alagna to 4,634 m on the Signalkuppe.
 */
const ELEVATION_RAMP = [
  "interpolate", ["linear"], ["elevation"],
  400, "#33513f",
  900, "#3f6047",
  1400, "#58764f",
  1750, "#7d8f63",
  2050, "#9d9b84",
  2350, "#b0ab99",
  2600, "#c2bfb4",
  2800, "#d5d9dc",
  3050, "#e6ecf1",
  3400, "#f3f8fb",
  4000, "#fbfeff",
  4700, "#ffffff",
];

/**
 * A complete style with no basemap and no key — just the shape of the ground.
 */
export const openTerrainStyle = () => ({
  version: 8,
  name: "Skis terrain",
  // Two entries over the same tiles on purpose: MapLibre warns when one source
  // feeds both the 3D terrain mesh and a raster layer, because the two want
  // different tile pyramids and sharing degrades both.
  sources: { terrain: demSource(), relief: demSource() },
  // No glyphs URL: this style deliberately depends on nothing but the DEM, so
  // it works behind a firewall and caches cleanly for offline use. Node labels
  // are drawn as HTML markers rather than symbol layers for the same reason.
  layers: [
    { id: "sky-bg", type: "background", paint: { "background-color": "#a8c6dc" } },
    {
      id: "relief",
      type: "color-relief",
      source: "relief",
      paint: { "color-relief-color": ELEVATION_RAMP, "color-relief-opacity": 1 },
    },
    {
      id: "shade",
      type: "hillshade",
      source: "relief",
      paint: {
        "hillshade-exaggeration": 0.55,
        "hillshade-shadow-color": "#33465a",
        "hillshade-highlight-color": "#ffffff",
        "hillshade-accent-color": "#5b6f80",
        "hillshade-illumination-direction": 315,
      },
    },
  ],
  terrain: { source: "terrain", exaggeration: TERRAIN_EXAGGERATION },
});

/**
 * How far the camera may leave the resort.
 *
 * A wall, not a cage. You can pull back far enough to see the resort sitting in
 * its valley, push in to piste level, and drift a little past the edges. What
 * you cannot do is leave: unconstrained, the map pans and zooms to the whole
 * globe, and past the world's edge MapLibre draws repeated copies of it, so the
 * start pin appears three times receding toward the horizon. A ski map that can
 * show you the Atlantic is not doing its job either way.
 *
 * The schematic view has had this since it was written. The real map did not,
 * and nobody noticed because the real map never started: its worker 404ed, so
 * every session fell back to the schematic.
 */
/** Slack outside the resort bbox, as a share of its own span. */
export const CAMERA_SLACK = 0.3;
/** Zoom levels below the resort's framing. Enough for context, not for Europe. */
export const ZOOM_OUT_ALLOWANCE = 1.4;
/** Piste level. Past this the DEM has nothing left to show and it goes to mush. */
export const CAMERA_MAX_ZOOM = 17;
/** Used when a resort has no bbox: roughly a resort's worth of degrees. */
const DEFAULT_HALF_SPAN = [0.14, 0.07];

export function cameraLimits(resort) {
  const [halfX, halfY] = DEFAULT_HALF_SPAN;
  const [lon, lat] = resort?.center ?? [0, 0];
  const [w, s, e, n] = resort?.bbox ?? [lon - halfX, lat - halfY, lon + halfX, lat + halfY];
  const padX = (e - w) * CAMERA_SLACK;
  const padY = (n - s) * CAMERA_SLACK;
  const base = resort?.zoom ?? 11.5;
  return {
    maxBounds: [
      [w - padX, s - padY],
      [e + padX, n + padY],
    ],
    minZoom: base - ZOOM_OUT_ALLOWANCE,
    maxZoom: CAMERA_MAX_ZOOM,
  };
}
