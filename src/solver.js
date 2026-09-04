/**
 * Route solver.
 *
 * The problem is NOT shortest-path. It is closer to the orienteering problem:
 * given a time budget, find a closed walk that maximises something (vertical,
 * variety, gentleness) while returning to a specified base before the lifts
 * shut. There is no clean exact algorithm at interactive speed, so this uses
 * constrained randomised sampling and then ranks the survivors.
 *
 * Pipeline:
 *   1. Filter the edge set by ability and lift preferences (hard constraints).
 *   2. Dijkstra from the finish node over reversed edges, giving time-home
 *      from every node. This is what makes sampling safe: a walk is only
 *      allowed to take an edge if it can still get home afterwards.
 *   3. Sample N randomised walks, weighted to prefer unskied runs and to avoid
 *      consecutive lift rides. Prune anything that misses a last lift, exceeds
 *      the budget, or laps a single run too many times.
 *   4. Score survivors against several objectives, return the best distinct
 *      route for each, rejecting any that overlap too heavily with one already
 *      chosen.
 *
 * Runs in roughly 50-115ms on a resort-sized graph. Deterministic: the RNG is
 * seeded, so the same inputs always give the same routes. That matters for the
 * refine chips — the user should not see options reshuffle randomly when they
 * change one thing.
 *
 * How many routes to offer is caller's choice (`opts.count`). The solver will
 * return fewer than asked if the terrain genuinely cannot support that many
 * distinct days — a blue-only skier at a resort with five blue runs should be
 * told that, not handed five near-identical options.
 */

import { NODES, DIFFICULTY_RANK, SHORT_NAMES, buildEdges } from "./resort.js";

/**
 * The mountain, as a value rather than an import.
 *
 * A resort is a set of nodes, the edges between them, and the short names the
 * titles read better with. Difficulty ranking is not part of it: blue is
 * easier than red everywhere in the Alps.
 *
 * Every entry point takes an optional graph and falls back to Monterosa, so
 * adding a second resort is a caller-side change and this file's behaviour on
 * the first one is unchanged.
 */
export const asGraph = ({ NODES: nodes, SHORT_NAMES: shortNames = {}, buildEdges: edges }) => ({
  NODES: nodes,
  SHORT_NAMES: shortNames,
  EDGES: edges(),
});

const MONTEROSA = asGraph({ NODES, SHORT_NAMES, buildEdges });

/** Sampling effort. Higher finds better routes and costs linear time. */
const SAMPLES = 3500;
/**
 * Max steps in one walk. Must be high enough to fill a full-day budget.
 *
 * Like TYPICAL_LAP_MINUTES below, this describes the data rather than the
 * algorithm, and it moved when the data did. 70 was ample for the hand-typed
 * graph, whose thirteen places made a four-hour day out of eighteen edges of
 * about eleven minutes each. Real OpenStreetMap geometry has a decision point
 * roughly every half kilometre, so the same day is forty-eight edges of two
 * and a half minutes — and at 70 a walk ran out of steps rather than out of
 * time. Every one of the three real graphs topped out near four hours and
 * could not fill a six-hour day at all, while the hand-typed one managed it
 * easily on the same solver.
 *
 * 200 covers a full lift-hours day at the observed rate with room to spare.
 * It is a ceiling, not a target: a walk stops when it reaches the finish or
 * cannot legally extend, so raising it costs nothing for the walks that end
 * early. Measured with npm run bench after the change.
 */
const WALK_LIMIT = 200;
/**
 * Rough minutes for one lap: ski a run, ride a lift back up.
 *
 * Describes the data rather than the algorithm, so it moves when the data
 * does. It was 18 against run times of about 27 km/h; at a recreational pace a
 * lap is an eleven minute run and a sixteen minute lift. Left at 18 it would
 * think half again as many laps fit in the day, and hand out a repeat cap
 * loose enough to pad one.
 */
