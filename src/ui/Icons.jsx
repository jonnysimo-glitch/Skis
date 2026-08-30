/** Inline icons. Small set, one stroke weight, no dependency. */
const base = {
  width: 20,
  height: 20,
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
export const Close = (p) => (
  <svg {...base} {...p}><path d="M5 5l10 10M15 5 5 15" /></svg>
);
export const Compass = (p) => (
  <svg {...base} {...p}><circle cx="10" cy="10" r="7" /><path d="m12.6 7.4-1.4 3.8-3.8 1.4 1.4-3.8z" /></svg>
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
