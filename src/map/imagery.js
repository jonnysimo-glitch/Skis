/**
 * Satellite photography, draped over the app's own terrain.
 *
 * Switching to Satellite used to swap the whole map: MapLibre, MapTiler's
 * basemap, its labels, its camera, its idea of where the pistes are. That is
 * not what anyone means by "show me the satellite". They mean this mountain,
 * with our runs and our huts on it, photographed instead of drawn — the relief
 * is the thing they have been reading, and changing the picture should not
 * change the map underneath it.
 *
 * So this fetches raster tiles for the resort's own bounding box, composites
 * them into one image in Web Mercator, and hands back a function from lat/lon
 * to a colour. The terrain renderer asks it for the colour of each quad and
 * shades that instead of the synthetic snow-and-rock ramp. Everything else —
 * the mesh, the slab, the network, the labels, the scale bar, the gestures —
 * is untouched, because nothing else needs to change.
 *
 * The resolution this can reach is the size of a quad, 167 metres of ground,
 * so it is a soft photograph rather than a sharp one. That is the same
 * limitation the drawn terrain already has and the same blur already hides it:
 * what it buys is real colour — where the trees stop, which bowl is rock, that
 * the flat white thing is a reservoir — which no amount of hillshading knows.
 */

/** Tiles are square; MapTiler's satellite is 512, but the loader measures. */
const FALLBACK_TILE = 512;

/** Web Mercator, the tile-numbering half of it. */
export const lonToTileX = (lon, z) => ((lon + 180) / 360) * 2 ** z;
export const latToTileY = (lat, z) => {
  const r = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z;
};

/**
 * The zoom that covers a bounding box in at most `maxTiles` tiles each way.
 *
 * Coarse on purpose. A quad is 167 metres across and gets one colour, so
 * anything finer than about fifty metres a pixel is detail this cannot show —
 * and every extra zoom level is four times the requests, over a mountain
 * connection, for a picture nobody can see. The ceiling is what stops a large
 * resort asking for a hundred tiles; the floor is what stops a tiny one
 * fetching a single tile of the whole Alps.
 */
export function zoomFor(bounds, maxTiles = 4, min = 8, max = 14) {
  for (let z = max; z > min; z--) {
    const w = Math.floor(lonToTileX(bounds.east, z)) - Math.floor(lonToTileX(bounds.west, z)) + 1;
    // South minus north, not the other way round. The tile grid counts down
    // the screen, so the northern edge has the SMALLER y — subtracting it from
    // the southern one is the height, and doing it backwards made every height
    // negative, every ceiling check trivially true, and this function a
    // constant that always returned the maximum zoom.
    const h = Math.floor(latToTileY(bounds.south, z)) - Math.floor(latToTileY(bounds.north, z)) + 1;
    if (w <= maxTiles && h <= maxTiles) return z;
  }
  return min;
}

/**
 * The zoom whose pixels are about the size of the screen's, at a latitude.
 *
 * The other half of picking a zoom. `zoomFor` answers "how much can I afford
 * to fetch"; this answers "how much is worth fetching" — asking for imagery
 * finer than the screen can show is bytes over a mountain connection for
 * detail that gets averaged away on arrival. The smaller of the two is the one
 * to use.
 */
export function zoomForResolution(lat, metresPerPixel, tile = FALLBACK_TILE, max = 18) {
  if (!(metresPerPixel > 0)) return max;
  const circumference = 40075017 * Math.cos((lat * Math.PI) / 180);
  return Math.max(1, Math.min(max, Math.ceil(Math.log2(circumference / (metresPerPixel * tile)))));
}

/** Which tiles cover a bounding box at a zoom, as an inclusive range. */
export function tilesFor(bounds, z) {
  return {
    z,
    x0: Math.floor(lonToTileX(bounds.west, z)),
    x1: Math.floor(lonToTileX(bounds.east, z)),
    y0: Math.floor(latToTileY(bounds.north, z)),
    y1: Math.floor(latToTileY(bounds.south, z)),
  };
}

/**
 * A tile source from an XYZ template. Behind a parameter so a check can serve
 * its own, and so which provider to use stays a configuration question.
 */