const TYPICAL_LAP_MINUTES = 27;
/** A route must fill at least this fraction of the budget to be offered. */
const MIN_BUDGET_FILL = 0.72;

/**
 * How many times a single run may be repeated.
 *
 * This cannot be a fixed number. A strong skier with the whole mountain open
 * should never be sent down the same run three times — it means the solver is
 * padding. But a blue-only skier at a resort with five blue runs has no choice
 * but to lap them, and refusing to plan their day is worse than repeating a
 * run. So the cap scales with how much terrain their ability actually unlocks.
 */
function repeatCaps(adj, opts) {
  const runs = new Set();
  for (const key in adj) for (const e of adj[key]) if (e.kind === "run") runs.add(e.id);
  const lapsNeeded = opts.budget / TYPICAL_LAP_MINUTES;
  const perRun = Math.ceil(lapsNeeded / Math.max(runs.size, 1)) + 1;
  const run = Math.min(Math.max(perRun, 2), 8);
  return { run, lift: run + 1 };
}

function isAllowed(edge, opts) {
  if (edge.kind === "run") {
    return DIFFICULTY_RANK[edge.difficulty] <= DIFFICULTY_RANK[opts.ability];
  }
  if (opts.noDrags && edge.liftType === "drag") return false;
  return true;
}

function buildAdjacency(g, opts) {
  const adj = {};
  for (const key in g.NODES) adj[key] = [];
  for (const edge of g.EDGES) if (isAllowed(edge, opts)) adj[edge.from].push(edge);
  return adj;
}

/**
 * Dijkstra over reversed edges: minutes from every node back to `finish`,
 * plus the latest clock you can still be standing there and get home.
 */
function timesHome(g, adj, finish) {
  const dist = {}, via = {}, reversed = {};
  for (const key in g.NODES) { dist[key] = Infinity; reversed[key] = []; }
  dist[finish] = 0;
  for (const key in adj) for (const edge of adj[key]) reversed[edge.to].push(edge);

  const queue = [[0, finish]];
  while (queue.length) {
    queue.sort((a, b) => a[0] - b[0]);
    const [d, node] = queue.shift();
    if (d > dist[node]) continue;
    for (const edge of reversed[node]) {
      const next = d + edge.min;
      if (next < dist[edge.from]) {
        dist[edge.from] = next;
        via[edge.from] = edge;
        queue.push([next, edge.from]);
      }
    }
  }

  /*
   * The clock on the way home, not just the minutes.
   *
   * `dist` says how long it takes to get back; it says nothing about whether
   * the lifts on that path will still be turning when you get to them. So a
   * walk wandered until it had spent nearly the whole budget, and only then
   * discovered that the ride home shut at four. At Monterosa with a full-day
   * window that was every single sample: 3500 walks, none legal, and the app
   * told a skier there was not enough terrain to fill their day when what
   * there was not enough of was daylight.
   *
   * Walking the `via` tree in order of distance means the next hop home is
   * always resolved first. `latest[node]` is the last minute you can be at
   * `node` and still catch every lift between there and the finish, so the
   * candidate filter can refuse the edge that would strand you rather than
   * throwing the walk away at the end.
   */
  const latest = {};
  for (const key in g.NODES) latest[key] = -Infinity;
  latest[finish] = Infinity;
  const byDistance = Object.keys(g.NODES)
    .filter((key) => key !== finish && dist[key] < Infinity)
    .sort((a, b) => dist[a] - dist[b]);
  for (const key of byDistance) {
    const edge = via[key];
    if (!edge) continue;
    const onward = latest[edge.to] - edge.min;
    latest[key] = edge.kind === "lift" ? Math.min(edge.lastUp, onward) : onward;
  }

  return { dist, via, latest };
}

function pathHome(via, from, finish) {
  const path = [];
  let node = from, guard = 0;
  while (node !== finish && guard++ < 40) {
    const edge = via[node];
    if (!edge) return null;
    path.push(edge);
    node = edge.to;
  }
  return node === finish ? path : null;
}

