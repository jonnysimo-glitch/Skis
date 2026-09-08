/**
 * The places a skier might ask to swing by, and what is at each.
 *
 * A waypoint is a graph node, because that is what the solver can be asked to
 * pass through — but a skier does not think in junctions. They think "we'll
 * stop at the Gabiet for lunch" and "let's get up to Passo dei Salati while
 * it's clear". So this offers the nodes OSM actually named — lift stations,
 * summits, cols, villages — and hangs the restaurants and huts near each one
 * underneath it, so searching for the rifugio finds the node it stands on.
 *
 * Deliberately NOT every node. The plan form's start and finish pickers offer
 * all of them, generated names included, because "you are at" has to be
 * answerable from wherever you are standing — "Above Gabiet" is a real answer
 * to that. Nobody chooses to swing by Above Gabiet. Thirty-five of Monterosa's
 * eighty-two nodes carry a description rather than a name, and a picker
 * padded with them is a picker nobody reads to the bottom.
 */
import { metresBetween } from "./geo.js";
import { shortName } from "./places.js";

/**
 * How close a restaurant has to be to a junction to be described as "at" it.
 *
 * 350 m, the same figure the export pipeline uses to decide which base an
 * unnamed car park belongs to. On a mountain that is the width of a lift
 * station and its terrace; much more and the Bar Gabiet starts being listed
 * under the col above it, which is a promise the route cannot keep.
 */
export const AT_NODE = 350;

/** Anything you would stop at, as opposed to park at or hire from. */
const STOPS = new Set(["hut", "restaurant", "cafe"]);

/**
 * @param {object} nodes  the resort's NODES
 * @param {Array}  places the resort's PLACES, [name, kind, lat, lon, alt]
 * @param {object} [opts]
 * @param {string[]} [opts.exclude] keys to leave out — the start, normally
 * @returns {Array<{id, name, keys, areas, alt, at}>} by area, then name
 */
export function viaChoices(nodes, places = [], opts = {}) {
  const exclude = new Set(opts.exclude ?? []);
  const keys = Object.keys(nodes).filter(
    (key) => nodes[key].named !== false && nodes[key].name
  );

  /*
   * One entry per NAME, not per node, and it is satisfied by either end.
   *
   * A lift is two stations and OSM gives both of them the lift's name, so
   * Monterosa carries two Punta Jolandas — 1,646 m and 2,223 m, the bottom
   * and the top of the same chair — and three Alpe Mandrias, two of them 20 m
   * of altitude apart. Offering all of those separately is a picker nobody
   * can read, and picking the wrong one is worse than unreadable: the route
   * would go straight past the node you meant and the app would say it could
   * not get you there.
   *
   * "Swing by Punta Jolanda" means either end of Punta Jolanda. So a choice
   * carries every key that answers to the name and the solver takes the first
   * one the day reaches. That is also the permissive direction, which is the
   * right one here — refusing a day on a technicality is the worse mistake.
   */
  const byName = new Map();
  for (const key of keys) {
    const n = nodes[key];
    if (!byName.has(n.name)) byName.set(n.name, []);
    byName.get(n.name).push(key);
  }

  /*
   * Where you start is not somewhere to swing by, and neither is the other
   * end of it.
   *
   * Dropped by group rather than by key. Alagna is two nodes and starting
   * from one of them left the other in the picker, so a day from Alagna could
   * be asked to detour to Alagna — which read as a mistake in the list and
   * then, since that second node is only served by a black run, came back as
   * "you cannot get to Alagna on red" to somebody standing in it.
   */
  const offered = [...byName].filter(([, group]) => !group.some((key) => exclude.has(key)));

  const out = offered.map(([name, group]) => {
    const near = places
      .filter(([, kind]) => STOPS.has(kind))
      .map(([placeName, , lat, lon]) => ({
        name: placeName,
        m: Math.min(...group.map((k) => metresBetween(nodes[k].lat, nodes[k].lon, lat, lon))),
      }))
      .filter((p) => p.m <= AT_NODE)
      .sort((a, b) => a.m - b.m);
    /*
     * Shortened, unless shortening makes two of them the same word.
     *
     * The same rule and the same reason as the map: "Bar \"Passo da Mania'\""
     * is what OSM calls it and "Passo da Mania" is what it is called, so the
     * category word and the sign's quote marks come off. But Rifugio Jolanda
     * and Bar Jolanda are two different places at one lift station, and
     * shortening both gives "Jolanda, Jolanda" — which reads as a rendering
     * fault and tells you less than the long version.
     */
    const shortOf = new Map(near.map((p) => [p.name, shortName(p.name)]));
    const twice = new Set();
    const once = new Set();
    for (const short of shortOf.values()) {
      if (once.has(short)) twice.add(short);
      once.add(short);
    }
    const at = near.map((p) => {
      const short = shortOf.get(p.name);
      return twice.has(short) ? p.name : short;
    });
    const areas = [...new Set(group.map((k) => nodes[k].area).filter(Boolean))];
    return {
      // The lowest key, so the same choice has the same id between renders
      // and across a reload. Sorted rather than "whichever came first",
      // because node order in the file is the export's business.
      id: [...group].sort()[0],
      name,
      keys: [...group].sort(),
      areas,
      // The lowest of the group, which is where you would say the place is.
      alt: Math.min(...group.map((k) => nodes[k].alt)),
      at,
    };
  });

  return out.sort(
    (a, b) => (a.areas[0] ?? "").localeCompare(b.areas[0] ?? "") || a.name.localeCompare(b.name)
  );
}

/**
 * The choices grouped for an optgroup list, in the order the form shows them.
 *
 * Areas, because that is how a skier holds a big resort in their head — the
 * Gressoney side, the Ayas side — and because two of these resorts are three
 * valleys wide. A name that spans two areas is a col with a side in each, and
 * it is filed under the first: listing it twice would be the duplicate this
 * whole file exists to remove. A resort with no areas tagged gets one unnamed
 * group rather than a special case at the call site.
 */
export function viaGroups(choices) {
  const byArea = new Map();
  for (const c of choices) {
    const key = c.areas[0] ?? "";
    if (!byArea.has(key)) byArea.set(key, []);
    byArea.get(key).push(c);
  }
  return [...byArea].map(([area, items]) => ({ area, items }));
}

/** The keys a chosen id stands for, for handing to the solver. */
export const viaKeys = (choices, ids) => {
  const by = new Map(choices.map((c) => [c.id, c]));
  return (ids ?? []).map((id) => by.get(id)?.keys ?? [id]);
};

/** The choice behind an id, for naming it in the UI. */
export const viaChoice = (choices, id) => choices.find((c) => c.id === id) ?? null;
