/**
 * The height field a resort's terrain is drawn from, and the slab it sits on.
 *
 * Kept out of the component and free of JSX so it can be tested in node, the
 * same reason the solver is plain JS. Everything here is pure and
 * deterministic: the same resort gives the same mountain every time, which the
 * refine chips depend on and which makes the tests worth writing.
 */
export const GRID = 60;

/**
 * Real alpine terrain looks flat at 1.0 on a phone, per the brief. Lives here
 * because the shading is computed here and the projection has to agree with it.
 */
export const VERT_EXAGGERATION = 2.4;

function normalise(v) {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}

/** Late afternoon, from the west, which is when the light on snow is best. */
export const SUN = normalise([-0.5, 0.66, -0.56]);

/** Deterministic value noise — the same mountain every time. */
function hash2(x, y) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function noise2(x, y) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  return (
    hash2(xi, yi) * (1 - u) * (1 - v) +
    hash2(xi + 1, yi) * u * (1 - v) +
    hash2(xi, yi + 1) * (1 - u) * v +
    hash2(xi + 1, yi + 1) * u * v
  );
}

export function fbm(x, y) {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  for (let o = 0; o < 4; o++) {
    sum += noise2(x * freq, y * freq) * amp;
    amp *= 0.5;
    freq *= 2.1;
  }
  return sum;
}

/**
 * How thick the slab under the terrain is, as a share of the resort's own
 * relief. A share rather than a number of metres: Monterosa drops 2,200m and
 * Paganella barely 1,100, and a slab sized for one is a wafer or a plinth on
 * the other.
 */
export const SKIRT = 0.17;

/**
 * The slab's dimensions for a given field.
 *
 * `thickness` is what the rim hangs below the ground, and `base` is where the
 * flat underside sits. The rim follows the ground at a constant thickness
 * instead of dropping to `base`, which is the whole reason the model works —
 * see the block comment in FallbackTerrain.jsx before changing it.
 */
export function slabFor(field) {
  const thickness = Math.max(field.hi - field.lo, 1) * SKIRT;
  return { thickness, base: field.lo - thickness };
}

/**
 * The height field for one resort.
 *
 * Takes its mountain rather than importing one, the same change the solver
 * needed. Without it the map is wired to Monterosa at module level and a second
 * resort would draw the first one's terrain, slab and all.
 *
 * Inverse-distance interpolation through the node altitudes, roughened with
 * noise so it reads as terrain rather than a drape over thirteen poles.
 */
