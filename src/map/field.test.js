/**
 * The terrain and its slab belong to a resort, not to Monterosa.
 *
 * The map used to import Monterosa at module level, so a second resort would
 * have drawn the first one's mountain. These checks are what "the block adjusts
 * when the resort changes" means in numbers: nothing about the slab is a
 * constant, and every dimension moves with the terrain it is under.
 */
import { buildField, slabFor, toUnit, SKIRT, GRID } from "./field.js";
import { NODES as MONTEROSA, projector as monterosaProjector } from "../resort.js";

let failures = 0;
let ran = 0;
const check = (name, pass, detail = "") => {
  ran++;
  if (!pass) failures++;
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
};

/** A projector for any node set, the same maths resort.js uses. */
const projectorFor = (nodes) => () => {
  const lats = Object.values(nodes).map((n) => n.lat);
  const lons = Object.values(nodes).map((n) => n.lon);
  const lat0 = (Math.min(...lats) + Math.max(...lats)) / 2;
  const lon0 = (Math.min(...lons) + Math.max(...lons)) / 2;
  const mPerLon = 111320 * Math.cos((lat0 * Math.PI) / 180);
  return {
    lat0, lon0,
    project: (lat, lon) => ({ x: (lon - lon0) * mPerLon, z: -(lat - lat0) * 111320 }),
  };
};

// A second resort: smaller, lower, and a long way from the Alps, so nothing
// can pass by coincidence. Roughly Paganella's relief over a third of the area.
const OTHER = {
  a: { lat: 46.15, lon: 11.03, alt: 1030 },
  b: { lat: 46.17, lon: 11.05, alt: 1480 },
  c: { lat: 46.19, lon: 11.02, alt: 2120 },
  d: { lat: 46.16, lon: 11.07, alt: 1260 },
};

console.log("\nTHE TERRAIN BELONGS TO A RESORT");

const mono = buildField(MONTEROSA, monterosaProjector);
const other = buildField(OTHER, projectorFor(OTHER));

check("a resort's terrain covers its own ground", mono.span > other.span * 1.5,
  `${(mono.span / 1000).toFixed(1)}km vs ${(other.span / 1000).toFixed(1)}km`);
check("and reaches its own altitudes", mono.hi > other.hi + 500,
  `${mono.hi | 0}m vs ${other.hi | 0}m`);
check("the low point is its own too", Math.abs(mono.lo - other.lo) > 100,
  `${mono.lo | 0}m vs ${other.lo | 0}m`);

console.log("\nAND SO DOES THE SLAB UNDER IT");

const sMono = slabFor(mono);
const sOther = slabFor(other);

check("the slab is thicker under the bigger drop", sMono.thickness > sOther.thickness,
  `${sMono.thickness | 0}m vs ${sOther.thickness | 0}m`);
check("its underside sits at the resort's own floor", sMono.base !== sOther.base,
  `${sMono.base | 0}m vs ${sOther.base | 0}m`);
for (const [name, f, s] of [["monterosa", mono, sMono], ["the other", other, sOther]]) {
  check(`${name}: the slab is entirely below the ground`, s.base < f.lo,
    `base ${s.base | 0}m, lowest ground ${f.lo | 0}m`);
  check(`${name}: thickness is the stated share of the relief`,
    Math.abs(s.thickness - (f.hi - f.lo) * SKIRT) < 0.01,
    `${s.thickness.toFixed(1)}m of ${(f.hi - f.lo) | 0}m relief`);
  // The rim hangs a constant thickness below the ground rather than dropping to
  // the floor. Dropping to the floor is the wall that covers the mountain, so
  // this is the invariant worth pinning: no rim face is ever taller than the
  // slab is thick.
  let tallest = 0;
  const edges = [];
  for (let i = 0; i <= GRID; i++) {
    edges.push(f.heights[f.at(i, 0)], f.heights[f.at(i, GRID)]);
    edges.push(f.heights[f.at(0, i)], f.heights[f.at(GRID, i)]);
  }
  for (const h of edges) tallest = Math.max(tallest, h - Math.max(h - s.thickness, s.base));
  check(`${name}: no rim face is taller than the slab is thick`,
    tallest <= s.thickness + 0.01, `tallest ${tallest.toFixed(1)}m, thickness ${s.thickness.toFixed(1)}m`);
}

console.log("\nTHE CAMERA IS ABOVE THE MOUNTAIN");

