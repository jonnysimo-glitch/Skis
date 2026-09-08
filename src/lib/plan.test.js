/**
 * When the app thinks it is, and what it offers you then.
 *
 * The single most underserved moment this product exists for is being on the
 * wrong side of the mountain at 2pm with ninety minutes left. The context
 * boundaries used to be hardcoded at 10:00 and 16:00, so at 16:10 — lifts still
 * running, twenty minutes left — the app decided you were planning tomorrow,
 * offered a seven hour day from 09:00, and found a six hour route home "by
 * 15:23". Handing a skier a plan that ends in the past is the one thing the
 * brief says never to do.
 */
import { detectContext, defaultPlan, diagnose, toSolverOpts, viaOf, VIA_MAX } from "./plan.js";

let failures = 0;
let ran = 0;
const check = (name, pass, detail = "") => {
  ran++;
  if (!pass) failures++;
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
};

const hm = (h, m = 0) => h * 60 + m;
const clock = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

const MONTEROSA = { defaultBase: "staffal", firstLift: hm(8, 30), lastDown: hm(16, 30) };
// A resort that opens and shuts earlier, to prove the boundaries are its hours
// and not the clock.
const EARLY = { defaultBase: "base", firstLift: hm(7, 30), lastDown: hm(15, 0) };

console.log("\nWHICH CONTEXT, AND WHY");

for (const [at, want] of [
  [hm(3), "nightbefore"],   // middle of the night
  [hm(7), "firstlift"],     // before the lifts, getting ready
  [hm(9, 30), "firstlift"], // just up
  [hm(11), "midday"],
  [hm(14), "midday"],       // the moment the product is for
  [hm(16, 10), "midday"],   // lifts still running, twenty minutes left
  [hm(16, 29), "midday"],
  [hm(16, 30), "nightbefore"], // lifts done
  [hm(19), "nightbefore"],
]) {
  const got = detectContext(at, MONTEROSA);
  check(`${clock(at)} is ${want}`, got === want, got === want ? "" : `got ${got}`);
}

check("an earlier resort shuts earlier", detectContext(hm(15, 30), EARLY) === "nightbefore",
  detectContext(hm(15, 30), EARLY));
check("and the same clock time is still midday at a later one",
  detectContext(hm(15, 30), MONTEROSA) === "midday");
check("with no resort at all it still answers", typeof detectContext(hm(14)) === "string");

console.log("\nAND WHAT IT OFFERS YOU AT THAT MOMENT");

// The defining case: late in the day, the window offered must be the window
// that is actually left, and it must end at the last lift.
for (const at of [hm(14), hm(15, 45), hm(16, 10), hm(16, 25)]) {
  const p = defaultPlan(MONTEROSA, detectContext(at, MONTEROSA), at);
  check(`${clock(at)}: the day ends at the last lift`, p.t1 === MONTEROSA.lastDown, clock(p.t1));
  check(`${clock(at)}: and starts about now, not this morning`,
    p.t0 >= at - 5 && p.t0 <= at + 5, `${clock(p.t0)} against ${clock(at)}`);
  check(`${clock(at)}: so the window is real, and not in the past`,
    p.t1 > p.t0, `${p.t1 - p.t0} minutes`);
}

// Once the lifts have stopped, tomorrow is the right answer and a whole day is
// the right default.
const tomorrow = defaultPlan(MONTEROSA, detectContext(hm(17, 30), MONTEROSA), hm(17, 30));
check("after the lifts stop it plans a whole day", tomorrow.t1 - tomorrow.t0 > 5 * 60,
  `${((tomorrow.t1 - tomorrow.t0) / 60).toFixed(1)}h`);
check("starting in the morning", tomorrow.t0 < hm(10), clock(tomorrow.t0));

/*
 * What it says when a place you asked to swing by is the problem.
 *
 * The failure mode this replaced: a day from Stafal via Alagna on red came
 * back as "there is no day on red or below runs at Monterosa Ski, however
 * long you give it" — about a mountain that plans a red day from Stafal every
 * time. The constraint was one village. Naming the wrong thing in an error
 * sends the reader to change the wrong setting, which is worse than a vague
 * error.
 */
