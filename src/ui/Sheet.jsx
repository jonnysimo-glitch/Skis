/**
 * The dock: the panel that sits under the map.
 *
 * It used to be a bottom sheet you dragged, with three snap points and an
 * expand button. It is not any more, at the user's request and for a good
 * reason: over a map, a surface that moves under your thumb competes with the
 * map's own gestures, and every screen that uses it has one job and one
 * height. So it is fixed. It sizes itself to what is in it, never covers more
 * of the mountain than it has to, and if a screen's content is taller than the
 * ceiling the body scrolls inside it.
 *
 * Its height is still published, because the map frames the route into the
 * part of the viewport the chrome is not using. Measured now rather than
 * computed from a snap fraction.
 */
import { useEffect, useLayoutEffect, useRef } from "react";

/**
 * The most of the screen a dock may take.
 *
 * The map is the hero and it is never fully covered. 0.72 leaves a usable band
 * of mountain above the longest panel in the app, which is the empty state
 * with two fixes in it.
 */
const MAX_FRACTION = 0.72;

export default function Sheet({ children, onSnapChange }) {
  const el = useRef(null);
  const reported = useRef(-1);

  // Publish the height whenever it changes, and not when it has not: the map
  // re-frames on this, and re-framing on every render made the camera twitch.
  const publish = () => {
    const node = el.current;
    if (!node) return;
    const h = Math.round(node.getBoundingClientRect().height);
    if (h === reported.current) return;
    reported.current = h;
    onSnapChange?.(h);
  };

  useLayoutEffect(publish);

  useEffect(() => {
    const node = el.current;
    if (!node || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(publish);
    observer.observe(node);
    window.addEventListener("resize", publish);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", publish);
    };
  });

  return (
    <section
      ref={el}
      className="sheet"
      style={{ maxHeight: `${MAX_FRACTION * 100}%` }}
    >
      {children}
    </section>
  );
}

/** Head / body / foot slots, so screens do not each re-invent the padding. */
export const SheetHead = ({ children }) => <header className="sheet__head">{children}</header>;

export const SheetBody = ({ children, innerRef, ...rest }) => (
  <div className="sheet__body" ref={innerRef} {...rest}>
    {children}
  </div>
);

export const SheetFoot = ({ children, bare }) => (
  <footer className={`sheet__foot${bare ? " sheet__foot--bare" : ""}`}>{children}</footer>
);
