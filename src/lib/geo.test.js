/**
 * Geometry checks. Run with: node src/lib/geo.test.js
 *
 * Same idiom as solver.test.js — behavioural assertions, not unit tests for
 * their own sake. These exist because snapping a GPS fix to the wrong node
 * sends someone down the wrong side of the mountain, and that failure is
 * invisible until you are standing in the wrong valley.
 */

import { nearestNode, metresBetween, routeBounds, edgeCoords } from "./geo.js";
import { NODES, buildEdges } from "../resort.js";

let failures = 0;
function check(name, condition, detail = "") {
  const status = condition ? "PASS" : "FAIL";
  if (!condition) failures++;
  console.log(`  ${status}  ${name}${detail ? "  — " + detail : ""}`);
}

console.log("\nDISTANCE");
// Staffal to Champoluc is about 9km as the crow flies, across two valleys.
const staffalToChampoluc = metresBetween(45.879, 7.818, 45.818, 7.727);
check(
  "Staffal to Champoluc is 8-11 km straight line",
  staffalToChampoluc > 8000 && staffalToChampoluc < 11000,
  `${Math.round(staffalToChampoluc)} m`
);
check("a point is zero metres from itself", metresBetween(45.879, 7.818, 45.879, 7.818) === 0);
check(
  "distance is symmetric",
  Math.abs(
    metresBetween(45.879, 7.818, 45.889, 7.873) - metresBetween(45.889, 7.873, 45.879, 7.818)
  ) < 0.001
);

console.log("\nSNAPPING A GPS FIX TO THE GRAPH");
// Standing exactly on a station.
for (const key of Object.keys(NODES)) {
  const node = NODES[key];
  const { key: got, metres } = nearestNode(node.lat, node.lon);
  if (got !== key || metres > 1) {
    check(`standing at ${node.name} snaps to itself`, false, `got ${got} at ${Math.round(metres)} m`);
  }
}
check(
  "standing at any station snaps to that station",
  Object.keys(NODES).every((key) => nearestNode(NODES[key].lat, NODES[key].lon).key === key)
);

// Fifty metres off a station — a realistic phone fix in trees.
const jittered = nearestNode(45.879 + 0.0004, 7.818 + 0.0004);
check("a 50 m jitter still snaps to Staffal", jittered.key === "staffal", `${Math.round(jittered.metres)} m`);

// The actual contract: whatever comes back is the closest node, full stop.
// Checked exhaustively over a grid covering the resort rather than on one
// hand-picked point.
const brute = (lat, lon) => {
  let best = null;
  let bestM = Infinity;
  for (const key of Object.keys(NODES)) {
    const m = metresBetween(lat, lon, NODES[key].lat, NODES[key].lon);
    if (m < bestM) { bestM = m; best = key; }
  }
  return best;
};
let gridChecked = 0;
let gridWrong = 0;
for (let lat = 45.81; lat <= 45.9; lat += 0.005) {
  for (let lon = 7.72; lon <= 7.94; lon += 0.005) {
    gridChecked++;
    if (nearestNode(lat, lon).key !== brute(lat, lon)) gridWrong++;
  }
}
check(
  "always returns the genuinely closest node",
  gridWrong === 0,
  `${gridChecked} points across the resort, ${gridWrong} wrong`
);

// Worth stating plainly: nodes are lift stations and junctions, not a dense
// trace of the piste. Halfway down a long run the closest STATION can belong
// to a different run — Salati to Gabiet's midpoint is nearest Punta Indren.
// That is correct behaviour for this graph, not a snapping bug, and it is why
// the mid-day flow asks "you are at" with a picker rather than trusting the
// fix silently.
const midRun = nearestNode((45.889 + 45.87) / 2, (7.873 + 7.833) / 2);
check(
  "mid-run fixes still land on the mountain, even if not on that run",
  midRun.metres < 6000,
  `${midRun.key} at ${Math.round(midRun.metres)} m`
);

console.log("\nFIXES THAT ARE NOT ON THIS MOUNTAIN");
// The app rejects anything beyond 6 km. These are the cases that has to catch.
const faraway = [
  ["Milan", 45.4642, 9.19],
  ["Zermatt", 46.0207, 7.7491],
  ["Chamonix", 45.9237, 6.8694],
  ["Courmayeur", 45.7917, 6.9694],
  ["the North Sea", 56.0, 3.0],
];
for (const [name, lat, lon] of faraway) {
  const { metres } = nearestNode(lat, lon);
  check(`${name} is further than 6 km from any node`, metres > 6000, `${Math.round(metres / 1000)} km`);
}
// And the case that must NOT be rejected: on the hill but between stations.
const onHill = nearestNode(45.8735, 7.8255);
check(
  "a fix between Staffal and Gabiet is within 6 km",
  onHill.metres < 6000,
  `${Math.round(onHill.metres)} m from ${onHill.key}`
);

console.log("\nRESTRICTING THE SEARCH");
const basesOnly = Object.keys(NODES).filter((k) => NODES[k].base);
const nearGabiet = nearestNode(NODES.gabiet.lat, NODES.gabiet.lon, basesOnly);
check(
  "searching bases only never returns a mid-mountain node",
  basesOnly.includes(nearGabiet.key),
  `${nearGabiet.key} at ${Math.round(nearGabiet.metres)} m`
);

console.log("\nROUTE GEOMETRY");
const edges = buildEdges();
const fakeRoute = { segments: [edges[0], edges[1]] };
const bbox = routeBounds(fakeRoute);
check("bounds are [w, s, e, n] and ordered", bbox[0] < bbox[2] && bbox[1] < bbox[3], JSON.stringify(bbox.map((n) => n.toFixed(3))));
check(
  "bounds contain every node on the route",
  [fakeRoute.segments[0].from, ...fakeRoute.segments.map((e) => e.to)].every(
    (k) => NODES[k].lon >= bbox[0] && NODES[k].lon <= bbox[2] && NODES[k].lat >= bbox[1] && NODES[k].lat <= bbox[3]
  )
);

const coords = edgeCoords(edges[0]);
check("an edge draws as a polyline, not two points", coords.length > 5, `${coords.length} points`);
check(
  "the polyline starts and ends on its own nodes",
  Math.abs(coords[0][0] - NODES[edges[0].from].lon) < 1e-9 &&
    Math.abs(coords[coords.length - 1][1] - NODES[edges[0].to].lat) < 1e-9
);
check(
  "the same edge always draws identically",
  JSON.stringify(edgeCoords(edges[0])) === JSON.stringify(coords)
);
check(
  "lifts run straighter than pistes",
  (() => {
    const straightness = (edge) => {
      const pts = edgeCoords(edge);
      const direct = Math.hypot(
        pts[pts.length - 1][0] - pts[0][0],
        pts[pts.length - 1][1] - pts[0][1]
      );
      let along = 0;
      for (let i = 1; i < pts.length; i++) {
        along += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      }
      return direct / along;
    };
    const lifts = edges.filter((e) => e.kind === "lift").map(straightness);
    const runs = edges.filter((e) => e.kind === "run").map(straightness);
    const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
    return mean(lifts) > mean(runs);
  })()
);

console.log("\n" + (failures ? `${failures} FAILING` : "all geometry checks passed"));
process.exit(failures ? 1 : 0);
