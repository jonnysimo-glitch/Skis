/**
 * Route detail, and the commit.
 *
 * Committing must cache tiles, graph and route for full airplane mode. Alpine
 * signal is unreliable and this is a hard requirement.
 *
 * The route and graph are written synchronously, so the day is skiable with no
 * signal the instant the button is tapped. Terrain tiles keep downloading
 * behind the navigate screen: they are the enhancement, and a progress bar
 * between a skier and the first lift is the wrong trade.
 */
import { SheetHead, SheetBody, SheetFoot } from "../ui/Sheet.jsx";
import ElevationProfile, { DifficultyBar } from "../ui/ElevationProfile.jsx";
import { LegList, StatRow, detailStats, hours } from "../ui/RouteBits.jsx";
import { backAt, legClocks, LUNCH_MINUTES } from "../lib/plan.js";
import { minutesToClock } from "../solver.js";
import { NODES } from "../resort.js";
import { commitRoute } from "../lib/offline.js";
import { Back, Download, Warning, Check, Wifi, Clock } from "../ui/Icons.jsx";

export default function DetailScreen({ route, opts, plan, resortId, onStart, onBack }) {
  const back = backAt(route, opts);
  const slack = plan.t1 - back;
  const clocks = legClocks(route, opts.startClock);
  const finishName = NODES[route.segments[route.segments.length - 1].to].name;

  // The route and graph are written synchronously, so the day is already
  // skiable offline by the time this returns. Terrain keeps downloading behind
  // the navigate screen; making someone watch a progress bar for tiles they do
  // not need yet is the wrong trade on a mountain.
  const save = () => {
    commitRoute({ route, opts, resortId });
    onStart();
  };

  return (
    <>
      <SheetHead>
        <div className="eyebrow eyebrow--accent">{route.label}</div>
        <h1 className="title title--sm">{route.title}</h1>
      </SheetHead>

      <SheetBody>
        <ElevationProfile route={route} height={116} showScale markers id="detail" />
        <div className="spacer-sm" />
        <DifficultyBar route={route} labels />

        <div className="spacer" />

        <StatRow items={detailStats(route)} large />

        <div className="spacer" />

        <div className="info">
          <Clock className="info__icon" width="17" height="17" />
          <span>
            Down at <b>{finishName}</b> by <b>{minutesToClock(back)}</b>, on{" "}
            {hours(route.minutes)} of moving time.
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
            {route.segments.length} legs · {hours(route.minutes)} moving
          </div>
        </div>

        <LegList route={route} clocks={clocks} />
      </SheetBody>

      <SheetFoot>
        <button className="btn" onClick={save}>
          <Download width="18" height="18" />
          Save offline and start
        </button>
        <button className="btn btn--quiet" onClick={onBack}>
          <Back width="16" height="16" /> Back to options
        </button>
        <p className="note" style={{ display: "flex", gap: "var(--s-2)", alignItems: "center", justifyContent: "center" }}>
          <Wifi width="14" height="14" style={{ flex: "none" }} />
          Saved to your phone. Works with no signal.
        </p>
      </SheetFoot>
    </>
  );
}
