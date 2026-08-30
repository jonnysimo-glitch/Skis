/**
 * Brand colours for the places that cannot read CSS custom properties:
 * MapLibre paint expressions, the 2D canvas terrain, and SVG attributes.
 *
 * Keep these in step with src/styles/tokens.css. scripts/check-contrast.mjs
 * asserts the accent stays clearly distinct from the piste difficulty
 * signals, which matters more here than anywhere — this is the set that gets
 * drawn over the mountain.
 */

/** Route casing over terrain. Bright enough to hold up on snow and on rock. */
export const ACCENT_LINE = "#2ac4ee";
/** Solid accent for markers and small marks on a light surface. */
export const ACCENT = "#0077a3";
/** The darkest neutral, used for outlines and the finish marker. */
export const INK = "#0a1922";
