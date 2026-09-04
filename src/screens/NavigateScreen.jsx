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
import { minutesToClock, legsOf } from "../solver.js";
import { NODES } from "../active-resort.js";
import { Arrow, Warning, Restart, Check, Satellite, Locate, Descend, Lift, Close, ChevronDown, ChevronUp } from "../ui/Icons.jsx";
import { LegList } from "../ui/RouteBits.jsx";
import { legClocks } from "../lib/plan.js";

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

/**
 * How much further behind you have to fall before the overrun says so again
 * after being dismissed. Ten minutes is about a lift queue: enough that it is
 * news rather than the same news.
 */
const OVERRUN_RENAG = 10;

const nowMinutes = () => {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
};

/**
 * A button that has to be held, not tapped.
 *
 * This one advances the route, and a route that has advanced a leg on its own
 * is a skier being told to go somewhere they are not. Strava's users complain
 * loudly about exactly this: a big full-width button at the bottom of an
 * activity screen gets pressed in a pocket, under a thumb resting on the
 * phone, against a fingerprint reader. Nothing guarded this one.
 *
 * A hold rather than a confirmation dialogue, because the alternative on a
 * mountain is two taps with gloves on in the cold, and because a hold is the
 * one gesture a pocket cannot produce: fabric presses, it does not press
 * steadily for a third of a second and then let go.
 *
 * The progress ring is not decoration — a control that ignores a tap has to
 * say why, or it reads as broken.
 */
const HOLD_MS = 320;

function HoldButton({ className, onHold, label, children }) {
  const [held, setHeld] = useState(0);
  const timer = useRef(null);
  const started = useRef(0);

  const stop = () => {
    if (timer.current) cancelAnimationFrame(timer.current);
    timer.current = null;
    setHeld(0);
  };

  const begin = (event) => {
    // Ignore a secondary click and anything that is not a primary press.
    if (event.button != null && event.button !== 0) return;
    started.current = performance.now();
    const tick = () => {
      const progress = Math.min(1, (performance.now() - started.current) / HOLD_MS);
      setHeld(progress);
      if (progress >= 1) {
        stop();
        onHold();
        return;
      }
      timer.current = requestAnimationFrame(tick);
    };
    timer.current = requestAnimationFrame(tick);
  };

  useEffect(() => stop, []);

  return (
    <button
      className={`${className} btn--hold`}
      aria-label={`${label}. Press and hold.`}
      onPointerDown={begin}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      // Keyboard and assistive technology get a plain activation: a hold is a
      // guard against an accidental touch, and neither of those is one.
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onHold(); } }}
    >
      <span className="btn__hold" style={{ transform: `scaleX(${held})` }} aria-hidden="true" />
      <span className="btn__holdlabel">{children}</span>
    </button>
  );
}

