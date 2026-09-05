/**
 * Turning what the user said into solver options.
 *
 * Deliberately outside the solver. The solver takes a budget in minutes and a
 * start clock; everything about how a human expresses a day — "down by four",
 * "make it easier", "I want lunch" — is translated here.
 */

import { minutesToClock, clockToMinutes, legsOf } from "../solver.js";
import { NODES } from "../active-resort.js";

export { minutesToClock, clockToMinutes };

export const LUNCH_MINUTES = 45;

/**
 * Two things you can ask for.
 *
 * `day` is the orienteering problem the solver exists for: fill the time I
 * have and get me back. `direct` is the opposite and much simpler: I am here,
 * I need to be there, take me. Meeting someone, retrieving a car, or getting
 * off the wrong side of the mountain before the lifts shut.
 */
export const MODES = [
  { id: "day", label: "Plan a day" },
  { id: "direct", label: "Straight there" },
];

/**
 * Three entry contexts change DEFAULTS, not screens.
 *
 * Measured against the resort's own hours rather than fixed clock times. The
 * boundaries used to be hardcoded at 10:00 and 16:00, so at 16:10 — lifts still
 * running, twenty minutes left, the exact moment this app exists for — it
 * decided you were planning tomorrow and offered a seven hour day starting at
 * 09:00. It then found a six hour route home "by 15:23", a time already gone.
 * Handing a skier a plan that ends in the past is the one thing the brief says
 * never to do.
 *
 * Once the lifts have actually stopped, tomorrow is the right answer.
 */
export function detectContext(nowMinutes, resort) {
  const firstLift = resort?.firstLift ?? 8 * 60 + 30;
  const lastDown = resort?.lastDown ?? 16 * 60 + 30;
  // Lifts are done, or it is the middle of the night.
  if (nowMinutes >= lastDown || nowMinutes < firstLift - 150) return "nightbefore";
  // Early enough that the day is still whole.
  if (nowMinutes < firstLift + 90) return "firstlift";
  return "midday";
}

/*
 * The heading names the screen; the fields ask the questions.
 *
 * It used to be the question — "When do you need to be down?" — which reads
 * as an interview rather than as a product, and the field below it is already
 * labelled "Down by". The eyebrow carries which of the three contexts this is,
 * so the heading does not have to.
 */
