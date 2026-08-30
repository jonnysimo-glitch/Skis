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

function png(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // truecolour with alpha
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // no filter
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
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

function render(size, maskable) {
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

          const bg = roundRect(px, py, size, size, maskable ? 0 : size * 0.22);
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
  return png(size, size, rgba);
}

mkdirSync("public/icons", { recursive: true });
for (const [file, size, maskable] of [
  ["icon-192.png", 192, false],
  ["icon-512.png", 512, false],
  ["icon-512-maskable.png", 512, true],
]) {
  writeFileSync(`public/icons/${file}`, render(size, maskable));
  console.log(`  public/icons/${file}`);
}
