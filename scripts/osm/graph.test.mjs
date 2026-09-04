/**
 * Pipeline checks. Run with: node scripts/osm/graph.test.mjs
 *
 * The fixture is synthetic on purpose, and every element in it reproduces one
 * of the specific ways OSM ski data is messy. A pipeline that only works on
 * tidy input is not a pipeline, because tidy input is not what is out there.
 *
 * Elevation is a closed-form function of latitude here, so every altitude in
 * the expected results is arithmetic rather than a guess: at 46.150 the ground
 * is 1000 m and it climbs 500 m per hundredth of a degree north.
 */
import { build, metres, wayLength, runMinutes, liftMinutes, DIFFICULTY } from "./graph.mjs";
import { BOARDING_MINUTES, LIFT_SPEED_MS } from "../../src/lib/pace.js";
import { prune, check } from "./validate.mjs";
import { decode } from "./elevation.mjs";

let failures = 0;
function is(name, condition, detail = "") {
  const status = condition ? "PASS" : "FAIL";
  if (!condition) failures++;
  console.log(`  ${status}  ${name}${detail ? "  — " + detail : ""}`);
}

const elevation = (lat) => 1000 + (lat - 46.15) * 50000;
const at = (lat, lon) => ({ lat, lon });

/** A toy mountain with every defect the real ones have. */
const OSM = {
  elements: [
    // --- named places -----------------------------------------------------
    { type: "node", id: 1, lat: 46.15, lon: 11.0, tags: { aerialway: "station", name: "Valley" } },
    { type: "node", id: 2, lat: 46.16, lon: 11.01, tags: { aerialway: "station", name: "Middle" } },
    { type: "node", id: 3, lat: 46.17, lon: 11.02, tags: { natural: "peak", name: "Summit" } },
    // A restaurant at the middle station: lunch has to be findable.
    { type: "way", id: 90, center: { lat: 46.1601, lon: 11.0101 }, tags: { amenity: "restaurant", name: "Rifugio Mezzo" } },
    // And one down in the village, too far from any node to count.
    { type: "node", id: 91, lat: 46.1400, lon: 11.0, tags: { amenity: "restaurant", name: "Pizzeria" } },

    // --- lifts ------------------------------------------------------------
    // Duration is mapped, so it must be used rather than estimated.
    { type: "way", id: 10, tags: { aerialway: "gondola", name: "Valley gondola", "aerialway:duration": "7" },
      nodes: [1, 2], geometry: [at(46.15, 11.0), at(46.16, 11.01)] },
    // No duration: estimated from length and the speed a chair runs at.
    { type: "way", id: 11, tags: { aerialway: "chair_lift", name: "Summit chair" },
      nodes: [2, 3], geometry: [at(46.16, 11.01), at(46.17, 11.02)] },
    // Drawn downhill. A lift goes up whichever way the mapper drew it.
    { type: "way", id: 12, tags: { aerialway: "drag_lift", name: "Nursery drag" },
      nodes: [30, 31], geometry: [at(46.1555, 11.004), at(46.152, 11.001)] },
    // Not a lift, whatever the marketing says.
    { type: "way", id: 13, tags: { aerialway: "zip_line", name: "Zip wire" },
      nodes: [1, 3], geometry: [at(46.15, 11.0), at(46.17, 11.02)] },

    // --- pistes -----------------------------------------------------------
    { type: "way", id: 20, tags: { "piste:type": "downhill", "piste:difficulty": "intermediate", name: "Summit red" },
      nodes: [3, 40, 2], geometry: [at(46.17, 11.02), at(46.165, 11.015), at(46.16, 11.01)] },
    // Starts 25 m from the middle station rather than exactly on it, which is
    // what tracing from a GPS trace against someone else's imagery looks like.
    { type: "way", id: 21, tags: { "piste:type": "downhill", "piste:difficulty": "easy", name: "Valley blue" },
      nodes: [41, 42, 1], geometry: [at(46.16022, 11.01), at(46.155, 11.005), at(46.15, 11.0)] },
    // No difficulty tag at all.
    { type: "way", id: 22, tags: { "piste:type": "downhill", name: "Direct" },
      nodes: [3, 43, 1], geometry: [at(46.17, 11.02), at(46.16, 11.005), at(46.15, 11.0)] },
    // No name either.
    { type: "way", id: 23, tags: { "piste:type": "downhill", "piste:difficulty": "novice" },
      nodes: [31, 30], geometry: [at(46.152, 11.001), at(46.1555, 11.004)] },
    // A one-way trap: skiable down, nothing comes back. Must not survive.
    { type: "way", id: 24, tags: { "piste:type": "downhill", "piste:difficulty": "advanced", name: "The trap" },
      nodes: [3, 50], geometry: [at(46.17, 11.02), at(46.18, 11.04)] },
    // Broken geometry.
    { type: "way", id: 25, tags: { "piste:type": "downhill", "piste:difficulty": "easy", name: "Ghost" }, nodes: [1] },
    // A stub shorter than a chairlift queue.
    { type: "way", id: 26, tags: { "piste:type": "downhill", "piste:difficulty": "easy", name: "Stub" },
      nodes: [1, 60], geometry: [at(46.15, 11.0), at(46.1501, 11.0001)] },
  ],
};

