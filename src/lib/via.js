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
import { legsOf } from "../solver.js";
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
    /*
     * What is at the station, minus the station.
     *
     * `at` reads out as "— Edelweiss, Novez Cafè" under the name, and a
     * rifugio named after the lift it stands at made that "Belvedere —
     * Belvedere". Eleven of these across the four resorts: Albi de Mez, Passo
     * Feudo, Marchner, Absam, Oberholz. The eat entries have suppressed this
     * since Albi de Mez was found; the stations never did, and it reads worse
     * on them because the repeat is the first thing after the dash rather
     * than an absent subtitle.
     *
     * Compared after shortening, since that is the word that gets shown: the
     * place is "Rifugio Belvedere" in OSM and "Belvedere" on the row.
     */
    const at = near
      .map((p) => {
        const short = shortOf.get(p.name);
        return twice.has(short) ? p.name : short;
      })
      .filter((label) => label !== name);
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

  const junctions = out.sort(
    (a, b) => (a.areas[0] ?? "").localeCompare(b.areas[0] ?? "") || a.name.localeCompare(b.name)
  );

  /*
   * And every place to eat as a choice of its own.
   *
   * "Must stop at the Gabiet" is the thing a group of skiers actually says,
   * and until now the only way to ask for it was to know which lift station
   * it stands at. The constraint the solver can take is still a node — so
   * picking "Rifugio Gabiet" and picking "Gabiet" are the same constraint,
   * which is fine: both get you to the terrace, which is what was asked.
   *
   * Filed under `kind: "eat"` so the form can group them ahead of the
   * junctions. Only ones within AT_NODE of an offerable node: a restaurant in
   * the village with no lift beside it is not somewhere a ski route can be
   * made to pass, and offering it would be a promise the solver cannot keep.
   *
   * Deduplicated by the shortened name, because two elements at one station
   * can shorten to the same word and a picker with the same entry twice is
   * the fault this whole file exists to avoid.
   */
  const eats = [];
  const seenEat = new Set();
  for (const c of junctions) {
    for (const name of c.at) {
      if (seenEat.has(name)) continue;
      /*
       * And not when the place and the station are the same name.
       *
       * Monterosa's Belvedere is a rifugio at a lift station called
       * Belvedere, and Crest is a restaurant at Crest. Adding those as
       * choices of their own put "Belvedere" in the picker twice — once under
       * "Somewhere to eat" and once under Ayas — resolving to the same node
       * group and the same constraint. Two identical rows is the exact fault
       * this file exists to prevent, and it is worse in a picker than
       * anywhere else because a reader assumes two rows mean two places and
       * spends the tap finding out they do not.
       *
       * The station entry is that place: same name, same keys, and its own
       * `at` list already says what is there. So nothing is lost by not
       * repeating it — the name is still in the list, once, under the valley
       * it is in.
       *
       * This case was half-handled already: the subtitle was suppressed,
       * because "Albi de Mez — Albi de Mez" is not a subtitle. Suppressing
       * the subtitle only made the two rows identical rather than merely
       * confusing.
       */
      if (name === c.name) continue;
      seenEat.add(name);
      eats.push({
        id: `eat:${c.id}:${name}`,
        kind: "eat",
        name,
        keys: c.keys,
        areas: c.areas,
        alt: c.alt,
        // Where it is, for the line under the name.
        at: [c.name],
      });
    }
  }
  eats.sort((a, b) => a.name.localeCompare(b.name));

  return [...eats, ...junctions.map((c) => ({ ...c, kind: "junction" }))];
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
  // Somewhere to eat first, in one group and alphabetical, because a person
  // looking for the Gabiet is looking for a name and not for a valley.
  const eats = choices.filter((c) => c.kind === "eat");
  const byArea = new Map();
  for (const c of choices) {
    if (c.kind === "eat") continue;
    const key = c.areas[0] ?? "";
    if (!byArea.has(key)) byArea.set(key, []);
    byArea.get(key).push(c);
  }
  return [
    ...(eats.length ? [{ area: "Somewhere to eat", items: eats }] : []),
    ...[...byArea].map(([area, items]) => ({ area, items })),
  ];
}

