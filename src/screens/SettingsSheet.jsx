/**
 * Settings. Small on purpose — the only thing here that changes what the
 * solver does is ability, and that is already an overridable chip on the plan
 * screen. This is where it lives permanently.
 */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Close } from "../ui/Icons.jsx";
import { hasMapKey } from "../map/config.js";
import { getProfile, saveProfile, clearProfile, MAX_NAME } from "../lib/friends.js";

const ABILITIES = [
  { v: "blue", label: "Blue", swatch: "var(--piste-blue)" },
  { v: "red", label: "Blue and red", swatch: "var(--piste-red)" },
  { v: "black", label: "Anything", swatch: "var(--piste-black)" },
];

export default function SettingsSheet({ ability, setAbility, onClose, onProfileChange }) {
  // The profile is a name and a number. No picture: it is not how anyone finds
  // their friend on a mountain, and it is one more thing to be careless with.
  const saved = getProfile();
  const [name, setName] = useState(saved?.name ?? "");
  const [phone, setPhone] = useState(saved?.typed ?? saved?.phone ?? "");
  const [error, setError] = useState(null);
  const [saved_, setSaved] = useState(false);

  // Closing the panel removes the focused input, which fires blur, which runs
  // commit while the component is being torn down. The state it set there was
  // enough to lose the focus this panel puts back on whatever opened it. A
  // layout effect's cleanup runs before the DOM is removed, so by the time
  // that blur arrives this is already false.
  const alive = useRef(true);
  useLayoutEffect(() => () => { alive.current = false; }, []);

  const commit = () => {
    if (!alive.current) return;
    if (!name.trim() && !phone.trim()) {
      // Only when there was one. Blurring two empty fields on the way out of
      // the panel should not count as an edit, let alone one that re-renders
      // the screen underneath.
      if (saved) {
        clearProfile();
        onProfileChange?.();
      }
      setError(null);
      setSaved(false);
      return;
    }
    const r = saveProfile({ name, phone });
    setError(r.ok ? null : r);
    setSaved(r.ok);
    if (r.ok) onProfileChange?.();
  };

  const panel = useRef(null);
  const close = useRef(onClose);
  close.current = onClose;

  // A dialog closes on Escape and keeps focus inside itself. `aria-modal`
  // promises the rest of the page is inert; without a trap that promise is a
  // lie, and tabbing walks straight out into the map behind it.
  //
  // Mount only: re-running this would drag focus back to Close on every
  // ability tap.
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
      // Wrap at both ends, and pull focus back in if it has escaped already.
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

    // Whatever opened this gets focus back when it closes.
    const opener = document.activeElement;
    window.addEventListener("keydown", onKey);
    focusables()[0]?.focus({ preventScroll: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      if (opener instanceof HTMLElement) opener.focus({ preventScroll: true });
    };
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
            <label className="flabel" htmlFor="s-name">Your name</label>
            <input
              id="s-name"
              className={`control${error?.error === "name" ? " control--bad" : ""}`}
              value={name}
              autoComplete="name"
              maxLength={MAX_NAME}
              placeholder="What your friends call you"
              onChange={(e) => { setName(e.target.value); setError(null); setSaved(false); }}
              onBlur={commit}
            />
          </div>

          <div className="field">
            <label className="flabel" htmlFor="s-phone">Your phone number</label>
            <input
              id="s-phone"
              className={`control${error && error.error !== "name" ? " control--bad" : ""}`}
              value={phone}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              maxLength={24}
              placeholder="+39 333 123 4567"
              onChange={(e) => { setPhone(e.target.value); setError(null); setSaved(false); }}
              onBlur={commit}
            />
            {error ? (
              <p className="note note--bad" role="alert">{error.message}</p>
            ) : (
              <p className="note" style={{ marginTop: 8 }}>
                {saved_ ? "Saved." : "How friends add you, with the country code. It stays on this phone."}
              </p>
            )}
          </div>

          <div className="sectionrule">
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
