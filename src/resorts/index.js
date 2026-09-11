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

/**
 * Which resort opens the list, after the live ones.
 *
 * A string, not an entry. There was a whole hand-typed Monterosa record here —
 * centre, zoom, pitch, bbox, bases and published stats, derived from
 * src/resort.js — as the fallback for a resort with no generated graph. It has
 * not been reachable since monterosa.js was generated: the loop below
 * registers every graph's own META first, and the fallback was only added
 * `if (!byId.has(...))`. All that survived was its id, used here to order the
 * list, so that is all this is now.
 */
const FIRST_RESORT = "monterosa";

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
  /*
   * The first two outside Italy, and the first two with a config waiting on a
   * fetch rather than on someone writing a config.
   *
   * Both are glaciers, which is why these two and not the Aosta valley ones
   * below: Hintertux runs all year and Sölden's glacier opens in September, so
   * they are the only entries here anybody could ski before December. The
   * figures are the resorts' own published ones and nothing else — no
   * altitudes are invented, so the cards draw a generic ridgeline until their
   * graphs exist. Both configs are in scripts/resorts/; the graphs come from a
   * run of .github/workflows/resort-data.yml, because Overpass is not
   * reachable from where this is developed.
   */
  {
    id: "soelden",
    name: "Sölden",
    region: "Tyrol",
    country: "Austria",
    available: false,
    stats: { lifts: 31, top: 3340, bottom: 1350 },
  },
  {
    id: "hintertux",
    name: "Hintertux Glacier",
    region: "Zillertal, Tyrol",
    country: "Austria",
    available: false,
    stats: { lifts: 21, top: 3250, bottom: 1500 },
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
  if (a.id === FIRST_RESORT) return -1;
  if (b.id === FIRST_RESORT) return 1;
  return (a.name || "").localeCompare(b.name || "");
});

export const getResort = (id) => RESORTS.find((r) => r.id === id) || null;
export const defaultResort = RESORTS.find((r) => r.available);
