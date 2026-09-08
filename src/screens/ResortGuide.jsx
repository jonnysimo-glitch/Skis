/**
 * What this mountain is, from the card on the home screen.
 *
 * The other panel — "What is open", on the skiing tab — answers a question
 * about today and hedges every answer, because closures are not in
 * OpenStreetMap and the last-lift times are estimates. This one answers a
 * question about the place, which the graph can answer without hedging: these
 * are the pistes, this is how long they are, this is how far they drop, and
 * here is everywhere you can stop.
 *
 * The slopes are the point of it, so they get the most room: grouped by grade
 * and longest first inside each group, which is the order a skier reads —
 * the colour decides whether a run is for them at all, the length decides
 * whether it is worth the lift.
 *
 * The numbers all come from src/lib/guide.js, which derives them and is tested
 * against all four real graphs. Nothing here is written by hand except the one
 * sentence of blurb that came with the resort config, because prose about a
 * mountain invented from general knowledge is the mistake this codebase
 * started from.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Close, Mountain, Ruler, Descend, Lift, Info } from "../ui/Icons.jsx";
import { PISTE_COLOUR } from "../lib/geo.js";
import { guideFor } from "../lib/guide.js";
import { graphFor } from "../resorts/graphs.js";
import { shortName, describe } from "../lib/places.js";
import Ridge from "../ui/Ridge.jsx";

/**
 * How many pistes a group shows before it offers the rest.
 *
 * Kronplatz has 29 blues. All of them at once is a screen of list with the red
 * and black headings pushed off the bottom, and the shape of the mountain —
 * mostly blue, a few long blacks — is the thing a reader is here for. Six is
 * enough to see the top of the order and short enough that the next heading is
 * still on the screen.
 */
const FIRST_FEW = 6;

const metres = (n) => `${Math.round(n).toLocaleString()} m`;

