/**
 * Resort registry.
 *
 * Only Monterosa Ski is live. The others exist so the selection panel tells the
 * truth about what is coming rather than pretending to be a global product.
 *
 * Adding a second live resort is deliberately NOT abstracted yet. `solver.js`
 * imports its graph from `resort.js` directly and that is fine while there is
 * one graph; parameterising it before a second real dataset exists would be
 * guessing at the shape of the thing. The change, when it comes, is small:
 * pass the graph into `solve()` instead of importing it. Everything else in
 * the app already routes through this registry.
 */

import { NODES } from "../resort.js";

const baseKeys = Object.keys(NODES).filter((k) => NODES[k].base);
const alts = Object.values(NODES).map((n) => n.alt);

export const RESORTS = [
  {
    id: "monterosa",
    name: "Monterosa Ski",
    region: "Valle d'Aosta",
    country: "Italy",
    available: true,
    /** Camera home position for the 3D map. */
    center: [7.8309, 45.8636],
    zoom: 11.6,
    pitch: 62,
    bearing: -24,
    /** Bounding box for offline tile warming: [w, s, e, n]. */
    bbox: [7.7, 45.8, 7.96, 45.92],
    bases: baseKeys,
    defaultBase: "staffal",
    /** Sensible clock defaults. Minute-of-day. */
    firstLift: 8 * 60 + 30,
    lastDown: 16 * 60 + 30,
    stats: {
      lifts: 12,
      runs: 17,
      top: Math.max(...alts),
      bottom: Math.min(...alts),
      valleys: 3,
    },
    blurb: "Gressoney, Ayas and Alagna, linked over two high cols.",
  },
  {
    id: "courmayeur",
    name: "Courmayeur",
    region: "Valle d'Aosta",
    country: "Italy",
    available: false,
  },
  {
    id: "cervinia",
    name: "Cervinia / Zermatt",
    region: "Valle d'Aosta",
    country: "Italy / Switzerland",
    available: false,
  },
  {
    id: "lathuile",
    name: "La Thuile / La Rosière",
    region: "Valle d'Aosta",
    country: "Italy / France",
    available: false,
  },
];

export const getResort = (id) => RESORTS.find((r) => r.id === id) || null;
export const defaultResort = RESORTS.find((r) => r.available);