/**
 * The node keys a stored id stands for, without needing the choice list.
 *
 * A plan holds ids so it survives a reload, and the solver takes groups of
 * node keys — so something has to translate, and it cannot be the picker: the
 * translation happens in `toSolverOpts`, which runs on a refine tap with no
 * screen in sight. An id carries its node inside it for exactly this reason.
 *
 * The group is every node sharing that node's name, which is the same rule
 * the picker groups by: one lift is two stations under one name and either end
 * answers it.
 */
export const viaResolve = (id, nodes) => {
  if (typeof id !== "string") return [];
  let key = id;
  if (id.startsWith("eat:")) {
    const at = id.indexOf(":", 4);
    key = at > 0 ? id.slice(4, at) : id.slice(4);
  }
  const name = nodes?.[key]?.name;
  if (!name) return [key];
  return Object.keys(nodes).filter((k) => nodes[k].name === name).sort();
};

/** The keys each of a list of chosen ids stands for. */
export const viaKeys = (choices, ids, nodes) => {
  const by = new Map((choices ?? []).map((c) => [c.id, c]));
  return (ids ?? []).map((id) => by.get(id)?.keys ?? viaResolve(id, nodes ?? {}));
};

/** The choice behind an id, for naming it in the UI. */
export const viaChoice = (choices, id) => choices.find((c) => c.id === id) ?? null;

/**
 * Where the day stops for lunch, and what the place is called.
 *
 * `opts.lunch` already makes the solver refuse any day that does not pass a
 * node with a rifugio beside it, so the stop is in every route it returns.
 * What was missing is that nothing said so: the day went past the Gabiet and
 * the app called it "a sit-down lunch" without ever naming it, which reads as
 * a filter rather than a plan.
 *
 * Which one, out of the several a long day passes: the one you get to nearest
 * the middle of the skiing. That is what lunch means, and it beats "the first
 * one" — a day from Stafal passes a rifugio in its first ten minutes.
 *
 * Returns null when the route passes none, which is the case for every day
 * that was not asked for lunch.
 *
 * @param {object} route   a solved route
 * @param {number[]} clocks  legClocks(route, startClock) — arrival per leg
 * @param {object} nodes   the resort's NODES
 * @param {Array} places   the resort's PLACES
 */
export function lunchStop(route, clocks, nodes, places = []) {
  const legs = legsOf(route);
  if (!legs.length) return null;
  const first = clocks?.[0] ?? 0;
  const last = clocks?.[clocks.length - 1] ?? 0;
  const middle = (first + last) / 2;

  let best = null;
  for (let i = 0; i < legs.length; i++) {
    const key = legs[i].to;
    if (!nodes[key]?.rifugio) continue;
    // The clock at the END of this leg, which is when you would arrive.
    const at = clocks?.[i + 1] ?? clocks?.[i] ?? middle;
    const off = Math.abs(at - middle);
    if (!best || off < best.off) best = { leg: i, key, at, off };
  }
  if (!best) return null;

  const n = nodes[best.key];
  const near = places
    .filter(([, kind]) => STOPS.has(kind))
    .map(([name, , lat, lon]) => ({ name, m: metresBetween(n.lat, n.lon, lat, lon) }))
    .filter((p) => p.m <= AT_NODE)
    .sort((a, b) => a.m - b.m);
  return {
    leg: best.leg,
    key: best.key,
    at: best.at,
    // The junction is the fallback: `rifugio` is set from a tighter radius
    // than this one, so a node can be flagged with nothing inside AT_NODE.
    name: near.length ? shortName(near[0].name) : n.name,
    where: n.name,
    /* Everything at the stop, for a card that wants to offer a choice. */
    all: near.map((p) => shortName(p.name)),
  };
}

/**
 * A stop's name, from the id a plan stores.
 *
 * A plan holds ids rather than objects so it can survive a reload, and two
 * shapes of id go in it: a node key, and `eat:<node>:<place>` for a place at
 * one. The empty state and the diagnoses both have to name what the reader
 * chose, and neither of them has the choice list to hand.
 *
 * Everything after the second colon, so a place with a colon in its name
 * comes back whole.
 */
export const viaLabel = (id, nodes) => {
  if (typeof id !== "string") return String(id);
  if (id.startsWith("eat:")) {
    const at = id.indexOf(":", 4);
    if (at > 0) return id.slice(at + 1);
  }
  return nodes?.[id]?.name ?? id;
};
