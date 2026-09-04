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
import { useEffect, useRef, useState } from "react";

import ElevationProfile, { DifficultyBar } from "../ui/ElevationProfile.jsx";
import { StatRow, routeStats, hours } from "../ui/RouteBits.jsx";
import { REFINEMENTS, refinementApplies, backAt, LUNCH_MINUTES } from "../lib/plan.js";
import { minutesToClock } from "../solver.js";
import { Info, Clock, Pin, Arrow, Back } from "../ui/Icons.jsx";
import { NODES } from "../active-resort.js";

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
  onPreview,
  onHover,
  activeIndex,
  onBack,
  solving,
}) {
  const [expanded, setExpanded] = useState(false);
  const cards = useRef([]);

  // Bring the selected day fully into view, button included.
  //
  // The browser does scroll a focused element into view on click, but it
  // scrolls the element it focused — the card body, which is the card minus
  // its button — and how far it goes depends on the viewport. On a short
  // screen it left the button under the footer's fade and on a tall one it did
  // not scroll at all. Doing it here is the same behaviour everywhere, and
  // `.routecard` carries the scroll margin so the whole card clears the edges.
  useEffect(() => {
    const node = cards.current[activeIndex];
    if (!node) return;
    const frame = requestAnimationFrame(() =>
      node.scrollIntoView({ block: "nearest", behavior: "smooth" })
    );
    return () => cancelAnimationFrame(frame);
  }, [activeIndex]);
  const visible = expanded ? routes : routes.slice(0, SHOWN_BY_DEFAULT);
  const hidden = routes.length - visible.length;
  // A refinement can rule out everything. The chips stay on screen because
  // they are the way back: one tap undoes it. Sending the user to the empty
  // screen here would leave the form as the only exit.
  const ruledOut = routes.length === 0;


  const similar = routes.filter((r) => r.similar).length;
  // The solver returns fewer than asked when the terrain cannot support more.
  // Three is the intended answer, though, so announcing a shortfall at three
  // is crying wolf. Say it when the choice is genuinely thin.
  const short = routes.length < SHOWN_BY_DEFAULT;

  return (
    <div className="page">
      <header className="page__bar">
        <button className="iconbtn iconbtn--flat" onClick={onBack} aria-label="Change the basics">
          <Back />
        </button>
        <div className="eyebrow">
          {ruledOut
            ? "Nothing left"
            : routes.length === 1
              ? "One route"
              : hidden > 0
                ? `${visible.length} of ${routes.length} routes`
                : `${routes.length} routes`}
          {opts.lunch && !ruledOut ? " · lunch included" : ""}
        </div>
        <span style={{ width: "var(--tap)" }} />
      </header>

      <div className="page__body">
        <h1 className="title title--sm" style={{ marginTop: 0 }}>
          {ruledOut ? "That rules everything out" : "Pick a shape for the day"}
        </h1>
        {ruledOut && (
          <div className="warn">
            <Info className="warn__icon" width="17" height="17" />
            <span>
              <span className="warn__t">No day fits</span>
              <span className="warn__p">
                Nothing on {opts.ability === "blue" ? "blue" : `${opts.ability} and below`} fills{" "}
                {hours(opts.budget)} from {NODES[plan.start].name}. Turn one of the
                chips below back off and the options come straight back.
              </span>
            </span>
          </div>
        )}

        {similar > 0 && (
          <div className="info">
            <Info className="info__icon" width="17" height="17" />
            <span>
              Not much {opts.ability} terrain here.{" "}
              {similar === routes.length ? "These are" : `${similar} of these are`}{" "}
              <b>variations on the same runs</b>.
            </span>
          </div>
        )}

        {short && similar === 0 && !ruledOut && (
          <div className="info">
            <Info className="info__icon" width="17" height="17" />
            <span>
              Only <b>{routes.length === 1 ? "one" : routes.length}</b> genuinely
              different {routes.length === 1 ? "day fits" : "days fit"} that window.
            </span>
          </div>
        )}

        {visible.map((route, i) => {
          const back = backAt(route, opts);
          return (
            <div
              key={route.label}
              ref={(n) => { cards.current[i] = n; }}
              className={`routecard${activeIndex === i ? " routecard--active" : ""}`}
            >
            {/* Tapping the card draws that day on the map and nothing else.
                It used to jump straight to the detail screen, and because a
                phone has no hover there was no way to see a route on the
                mountain before committing to reading about it — you had to
                pick one to look at it, then come back. Browsing is the whole
                job of this screen. */}
            <button
              className="routecard__body"
              aria-pressed={activeIndex === i}
              onClick={() => onPreview(i)}
              onMouseEnter={() => onHover?.(i)}
              onFocus={() => onHover?.(i)}
            >
              <span className="routecard__lab">{route.label}</span>
              <span className="routecard__nm">{route.title}</span>
              <ElevationProfile route={route} height={48} id={`c${i}`} />
              <span className="routecard__mix">
                <DifficultyBar route={route} />
              </span>
              <StatRow items={routeStats(route)} />
              <span className="routecard__foot">
                <span className="routecard__from">
                  <Pin width="14" height="14" style={{ color: "var(--ink-4)" }} />
                  {/* No high point here. Nearly every route at a resort tops
                      out at the same lift-served summit, so the number was
                      identical down the list and told you nothing about which
                      day to pick. It is a property of the mountain, and it is
                      on the resort's own panel. */}
                  {route.areas} {route.areas === 1 ? "area" : "areas"}
                </span>
                <span className="routecard__back">
                  <Clock width="14" height="14" style={{ verticalAlign: -2, marginRight: 4, color: "var(--ink-4)" }} />
                  back <b>{minutesToClock(back)}</b>
                </span>
              </span>
            </button>
            {/* One per card, so the thing that opens a day sits on that day.
                Only the selected one carries full weight: three identical
                primaries down a list is three ways out and no way to compare.
                Present on all of them, though, rather than appearing on
                selection — a button that materialises under your thumb moves
                everything below it while you are reading. */}
            <div className="routecard__act">
              <button
                className={`btn btn--sm${activeIndex === i ? "" : " btn--ghost"}`}
                onClick={() => onPick(i)}
              >
                See this day <Arrow width="16" height="16" />
              </button>
            </div>
            </div>
          );
        })}

        {hidden > 0 && (
          <button className="btn btn--quiet" onClick={() => setExpanded(true)}>
            {hidden} more {hidden === 1 ? "option" : "options"}
          </button>
        )}

        <div className="sectionrule">
          <label className="flabel">{ruledOut ? "Turn one back off" : "Not quite?"}</label>
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
          {refine.has("lunch") && (
            <p className="note" style={{ marginTop: "var(--s-3)" }}>
              Lunch takes {LUNCH_MINUTES} minutes off the skiing.
            </p>
          )}
        </div>
      </div>

      <div className="page__foot">
        <button className="btn btn--ghost" onClick={onBack}>
          Change the basics
        </button>
      </div>
    </div>
  );
}
