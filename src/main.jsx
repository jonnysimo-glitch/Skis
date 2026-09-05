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
   * At most one automatic reload per tab, ever.
   *
   * A flag in this scope only lasts as long as the page it is in, and the
   * whole point of the reload is that the page does not last. So the guard has
   * to outlive it: land on a build, take over, reload — and if the reloaded
   * page finds ANOTHER new worker waiting, the flag it was relying on has been
   * reset to false along with everything else, and round it goes. During a run
   * of deploys that is a page that reloads whenever it is touched, which is
   * how it was reported.
   *
   * sessionStorage survives a reload and dies with the tab, which is exactly
   * the lifetime this needs. A second new build in the same session waits for
   * the next navigation, which is the behaviour before any of this and is only
   * ever one reload behind.
   */
  const ONCE = "skis:sw-reloaded";
  let already = false;
  try { already = sessionStorage.getItem(ONCE) === "1"; } catch { already = false; }
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController || already) return;
    already = true;
    // Written before the reload, or the page that comes back does not know it
    // has already had its turn.
    try { sessionStorage.setItem(ONCE, "1"); } catch { /* private mode */ }
    window.location.reload();
  });
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
