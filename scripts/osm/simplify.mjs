/**
 * Turning way endpoints back into a mountain.
 *
 * OSM maps one piste as several ways — a mapper traces as far as they can see,
 * saves, and carries on — so a single named run arrives as a chain of ways
 * joined end to end. Every way's endpoint became a graph node, which made
 * Monterosa's "Salati to Stafal" thirty-seven separate edges averaging 550 m
 * and two and a half minutes each.
 *
 * That is wrong in three ways at once. The app tells a skier what to do "to
 * the next junction", and a junction announced every 550 m where no runs split
 * is not a junction. The resort's run count comes out three times what the
 * resort publishes. And the solver samples a walk of at most WALK_LIMIT steps,
 * so a day that needs forty-eight edges instead of eighteen runs out of steps
 * rather than out of time — which is why a six-hour day could not be filled on
 * any of the three real graphs while the hand-typed one managed it easily.
 *
 * So a node that is only a continuation is contracted away and its two runs
 * become one. A continuation is a place with exactly one run in, one run out,
 * no lift, and nothing that makes it somewhere in its own right.
 */

/** Places that stay whatever their degree: you start, finish or eat there. */
const KEEP = (node) => node.base || node.rifugio;

/**
 * Contract every run-only pass-through node.
 *
 * Iterates to a fixed point, because contracting one node can make its
 * neighbour a pass-through in turn — a piste traced as five ways collapses to
 * one edge in four passes.
 */
export function contractChains({ NODES, LIFTS, RUNS, PLACES = [], report = {} }) {
  let nodes = { ...NODES };
  let runs = RUNS.map((r) => ({ ...r }));
  let merged = 0;

  for (let pass = 0; pass < 40; pass++) {
    const liftTouches = new Set();
    for (const lift of LIFTS) { liftTouches.add(lift.from); liftTouches.add(lift.to); }

    const incoming = {};
    const outgoing = {};
    for (const [index, run] of runs.entries()) {
      (outgoing[run.from] ||= []).push(index);
      (incoming[run.to] ||= []).push(index);
    }

    const dead = new Set();
    const drop = new Set();
    const added = [];

    for (const key of Object.keys(nodes)) {
      if (dead.has(key) || liftTouches.has(key) || KEEP(nodes[key])) continue;
      const ins = (incoming[key] || []).filter((i) => !drop.has(i));
      const outs = (outgoing[key] || []).filter((i) => !drop.has(i));
      if (ins.length !== 1 || outs.length !== 1) continue;

      const a = runs[ins[0]];
      const b = runs[outs[0]];
      // A run that arrives and leaves by the same edge is a loop, not a chain.
      if (a === b || a.from === b.to) continue;
      // Difficulty is a safety signal, so two grades never merge into one
      // edge: a skier told "red" must not be sent down a black half way.
      if (a.difficulty !== b.difficulty) continue;
      // Don't let a contraction hide a node another edge still needs.
      if ((incoming[key] || []).length !== 1 || (outgoing[key] || []).length !== 1) continue;

      drop.add(ins[0]);
      drop.add(outs[0]);
      dead.add(key);
      added.push({
        ...a,
        to: b.to,
        // The named half wins. OSM often names only the first way of a chain,
        // and "Salati to Point 31" is a worse answer than the piste's name.
        name: pickName(a, b),
        km: Math.round((a.km + b.km) * 10) / 10,
        minutes: a.minutes + b.minutes,
        metres: (a.metres || 0) + (b.metres || 0),
        osmId: a.osmId,
      });
      merged++;
    }

    if (!added.length) break;
    runs = runs.filter((_, i) => !drop.has(i)).concat(added);
    nodes = Object.fromEntries(Object.entries(nodes).filter(([k]) => !dead.has(k)));
  }

  return {
    NODES: nodes,
    LIFTS,
    RUNS: runs,
    PLACES,
    report: {
      ...report,
      chainsMerged: merged,
      nodesContracted: Object.keys(NODES).length - Object.keys(nodes).length,
    },
  };
}

/**
 * The name for a merged run.
 *
 * OSM often signs only the first way of a chain, so a real piste name on
 * either half wins. Neither half named leaves it null for nameRuns() below,
 * which describes the whole thing once the merging has finished — naming it
 * here would name it after a halfway point that is about to disappear.
 */
function pickName(a, b) {
  return a.name || b.name || null;
}

/**
 * The last resort: a run nobody signed, described by where it goes.
 *
 * Runs after the chains have merged and the junctions have their names, so
 * both ends are a place a skier could point at rather than a placeholder.
 */
export function nameRuns({ NODES, LIFTS, RUNS, PLACES = [], report }) {
  let named = 0;
  const runs = RUNS.map((run) => {
    if (run.name) return run;
    named++;
    return { ...run, name: describe(NODES[run.from], NODES[run.to], run) };
  });
  return { NODES, LIFTS, RUNS: runs, PLACES, report: { ...report, runsNamedByEndpoints: named } };
}

/**
 * "Where does this one go?", answered in the words a skier would use.
 *
 * The endpoint names are written to locate a person standing on the mountain,
 * which is not the same job: "Ostafa 1 junction" is a good answer to "where
 * are you" and a bad half of a run name, and "Above Pianalunga-Bocchetta to
 * Pianalunga-Bocchetta" is not a sentence anybody says. So the place words
 * come off first, and a run between a place and just-above-it is described by
 * the descent rather than by both ends of it.
 */
function describe(fromNode, toNode, run) {
  const place = (n, key) => (n?.name ?? key).replace(/ junction$/, "");
  const from = place(fromNode, run.from);
  const to = place(toNode, run.to);
  const under = (a, b) => a === `Above ${b}` || a === `Below ${b}`;

  if (from === to) return `${from} link`;
  if (under(from, to)) return `Down to ${to}`;
  if (under(to, from)) return `Down from ${from}`;
  return `${from} to ${to}`;
}
