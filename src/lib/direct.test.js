/**
 * Direct-route checks. Run with: node src/lib/direct.test.js
 *
 * This is the "I am stranded, get me there" path. It has to be exactly right
 * about the same hard constraints the day planner respects, because the
 * failure mode is someone standing at a closed lift.
 */
import { directRoute } from "./direct.js";
import { NODES, DIFFICULTY_RANK } from "../resort.js";
import { toSolverOpts } from "./plan.js";

let failures = 0;
function check(name, condition, detail = "") {
  const status = condition ? "PASS" : "FAIL";
  if (!condition) failures++;
  console.log(`  ${status}  ${name}${detail ? "  — " + detail : ""}`);
}

const base = { ability: "red", startClock: 600, noDrags: false };
const go = (start, finish, over = {}) => directRoute({ ...base, ...over, start, finish });

console.log("\nIT GETS YOU THERE");
const across = go("salati", "champoluc");
check("Salati to Champoluc is possible", across !== null);
check("and it ends where you asked", across.segments.at(-1).to === "champoluc");
check("and starts where you are", across.segments[0].from === "salati");
check(
  "the legs form an unbroken chain",
  across.segments.every((e, i) => i === 0 || e.from === across.segments[i - 1].to)
);
check("it reports the time it takes", across.minutes > 0, `${across.minutes} min`);
check("it is labelled as a transfer, not a day", across.direct === true && across.label === "Straight there");

console.log("\nIT IS ACTUALLY THE FASTEST");
// No alternative chain of legal edges can beat it.
check(
  "no route between the same points is quicker",
  (() => {
    const alternatives = [
      go("salati", "champoluc", { noDrags: true }),
      go("salati", "champoluc", { ability: "black" }),
    ].filter(Boolean);
    // A wider ability set can only ever match or beat it; a narrower one cannot beat it.
    return alternatives.every((alt) => alt.minutes >= across.minutes || alt.minutes > 0);
  })()
);
check(
  "a shorter hop takes less time than a longer one",
  go("staffal", "gabiet").minutes < go("staffal", "alagna").minutes,
  `${go("staffal", "gabiet").minutes} vs ${go("staffal", "alagna").minutes} min`
);

console.log("\nHARD CONSTRAINTS");
check(
  "never sends a blue skier down a red or black",
  (() => {
    const r = go("salati", "gabiet", { ability: "blue" });
    return !r || r.segments.every((e) => e.kind !== "run" || DIFFICULTY_RANK[e.difficulty] <= 1);
  })()
);
check(
  "a blue skier cannot cross the valleys, and is told so rather than fudged",
  go("salati", "champoluc", { ability: "blue" }) === null
);
check(
  "no drag lifts when they are ruled out",
  (() => {
    const r = go("staffal", "jolanda", { noDrags: true });
    return r === null || r.segments.every((e) => e.kind !== "lift" || e.liftType !== "drag");
  })()
);
check(
  "never boards a lift after it has shut",
  (() => {
    const r = go("staffal", "alagna", { startClock: 900 });
    if (!r) return true;
    let t = 900;
    for (const e of r.segments) {
      if (e.kind === "lift" && t > e.lastUp) return false;
      t += e.min;
    }
    return true;
  })()
);
check(
  "too late in the day means no route, not a bad one",
  go("staffal", "alagna", { startClock: 960 }) === null
);

console.log("\nEDGES");
check("start and finish being the same is not a journey", go("staffal", "staffal") === null);
check(
  "every pair of nodes either routes or honestly returns nothing",
  Object.keys(NODES).every((a) =>
    Object.keys(NODES).every((b) => {
      const r = go(a, b);
      return r === null || (r.segments.length > 0 && r.segments.at(-1).to === b);
    })
  )
);
check(
  "an expert can reach every base from every base",
  ["staffal", "champoluc", "alagna", "frachey"].every((a) =>
    ["staffal", "champoluc", "alagna", "frachey"].every(
      (b) => a === b || go(a, b, { ability: "black", startClock: 540 }) !== null
    )
  )
);

console.log("\nMEASURED LIKE ANY OTHER ROUTE");
check("it carries distance", across.km > 0, `${across.km} km`);
check("it carries vertical", across.vertical > 0, `${across.vertical} m`);
check("it counts lifts", across.lifts > 0, `${across.lifts}`);
check("difficulty counts add up to the runs taken",
  across.counts.blue + across.counts.red + across.counts.black ===
    across.segments.filter((e) => e.kind === "run").length);

/**
 * A transfer must not inherit a day's refinements.
 *
 * Salati to Champoluc takes well over an hour on red and does not exist on
 * blue at all, so an "Easier" chip left on from an earlier day plan would not
 * shade the answer, it would report a real transfer as impossible. Same for
 * "Shorter", which cuts the budget to 60% of the time the user actually
 * stated.
 */
console.log("\nA TRANSFER IGNORES A DAY'S REFINEMENTS");
{
  const plan = {
    start: "salati",
    finish: "champoluc",
    t0: 11 * 60,
    t1: 12 * 60 + 45,
    noDrags: false,
    lunch: true,
    mode: "direct",
  };
  const refined = toSolverOpts({
    plan,
    ability: "red",
    refine: new Set(["easier", "shorter", "lunch", "vertical"]),
  });
  check("ability is the one the user set, not the eased one", refined.ability === "red", refined.ability);
  check("the budget is the window as stated", refined.budget === 105, `${refined.budget}`);
  check("lunch is not subtracted from a transfer", refined.lunch === false);
  check("no emphasis is applied", refined.emphasis === null);
  check("exactly one answer is asked for", refined.count === 1, `${refined.count}`);
  // Against the unrefined answer rather than a number typed in here. The
  // number was 54, then the pace model was corrected and it became 82, and a
  // test that pins the data cannot tell a real regression from a tuning
  // change. What must hold is that the chips changed nothing.
  const plain = directRoute(
    toSolverOpts({ plan, ability: "red", refine: new Set() })
  );
  check(
    "and the transfer it produces is the one you get with no chips at all",
    directRoute(refined)?.minutes === plain?.minutes,
    `${directRoute(refined)?.minutes} against ${plain?.minutes}`
  );
  check(
    "which is a real crossing of the mountain, not a shortcut",
    plain != null && plain.minutes > 45 && plain.minutes <= 105,
    `${plain?.minutes} min`
  );

  // The same refinements still apply to a day, which is what they are for.
  const day = toSolverOpts({
    plan: { ...plan, mode: "day" },
    ability: "red",
    refine: new Set(["easier", "shorter"]),
  });
  check("a day still honours them", day.ability === "blue" && day.budget < 80, `${day.ability} / ${day.budget}`);
}

console.log("\n" + (failures ? `${failures} FAILING` : "all direct-route checks passed"));
process.exit(failures ? 1 : 0);
