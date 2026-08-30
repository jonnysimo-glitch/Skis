/**
 * Choose.
 *
 * Routes are labelled by CHARACTER — "Most vertical", "Cruisiest" — with the
 * numbers as support. A skier cannot state their objective function but can
 * tell you they want a cruisy day.
 *
 * Two solver behaviours are surfaced here rather than hidden:
 *   - fewer routes than asked means the mountain cannot support more. The list
 *     is not padded and the shortfall is said out loud.
 *   - a route flagged `similar` covers the same terrain with a different
 *     emphasis. That is stated plainly instead of being dressed as variety.
 *
 * Refine is make-or-break. Every chip re-solves in place. The user is never
 * sent back to the form.
 */
import { useState } from "react";
import { SheetHead, SheetBody, SheetFoot } from "../ui/Sheet.jsx";
import ElevationProfile, { DifficultyBar } from "../ui/ElevationProfile.jsx";
import { StatRow, routeStats } from "../ui/RouteBits.jsx";
import { REFINEMENTS, refinementApplies, backAt, LUNCH_MINUTES } from "../lib/plan.js";
import { minutesToClock } from "../solver.js";
import { Info, Clock, Pin } from "../ui/Icons.jsx";

/** Above roughly six a list stops being a choice and becomes homework. */
const SHOWN_BY_DEFAULT = 3;

export default function ChooseScreen({
  routes,
  opts,
  plan,
  ability,
  refine,
  onRefine,
  onPick,
  onHover,
  activeIndex,
  onBack,
  solving,
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? routes : routes.slice(0, SHOWN_BY_DEFAULT);
  const hidden = routes.length - visible.length;

  const similar = routes.filter((r) => r.similar).length;
  // The solver returns fewer than asked when the terrain cannot support more.
  // Worth saying out loud only once the list is genuinely thin — being told
  // "only four different days" when four are on offer is noise.
  const short = routes.length < SHOWN_BY_DEFAULT + 1;

  return (
    <>
      <SheetHead>
        <div className="eyebrow">
          {routes.length === 1
            ? "One route"
            : hidden > 0
              ? `${visible.length} of ${routes.length} routes`
              : `${routes.length} routes`}
          {opts.lunch ? " · lunch included" : ""}
        </div>
        <h1 className="title">
          Pick a shape
          <br />
          for the day
        </h1>
      </SheetHead>

      <SheetBody>
        {similar > 0 && (
          <div className="info" style={{ marginBottom: 14 }}>
            <Info className="info__icon" width="17" height="17" />
            <span>
              There isn't much {opts.ability} terrain here — {similar === routes.length ? "these are" : `${similar} of these are`}{" "}
              <b>variations on the same runs</b> rather than genuinely different days.
            </span>
          </div>
        )}

        {short && similar === 0 && (
          <div className="info" style={{ marginBottom: 14 }}>
            <Info className="info__icon" width="17" height="17" />
            <span>
              The mountain only supports <b>{routes.length}</b> genuinely different{" "}
              {routes.length === 1 ? "day" : "days"} in that window. Padding the list
              with near-copies wouldn't be a choice.
            </span>
          </div>
        )}

        {visible.map((route, i) => {
          const back = backAt(route, opts);
          return (
            <button
              key={route.label}
              className={`routecard${activeIndex === i ? " routecard--active" : ""}`}
              onClick={() => onPick(i)}
              onMouseEnter={() => onHover?.(i)}
              onFocus={() => onHover?.(i)}
            >
              <span className="routecard__lab">{route.label}</span>
              <span className="routecard__nm">{route.title}</span>
              <ElevationProfile route={route} height={58} id={`c${i}`} />
              <span className="routecard__mix">
                <DifficultyBar route={route} />
              </span>
              <StatRow items={routeStats(route)} />
              <span className="routecard__foot">
                <span className="routecard__from">
                  <Pin width="14" height="14" style={{ color: "var(--ink-4)" }} />
                  {route.areas} {route.areas === 1 ? "area" : "areas"} · tops out at{" "}
                  {route.highestAlt.toLocaleString()} m
                </span>
                <span className="routecard__back">
                  <Clock width="14" height="14" style={{ verticalAlign: -2, marginRight: 4, color: "var(--ink-4)" }} />
                  back <b>{minutesToClock(back)}</b>
                </span>
              </span>
            </button>
          );
        })}

        {hidden > 0 && (
          <button className="btn btn--quiet" onClick={() => setExpanded(true)}>
            {hidden} more {hidden === 1 ? "option" : "options"}
          </button>
        )}

        <div className="sectionrule">
          <label className="flabel">Not quite?</label>
          <div className="chips">
            {REFINEMENTS.map((r) => {
              const on = refine.has(r.id);
              const usable = refinementApplies(r.id, plan, ability, refine);
              return (
                <button
                  key={r.id}
                  className={`chip${solving ? " chip--busy" : ""}`}
                  aria-pressed={on}
                  disabled={!usable}
                  onClick={() => onRefine(r.id)}
                >
                  {r.label}
                </button>
              );
            })}
          </div>
          <p className="note" style={{ marginTop: 10 }}>
            Each one re-solves against the same clock.
            {refine.has("lunch") && ` Lunch takes ${LUNCH_MINUTES} minutes off the skiing.`}
          </p>
        </div>
      </SheetBody>

      <SheetFoot>
        <button className="btn btn--ghost" onClick={onBack}>
          Change the basics
        </button>
      </SheetFoot>
    </>
  );
}
