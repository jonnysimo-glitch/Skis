/**
 * The bottom sheet. This is the primary surface — content lives here and drags
 * up over the map, and the map is never fully hidden.
 *
 * Snap points are fractions of viewport height. Each screen declares which one
 * it opens at; the user can always drag from there. The top snap stops short of
 * the full height on purpose — a strip of terrain stays visible so you never
 * lose your place on the mountain.
 */
import { useCallback, useEffect, useRef, useState } from "react";

export const SNAP = { peek: 0.3, half: 0.56, tall: 0.86 };

export default function Sheet({ snap = "half", snaps, children, onSnapChange }) {
  const points = snaps || [SNAP.peek, SNAP.half, SNAP.tall];
  const target = SNAP[snap] ?? snap;

  const holder = useRef(null);
  const bodyRef = useRef(null);
  const [height, setHeight] = useState(() =>
    Math.round((typeof window === "undefined" ? 800 : window.innerHeight) * target)
  );
  const [animating, setAnimating] = useState(true);
  const drag = useRef(null);

  const vh = () => (typeof window === "undefined" ? 800 : window.innerHeight);

  // Screen changed its requested snap.
  useEffect(() => {
    setAnimating(true);
    const next = Math.round(vh() * target);
    setHeight(next);
    onSnapChange?.(next);
  }, [target]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onResize = () => setHeight((h) => Math.min(h, Math.round(vh() * 0.92)));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const settle = useCallback(
    (raw) => {
      const fraction = raw / vh();
      let best = points[0];
      for (const p of points) {
        if (Math.abs(p - fraction) < Math.abs(best - fraction)) best = p;
      }
      const next = Math.round(vh() * best);
      setAnimating(true);
      setHeight(next);
      onSnapChange?.(next);
    },
    [points, onSnapChange]
  );

  const onPointerDown = (e) => {
    // Let the body scroll normally unless it is already at the top and the
    // user is pulling down — then the gesture belongs to the sheet.
    drag.current = {
      id: e.pointerId,
      y: e.clientY,
      startHeight: height,
      fromGrab: e.currentTarget.dataset.grab === "1",
    };
    setAnimating(false);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const delta = d.y - e.clientY;
    if (!d.fromGrab) {
      const body = bodyRef.current;
      const atTop = !body || body.scrollTop <= 0;
      if (!(atTop && delta < 0)) return; // scrolling, not dragging
    }
    e.preventDefault?.();
    const next = Math.max(vh() * 0.16, Math.min(vh() * 0.92, d.startHeight + delta));
    setHeight(next);
  };

  const onPointerUp = (e) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* gone */ }
    settle(height);
  };

  return (
    <section
      ref={holder}
      className={`sheet${animating ? " sheet--animating" : ""}`}
      style={{ height: `${height}px` }}
      onTransitionEnd={() => setAnimating(false)}
    >
      <div
        className="sheet__grab"
        data-grab="1"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        role="separator"
        aria-label="Drag to resize the panel"
      >
        <i />
      </div>
      {typeof children === "function" ? children({ bodyRef, onPointerDown, onPointerMove, onPointerUp }) : children}
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
