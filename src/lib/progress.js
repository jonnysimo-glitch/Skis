/**
 * Deciding, from a stream of GPS fixes, when a skier has reached the next
 * junction.
 *
 * Kept out of the React component so it can be reasoned about and tested on
 * its own: this is the piece that decides when the screen changes under
 * someone's thumb halfway down a run, and getting it wrong in either
 * direction is bad. Advance too eagerly and the instruction is wrong while
 * they are still skiing; too late and they are standing at a lift wondering
 * why the app has not noticed.
 */
import { NODES } from "../active-resort.js";
import { metresBetween } from "./geo.js";
import { USABLE_ACCURACY_M } from "./useGeolocation.js";

/**
 * How close counts as "there". Lift stations are large: a gondola building is
 * tens of metres across and the queue can be tens more. Generous enough to
 * fire while you are in the queue, tight enough not to fire from the piste
 * above.
 */
export const ARRIVAL_RADIUS_M = 70;

/**
 * Two consecutive fixes inside the radius before advancing. A single stray
 * fix — and they happen, especially between buildings — should not skip a leg.
 */
export const CONFIRMATIONS = 2;

/**
 * How long one fix inside the radius may stand unchallenged before it counts
 * as arrival on its own.
 *
 * `watchPosition` fires when the position changes. Standing in a lift queue it
 * may not fire again for a long time, and waiting for a second fix that is
 * never coming is the exact moment the screen looks broken. So a lone fix
 * inside the radius is confirmed by nothing contradicting it: any later fix
 * outside the radius clears the timer before it fires.
 */
export const DWELL_MS = 6000;

/**
 * @param {object} args
 * @param {object} args.fix        latest position, or null
 * @param {object} args.leg        the segment currently being travelled
 * @param {number} args.streak     how many consecutive fixes have been inside
 * @returns {{ arrived: boolean, streak: number, metres: number|null }}
 */
export function evaluateArrival({ fix, leg, streak }) {
  if (!fix || !leg) return { arrived: false, streak: 0, metres: null };
  if (fix.accuracy > USABLE_ACCURACY_M) {
    // Too vague to act on, but not evidence of moving away either — hold the
    // streak rather than resetting it on one bad reading.
    return { arrived: false, streak, metres: null };
  }

  const target = NODES[leg.to];
  const metres = metresBetween(fix.lat, fix.lon, target.lat, target.lon);
  // The radius has to account for the fix's own error, or a 45 m-accurate fix
  // can never satisfy a 70 m radius from the far side of a station.
  const inside = metres <= ARRIVAL_RADIUS_M + fix.accuracy * 0.5;
  const next = inside ? streak + 1 : 0;
  return { arrived: next >= CONFIRMATIONS, streak: next, metres };
}

/**
 * Which leg of the route the skier appears to be on.
 *
 * Not wired into the screen: navigation always begins at leg one, because you
 * have just chosen a route that starts where you are. This is here for
 * resuming a route across an app restart, which does not exist yet.
 */
export function closestLeg(fix, segments) {
  if (!fix) return 0;
  let best = 0;
  let bestM = Infinity;
  segments.forEach((edge, i) => {
    const from = NODES[edge.from];
    const to = NODES[edge.to];
    const m = Math.min(
      metresBetween(fix.lat, fix.lon, from.lat, from.lon),
      metresBetween(fix.lat, fix.lon, to.lat, to.lon)
    );
    if (m < bestM) {
      bestM = m;
      best = i;
    }
  });
  return best;
}
