/**
 * Navigate.
 *
 * A different interface from the rest of the app on purpose. Everywhere else
 * content lives in a sheet you drag; here it is pinned. You are moving, the
 * phone is in a glove, and the one thing you need is fixed where you left it.
 * Nothing on this screen can be dragged out of the way by accident.
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
import { LUNCH_MINUTES } from "../lib/plan.js";
import { minutesToClock } from "../solver.js";
import { NODES } from "../resort.js";
import { Arrow, Warning, Restart, Check, Satellite, Locate, Descend, Lift, Close } from "../ui/Icons.jsx";

/** Why the screen is not following along, in words a skier can act on. */
function gpsExplanation(state) {
  switch (state) {
    case "locating": return "Finding you…";
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
  const isLift = leg.kind === "lift";

  // The distance reads better than the plan once there is a fix to compute it
  // from: "300 m" is checkable against what you can see, "4 min" is not.
  const distance =
    toJunction === null
      ? null
      : toJunction >= 1000
        ? { v: (toJunction / 1000).toFixed(1), unit: "km" }
        : { v: String(Math.round(toJunction)), unit: "m" };

  return (
    <div className="nav">
      {/* The instruction. Pinned, high contrast, legible at arm's length in
          flat light with the screen dimmed by cold. */}
      <header className="nav__head">
        <div className="nav__badge">
          {isLift ? <Lift width="30" height="30" /> : <Descend width="30" height="30" />}
        </div>
        <div className="nav__what">
          <div className="nav__do">
            {isLift ? "Ride" : "Ski"} {leg.name}
          </div>
          <div className="nav__then">
            {next
              ? `then ${next.kind === "lift" ? "ride" : "ski"} ${next.name}`
              : `last one, finishes at ${junction.name}`}
          </div>
        </div>
        <div className={`nav__grade nav__grade--${isLift ? "lift" : leg.difficulty}`}>
          {isLift ? leg.liftType : leg.difficulty}
        </div>
        <button className="nav__stop" onClick={onAbandon} aria-label="Stop navigating">
          <Close width="20" height="20" />
        </button>
      </header>

      <div className="nav__metrics">
        <div className="navmetric">
          <div className="navmetric__v">
            {distance ? distance.v : isLift ? leg.ride : leg.min}
            <span className="navmetric__u">{distance ? distance.unit : "min"}</span>
          </div>
          <div className="navmetric__k">to {junction.name}</div>
        </div>
        <div className="navmetric">
          <div className="navmetric__v">
            {speed !== null ? speed : isLift ? leg.gain : leg.drop}
            <span className="navmetric__u">{speed !== null ? "km/h" : "m"}</span>
          </div>
          <div className="navmetric__k">{speed !== null ? "speed" : isLift ? "up" : "down"}</div>
        </div>
        <div className={`navmetric${overrun > 0 ? " navmetric--warn" : ""}`}>
          <div className="navmetric__v">{minutesToClock(projectedFinish)}</div>
          <div className="navmetric__k">
            {overrun > 0 ? `${overrun} min over` : "due back"}
          </div>
        </div>
      </div>

      <div className="nav__status">
        {following ? (
          <>
            <Satellite width="14" height="14" />
            <span>Following you</span>
          </>
        ) : (
          <>
            <Locate width="14" height="14" />
            <span>{gpsExplanation(gps.state)}</span>
          </>
        )}
        {!live && <span className="nav__legcount">Times are from your plan.</span>}
        <span className="nav__legcount">
          Leg {step + 1} of {route.segments.length}
        </span>
      </div>

      {/* The map is what sits here. Left alone so it can be dragged. */}

      <footer className="nav__foot">
        {overrun > 0 && (
          <div className="nav__over">
            <Warning width="17" height="17" style={{ flex: "none" }} />
            <span>
              <b>{overrun} min over.</b> Finishing as planned puts you back at{" "}
              {minutesToClock(projectedFinish)}, past your {minutesToClock(plan.t1)}.
              Re-planning from {NODES[leg.from].name} uses the time you have.
            </span>
            <button className="nav__replan" onClick={() => onReplan(leg.from)}>
              <Restart width="16" height="16" /> Re-plan
            </button>
          </div>
        )}
        <div className="nav__actions">
          {last ? (
            <button className="btn btn--nav" onClick={onFinish}>
              <Check width="20" height="20" /> Finish
            </button>
          ) : (
            <button
              className={`btn btn--nav${following ? " btn--nav-quiet" : ""}`}
              onClick={() => onStep(step + 1)}
            >
              Reached {junction.name} <Arrow width="20" height="20" />
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
