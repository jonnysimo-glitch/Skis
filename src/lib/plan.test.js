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
import { detectContext, defaultPlan } from "./plan.js";

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

console.log(failures ? `\n  ${failures} FAILING of ${ran} checks\n` : `\n  the clock is read correctly, all ${ran} checks\n`);
process.exit(failures ? 1 : 0);