console.log("\nGEOMETRY");
is("a degree of latitude is about 111 km", Math.abs(metres(46, 11, 47, 11) - 111195) < 500, `${Math.round(metres(46, 11, 47, 11))} m`);
is("zero distance is zero", metres(46, 11, 46, 11) === 0);
is("way length adds its spans", Math.abs(wayLength([at(46.15, 11), at(46.16, 11), at(46.17, 11)]) - metres(46.15, 11, 46.17, 11)) < 2);

console.log("\nTERRARIUM DECODING");
is("sea level", decode(128, 0, 0) === 0);
is("1830 m round-trips", decode(Math.floor((1830 + 32768) / 256), (1830 + 32768) % 256, 0) === 1830);
is("below sea level is negative", decode(127, 255, 0) === -1);

console.log("\nDIFFICULTY MAPS THE SAFE DIRECTION");
is("novice is blue, not green", DIFFICULTY.novice === "blue");
is("easy is blue", DIFFICULTY.easy === "blue");
is("intermediate is red", DIFFICULTY.intermediate === "red");
is("advanced rounds up to black, never down to red", DIFFICULTY.advanced === "black");
is("expert is black", DIFFICULTY.expert === "black");

console.log("\nTIMES");
// The mapped duration is the cable time between stations. Walking into the
// cabin and out of it at the top is not in it, and thirty lifts a day is half
// an hour of a plan that was not accounted for anywhere.
is("a mapped aerialway:duration is trusted for the cable time",
  liftMinutes({ tags: { aerialway: "gondola", "aerialway:duration": "7" } }, 1400) === 7 + BOARDING_MINUTES);
is('"5:30" is five and a half minutes on the cable',
  liftMinutes({ tags: { aerialway: "gondola", "aerialway:duration": "5:30" } }, 1400) === 6 + BOARDING_MINUTES);
is("an absent duration is estimated from length",
  liftMinutes({ tags: { aerialway: "chair_lift" } }, 1560) === 12,
  `${liftMinutes({ tags: { aerialway: "chair_lift" } }, 1560)} min`);
is("and boarding is on top of it either way",
  liftMinutes({ tags: { aerialway: "chair_lift" } }, 1560) >
  Math.round(1560 / LIFT_SPEED_MS.chair / 60));

// Harder is slower. A confident skier goes down a black fast; most people on
// one traverse it, stop more, and get to the bottom later than they would have
// on a blue of the same length. Planning for the confident case strands
// everyone else at the last lift.
is("a black is not planned faster than a blue of the same shape",
  runMinutes(3000, 600, "black") > runMinutes(3000, 600, "blue"),
  `${runMinutes(3000, 600, "black")} against ${runMinutes(3000, 600, "blue")} min`);
is("and a red sits between them",
  runMinutes(3000, 600, "red") > runMinutes(3000, 600, "blue") &&
  runMinutes(3000, 600, "red") < runMinutes(3000, 600, "black"));
// The whole point of this change: 27 km/h on every run was race pace and it
// produced twelve thousand metre days.
is("a long blue is a recreational pace, not a race pace",
  (() => { const kmh = 4.4 / (runMinutes(4400, 620, "blue") / 60); return kmh > 14 && kmh < 21; })(),
  `${(4.4 / (runMinutes(4400, 620, "blue") / 60)).toFixed(1)} km/h`);
is("a nonsense duration is ignored", liftMinutes({ tags: { aerialway: "gondola", "aerialway:duration": "999" } }, 1100) > 0);
is("a steeper run of the same length is not slower", runMinutes(2000, 600, "red") <= runMinutes(2000, 100, "red"));
is("no run takes zero minutes", runMinutes(45, 5, "blue") >= 1);

