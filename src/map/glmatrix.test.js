/**
 * The GPU camera and the CPU camera are the same camera.
 *
 * The terrain is drawn by WebGL from a matrix; the piste network, the route,
 * the labels and the markers are drawn in Canvas 2D from `toUnit`. If those
 * two disagree by even a pixel the map is wrong in the way that is hardest to
 * see and worst to have: everything lines up at the framing you happen to
 * check and drifts apart at some bearing you did not.
 *
 * So the matrix is derived from the projection rather than written alongside
 * it, and this is the assertion that keeps them married. Checked over the
 * whole range of bearings and pitches the camera allows, on real resort
 * geometry, at points spread through the field rather than at its centre.
 */
import { buildField, toUnit } from "./field.js";
import { glMatrix, applyMatrix } from "./glmatrix.js";
import { NODES as MONTEROSA } from "../resort.js";
import { projectorFor } from "../lib/projector.js";

let failures = 0;
let ran = 0;
const check = (name, pass, detail = "") => {
  ran++;
  if (!pass) failures++;
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
};

const field = buildField(MONTEROSA, () => projectorFor(MONTEROSA));
const WIDTH = 393;
const HEIGHT = 852;

/** What Canvas 2D would do with a point. */
const cpu = (x, y, z, view, cam) => {
  const u = toUnit(field, x, y, z, view);
  return { x: cam.ox + u.u * cam.f, y: cam.oy + u.v * cam.f, depth: u.depth };
};

// A spread of points over the whole field, at real ground height, plus the
// extremes: a corner is where a small error in the rotation shows up.
const points = [];
for (let i = 0; i <= 4; i++) {
  for (let j = 0; j <= 4; j++) {
    const x = field.minX + ((field.maxX - field.minX) * i) / 4;
    const z = field.minZ + ((field.maxZ - field.minZ) * j) / 4;
    points.push([x, field.sample(x, z), z]);
  }
}
points.push([field.cx, field.hi, field.cz]);
points.push([field.cx, field.lo, field.cz]);

console.log("\nTHE GPU CAMERA IS THE CAMERA");

let worst = 0;
let worstAt = "";
for (const bearing of [-180, -117, -28, 0, 41, 96, 152, 180]) {
  for (const pitch of [0, 17, 46, 62, 75, 84]) {
    for (const zoom of [1, 2.6, 7.4]) {
      const view = { bearing, pitch, zoom };
      // `fit` is the component's; here any plausible camera will do, because
      // the matrix takes f, ox and oy as given and the question is whether it
      // uses them the way `project` does.
      const cam = { f: 1180 * zoom, ox: WIDTH * 0.5 + 12, oy: HEIGHT * 0.42 - 30 };
      const m = glMatrix(field, view, cam, WIDTH, HEIGHT);
      for (const [x, y, z] of points) {
        const a = cpu(x, y, z, view, cam);
        const b = applyMatrix(m, x, y, z, WIDTH, HEIGHT);
        const off = Math.hypot(a.x - b.x, a.y - b.y);
        if (off > worst) {
          worst = off;
          worstAt = `bearing ${bearing}, pitch ${pitch}, zoom ${zoom}`;
        }
      }
    }
  }
}
check("the matrix puts every point where the projection does",
  worst < 0.001, `worst ${worst.toExponential(1)}px, at ${worstAt}`);

/*
 * And the depth it writes sorts the same way.
 *
 * The z-buffer only has to agree with `toUnit`'s depth on ORDER — the actual
 * value is a different mapping — but getting the sign wrong is a mountain
 * drawn inside out, which looks like dramatic lighting rather than like a bug.
 */
{
  const view = { bearing: -28, pitch: 62, zoom: 1 };
  const cam = { f: 1180, ox: WIDTH / 2, oy: HEIGHT * 0.45 };
  const m = glMatrix(field, view, cam, WIDTH, HEIGHT);
  let wrong = 0;
  let pairs = 0;
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const a = cpu(...points[i], view, cam);
      const b = cpu(...points[j], view, cam);
      if (Math.abs(a.depth - b.depth) < 1) continue;
      const ga = applyMatrix(m, ...points[i], WIDTH, HEIGHT);
      const gb = applyMatrix(m, ...points[j], WIDTH, HEIGHT);
      pairs++;
      if ((a.depth < b.depth) !== (ga.w < gb.w)) wrong++;
    }
  }
  check("and orders them front to back the same way", wrong === 0,
    `${wrong} of ${pairs} pairs out of order`);
  // Every point in front of the near plane, or the terrain is clipped away.
  const behind = points.filter((q) => applyMatrix(m, ...q, WIDTH, HEIGHT).w <= 0);
  check("with nothing behind the camera", behind.length === 0, `${behind.length} of ${points.length}`);
}

/*
 * A resort's own centre and span are in the matrix, so a second resort with a
 * different centre must not be projected with the first one's.
 */
{
  const OTHER = {
    a: { name: "A", lat: 43.10, lon: 6.20, alt: 900 },
    b: { name: "B", lat: 43.14, lon: 6.26, alt: 1800 },
    c: { name: "C", lat: 43.08, lon: 6.28, alt: 1200 },
  };
  const other = buildField(OTHER, () => projectorFor(OTHER));
  const view = { bearing: 33, pitch: 55, zoom: 1 };
  const cam = { f: 900, ox: 190, oy: 400 };
  const m = glMatrix(other, view, cam, WIDTH, HEIGHT);
  const x = other.cx + 300;
  const z = other.cz - 200;
  const y = other.sample(x, z);
  const a = { ...toUnit(other, x, y, z, view) };
  const want = { x: cam.ox + a.u * cam.f, y: cam.oy + a.v * cam.f };
  const got = applyMatrix(m, x, y, z, WIDTH, HEIGHT);
  check("and another resort is projected with its own centre",
    Math.hypot(want.x - got.x, want.y - got.y) < 0.001,
    `${Math.hypot(want.x - got.x, want.y - got.y).toExponential(1)}px`);
}

console.log(failures
  ? `\n  ${failures} FAILING of ${ran} checks\n`
  : `\n  the two cameras agree, all ${ran} checks\n`);
process.exit(failures ? 1 : 0);
