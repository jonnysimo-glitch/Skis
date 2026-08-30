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
import { useGeolocation, kmh } from "../lib/useGeolocation.js";
import { evaluateArrival, DWELL_MS } from "../lib/progress.js";
import { SheetHead, SheetBody, SheetFoot } from "../ui/Sheet.jsx";
import ElevationProfile from "../ui/ElevationProfile.jsx";
import { LegList, Metrics } from "../ui/RouteBits.jsx";
import { LUNCH_MINUTES } from "../lib/plan.js";
import { minutesToClock } from "../solver.js";
import { NODES } from "../resort.js";
import { Arrow, Warning, Restart, Check, Satellite, Locate } from "../ui/Icons.jsx";

/** Why the screen is not following along, in words a skier can act on. */
function gpsExplanation(state) {
  switch (state) {
    case "locating": return "Finding you\u2026";
    case "denied": return "Location is off, so tap when you arrive.";
    case "insecure": return "Location needs https, so tap when you arrive.";
    case "unavailable": return "No location here, so tap when you arrive.";
    default: return "";
  }
}

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

  // --- following along ----------------------------------------------------
  // The phone should notice you have reached the junction. Tapping through 43
  // legs by hand is not navigation, it is data entry with gloves on.
  const gps = useGeolocation(true);
  const streak = useRef(0);
  const [toJunction, setToJunction] = useState(null);

  useEffect(() => {
    // A new leg starts a fresh count; the previous leg's confirmations say
    // nothing about this one.
    streak.current = 0;
    setToJunction(null);
  }, [step]);

  useEffect(() => {
    if (!gps.fix || last) return undefined;
    const result = evaluateArrival({ fix: gps.fix, leg, streak: streak.current });
    streak.current = result.streak;
    setToJunction(result.metres);
    if (result.arrived) {
      onStep(step + 1);
      return undefined;
    }
    // One fix inside the radius and then silence is the common case: the phone
    // stops reporting once you stop moving. Let it stand unless something
    // contradicts it — a later fix runs this effect again and clears the timer.
    if (result.streak > 0) {
      const timer = setTimeout(() => onStep(step + 1), DWELL_MS);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [gps.fix, leg, last, step, onStep]);

  const speed = kmh(gps.fix?.speed);
  const following = gps.state === "live";

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
              : `last one, finishes at ${junction.name}`}
          </div>
        </div>

        <div className="spacer-sm" />

        <Metrics
          three
          items={[
            // Once there is a fix, how far away the junction is beats how long
            // the plan said the leg would take.
            toJunction !== null
              ? {
                  k: "to junction",
                  v: toJunction >= 1000 ? (toJunction / 1000).toFixed(1) : Math.round(toJunction),
                  unit: toJunction >= 1000 ? " km" : " m",
                }
              : {
                  k: "to junction",
                  v: leg.kind === "lift" ? leg.ride : leg.min,
                  unit: " min",
                },
            speed !== null && speed > 0
              ? { k: "speed", v: speed, unit: " km/h" }
              : {
                  k: leg.kind === "lift" ? "metres up" : "metres down",
                  v: leg.kind === "lift" ? leg.gain : leg.drop,
                },
            { k: "due back", v: minutesToClock(projectedFinish) },
          ]}
        />

        <p className="note" style={{ marginTop: "var(--s-3)", display: "flex", gap: "var(--s-2)", alignItems: "center" }}>
          {following ? (
            <>
              <Satellite width="15" height="15" style={{ flex: "none", color: "var(--accent-ink)" }} />
              <span>
                Following you. <b>{junction.name}</b> is next, at{" "}
                {junction.alt.toLocaleString()} m.
              </span>
            </>
          ) : (
            <>
              <Locate width="15" height="15" style={{ flex: "none" }} />
              <span>
                {gpsExplanation(gps.state)} Next junction is <b>{junction.name}</b>,{" "}
                {junction.alt.toLocaleString()} m.
                {!live && " Times are from your plan."}
              </span>
            </>
          )}
        </p>

        <div className="spacer" />

        {overrun > 0 ? (
          <div className="warn">
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
            <div className="info">
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
          <button
            className={following ? "btn btn--ghost" : "btn"}
            onClick={() => onStep(step + 1)}
          >
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