/**
 * What the repeat cap counts.
 *
 * A run is its own edge. A lift is its *wire*, in either direction: a gondola
 * that runs both ways is two edges with two ids, so counting them separately
 * let one cable car be ridden up nine times and down nine times inside one
 * "day". A blue skier at Monterosa was offered five hours of Stafal -
 * Sant'Anna, up and down, for 166 metres of descent and 1.2 km of skiing.
 */
const useKey = (edge) =>
  edge.kind === "run"
    ? edge.id
    : `lift:${edge.from < edge.to ? `${edge.from}~${edge.to}` : `${edge.to}~${edge.from}`}`;

/**
 * Riding a wire and immediately riding it back.
 *
 * Never a leg of a ski day in either order, and it is what padding looks like
 * when a lift runs both ways. Crossing a valley — ride one gondola down, ride
 * a different one up the other side — is a different wire, so it still works.
 */
const reverses = (prev, edge) =>
  Boolean(prev) && prev.kind === "lift" && edge.kind === "lift" &&
  prev.from === edge.to && prev.to === edge.from;

/** One randomised walk. Returns null if it cannot be made legal. */
function sampleWalk(g, opts, adj, home, rng, caps) {
  const repeatCap = edge => (edge.kind === "run" ? caps.run : caps.lift);
  const { dist, via, latest } = home;
  if (dist[opts.start] === Infinity) return null;

  let node = opts.start, elapsed = 0;
  const segments = [], uses = {};

  for (let step = 0; step < WALK_LIMIT; step++) {
    const prev = segments[segments.length - 1];
    const candidates = adj[node].filter(edge => {
      if (elapsed + edge.min + dist[edge.to] > opts.budget) return false;
      if (edge.kind === "lift" && opts.startClock + elapsed > edge.lastUp) return false;
      // Would taking this leave you somewhere the ride home has already shut?
      if (opts.startClock + elapsed + edge.min > latest[edge.to]) return false;
      if (reverses(prev, edge)) return false;
      return (uses[useKey(edge)] || 0) < repeatCap(edge);
    });
    if (!candidates.length) break;

    const weights = candidates.map(edge => {
      let w = edge.kind === "run" ? 1.6 : 1;
      const seen = uses[useKey(edge)] || 0;
      w *= seen === 0 ? 3.2 : seen === 1 ? 0.4 : 0.1;
      if (edge.kind === "lift" && prev && prev.kind === "lift") w *= 0.35;
      return w;
    });

    const total = weights.reduce((a, b) => a + b, 0);
    let roll = rng() * total, i = 0;
    while (roll > weights[i] && i < candidates.length - 1) { roll -= weights[i]; i++; }

    const edge = candidates[i];
    segments.push(edge);
    uses[useKey(edge)] = (uses[useKey(edge)] || 0) + 1;
    elapsed += edge.min;
    node = edge.to;

    if (node === opts.finish && elapsed > opts.budget * 0.82 && rng() < 0.6) break;
  }

  const tail = pathHome(via, node, opts.finish);
  if (!tail) return null;
  for (const edge of tail) {
    // The seam. The walk refuses to ride a wire straight back, and a shortest
    // path home cannot contain one, but the join between them can: three
    // Kronplatz days ended by riding the Pré da Peres up and immediately back
    // down again.
    if (reverses(segments[segments.length - 1], edge)) return null;
    if (edge.kind === "lift" && opts.startClock + elapsed > edge.lastUp) return null;
    /*
     * The way home is not a lap, so the repeat cap does not get a vote on it.
     *
     * This was throwing away almost every walk. The cap exists to stop the
     * sampler padding a day by lapping one run or one wire; the tail is not
     * sampled at all, it is the shortest path back, and the last leg of it is
     * usually the same base gondola the day has already used. So a walk that
     * had used that wire up to its cap could not come home, and the cap was
     * reached on nearly every walk long enough to matter: at Monterosa with a
     * full-day window, 3500 samples and 3500 rejections, all of them here.
     *
     * Runs too, and for the same reason. On a real graph one piste is a dozen
     * edges, so the way home rejoins something already skied almost every
     * time: keeping the cap over the tail threw away 94-97% of the walks and
     * cost Paganella a full day at every grade. pathHome follows the Dijkstra
     * tree, so it visits each node once and uses each edge once — the most
     * this can add is a single traversal, of the shortest way back.
     */
    uses[useKey(edge)] = (uses[useKey(edge)] || 0) + 1;
    segments.push(edge);
    elapsed += edge.min;
  }

  if (!segments.length) return null;
  if (elapsed > opts.budget || elapsed < opts.budget * MIN_BUDGET_FILL) return null;
  if (opts.lunch && !segments.some(e => g.NODES[e.to].rifugio)) return null;

  /*
   * A day cannot spend longer riding down than skiing down.
   *
   * A hard constraint, filtered here rather than ranked later, because a
   * route that breaks it is not a worse day — it is not a ski day. Where a
   * mountain has nothing to offer somebody, the honest answer is the empty
   * state and its list of fixes, not a plan.
   *
   * A blue skier at Monterosa was the case that found this. There are 21 blue
   * edges and 9.6 km of blue piste, and none of it links up, so the sampler
   * filled 90 minutes with gondola rides: 0.1 km skied, 17 metres of descent,
   * 44% of the day riding a cable car downhill. Every genuine route measured
   * across the three resorts spends at most 17% of the day riding down, which
   * is a valley crossing or two, against 24-73% skiing.
   */
  let skiing = 0, ridingDown = 0;
  for (const edge of segments) {
    if (edge.kind === "run") skiing += edge.min;
    else if (edge.down) ridingDown += edge.min;
  }
  if (ridingDown > skiing) return null;

  return { segments, minutes: elapsed };
}

