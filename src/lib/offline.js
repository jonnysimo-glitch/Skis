/**
 * Committing to a route caches everything needed to ski it with no signal.
 *
 * Alpine coverage is unreliable and this is a hard requirement, not a nice to
 * have. Three things have to survive going offline:
 *
 *   - the graph and the chosen route  → localStorage, tiny, see persist.js
 *   - the app shell                   → service worker precache, see vite.config.js
 *   - map tiles over the route        → warmed here
 *
 * The tiles are the only part that needs work. Fetching each one puts it in
 * the CacheFirst bucket the service worker owns, so the map keeps drawing when
 * the radio is off. It is also why the graph is deliberately small and local.
 */

import { save } from "./persist.js";
import { routeBounds } from "./geo.js";
import { MAPTILER_KEY, hasMapKey } from "../map/config.js";

/** Zooms worth holding. 11 frames the valley; 15 is enough to see a junction. */
const ZOOMS = [11, 12, 13, 14, 15];
/** Never blow the cache budget on one commit. */
const MAX_TILES = 900;

const lonToX = (lon, z) => Math.floor(((lon + 180) / 360) * 2 ** z);
const latToY = (lat, z) => {
  const r = (lat * Math.PI) / 180;
  return Math.floor(
    ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z
  );
};

function tilesFor(bbox) {
  const [w, s, e, n] = bbox;
  const out = [];
  for (const z of ZOOMS) {
    const x0 = lonToX(w, z);
    const x1 = lonToX(e, z);
    const y0 = latToY(n, z);
    const y1 = latToY(s, z);
    for (let x = x0; x <= x1; x++) {
      for (let y = y0; y <= y1; y++) out.push({ z, x, y });
    }
    if (out.length > MAX_TILES) break;
  }
  return out.slice(0, MAX_TILES);
}

function urlsFor(tiles) {
  const k = MAPTILER_KEY;
  const urls = [];
  for (const { z, x, y } of tiles) {
    urls.push(`https://api.maptiler.com/tiles/v3/${z}/${x}/${y}.pbf?key=${k}`);
    // Terrain-RGB only exists to about z12 usefully; above that it is upsampled.
    if (z <= 13) {
      urls.push(
        `https://api.maptiler.com/tiles/terrain-rgb-v2/${z}/${x}/${y}.webp?key=${k}`
      );
    }
  }
  return urls;
}

/**
 * Warm the cache for one route.
 *
 * @param {object} args
 * @param {object} args.route      chosen route
 * @param {object} args.opts       solver options it came from
 * @param {string} args.resortId
 * @param {(p: {done:number,total:number,phase:string}) => void} [args.onProgress]
 * @returns {Promise<{tiles:number, failed:number, tilesSkipped:boolean}>}
 */
export async function commitRoute({ route, opts, resortId, onProgress }) {
  // The route and graph first — this is the part that must never fail.
  save("committed", {
    resortId,
    savedAt: Date.now(),
    opts,
    route: {
      ...route,
      // Strip nothing: segments carry everything navigate needs, and the whole
      // object is a few KB.
    },
  });
  onProgress?.({ done: 0, total: 1, phase: "route" });

  if (!hasMapKey) {
    // No key means no tiles to warm. The fallback terrain view is drawn from
    // the graph itself and is already offline by construction.
    onProgress?.({ done: 1, total: 1, phase: "done" });
    return { tiles: 0, failed: 0, tilesSkipped: true };
  }

  const bbox = routeBounds(route);
  const urls = urlsFor(tilesFor(bbox));
  let done = 0;
  let failed = 0;

  onProgress?.({ done: 0, total: urls.length, phase: "tiles" });

  // Small concurrency: enough to be quick on a lift, gentle enough not to
  // saturate a marginal connection.
  const LANES = 6;
  let cursor = 0;
  await Promise.all(
    Array.from({ length: LANES }, async () => {
      while (cursor < urls.length) {
        const url = urls[cursor++];
        try {
          const res = await fetch(url, { mode: "cors", cache: "force-cache" });
          if (!res.ok) failed++;
        } catch {
          failed++;
        }
        done++;
        if (done % 12 === 0 || done === urls.length) {
          onProgress?.({ done, total: urls.length, phase: "tiles" });
        }
      }
    })
  );

  onProgress?.({ done: urls.length, total: urls.length, phase: "done" });
  return { tiles: urls.length - failed, failed, tilesSkipped: false };
}

/** Rough cache footprint, for the honest line in the UI. */
export async function cachedTileCount() {
  try {
    const names = await caches.keys();
    const name = names.find((n) => n.includes("maptiler"));
    if (!name) return 0;
    const cache = await caches.open(name);
    return (await cache.keys()).length;
  } catch {
    return 0;
  }
}
