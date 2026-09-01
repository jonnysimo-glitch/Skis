/**
 * How long things take on a mountain.
 *
 * One place for the timing assumptions, because there were two and they
 * disagreed. `src/resort.js` was hand-typed at around 27 km/h on every run
 * regardless of grade, which is race pace and produced 12,000 metre days in
 * six hours; the OSM pipeline had its own model at roughly half that. The app
 * ran on the fast one.
 *
 * What is being modelled is a recreational skier's ELAPSED time on a piste,
 * door to door: not how fast they can go, but how long the run takes them
 * including getting going, a pause to look at the view, and waiting for
 * whoever they are with. Stops are folded into the base speed rather than
 * added per run, because the pipeline calls this once per OSM way and a long
 * run mapped as five ways would otherwise collect five lots of overhead.
 *
 * These are estimates and they are the resort's to correct. Real ride times
 * and real queues need a data agreement, which is the business model.
 */

/**
 * Metres per minute along the piste, before the gradient term.
 *
 * Harder is slower, which is the opposite of what an earlier model assumed.
 * The skier who is comfortable on a black skis it fast, but most people on a
 * black traverse it, stop more, and arrive at the bottom later than they would
 * have on a blue of the same length. Planning for the confident case strands
 * everyone else.
 */
export const RUN_SPEED = { blue: 300, red: 275, black: 245 };

/**
 * How much a steep pitch speeds you up. Deliberately weak: gradient is already
 * most of what separates the grades above, so a strong term would count it
 * twice.
 */
const GRADIENT_HELP = 0.35;

/** Cap on the gradient term, so a cliff does not become a fast run. */
const MAX_GRADIENT = 0.6;

/**
 * Minutes for a run, or for one segment of one.
 *
 * The floor stops a fifty metre link between two pistes being reported as
 * instantaneous.
 */
export function runMinutes(lengthM, dropM, difficulty) {
  const base = RUN_SPEED[difficulty] ?? RUN_SPEED.red;
  const gradient = dropM > 0 ? Math.min(dropM / lengthM, MAX_GRADIENT) : 0;
  return Math.max(2, Math.round(lengthM / (base * (1 + gradient * GRADIENT_HELP))));
}

/**
 * Cable speed in metres per second by lift type.
 *
 * Line speed, not the manufacturer's rated speed: lifts slow for loading, run
 * below maximum in wind, and stop for people who fall over at the top.
 */
export const LIFT_SPEED_MS = {
  "cable car": 7.0, gondola: 5.0, funicular: 6.5,
  chair: 2.4, drag: 2.0, carpet: 0.5,
};

/**
 * Getting on and off, which is not the queue and is not the cable time. A
 * gondola you have to walk into, sit down in and walk out of costs a minute
 * over the ride itself, every single time, and a day is thirty of them.
 */
export const BOARDING_MINUTES = 1;

/** Minutes on a lift, boarding included, given the cable length. */
export function liftMinutes(lengthM, kind) {
  const speed = LIFT_SPEED_MS[kind] ?? 3;
  return Math.max(2, Math.round(lengthM / speed / 60) + BOARDING_MINUTES);
}
