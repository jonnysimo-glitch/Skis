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
import { build, metres, wayLength, runMinutes, liftMinutes, DIFFICULTY, isHire, readable } from "./graph.mjs";
import { BOARDING_MINUTES, LIFT_SPEED_MS } from "../../src/lib/pace.js";
import { prune, check } from "./validate.mjs";
import { stitch, LINK_REACH } from "./stitch.mjs";
import { contractChains, nameRuns } from "./simplify.mjs";
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
    // Drawn downhill. A lift goes up whichever way the mapper drew it. It also
    // returns to the middle station, so the nursery area is part of the
    // mountain rather than an island the prune would rightly discard.
    { type: "way", id: 12, tags: { aerialway: "drag_lift", name: "Nursery drag" },
      nodes: [31, 2], geometry: [at(46.16, 11.01), at(46.152, 11.001)] },
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
    // No difficulty tag at all. Crosses "Summit red" at node 40, sharing it,
    // which is exactly how OSM maps a junction and the only genuine one here.
    { type: "way", id: 22, tags: { "piste:type": "downhill", name: "Direct" },
      nodes: [3, 40, 43, 1],
      geometry: [at(46.17, 11.02), at(46.165, 11.015), at(46.16, 11.005), at(46.15, 11.0)] },
    // No name either. Runs from the middle station down to the nursery drag.
    { type: "way", id: 23, tags: { "piste:type": "downhill", "piste:difficulty": "novice" },
      nodes: [2, 30, 31],
      geometry: [at(46.16, 11.01), at(46.1555, 11.004), at(46.152, 11.001)] },
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

console.log("\nA JUNCTION IS A SHARED NODE, NOT EVERY VERTEX");
// Node 40 is interior to both "Summit red" and "Direct", which is how OSM maps
// a junction. Node 43 is interior to "Direct" alone and is just a bend in the
// piste. Counting the second as a junction turned every vertex of every piste
// into a graph node — 951 of them for Monterosa — chopping runs into
// hundred-metre fragments and merging neighbouring vertices into each other,
// which chained whole valleys into one blob and left the largest strongly
// connected component covering a single valley.
is("exactly one junction is found in the fixture", raw.report.junctions === 1,
  `${raw.report.junctions}`);
is("the piste that is crossed is split there",
  raw.RUNS.filter((r) => r.name === "Summit red").length === 2,
  raw.RUNS.filter((r) => r.name === "Summit red").map((r) => `${r.from}->${r.to}`).join(", "));
is("and a plain bend does not become a node",
  raw.RUNS.filter((r) => r.name === "Direct").length === 2,
  raw.RUNS.filter((r) => r.name === "Direct").map((r) => `${r.from}->${r.to}`).join(", "));
// The count that matters: a toy mountain with three lifts and six pistes must
// come out as a handful of places, not one per traced vertex.
is("the graph is places, not vertices", Object.keys(raw.NODES).length <= 10,
  `${Object.keys(raw.NODES).length} nodes`);

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
// A graph can pass every other check and still have nowhere to begin. The
// tolerance sweep produced exactly this: nineteen nodes, two lifts, plausible
// altitudes, and not one surviving base — so `defaultBase` would have fallen
// back to whichever node came first and the app would have opened a day at a
// mid-mountain junction instead of a car park.
const baseless = check({
  NODES: {
    a: { name: "A", lat: 46, lon: 11, alt: 1000 },
    b: { name: "B", lat: 46.1, lon: 11, alt: 2000 },
    c: { name: "C", lat: 46.2, lon: 11, alt: 1500 },
    d: { name: "D", lat: 46.3, lon: 11, alt: 1200 },
  },
  LIFTS: [{ from: "a", to: "b", name: "Up", minutes: 8 }],
  RUNS: [{ from: "b", to: "a", name: "Down", difficulty: "red", minutes: 9 }],
});
is("a graph with no base at all is caught", baseless.some((p) => /no base survived/.test(p)),
  baseless.join(" | ") || "nothing reported");

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

/*
 * A piste mapped as a polygon is not a route.
 *
 * OSM lets a wide slope be drawn as an area. Its perimeter runs up one side
 * and down the other and is twice as long as the slope it encloses, so tracing
 * it as a line invents a run that does not exist. Latemar was shipping ninety
 * such edges and thirty-seven kilometres of them, half its stated distance.
 */