export default function NavigateScreen({
  route,
  opts,
  plan,
  step,
  onStep,
  onFinish,
  onReplan,
  onAbandon,
  onFootHeight,
  onExpand,
}) {
  // Are we actually on the hill? If the wall clock is nowhere near the window
  // that was planned — looking at tomorrow's route from the sofa, or replaying
  // a finished day — then live timing is meaningless and pretending otherwise
  // produces nonsense like "29 minutes ahead, back at 06:49". In that case the
  // screen runs off the plan's own clock and says so.
  const [statusOpen, setStatusOpen] = useState(true);
  // The rest of the day, over the map. The pinned panel only has room for the
  // leg you are on and the one after it, and on a chairlift the question is
  // usually about the whole run home rather than the next hundred metres.
  const [expanded, setExpanded] = useState(false);
  // The overrun line, once you have read it. Not the whole banner's job: the
  // re-plan button sits in the action row and stays there, so putting the
  // message away keeps the escape hatch.
  //
  // Holds the overrun you agreed to rather than a plain boolean. Accepting
  // that you are twenty minutes late is not accepting that you are ninety, and
  // silently never mentioning it again would be the app deciding on your
  // behalf that a last lift no longer matters.
  const [overSeen, setOverSeen] = useState(null);

  // The map chrome lives outside this component, and with the route over the
  // map there is no map for it to control.
  useEffect(() => {
    onExpand?.(expanded);
    return () => onExpand?.(false);
  }, [expanded, onExpand]);
  const foot = useRef(null);
  // The footer is not a fixed height: the overrun banner adds about ninety
  // pixels to it. Anything positioned above it has to know, or the zoom
  // buttons end up behind the banner, which is where they were.
  useEffect(() => {
    const node = foot.current;
    if (!node || !onFootHeight) return undefined;
    const report = () => onFootHeight(Math.round(node.getBoundingClientRect().height));
    report();
    const ro = new ResizeObserver(report);
    ro.observe(node);
    return () => ro.disconnect();
  }, [onFootHeight]);

  const startedAt = useRef(nowMinutes());
  const live = startedAt.current >= plan.t0 - 60 && startedAt.current <= plan.t1 + 60;
  const [wall, setWall] = useState(nowMinutes());

  useEffect(() => {
    if (!live) return undefined;
    const timer = setInterval(() => setWall(nowMinutes()), 15000);
    return () => clearInterval(timer);
  }, [live]);

  // Legs, not graph edges. Real OSM geometry splits a piste at every junction
  // it passes, so a day was sixty-eight instructions of two and a half
  // minutes each — and this screen announces the next junction, which the
  // brief is explicit is not the next turn.
  const legs = legsOf(route);
  const leg = legs[step];
  const next = legs[step + 1];
  const last = step === legs.length - 1;

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
  const plannedElapsed = legs
    .slice(0, step)
    .reduce((sum, e) => sum + e.min, 0);
  const remaining = legs
    .slice(step)
    .reduce((sum, e) => sum + e.min, 0);

  const clock = live ? wall : opts.startClock + plannedElapsed;
  const drift = live ? Math.max(0, wall - startedAt.current) - plannedElapsed : 0;
  const projectedFinish = clock + remaining + (opts.lunch ? LUNCH_MINUTES : 0);
  const overrun = projectedFinish - plan.t1;
  const clocks = legClocks(route, clock - plannedElapsed);

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
          <h1 className="nav__do">
            {isLift ? "Ride" : "Ski"} {leg.name}
          </h1>
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

      {/* Dismissible, and it collapses to the leg count.
          
          Expanded it is a wide strip across the top of the map, and the
          explanation only needs reading once: after that it is a caption
          sitting on the terrain you are trying to look at. Where you are in the
          route is worth keeping, so that is what stays. */}
      {!expanded && (
      <div className={`nav__status${statusOpen ? "" : " nav__status--small"}`}>
        {statusOpen && (
          <>
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
          </>
        )}
        <span className="nav__legcount">
          Leg {step + 1} of {legs.length}
        </span>
        {statusOpen && (
          <button
            className="nav__statusx"
            onClick={() => setStatusOpen(false)}
            aria-label="Hide the location note"
          >
            <Close width="14" height="14" />
          </button>
        )}
      </div>
      )}

      {/* The map is what sits here, unless the whole route is over it. */}

      {expanded && (
        <div className="nav__all">
          <div className="nav__allbody">
            <div className="eyebrow" style={{ marginBottom: "var(--s-3)" }}>
              {route.title}
            </div>
            <LegList
              route={route}
              clocks={clocks}
              current={step}
              doneThrough={step}
            />
          </div>
        </div>
      )}

      <footer className={`nav__foot${expanded ? " nav__foot--solid" : ""}`} ref={foot}>
        <button
          className={`nav__more${expanded ? " nav__more--open" : ""}`}
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          {expanded ? <ChevronDown width="18" height="18" /> : <ChevronUp width="18" height="18" />}
          {expanded
            ? "Back to the map"
            : last
              ? "The whole route"
              : `The rest of the day · ${legs.length - step - 1} to go`}
        </button>
        {overrun > 0 && (overSeen === null || overrun >= overSeen + OVERRUN_RENAG) && (
          <div className="nav__over">
            <Warning width="17" height="17" style={{ flex: "none" }} />
            {/* Short enough to read on a chairlift. Where it re-plans from is
                where you are, which the instruction above already says. */}
            <p>
              <b>{overrun} min over.</b> Back at {minutesToClock(projectedFinish)},
              past your {minutesToClock(plan.t1)}.
            </p>
            <button
              className="nav__overx"
              onClick={() => setOverSeen(overrun)}
              aria-label="Hide the overrun note"
            >
              <Close width="14" height="14" />
            </button>
          </div>
        )}
        {/* Re-plan shares the row with the primary rather than sitting on its
            own above it. Stacked, the overrun state cost three full-width rows
            of a screen whose job is showing you the mountain. */}
        <div className={`nav__actions${overrun > 0 ? " nav__actions--two" : ""}`}>
          {/* "Re-plan" on the face, because it shares the row and the primary
              needs the width for a junction name. Where it re-plans from is
              where you are, and it stays in the accessible name so a screen
              reader is not left with a bare verb. */}
          {overrun > 0 && (
            <button
              className="btn btn--nav btn--nav-warn"
              onClick={() => onReplan(leg.from)}
              aria-label={`Re-plan from ${NODES[leg.from].name}`}
            >
              <Restart width="18" height="18" /> Re-plan
            </button>
          )}
          {last ? (
            <button className="btn btn--nav" onClick={onFinish}>
              <Check width="20" height="20" /> Finish
            </button>
          ) : (
            <HoldButton
              className={`btn btn--nav${following ? " btn--nav-quiet" : ""}`}
              onHold={() => onStep(step + 1)}
              label={`Reached ${junction.name}`}
            >
              Reached {junction.name} <Arrow width="20" height="20" />
            </HoldButton>
          )}
        </div>
      </footer>
    </div>
  );
}
