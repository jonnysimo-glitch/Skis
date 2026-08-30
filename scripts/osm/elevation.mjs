/**
 * Height above sea level, from the same tiles the map draws.
 *
 * Every gradient, every vertical-metre total and every "highest point" label
 * comes from here, so it matters that it is measured rather than guessed. OSM
 * carries `ele` on summits and some lift stations but nothing on piste
 * geometry, which is most of what a graph needs.
 *
 * The source is AWS Terrain Tiles: terrarium-encoded PNGs, no key, global, and
 * already a dependency of the running app. The encoding is
 *
 *     metres = red * 256 + green + blue / 256 - 32768
 *
 * Tiles are cached on disk, so a rebuild is offline and a second resort in the
 * same valley costs nothing.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { PNG } from "pngjs";

const TILE_URL =
  process.env.TERRAIN_TILES ||
  "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";

/** z13 is about 10 m per pixel at alpine latitudes, which is finer than a piste is wide. */
export const ZOOM = 13;
const SIZE = 256;

const cacheDir = new URL("../../data/dem/", import.meta.url).pathname;
const tilePath = (z, x, y) => `${cacheDir}${z}-${x}-${y}.png`;

export const lonToTile = (lon, z) => ((lon + 180) / 360) * 2 ** z;
export const latToTile = (lat, z) => {
  const r = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z;
};

/** Decode one terrarium pixel. Exported so the arithmetic can be tested directly. */
export const decode = (r, g, b) => r * 256 + g + b / 256 - 32768;

/**
 * Load every tile covering a bounding box, then answer point queries from
 * memory. Bilinear between pixels: nearest-neighbour puts visible ten-metre
 * steps into an elevation profile that should be smooth.
 */
export async function elevationFor(bbox, { offline = false } = {}) {
  const [w, s, e, n] = bbox;
  const x0 = Math.floor(lonToTile(w, ZOOM));
  const x1 = Math.floor(lonToTile(e, ZOOM));
  const y0 = Math.floor(latToTile(n, ZOOM));
  const y1 = Math.floor(latToTile(s, ZOOM));

  const tiles = new Map();
  const missing = [];

  for (let x = x0; x <= x1; x++) {
    for (let y = y0; y <= y1; y++) {
      const path = tilePath(ZOOM, x, y);
      if (!existsSync(path)) {
        if (offline) { missing.push(`${ZOOM}/${x}/${y}`); continue; }
        const url = TILE_URL.replace("{z}", ZOOM).replace("{x}", x).replace("{y}", y);
        try {
          const res = await fetch(url);
          if (!res.ok) { missing.push(`${ZOOM}/${x}/${y} -> HTTP ${res.status}`); continue; }
          await mkdir(cacheDir, { recursive: true });
          await writeFile(path, Buffer.from(await res.arrayBuffer()));
        } catch (error) {
          missing.push(`${ZOOM}/${x}/${y} -> ${error.message}`);
          continue;
        }
      }
      tiles.set(`${x}/${y}`, PNG.sync.read(await readFile(path)));
    }
  }

  if (!tiles.size) {
    throw new Error(
      `No elevation tiles for this area.\n  ${missing.slice(0, 4).join("\n  ")}\n` +
        `Elevation is not optional: without it every gradient and vertical total\n` +
        `would be invented. Cache the tiles or point TERRAIN_TILES at a mirror.`
    );
  }

  const sample = (x, y, px, py) => {
    const png = tiles.get(`${x}/${y}`);
    if (!png) return null;
    const i = (py * SIZE + px) * 4;
    return decode(png.data[i], png.data[i + 1], png.data[i + 2]);
  };

  const at = (lat, lon) => {
    const fx = lonToTile(lon, ZOOM);
    const fy = latToTile(lat, ZOOM);
    const x = Math.floor(fx);
    const y = Math.floor(fy);
    const px = (fx - x) * SIZE;
    const py = (fy - y) * SIZE;
    const x0p = Math.min(SIZE - 1, Math.max(0, Math.floor(px)));
    const y0p = Math.min(SIZE - 1, Math.max(0, Math.floor(py)));
    const x1p = Math.min(SIZE - 1, x0p + 1);
    const y1p = Math.min(SIZE - 1, y0p + 1);
    const tx = px - x0p;
    const ty = py - y0p;

    const a = sample(x, y, x0p, y0p);
    if (a === null) return null;
    const b = sample(x, y, x1p, y0p) ?? a;
    const c = sample(x, y, x0p, y1p) ?? a;
    const d = sample(x, y, x1p, y1p) ?? a;
    return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
  };

  at.tiles = tiles.size;
  at.missing = missing;
  return at;
}
