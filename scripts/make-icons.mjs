/**
 * Generate the PWA icons.
 *
 * Hand-rolled PNG encoding rather than a dependency: the icons are flat colour
 * over a rounded square and a raster library would be the largest thing in
 * devDependencies for something we run once.
 */
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";

const crcTable = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/**
 * @param {boolean} [alpha=true]  false writes truecolour with no alpha channel.
 *   The App Store icon is rejected outright if it has one, and iOS applies the
 *   rounded mask itself, so that icon is a flat opaque square.
 */
function png(width, height, rgba, alpha = true) {
  const channels = alpha ? 4 : 3;
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;                 // bit depth
  ihdr[9] = alpha ? 6 : 2;     // truecolour with or without alpha
  const stride = width * channels + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0; // no filter
    if (alpha) {
      rgba.copy(raw, y * stride + 1, y * width * 4, (y + 1) * width * 4);
    } else {
      for (let x = 0; x < width; x++) {
        const from = (y * width + x) * 4;
        const to = y * stride + 1 + x * 3;
        raw[to] = rgba[from];
        raw[to + 1] = rgba[from + 1];
        raw[to + 2] = rgba[from + 2];
      }
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const INK = [10, 25, 34];
const SNOW = [233, 242, 247];
const WHITE = [255, 255, 255];
const ACCENT = [42, 196, 238];

/** Signed distance to a rounded rectangle, for antialiased corners. */
function roundRect(px, py, w, h, r) {
  const dx = Math.abs(px - w / 2) - (w / 2 - r);
  const dy = Math.abs(py - h / 2) - (h / 2 - r);
  const ax = Math.max(dx, 0);
  const ay = Math.max(dy, 0);
  return Math.min(Math.max(dx, dy), 0) + Math.hypot(ax, ay) - r;
}

/** Distance from a point to a polyline, for the route stroke. */
function distToPolyline(px, py, pts) {
  let best = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[i + 1];
    const vx = x2 - x1;
    const vy = y2 - y1;
    const len2 = vx * vx + vy * vy || 1;
    let t = ((px - x1) * vx + (py - y1) * vy) / len2;
    t = Math.max(0, Math.min(1, t));
    best = Math.min(best, Math.hypot(px - (x1 + vx * t), py - (y1 + vy * t)));
  }
  return best;
}

function inPolygon(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/**
 * @param {number} size
 * @param {'rounded'|'maskable'|'square'} shape
 *   rounded  the PWA icon, with its own corner radius
 *   maskable shrunk so it survives a circular crop
 *   square   full bleed and fully opaque, for the App Store and for iOS,
 *            which draws the mask itself and rejects an icon that pre-empts it
 */
function renderRGBA(size, shape = "rounded") {
  const maskable = shape === "maskable";
  const square = shape === "square";
  const rgba = Buffer.alloc(size * size * 4);
  const S = size / 64;
  // Maskable icons must survive a circular crop, so shrink the artwork.
  const inset = maskable ? size * 0.14 : 0;
  const art = (v) => inset + (v * (size - inset * 2)) / 64;

  const ridge = [[8, 48], [22, 24], [30, 36], [42, 14], [56, 48]].map(([x, y]) => [art(x), art(y)]);
  const cap = [[42, 14], [49, 32], [35, 32]].map(([x, y]) => [art(x), art(y)]);
  const route = [[8, 46], [17, 41], [26, 46], [34, 42], [45, 38], [58, 44]].map(([x, y]) => [art(x), art(y)]);

  const SS = 3; // supersample for smooth edges
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let acc = [0, 0, 0, 0];
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px = x + (sx + 0.5) / SS;
          const py = y + (sy + 0.5) / SS;
          let colour = null;
          let alpha = 0;

          const radius = maskable || square ? 0 : size * 0.22;
          const bg = roundRect(px, py, size, size, radius);
          if (bg <= 0) {
            colour = INK;
            alpha = 255;
          }
          if (alpha) {
            if (distToPolyline(px, py, route) < 2.9 * S) colour = ACCENT;
            else if (inPolygon(px, py, cap)) colour = WHITE;
            else if (inPolygon(px, py, ridge)) colour = SNOW;
          }
          if (alpha) {
            acc[0] += colour[0];
            acc[1] += colour[1];
            acc[2] += colour[2];
            acc[3] += 255;
          }
        }
      }
      const n = SS * SS;
      const i = (y * size + x) * 4;
      const a = acc[3] / n;
      rgba[i] = a ? Math.round(acc[0] / (acc[3] / 255)) : 0;
      rgba[i + 1] = a ? Math.round(acc[1] / (acc[3] / 255)) : 0;
      rgba[i + 2] = a ? Math.round(acc[2] / (acc[3] / 255)) : 0;
      rgba[i + 3] = Math.round(a);
    }
  }
  return rgba;
}

/** The same artwork, encoded. Square icons drop the alpha channel. */
const render = (size, shape = "rounded") =>
  png(size, size, renderRGBA(size, shape), shape !== "square");

/**
 * The launch screen. A square canvas because iOS crops it to whatever the
 * device is, so anything near an edge is lost: the mark sits well inside.
 */
function splash(size) {
  const rgba = Buffer.alloc(size * size * 4);
  const mark = Math.round(size * 0.22);
  // Fill with the app background, then paste the mark in the middle.
  for (let i = 0; i < size * size; i++) {
    rgba[i * 4] = INK[0];
    rgba[i * 4 + 1] = INK[1];
    rgba[i * 4 + 2] = INK[2];
    rgba[i * 4 + 3] = 255;
  }
  const art = renderRGBA(mark, "rounded");
  const offset = Math.round((size - mark) / 2);
  for (let y = 0; y < mark; y++) {
    for (let x = 0; x < mark; x++) {
      const from = (y * mark + x) * 4;
      const a = art[from + 3] / 255;
      if (!a) continue;
      const to = ((y + offset) * size + (x + offset)) * 4;
      for (let c = 0; c < 3; c++) {
        rgba[to + c] = Math.round(art[from + c] * a + rgba[to + c] * (1 - a));
      }
    }
  }
  return png(size, size, rgba, false);
}

mkdirSync("public/icons", { recursive: true });
for (const [file, size, shape] of [
  ["icon-192.png", 192, "rounded"],
  ["icon-512.png", 512, "rounded"],
  ["icon-512-maskable.png", 512, "maskable"],
]) {
  writeFileSync(`public/icons/${file}`, render(size, shape));
  console.log(`  public/icons/${file}`);
}

/**
 * Source art for the native builds.
 *
 * `npx capacitor-assets generate` reads these and produces every size iOS and
 * Android ask for, which is the whole reason to keep one 1024 master rather
 * than a folder of hand-cut sizes.
 */
mkdirSync("assets", { recursive: true });
writeFileSync("assets/icon.png", render(1024, "square"));
console.log("  assets/icon.png              1024, opaque, no corner radius");
writeFileSync("assets/icon-foreground.png", render(1024, "maskable"));
console.log("  assets/icon-foreground.png   1024, inset for adaptive masks");
writeFileSync("assets/splash.png", splash(2732));
console.log("  assets/splash.png            2732, logo centred on the ink");
writeFileSync("assets/splash-dark.png", splash(2732));
console.log("  assets/splash-dark.png       2732, same: the app is dark either way");