console.log("\nA SNOW FIELD IS NOT A WAY DOWN IT");
{
  const withArea = {
    elements: [
      ...OSM.elements,
      // A closed polygon over the same ground as a real piste, sharing the
      // junction node so it would be cut into two long arcs if it were traced.
      { type: "way", id: 700,
        tags: { "piste:type": "downhill", "piste:difficulty": "intermediate", area: "yes", name: "The bowl" },
        nodes: [3, 2, 31, 3],
        geometry: [at(46.17, 11.02), at(46.16, 11.01), at(46.152, 11.001), at(46.17, 11.02)] },
    ],
  };
  const g = build(withArea, { tolerance: 45, elevation: (lat) => elevation(lat) });
  is("a polygon piste contributes no run", !g.RUNS.some((r) => r.name === "The bowl"),
    g.RUNS.filter((r) => r.name === "The bowl").length + " edges");
  is("and is reported rather than silently dropped", g.report.pisteAreasSkipped === 1,
    `${g.report.pisteAreasSkipped}`);
  is("while the lines around it are untouched",
    g.RUNS.length === build(OSM, { tolerance: 45, elevation: (lat) => elevation(lat) }).RUNS.length,
    `${g.RUNS.length} runs`);
}

/*
 * Rejoining what OSM leaves apart.
 *
 * Kronplatz's Ried is six kilometres of piste that stops 250 m short of the
 * gondola serving it, so it could be skied and never left and the prune
 * deleted all of it. The fixture reproduces exactly that shape: a long run off
 * the summit whose bottom lands near, but not on, the valley station.
 */
console.log("\nA RUN THAT STOPS SHORT OF ITS LIFT IS NOT THROWN AWAY");
{
  // 46.15225 is 250 m north of the valley station at 46.15 — five times the
  // clustering tolerance, and a walk you would actually make.
  const orphan = {
    elements: [
      ...OSM.elements,
      { type: "way", id: 800,
        tags: { "piste:type": "downhill", "piste:difficulty": "intermediate", name: "The long one" },
        nodes: [3, 801, 802],
        geometry: [at(46.17, 11.02), at(46.16, 11.03), at(46.15225, 11.0)] },
    ],
  };
  const raw = contractChains(build(orphan, { tolerance: 45, elevation: (lat) => elevation(lat) }));
  const withoutStitch = prune(raw);
  is("without stitching the run is lost entirely",
    !withoutStitch.RUNS.some((r) => r.name === "The long one"),
    withoutStitch.RUNS.map((r) => r.name).join(", "));

  const stitched = nameRuns(prune(stitch(raw)));
  is("stitching keeps it", stitched.RUNS.some((r) => r.name === "The long one"),
    stitched.RUNS.map((r) => r.name).join(", "));
  const links = stitched.RUNS.filter((r) => r.link);
  is("by adding a connector, not by inventing a piste", links.length === 1,
    `${links.length} links, ${stitched.RUNS.length - links.length} runs`);
  is("the connector is short enough to be a mapping gap",
    links.every((l) => l.metres <= LINK_REACH), `${links[0]?.metres} m`);
  is("it never climbs more than you would walk up",
    links.every((l) => stitched.NODES[l.to].alt - stitched.NODES[l.from].alt <= 20),
    `${links.map((l) => stitched.NODES[l.to].alt - stitched.NODES[l.from].alt).join(", ")} m`);
  is("it is timed at walking pace, not run pace",
    links.every((l) => l.minutes >= Math.round(l.metres / 100)),
    `${links[0]?.metres} m in ${links[0]?.minutes} min`);
  is("it is named for where it puts you",
    links.every((l) => /^Link to \S/.test(l.name) && !/Point \d/.test(l.name)),
    links.map((l) => l.name).join(", "));
  // A base has to be marked by hand here: the real pipeline gets them from the
  // resort config, and `check` rightly refuses a mountain with nowhere to start.
  const based = { ...stitched, NODES: Object.fromEntries(Object.entries(stitched.NODES)
    .map(([k, n]) => [k, n.name === "Valley" ? { ...n, base: true } : n])) };
  is("and the whole graph passes validation with it in",
    check(based).length === 0, check(based).slice(0, 2).join("; "));

  /*
   * The reach is spent only where it buys something.
   *
   * A stitcher that joined every pair of nearby nodes would quietly merge two
   * separate ski areas that share a bounding box — which is what Monterosa's
   * box would do with Cervinia. Nothing already strongly connected may gain an
   * edge.
   */
  const tidy = contractChains(build(OSM, { tolerance: 45, elevation: (lat) => elevation(lat) }));
  is("a mountain that already joins up gains nothing",
    stitch(tidy).RUNS.filter((r) => r.link).length === 0,
    `${stitch(tidy).report.linksAdded} links`);
  // Far enough away that no walk crosses it: two ski areas, not one.
  const distant = {
    elements: [
      ...OSM.elements,
      { type: "way", id: 900, tags: { aerialway: "chair_lift", name: "Far away chair" },
        nodes: [901, 902], geometry: [at(46.30, 11.30), at(46.31, 11.31)] },
      { type: "way", id: 901,
        tags: { "piste:type": "downhill", "piste:difficulty": "easy", name: "Somewhere else" },
        nodes: [902, 901], geometry: [at(46.31, 11.31), at(46.30, 11.30)] },
    ],
  };
  const apart = stitch(contractChains(build(distant, { tolerance: 45, elevation: (lat) => elevation(lat) })));
  is("and two ski areas that merely share a bounding box are left apart",
    apart.RUNS.filter((r) => r.link).length === 0,
    `${apart.report.linksAdded} links`);

  /*
   * The boundary, from the other side.
   *
   * The same orphan run, with its bottom moved just past the reach. This is
   * the check that stops the reach quietly growing: a gap this wide is no
   * longer a mapping error, and bridging it would be the pipeline asserting a
   * traverse nobody skis.
   */
  const tooFar = {
    elements: orphan.elements.map((el) => (el.id !== 800 ? el : {
      ...el,
      // Out to the west, 600 m or more from every node on the mountain —
      // including the nursery drag's foot, which is the nearest thing to the
      // valley station and the one the first draft of this fixture caught on.
      geometry: [at(46.17, 11.02), at(46.16, 11.03), at(46.155, 10.994)],
    })),
  };
  const beyond = stitch(contractChains(build(tooFar, { tolerance: 45, elevation: (lat) => elevation(lat) })));
  is("a gap too wide to walk is left as a gap",
    beyond.RUNS.filter((r) => r.link).length === 0,
    `${beyond.report.linksAdded} links`);
  is("so the run it would have rescued is still dropped",
    !prune(beyond).RUNS.some((r) => r.name === "The long one"),
    prune(beyond).RUNS.map((r) => r.name).join(", "));
}