export const CONTEXT_COPY = {
  nightbefore: {
    eyebrow: "Tomorrow",
    title: "Plan the day",
    hint: null,
  },
  firstlift: {
    eyebrow: "First lift",
    title: "Plan the day",
    hint: {
      t: "Times set from your clock",
      s: "Change them if you're not going up yet.",
    },
  },
  midday: {
    eyebrow: "Already skiing",
    title: "Plan from here",
    hint: {
      t: "Part of the day is gone",
      s: "Set both ends to anywhere on the mountain.",
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
      // Never later than the last lift, and never rolled back half an hour to
      // manufacture a window that is not there: if only ten minutes are left,
      // ten minutes is the honest answer and the empty state explains it.
      t0: Math.min(roundUp5(at), resort.lastDown - 5),
      t1: resort.lastDown,
      noDrags: false,
      lunch: false,
      mode: "day",
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
      mode: "day",
    };
  }
  return {
    start: base,
    finish: base,
    t0: resort.firstLift + 30,
    t1: 16 * 60,
    noDrags: false,
    lunch: false,
    mode: "day",
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
/**
 * How many routes to ask for.
 *
 * Three is what gets shown. Asking for five lets genuinely different fourth and
 * fifth days surface behind a "more options" tap when the mountain supports
 * them — and the solver returns fewer rather than padding when it does not, so
 * asking wide costs nothing but a few milliseconds.
 */
export const ROUTE_COUNT = 5;

export function toSolverOpts({ plan, ability, refine, count = ROUTE_COUNT }) {
  let budget = plan.t1 - plan.t0;
  let level = ability;
  let noDrags = plan.noDrags;
  let lunch = plan.lunch;
  let emphasis = null;

  // Refinements shape a day. A transfer is not a day: you asked to be somewhere
  // by a time, and quietly cutting that budget to 60% because "Shorter" was
  // still set from an earlier plan would declare a reachable place unreachable.
  // Same for lunch, which has no meaning when the answer is one path.
  if (plan.mode === "direct") {
    return {
      start: plan.start,
      finish: plan.finish,
      ability,
      budget,
      startClock: plan.t0,
      noDrags: plan.noDrags,
      lunch: false,
      emphasis: null,
      count: 1,
    };
  }

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
  // Over the legs a skier steps through, not the graph edges: these clocks are
  // shown beside a leg list and have to line up with it.
  for (const edge of legsOf(route)) {
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
export function diagnose(plan, ability, opts, resort, capacity = null) {
  const window = plan.t1 - plan.t0;
  const sameBase = plan.start === plan.finish;
  // Whether there is any later finish to offer, or whether the mountain itself
  // is the thing in the way.
  const shutsAt = resort?.lastDown;
  const roomToExtend = shutsAt == null || plan.t1 < shutsAt - 1;

  if (window < 25) {
    return {
      headline: "There isn't enough time between those two clocks.",
      body: roomToExtend
        ? `${minutesToClock(plan.t0)} to ${minutesToClock(plan.t1)} is ${window} minutes. One lap here is closer to 20 minutes before you have queued for anything.`
        // No fix to offer, so the copy names the constraint and stops. The
        // reader can draw the conclusion; spelling it out was editorialising.
        : `${minutesToClock(plan.t0)} to ${minutesToClock(plan.t1)} is ${window} minutes, and the last lift is at ${minutesToClock(shutsAt)}. One lap here is closer to 20 minutes.`,
      fixes: [
        ...(roomToExtend ? ["laterFinish"] : []),
        ...(plan.lunch ? ["dropLunch"] : []),
      ],
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

  // A small mountain and a long day is a different failure, and the honest
  // message is the opposite of the one below: routes exist, there just is not
  // enough terrain to fill that many hours without lapping the same run past
  // the repeat cap. `capacity` is the longest day the caller found by probing
  // with shorter budgets; without it there is nothing to claim.
  if (capacity && capacity.minutes && capacity.minutes < opts.budget * 0.9) {
    const hours = Math.floor(capacity.minutes / 60);
    const mins = capacity.minutes % 60;
    const asText = hours ? `${hours}h${mins ? ` ${mins}m` : ""}` : `${mins} minutes`;
    return {
      title: "Longer than this resort",
      headline: `There isn't enough here to fill ${minutesToClock(plan.t0)} to ${minutesToClock(plan.t1)}.`,
      // No lecture about lapping. Skiing a good run three times is a normal
      // day out, and the solver will now plan one; this only fires when even
      // that does not reach the finish time.
      body: `The longest day this resort supports from ${NODES[plan.start].name} at your grade is about ${asText}.`,
      fixes: ["shorterDay", ...(ability !== "black" ? ["harder"] : [])],
    };
  }

  /*
   * Probed all the way down to a fifth of the day and still found nothing:
   * the grade is the constraint, not the clock, and saying "nothing gets you
   * back in time" would send the reader to fix the wrong thing.
   *
   * A blue skier at Monterosa is the case. There are 21 blue edges on that
   * mountain and they do not link up, so no blue day exists there at any
   * length. Kronplatz is the opposite: 26 km of linked blue piste, and it
   * plans a blue day from all four of its bases.
   */
  if (capacity && !capacity.minutes) {
    const grade = ability === "blue" ? "blue" : `${ability} or below`;
    return {
      title: `No ${ability} day here`,
      headline: `There is no day on ${grade} runs at ${resort?.name ?? "this resort"}, however long you give it.`,
      body: `The ${grade} pistes here do not link up into a loop from ${NODES[plan.start].name}, so every way out needs something harder.`,
      fixes: ability === "black" ? [] : ["harder"],
    };
  }

  return {
    headline: "Nothing gets you back in time.",
    body: `Every route from ${NODES[plan.start].name} either misses a last lift or overruns ${minutesToClock(plan.t1)}.`,
    fixes: ["laterFinish", ...(ability === "blue" ? ["harder"] : []), ...(plan.lunch ? ["dropLunch"] : [])],
  };
}
