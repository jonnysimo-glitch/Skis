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
import { backAt, legClocks, LUNCH_MINUTES } from "../lib/plan.js";
import { minutesToClock, legsOf } from "../solver.js";
import { NODES } from "../active-resort.js";
import { Back, Warning, Check, Clock, Lift } from "../ui/Icons.jsx";

export default function LegsScreen({ route, opts, plan, onBack }) {
  const back = backAt(route, opts);
  const slack = plan.t1 - back;
  const clocks = legClocks(route, opts.startClock);
  const finishName = NODES[route.segments[route.segments.length - 1].to].name;
  const stats = detailStats(route);
  const down = ridesDown(route);

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

        {opts.lunch && (
          <div className="info">
            <Check className="info__icon" width="17" height="17" />
            <span>
              Passes a rifugio. The {LUNCH_MINUTES} minutes for lunch are already
              taken out of the skiing time above.
            </span>
          </div>
        )}

        <div className="sectionrule">
          <div className="eyebrow" style={{ marginBottom: 4 }}>
            Every leg, in order
          </div>
        </div>

        <LegList route={route} clocks={clocks} />
      </div>
    </div>
  );
}
