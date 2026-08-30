/**
 * Navigate.
 *
 * "To next junction", not "to next turn". Pistes have decision points where
 * runs split; they do not have turns.
 *
 * Running behind is computed against the real clock, not faked. Navigation
 * anchors to the moment you start, so planned leg times are wall-clock times
 * you can check against a lift station display. When the projection overruns
 * your finish time the screen says so and offers the only honest fix — re-solve
 * from where you are with the time that is actually left. That is the same
 * problem the app exists for, arriving mid-route.
 */
import { useEffect, useRef, useState } from "react";
import { SheetHead, SheetBody, SheetFoot } from "../ui/Sheet.jsx";
import ElevationProfile from "../ui/ElevationProfile.jsx";
import { LegList, Metrics } from "../ui/RouteBits.jsx";
import { LUNCH_MINUTES } from "../lib/plan.js";
import { minutesToClock } from "../solver.js";
import { NODES } from "../resort.js";
import { Arrow, Warning, Restart, Check } from "../ui/Icons.jsx";

const nowMinutes = () => {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
};

export default function NavigateScreen({
  route,
  opts,
  plan,
  step,
  onStep,
  onFinish,
  onReplan,
  onAbandon,
}) {
  // Are we actually on the hill? If the wall clock is nowhere near the window
  // that was planned — looking at tomorrow's route from the sofa, or replaying
  // a finished day — then live timing is meaningless and pretending otherwise
  // produces nonsense like "29 minutes ahead, back at 06:49". In that case the
  // screen runs off the plan's own clock and says so.
  const startedAt = useRef(nowMinutes());
  const live = startedAt.current >= plan.t0 - 60 && startedAt.current <= plan.t1 + 60;
  const [wall, setWall] = useState(nowMinutes());

  useEffect(() => {
    if (!live) return undefined;
    const timer = setInterval(() => setWall(nowMinutes()), 15000);
    return () => clearInterval(timer);
  }, [live]);

  const leg = route.segments[step];
  const next = route.segments[step + 1];
  const last = step === route.segments.length - 1;

  // Planned vs actual, both in minutes of the day.
  const plannedElapsed = route.segments
    .slice(0, step)
    .reduce((sum, e) => sum + e.min, 0);
  const remaining = route.segments
    .slice(step)
    .reduce((sum, e) => sum + e.min, 0);

  const clock = live ? wall : opts.startClock + plannedElapsed;
  const drift = live ? Math.max(0, wall - startedAt.current) - plannedElapsed : 0;
  const projectedFinish = clock + remaining + (opts.lunch ? LUNCH_MINUTES : 0);
  const overrun = projectedFinish - plan.t1;

  const junction = NODES[leg.to];

  return (
    <>
      <SheetHead>
        <div className="eyebrow eyebrow--accent">
          Leg {step + 1} of {route.segments.length} · {route.title}
        </div>
      </SheetHead>

      <SheetBody>
        <div className="banner">
          <div className="banner__k">
            {leg.kind === "lift" ? `${leg.liftType} up` : `${leg.difficulty} run`}
          </div>
          <div className="banner__d">
            {leg.kind === "lift" ? "Ride" : "Ski"} {leg.name}
          </div>
          <div className="banner__s">
            {next
              ? `then ${next.kind === "lift" ? "ride" : "ski"} ${next.name}`
              : `last one — finishes at ${junction.name}`}
          </div>
        </div>

        <div className="spacer-sm" />

        <Metrics
          three
          items={[
            {
              k: "to junction",
              v: leg.kind === "lift" ? leg.ride : leg.min,
              unit: " min",
            },
            {
              k: leg.kind === "lift" ? "metres up" : "metres down",
              v: leg.kind === "lift" ? leg.gain : leg.drop,
            },
            { k: "due back", v: minutesToClock(projectedFinish) },
          ]}
        />

        <p className="note" style={{ marginTop: 9 }}>
          Next junction is <b>{junction.name}</b>, {junction.alt.toLocaleString()} m.
          {!live && " Times are from your plan — start this on the hill for live timing."}
        </p>

        <div className="spacer" />

        {overrun > 0 ? (
          <div className="warn" style={{ marginBottom: 14 }}>
            <Warning className="warn__icon" width="18" height="18" />
            <span>
              <span className="warn__t">
                {overrun} minute{overrun === 1 ? "" : "s"} over
              </span>
              <span className="warn__p">
                Finishing the route as planned puts you back at{" "}
                {minutesToClock(projectedFinish)}, past your{" "}
                {minutesToClock(plan.t1)}.{" "}
                {drift > 4 ? `You are ${drift} minutes behind the plan. ` : ""}
                Re-plan from {NODES[leg.from].name} and it will use the time you
                actually have.
              </span>
            </span>
          </div>
        ) : (
          drift < -4 && (
            <div className="info" style={{ marginBottom: 14 }}>
              <Check className="info__icon" width="17" height="17" />
              <span>
                {Math.abs(drift)} minutes ahead of the plan. Back at{" "}
                <b>{minutesToClock(projectedFinish)}</b>.
              </span>
            </div>
          )
        )}

        <ElevationProfile route={route} height={72} doneThrough={step} showScale />

        <div className="spacer" />

        <LegList route={route} current={step} doneThrough={step} />
      </SheetBody>

      <SheetFoot>
        {last ? (
          <button className="btn" onClick={onFinish}>
            <Check width="18" height="18" /> Finish
          </button>
        ) : (
          <button className="btn" onClick={() => onStep(step + 1)}>
            Reached {junction.name} <Arrow width="18" height="18" />
          </button>
        )}
        {overrun > 0 && (
          <button className="btn btn--ghost" onClick={() => onReplan(leg.from)}>
            <Restart width="17" height="17" /> Re-plan from {NODES[leg.from].name}
          </button>
        )}
        <button className="btn btn--quiet" onClick={onAbandon}>
          Stop navigating
        </button>
      </SheetFoot>
    </>
  );
}