// Pitch is measured from straight down, so every value in range is a camera
// looking down on the resort from somewhere above it. It has not always been:
// depth grew with altitude, which is a camera underneath the terrain looking
// up, and the visible symptom was the slab's flat underside on screen.
for (const pitch of [0, 20, 46, 75]) {
  const view = { bearing: -28, pitch, zoom: 1 };
  const mid = { x: mono.cx, z: mono.cz };
  const high = toUnit(mono, mid.x, mono.hi, mid.z, view);
  const low = toUnit(mono, mid.x, mono.lo, mid.z, view);

  check(`pitch ${pitch}: high ground is nearer than low ground below it`,
    high.depth < low.depth, `${high.depth | 0} against ${low.depth | 0}`);
  // Straight down is the one pitch where altitude cannot move a point up or
  // down the frame, because the frame is the ground plane.
  if (pitch > 0) {
    check(`pitch ${pitch}: and it is higher up the frame`,
      high.v < low.v, `${high.v.toFixed(3)} against ${low.v.toFixed(3)}`);
  }

  // Ground further from the camera sits higher on screen, toward the horizon,
  // and is drawn smaller. Both are the same fact about looking down at things.
  //
  // Which corner of the bbox is nearest depends on the bearing, so the probes
  // are placed along the view axis rather than picked from the corners: at
  // bearing 0 the rotation is the identity and +z is straight away from the
  // camera.
  const along = { bearing: 0, pitch, zoom: 1 };
  const far = toUnit(mono, mono.cx, mono.lo, mono.maxZ, along);
  const near = toUnit(mono, mono.cx, mono.lo, mono.minZ, along);
  if (pitch > 0) {
    check(`pitch ${pitch}: far ground is higher up the frame than near ground`,
      far.v < near.v, `${far.v.toFixed(3)} against ${near.v.toFixed(3)}`);
    check(`pitch ${pitch}: and further away`, far.depth > near.depth,
      `${far.depth | 0} against ${near.depth | 0}`);
    check(`pitch ${pitch}: so near ground is drawn larger`,
      Math.abs(near.u - toUnit(mono, mono.cx + 1000, mono.lo, mono.minZ, along).u) >
      Math.abs(far.u - toUnit(mono, mono.cx + 1000, mono.lo, mono.maxZ, along).u),
      "same 1km, wider on screen when near");
  }
}

// The perspective divisor is a distance, so it must never reach zero: a point
// at w = 0 is in the camera's eye and projects to infinity.
let worstW = Infinity;
for (const pitch of [0, 20, 46, 75]) {
  for (const x of [mono.minX, mono.maxX]) {
    for (const z of [mono.minZ, mono.maxZ]) {
      for (const y of [mono.lo - 400, mono.hi]) {
        const { u, v } = toUnit(mono, x, y, z, { bearing: 152, pitch, zoom: 1 });
        if (!Number.isFinite(u) || !Number.isFinite(v)) worstW = 0;
      }
    }
  }
}
check("no corner of the slab projects to infinity", worstW !== 0);

console.log("\nWHICH WAY BEARING TURNS THE PICTURE");

// The gesture code subtracts the finger twist from the bearing, and that sign
// is only correct because of what is asserted here. If the projection is ever
// changed so bearing turns the picture the other way, this fires and the
// rotate branch in FallbackTerrain.jsx has to flip with it.
{
  const view = (bearing) => ({ bearing, pitch: 46, zoom: 1 });
  const right = { x: mono.cx + mono.span * 0.3, y: mono.cy, z: mono.cz };
  const at0 = toUnit(mono, right.x, right.y, right.z, view(0));
  const at10 = toUnit(mono, right.x, right.y, right.z, view(10));
  // Screen v points down, so a landmark rising means a smaller v.
  check("increasing the bearing turns the picture anticlockwise",
    at10.v < at0.v, `a landmark on the right goes ${at0.v.toFixed(3)} to ${at10.v.toFixed(3)}`);
  check("and it is a real turn, not a wobble", Math.abs(at10.v - at0.v) > 0.005,
    `${Math.abs(at10.v - at0.v).toFixed(4)} of a screen per 10 degrees`);
}

console.log("\nAND IT IS THE SAME MOUNTAIN EVERY TIME");
const again = buildField(OTHER, projectorFor(OTHER));
check("rebuilding a resort gives an identical field",
  again.heights.every((h, i) => h === other.heights[i]) && again.lo === other.lo,
  `${again.heights.length} samples`);

console.log(failures ? `\n  ${failures} FAILING of ${ran} checks\n` : `\n  the terrain follows the resort, all ${ran} checks\n`);
process.exit(failures ? 1 : 0);
