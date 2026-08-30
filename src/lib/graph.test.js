/**
 * Graph injection checks. Run with: node src/lib/graph.test.js
 *
 * The solver used to import its mountain. It now takes one, which is the
 * single change a second resort needs. These assert the two halves of that:
 * that passing a graph in genuinely routes on that graph and not on Monterosa,
 * and that passing nothing still behaves exactly as it did.
 *
 * The fixture is deliberately synthetic. Inventing a plausible-looking real
 * resort is how src/resort.js became untrustworthy, and a test mountain that
 * is obviously a test mountain cannot be mistaken for data.
 */
import { solve, measure, altitudeSeries, asGraph } from "../solver.js";
import { NODES as MONTEROSA_NODES } from "../resort.js";

let failures = 0;
function check(name, condition, detail = "") {
  const status = condition ? "PASS" : "FAIL";
  if (!condition) failures++;
  console.log(`  ${status}  ${name}${detail ? "  — " + detail : ""}`);
}

/** A toy mountain: one base, one summit, a lift up and two runs down. */
const NODES = {
  base:   { name: "Testbase",   lat: 46.0, lon: 11.0, alt: 1000, area: "Test", base: true, rifugio: true },
  mid:    { name: "Testmid",    lat: 46.01, lon: 11.01, alt: 1600, area: "Test", rifugio: true },
  summit: { name: "Testsummit", lat: 46.02, lon: 11.02, alt: 2200, area: "Test" },
};
const LIFTS = [
  ["base", "mid", "Lower gondola", "gondola", 6, 960, 3],
  ["mid", "summit", "Upper chair", "chair", 5, 950, 2],
];
const RUNS = [
  ["summit", "mid", "Upper blue", "blue", 2.0, 5],
  ["mid", "base", "Lower blue", "blue", 2.5, 6],
  ["summit", "base", "The direttissima", "black", 4.0, 8],
];

const buildEdges = () => {
  const edges = [];
  LIFTS.forEach(([from, to, name, liftType, ride, lastUp, queue], i) =>
    edges.push({
      id: `L${i}`, kind: "lift", from, to, name, liftType, ride, lastUp, queue,
      min: ride + queue, gain: NODES[to].alt - NODES[from].alt,
    }));
  RUNS.forEach(([from, to, name, difficulty, km, min], i) =>
    edges.push({
      id: `R${i}`, kind: "run", from, to, name, difficulty, km, min,
      drop: NODES[from].alt - NODES[to].alt,
    }));
  return edges;
};

const testGraph = asGraph({ NODES, SHORT_NAMES: { summit: "Testsummit" }, buildEdges });
const opts = {
  start: "base", finish: "base", ability: "black",
  budget: 180, startClock: 9 * 60, count: 3,
};

console.log("\nA PASSED-IN GRAPH IS THE ONE THAT GETS SOLVED");
const routes = solve({ ...opts, graph: testGraph });
check("it finds routes on the toy mountain", routes.length > 0, `${routes.length}`);
check(
  "every node used belongs to that mountain, not Monterosa",
  routes.every((r) => r.segments.every((e) => NODES[e.from] && NODES[e.to])),
  Object.keys(NODES).join(", ")
);
check(
  "and none of Monterosa's nodes leak in",
  routes.every((r) => r.segments.every((e) => !MONTEROSA_NODES[e.from])),
);
check(
  "the runs are the toy mountain's runs",
  routes.every((r) => r.segments.filter((e) => e.kind === "run")
    .every((e) => RUNS.some((run) => run[2] === e.name))),
  routes[0].segments.filter((e) => e.kind === "run").map((e) => e.name).join(", ")
);
check(
  "titles use the passed graph's names",
  routes.some((r) => /Testsummit|Testmid|Testbase|miles|riding|unbroken/.test(r.title)),
  routes.map((r) => r.title).join(" | ")
);

console.log("\nMEASUREMENT FOLLOWS THE SAME GRAPH");
const route = routes[0];
const measured = measure(route, testGraph);
const ALTS = Object.values(NODES).map((n) => n.alt);
check(
  "the high point is one of the toy mountain's own altitudes",
  ALTS.includes(measured.highestAlt),
  `${measured.highestAlt} m of [${ALTS.join(", ")}]`
);
check(
  "altitudes come from the passed graph",
  altitudeSeries(route, testGraph).every((a) => [1000, 1600, 2200].includes(a)),
  altitudeSeries(route, testGraph).join(", ")
);
check(
  "one more altitude than there are segments",
  altitudeSeries(route, testGraph).length === route.segments.length + 1
);

console.log("\nHARD CONSTRAINTS STILL APPLY ON A NEW GRAPH");
const blue = solve({ ...opts, ability: "blue", graph: testGraph });
check(
  "a blue skier is never sent down the black",
  blue.every((r) => r.segments.every((e) => e.difficulty !== "black")),
  `${blue.length} routes`
);
// The upper chair shuts at 15:50 and these routes run past 16:00, so the
// constraint genuinely bites. An empty result would make the assertion below
// vacuously true, so it has to find something first.
const LATE = 15 * 60 + 15;
const late = solve({ ...opts, startClock: LATE, budget: 60, graph: testGraph });
check("there is still something to ski at 15:15", late.length > 0, `${late.length} routes`);
check(
  "and nothing in it boards a lift after that lift has shut",
  late.length > 0 &&
    late.every((r) => {
      let t = LATE;
      return r.segments.every((e) => {
        const ok = e.kind !== "lift" || t <= e.lastUp;
        t += e.min;
        return ok;
      });
    }),
  late.map((r) => r.segments.filter((e) => e.kind === "lift").length + " lifts").join(", ")
);
check(
  "every route still ends where it was asked to",
  routes.every((r) => r.segments[r.segments.length - 1].to === "base")
);

console.log("\nOMITTING THE GRAPH IS UNCHANGED BEHAVIOUR");
const monterosa = solve({
  start: "staffal", finish: "staffal", ability: "red",
  budget: 400, startClock: 9 * 60, count: 3,
});
check("Monterosa still solves with no graph passed", monterosa.length === 3, `${monterosa.length}`);
check(
  "on Monterosa's own nodes",
  monterosa.every((r) => r.segments.every((e) => MONTEROSA_NODES[e.to])),
);
check(
  "and it is still deterministic",
  JSON.stringify(solve({
    start: "staffal", finish: "staffal", ability: "red",
    budget: 400, startClock: 9 * 60, count: 3,
  }).map((r) => r.title)) === JSON.stringify(monterosa.map((r) => r.title)),
  monterosa.map((r) => r.title).join(" | ")
);

console.log("\n" + (failures ? `${failures} FAILING` : "all graph-injection checks passed"));
process.exit(failures ? 1 : 0);
