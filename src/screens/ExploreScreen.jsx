/**
 * The resort, before you have asked it for anything.
 *
 * You arrive on the skiing tab looking at the mountain, not at a form. The
 * form is one tap away behind Plan, which is the only saturated thing on the
 * screen. Everything else here is orientation: where this is, how big it is,
 * and what you last did on it.
 *
 * This is the browse half of the app. Plan is the verb.
 */
import { SheetHead, SheetBody } from "../ui/Sheet.jsx";
import { listDays, dayLabel } from "../lib/history.js";
import { hours } from "../ui/RouteBits.jsx";
import { Plus, Mountain, Peak, Lift, Runs, Clock } from "../ui/Icons.jsx";

export default function ExploreScreen({ resort }) {
  const days = listDays().filter((d) => d.resortId === resort.id);
  const last = days[0];
  const s = resort.stats;

  return (
    <>
      <SheetHead>
        <div className="eyebrow">
          <Mountain width="14" height="14" /> {resort.region}, {resort.country}
        </div>
        <h1 className="title title--sm">{resort.name}</h1>
      </SheetHead>

      <SheetBody>
        <p className="lede lede--sm">{resort.blurb}</p>

        <div className="spacer-sm" />

        <div className="facts">
          <div className="fact">
            <Lift width="17" height="17" className="fact__icon" />
            <span className="fact__v">{s.lifts}</span>
            <span className="fact__k">lifts</span>
          </div>
          <div className="fact">
            <Runs width="17" height="17" className="fact__icon" />
            <span className="fact__v">{s.runs}</span>
            <span className="fact__k">runs</span>
          </div>
          <div className="fact">
            <Peak width="17" height="17" className="fact__icon" />
            <span className="fact__v">{(s.top / 1000).toFixed(1)}k</span>
            <span className="fact__k">metres up</span>
          </div>
          <div className="fact">
            <Clock width="17" height="17" className="fact__icon" />
            <span className="fact__v">{minutesLabel(resort.lastDown)}</span>
            <span className="fact__k">last down</span>
          </div>
        </div>

        {last && (
          <>
            <div className="spacer" />
            <div className="eyebrow" style={{ marginBottom: "var(--s-3)" }}>Last time here</div>
            <ul className="daylist">
              <li className="day">
                <span className="day__when">{dayLabel(last.at)}</span>
                <span className="day__title">{last.title}</span>
                <span className="day__nums">
                  {last.vertical.toLocaleString()} m · {last.km} km · {hours(last.minutes)}
                </span>
              </li>
            </ul>
          </>
        )}
      </SheetBody>
    </>
  );
}

const minutesLabel = (m) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

/**
 * The Plan button. Lives outside the sheet, over the map, because it is the
 * one thing on this screen that does something and it should not be draggable
 * out of reach.
 */
export function PlanButton({ onPlan, hidden }) {
  return (
    <button
      className={`planbtn${hidden ? " planbtn--hidden" : ""}`}
      onClick={onPlan}
      {...(hidden ? { inert: "" } : {})}
    >
      <Plus width="20" height="20" />
      Plan
    </button>
  );
}