export default function ResortGuide({ resort, onClose, onChoose }) {
  const panel = useRef(null);
  const close = useRef(onClose);
  close.current = onClose;
  const [openGrade, setOpenGrade] = useState(null);

  /*
   * The whole graph for a resort that is not the selected one.
   *
   * `graphFor` is a static import of every generated resort, so this is a
   * lookup rather than a fetch and the guide can open on any card without
   * switching the app over to that mountain first. Which matters: choosing a
   * resort is a decision, and reading about one should not make it for you.
   */
  const guide = useMemo(() => {
    const module = graphFor(resort.id);
    return module ? guideFor(module, resort) : null;
  }, [resort]);

  // Same focus trap as the other two modals. aria-modal promises the page
  // behind is inert, and without this tabbing walks straight out of it.
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

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={`About ${resort.name}`}>
      <div className="modal__scrim" onClick={onClose} />
      <div className="modal__panel modal__panel--tall" ref={panel}>
        <header className="modal__bar">
          <h2 className="title title--sm">{resort.name}</h2>
          <button className="iconbtn iconbtn--flat" onClick={onClose} aria-label="Close">
            <Close />
          </button>
        </header>

        <div className="modal__body">
          {/* The photograph, which is what a skier recognises. One per resort:
              they are the owner's own and there is not a gallery of them, so
              this does not pretend to be one. */}
          <div className="guide__art">
            <Ridge resort={resort} hero />
            <span className="guide__artscrim" />
            <span className="guide__artwhere">{resort.region}, {resort.country}</span>
          </div>

          {resort.blurb && <p className="guide__blurb">{resort.blurb}</p>}

          {!guide ? (
            <p className="note">
              This one has no mapped terrain yet, so there is nothing to
              describe past where it is.
            </p>
          ) : (
            <>
              <div className="stats stats--lg" style={{ marginTop: "var(--s-4)" }}>
                <div className="stat">
                  <span className="stat__v">{guide.pistes.length}</span>
                  <span className="stat__k">pistes</span>
                </div>
                <div className="stat">
                  <span className="stat__v">{guide.km}<span className="stat__u"> km</span></span>
                  <span className="stat__k">of piste</span>
                </div>
                <div className="stat">
                  <span className="stat__v">{guide.lifts}</span>
                  <span className="stat__k">lifts</span>
                </div>
              </div>

              {guide.highlights.length > 0 && (
                <div className="sectionrule">
                  <div className="eyebrow" style={{ marginBottom: "var(--s-3)" }}>Worth knowing</div>
                  <ul className="rows">
                    {guide.highlights.map((h) => (
                      <li className="row" key={h.k}>
                        <span className="row__k">{h.k}</span>
                        <span className="row__v">
                          <b>{h.v}</b>
                          {h.note ? <span className="row__sub"> {h.note}</span> : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* ---- the slopes, which are what this panel is for ---------- */}
              <div className="sectionrule">
                <div className="eyebrow" style={{ marginBottom: "var(--s-3)" }}>The slopes</div>
                {guide.grades.map((g) => {
                  const all = openGrade === g.grade;
                  const shown = all ? g.items : g.items.slice(0, FIRST_FEW);
                  const rest = g.items.length - shown.length;
                  return (
                    <div className="gradeblock" key={g.grade}>
                      <div className="gradeblock__head">
                        <span className="gradeblock__nm">
                          <i className="chip__swatch" style={{ background: PISTE_COLOUR[g.grade] }} />
                          {g.label}
                        </span>
                        <span className="gradeblock__sum">
                          {g.count} {g.count === 1 ? "piste" : "pistes"} · {g.km} km
                        </span>
                      </div>
                      <ul className="pistelist">
                        {shown.map((p) => (
                          <li className="piste" key={p.name}>
                            {/*
                              * A piste OSM never named is described by its
                              * ends, and saying so is the difference between a
                              * list of runs and a list of claims. It stays in
                              * the list because it is real terrain; it just is
                              * not called that.
                              */}
                            <span className={`piste__nm${p.described ? " piste__nm--unnamed" : ""}`}>
                              {p.name}
                            </span>
                            <span className="piste__nums">
                              <span className="piste__km">{p.km} km</span>
                              {p.drop > 0 && <span className="piste__drop">{metres(p.drop)}</span>}
                            </span>
                          </li>
                        ))}
                      </ul>
                      {(rest > 0 || all) && (
                        <button
                          className="btn btn--ghost btn--sm"
                          onClick={() => setOpenGrade(all ? null : g.grade)}
                          aria-expanded={all}
                        >
                          {all ? "Show fewer" : `All ${g.count} ${g.label.toLowerCase()} runs`}
                        </button>
                      )}
                    </div>
                  );
                })}
                <p className="note" style={{ marginTop: "var(--s-3)" }}>
                  {/*
                    * Said once, at the bottom, rather than beside every
                    * number. A piste mapped in eleven pieces is one piste and
                    * its length is the sum of them; the drop is its highest
                    * point to its lowest, which is what a piste map quotes.
                    */}
                  One entry per piste, however many pieces OpenStreetMap maps it
                  in. Length is the whole run; the metres are its top to its
                  bottom. Anything in italics is a piste OpenStreetMap has not
                  named, described by where it runs.
                </p>
              </div>

              {guide.eats.length > 0 && (
                <div className="sectionrule">
                  <div className="eyebrow" style={{ marginBottom: "var(--s-3)" }}>
                    Somewhere to eat
                  </div>
                  <ul className="rows">
                    {guide.eats.map((p) => (
                      <li className="row" key={`${p.name}-${p.alt}`}>
                        <span>{shortName(p.name)}</span>
                        <span className="row__v">{describe(p.name, p.kind, p.alt)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {guide.services.rental.length > 0 && (
                <div className="sectionrule">
                  <div className="eyebrow" style={{ marginBottom: "var(--s-3)" }}>Ski hire</div>
                  <ul className="rows">
                    {guide.services.rental.map((p) => (
                      <li className="row" key={p.name}>
                        <span>{shortName(p.name)}</span>
                        <span className="row__v">{metres(p.alt)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="sectionrule">
                <p className="note">
                  {/* Required, not decoration: OSM data is ODbL and attribution
                      is a condition of using it. */}
                  Pistes, lifts and places from {guide.sources.join(" and ")}.
                  Lift times and queue estimates are the app's own and are not
                  the resort's yet.
                </p>
              </div>
            </>
          )}
        </div>

        {/* One way out that is not the close button: read about a mountain,
            decide to ski it. */}
        {onChoose && (
          <div className="modal__foot">
            <button className="btn" onClick={() => { onChoose(resort.id); onClose(); }}>
              {/* The app's own verb for this, and it has to work for a
                  resort whose name already ends in "Ski". */}
              <Mountain width="18" height="18" /> Go skiing here
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
