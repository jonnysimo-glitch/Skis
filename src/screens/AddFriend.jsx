/**
 * Add someone, by phone number.
 *
 * Two fields and no more. The number is what makes them them, so it is the one
 * the form is fussy about: it needs a country code, because "07700 900123" is
 * one person to a British reader and a different person to an Italian one, and
 * getting that wrong means sharing your position with a stranger.
 */
import { useEffect, useRef, useState } from "react";
import { Close } from "../ui/Icons.jsx";
import { MAX_NAME } from "../lib/friends.js";

export default function AddFriend({ onSave, onClose }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState(null);
  const panel = useRef(null);
  const close = useRef(onClose);
  close.current = onClose;

  // Same trap as the other panels: aria-modal promises the page behind is
  // inert, and without it tabbing walks straight out onto the list.
  useEffect(() => {
    const focusables = () =>
      [...(panel.current?.querySelectorAll("button, input") ?? [])]
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
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    };
    const opener = document.activeElement;
    window.addEventListener("keydown", onKey);
    panel.current?.querySelector("input")?.focus({ preventScroll: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      if (opener instanceof HTMLElement) opener.focus({ preventScroll: true });
    };
  }, []);

  const submit = (e) => {
    e.preventDefault();
    const result = onSave({ name, phone });
    if (result?.ok) onClose();
    else setError(result);
  };

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Add someone">
      <div className="modal__scrim" onClick={onClose} />
      <div className="modal__panel" ref={panel}>
        <header className="modal__bar">
          <h2 className="title title--sm">Add someone</h2>
          <button className="iconbtn iconbtn--flat" onClick={onClose} aria-label="Close">
            <Close />
          </button>
        </header>

        <form className="modal__body" onSubmit={submit}>
          <div className="field">
            <label className="flabel" htmlFor="f-name">Name</label>
            <input
              id="f-name"
              className={`control${error?.error === "name" ? " control--bad" : ""}`}
              value={name}
              autoComplete="name"
              maxLength={MAX_NAME}
              placeholder="What you call them"
              onChange={(e) => { setName(e.target.value); setError(null); }}
            />
          </div>

          <div className="field">
            <label className="flabel" htmlFor="f-phone">Phone number</label>
            <input
              id="f-phone"
              className={`control${error && error.error !== "name" ? " control--bad" : ""}`}
              value={phone}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              maxLength={24}
              placeholder="+39 333 123 4567"
              onChange={(e) => { setPhone(e.target.value); setError(null); }}
            />
            {/* No hint under the field. The placeholder already shows the
                country code, and the one case that needs explaining is the
                one that gets it — the error below says what is wrong when a
                number is typed without one. */}
          </div>

          {error && (
            <p className="note note--bad" role="alert">{error.message}</p>
          )}

          <button className="btn" type="submit">Add</button>
        </form>
      </div>
    </div>
  );
}