/*
 * What counts as ski hire.
 *
 * The query used to require ski=yes on a sports shop and almost none carry
 * it: Paganella returned zero hire shops for a box containing all of Andalo.
 * Dropping that requirement means a sports shop has to be judged some other
 * way, and the way is its name — so the rule needs cases, because "probably
 * hires skis, we are at a ski resort" is how a map starts saying things that
 * are not true.
 */
{
  const yes = [
    { shop: "ski", name: "La Glisse" },
    { amenity: "ski_rental", name: "Ski Sport Heinz" },
    { shop: "rental", rental: "ski;snowboard", name: "Noleggio Golflift" },
    { shop: "rental", rental: "Sci", name: "Noleggio Andalo" },
    { "service:ski:rental": "yes", name: "Sporthaus" },
    { shop: "sports", name: "Rent and Go Andalo" },
    { shop: "sports", name: "Rent & Go Molveno" },
    { shop: "sports", name: "Noleggio Sci Paganella" },
    { shop: "sports", name: "Skiverleih Olang" },
    { shop: "outdoor", name: "Ski Hire Obereggen" },
    { shop: "sports", ski: "yes", name: "Sport Time" },
  ];
  const no = [
    { shop: "sports", name: "Ottica Rossi" },
    { shop: "sports", name: "Calcio Store" },
    { shop: "outdoor", name: "Ferramenta Bruneck" },
    { shop: "rental", rental: "bicycle", name: "Bike Point" },
    { shop: "bakery", name: "Panificio Ski" },
    { amenity: "restaurant", name: "Ristorante Sci Club" },
  ];
  for (const t of yes) {
    is(`hire: ${t.name}`, isHire(t) === true, JSON.stringify(t));
  }
  for (const t of no) {
    is(`not hire: ${t.name}`, isHire(t) !== true, JSON.stringify(t));
  }
}

/*
 * A logo is not a name.
 *
 * Real case: a restaurant above Gressoney tagged name=FZRY, alt_name=Fitz
 * Roy. The rule is deliberately narrow — no vowel at all — because alt_name
 * is normally the other language and following it in general would rename
 * half of South Tyrol.
 */
{
  console.log("\nA NAME A PERSON WOULD SAY");
  const swaps = [
    [{ name: "FZRY", alt_name: "Fitz Roy" }, "Fitz Roy"],
    [{ name: "MTB", "name:en": "Mountain Bar" }, "Mountain Bar"],
    [{ name: "BRT", official_name: "Bar Roterd" }, "Bar Roterd"],
    // Nothing better on offer, so the sign stands.
    [{ name: "FZRY" }, "FZRY"],
    [{ name: "P1" }, "P1"],
    // Has a vowel, so it is a word and the alt_name is the other language.
    [{ name: "Bruneck", alt_name: "Brunico" }, "Bruneck"],
    [{ name: "Kronplatz", alt_name: "Plan de Corones" }, "Kronplatz"],
    [{ name: "Rifugio Gabiet", alt_name: "Gabiet Hut" }, "Rifugio Gabiet"],
    // Accented vowels count as vowels.
    [{ name: "Crêt", alt_name: "Crest" }, "Crêt"],
    // Nothing to work with either way.
    [{}, undefined],
    [{ name: "   " }, "   "],
  ];
  for (const [tags, want] of swaps) {
    is(`${JSON.stringify(tags)} reads as ${want}`, readable(tags) === want, String(readable(tags)));
  }
}

console.log("\n" + (failures ? `${failures} FAILING` : "all pipeline checks passed"));
process.exit(failures ? 1 : 0);