export function buildField(nodes, makeProjector) {
  const proj = makeProjector();
  const pts = Object.values(nodes).map((n) => {
    const { x, z } = proj.project(n.lat, n.lon);
    return { x, z, alt: n.alt };
  });

  const xs = pts.map((p) => p.x);
  const zs = pts.map((p) => p.z);
  const padX = (Math.max(...xs) - Math.min(...xs)) * 0.18;
  const padZ = (Math.max(...zs) - Math.min(...zs)) * 0.18;
  const minX = Math.min(...xs) - padX;
  const maxX = Math.max(...xs) + padX;
  const minZ = Math.min(...zs) - padZ;
  const maxZ = Math.max(...zs) + padZ;

  const heights = new Float32Array((GRID + 1) * (GRID + 1));
  const at = (i, j) => i * (GRID + 1) + j;

  const idw = (x, z) => {
    let num = 0;
    let den = 0;
    for (const p of pts) {
      const d2 = (x - p.x) ** 2 + (z - p.z) ** 2 + 1;
      const w = 1 / (d2 * Math.sqrt(d2)); // ~1/d^3, tight enough to keep peaks
      num += p.alt * w;
      den += w;
    }
    return num / den;
  };

  // Noise wavelengths are measured in grid cells, not in metres.
  //
  // They used to be absolute: 2800m, 1050m and 380m. Monterosa is 22km across
  // over a 60 cell grid, so a cell is 368m and that last octave had a
  // wavelength of one cell. Sampling noise at its own wavelength is aliasing,
  // and it gave every cell an uncorrelated 40m kick — the speckle that made
  // the surface look pixelated rather than smooth. Tying the scales to the
  // cell keeps the terrain smooth at any resort size, which matters because a
  // small resort over the same grid has cells a third as wide.
  const cell = Math.max(maxX - minX, maxZ - minZ) / GRID;
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i <= GRID; i++) {
    for (let j = 0; j <= GRID; j++) {
      const x = minX + ((maxX - minX) * i) / GRID;
      const z = minZ + ((maxZ - minZ) * j) / GRID;
      // Ridged noise (1 - |2n-1|) gives crests rather than dunes, which is
      // what makes an interpolated blob read as a mountain range.
      const ridge = (sc) => 1 - Math.abs(2 * fbm(x / sc, z / sc) - 1);
      const h =
        idw(x, z) +
        430 * (ridge(cell * 9) - 0.5) +
        170 * (ridge(cell * 4) - 0.5);
      heights[at(i, j)] = h;
      lo = Math.min(lo, h);
      hi = Math.max(hi, h);
    }
  }

  const sample = (x, z) => {
    const fi = ((x - minX) / (maxX - minX)) * GRID;
    const fj = ((z - minZ) / (maxZ - minZ)) * GRID;
    const i = Math.max(0, Math.min(GRID - 1, Math.floor(fi)));
    const j = Math.max(0, Math.min(GRID - 1, Math.floor(fj)));
    const tx = Math.max(0, Math.min(1, fi - i));
    const tz = Math.max(0, Math.min(1, fj - j));
    return (
      heights[at(i, j)] * (1 - tx) * (1 - tz) +
      heights[at(i + 1, j)] * tx * (1 - tz) +
      heights[at(i, j + 1)] * (1 - tx) * tz +
      heights[at(i + 1, j + 1)] * tx * tz
    );
  };

  // ---- shading -----------------------------------------------------------
  // Precomputed and smoothed, one value per quad.
  //
  // Slope shading depends only on the height field, so recomputing it every
  // frame bought nothing and cost a normalise per quad. Doing it once also
  // makes it affordable to blur, which is the point: the surface is filled as
  // flat quads, so each cell is a single tone and any jump between neighbours
  // reads as a facet. A finer grid would be the obvious cure and is not
  // available — at GRID 100 the redraw drops to 45fps on a laptop, so a third
  // of that on a phone. Smoothing the tones instead is free.
  const qAt = (i, j) => i * GRID + j;
  let shades = new Float32Array(GRID * GRID);
  const clamp = (v) => Math.max(0, Math.min(GRID, v));
  const H = (i, j) => heights[at(clamp(i), clamp(j))];
  const dxW = (maxX - minX) / GRID;
  const dzW = (maxZ - minZ) / GRID;
  for (let i = 0; i < GRID; i++) {
    for (let j = 0; j < GRID; j++) {
      // Central differences across a three cell stencil, averaged over the
      // quad's width, rather than the one sided difference between the quad's
      // own two corners. That alone takes out much of the faceting.
      const gx = (H(i + 2, j) + H(i + 2, j + 1) - H(i - 1, j) - H(i - 1, j + 1)) / (6 * dxW);
      const gz = (H(i, j + 2) + H(i + 1, j + 2) - H(i, j - 1) - H(i + 1, j - 1)) / (6 * dzW);
      const n = normalise([-gx * VERT_EXAGGERATION, 1, -gz * VERT_EXAGGERATION]);
      shades[qAt(i, j)] = Math.max(0, n[0] * SUN[0] + n[1] * SUN[1] + n[2] * SUN[2]);
    }
  }
  // One box blur pass. Two starts flattening the ridges themselves, and the
  // mountain stops reading as a shape.
  for (let pass = 0; pass < 1; pass++) {
    const next = new Float32Array(GRID * GRID);
    for (let i = 0; i < GRID; i++) {
      for (let j = 0; j < GRID; j++) {
        let sum = 0;
        let count = 0;
        for (let di = -1; di <= 1; di++) {
          for (let dj = -1; dj <= 1; dj++) {
            const a = i + di;
            const b = j + dj;
            if (a < 0 || a >= GRID || b < 0 || b >= GRID) continue;
            sum += shades[qAt(a, b)];
            count++;
          }
        }
        next[qAt(i, j)] = sum / count;
      }
    }
    shades = next;
  }

  return {
    proj, heights, at, sample, shades, qAt,
    minX, maxX, minZ, maxZ, lo, hi,
    cx: (minX + maxX) / 2,
    cz: (minZ + maxZ) / 2,
    cy: (lo + hi) / 2,
    span: Math.max(maxX - minX, maxZ - minZ),
  };
}
