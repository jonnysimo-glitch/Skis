/**
 * The height field a resort's terrain is drawn from, and the slab it sits on.
 *
 * Kept out of the component and free of JSX so it can be tested in node, the
 * same reason the solver is plain JS. Everything here is pure and
 * deterministic: the same resort gives the same mountain every time, which the
 * refine chips depend on and which makes the tests worth writing.
 */
/*
 * 72, measured rather than guessed. The redraw only happens when something
 * moved, so what matters is the frame time during a drag: 60 was 44ms at the
 * 95th percentile on this machine and 72 is 46ms, for 44% more ground. 84
 * costs 60ms, which is a visible stutter on a phone.
 */
export const GRID = 72;

/**
 * Real alpine terrain looks flat at 1.0 on a phone, per the brief. Lives here
 * because the shading is computed here and the projection has to agree with it.
 */
export const VERT_EXAGGERATION = 2.4;

function normalise(v) {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}

/**
 * Afternoon, from the west, which is when the light on snow is best.
 *
 * Thirty degrees up, down from forty-one, and the correction is to realism as
 * much as to looks: at 46 degrees north the midwinter sun peaks around
 * twenty-one and only reaches forty by the equinox, so forty-one was a summer
 * sun over a ski resort. It also cast almost nothing. Monterosa averages about
 * fifteen degrees of slope across its whole width, so a sun at forty-one
 * clears nearly all of it — four per cent of the mountain in shadow, which is
 * a feature nobody can see. At thirty it is a third, which is what an
 * afternoon on a mountain actually looks like.
 */
export const SUN = normalise([-0.5, 0.434, -0.56]);

/**
 * How the shadow march is spent, and how soft the edge of a shadow is.
 *
 * Thirty geometric steps growing by a fifth reach about forty kilometres from
 * a start half a cell out, which is past the far side of any resort — and
 * spend most of them in the first kilometre, where a bank or a roll in the
 * ground does the blocking.
 *
 * The softness is in visual metres: ground the sun misses by less than this is
 * partly lit. It stands in for the sun having a width, which is what makes a
 * real shadow edge soft, and without it every shadow on the mountain has the
 * hard edge of something cut out with scissors.
 */
const SHADOW_STEPS = 30;
const SHADOW_GROWTH = 1.2;
const SHADOW_SOFT = 90;

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
 * How far the terrain mesh reaches beyond the outermost node, as a fraction of
 * the resort's extent.
 *
 * Exported because it is not only this file's business any more: the satellite
 * drape has to fetch imagery for the same box, and a drape narrower than the
 * mesh leaves a ring of painted snow around a photograph.
 */
export const FIELD_PAD = 0.18;

/**
 * The slab's faces.
 *
 * Exported because the feature tests identify slab pixels by exact value, and
 * a copy of these numbers in the test drifted the first time they changed.
 * Filled flat, with no slope shading and no haze, so no terrain pixel can
 * collide with them.
 */
/**
 * The sky, as three stops of a vertical gradient over the whole canvas.
 *
 * Here rather than in the renderer because the feature suite has to tell sky
 * from mountain, and it cannot do that by eye. It used to guess — "bluer than
 * it is red" — which was true of the sky and became true of a snowfield in
 * shadow the moment the shading learned that shadows on snow are blue. Half
 * the mountain was then counted as sky, and the slab looked like 43% of a
 * model it is 11% of.
 */
export const SKY_TOP = [104, 158, 196];
export const SKY_MID = [170, 203, 224];
export const SKY_HORIZON = [216, 234, 244];

/** The sky's colour at a given fraction down the canvas. */
export function skyAt(t) {
  const f = Math.max(0, Math.min(1, t));
  const [a, b, k] = f <= 0.55
    ? [SKY_TOP, SKY_MID, f / 0.55]
    : [SKY_MID, SKY_HORIZON, (f - 0.55) / 0.45];
  return [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * k));
}

export const SKIRT_LIT = [241, 246, 251];
export const SKIRT_SHADE = [203, 220, 235];
export const BASE_COLOUR = [188, 208, 226];

/**
 * The slab's dimensions for a given field.
 *
 * `thickness` is what the rim hangs below the ground, and `base` is where the
 * flat underside sits. The rim follows the ground at a constant thickness
 * instead of dropping to `base`, which is the whole reason the model works —
 * see the block comment in FallbackTerrain.jsx before changing it.
 */
