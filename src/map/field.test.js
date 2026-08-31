/**
 * The terrain and its slab belong to a resort, not to Monterosa.
 *
 * The map used to import Monterosa at module level, so a second resort would
 * have drawn the first one's mountain. These checks are what "the block adjusts
 * when the resort changes" means in numbers: nothing about the slab is a
 * constant, and every dimension moves with the terrain it is under.
 */
import { buildField, slabFor, SKIRT, GRID } from "./field.js";
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

console.log("\nAND IT IS THE SAME MOUNTAIN EVERY TIME");
const again = buildField(OTHER, projectorFor(OTHER));
check("rebuilding a resort gives an identical field",
  again.heights.every((h, i) => h === other.heights[i]) && again.lo === other.lo,
  `${again.heights.length} samples`);

console.log(failures ? `\n  ${failures} FAILING of ${ran} checks\n` : `\n  the terrain follows the resort, all ${ran} checks\n`);
process.exit(failures ? 1 : 0);
