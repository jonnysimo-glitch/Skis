/**
 * What is open on the mountain.
 *
 * The honest answer is that nobody knows yet. Closures are not in OpenStreetMap
 * and there is no public feed for them — they need a data agreement with the
 * resort, which is also the business model. So this shows the published network
 * the planner is actually routing over, and says plainly that it is the
 * published network rather than today's.
 *
 * That distinction is a safety matter, not a disclaimer. A skier who reads
 * "39 runs" as "39 runs open today" and plans a 4pm descent down a run that
 * shut at 2 is in real trouble. The one number that IS real operating data is
 * the last lift up, and it gets said first.
 */
import { useEffect, useRef } from "react";
import { Close, Info } from "../ui/Icons.jsx";
import { LIFTS, RUNS, NODES } from "../active-resort.js";
import { PISTE_COLOUR } from "../lib/geo.js";

const hhmm = (min) =>
  `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

const GRADES = [
  ["blue", "Blue"],
  ["red", "Red"],
  ["black", "Black"],
];

export default function ResortStatus({ resort, onClose }) {
  const panel = useRef(null);
  const close = useRef(onClose);
  close.current = onClose;

  // Same trap as Settings: aria-modal promises the page behind is inert, and
  // without it tabbing walks straight out onto the map.
  useEffect(() => {
    const focusables = () =>
      [...(panel.current?.querySelectorAll("button, [href], select, input, [tabindex]:not([tabindex='-1'])") ?? [])]
        .filter((el) => !el.disabled && el.offsetParent !== null);

    const onKey = (e) => {
      if (e.key === "Escape") { e.stopPropagation(); close.current(); return; }
      if (e.key !== "Tab") return;
      const items = focusables();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (!panel.current?.contains(document.activeElement)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      } else if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    const opener = document.activeElement;
    window.addEventListener("keydown", onKey);
    focusables()[0]?.focus({ preventScroll: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      if (opener instanceof HTMLElement) opener.focus({ preventScroll: true });
    };
  }, []);

  const byGrade = GRADES.map(([grade, label]) => ({
    grade, label,
    count: RUNS.filter((r) => r[3] === grade).length,
    km: RUNS.filter((r) => r[3] === grade).reduce((sum, r) => sum + r[4], 0),
  }));
  const totalKm = RUNS.reduce((sum, r) => sum + r[4], 0);
  // The mountain shuts from the top down: the earliest last-up is when your
  // options start disappearing, which is more use than the latest one.
  const lastUps = LIFTS.map((l) => l[5]);
  const firstToShut = Math.min(...lastUps);
  const lastToShut = Math.max(...lastUps);
  const alts = Object.values(NODES).map((n) => n.alt);

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={`What is open at ${resort.name}`}>
      <div className="modal__scrim" onClick={onClose} />
      <div className="modal__panel" ref={panel}>
        <header className="modal__bar">
          <h2 className="title title--sm">What is open</h2>
          <button className="iconbtn iconbtn--flat" onClick={onClose} aria-label="Close">
            <Close />
          </button>
        </header>

        <div className="modal__body">
          <div className="banner banner--warn">
            <Info width="18" height="18" style={{ flex: "none" }} />
            <p>
              Live closures are not connected yet, so this is the published
              network rather than today's. Check the lift status at the base
              before committing to a plan.
            </p>
          </div>

          <div className="field">
            <div className="eyebrow" style={{ marginBottom: "var(--s-3)" }}>Lifts</div>
            <ul className="rows">
              {LIFTS.map(([, , name, type, , lastUp]) => (
                <li className="row" key={name}>
                  <span>{name}</span>
                  <span className="row__v">
                    {type}, last up {hhmm(lastUp)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="sectionrule">
            <div className="eyebrow" style={{ marginBottom: "var(--s-3)" }}>Runs</div>
            <ul className="rows">
              {byGrade.filter((g) => g.count > 0).map((g) => (
                <li className="row" key={g.grade}>
                  <span className="row__k">
                    <i className="chip__swatch" style={{ background: PISTE_COLOUR[g.grade] }} />
                    {g.label}
                  </span>
                  <span className="row__v">
                    {g.count} runs, {g.km.toFixed(1)} km
                  </span>
                </li>
              ))}
              <li className="row">
                <span>Altitude</span>
                <span className="row__v">
                  {Math.min(...alts).toLocaleString()} to {Math.max(...alts).toLocaleString()} m
                </span>
              </li>
            </ul>
          </div>

          <div className="sectionrule">
            <div className="eyebrow" style={{ marginBottom: "var(--s-3)" }}>Planning against</div>
            <ul className="rows">
              <li className="row">
                <span>Total pisted</span>
                <span className="row__v">{totalKm.toFixed(0)} km over {RUNS.length} runs</span>
              </li>
              <li className="row">
                <span>First lift shuts</span>
                <span className="row__v">{hhmm(firstToShut)}</span>
              </li>
              <li className="row">
                <span>Last lift shuts</span>
                <span className="row__v">{hhmm(lastToShut)}</span>
              </li>
            </ul>
            <p className="note" style={{ marginTop: "var(--s-3)" }}>
              Routes are filtered against these times rather than warned about
              afterwards, so a plan will never leave you above a lift that has
              closed. Run names and times are provisional.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