console.log("\nBUILDING THE GRAPH");
const raw = build(OSM, { tolerance: 45, elevation: (lat) => elevation(lat) });
const names = Object.values(raw.NODES).map((n) => n.name);
is("the named stations become named nodes", ["Valley", "Middle", "Summit"].every((n) => names.includes(n)), names.join(", "));
is("a zip line is not a lift", !raw.LIFTS.some((l) => /Zip/.test(l.name)), raw.LIFTS.map((l) => l.name).join(", "));
is("a way with no geometry is dropped", raw.report.droppedNoGeometry === 1, `${raw.report.droppedNoGeometry}`);
is("a missing difficulty is counted, not silently defaulted", raw.report.difficultyAssumed === 1, `${raw.report.difficultyAssumed}`);
is("an unnamed run is counted", raw.report.unnamedRuns === 1, `${raw.report.unnamedRuns}`);
is("a stub shorter than 40 m is not a run", !raw.RUNS.some((r) => r.name === "Stub"));

console.log("\nTHE MESSY CASES");
const middle = Object.entries(raw.NODES).find(([, n]) => n.name === "Middle");
is("a piste starting 25 m from a station is joined to it", Boolean(middle) &&
  raw.RUNS.some((r) => r.name === "Valley blue" && r.from === middle[0]),
  raw.RUNS.filter((r) => r.name === "Valley blue").map((r) => `${r.from}->${r.to}`).join(", "));
is("a lift drawn downhill is stored uphill", raw.LIFTS.every((l) => raw.NODES[l.to].alt >= raw.NODES[l.from].alt),
  raw.LIFTS.map((l) => `${l.name} ${raw.NODES[l.from].alt}->${raw.NODES[l.to].alt}`).join(" | "));
is("every run is stored downhill", raw.RUNS.every((r) => raw.NODES[r.from].alt >= raw.NODES[r.to].alt));
is("altitudes come from the elevation source at the node's own position",
  Object.values(raw.NODES).every((n) => n.alt === Math.round(elevation(n.lat))),
  `Middle is ${raw.NODES[middle[0]].alt} m at ${raw.NODES[middle[0]].lat}`);
is("and a merged node sits between the points that formed it",
  raw.NODES[middle[0]].lat > 46.16 && raw.NODES[middle[0]].lat < 46.16022,
  `${raw.NODES[middle[0]].lat}`);
is("a restaurant at a station marks it for lunch", raw.NODES[middle[0]].rifugio === true);
const valley = Object.entries(raw.NODES).find(([, n]) => n.name === "Valley");
is("a restaurant down in the village does not", raw.NODES[valley[0]].rifugio !== true);

console.log("\nPRUNING TO WHAT CANNOT STRAND YOU");
const pruned = prune(raw);
is("the one-way trap is removed", !pruned.RUNS.some((r) => r.name === "The trap"),
  pruned.RUNS.map((r) => r.name).join(", "));
is("and the dead end it led to goes with it", Object.values(pruned.NODES).length < Object.values(raw.NODES).length,
  `${Object.keys(raw.NODES).length} to ${Object.keys(pruned.NODES).length}`);
is("what it dropped is reported", pruned.report.runsDropped >= 1, `${pruned.report.runsDropped} runs, ${pruned.report.nodesDropped} nodes`);
is("the skiable core survives", pruned.LIFTS.length >= 2 && pruned.RUNS.length >= 2,
  `${pruned.LIFTS.length} lifts, ${pruned.RUNS.length} runs`);

console.log("\nWHAT IS LEFT IS ROUTABLE");
const withBases = { ...pruned, NODES: Object.fromEntries(Object.entries(pruned.NODES).map(([k, n]) =>
  [k, n.name === "Valley" ? { ...n, base: true } : n])) };
const problems = check(withBases);
is("it passes every safety check", problems.length === 0, problems.join(" | "));
is("every edge joins two nodes that exist", [...pruned.LIFTS, ...pruned.RUNS].every((e) => pruned.NODES[e.from] && pruned.NODES[e.to]));

