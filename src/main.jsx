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
  let reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController || reloading) return;
    reloading = true;
    window.location.reload();
  });
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