export function slabFor(field) {
  /*
   * Thickness from the body of the mountain, not from its deepest point.
   *
   * One narrow valley should not make the plinth thicker. Monterosa gained
   * Alagna at 1,220 m, which dropped `lo` by 364 m without adding any surface
   * to speak of, and the slab went from a rim to 43% of the model — a wall
   * with a mountain on top of it. The 10th percentile is the same robust floor
   * the base matcher uses, for the same reason.
   *
   * The base still hangs below the true low point, or the deepest valley would
   * poke through the underside.
   */
  const floor = Number.isFinite(field.body) ? field.body : field.lo;
  const thickness = Math.max(field.hi - floor, 1) * SKIRT;
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
  const padX = (Math.max(...xs) - Math.min(...xs)) * FIELD_PAD;
  const padZ = (Math.max(...zs) - Math.min(...zs)) * FIELD_PAD;
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
  /**
   * How steep the quad is, 0 flat and 1 a wall, and a grain value that breaks
   * up the tone.
   *
   * Altitude alone decides nothing about what a piece of mountain is made of.
   * A flat shelf at 2,600 m is a snowfield and the north face below it is bare
   * rock, and a surface coloured purely by height paints both the same, which
   * is most of why the terrain read as a clay model rather than as ground. The
   * grain does the rest: real snow has wind features and rock outcrops, and a
   * single flat tone per cell has neither.
   */
  const steeps = new Float32Array(GRID * GRID);
  const grains = new Float32Array(GRID * GRID);
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
      // n[1] is the upward component of the unit normal, so it falls from 1 on
      // the flat to 0 on a wall. Exaggeration is already in it, which is right:
      // what should look like rock is what looks steep on screen.
      steeps[qAt(i, j)] = 1 - Math.max(0, Math.min(1, n[1]));
      // Two octaves at different scales, so the surface has both broad patches
      // and a finer speckle. Tied to the cell like the height noise above, or
      // it aliases the moment a smaller resort uses the same grid.
      const x = minX + dxW * (i + 0.5);
      const z = minZ + dzW * (j + 0.5);
      grains[qAt(i, j)] =
        (fbm(x / (cell * 3.1), z / (cell * 3.1)) - 0.5) * 0.7 +
        (fbm(x / (cell * 0.9), z / (cell * 0.9)) - 0.5) * 0.3;
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

  /*
   * Cast shadows: whether a ridge is standing between this ground and the sun.
   *
   * The hillshade above says which way a face is turned, which is a different
   * question and the easier one. It is why the terrain has always looked lit
   * but never looked like a mountain in the afternoon: a north face and the
   * bowl behind a ridge are shaded identically, when in life one is grey and
   * the other is blue and you can see the line between them from the lift.
   *
   * Marched toward the sun in visual space — heights times the exaggeration —
   * so the shadows agree with the shading, which is built from the exaggerated
   * normal, and with the projection, which draws the same exaggerated
   * mountain. Shadows cast by a mountain of the true proportions would fall in
   * the wrong places on this one.
   *
   * Geometric steps rather than even ones. What blocks the sun is either a
   * bank a few metres away or a ridge kilometres off, and stepping finely
   * enough for the first all the way out to the second is thirty times the
   * work for the same answer.
   *
   * Once per mountain, not per frame: it depends on the terrain and the sun,
   * and neither moves while someone is looking at it.
   */
  let shadows = new Float32Array(GRID * GRID);
  {
    const cellW = Math.min(dxW, dzW);
    for (let i = 0; i < GRID; i++) {
      for (let j = 0; j < GRID; j++) {
        const x0 = minX + dxW * (i + 0.5);
        const z0 = minZ + dzW * (j + 0.5);
        const y0 = sample(x0, z0) * VERT_EXAGGERATION;
        let blocked = 0;
        let t = cellW * 0.6;
        for (let k = 0; k < SHADOW_STEPS; k++) {
          const x = x0 + SUN[0] * t;
          const z = z0 + SUN[2] * t;
          if (x < minX || x > maxX || z < minZ || z > maxZ) break;
          // How far the terrain rises above the ray, in visual metres. A
          // magnitude rather than a flag: a ridge that clears the ray by a
          // hair is a soft edge, and a binary test draws it as a cliff.
          const over = sample(x, z) * VERT_EXAGGERATION - (y0 + SUN[1] * t);
          if (over > blocked) blocked = over;
          t *= SHADOW_GROWTH;
        }
        shadows[qAt(i, j)] = Math.max(0, Math.min(1, blocked / SHADOW_SOFT));
      }
    }
    // Smoothed the same way and for the same reason as the hillshade: the
    // march is one ray per quad, so its edges land on quad boundaries and
    // read as stairs down the side of a ridge.
    for (let pass = 0; pass < 2; pass++) {
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
              sum += shadows[qAt(a, b)];
              count++;
            }
          }
          next[qAt(i, j)] = sum / count;
        }
      }
      shadows = next;
    }
  }

  // The height a tenth of the ground is below: the bottom of the mountain
  // proper, as opposed to the bottom of its deepest single valley.
  const sorted = Array.from(heights).sort((a, b) => a - b);
  const body = sorted[Math.floor(sorted.length * 0.1)];

  return {
    proj, heights, at, sample, shades, shadows, steeps, grains, qAt,
    minX, maxX, minZ, maxZ, lo, hi, body,
    cx: (minX + maxX) / 2,
    cz: (minZ + maxZ) / 2,
    cy: (lo + hi) / 2,
    span: Math.max(maxX - minX, maxZ - minZ),
  };
}

/**
 * Project a world point into unit screen space, from a camera above the ground.
 *
 * Pitch is measured from straight down: 0 looks vertically down on the resort,
 * 75 is the flattest the camera goes and still sits 15 degrees above the
 * horizon. There is no pitch at which the camera is underneath the terrain,
 * which is the point — it was, once. `depth` grew with altitude, so a summit
 * sorted as further away than the valley beside it and the painter's algorithm
 * drew the valley over the peak, and `w` grew with it so near ground drew
 * smaller than far ground. On screen it showed up as the slab's flat underside
 * being visible, which can only happen from below.
 *
 * With the camera's elevation above the horizon e = 90 - pitch, so that
 * sin e = cos p and cos e = sin p, looking along +rz from -rz:
 *   depth    =  P . direction = rz sin p - py cos p
 *   screen y = -(P . up)      = -rz cos p - py sin p
 */
export function toUnit(field, x, y, z, view) {
  const b = (view.bearing * Math.PI) / 180;
  const p = (view.pitch * Math.PI) / 180;
  const px = x - field.cx;
  const py = (y - field.cy) * VERT_EXAGGERATION;
  const pz = z - field.cz;
  const rx = px * Math.cos(b) - pz * Math.sin(b);
  const rz = px * Math.sin(b) + pz * Math.cos(b);
  const sy = -rz * Math.cos(p) - py * Math.sin(p);
  const depth = rz * Math.sin(p) - py * Math.cos(p);
  const w = field.span * 1.45 + depth;
  return { u: rx / w, v: sy / w, depth };
}
