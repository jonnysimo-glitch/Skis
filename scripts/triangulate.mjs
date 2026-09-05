/**
 * Does each mountain have the right slopes on it?
 *
 * `npm run resort:verify` and `scripts/check-resorts.mjs` both ask whether a
 * graph is internally sound — that every run goes downhill, that nothing is
 * stranded, that a day can be planned on it. Neither can tell you the graph is
 * of the wrong mountain, or missing half of one, because a smaller resort is
 * perfectly self-consistent.
 *
 * That needs a second source, and the registry has one: `published`, the
 * resort's own figures. This puts the two side by side and says where they
 * disagree and by how much. It does not fail a build — the two are measuring
 * different things in several places and always will — it reports, so that a
 * gap is a decision someone made rather than something nobody looked at.
 *
 * Run with `npm run resort:triangulate`.
 */
import { readFile } from "node:fs/promises";
import { RESORTS } from "../src/resorts/index.js";

const R = 6371000;
const rad = (x) => (x * Math.PI) / 180;
const metres = (a, b) => {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

/**
 * What the mountain reaches in OpenStreetMap, against what the graph reaches.
 *
 * The one source that needs nobody's marketing page: the raw export the graph
 * was built from. A lift station in the export that is not in the graph was
 * dropped by the prune, and the honest question is whether that was right.
 *
 * At Monterosa it is. The Indren cable car climbs to Punta Indren at 3,275m
 * and there is no tagged piste within four hundred metres of the top — it
 * serves freeride terrain. Nothing skis down, so the top is not strongly
 * connected, so it goes. That is exactly what this app promises: it will not
 * plan you somewhere you cannot ski back from. But it means the resort's own
 * headline top and ours differ by nearly three hundred metres, and that is
 * worth saying out loud rather than discovering from a customer.
 */
async function fromExport(id, NODES) {
  let raw;
  try {
    raw = JSON.parse(await readFile(new URL(`../data/osm/${id}.json`, import.meta.url), "utf8"));
  } catch {
    return null;
  }
  const els = raw.elements ?? [];
  const graph = Object.values(NODES);
  /*
   * 400 metres, which is looser than it looks.
   *
   * A graph node is a stitched intersection, not the lift station itself, so
   * the foot of a lift lands a few hundred metres from the node that stands
   * for it: Monterosa's Indren cable car starts 283m from the nearest one. At
   * 250 the check missed it by thirty metres and reported nothing at all,
   * which is the worst way for a check to fail — it looked like a clean bill.
   *
   * It stays specific because it is anchored to the graph rather than to a
   * radius from the centre: the neighbouring resort's lifts are kilometres
   * from any node of ours, not hundreds of metres.
   */
  const onGraph = (pt) => graph.some((n) => metres(pt, n) < 400);

  /*
   * A lift with one foot on our mountain and its head somewhere we did not
   * keep. That is the only version of "did we drop something" worth asking:
   * it is anchored to the graph rather than to a radius.
   *
   * A radius was the first attempt and it does not work. Monterosa's query box
   * is drawn generously and catches Zermatt across the Cime Bianche pass, so
   * the highest station within any reasonable distance is Matterhorn Glacier
   * Paradise at 3,883m — a different resort with no piste link, reported as a
   * missing summit. Asking which lifts touch our own graph excludes it by
   * construction: neither end of a Zermatt lift is on our mountain.
   */
  const nodes = new Map(els.filter((e) => e.type === "node").map((e) => [e.id, e]));
  const ele = (pt) => {
    const st = els.find(
      (e) => e.type === "node" && e.tags?.aerialway === "station" &&
        Number.isFinite(Number(e.tags.ele)) && metres(e, pt) < 120
    );
    return st ? { ele: Number(st.tags.ele), name: st.tags.name ?? null } : null;
  };
  // Downhill only. A skitour or nordic way is not a way home on skis, and
  // counting one would say a summit has a piste off it when it has not.
  const pistes = els
    .filter((e) => e.type === "way" && e.tags?.["piste:type"] === "downhill")
    .map((w) => w.geometry ?? (w.nodes ?? []).map((n) => nodes.get(n)).filter(Boolean))
    .filter((g) => g.length);

  let best = null;
  for (const w of els.filter((e) => e.type === "way" && e.tags?.aerialway)) {
    const geo = w.geometry ?? (w.nodes ?? []).map((n) => nodes.get(n)).filter(Boolean);
    if (geo.length < 2) continue;
    const a = geo[0];
    const b = geo[geo.length - 1];
    const [foot, head] = onGraph(a) && !onGraph(b) ? [a, b] : onGraph(b) && !onGraph(a) ? [b, a] : [];
    if (!head) continue;
    void foot;
    const top = ele(head);
    if (!top) continue;
    if (!best || top.ele > best.ele) {
      best = {
        ele: top.ele,
        name: top.name ?? w.tags.name ?? "(unnamed)",
        lift: w.tags.name ?? "(unnamed lift)",
        lat: head.lat,
        lon: head.lon,
      };
    }
  }
  if (!best) return null;
  // Why it is not there: a top with no piste off it cannot be part of a graph
  // that promises a way home.
  best.pisteNear = pistes.some((g) => g.some((pt) => metres(best, pt) < 400));
  return best;
}

const LIVE = RESORTS.filter((r) => r.available);

/*
 * A run is stored as a compact array, not an object: the generated modules are
 * shipped to a phone and the field names would be most of the bytes.
 *
 *   RUNS:  [from, to, name, difficulty, km, minutes]
 *   LIFTS: [from, to, name, kind, ride, lastUp, queue]
 *
 * Taken from buildEdges in the generated module rather than guessed at —
 * reading them as objects is silently empty, which is how the first run of
 * this reported every resort as having no runs, no grades and no kilometres,
 * and looked like a catastrophe rather than a typo.
 */
const RUN = ([from, to, name, difficulty, km, min]) => ({ from, to, name, difficulty, km, min });

/** Distinct piste names, which is what a resort means by "runs". */
function pistes(RUNS) {
  const named = new Set();
  let unnamed = 0;
  for (const raw of RUNS) {
    const r = RUN(raw);
    // The generated fallback names a nameless piste after its endpoints, which
    // is a label rather than a piste and must not be counted as one.
    if (!r.name || /^Point \d+/.test(r.name) || / to /.test(r.name)) unnamed++;
    else named.add(r.name);
  }
  return { named, unnamed };
}

const pct = (a, b) => (b ? Math.round(((a - b) / b) * 100) : null);
const arrow = (d) => (d === null ? "  ?" : d === 0 ? "  =" : d > 0 ? `+${d}%` : `${d}%`);

let notes = 0;
console.log("\nWHAT WE BUILT AGAINST WHAT THE RESORT SAYS\n");

for (const r of LIVE) {
  const mod = await import(`../src/resorts/${r.id}.js`);
  const { NODES, LIFTS, RUNS } = mod;
  const { named, unnamed } = pistes(RUNS);
  const grades = { blue: 0, red: 0, black: 0 };
  let km = 0;
  for (const raw of RUNS) {
    const run = RUN(raw);
    grades[run.difficulty] = (grades[run.difficulty] ?? 0) + 1;
    km += run.km ?? 0;
  }
  const alts = Object.values(NODES).map((n) => n.alt).filter(Number.isFinite);
  const top = Math.round(Math.max(...alts));
  const bottom = Math.round(Math.min(...alts));
  const p = r.published;

  console.log(`${r.name}`);
  if (!p) {
    console.log("  no published figures on record — nothing to check against");
    notes++;
  }
  const row = (label, ours, theirs, tolerance) => {
    if (theirs == null) { console.log(`  ${label.padEnd(22)} ${String(ours).padStart(6)}`); return; }
    const d = pct(ours, theirs);
    const bad = Math.abs(d) > tolerance;
    if (bad) notes++;
    console.log(`  ${label.padEnd(22)} ${String(ours).padStart(6)}  against ${String(theirs).padStart(5)}  ${arrow(d).padStart(5)}${bad ? "   <-- look" : ""}`);
  };

  row("lifts", LIFTS.length, p?.lifts, 10);
  row("named pistes", named.size, p?.runs, 25);
  row("piste segments", RUNS.length, null);
  row("unnamed segments", unnamed, null);
  row("kilometres of piste", Math.round(km), p?.km, 30);
  row("highest point", top, p?.top, 3);
  row("lowest point", bottom, p?.bottom, 6);
  console.log(`  ${"grades".padEnd(22)} ${grades.blue} blue, ${grades.red} red, ${grades.black} black`);

  const peak = await fromExport(r.id, NODES);
  if (peak && peak.ele > top + 50) {
    console.log(`  a lift off this graph climbs to ${peak.ele}m at ${peak.name} (${peak.lift})`);
    console.log(peak.pisteNear
      ? "    and there IS a downhill piste within 400m — the prune dropped something it should have kept"
      : "    no downhill piste within 400m, so nothing skis back and the prune was right to drop it");
    if (peak.pisteNear) notes++;
  }
  // A resort with no black at all, or nothing but, is a difficulty tag that
  // did not come through rather than a mountain with one kind of skiing.
  const total = grades.blue + grades.red + grades.black;
  for (const [g, n] of Object.entries(grades)) {
    if (n === 0) { console.log(`  no ${g} runs at all — check the difficulty tags`); notes++; }
    else if (n / total > 0.85) { console.log(`  ${Math.round((n / total) * 100)}% of it is ${g} — check the difficulty tags`); notes++; }
  }
  if (named.size && unnamed / RUNS.length > 0.6) {
    console.log(`  ${Math.round((unnamed / RUNS.length) * 100)}% of segments have no name of their own`);
    notes++;
  }
  console.log("");
}

console.log(notes
  ? `  ${notes} thing${notes === 1 ? "" : "s"} to look at. None of them fails a build; see the header.\n`
  : "  every resort agrees with its own published figures\n");