export const templateTile = (template, key) => (z, x, y) =>
  template
    .replace("{z}", z)
    .replace("{x}", x)
    .replace("{y}", y)
    .replace("{key}", key ?? "");

/**
 * Fetch and composite the tiles, and return something that can be sampled.
 *
 * Resolves to null rather than throwing on any failure, because there is
 * always somewhere to fall back to: the drawn terrain is a complete map on its
 * own and the app was using it a moment ago. A resort half-covered in
 * photography would be worse than one not covered at all, so a single tile
 * that will not load takes the whole drape down.
 */
export async function loadImagery({ bounds, urlFor, maxTiles = 4, load = loadImage, atMost = 18 }) {
  if (!bounds || !urlFor) return null;
  const z = Math.min(atMost, zoomFor(bounds, maxTiles, 8, Math.max(9, atMost)));
  const t = tilesFor(bounds, z);

  let images;
  try {
    const wanted = [];
    for (let x = t.x0; x <= t.x1; x++) {
      for (let y = t.y0; y <= t.y1; y++) wanted.push({ x, y, url: urlFor(z, x, y) });
    }
    images = await Promise.all(wanted.map(async (w) => ({ ...w, img: await load(w.url) })));
  } catch {
    return null;
  }
  if (!images.length) return null;

  const size = images[0].img.width || FALLBACK_TILE;
  const across = t.x1 - t.x0 + 1;
  const down = t.y1 - t.y0 + 1;
  const canvas = document.createElement("canvas");
  canvas.width = across * size;
  canvas.height = down * size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  for (const { x, y, img } of images) {
    ctx.drawImage(img, (x - t.x0) * size, (y - t.y0) * size, size, size);
  }

  let data;
  try {
    // One read, then the canvas is finished with. A tile served without CORS
    // taints the canvas and this throws rather than returning black.
    data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  } catch {
    return null;
  }

  const { width, height } = data;
  const px = data.data;
  return {
    z,
    width,
    height,
    /** The colour at a position, or null outside the tiles that were fetched. */
    at(lat, lon) {
      const sx = Math.round((lonToTileX(lon, z) - t.x0) * size);
      const sy = Math.round((latToTileY(lat, z) - t.y0) * size);
      if (sx < 0 || sy < 0 || sx >= width || sy >= height) return null;
      const i = (sy * width + sx) * 4;
      return [px[i], px[i + 1], px[i + 2]];
    },
  };
}

/**
 * A generated tile, for checking the drape without a network.
 *
 * A flat green square with its own tile numbers faintly on it: green because
 * nothing the drawn terrain produces is green — it is a ramp of snow, rock and
 * shadow — so "did the photograph reach the ground" is answerable by counting
 * green pixels, and the numbers make a mis-stitched mosaic visible by eye.
 *
 * An SVG data URL rather than a file, so nothing has to be served and the
 * canvas it is drawn into stays untainted and readable.
 */
export function checkerTile(z, x, y) {
  /*
   * Checked at four pixels, which is the point of it.
   *
   * A flat tile proves the imagery reached the ground and nothing else. Four
   * pixels at the zooms this picks is about fifty metres — finer than the 167
   * metre quad the mesh would paint it with — so the pattern can only appear
   * on screen if a quad is being painted from the photograph at more than one
   * colour. That makes "the drape resolves detail the mesh cannot" a thing a
   * check can count rather than a thing someone has to squint at.
   *
   * Both shades stay unmistakably green, because the other checks tell the
   * drape from the drawn surface by hue and the drawn surface has no green in
   * it at all.
   */
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">` +
    `<defs><pattern id="c" width="8" height="8" patternUnits="userSpaceOnUse">` +
    `<rect width="8" height="8" fill="rgb(46,160,67)"/>` +
    `<rect width="4" height="4" fill="rgb(22,116,44)"/>` +
    `<rect x="4" y="4" width="4" height="4" fill="rgb(22,116,44)"/>` +
    `</pattern></defs>` +
    `<rect width="512" height="512" fill="url(#c)"/>` +
    `<text x="16" y="48" font-family="sans-serif" font-size="34" fill="rgb(8,60,20)">` +
    `${z}/${x}/${y}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** An <img>, as a promise. Anonymous CORS so the composite stays readable. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`tile failed: ${url}`));
    img.src = url;
  });
}