console.log("\nAND THE CHECKS THEMSELVES CATCH REAL FAULTS");
const broken = {
  NODES: { a: { name: "A", lat: 46, lon: 11, alt: 1000, base: true }, b: { name: "B", lat: 46.1, lon: 11, alt: 2000, base: true } },
  LIFTS: [{ from: "b", to: "a", name: "Downhill lift", minutes: 5 }],
  RUNS: [{ from: "a", to: "b", name: "Uphill run", difficulty: "purple", minutes: 0 }],
};
const caught = check(broken);
is("a lift that goes downhill is caught", caught.some((p) => /goes downhill/.test(p)));
is("a run that goes uphill is caught", caught.some((p) => /goes uphill/.test(p)));
is("a difficulty that is not a piste colour is caught", caught.some((p) => /purple/.test(p)));
is("a zero-minute run is caught", caught.some((p) => /takes no time/.test(p)));
const stranded = check({
  NODES: {
    a: { name: "A", lat: 46, lon: 11, alt: 1000, base: true },
    b: { name: "B", lat: 46.01, lon: 11, alt: 2000 },
    c: { name: "C", lat: 46.5, lon: 11.5, alt: 1200, base: true },
  },
  LIFTS: [{ from: "a", to: "b", name: "Up", minutes: 6 }],
  RUNS: [{ from: "b", to: "a", name: "Down", difficulty: "red", minutes: 8 }],
});
is("a base no other base can reach is caught", stranded.some((p) => /cannot reach/.test(p)), stranded.join(" | "));

console.log("\nREAL OVERPASS DEFECTS THE FIXTURES NEVER HAD");
// Overpass leaves a null in the geometry array for a vertex it will not
// resolve, keeping it the same length as the node refs. The first real fetch of
// Monterosa had two of these: the Alagna-Pianalunga gondola with five leading
// holes, and the Alagna black with twenty-four trailing ones. Before this was
// handled, wayLength dereferenced the null and the whole build died with
// "Cannot read properties of null".
const holed = {
  elements: [
    { type: "node", id: 1, lat: 46.15, lon: 11.0, tags: { aerialway: "station", name: "Valley" } },
    { type: "node", id: 3, lat: 46.17, lon: 11.02, tags: { natural: "peak", name: "Summit" } },
    // Leading holes, as the gondola had.
    { type: "way", id: 10, tags: { aerialway: "gondola", name: "Holed gondola" },
      nodes: [98, 99, 1, 2, 3],
      geometry: [null, null, at(46.15, 11.0), at(46.16, 11.01), at(46.17, 11.02)] },
    // An interior hole: the length is measured straight across the gap.
    { type: "way", id: 20, tags: { "piste:type": "downhill", "piste:difficulty": "intermediate", name: "Holed red" },
      nodes: [3, 40, 41, 1],
      geometry: [at(46.17, 11.02), at(46.165, 11.015), null, at(46.15, 11.0)] },
    // Trailing holes, as the black had.
    { type: "way", id: 21, tags: { "piste:type": "downhill", "piste:difficulty": "easy", name: "Holed blue" },
      nodes: [3, 42, 1, 96, 97],
      geometry: [at(46.17, 11.02), at(46.16, 11.005), at(46.15, 11.0), null, null] },
  ],
};
let holedGraph = null;
try {
  holedGraph = build(structuredClone(holed), { tolerance: 45, elevation: (lat) => elevation(lat) });
  is("a way with null vertices does not crash the build", true);
} catch (error) {
  is("a way with null vertices does not crash the build", false, error.message);
}
if (holedGraph) {
  is("the holes are counted rather than hidden",
    holedGraph.report.geometryHoles === 5 && holedGraph.report.waysWithHoles === 3,
    `${holedGraph.report.geometryHoles} holes across ${holedGraph.report.waysWithHoles} ways`);
  is("every surviving node still has real coordinates",
    Object.values(holedGraph.NODES).every((n) => Number.isFinite(n.lat) && Number.isFinite(n.lon)));
  // The point of stripping refs in lockstep: an off-by-one here would cut a
  // piste at the wrong vertex and put a junction somewhere nobody can ski to.
  is("the lift still runs valley to summit",
    holedGraph.LIFTS.length === 1 &&
    holedGraph.NODES[holedGraph.LIFTS[0].to].alt > holedGraph.NODES[holedGraph.LIFTS[0].from].alt);
  is("and its length is measured over the vertices that survived",
    Math.abs(holedGraph.LIFTS[0].metres - wayLength([at(46.15, 11.0), at(46.16, 11.01), at(46.17, 11.02)])) < 2,
    `${holedGraph.LIFTS[0].metres} m`);
}

// Without node refs no junction is findable, so every piste becomes one
// unsplittable edge. That builds a graph that looks fine and is not connected,
// which is worse than failing.
let refless = "built anyway";
try {
  build({ elements: holed.elements.map(({ nodes, ...rest }) => rest) },
    { tolerance: 45, elevation: (lat) => elevation(lat) });
} catch (error) {
  refless = error.message;
}
is("an export with no node references is refused, not silently flattened",
  refless.includes("node references"), refless.split("\n")[0]);

console.log("\n" + (failures ? `${failures} FAILING` : "all pipeline checks passed"));
process.exit(failures ? 1 : 0);
