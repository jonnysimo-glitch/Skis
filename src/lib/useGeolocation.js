/**
 * A live position fix, or an honest reason there isn't one.
 *
 * `watchPosition` rather than repeated `getCurrentPosition` calls: the browser
 * keeps the radio warm and delivers updates as they arrive, which is both
 * faster and cheaper on battery than polling.
 *
 * Every failure has a distinct state. A navigation screen that silently stops
 * updating is worse than one that says it has lost you.
 */
import { useEffect, useRef, useState } from "react";

/**
 * A fix worse than this is not good enough to decide you have arrived
 * somewhere. Consumer GPS is 5-20 m in the open; a reading of 100 m means the
 * phone is guessing from wifi or a cell tower.
 */
export const USABLE_ACCURACY_M = 50;

/**
 * @returns {{
 *   state: 'idle'|'locating'|'live'|'denied'|'unavailable'|'insecure',
 *   fix: null | { lat, lon, accuracy, speed, heading, at },
 *   error: string|null,
 * }}
 */
export function useGeolocation(enabled) {
  const [state, setState] = useState("idle");
  const [fix, setFix] = useState(null);
  const watchId = useRef(null);

  useEffect(() => {
    if (!enabled) {
      setState("idle");
      return undefined;
    }
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState("unavailable");
      return undefined;
    }
    // Geolocation needs a secure context. Over http on a LAN address — how you
    // open this on a phone during development — the browser reports a denied
    // permission, which sends you to settings to fix something that was never
    // the problem.
    if (typeof window !== "undefined" && window.isSecureContext === false) {
      setState("insecure");
      return undefined;
    }

    setState("locating");
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        setState("live");
        setFix({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          speed: pos.coords.speed,      // m/s, null if the device cannot tell
          heading: pos.coords.heading,  // degrees, null when stationary
          at: pos.timestamp,
        });
      },
      (error) => {
        setState(error?.code === 1 ? "denied" : "unavailable");
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    );

    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
    };
  }, [enabled]);

  return { state, fix, usable: state === "live" && fix?.accuracy <= USABLE_ACCURACY_M };
}

/** Metres per second → km/h, rounded, or null when the device cannot tell. */
export const kmh = (metresPerSecond) =>
  typeof metresPerSecond === "number" && metresPerSecond >= 0
    ? Math.round(metresPerSecond * 3.6)
    : null;
