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
import { useMemo, useState } from "react";
import { Back } from "../ui/Icons.jsx";
import { NODES, PLACES } from "../active-resort.js";
import { minutesToClock, clockToMinutes, CONTEXT_COPY, MODES, viaOf, VIA_MAX } from "../lib/plan.js";
import { viaChoices, viaGroups } from "../lib/via.js";
import { Clock, Arrow, Locate, Info, Close, ChevronDown, ChevronUp, Pin } from "../ui/Icons.jsx";
import { hours } from "../ui/RouteBits.jsx";

/**
 * What the locate button says. Every branch says something: a tap that quietly
 * does nothing reads as a broken button.
 */
function locateLabel(gps, resort) {
  switch (gps?.state) {
    case "locating":
      return "Finding you…";
    case "ok":
      return `Using your position. Nearest is ${NODES[gps.key].name}`;
    case "far":
      return `You're ${gps.km} km from ${resort.name}. Pick a start below`;
    case "denied":
      return "Location is off. Pick a start below";
    case "insecure":
      return "Location needs https. Pick a start below";
    case "unavailable":
      return "No location here. Pick a start below";
    default:
      return "Use my position";
  }
}

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
  gps,
  onLocate,
  onSolve,
  onBack,
}) {
  const copy = CONTEXT_COPY[context];
  const span = plan.t1 - plan.t0;

  /*
   * Places to swing by. Optional, collapsed, and never in the way.
   *
   * CLAUDE.md is explicit that waypoints must not become a required step the
   * way pin-dropping is in Komoot, so this is one closed row until somebody
   * opens it — and it opens itself when a plan already carries some, because
   * a constraint you cannot see is worse than one you have to tap for.
   */
  const stops = viaOf(plan);
  const [viaOpen, setViaOpen] = useState(stops.length > 0);
  // Rebuilt when the start moves, because the start is not somewhere to swing
  // by and neither is the other station of the same name. resort.id because
  // this reads the whole node and place set.
  const choices = useMemo(
    () => viaChoices(NODES, PLACES, { exclude: [plan.start] }),
    [plan.start, resort.id]
  );
  const chosen = stops
    .map((id) => choices.find((c) => c.id === id) ?? null)
    .filter(Boolean);
  const full = chosen.length >= VIA_MAX;
  const bases = resort.bases;
  // A transfer to where you already are is not a question. Say so rather than
  // greying the button and leaving the user to guess which end is wrong.
  const sameEnds = plan.mode === "direct" && plan.start === plan.finish;

  // Why the button is off, in one line, or null when it is on. It renders in
  // the footer beside the button: at the bottom of the scroll region it was
  // below the fold on a phone, so all the user saw was a dead control.
  const blocked =
    span <= 0
      ? "Finish time needs to be after the start."
      : sameEnds
        ? `You are already at ${NODES[plan.finish].name}. Pick somewhere else to head for.`
        : null;

  // Both ends can be anywhere on the mountain. Being stranded at a col with
  // the car three valleys away is the case this app exists for, and it is not
  // servable if the pickers only offer valley stations. Bases are grouped
  // first because they are still the common answer.
  const mountain = Object.keys(NODES).filter((k) => !NODES[k].base);
  const groups = [
    { label: "Bases", keys: bases },
    { label: "On the mountain", keys: mountain },
  ];

  /*
   * Moving the start drops any waypoint that has become the start.
   *
   * A plan outlives the form. Choose Champoluc as a place to swing by, then
   * change the start to Champoluc, and the day carries a stop it begins at —
   * satisfied before it starts, drawn as a second pin under the first, and
   * for one of Monterosa's two-node names it came back as "you cannot get to
   * Alagna on red" to a reader standing in Alagna.
   */
  const set = (patch) => {
    const next = { ...plan, ...patch };
    if (patch.start && patch.start !== plan.start) {
      const gone = new Set(
        viaChoices(NODES, PLACES, { exclude: [patch.start] }).map((c) => c.id)
      );
      next.via = viaOf(next).filter((id) => gone.has(id));
    }
    setPlan(next);
  };

  const addStop = (id) => set({ via: [...viaOf(plan), id].slice(0, VIA_MAX) });
  const dropStop = (id) => set({ via: viaOf(plan).filter((k) => k !== id) });

  return (
    <div className="page">
      <header className="page__bar">
        <button className="iconbtn iconbtn--flat" onClick={onBack} aria-label="Back to the resort">
          <Back />
        </button>
        <div className="eyebrow">
          <Clock width="14" height="14" /> {copy.eyebrow} · {resort.name}
        </div>
        <span style={{ width: "var(--tap)" }} />
      </header>

      <div className="page__body">
        <h1 className="title">
          {copy.title.split("\n").map((line, i, all) => (
            <span key={i}>
              {line}
              {/* The space belongs in the text, not just in the layout. The
                  break alone made the heading "When do you needto be down?"
                  to anything reading it rather than looking at it, a screen
                  reader included. */}
              {i < all.length - 1 && <>{" "}<br /></>}
            </span>
          ))}
        </h1>

        {copy.hint && (
          <div className="context">
            <Locate className="context__icon" width="18" height="18" />
            <span>
              <span className="context__t">{copy.hint.t}</span>
              <span className="context__s">{copy.hint.s}</span>
            </span>
          </div>
        )}

        <div className="field">
          <div className="segmented" role="group" aria-label="What you want">
            {MODES.map((m) => (
              <button
                key={m.id}
                className="segmented__opt"
                aria-pressed={(plan.mode ?? "day") === m.id}
                onClick={() => set({ mode: m.id })}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

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
              {groups.map((g) => (
                <optgroup key={g.label} label={g.label}>
                  {g.keys.map((key) => (
                    <option key={key} value={key}>
                      {NODES[key].name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <label className="flabel" htmlFor="p-finish">
              {plan.mode === "direct" ? "Take me to" : "Finish at"}
            </label>
            <select
              id="p-finish"
              className="control"
              value={plan.finish}
              onChange={(e) => set({ finish: e.target.value })}
            >
              {groups.map((g) => (
                <optgroup key={g.label} label={g.label}>
                  {g.keys.map((key) => (
                    <option key={key} value={key}>
                      {NODES[key].name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        </div>

        {onLocate && (
          <button
            className={`locate${gps && gps.state !== "ok" && gps.state !== "locating" ? " locate--warn" : ""}`}
            onClick={onLocate}
            disabled={gps?.state === "locating"}
          >
            <Locate width="16" height="16" />
            <span>{locateLabel(gps, resort)}</span>
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
              {plan.mode === "direct" ? "By" : "Down by"}
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

        <p className="note" style={{ marginTop: "calc(var(--s-2) * -1)", marginBottom: "var(--s-5)" }}>
          {span <= 0
            ? "Finish time needs to be after the start."
            : plan.mode === "direct"
              // "7h 00m to get there" reads as how long the journey takes,
              // which is a number this screen does not know yet. It is the
              // window you have to do it in.
              ? `You have ${hours(span)} to get there.`
              : `That's ${hours(span)} on the hill.`}
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
            {plan.mode !== "direct" && (
              <button
                className="chip"
                aria-pressed={plan.lunch}
                onClick={() => set({ lunch: !plan.lunch })}
              >
                Sit-down lunch
              </button>
            )}
          </div>
        </div>

        {plan.mode !== "direct" && (
          <div className="field">
            <button
              className="disclose"
              aria-expanded={viaOpen}
              onClick={() => setViaOpen((v) => !v)}
            >
              <Pin className="disclose__i" width="16" height="16" />
              <span className="disclose__t">Places to swing by</span>
              {/* Says how many even when closed. The count is the whole point
                  of a collapsed row: a plan with two stops in it must not
                  look like a plan with none. */}
              <span className="disclose__n">
                {chosen.length ? `${chosen.length} of ${VIA_MAX}` : "Optional"}
              </span>
              {viaOpen
                ? <ChevronUp className="disclose__c" width="18" height="18" />
                : <ChevronDown className="disclose__c" width="18" height="18" />}
            </button>

            {viaOpen && (
              <div className="via">
                {chosen.length > 0 && (
                  <ul className="viachips">
                    {chosen.map((c) => (
                      <li key={c.id} className="viachip">
                        <span className="viachip__t">
                          <b>{c.name}</b>
                          {/* What is actually there, where OSM knows. The
                              point of swinging by Gabiet is usually the
                              rifugio at Gabiet, and the node is named after
                              the lift station. */}
                          {c.at.length > 0 && <span>{c.at.slice(0, 2).join(", ")}</span>}
                        </span>
                        <button
                          className="viachip__x"
                          onClick={() => dropStop(c.id)}
                          aria-label={`Don't go via ${c.name}`}
                        >
                          <Close width="14" height="14" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {/* A native select, like both ends of the day above it. It
                    gets the platform's own picker, its own search on iOS, and
                    a keyboard on desktop — none of which a hand-rolled list
                    would have. Value is always empty: this is an action, not
                    a field, and leaving the last choice showing in it reads
                    as though that one is still pending. */}
                {/* "Add a place", not "Somewhere to go past". The row above
                    already calls these places to swing by, and a third
                    phrasing for the same thing on one screen reads as three
                    different features. This label is the action. */}
                <label className="flabel" htmlFor="p-via">
                  {chosen.length ? "Add another" : "Add a place"}
                </label>
                <select
                  id="p-via"
                  className="control"
                  value=""
                  disabled={full || choices.length === 0}
                  onChange={(e) => e.target.value && addStop(e.target.value)}
                >
                  <option value="">
                    {choices.length === 0
                      ? "Nothing to add here"
                      : full
                        ? `${VIA_MAX} is the most`
                        : "Pick a place…"}
                  </option>
                  {viaGroups(choices).map((g) => (
                    <optgroup key={g.area || "all"} label={g.area || "On the mountain"}>
                      {g.items.map((c) => (
                        <option key={c.id} value={c.id} disabled={stops.includes(c.id)}>
                          {c.name}
                          {c.at.length ? ` — ${c.at[0]}` : ""}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>

                <p className="note" style={{ marginTop: 8 }}>
                  {full
                    ? "Three is the most. Past that the day is mostly the route between them."
                    : "The day will go past these. Leave it empty and the whole mountain is fair game."}
                </p>
              </div>
            )}
          </div>
        )}

        {!blocked && (
          <div className="info">
            <Info className="info__icon" width="17" height="17" />
            <span>Last lifts are built in. Nothing will strand you.</span>
          </div>
        )}
      </div>

      <div className="page__foot">
        {blocked && (
          <p className="note note--block" role="status">
            {blocked}
          </p>
        )}
        <button
          className="btn"
          disabled={Boolean(blocked)}
          onClick={onSolve}
        >
          {plan.mode === "direct" ? "Take me there" : "Find routes"}{" "}
          <Arrow width="18" height="18" />
        </button>
      </div>
    </div>
  );
}
