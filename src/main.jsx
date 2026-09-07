import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/app.css";
import App from "./App.jsx";

/*
 * Take a new build on the first reload, not the second.
 *
 * The service worker is registered with autoUpdate, which means the new one
 * calls skipWaiting and claims the open page as soon as it installs. What that
 * does NOT do is change the page that is already running: its HTML, its script
 * and its stylesheet were handed over by the old worker before the new one
 * existed. So a reload fetches the new worker and shows the old app, and only
 * the reload after that shows the new one.
 *
 * That is the standard behaviour and it is a bad way to ship to someone. It
 * looks exactly like a deploy that did not happen — the app is visibly the
 * previous version, with no way from inside it to tell whether the new one is
 * sitting there installed or was never built. It cost a round trip of "the
 * slopes still draw through the mountain" against a deploy that had shipped
 * hours earlier.
 *
 * `controllerchange` fires at the moment the new worker takes over, which is
 * the moment the page it is serving became stale. Reloading there collapses
 * the two reloads into one.
 *
 * Two guards. The first install has no previous controller and claims the page
 * as a matter of course; reloading for that is a pointless flash on a first
 * visit, and on the very visit where someone is deciding whether this thing
 * works. And `controllerchange` can fire more than once — an unguarded reload
 * inside it is a reload loop, which is worse than a stale build.
 */
if ("serviceWorker" in navigator) {
  const hadController = Boolean(navigator.serviceWorker.controller);
  /*
   * One automatic reload a minute, rather than one a session.
   *
   * The guard has to outlive the page, because the whole point of the reload
   * is that the page does not: a flag in this scope is reset by the very
   * reload it was meant to record, and round it goes. The first version used a
   * sessionStorage flag set once and never cleared, which stopped the loop and
   * bought a worse bug — a tab that had spent its one reload never took
   * another build again, for as long as it stayed open. On an installed app,
   * where the session outlives the day, that is "I open it and it is still the
   * old one", reported twice before this was found.
   *
   * A timestamp says the same thing without the trap. A loop would need more
   * than one reload a minute and cannot have it; a deploy an hour later is
   * picked up like the first one. sessionStorage rather than localStorage so
   * it still dies with the tab.
   */
  const SINCE = "slalom:sw-reloaded-at";
  const APART_MS = 60_000;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController) return;
    let last = 0;
    try { last = Number(sessionStorage.getItem(SINCE)) || 0; } catch { last = 0; }
    if (Date.now() - last < APART_MS) return;
    // Written before the reload, or the page that comes back does not know it
    // has already had its turn.
    try { sessionStorage.setItem(SINCE, String(Date.now())); } catch { /* private mode */ }
    window.location.reload();
  });

  /*
   * And something has to go and look.
   *
   * All of the above waits for a new worker to install, and a worker only
   * installs if the browser fetches sw.js — which it does on a navigation. An
   * installed app that is resumed from the background is not a navigation. It
   * comes back to the page it left, with the worker it left, and no reason to
   * ask whether there is a newer one, which is exactly how a phone sits on a
   * build for a day while every deploy since has been live.
   *
   * So it asks: when the app comes back to the foreground, and every half hour
   * it is left open. `update()` is a conditional request against sw.js — it
   * costs a few hundred bytes when there is nothing new, and when there is
   * something new it starts the sequence above.
   */
  let askedAt = 0;
  const ask = () => {
    // Not on every glance. Coming back to the app is the right moment to
    // check and it is also a thing someone does forty times on a chairlift,
    // and this is a request over whatever signal a valley has. Five minutes
    // between checks is far more often than a deploy happens and far less
    // often than a pocket.
    if (Date.now() - askedAt < 5 * 60 * 1000) return;
    askedAt = Date.now();
    navigator.serviceWorker.getRegistration()
      .then((r) => r?.update())
      .catch(() => { /* offline, which is most of a ski day */ });
  };
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") ask();
  });
  setInterval(ask, 30 * 60 * 1000);
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
