/**
 * Route detail, and the commit.
 *
 * Committing must cache tiles, graph and route for full airplane mode. Alpine
 * signal is unreliable and this is a hard requirement — so the button says what
 * it is doing and reports honestly when there is nothing to cache.
 */
import { useState } from "react";
import { SheetHead, SheetBody, SheetFoot } from "../ui/Sheet.jsx";
import ElevationProfile, { DifficultyBar } from "../ui/ElevationProfile.jsx";
import { LegList, StatRow, detailStats, hours } from "../ui/RouteBits.jsx";
import { backAt, legClocks, LUNCH_MINUTES } from "../lib/plan.js";
import { minutesToClock } from "../solver.js";
import { NODES } from "../resort.js";
import { commitRoute } from "../lib/offline.js";
import { hasMapKey } from "../map/config.js";
import { Back, Download, Warning, Check, Wifi, Clock } from "../ui/Icons.jsx";

export default function DetailScreen({ route, opts, plan, resortId, onStart, onBack }) {
  const [progress, setProgress] = useState(null);

  const back = backAt(route, opts);
  const slack = plan.t1 - back;
  const clocks = legClocks(route, opts.startClock);
  const finishName = NODES[route.segments[route.segments.length - 1].to].name;

  const save = async () => {
    setProgress({ done: 0, total: 1, phase: "route" });
    await commitRoute({ route, opts, resortId, onProgress: setProgress });
    setProgress(null);
    onStart();
  };

  const pct = progress?.total ? Math.round((progress.done / progress.total) * 100) : 0;

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

        <div className="info" style={{ marginBottom: 14 }}>
          <Clock className="info__icon" width="17" height="17" />
          <span>
            Down at <b>{finishName}</b> by <b>{minutesToClock(back)}</b>, on{" "}
            {hours(route.minutes)} of moving time.
          </span>
        </div>

        {slack < 20 && (
          <div className="warn" style={{ marginBottom: 14 }}>
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
          <div className="info" style={{ marginBottom: 14 }}>
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
        {progress ? (
          <button className="btn" disabled>
            <Download width="18" height="18" />
            {progress.phase === "tiles" ? `Caching terrain ${pct}%` : "Saving route"}
          </button>
        ) : (
          <button className="btn" onClick={save}>
            <Download width="18" height="18" />
            {hasMapKey ? "Save offline and start" : "Start"}
          </button>
        )}
        <button className="btn btn--quiet" onClick={onBack}>
          <Back width="16" height="16" /> Back to options
        </button>
        {!hasMapKey && (
          <p className="note" style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <Wifi width="14" height="14" style={{ flex: "none", marginTop: 2 }} />
            No map key set, so there are no tiles to cache. The route and the
            terrain view work offline as they are.
          </p>
        )}
      </SheetFoot>
    </>
  );
}
