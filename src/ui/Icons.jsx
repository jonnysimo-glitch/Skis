/**
 * Inline icons. Small set, one stroke weight, no dependency.
 *
 * Every one of these is decorative: each button that carries an icon also
 * carries a label or an aria-label, so a screen reader announcing "graphic"
 * beside it is noise. Hidden by default here rather than at each of the
 * hundred or so call sites, and `{...p}` still wins if one ever needs a name.
 */
const base = {
  width: 20,
  height: 20,
  "aria-hidden": true,
  focusable: "false",
  viewBox: "0 0 20 20",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export const Back = (p) => (
  <svg {...base} {...p}><path d="M12 4 6 10l6 6" /></svg>
);
export const ChevronDown = (p) => (
  <svg {...base} {...p}><path d="M4 7.5 10 13.5l6-6" /></svg>
);
export const ChevronUp = (p) => (
  <svg {...base} {...p}><path d="M4 12.5 10 6.5l6 6" /></svg>
);
export const Close = (p) => (
  <svg {...base} {...p}><path d="M5 5l10 10M15 5 5 15" /></svg>
);
/** A magnifier, drawn at the same weight as the rest of the set. */
export const Search = (p) => (
  <svg {...base} {...p}>
    <circle cx="8.5" cy="8.5" r="5.5" />
    <path d="M12.5 12.5 17 17" />
  </svg>
);
/**
 * A needle, not a dial.
 *
 * This was a ring with a small symmetric diamond in it, which read as an eye
 * and, worse, looked the same whichever way it was turned — no use at all on a
 * control whose whole job is to show you where north is. Two triangles: the
 * north half solid, the south half hollow. No ring, because the button it sits
 * in is already a circle.
 *
 * Not red for north, however conventional. Red is a piste grade here, and a
 * grade colour used as decoration is a safety problem rather than a taste one.
 */
export const Compass = (p) => (
  <svg {...base} {...p}>
    <path d="M10 2.8L13.4 10L6.6 10Z" fill="currentColor" stroke="none" />
    <path d="M10 17.2L13.4 10L6.6 10Z" />
  </svg>
);
export const Layers = (p) => (
  <svg {...base} {...p}><path d="m10 3 7 4-7 4-7-4z" /><path d="m3.5 10.5 6.5 3.7 6.5-3.7" /></svg>
);
export const Plus = (p) => (
  <svg {...base} {...p}><path d="M10 5v10M5 10h10" /></svg>
);
export const Minus = (p) => (
  <svg {...base} {...p}><path d="M5 10h10" /></svg>
);
export const Rotate = (p) => (
  <svg {...base} {...p}><path d="M16 10a6 6 0 1 1-1.8-4.3" /><path d="M16 3v3.2h-3.2" /></svg>
);
export const Clock = (p) => (
  <svg {...base} {...p}><circle cx="10" cy="10" r="7" /><path d="M10 6v4.2l2.6 1.6" /></svg>
);
export const Pin = (p) => (
  <svg {...base} {...p}><path d="M10 17s5.2-4.6 5.2-8.2a5.2 5.2 0 1 0-10.4 0C4.8 12.4 10 17 10 17Z" /><circle cx="10" cy="8.8" r="1.9" /></svg>
);
export const Download = (p) => (
  <svg {...base} {...p}><path d="M10 3.5v8.5" /><path d="m6.5 8.8 3.5 3.5 3.5-3.5" /><path d="M4 15.5h12" /></svg>
);
export const Check = (p) => (
  <svg {...base} {...p}><path d="m4.5 10.5 3.6 3.5L15.5 6.5" /></svg>
);
export const Warning = (p) => (
  <svg {...base} {...p}><path d="M10 3.4 17.2 16H2.8z" /><path d="M10 8v3.4" /><circle cx="10" cy="13.7" r=".8" fill="currentColor" stroke="none" /></svg>
);
export const Info = (p) => (
  <svg {...base} {...p}><circle cx="10" cy="10" r="7" /><path d="M10 9.2v4.2" /><circle cx="10" cy="6.7" r=".8" fill="currentColor" stroke="none" /></svg>
);
export const Wifi = (p) => (
  <svg {...base} {...p}><path d="M3 8.2a10 10 0 0 1 14 0" /><path d="M5.8 11a6 6 0 0 1 8.4 0" /><circle cx="10" cy="14.4" r=".9" fill="currentColor" stroke="none" /></svg>
);
export const Locate = (p) => (
  <svg {...base} {...p}><circle cx="10" cy="10" r="4.6" /><path d="M10 1.6v2.4M10 16v2.4M18.4 10H16M4 10H1.6" /></svg>
);
export const Arrow = (p) => (
  <svg {...base} {...p}><path d="M4 10h11" /><path d="m10.5 5.5 4.5 4.5-4.5 4.5" /></svg>
);
export const Mountain = (p) => (
  <svg {...base} {...p}><path d="m2 15.5 5-8 3.2 4.8" /><path d="m8 15.5 4.6-7.4L18 15.5z" /></svg>
);
export const Restart = (p) => (
  <svg {...base} {...p}><path d="M4 10a6 6 0 1 0 1.8-4.3" /><path d="M4 3v3.2h3.2" /></svg>
);

/* Stat icons. Same stroke weight as the rest. */
export const Ruler = (p) => (
  <svg {...base} {...p}><path d="M3 12.5 12.5 3l4.5 4.5L7.5 17z" /><path d="M6.4 9.1 8 10.7M8.8 6.7l1.6 1.6M11.2 4.3l1.6 1.6" /></svg>
);
export const Descend = (p) => (
  <svg {...base} {...p}><path d="M4 4v12h12" /><path d="M7.5 7 11 11l2-2 3.5 4" /></svg>
);
export const Runs = (p) => (
  <svg {...base} {...p}><path d="M3 15.5 8 6l3 5 2-3 4 7.5z" /></svg>
);
export const Lift = (p) => (
  <svg {...base} {...p}><path d="M2.5 5.5 17.5 9" /><path d="M8 7.3v3.2" /><rect x="5" y="10.5" width="6" height="5" rx="1.4" /></svg>
);
export const Peak = (p) => (
  <svg {...base} {...p}><path d="m2.5 16 5-8 2.5 4L14 5l4 11z" /><path d="M12 8.6 14 5l2 3.6z" fill="currentColor" stroke="none" /></svg>
);

/* Tab bar. Drawn at 24px, so slightly simpler than the inline icons above. */
export const HomeIcon = (p) => (
  <svg {...base} {...p}><path d="M3.5 8.5 10 3.2l6.5 5.3V16a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1z" /><path d="M8 17v-4.5h4V17" /></svg>
);
export const Chart = (p) => (
  <svg {...base} {...p}><path d="M3.5 16.5h13" /><path d="M6 16.5V10M10 16.5V4.5M14 16.5v-4" /></svg>
);
/**
 * A cog, not a sun.
 *
 * This was a small circle with eight rays floating off it, and at 20px the eye
 * reads that as light coming off a star. Moving the teeth closer did not help:
 * spikes on a circle read as a sun at any spacing. The teeth have to be part
 * of the wheel's outline, so this is one contour that steps between a tip
 * radius of 7.5 and a root radius of 5.1 eight times, with a hub inside it.
 */
export const Gear = (p) => (
  <svg {...base} {...p}>
    <path d="M8.31 2.69A7.5 7.5 0 0 1 11.69 2.69L11.66 5.18A5.1 5.1 0 0 1 12.24 5.42L13.97 3.64A7.5 7.5 0 0 1 16.36 6.03L14.58 7.76A5.1 5.1 0 0 1 14.82 8.34L17.31 8.31A7.5 7.5 0 0 1 17.31 11.69L14.82 11.66A5.1 5.1 0 0 1 14.58 12.24L16.36 13.97A7.5 7.5 0 0 1 13.97 16.36L12.24 14.58A5.1 5.1 0 0 1 11.66 14.82L11.69 17.31A7.5 7.5 0 0 1 8.31 17.31L8.34 14.82A5.1 5.1 0 0 1 7.76 14.58L6.03 16.36A7.5 7.5 0 0 1 3.64 13.97L5.42 12.24A5.1 5.1 0 0 1 5.18 11.66L2.69 11.69A7.5 7.5 0 0 1 2.69 8.31L5.18 8.34A5.1 5.1 0 0 1 5.42 7.76L3.64 6.03A7.5 7.5 0 0 1 6.03 3.64L7.76 5.42A5.1 5.1 0 0 1 8.34 5.18L8.31 2.69Z" />
    <circle cx="10" cy="10" r="2.5" />
  </svg>
);
export const Trash = (p) => (
  <svg {...base} {...p}><path d="M4 6h12" /><path d="M8 6V4.5h4V6" /><path d="M5.5 6l.7 10a1 1 0 0 0 1 .9h5.6a1 1 0 0 0 1-.9l.7-10" /></svg>
);
export const Satellite = (p) => (
  <svg {...base} {...p}><circle cx="10" cy="10" r="2.2" /><path d="M5.4 14.6a6.5 6.5 0 0 1 0-9.2M14.6 5.4a6.5 6.5 0 0 1 0 9.2" /><path d="M3 17a9.5 9.5 0 0 1 0-14M17 3a9.5 9.5 0 0 1 0 14" /></svg>
);
