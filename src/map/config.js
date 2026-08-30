/**
 * MapTiler wiring.
 *
 * The key is optional by design. Without it the app renders a terrain view
 * built from the resort graph's own altitudes (see FallbackTerrain) rather
 * than a broken grey box — you still get to orbit the mountain and see the
 * route, you just lose real satellite terrain, pistes and lift lines.
 */

export const MAPTILER_KEY = (import.meta.env?.VITE_MAPTILER_KEY || "").trim();

export const hasMapKey =
  MAPTILER_KEY.length > 0 && MAPTILER_KEY !== "your_key_here";

/**
 * Winter basemap: pistes and lifts are already in it, which is a large head
 * start over drawing the whole mountain ourselves. Outdoor is the fallback if
 * the winter style ever moves.
 */
export const styleUrl = (name = "winter-v2") =>
  `https://api.maptiler.com/maps/${name}/style.json?key=${MAPTILER_KEY}`;

export const STYLE_CHAIN = ["winter-v2", "winter", "outdoor-v2"];

export const terrainSource = {
  type: "raster-dem",
  url: `https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json?key=${MAPTILER_KEY}`,
  tileSize: 256,
};

/** Real alpine terrain looks flat at 1.0 on a phone. */
export const TERRAIN_EXAGGERATION = 1.5;
