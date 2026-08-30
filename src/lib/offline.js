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
import {
  MAPTILER_KEY,
  hasMapKey,
  TERRAIN_TILES,
  TERRAIN_MAX_ZOOM,
} from "../map/config.js";

/** Zooms worth holding. 11 frames the valley; 15 is enough to see a junction. */
const ZOOMS = [11, 12, 13, 14, 15];
/** Never blow the cache budget on one commit. */
const MAX_TILES = 900;

/**
 * A single tile may not hold up the start of the day.
 *
 * `fetch` has no timeout, and a marginal alpine connection is exactly where a
 * request hangs rather than failing. The route and graph are already saved by
 * the time any of this runs, so giving up on a tile costs a bit of map detail
 * and nothing else.
 */
const TILE_TIMEOUT_MS = 5000;

/** And the whole warm-up may not hold it up either. */
const WARM_BUDGET_MS = 12000;

/**
 * Consecutive failures that mean the network is down rather than one tile
 * being missing. Grinding through the rest of the list to fail identically
 * every time just makes the skier watch a progress bar for no reason.
 */
const GIVE_UP_AFTER = 6;

const lonToX = (lon, z) => Math.floor(((lon + 180) / 360) * 2 ** z);
const latToY = (lat, z) => {
  const r = (lat * Math.PI) / 180;
  return Math.floor(
    ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z
  );
};

function tilesFor(bbox, zooms = ZOOMS) {
  const [w, s, e, n] = bbox;
  const out = [];
  for (const z of zooms) {
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

/**
 * Terrain tiles for the keyless path.
 *
 * With no MapTiler key the map still renders real relief, from open elevation
 * data. Those tiles come off the network like any other, so "commit for
 * airplane mode" has to warm them too — otherwise the map quietly drops to the
 * schematic the moment the signal goes, which is the one thing committing was
 * supposed to prevent.
 */
function terrainUrlsFor(bbox) {
  const zooms = ZOOMS.filter((z) => z <= TERRAIN_MAX_ZOOM);
  return tilesFor(bbox, zooms).map(({ z, x, y }) =>
    TERRAIN_TILES.replace("{z}", z).replace("{x}", x).replace("{y}", y)
  );
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
 * @returns {{saved: true, warming: Promise<{tiles:number, failed:number, skipped:number}>}}
 */
export function commitRoute({ route, opts, resortId, onProgress }) {
  // The route and graph first — this is the part that must never fail, and it
  // is synchronous, so by the time this function returns the day is skiable
  // with no signal at all.
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

  // Tiles are the enhancement, not the commitment, so they are warmed in the
  // background. Holding the skier at a progress bar for them is wrong even
  // when it is quick, and when the connection is already gone it is a wait
  // that cannot possibly succeed.
  return { saved: true, warming: warmTiles(route, onProgress) };
}

async function warmTiles(route, onProgress) {
  const bbox = routeBounds(route);
  const urls = hasMapKey ? urlsFor(tilesFor(bbox)) : terrainUrlsFor(bbox);
  let done = 0;
  let failed = 0;

  onProgress?.({ done: 0, total: urls.length, phase: "tiles" });

  // Small concurrency: enough to be quick on a lift, gentle enough not to
  // saturate a marginal connection.
  const LANES = 6;
  const deadline = Date.now() + WARM_BUDGET_MS;
  let cursor = 0;
  let skipped = 0;
  let consecutiveFailures = 0;
  await Promise.all(
    Array.from({ length: LANES }, async () => {
      while (cursor < urls.length) {
        const url = urls[cursor++];
        if (Date.now() > deadline || consecutiveFailures >= GIVE_UP_AFTER) {
          skipped++;
          continue;
        }
        const stop = new AbortController();
        const timer = setTimeout(() => stop.abort(), TILE_TIMEOUT_MS);
        try {
          const res = await fetch(url, {
            mode: "cors",
            cache: "force-cache",
            signal: stop.signal,
          });
          if (res.ok) consecutiveFailures = 0;
          else { failed++; consecutiveFailures++; }
        } catch {
          failed++;
          consecutiveFailures++;
        } finally {
          clearTimeout(timer);
        }
        done++;
        if (done % 12 === 0 || done === urls.length) {
          onProgress?.({ done, total: urls.length, phase: "tiles" });
        }
      }
    })
  );

  onProgress?.({ done: urls.length, total: urls.length, phase: "done" });
  return { tiles: urls.length - failed - skipped, failed, skipped };
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
