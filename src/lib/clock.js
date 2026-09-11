/**
 * The time, written the way the reader's own phone writes it.
 *
 * The app thinks in minutes past midnight and always has: the solver, the plan
 * and the lift hours are all integers, and `minutesToClock` in solver.js turns
 * one into "16:30". That is the right wire format and it is not changing —
 * CLAUDE.md puts the solver off limits, it has to stay dependency-free so it
 * can run in a worker, and an `<input type="time">` takes 24-hour "HH:MM" as
 * its value by spec whatever the browser then draws. So this is a display
 * layer over it rather than a replacement for it.
 *
 * Why it is needed: "down by 16:30" is exactly right in Chamonix and reads as
 * a train timetable to an American. The resorts in here are Italian and
 * Austrian, so the 24-hour clock will be what most users see on the mountain —
 * but the person planning the trip may well be at home in a country that says
 * half four. Following the device is the only answer that is right for both,
 * and it needs no setting: the phone already knows, and a skier who has set
 * their phone to 24-hour has told us once already.
 *
 * Intl rather than a hand-rolled `h > 12` branch, because the question is not
 * only whether to say PM. Locales disagree about midnight (00:00 against
 * 24:00), about the separator, about whether the hour is zero-padded, and
 * about the numerals themselves. One formatter gets all of that right and the
 * branch gets one case right.
 */

/**
 * One formatter, built once.
 *
 * `new Intl.DateTimeFormat` is not cheap and the leg list formats one time per
 * leg on every render of an eighty-leg day. `undefined` for the locale means
 * the device's own, which is the whole point.
 */
let formatter = null;
const fmt = () => {
  if (!formatter) {
    /*
     * Two passes, because the hour's padding depends on the answer to the
     * first one and getting it wrong is visible.
     *
     * `hour: "numeric"` alone gives an American "4:30 PM", which is right, and
     * an Italian "9:15", which is a regression: this app has always written
     * "09:15", the leg list puts one time per leg in a narrow right-hand
     * column, and unpadded hours make that column ragged on a day that runs
     * from 9 to 16. `hour: "2-digit"` fixes the column and gives the American
     * "04:30 PM", which nobody writes.
     *
     * So the probe asks the locale which clock it is on, and only the padding
     * varies: 2-digit on a 24-hour locale, numeric on a 12-hour one. The
     * clock convention itself is still the locale's own decision — hour12 is
     * deliberately not passed, so a locale that wants 24:00 over 00:00 gets
     * it.
     */
    const probe = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
    const noon = ANCHOR();
    noon.setHours(13, 0, 0, 0);
    const twelve = /[ap]/i.test(probe.format(noon));
    formatter = new Intl.DateTimeFormat(undefined, {
      hour: twelve ? "numeric" : "2-digit",
      minute: "2-digit",
    });
  }
  return formatter;
};

/**
 * A fixed date to hang the time off.
 *
 * Intl formats instants, not durations, so the minutes have to become a Date.
 * It is deliberately not today's: the only thing that may vary in the output
 * is the clock convention, and building from `new Date()` would let a daylight
 * saving boundary or a test running at 23:58 change the answer. Noon on a date
 * with no transition anywhere, then the local hours set explicitly.
 */
const ANCHOR = () => new Date(2000, 0, 15, 12, 0, 0, 0);

/**
 * Minutes past midnight, as the phone would write them.
 *
 * Falls back to the 24-hour form rather than throwing. A missing Intl is not a
 * realistic browser any more, but a time is load-bearing on this app's busiest
 * screen and "16:30" is a worse answer than no answer only if it is wrong,
 * which it is not — it is just not local.
 */
export function showClock(minutes) {
  if (!Number.isFinite(minutes)) return "";
  const total = ((Math.round(minutes) % 1440) + 1440) % 1440;
  const h = Math.floor(total / 60);
  const m = total % 60;
  try {
    const at = ANCHOR();
    at.setHours(h, m, 0, 0);
    /*
     * The space before AM/PM is a narrow no-break space (U+202F) in current
     * ICU, and a thin space (U+2009) in some older ones. Both are invisible
     * and both break a check written against "4:30 PM", a copy audit looking
     * for double spaces, and anyone grepping a screenshot dump. Normalised to
     * an ordinary space, which is what a reader thinks they are seeing.
     */
    return fmt().format(at).replace(/[   ]/g, " ");
  } catch {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }
}

/**
 * Whether this device is on a 12-hour clock. Only for checks and for layout
 * decisions — nothing user-facing should branch on it, because `showClock` has
 * already made the decision.
 *
 * Read off a formatted time rather than off `resolvedOptions().hour12`, which
 * is unset on plenty of locales where the resolved `hourCycle` is what
 * actually decides.
 */
export const usesAmPm = () => /[ap]\.?\s?m/i.test(showClock(13 * 60));

/** Longest string showClock can return here, for anything sizing a column. */
export const widestClock = () =>
  [0, 9 * 60 + 15, 12 * 60, 13 * 60 + 45, 23 * 60 + 59]
    .map(showClock)
    .reduce((a, b) => (b.length > a.length ? b : a), "");