/** Derive the numbers the UI shows. */
/**
 * Merge consecutive segments that are the same piste or the same lift ride.
 *
 * Only consecutive ones, and only on an exact name match: two separate visits
 * to the same run later in the day are two things to do, and a run whose name
 * OSM does not know is never merged with another of the same non-name.
 */
/**
 * What a skier steps through.
 *
 * `segments` is every graph edge, which is what the map draws. `legs` is the
 * same day merged into things to do, which is what the navigate screen counts
 * and what the leg lists show. Falling back keeps anything built before this
 * existed — a route restored from an older offline commit, say — working.
 */
export const legsOf = (route) => route?.legs ?? route?.segments ?? [];

function mergeLegs(segments) {
  const legs = [];
  for (const edge of segments) {
    const last = legs[legs.length - 1];
    const joinable =
      last && last.kind === edge.kind && Boolean(edge.name) && last.name === edge.name;
    if (joinable) {
      last.min += edge.min;
      last.km = Math.round(((last.km || 0) + (edge.km || 0)) * 10) / 10;
      last.drop = (last.drop || 0) + (edge.drop || 0);
      last.to = edge.to;
      last.parts += 1;
      last.ids.push(edge.id);
      continue;
    }
    legs.push({ ...edge, parts: 1, ids: [edge.id] });
  }
  return legs;
}

