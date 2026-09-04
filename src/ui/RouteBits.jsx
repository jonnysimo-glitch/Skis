/**
 * Pieces shared between the choose, detail, navigate and summary screens.
 */
import { minutesToClock } from "../solver.js";
import { Clock, Ruler, Descend, Runs, Lift } from "./Icons.jsx";

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
export function LegList({ route, clocks, current = -1, doneThrough = -1 }) {
  return (
    <ul className="legs">
      {route.segments.map((edge, i) => {
        const done = i < doneThrough;
        const now = i === current;
        const dotClass = edge.kind === "lift" ? "lift" : edge.difficulty;
        const sub =
          edge.kind === "lift"
            ? `${edge.liftType} · ${edge.ride} min ${edge.down ? "down" : "up"}` +
              `${edge.queue ? ` · ${edge.queue} min queue` : ""}`
            : `${edge.difficulty} · ${edge.km} km · ${edge.drop} m down`;
        return (
          <li
            key={`${edge.id}-${i}`}
            className={`leg${done ? " leg--done" : ""}${now ? " leg--now" : ""}`}
          >
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
            {clocks && <span className="leg__t">{done ? "" : minutesToClock(clocks[i])}</span>}
          </li>
        );
      })}
    </ul>
  );
}

export function Metrics({ items, three }) {
  return (
    <div className={`metrics${three ? " metrics--3" : ""}`}>
      {items.map((item) => (
        <div className="metric" key={item.k}>
          <div className="metric__v">
            {item.v}
            {item.unit && <span>{item.unit}</span>}
          </div>
          <div className="metric__k">{item.k}</div>
        </div>
      ))}
    </div>
  );
}
