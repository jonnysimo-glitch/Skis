/**
 * Settings. Small on purpose — the only thing here that changes what the
 * solver does is ability, and that is already an overridable chip on the plan
 * screen. This is where it lives permanently.
 */
import { useEffect, useRef } from "react";
import { Close } from "../ui/Icons.jsx";
import { hasMapKey } from "../map/config.js";

const ABILITIES = [
  { v: "blue", label: "Blue", swatch: "var(--piste-blue)" },
  { v: "red", label: "Blue and red", swatch: "var(--piste-red)" },
  { v: "black", label: "Anything", swatch: "var(--piste-black)" },
];

export default function SettingsSheet({ ability, setAbility, onClose }) {
  const panel = useRef(null);
  const close = useRef(onClose);
  close.current = onClose;

  // A dialog closes on Escape and takes focus off whatever is behind it. Mount
  // only: re-running this would drag focus back to Close on every ability tap.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") { e.stopPropagation(); close.current(); }
    };
    window.addEventListener("keydown", onKey);
    panel.current?.querySelector("button")?.focus({ preventScroll: true });
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Settings">
      <div className="modal__scrim" onClick={onClose} />
      <div className="modal__panel" ref={panel}>
        <header className="modal__bar">
          <h2 className="title title--sm">Settings</h2>
          <button className="iconbtn iconbtn--flat" onClick={onClose} aria-label="Close">
            <Close />
          </button>
        </header>

        <div className="modal__body">
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
            <p className="note" style={{ marginTop: "var(--s-2)" }}>
              The hardest grade you want to be sent down.
            </p>
          </div>

          <div className="sectionrule">
            <div className="eyebrow" style={{ marginBottom: "var(--s-3)" }}>About</div>
            <ul className="rows">
              <li className="row">
                <span>Terrain</span>
                <span className="row__v">{hasMapKey ? "Satellite relief" : "Open elevation data"}</span>
              </li>
              <li className="row">
                <span>Your data</span>
                <span className="row__v">Stays on this phone</span>
              </li>
              <li className="row">
                <span>Resort data</span>
                <span className="row__v">Provisional</span>
              </li>
            </ul>
            <p className="note" style={{ marginTop: "var(--s-3)" }}>
              Run names and lift times are provisional and will change.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
