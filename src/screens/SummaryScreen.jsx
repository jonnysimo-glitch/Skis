/**
 * Summary. What the day actually was.
 */
import { SheetHead, SheetBody, SheetFoot } from "../ui/Sheet.jsx";
import ElevationProfile, { DifficultyBar } from "../ui/ElevationProfile.jsx";
import { StatRow, routeStats, hours } from "../ui/RouteBits.jsx";
import { backAt } from "../lib/plan.js";
import { minutesToClock } from "../solver.js";
import { NODES } from "../resort.js";
import { Mountain, Restart } from "../ui/Icons.jsx";

export default function SummaryScreen({ route, opts, plan, onAgain, onDone }) {
  const back = backAt(route, opts);
  const spare = plan.t1 - back;
  const finish = NODES[route.segments[route.segments.length - 1].to];

  return (
    <>
      <SheetHead>
        <div className="eyebrow eyebrow--accent">
          <Mountain width="14" height="14" /> Day done
        </div>
        <h1 className="title">{route.title}</h1>
      </SheetHead>

      <SheetBody>
        <p className="lede">
          Down at {finish.name} by {minutesToClock(back)}
          {spare > 0 ? `, ${spare} minutes inside your ${minutesToClock(plan.t1)}.` : "."}
        </p>

        <div className="spacer" />

        <ElevationProfile route={route} height={112} showScale markers id="summary" />
        <div className="spacer-sm" />
        <DifficultyBar route={route} labels />

        <div className="spacer" />

        <StatRow items={routeStats(route)} large />

        <div className="spacer" />

        <div className="info">
          <Mountain className="info__icon" width="17" height="17" />
          <span>
            {route.areas} {route.areas === 1 ? "area" : "areas"} of the mountain, high point{" "}
            <b>{route.highestAlt.toLocaleString()} m</b>, {hours(route.minutes)} moving.
          </span>
        </div>

        <div className="sectionrule">
          <p className="note">
            Longest unbroken descent was {route.longestDescent} m.
            {route.dragLifts > 0 &&
              ` ${route.dragLifts} drag lift${route.dragLifts === 1 ? "" : "s"} on this one.`}
          </p>
        </div>
      </SheetBody>

      <SheetFoot>
        <button className="btn" onClick={onAgain}>
          <Restart width="17" height="17" /> Plan another day
        </button>
        <button className="btn btn--quiet" onClick={onDone}>
          Back to the route
        </button>
      </SheetFoot>
    </>
  );
}
