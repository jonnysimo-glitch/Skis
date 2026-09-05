/**
 * Resort registry.
 *
 * Three kinds of entry live here, and the difference matters because the
 * selection panel has to tell the truth about what is behind each one.
 *
 *   Generated — a resort the OSM pipeline has built. Its entry is the META
 *   object in its own module, derived from its graph and its config at build
 *   time. Nothing about it is typed here, which is the point: adding a resort
 *   is a config file and a workflow run.
 *
 *   Built in — Monterosa, whose hand-typed graph in ../resort.js predates the
 *   pipeline and carries no META. Its entry is written out below and is
 *   dropped the moment the pipeline builds a real monterosa.js, because that
 *   graph is the more accurate one.
 *
 *   Coming — a resort with no data yet. Listed so the panel can say what is
 *   on the way rather than pretending to be a global product, and carrying
 *   only figures the resorts themselves publish. A resort with no altitudes
 *   gets a generic ridgeline rather than invented ones, the same rule the
 *   graphs follow: no number appears unless it came from somewhere.
 */

import { GRAPHS } from "./graphs.js";
import { NODES, RUNS } from "../resort.js";

const baseKeys = Object.keys(NODES).filter((k) => NODES[k].base);
const alts = Object.values(NODES).map((n) => n.alt);

/** Monterosa from the hand-typed graph. Superseded by a generated monterosa.js. */
const BUILT_IN = {
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
    km: RUNS.reduce((sum, r) => sum + r[4], 0),
    top: Math.max(...alts),
    bottom: Math.min(...alts),
    valleys: 3,
  },
  blurb: "Gressoney, Ayas and Alagna, linked over two high cols.",
};

const COMING = [
  {
    id: "kronplatz",
    name: "Kronplatz",
    region: "South Tyrol",
    country: "Italy",
    available: false,
    stats: { lifts: 32, top: 2275, bottom: 950 },
  },
  {
    id: "paganella",
    name: "Paganella Ski",
    region: "Trentino",
    country: "Italy",
    available: false,
    stats: { lifts: 15, runs: 31, top: 2125, bottom: 1028 },
  },
  {
    id: "latemar",
    name: "Ski Center Latemar",
    region: "Trentino / South Tyrol",
    country: "Italy",
    available: false,
    stats: { lifts: 18, runs: 48, top: 2400, bottom: 1000 },
  },
  { id: "courmayeur", name: "Courmayeur", region: "Valle d'Aosta", country: "Italy", available: false },
  { id: "cervinia", name: "Cervinia / Zermatt", region: "Valle d'Aosta", country: "Italy / Switzerland", available: false },
  { id: "lathuile", name: "La Thuile / La Rosière", region: "Valle d'Aosta", country: "Italy / France", available: false },
];

/**
 * Assembled most-authoritative first, so a generated resort supersedes both a
 * hand-typed entry and a coming-soon placeholder without either being edited.
 */
const byId = new Map();
for (const module of Object.values(GRAPHS)) {
  if (module.META?.id) byId.set(module.META.id, module.META);
}
if (!byId.has(BUILT_IN.id)) byId.set(BUILT_IN.id, BUILT_IN);
for (const entry of COMING) {
  if (!byId.has(entry.id)) byId.set(entry.id, entry);
}

/**
 * Live resorts first: the panel's job is to get you onto a mountain, and a list
 * that opens with things you cannot pick is a worse list.
 *
 * Then Monterosa, then everything else by name. The order has to be declared
 * rather than fall out of the map, because `defaultResort` is the first live
 * entry and the map's order is whatever readdir gave the generator — which put
 * Kronplatz ahead of Monterosa and would have opened a first-time user on the
 * wrong mountain. Returning users are unaffected either way: the app restores
 * the resort they last picked.
 */
export const RESORTS = [...byId.values()].sort((a, b) => {
  if (a.available !== b.available) return a.available ? -1 : 1;
  if (a.id === BUILT_IN.id) return -1;
  if (b.id === BUILT_IN.id) return 1;
  return (a.name || "").localeCompare(b.name || "");
});

export const getResort = (id) => RESORTS.find((r) => r.id === id) || null;
export const defaultResort = RESORTS.find((r) => r.available);
