/**
 * Arrival detection checks. Run with: node src/lib/progress.test.js
 *
 * This is the code that decides when the instruction on screen changes while
 * someone is skiing. Both failure directions are bad, so both are asserted:
 * advancing on a stray fix, and refusing to advance when they have plainly
 * arrived.
 */
import { evaluateArrival, closestLeg, ARRIVAL_RADIUS_M, CONFIRMATIONS } from "./progress.js";
import { NODES, buildEdges } from "../resort.js";
import { metresBetween } from "./geo.js";

let failures = 0;
function check(name, condition, detail = "") {
  const status = condition ? "PASS" : "FAIL";
  if (!condition) failures++;
  console.log(`  ${status}  ${name}${detail ? "  — " + detail : ""}`);
}

const edges = buildEdges();
/** Staffal → Gabiet, a gondola. */
const leg = edges.find((e) => e.from === "staffal" && e.to === "gabiet");
const at = (key, accuracy = 10) => ({
  lat: NODES[key].lat, lon: NODES[key].lon, accuracy, speed: 0, heading: null, at: Date.now(),
});

/** Feed a sequence of fixes through and report when it first says arrived. */
function run(fixes) {
  let streak = 0;
  for (let i = 0; i < fixes.length; i++) {
    const r = evaluateArrival({ fix: fixes[i], leg, streak });
    streak = r.streak;
    if (r.arrived) return i + 1;
  }
  return null;
}

console.log("\nARRIVING");
check(
  `standing at the top station advances after ${CONFIRMATIONS} fixes`,
  run([at("gabiet"), at("gabiet"), at("gabiet")]) === CONFIRMATIONS,
  `advanced on fix ${run([at("gabiet"), at("gabiet"), at("gabiet")])}`
);
check(
  "a single fix at the station is not enough",
  evaluateArrival({ fix: at("gabiet"), leg, streak: 0 }).arrived === false
);

console.log("\nNOT ARRIVING");
check(
  "still at the bottom station never advances",
  run([at("staffal"), at("staffal"), at("staffal"), at("staffal")]) === null
);
check(
  "a different station entirely never advances",
  run([at("champoluc"), at("champoluc"), at("champoluc")]) === null
);
check(
  "one stray fix at the target between good ones does not advance",
  run([at("staffal"), at("gabiet"), at("staffal"), at("staffal")]) === null
);

console.log("\nBAD FIXES");
check(
  "a fix too vague to trust does not advance on its own",
  run([at("gabiet", 400), at("gabiet", 400), at("gabiet", 400)]) === null
);
check(
  "a vague fix holds the streak rather than resetting it",
  (() => {
    let streak = evaluateArrival({ fix: at("gabiet"), leg, streak: 0 }).streak;
    streak = evaluateArrival({ fix: at("gabiet", 400), leg, streak }).streak;
    return streak === 1;
  })(),
  "one good fix then one useless one leaves the streak at 1"
);
check("no fix at all does not advance", evaluateArrival({ fix: null, leg, streak: 5 }).arrived === false);

console.log("\nRADIUS");
// Somewhere on the way up, not yet at the top.
const halfway = {
  lat: (NODES.staffal.lat + NODES.gabiet.lat) / 2,
  lon: (NODES.staffal.lon + NODES.gabiet.lon) / 2,
  accuracy: 10, speed: 5, heading: null, at: Date.now(),
};
const halfwayM = metresBetween(halfway.lat, halfway.lon, NODES.gabiet.lat, NODES.gabiet.lon);
check(
  "halfway up the lift is outside the arrival radius",
  run([halfway, halfway, halfway]) === null,
  `${Math.round(halfwayM)} m from the top, radius ${ARRIVAL_RADIUS_M} m`
);
check(
  "the reported distance is the real distance to the junction",
  Math.abs(evaluateArrival({ fix: halfway, leg, streak: 0 }).metres - halfwayM) < 1
);
// Just inside the radius.
const nearly = {
  lat: NODES.gabiet.lat + 0.0004, lon: NODES.gabiet.lon, accuracy: 8,
  speed: 0, heading: null, at: Date.now(),
};
check(
  "45 m short of the station still counts as arrived",
  run([nearly, nearly]) === CONFIRMATIONS,
  `${Math.round(metresBetween(nearly.lat, nearly.lon, NODES.gabiet.lat, NODES.gabiet.lon))} m out`
);

console.log("\nPICKING UP MID-ROUTE");
const route = { segments: edges.slice(0, 6) };
check(
  "starting at the first node picks the first leg",
  closestLeg(at(route.segments[0].from), route.segments) === 0
);
check(
  "standing at a later junction picks a later leg",
  closestLeg(at(route.segments[3].to), route.segments) >= 3,
  `picked leg ${closestLeg(at(route.segments[3].to), route.segments)}`
);
check("no fix falls back to the start", closestLeg(null, route.segments) === 0);

console.log("\n" + (failures ? `${failures} FAILING` : "all arrival checks passed"));
process.exit(failures ? 1 : 0);
