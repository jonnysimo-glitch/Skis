/**
 * Every leg of the chosen day, on a page of its own.
 *
 * This is the detail that used to live inside a sheet dragged up over the
 * map. A route is sixty-odd legs on a real mountain, and a list that long
 * inside a panel floating over terrain is a scroll fighting a map. The route
 * bar keeps the three numbers that decide the day; this is where you read it.
 */
import ElevationProfile, { DifficultyBar } from "../ui/ElevationProfile.jsx";
import { LegList, StatRow, detailStats, hours, ridesDown } from "../ui/RouteBits.jsx";
import { lunchStop } from "../lib/via.js";
import { backAt, legClocks, LUNCH_MINUTES } from "../lib/plan.js";
import { minutesToClock, legsOf } from "../solver.js";
import { NODES, PLACES } from "../active-resort.js";
import { Back, Warning, Check, Clock, Lift } from "../ui/Icons.jsx";

export default function LegsScreen({ route, opts, plan, onBack }) {
  const back = backAt(route, opts);
  const slack = plan.t1 - back;
  /*
   * Two passes, because the two depend on each other.
   *
   * Which rifugio is "nearest the middle of the day" barely moves for a
   * forty-five minute shift, so the stop is chosen against the clocks of a
   * day that does not stop — and then the clocks are worked out again with
   * the stop in them, so every leg after lunch reads the time you will
   * actually be there.
   */
  const paceClocks = legClocks(route, opts.startClock);
  const finishName = NODES[route.segments[route.segments.length - 1].to].name;
  const stats = detailStats(route);
  const down = ridesDown(route);
  // Where the day actually stops to eat, when it was asked to.
  const lunch = opts.lunch ? lunchStop(route, paceClocks, NODES, PLACES) : null;
  const clocks = legClocks(route, opts.startClock, lunch ? lunch.leg : -1);
  /*
   * When you ARRIVE, not when you leave.
   *
   * `clocks[i]` is the start of leg i, so `clocks[lunch.leg + 1]` is the leg
   * after the stop — which now begins forty-five minutes later, because that
   * is the whole point. Arrival is that, less the sit-down.
   */
  const eatAt = lunch ? clocks[lunch.leg + 1] - LUNCH_MINUTES : null;

  return (
    <div className="page">
      <header className="page__bar">
        <button className="iconbtn iconbtn--flat" onClick={onBack} aria-label="Back to the map">
          <Back />
        </button>
        <div className="eyebrow">{legsOf(route).length} legs</div>
        <span style={{ width: "var(--tap)" }} />
      </header>

      <div className="page__body">
        <div className="eyebrow eyebrow--accent">{route.label}</div>
        <h1 className="title title--sm" style={{ marginTop: 2 }}>{route.title}</h1>

        <ElevationProfile route={route} height={116} showScale markers id="legs" />
        <div className="spacer-sm" />
        <DifficultyBar route={route} labels />

        <div className="spacer" />

        <StatRow items={stats} large />

        <div className="spacer" />

        <div className="info">
          <Clock className="info__icon" width="17" height="17" />
          <span>
            Down at <b>{finishName}</b> by <b>{minutesToClock(back)}</b>, on{" "}
            {hours(route.minutes)} on the hill.
          </span>
        </div>

        {slack < 20 && (
          <div className="warn">
            <Warning className="warn__icon" width="18" height="18" />
            <span>
              <span className="warn__t">Tight</span>
              <span className="warn__p">
                This lands {slack} minute{slack === 1 ? "" : "s"} before{" "}
                {minutesToClock(plan.t1)}. One slow queue and you are cutting it fine.
              </span>
            </span>
          </div>
        )}

        {/* Why a dashed line goes downhill on the profile and on the map.
            Without this the leg looks like a mistake in the data, and the
            first thing a skier does with a route they do not trust is close
            it. */}
        {down.count > 0 && (
          <div className="info">
            <Lift className="info__icon" width="17" height="17" />
            <span>
              {down.count === 1 ? "One leg rides" : `${down.count} legs ride`} a{" "}
              {down.kinds.join(" or ")} back <b>down</b>. That dashed line heading
              downhill is a lift, not a run.
            </span>
          </div>
        )}

        {/*
          * The stop, by name and by clock.
          *
          * It said "Passes a rifugio", which is true and is not a plan: the
          * solver had already picked the place and the app would not say
          * which. Naming it is the difference between a filter and lunch.
          *
          * `about`, because the clock is the pace implied by the route rather
          * than a booking, and a skier reading an exact time against a queue
          * they have not joined yet would be right to distrust it.
          */}
        {opts.lunch && (
          <div className="info">
            <Check className="info__icon" width="17" height="17" />
            <span>
              {lunch ? (
                <>
                  Lunch at <b>{lunch.name}</b>, about <b>{minutesToClock(eatAt)}</b>
                  {lunch.all.length > 1 && ` — ${lunch.all.length} places there`}. The{" "}
                  {LUNCH_MINUTES} minutes are already out of the skiing time above.
                </>
              ) : (
                /*
                 * The route passes a rifugio — the solver throws away any
                 * lunch route that does not — but nothing here could put a
                 * name to it.
                 *
                 * Which means this branch must not say "passes a rifugio",
                 * which is what it used to say: that is the one claim the
                 * null result argues against, since the naming works off the
                 * same flag the solver filters on. Measured across all four
                 * resorts, every base and every ability — 81 lunch routes,
                 * all 81 named their stop — so this is unreachable today. It
                 * stays because `legsOf` reads a route's legs and the solver
                 * filters on its segments, and a graph where those two
                 * diverge would land here.
                 *
                 * What is true either way is the time, so that is what it
                 * says.
                 */
                <>
                  The {LUNCH_MINUTES} minutes for lunch are already taken out of
                  the skiing time above. Where to stop is on the map rather than
                  in the plan.
                </>
              )}
            </span>
          </div>
        )}

        <div className="sectionrule">
          <div className="eyebrow" style={{ marginBottom: 4 }}>
            Every leg, in order
          </div>
        </div>

        <LegList route={route} clocks={clocks} lunch={lunch ? { ...lunch, at: eatAt } : null} />
      </div>
    </div>
  );
}
