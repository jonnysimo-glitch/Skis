/**
 * Plan.
 *
 * Ask for an END TIME, not a duration. Skiers think "down by four", never
 * "four hours thirty". Duration is derived, and the last-lift constraint falls
 * out of it naturally.
 *
 * The three entry contexts change what this screen opens with — not which
 * screen you see. Ability comes from the profile and appears as an overridable
 * chip; it is not asked for every session.
 */
import { SheetHead, SheetBody, SheetFoot } from "../ui/Sheet.jsx";
import { NODES } from "../resort.js";
import { minutesToClock, clockToMinutes, CONTEXT_COPY } from "../lib/plan.js";
import { Clock, Arrow, Locate, Info } from "../ui/Icons.jsx";

const ABILITIES = [
  { v: "blue", label: "Blue", swatch: "#1d6fcc" },
  { v: "red", label: "Blue and red", swatch: "#c22b37" },
  { v: "black", label: "Anything", swatch: "#101820" },
];

export default function PlanScreen({
  resort,
  plan,
  setPlan,
  ability,
  setAbility,
  context,
  gpsNode,
  onLocate,
  locating,
  onSolve,
  onBack,
}) {
  const copy = CONTEXT_COPY[context];
  const window = plan.t1 - plan.t0;
  const bases = resort.bases;
  const startOptions = context === "midday" ? Object.keys(NODES) : bases;

  const set = (patch) => setPlan({ ...plan, ...patch });

  return (
    <>
      <SheetHead>
        <div className="eyebrow">
          <Clock width="14" height="14" /> {copy.eyebrow} · {resort.name}
        </div>
        <h1 className="title">
          {copy.title.split("\n").map((line, i) => (
            <span key={i}>
              {line}
              {i === 0 && <br />}
            </span>
          ))}
        </h1>
      </SheetHead>

      <SheetBody>
        {copy.hint && (
          <div className="context">
            <Locate className="context__icon" width="18" height="18" />
            <span>
              <span className="context__t">{copy.hint.t}</span>
              <span className="context__s">{copy.hint.s}</span>
            </span>
          </div>
        )}

        <div className="field pair">
          <div>
            <label className="flabel" htmlFor="p-start">
              {context === "midday" ? "You are at" : "Start"}
            </label>
            <select
              id="p-start"
              className="control"
              value={plan.start}
              onChange={(e) => set({ start: e.target.value })}
            >
              {startOptions.map((key) => (
                <option key={key} value={key}>
                  {NODES[key].name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="flabel" htmlFor="p-finish">
              {context === "midday" ? "Car is at" : "Finish at"}
            </label>
            <select
              id="p-finish"
              className="control"
              value={plan.finish}
              onChange={(e) => set({ finish: e.target.value })}
            >
              {bases.map((key) => (
                <option key={key} value={key}>
                  {NODES[key].name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {onLocate && (
          <button
            className="btn btn--quiet"
            style={{ marginTop: -8, marginBottom: 14, justifyContent: "flex-start", padding: "4px 2px" }}
            onClick={onLocate}
            disabled={locating}
          >
            <Locate width="16" height="16" />
            {locating
              ? "Finding you…"
              : gpsNode
                ? `Using your position — nearest is ${NODES[gpsNode].name}`
                : "Use my position"}
          </button>
        )}

        <div className="field pair">
          <div>
            <label className="flabel" htmlFor="p-t0">
              {context === "nightbefore" ? "First lift" : "Starting"}
            </label>
            <input
              id="p-t0"
              type="time"
              className="control"
              value={minutesToClock(plan.t0)}
              onChange={(e) => e.target.value && set({ t0: clockToMinutes(e.target.value) })}
            />
          </div>
          <div>
            <label className="flabel" htmlFor="p-t1">
              Down by
            </label>
            <input
              id="p-t1"
              type="time"
              className="control"
              value={minutesToClock(plan.t1)}
              onChange={(e) => e.target.value && set({ t1: clockToMinutes(e.target.value) })}
            />
          </div>
        </div>

        <p className="note" style={{ marginTop: -8, marginBottom: 16 }}>
          {window > 0
            ? `That's ${Math.floor(window / 60)}h ${String(window % 60).padStart(2, "0")}m on the hill.`
            : "Finish time needs to be after the start."}
        </p>

        <div className="field">
          <label className="flabel">Comfortable on</label>
          <div className="chips" role="group" aria-label="Ability">
            {ABILITIES.map((a) => (
              <button
                key={a.v}
                className="chip"
                aria-pressed={ability === a.v}
                onClick={() => setAbility(a.v)}
              >
                <i className="chip__swatch" style={{ background: a.swatch }} />
                {a.label}
              </button>
            ))}
          </div>
          <p className="note" style={{ marginTop: 8 }}>
            Saved to your profile. Change it here any time.
          </p>
        </div>

        <div className="field">
          <label className="flabel">Also</label>
          <div className="chips">
            <button
              className="chip"
              aria-pressed={plan.noDrags}
              onClick={() => set({ noDrags: !plan.noDrags })}
            >
              No drag lifts
            </button>
            <button
              className="chip"
              aria-pressed={plan.lunch}
              onClick={() => set({ lunch: !plan.lunch })}
            >
              Sit-down lunch
            </button>
          </div>
        </div>

        <div className="info">
          <Info className="info__icon" width="17" height="17" />
          <span>
            Last lifts and closures are built in. Nothing will be suggested that
            leaves you above a shut lift — options that do not fit are removed,
            not flagged after the fact.
          </span>
        </div>
      </SheetBody>

      <SheetFoot>
        <button className="btn" disabled={window <= 0} onClick={onSolve}>
          Find routes <Arrow width="18" height="18" />
        </button>
        <button className="btn btn--quiet" onClick={onBack}>
          Change resort
        </button>
      </SheetFoot>
    </>
  );
}
