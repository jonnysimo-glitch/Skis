/**
 * Turning what the user said into solver options.
 *
 * Deliberately outside the solver. The solver takes a budget in minutes and a
 * start clock; everything about how a human expresses a day — "down by four",
 * "make it easier", "I want lunch" — is translated here.
 */

import { minutesToClock, clockToMinutes } from "../solver.js";
import { NODES } from "../resort.js";

export { minutesToClock, clockToMinutes };

export const LUNCH_MINUTES = 45;

/** Three entry contexts change DEFAULTS, not screens. */
export function detectContext(nowMinutes) {
  if (nowMinutes >= 10 * 60 && nowMinutes < 16 * 60) return "midday";
  if (nowMinutes >= 6 * 60 && nowMinutes < 10 * 60) return "firstlift";
  return "nightbefore";
}

export const CONTEXT_COPY = {
  nightbefore: {
    eyebrow: "Tomorrow",
    title: "What have you\ngot time for?",
    hint: null,
  },
  firstlift: {
    eyebrow: "First lift",
    title: "What have you\ngot time for?",
    hint: {
      t: "Starting from where you are",
      s: "First lift is in a few minutes. Times are set from the clock — change them if you are not going up yet.",
    },
  },
  midday: {
    eyebrow: "Mid-day reset",
    title: "Where are you,\nand when's the car?",
    hint: {
      t: "Half the day is gone",
      s: "Start is where you are standing now, finish is wherever you left the car. Nothing suggested will strand you above a closed lift.",
    },
  },
};

const roundUp5 = (m) => Math.ceil(m / 5) * 5;

/**
 * Opening plan for a context. `at` is minute-of-day, `here` an optional node
 * key from GPS.
 */
export function defaultPlan(resort, context, at, here) {
  const base = resort.defaultBase;
  if (context === "midday") {
    return {
      start: here || base,
      finish: base,
      t0: Math.min(roundUp5(at), resort.lastDown - 30),
      t1: resort.lastDown,
      noDrags: false,
      lunch: false,
    };
  }
  if (context === "firstlift") {
    return {
      start: here || base,
      finish: base,
      t0: Math.max(roundUp5(at), resort.firstLift),
      t1: resort.lastDown,
      noDrags: false,
      lunch: false,
    };
  }
  return {
    start: base,
    finish: base,
    t0: resort.firstLift + 30,
    t1: 16 * 60,
    noDrags: false,
    lunch: false,
  };
}

/**
 * One-tap refinements. Each re-solves in place — the user is never sent back
 * to the form. Opposites cancel rather than stacking.
 */
export const REFINEMENTS = [
  { id: "shorter", label: "Shorter", opposite: "longer" },
  { id: "longer", label: "Longer", opposite: "shorter" },
  { id: "easier", label: "Easier", opposite: "harder" },
  { id: "harder", label: "Harder", opposite: "easier" },
  { id: "vertical", label: "More vertical" },
  { id: "noDrags", label: "No drags" },
  { id: "lunch", label: "Lunch" },
];

const EASIER = { black: "red", red: "blue", blue: "blue" };
const HARDER = { blue: "red", red: "black", black: "black" };

/**
 * Whether a refinement can do anything from here. A chip that visibly cannot
 * change the answer is better disabled than tapped for no effect.
 */
export function refinementApplies(id, plan, ability, refine) {
  if (id === "easier") return (refine.has("easier") ? true : ability !== "blue");
  if (id === "harder") return (refine.has("harder") ? true : ability !== "black");
  if (id === "noDrags") return true;
  return true;
}

export function toggleRefinement(refine, id) {
  const next = new Set(refine);
  const spec = REFINEMENTS.find((r) => r.id === id);
  if (next.has(id)) next.delete(id);
  else {
    if (spec?.opposite) next.delete(spec.opposite);
    next.add(id);
  }
  return next;
}

/**
 * Solver options from plan + profile + refinements.
 *
 * Note the budget is net of lunch: the solver plans skiing minutes and the
 * sit-down is added back when we report what time you are down.
 */
export function toSolverOpts({ plan, ability, refine, count = 3 }) {
  let budget = plan.t1 - plan.t0;
  let level = ability;
  let noDrags = plan.noDrags;
  let lunch = plan.lunch;
  let emphasis = null;

  if (refine.has("shorter")) budget = Math.round(budget * 0.6);
  if (refine.has("longer")) budget = Math.round(budget * 1.15);
  if (refine.has("easier")) level = EASIER[level];
  if (refine.has("harder")) level = HARDER[level];
  if (refine.has("noDrags")) noDrags = true;
  if (refine.has("lunch")) lunch = true;
  if (refine.has("vertical")) emphasis = "vertical";

  // "Longer" must never push you past your own finish time.
  const hardCeiling = plan.t1 - plan.t0;
  budget = Math.min(budget, hardCeiling);
  if (lunch) budget -= LUNCH_MINUTES;

  return {
    start: plan.start,
    finish: plan.finish,
    ability: level,
    budget,
    startClock: plan.t0,
    noDrags,
    lunch,
    emphasis,
    count,
  };
}

/** Wall-clock time you are back down, lunch included. */
export const backAt = (route, opts) =>
  opts.startClock + route.minutes + (opts.lunch ? LUNCH_MINUTES : 0);

/** Start-of-leg clock time for each segment. */
export function legClocks(route, startClock) {
  const out = [];
  let t = startClock;
  for (const edge of route.segments) {
    out.push(t);
    t += edge.min;
  }
  out.push(t);
  return out;
}

/**
 * Why nothing fits, in plain language, plus the changes that would actually
 * unblock it. Never invent a route that strands someone; do say what to change.
 */
export function diagnose(plan, ability, opts) {
  const window = plan.t1 - plan.t0;
  const sameBase = plan.start === plan.finish;

  if (window < 25) {
    return {
      headline: "There isn't enough time between those two clocks.",
      body: `${minutesToClock(plan.t0)} to ${minutesToClock(plan.t1)} is ${window} minutes. One lap here is closer to 20 minutes before you have queued for anything.`,
      fixes: ["laterFinish", ...(plan.lunch ? ["dropLunch"] : [])],
    };
  }

  if (opts.lunch && opts.budget < 60) {
    return {
      headline: "A sit-down lunch doesn't leave enough of the day.",
      body: `Lunch takes ${LUNCH_MINUTES} minutes off a ${window}-minute window, which leaves ${opts.budget} minutes of skiing.`,
      fixes: ["dropLunch", "laterFinish"],
    };
  }

  if (!sameBase) {
    return {
      headline: `Nothing gets you from ${NODES[plan.start].name} to ${NODES[plan.finish].name} in time.`,
      body: "Every option either misses a last lift or leaves you on the wrong side of the mountain. Crossing the valleys needs the high cols, and those lifts shut first.",
      fixes: ["laterFinish", "finishHere", ...(ability === "blue" ? ["harder"] : [])],
    };
  }

  return {
    headline: "Nothing gets you back in time.",
    body: `Every route from ${NODES[plan.start].name} either misses a last lift or overruns ${minutesToClock(plan.t1)}.`,
    fixes: ["laterFinish", ...(ability === "blue" ? ["harder"] : []), ...(plan.lunch ? ["dropLunch"] : [])],
  };
}