export function measure(route, g = MONTEROSA) {
  let km = 0, vertical = 0, lifts = 0, dragLifts = 0;
  const runIds = new Set(), areas = new Set();
  /**
   * Distinct pistes by name, which is what a skier means by "runs".
   *
   * runIds counts graph edges, and on real OpenStreetMap geometry one piste
   * arrives as several ways and is split again at every junction — so a
   * five-hour day was being reported as "34 runs". That number also feeds the
   * variety and cruisiness scoring below, where counting edges is arguably
   * the right thing, so it is left alone and this is added alongside it purely
   * for display.
   */
  const pisteNames = new Set();
  const counts = { blue: 0, red: 0, black: 0 };

  // A "descent" is a maximal run of consecutive runs with no lift between them.
  // Skiers care about this: 900m unbroken skis very differently to three 300m
  // pitches split by chairlifts.
  let highestAlt = g.NODES[route.segments[0].from].alt;
  let longestDescent = 0, currentDescent = 0;

  for (const edge of route.segments) {
    areas.add(g.NODES[edge.to].area);
    highestAlt = Math.max(highestAlt, g.NODES[edge.to].alt);
    if (edge.kind === "run") {
      km += edge.km;
      vertical += edge.drop;
      runIds.add(edge.id);
      if (edge.name) pisteNames.add(edge.name);
      counts[edge.difficulty]++;
      currentDescent += edge.drop;
      longestDescent = Math.max(longestDescent, currentDescent);
    } else {
      lifts++;
      currentDescent = 0;
      if (edge.liftType === "drag") dragLifts++;
    }
  }

  return {
    ...route,
    km: Math.round(km * 10) / 10,
    vertical: Math.round(vertical),
    lifts, dragLifts,
    distinctRuns: runIds.size,
    distinctPistes: pisteNames.size || runIds.size,
    /**
     * The same day as a list of instructions rather than of edges.
     *
     * Consecutive edges of the same piste are one thing to do. Real OSM
     * geometry splits a piste at every junction it passes, so a five-hour day
     * came out as sixty-eight legs of two and a half minutes — and the app
     * announces the next *junction*, which the brief is explicit is not the
     * next turn. Merged, the same day is forty-six: one instruction every six
     * minutes or so, which is what a navigation app gives you.
     *
     * Added alongside `segments` rather than replacing them, because the map
     * draws the route from the segments and wants every vertex of it.
     */
    legs: mergeLegs(route.segments),
    areas: areas.size,
    highestAlt,
    longestDescent,
    counts,
  };
}

const shortName = (g, key) => g.SHORT_NAMES[key] || g.NODES[key].name;

function highestPoint(g, route) {
  let best = route.segments[0].from;
  for (const edge of route.segments) {
    if (g.NODES[edge.to].alt > g.NODES[best].alt) best = edge.to;
  }
  return best;
}

/**
 * Objectives are labelled by CHARACTER, not by raw stats. A skier cannot tell
 * you their objective function, but they can tell you they want a cruisy day.
 */
function objectives(g, opts) {
  const list = [
    {
      label: "Most vertical",
      title: r => `The ${shortName(g, highestPoint(g, r))} circuit`,
      score: r => r.vertical,
    },
    {
      label: "Most variety",
      title: r => r.areas > 2 ? "Three valleys" : `The ${shortName(g, highestPoint(g, r))} loop`,
      score: r => r.distinctRuns * 100 + r.areas * 160,
    },
    {
      label: "Cruisiest",
      title: () => "Easy miles",
      score: r => -(r.counts.red * 45 + r.counts.black * 150 + r.lifts * 12) + r.distinctRuns * 22,
    },
    {
      label: "Least queuing",
      title: () => "More skiing, less riding",
      score: r => -r.lifts * 100 + r.km * 8,
    },
    {
      label: "Longest descent",
      title: r => `${r.longestDescent}m unbroken`,
      score: r => r.longestDescent,
    },
    {
      label: "Highest point",
      title: r => `Up to ${shortName(g, highestPoint(g, r))}`,
      score: r => r.highestAlt * 10 + r.vertical * 0.1,
    },
  ];
  if (opts.emphasis === "vertical") {
    list.unshift({
      label: "Biggest descent",
      title: r => `The ${shortName(g, highestPoint(g, r))} drop`,
      score: r => r.vertical * 2,
    });
  }
  return list;
}

/**
 * Overlap between two routes, by the set of distinct runs they ski.
 * 0 = nothing in common, 1 = identical terrain.
 */
