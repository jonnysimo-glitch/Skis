/**
 * Pieces shared between the choose, detail, navigate and summary screens.
 */
import { Fragment } from "react";
import {legsOf} from "../solver.js";
import { LUNCH_MINUTES as LUNCH_STOP_MINUTES } from "../lib/plan.js";
import { Clock, Ruler, Descend, Runs, Lift } from "./Icons.jsx";
import { showClock } from "../lib/clock.js";

export const hours = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
};

/**
 * The numbers, as a row. Value carries the weight, unit stays quiet, icon
 * makes it scannable without reading.
 */
export function StatRow({ items, large }) {
  // Four at this size do not fit across a phone; three do.
  const wrap = large && items.length > 3;
  return (
    <div className={`stats${large ? " stats--lg" : ""}${wrap ? " stats--wrap" : ""}`}>
      {items.map((item) => (
        <div className="stat" key={item.k}>
          <span className="stat__v">
            {item.v}
            {item.unit && <span className="stat__u">{item.unit}</span>}
          </span>
          <span className="stat__k">{item.k}</span>
        </div>
      ))}
    </div>
  );
}

/** The four numbers a skier checks first. */
export const routeStats = (route) => [
  { icon: Clock, k: "time", v: hours(route.minutes) },
  { icon: Ruler, k: "distance", v: route.km, unit: " km" },
  { icon: Descend, k: "descent", v: route.vertical.toLocaleString(), unit: " m" },
  { icon: Runs, k: "runs", v: route.distinctPistes ?? route.distinctRuns },
];

/**
 * Lifts a route rides downhill, grouped by kind.
 *
 * A gondola that runs both ways is a legitimate leg of a ski day — it is how
 * you cross a valley when the piste back is shut or does not exist — but on
 * the elevation profile and on the map it draws as a dashed line heading
 * *down*, which reads as a bug rather than a ride. Every download edge in the
 * graph is a gondola, cable car or funicular, so the honest fix is to say so
 * rather than to hide the leg.
 */
export function ridesDown(route) {
  const kinds = new Map();
  for (const edge of legsOf(route)) {
    if (edge.kind !== "lift" || !edge.down) continue;
    kinds.set(edge.liftType, (kinds.get(edge.liftType) || 0) + 1);
  }
  const count = [...kinds.values()].reduce((a, b) => a + b, 0);
  return { count, kinds: [...kinds.keys()] };
}

export const detailStats = (route) => [
  { icon: Descend, k: "descent", v: route.vertical.toLocaleString(), unit: " m" },
  { icon: Ruler, k: "distance", v: route.km, unit: " km" },
  { icon: Runs, k: "runs", v: route.distinctPistes ?? route.distinctRuns },
  { icon: Lift, k: "lifts", v: route.lifts },
];

/**
 * The legs of a route.
 *
 * "To next junction", not "to next turn" — pistes have decision points where
 * runs split, they do not have turns.
 */
export function LegList({ route, clocks, current = -1, doneThrough = -1, lunch = null }) {
  return (
    <ul className="legs">
      {legsOf(route).map((edge, i) => {
        const done = i < doneThrough;
        const now = i === current;
        const dotClass = edge.kind === "lift" ? "lift" : edge.link ? "link" : edge.difficulty;
        // A connector is described by what it costs you rather than by a grade
        // it does not have: "on foot or skating" is the honest version of the
        // flat two hundred metres between two pistes.
        const sub =
          edge.kind === "lift"
            ? `${edge.liftType} · ${edge.ride} min ${edge.down ? "down" : "up"}` +
              `${edge.queue ? ` · ${edge.queue} min queue` : ""}`
            : edge.link
              ? `link · ${edge.min} min · skating or on foot`
              : `${edge.difficulty} · ${edge.km} km · ${edge.drop} m down`;
        /*
         * The stop itself, as a row in the day rather than a note about it.
         *
         * "Sit-down lunch" put the day past a rifugio and then said nothing,
         * so it read as a filter. A named row between two legs is what a
         * skier means by a stop: this is where you get off, this is what it
         * is called, this is roughly when.
         */
        const eating = lunch && lunch.leg === i;
        return (
          <Fragment key={`${edge.id}-${i}`}>
          <li
            className={`leg${done ? " leg--done" : ""}${now ? " leg--now" : ""}`}
          >
            {/* The same number the map draws on the leg.
                The route gained numbered badges on the terrain, and a "17"
                sitting on a piste needs somewhere to be looked up — without
                this the two halves of the screen counted the same day in two
                different ways, which is worse than neither counting it. Quiet
                and in the accent rather than a filled disc per row: fifty-nine
                blue circles down a list is a pattern, not a reference. */}
            <span className="leg__n">{i + 1}</span>
            <span className="leg__rail">
              <i className={`leg__dot leg__dot--${dotClass}`} />
            </span>
            <span>
              <span className="leg__nm">
                {edge.name}
                {now && <span className="leg__badge">Now</span>}
              </span>
              <span className="leg__sub">{sub}</span>
            </span>
            {/* A leg already behind you has a real arrival time, and this is
                not it: nothing records when you actually tapped through, so
                the clock here is only the pace implied by where you are now.
                Blank beats a wrong time on a screen whose whole job is
                getting you down before the lifts stop. */}
            {clocks && <span className="leg__t">{done ? "" : showClock(clocks[i])}</span>}
          </li>
          {eating && (
            <li className="leg leg--stop">
              <span className="leg__n" aria-hidden="true" />
              <span className="leg__rail">
                <i className="leg__dot leg__dot--stop" />
              </span>
              <span>
                <span className="leg__nm">Lunch at {lunch.name}</span>
                <span className="leg__sub">
                  {LUNCH_STOP_MINUTES} min
                  {lunch.where !== lunch.name ? ` · ${lunch.where}` : ""}
                  {lunch.all.length > 1 ? ` · ${lunch.all.length} places here` : ""}
                </span>
              </span>
              {clocks && <span className="leg__t">{showClock(lunch.at)}</span>}
            </li>
          )}
          </Fragment>
        );
      })}
    </ul>
  );
}
