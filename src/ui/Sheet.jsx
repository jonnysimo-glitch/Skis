/**
 * The bottom sheet. The primary surface on the skiing tab: content drags up
 * over the map, and the map is never fully hidden.
 *
 * Drag handling uses native listeners against a ref rather than React's
 * synthetic events against state. State is a render behind by definition, so
 * a move handler reading it computes its delta from a stale origin, and the
 * sheet only appears to move because the release snaps it somewhere. Height
 * lives in a ref, is written straight to the element during a drag, and is
 * only committed to state when the gesture ends.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronUp, ChevronDown } from "./Icons.jsx";

/**
 * Three stops, well apart.
 *
 * Peek was 0.3, which is a third of the screen for a state whose job is to show
 * a title and get out of the way, and tall was 0.86, which left content behind
 * a scroll on a sheet the user had just dragged all the way up. So it managed
 * to be too much when down and not enough when up.
 *
 * The spacing matters as much as the values. Screens used to open at their own
 * fraction, and `points()` adds that to the list, so choose had stops at 0.3,
 * 0.56, 0.66 and 0.86 — two of them a tenth apart, which is what makes a drag
 * feel indecisive rather than magnetic. Screens now open on one of these three.
 */
export const SNAP = { peek: 0.24, half: 0.58, tall: 0.92 };

/** Never let the sheet cover everything: a strip of mountain always shows. */
const MAX_FRACTION = 0.94;
const MIN_FRACTION = 0.16;

export default function Sheet({ snap = "half", snaps, children, onSnapChange }) {
  const target = SNAP[snap] ?? snap;

  const el = useRef(null);
  const heightRef = useRef(0);
  const [, force] = useState(0);

  const vh = () => (typeof window === "undefined" ? 800 : window.innerHeight);

  /**
   * Where the sheet can rest. Always includes whatever the current screen
   * asked for, so a screen that opens at 0.8 can be returned to rather than
   * being snapped away the first time it is touched.
   */
  const points = useCallback(() => {
    const base = snaps || [SNAP.peek, SNAP.half, SNAP.tall];
    return [...new Set([...base, target])].sort((a, b) => a - b);
  }, [snaps, target]);

  const apply = useCallback((h, animate) => {
    heightRef.current = h;
    const node = el.current;
    if (!node) return;
    node.style.transition = animate ? "height 0.4s cubic-bezier(0.32,0.72,0,1)" : "none";
    node.style.height = `${Math.round(h)}px`;
    onSnapChange?.(Math.round(h));
    // Only when the sheet settles, never mid-drag: the expand button's chevron
    // has to know which way it points, and height lives in a ref precisely so
    // that dragging does not render.
    if (animate) force((n) => n + 1);
  }, [onSnapChange]);

  // Open at whatever the current screen asked for.
  useLayoutEffect(() => {
    apply(vh() * target, true);
    force((n) => n + 1);
  }, [target, apply]);

  useEffect(() => {
    const node = el.current;
    if (!node) return undefined;

    let drag = null;

    const onDown = (e) => {
      // The body scrolls and the footer's buttons are buttons; starting a drag
      // on either would fight the gesture the user meant. The expand button is
      // in the drag strip itself, so without it here the sheet captures the
      // pointer and the tap never becomes a click.
      if (e.target.closest?.(".sheet__body, .sheet__foot, .sheet__expand")) return;
      drag = { id: e.pointerId, y: e.clientY, from: heightRef.current };
      node.setPointerCapture(e.pointerId);
      // A drag starting on the handle sweeps the pointer across the heading
      // below it, and the sheet lands with half its text highlighted. Selection
      // is suppressed for the gesture only, so text stays selectable at rest.
      node.classList.add("sheet--dragging");
    };

    const onMove = (e) => {
      if (!drag || drag.id !== e.pointerId) return;
      e.preventDefault();
      const next = Math.min(
        vh() * MAX_FRACTION,
        Math.max(vh() * MIN_FRACTION, drag.from + (drag.y - e.clientY))
      );
      apply(next, false);
    };

    const onUp = (e) => {
      if (!drag || drag.id !== e.pointerId) return;
      drag = null;
      node.classList.remove("sheet--dragging");
      try { node.releasePointerCapture(e.pointerId); } catch { /* already gone */ }
      const fraction = heightRef.current / vh();
      const nearest = points().reduce((best, p) =>
        Math.abs(p - fraction) < Math.abs(best - fraction) ? p : best
      );
      apply(vh() * nearest, true);
    };

    node.addEventListener("pointerdown", onDown);
    node.addEventListener("pointermove", onMove);
    node.addEventListener("pointerup", onUp);
    node.addEventListener("pointercancel", onUp);
    return () => {
      node.removeEventListener("pointerdown", onDown);
      node.removeEventListener("pointermove", onMove);
      node.removeEventListener("pointerup", onUp);
      node.removeEventListener("pointercancel", onUp);
    };
  }, [apply, points]);

  useEffect(() => {
    const onResize = () => apply(Math.min(heightRef.current, vh() * MAX_FRACTION), false);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [apply]);

  // Dragging is the nice way to do this and the only way, which is a problem
  // in a glove on a chairlift: it needs a deliberate, accurate swipe. The
  // button is the direct route to the same two states — all of it, or back to
  // the map.
  const stops = points();
  const tall = stops[stops.length - 1];
  const atTop = heightRef.current >= vh() * tall - 4;
  // Shrinking returns to where the screen opened, which is the height it was
  // designed around. A screen that opens at the top drops one stop instead.
  const resting = target < tall - 0.001 ? target : (stops[stops.length - 2] ?? tall);
  const toggle = () => apply(vh() * (atTop ? resting : tall), true);

  return (
    <section ref={el} className="sheet">
      <div className="sheet__grab" role="separator" aria-label="Drag to resize the panel">
        <i />
      </div>
      <button
        className="sheet__expand"
        onClick={toggle}
        aria-label={atTop ? "Shrink the panel" : "Expand the panel"}
        aria-expanded={atTop}
      >
        {atTop ? <ChevronDown width="18" height="18" /> : <ChevronUp width="18" height="18" />}
      </button>
      {children}
    </section>
  );
}

/** Head / body / foot slots, so screens do not each re-invent the padding. */
export const SheetHead = ({ children }) => <header className="sheet__head">{children}</header>;

export const SheetBody = ({ children, innerRef, ...rest }) => (
  <div className="sheet__body" ref={innerRef} {...rest}>
    {children}
    <div className="spacer" />
  </div>
);

export const SheetFoot = ({ children, bare }) => (
  <footer className={`sheet__foot${bare ? " sheet__foot--bare" : ""}`}>{children}</footer>
);
