/**
 * Settings. Small on purpose — the only thing here that changes what the
 * solver does is ability, and that is already an overridable chip on the plan
 * screen. This is where it lives permanently.
 */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Close } from "../ui/Icons.jsx";
import { hasMapKey } from "../map/config.js";
import { PLACE_SOURCES } from "../active-resort.js";
import { getProfile, saveProfile, clearProfile, MAX_NAME } from "../lib/friends.js";

const ABILITIES = [
  { v: "blue", label: "Blue", swatch: "var(--piste-blue)" },
  { v: "red", label: "Blue and red", swatch: "var(--piste-red)" },
  { v: "black", label: "Anything", swatch: "var(--piste-black)" },
];

/**
 * Throw away everything the phone is holding and ask the server again.
 *
 * Workers first, then caches, then reload. The order matters: unregistering
 * leaves the caches behind, and deleting the caches while a worker is still
 * controlling the page means it can put things back. Saved days live in
 * localStorage and are deliberately not touched — everything cleared here can
 * be fetched again, and they cannot.
 *
 * Everything is wrapped, because a browser in private mode refuses half of it
 * and a person pressing this is already having a bad time. The reload happens
 * whatever failed: a plain reload is still better than nothing, and it is what
 * they were going to do next anyway.
 */
async function refetch() {
  try {
    const workers = await navigator.serviceWorker?.getRegistrations?.() ?? [];
    await Promise.all(workers.map((w) => w.unregister()));
  } catch { /* no worker, or no permission to ask */ }
  try {
    const names = await caches?.keys?.() ?? [];
    await Promise.all(names.map((n) => caches.delete(n)));
  } catch { /* no cache storage */ }
  // Cache-busted, so the document itself comes from the network rather than
  // from whatever the browser kept alongside the worker.
  window.location.replace(`${window.location.pathname}?fresh=${Date.now()}`);
}

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
              {/*
                * Who the data came from, rather than a fixed line saying
                * OpenStreetMap. OSM is required to be credited wherever it is
                * shown and is always in this list; the others are here because
                * a person reading a car park's capacity should be able to find
                * out who counted, whether or not their licence obliges it. The
                * list is built from the places themselves, so a source that
                * was asked and had nothing to add does not take the credit.
                */}
              <li className="row">
                <span>Resort data</span>
                <span className="row__v">{PLACE_SOURCES.join(", ")}</span>
              </li>
              {/*
                * Which build is running, which is not a developer's detail on
                * an offline-first app: the phone keeps serving the cached
                * shell until the service worker has swapped it, so "the change
                * is not there" and "the change has not arrived yet" look
                * exactly the same. This is the difference, in seven
                * characters. See __BUILD__ in vite.config.js.
                */}
              <li className="row">
                <span>Version</span>
                <span className="row__v">{__BUILD__}</span>
              </li>
              {/*
                * And a way out when that number is wrong.
                *
                * An offline-first app keeps serving its cached shell, which is
                * the point of it and also the one failure a person cannot get
                * out of from inside the app. A worker that has stopped
                * checking, a deploy that went somewhere else, a build that
                * installed badly: from the outside they are identical, and the
                * only cure anyone could offer was Settings, Safari, Advanced,
                * Website Data, find github.io, swipe. That is not a thing to
                * ask of someone standing in a lift queue.
                *
                * This throws away the workers and the caches and reloads. It
                * does not touch the saved days, which are in localStorage and
                * are the one thing here that cannot be fetched again.
                */}
              <li className="row">
                <span>Not the version you expected?</span>
                <button type="button" className="row__link" onClick={refetch}>
                  Reload from the server
                </button>
              </li>
            </ul>
            <p className="note" style={{ marginTop: "var(--s-3)" }}>
              Run names and shapes come from OpenStreetMap. Lift times are
              estimated until each resort provides its own.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