function overlap(a, b) {
  const runsOf = r => new Set(r.segments.filter(e => e.kind === "run").map(e => e.id));
  const A = runsOf(a), B = runsOf(b);
  if (!A.size && !B.size) return 1;
  let shared = 0;
  for (const id of A) if (B.has(id)) shared++;
  return shared / (A.size + B.size - shared);
}

/**
 * @param {object} opts
 * @param {string} opts.start      node key
 * @param {string} opts.finish     node key
 * @param {'blue'|'red'|'black'} opts.ability  hardest run they'll take
 * @param {number} opts.budget     minutes available (already net of lunch)
 * @param {number} opts.startClock minute-of-day of first lift, e.g. 555 = 09:15
 * @param {boolean} [opts.noDrags]
 * @param {boolean} [opts.lunch]   require passing a rifugio
 * @param {'vertical'|null} [opts.emphasis]
 * @param {number} [opts.count=3]  how many routes to offer
 * @param {number} [opts.maxOverlap=0.7] reject a route sharing more than this
 *                 fraction of its runs with one already chosen
 * @param {object} [opts.graph]    the resort to solve on; defaults to Monterosa
 * @returns {Array} up to `count` routes, each measured and labelled
 */
export function solve(opts) {
  const count = opts.count ?? 3;
  const maxOverlap = opts.maxOverlap ?? 0.7;

  const g = opts.graph ?? MONTEROSA;
  const adj = buildAdjacency(g, opts);
  const home = timesHome(g, adj, opts.finish);
  const caps = repeatCaps(adj, opts);

  let seed = 20260829;
  const rng = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  const found = new Map();
  for (let i = 0; i < SAMPLES; i++) {
    const walk = sampleWalk(g, opts, adj, home, rng, caps);
    if (!walk) continue;
    const key = walk.segments.map(e => e.id).join(">");
    if (!found.has(key)) found.set(key, measure(walk, g));
  }

  const all = [...found.values()];
  if (!all.length) return [];

  // Take the best route for each objective, but skip any that would just be a
  // repackaging of one already offered. Offering four genuinely different days
  // is useful; offering six variations of the same day is noise.
  const chosen = [];
  const fill = (threshold, flagSimilar, limit) => {
    for (const objective of objectives(g, opts)) {
      if (chosen.length >= limit) break;
      if (chosen.some(c => c.label === objective.label)) continue;
      const ranked = [...all].sort((a, b) => objective.score(b) - objective.score(a));
      const pick = ranked.find(r =>
        chosen.every(c => overlap(r, c) <= threshold) &&
        !chosen.some(c => c.segments.map(e => e.id).join(">") === r.segments.map(e => e.id).join(">")));
      if (pick) {
        chosen.push({
          ...pick,
          label: objective.label,
          title: objective.title(pick),
          similar: flagSimilar,
        });
      }
    }
  };

  fill(maxOverlap, false, count);

  // If the terrain genuinely can't support several distinct days — a blue-only
  // skier at a resort with five blue runs — offering one option isn't helpful
  // either. Top up to a minimum viable choice with routes over the same terrain
  // that differ in emphasis and order, flagged so the UI can say plainly that
  // there isn't much choice here rather than dressing it up as variety.
  //
  // Deliberately tops up to three, not to `count`. If someone asks for six and
  // the mountain only has one real day on it, the answer is three at most.
  if (chosen.length < Math.min(3, count)) fill(1, true, Math.min(3, count));

  return chosen;
}

/** Altitude at each vertex of a route, including the start. Used by the 3D layer and the profile. */
export function altitudeSeries(route, g = MONTEROSA) {
  const alts = [g.NODES[route.segments[0].from].alt];
  for (const edge of route.segments) alts.push(g.NODES[edge.to].alt);
  return alts;
}

export const minutesToClock = m =>
  `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

export const clockToMinutes = s => {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
};
