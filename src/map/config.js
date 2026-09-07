/**
 * Where the map's tiles come from, and whether there is a key for them.
 *
 * Two sources and one question, which is all that is left of this file.
 *
 *   SATELLITE_URL   the photograph, draped over our own terrain mesh. Needs a
 *                   MapTiler key.
 *   TERRAIN_TILES   global elevation, terrarium-encoded, no key and no signup,
 *                   which is what the mesh is built from. See src/map/field.js.
 *
 * It used to be three rungs of MapLibre style JSON — a winter basemap, a
 * key-less colour-relief style, and the drawn terrain as a last resort — and
 * about two thirds of it survived the move to drawing the mountain ourselves
 * without being used by anything. MapLibre is not a dependency any more, so
 * the styles, the DEM source objects, the elevation ramp and the camera bounds
 * that went with them are gone. `git log` has them if a basemap ever comes
 * back; nothing here imports them.
 */

export const MAPTILER_KEY = (import.meta.env?.VITE_MAPTILER_KEY || "").trim();

/**
 * Where the satellite drape's tiles come from, as an XYZ template.
 *
 * Overridable because which provider to use is not a settled question and the
 * answer is not a technical one. MapTiler's satellite is a cloud-free SUMMER
 * composite, so the Alps render green — correct imagery of the wrong season
 * for a ski app. Winter imagery of the Alps at the resolution that shows
 * buildings is a commercial purchase; FATMAP bought theirs, which is why they
 * were the only app that had it. See the README.
 *
 * `{z}`, `{x}`, `{y}` and `{key}` are substituted. Set VITE_SATELLITE_URL to
 * point somewhere else without touching the code.
 */
export const SATELLITE_URL = (import.meta.env?.VITE_SATELLITE_URL || "").trim() ||
  "https://api.maptiler.com/tiles/satellite-v2/{z}/{x}/{y}.jpg?key={key}";

export const hasMapKey =
  MAPTILER_KEY.length > 0 && MAPTILER_KEY !== "your_key_here";

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

/**
 * The highest terrain zoom worth holding offline.
 *
 * z13 terrarium is about 10 m per pixel at alpine latitudes, which is more
 * than enough for the shape of the ground and keeps the pinned tile set small.
 */
export const TERRAIN_MAX_ZOOM = 13;
