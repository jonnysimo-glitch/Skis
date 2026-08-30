/**
 * Solver regression checks. Run with: node src/solver.test.js
 *
 * These are behavioural assertions, not unit tests. They exist because the
 * solver is easy to break in ways that still return plausible-looking routes:
 * lapping one run twelve times, ignoring last-lift times, or returning three
 * options that are actually the same day. Keep them passing.
 */

import { solve, altitudeSeries, minutesToClock } from "./solver.js";
import { NODES } from "./resort.js";

let failures = 0;
function check(name, condition, detail = "") {
  const status = condition ? "PASS" : "FAIL";
  if (!condition) failures++;
  console.log(`  ${status}  ${name}${detail ? "  — " + detail : ""}`);
}

const base = {
  start: "staffal", finish: "staffal", ability: "red",
  budget: 405, startClock: 555, noDrags: false, lunch: false, emphasis: null,
};

console.log("\nFULL DAY, red ability, 09:15 to 16:00");
const day = solve(base);
check("returns three routes", day.length === 3, `${day.length}`);
check("all fill most of the budget", day.every(r => r.minutes >= 405 * 0.72),
  day.map(r => r.minutes + "min").join(", "));
check("none exceed the budget", day.every(r => r.minutes <= 405));
check("routes are distinct", new Set(day.map(r => r.segments.map(e => e.id).join(">"))).size === 3);
check("with the whole mountain open, no run is lapped more than 3 times",
  day.every(r => {
    const uses = {};
    for (const e of r.segments) if (e.kind === "run") uses[e.id] = (uses[e.id] || 0) + 1;
    return Object.values(uses).every(n => n <= 3);
  }));
check("every route starts and finishes at Staffal", day.every(r =>
  r.segments[0].from === "staffal" && r.segments[r.segments.length - 1].to === "staffal"));
check("segments form a connected chain", day.every(r =>
  r.segments.every((e, i) => i === 0 || e.from === r.segments[i - 1].to)));

console.log("\nLAST LIFT ENFORCEMENT");
const late = solve({ ...base, startClock: 840, budget: 120 });
check("late start still returns routes", late.length > 0, `${late.length}`);
check("no lift boarded after its last-up time", late.every(r => {
  let t = 0;
  for (const e of r.segments) {
    if (e.kind === "lift" && 840 + t > e.lastUp) return false;
    t += e.min;
  }
  return true;
}));

console.log("\nABILITY FILTERING");
const blue = solve({ ...base, ability: "blue" });
check("blue skier gets routes", blue.length > 0, `${blue.length}`);
check("blue skier's day is still filled", blue.every(r => r.minutes >= 405 * 0.72),
  blue.map(r => r.minutes + "min").join(", "));
check("blue skier is never sent down a red or black",
  blue.every(r => r.counts.red === 0 && r.counts.black === 0));

console.log("\nCRUISIEST IS ACTUALLY GENTLER");
const hardest = day.find(r => r.label === "Most vertical");
const cruisy = day.find(r => r.label === "Cruisiest");
check("cruisiest has fewer hard runs than the vertical option",
  cruisy.counts.red + cruisy.counts.black <= hardest.counts.red + hardest.counts.black,
  `cruisy R${cruisy.counts.red}K${cruisy.counts.black} vs vertical R${hardest.counts.red}K${hardest.counts.black}`);

console.log("\nCONSTRAINTS");
const noDrags = solve({ ...base, noDrags: true });
check("no-drags routes contain no drag lifts",
  noDrags.every(r => r.segments.every(e => e.kind !== "lift" || e.liftType !== "drag")));
const lunch = solve({ ...base, lunch: true, budget: 360 });
check("lunch routes pass a rifugio",
  lunch.every(r => r.segments.some(e => NODES[e.to].rifugio)));
const oneWay = solve({ ...base, finish: "champoluc" });
check("one-way routes finish at Champoluc",
  oneWay.length > 0 && oneWay.every(r => r.segments[r.segments.length - 1].to === "champoluc"));

console.log("\nINFEASIBILITY IS REPORTED, NOT FUDGED");
check("no time means no routes", solve({ ...base, budget: 8 }).length === 0);

console.log("\nVARIABLE ROUTE COUNT");
const six = solve({ ...base, count: 6 });
check("can offer more than three routes", six.length > 3, `${six.length} routes`);
check("never offers more than asked", six.length <= 6);
check("extra routes are genuinely different terrain", (() => {
  const runsOf = r => new Set(r.segments.filter(e => e.kind === "run").map(e => e.id));
  for (let i = 0; i < six.length; i++) {
    for (let j = i + 1; j < six.length; j++) {
      const A = runsOf(six[i]), B = runsOf(six[j]);
      let shared = 0;
      for (const id of A) if (B.has(id)) shared++;
      if (shared / (A.size + B.size - shared) > 0.7) return false;
    }
  }
  return true;
})());
check("every offered route has a distinct label",
  new Set(six.map(r => r.label)).size === six.length);
const thin = solve({ ...base, ability: "blue", count: 6 });
check("thin terrain returns fewer rather than padding to six", thin.length < 6,
  `blue-only gave ${thin.length}`);
check("thin terrain still offers a choice", thin.length >= 2);
check("near-duplicate options are flagged as similar",
  thin.filter(r => r.similar).length > 0,
  `${thin.filter(r => r.similar).length} flagged`);
check("rich terrain has nothing flagged as similar",
  six.every(r => !r.similar));
check("default is still three", solve(base).length === 3);

console.log("\nDETERMINISM");
check("same input gives the same routes",
  JSON.stringify(solve(base).map(r => r.title)) === JSON.stringify(day.map(r => r.title)));

console.log("\nSHAPE OF THE OUTPUT");
check("longest descent never exceeds total vertical",
  day.every(r => r.longestDescent <= r.vertical));
check("highest point is at or above the start altitude",
  day.every(r => r.highestAlt >= NODES[r.segments[0].from].alt));
check("altitude series is one longer than the segment list",
  altitudeSeries(day[0]).length === day[0].segments.length + 1);
check("clock formatting", minutesToClock(555) === "09:15" && minutesToClock(960) === "16:00");

console.log("\n" + (failures ? `${failures} FAILING` : "all checks passed"));
for (const r of day) {
  console.log(`  ${r.label.padEnd(15)}${r.title.padEnd(24)}${r.minutes}min  ${r.km}km  ` +
    `${r.vertical}m  ${r.distinctRuns} runs  ${r.lifts} lifts  ` +
    `B${r.counts.blue} R${r.counts.red} K${r.counts.black}`);
}
process.exit(failures ? 1 : 0);