console.log("\nA PLACE TO SWING BY, AND WHY IT DOES NOT FIT");
{
  const resort = { ...MONTEROSA, name: "Monterosa Ski" };
  const day = { start: "staffal", finish: "staffal", t0: hm(9), t1: hm(16), lunch: false, mode: "day", via: ["gabiet"] };
  const opts = { budget: 420 };

  const grade = diagnose(day, "blue", opts, resort, null, [{ key: "gabiet", reason: "grade" }]);
  check("a grade problem names the place, not the mountain",
    grade.headline.includes("Gabiet") && !grade.headline.includes("however long"), grade.headline);
  check("and offers to drop it before offering a harder grade",
    grade.fixes[0] === "dropVia" && grade.fixes.includes("harder"), grade.fixes.join(", "));
  check("a black skier is not offered a harder grade",
    !diagnose(day, "black", opts, resort, null, [{ key: "gabiet", reason: "grade" }]).fixes.includes("harder"));

  const clockTrouble = diagnose(day, "red", opts, resort, null, [{ key: "gabiet", reason: "clock", need: 500 }]);
  check("a window problem gives the number",
    clockTrouble.headline.includes("500"), clockTrouble.headline);
  check("and offers a later finish as well as dropping it",
    clockTrouble.fixes.includes("laterFinish") && clockTrouble.fixes.includes("dropVia"));

  const gone = diagnose(day, "red", opts, resort, null, [{ key: "gabiet", reason: "unreachable" }]);
  check("a gap in the map data says so rather than blaming the skier",
    /OpenStreetMap/.test(gone.body), gone.body);
  check("and the only thing to do is drop it",
    gone.fixes.join(",") === "dropVia", gone.fixes.join(","));

  const late = diagnose(day, "red", opts, resort, null, [{ key: "gabiet", reason: "lastlift" }]);
  check("lifts already stopped does not offer a later finish",
    !late.fixes.includes("laterFinish"), late.fixes.join(","));

  // Nothing individually wrong, and still no day: the case only the solve can
  // find. It must not be reported as a clock or grade failure.
  const together = diagnose(day, "red", opts, resort, null, []);
  check("no day at all still names the place",
    together.headline.includes("Gabiet"), together.headline);
  check("and does not claim the mountain has no red day",
    !/however long/.test(together.headline));

  // A window of twenty minutes is a window problem whatever else is set. The
  // waypoint branch must not swallow a failure it did not cause.
  const noTime = diagnose({ ...day, t1: hm(9, 15) }, "red", { budget: 15 }, resort, null, []);
  check("a twenty-minute window is still a clock problem",
    /between those two clocks/.test(noTime.headline), noTime.headline);

  // And with no waypoints the old messages are untouched.
  const plain = diagnose({ ...day, via: [] }, "red", opts, resort, null, []);
  check("no waypoints, no waypoint message",
    plain.headline === "Nothing gets you back in time.", plain.headline);
}

console.log("\nWAYPOINTS ON THE WAY TO THE SOLVER");
{
  const day = { start: "staffal", finish: "staffal", t0: hm(9), t1: hm(16), lunch: false, mode: "day",
    via: ["gabiet", "gabiet", "staffal", "", null] };
  check("de-duplicated, and never the start",
    JSON.stringify(viaOf(day)) === JSON.stringify(["gabiet"]), JSON.stringify(viaOf(day)));
  check(`no more than ${VIA_MAX}`,
    viaOf({ ...day, via: ["a", "b", "c", "d", "e"] }).length === VIA_MAX);
  check("carried into the solver options",
    JSON.stringify(toSolverOpts({ plan: day, ability: "red", refine: new Set() }).via) === JSON.stringify(["gabiet"]));
  check("and every refinement keeps them",
    JSON.stringify(toSolverOpts({ plan: day, ability: "red", refine: new Set(["shorter", "harder"]) }).via) ===
      JSON.stringify(["gabiet"]));
  // A transfer is one path to one place. See the note in toSolverOpts.
  check("but a transfer carries none",
    toSolverOpts({ plan: { ...day, mode: "direct", finish: "gabiet" }, ability: "red", refine: new Set() }).via.length === 0);
}

console.log(failures ? `\n  ${failures} FAILING of ${ran} checks\n` : `\n  the clock is read correctly, all ${ran} checks\n`);
process.exit(failures ? 1 : 0);
