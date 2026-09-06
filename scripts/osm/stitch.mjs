/**
 * Rejoining the pieces OSM left apart.
 *
 * The brief warns that lifts do not touch the pistes they serve, and the
 * clustering tolerance in graph.mjs handles the small version of that: two
 * endpoints four metres apart, traced from different imagery, become one node.
 *
 * This is the large version, and it cannot be fixed by raising that tolerance.
 * Kronplatz's Ried is six kilometres of piste, the longest run on the mountain
 * and the one it is known for. Its bottom stops 250 m short of the Ried
 * gondola's base station and its top starts 270 m from the end of Spitzhorn,
 * because nobody has traced the last stretch through Reischach or the traverse
 * off the summit plateau. So Ried can be skied and never left, is therefore
 * not strongly connected, and the prune deleted every metre of it.
 *
 * Raising the global tolerance to 300 m to catch that would be a disaster: at
 * that radius half the junctions on the mountain merge into each other and
 * whole valleys chain into one blob, which is the exact failure the comment in
 * graph.mjs records having already made once.
 *
 * So the reach is spent only where it buys something. A link is proposed only
 * for a node the prune is about to delete, only to a node that is already on
 * the right side of the problem, and only where a skier could really get
 * across. Everything else is left alone.
 *
 * A link is not a piste and is not counted as one. It is the flat two hundred
 * metres you skate, pole, or walk with your skis over your shoulder, and it is
 * timed and drawn and named as that.
 */

import { metres } from "./graph.mjs";
import { stronglyConnected, travelEdges, LINK_RISE } from "./validate.mjs";
import { linkMinutes } from "../../src/lib/pace.js";

/**
 * How far a link may reach, in metres.
 *
 * Set by what the real gaps are rather than by taste: Ried's two are 251 m and
 * 272 m, and they are the widest that buy anything at any of the four resorts.
 * Beyond about this you are no longer bridging a mapping gap, you are claiming
 * two separate ski areas are one — which is what Monterosa's bounding box
 * would do with Cervinia given the chance.
 */
export const LINK_REACH = 350;

/**
 * How much a link may climb, in metres.
 *
 * You cannot ski uphill. You can step up a bank, skate over a lip, or walk the
 * last few metres to a lift door, and that is all this allows. Defined by the
 * validator, which holds every connector to it whether this file made it or a
 * resort config did.
 */
export { LINK_RISE };

/** Reachable from any of `sources`, following edges forwards. */
function spread(keys, edges, sources, backwards) {
  const adj = new Map(keys.map((k) => [k, []]));
  for (const e of edges) {
    const [a, b] = backwards ? [e.to, e.from] : [e.from, e.to];
    adj.get(a)?.push(b);
  }
  const seen = new Set(sources);
  const stack = [...sources];
  while (stack.length) {
    for (const next of adj.get(stack.pop()) || []) {
      if (!seen.has(next)) { seen.add(next); stack.push(next); }
    }
  }
  return seen;
}

/**
 * Add the smallest set of links that rescues the terrain the prune would drop.
 *
 * Iterates, because one link can rescue a chain: Ried is five nodes, and once
 * its top can be reached every node below it can be too, so the second pass
 * has only the bottom left to solve.
 *
 * @param {object} graph  { NODES, LIFTS, RUNS, PLACES, report }
 * @param {object} [options]
 * @param {number} [options.reach]  metres a link may span
 * @param {number} [options.rise]   metres a link may climb
 */
export function stitch(graph, { reach = LINK_REACH, rise = LINK_RISE } = {}) {
  const NODES = graph.NODES;
  const RUNS = graph.RUNS.map((r) => ({ ...r }));
  const links = [];

  for (let pass = 0; pass < 6; pass++) {
    const keys = Object.keys(NODES);
    const edges = travelEdges({ LIFTS: graph.LIFTS, RUNS });
    const components = stronglyConnected(keys, edges);
    components.sort((a, b) => b.length - a.length);
    const core = components[0] || [];
    if (core.length === keys.length) break;

    // Whom you can get to from the core, and who can get back to it. A node
    // outside the core is missing one of those or both, and which one it is
    // says which direction the link has to run.
    const forward = spread(keys, edges, core, false);
    const backward = spread(keys, edges, core, true);
    const stranded = keys.filter((k) => !forward.has(k) || !backward.has(k));
    if (!stranded.length) break;

    const made = [];
    for (const key of stranded) {
      const node = NODES[key];
      if (!Number.isFinite(node.alt)) continue;

      // Unreachable: something already reachable has to be able to slide in.
      if (!forward.has(key)) {
        const from = nearest(NODES, keys, node, key, reach,
          (o) => forward.has(o.key) && o.node.alt + rise >= node.alt);
        if (from) made.push(connector(NODES, from, key));
      }
      // A dead end: you have to be able to slide out to something that returns.
      if (!backward.has(key)) {
        const to = nearest(NODES, keys, node, key, reach,
          (o) => backward.has(o.key) && node.alt + rise >= o.node.alt);
        if (to) made.push(connector(NODES, key, to));
      }
    }

    if (!made.length) break;
    for (const link of made) { RUNS.push(link); links.push(link); }
  }

  return {
    ...graph,
    RUNS,
    report: {
      ...graph.report,
      linksAdded: links.length,
      linksMetres: links.reduce((sum, l) => sum + l.metres, 0),
      linkReach: reach,
    },
  };
}

/** The closest node that passes `ok`, or null. */
function nearest(NODES, keys, node, self, reach, ok) {
  let best = null;
  for (const key of keys) {
    if (key === self) continue;
    const other = NODES[key];
    if (!Number.isFinite(other.alt)) continue;
    const d = metres(node.lat, node.lon, other.lat, other.lon);
    if (d > reach) continue;
    if (!ok({ key, node: other, d })) continue;
    if (!best || d < best.d) best = { key, d };
  }
  return best?.key ?? null;
}

/** One link edge, from one node key to another. */
function connector(NODES, from, to) {
  const a = NODES[from];
  const b = NODES[to];
  const length = Math.round(metres(a.lat, a.lon, b.lat, b.lon));
  return {
    from, to,
    // Left for nameRuns(), which names every connector for where it puts you
    // once the junctions have their final names. Naming it here would freeze
    // whatever the far node happened to be called at this point in the run.
    name: null,
    // The easiest grade there is. A link is passable by anyone — on foot if it
    // comes to that — and grading it anything harder would hide the whole of
    // Ried from a skier who asked for blues.
    difficulty: "blue",
    link: true,
    km: Math.round((length / 1000) * 10) / 10,
    minutes: linkMinutes(length),
    metres: length,
  };
}
