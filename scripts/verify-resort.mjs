/**
 * How much of a resort the graph actually has. Run: npm run resort:verify
 *
 * The failure this guards against is a graph that looks authoritative and is
 * not. OpenStreetMap coverage of an alpine resort is good but never complete,
 * and a planner that quietly holds nineteen of thirty-two lifts will happily
 * tell a skier there is no way across the mountain when there is.
 *
 * Three kinds of check, in descending order of how much they prove:
 *
 *   Against the resort's own published figures, where the config records them.
 *   This is the only real outside source available to the build, and it is
 *   what catches missing lifts and a truncated vertical.
 *
 *   Against OpenStreetMap's own `ele` tags. Altitudes come from AWS terrain
 *   tiles, so where a mapper has recorded a height for a station or a summit
 *   the two are independent and can be compared.
 *
 *   Physical plausibility. A piste steeper than a real black, a lift running
 *   faster than any cable, a "run" longer than the mountain.
 *
 * What it cannot do is read a PDF piste map or Google's slope layer. Those
 * would settle the questions this leaves open — which lifts are missing and
 * whether the blue runs really do not link up — and they need a machine with
 * open network access. This prints the comparison sheet for that.
 */
import { readFile, readdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const CONFIG_DIR = new URL("./resorts/", import.meta.url).pathname;
const OUT_DIR = new URL("../src/resorts/", import.meta.url);

/** Real equipment, in metres per second. Anything outside this is a data fault. */
const LIFT_SPEED = { min: 0.4, max: 12.5 };
/** A run at more than this gradient is not a piste. 100% is 45 degrees. */
const MAX_GRADIENT = 1.0;
/** Terrain tiles are ~10 m per pixel, so agreement closer than this is noise. */
const ELE_TOLERANCE = 30;

let problems = 0;
const flag = (line) => { problems++; console.log(`    ${line}`); };

async function verify(id) {
  const config = JSON.parse(await readFile(`${CONFIG_DIR}${id}.json`, "utf8"));
  let mod;
  try {
    mod = await import(pathToFileURL(new URL(`${id}.js`, OUT_DIR).pathname).href);
  } catch {
    console.log(`\n${config.name}: no graph built yet`);
    return;
  }
  const { NODES, LIFTS, RUNS } = mod;
  const alts = Object.values(NODES).map((n) => n.alt);
  const km = RUNS.reduce((s, r) => s + r[4], 0);

  console.log(`\n${config.name}`);
  console.log(`  graph      ${LIFTS.length} lifts, ${RUNS.length} runs, ${km.toFixed(0)} km, ` +
    `${Math.min(...alts)}-${Math.max(...alts)} m`);

  // --- against the resort's own figures ------------------------------------
  const pub = config.published;
  if (!pub) {
    console.log(`  published  none recorded — ${config.publishedSource || "no source noted"}`);
  } else {
    const rows = [];
    if (pub.lifts) rows.push(["lifts", LIFTS.length, pub.lifts]);
    if (pub.runs) rows.push(["runs", RUNS.length, pub.runs]);
    if (pub.top) rows.push(["top", Math.max(...alts), pub.top]);
    if (pub.bottom) rows.push(["bottom", Math.min(...alts), pub.bottom]);
    console.log(`  published  ${pub.lifts ? `${pub.lifts} lifts, ` : ""}` +
      `${pub.runs ? `${pub.runs} runs, ` : ""}${pub.bottom ?? "?"}-${pub.top ?? "?"} m`);
    for (const [what, got, want] of rows) {
      const height = what === "top" || what === "bottom";
      const share = got / want;
      let mark = "ok  ";
      let detail = height
        ? `${got} m against ${want} m (${got - want > 0 ? "+" : ""}${got - want})`
        : `${got} of ${want} (${Math.round(share * 100)}%)`;

      if (height) {
        if (Math.abs(got - want) > 40) mark = "GAP ";
      } else if (what === "runs" && share > 1.5) {
        // Not extra terrain. OSM maps one piste as several ways and the graph
        // splits again at every junction, so a run count well above the
        // published one is the same mountain cut into more pieces. Kilometres
        // would be the comparable figure; the resorts publish counts.
        mark = "note";
        detail = `${got} edges for ${want} published runs — the same pistes, split at junctions`;
      } else if (share < 0.9) {
        mark = "GAP ";
      }
      console.log(`    ${mark} ${what.padEnd(7)} ${detail}`);
      if (mark === "GAP ") problems++;
    }
  }

  // --- against OSM's own heights -------------------------------------------
  const osm = JSON.parse(await readFile(new URL(`../data/osm/${id}.json`, import.meta.url), "utf8"));
  const tagged = osm.elements.filter((el) => el.tags?.ele && Number.isFinite(el.lat));
  let compared = 0;
  let worst = null;
  for (const el of tagged) {
    const want = Number(String(el.tags.ele).replace(",", "."));
    if (!Number.isFinite(want)) continue;
    // Nearest graph node within 60 m: the same place by two routes.
    let best = null;
    for (const n of Object.values(NODES)) {
      const dx = (n.lon - el.lon) * 78000;
      const dy = (n.lat - el.lat) * 111320;
      const d = Math.hypot(dx, dy);
      if (d < 60 && (!best || d < best.d)) best = { d, alt: n.alt, name: n.name };
    }
    if (!best) continue;
    compared++;
    const off = best.alt - want;
    if (!worst || Math.abs(off) > Math.abs(worst.off)) worst = { off, want, ...best, tag: el.tags.name };
  }
  if (!compared) {
    console.log(`  heights    nothing to compare: no OSM ele tag lands within 60 m of a node`);
  } else {
    const bad = Math.abs(worst.off) > ELE_TOLERANCE;
    console.log(`  heights    ${compared} node(s) cross-checked against OSM's own ele tags`);
    console.log(`    ${bad ? "GAP " : "ok  "} worst   ${worst.name || worst.tag}: ` +
      `terrain says ${worst.alt} m, OSM says ${worst.want} m (${worst.off > 0 ? "+" : ""}${worst.off})`);
    if (bad) problems++;
  }

  // --- grades that block the mountain --------------------------------------
  //
  // The find that made this worth writing: Monterosa's whole red-ability
  // crossing from Passo dei Salati to Champoluc hangs on one hundred-metre run
  // called "Sarezza-Contenéry", tagged `advanced` in OSM and so black here,
  // sitting between two reds. A red skier could not cross the valleys at all
  // because of it.
  //
  // It is not fixed here and must not be. OSM's `advanced` rounds up to black
  // on purpose — rounding a grade down is the direction that sends someone
  // onto something they cannot ski — so this reports the specific hundred
  // metres to check against the piste map rather than deciding.
  const RANK = { blue: 1, red: 2, black: 3 };

  // A run is a chokepoint if allowing it, alone, opens up materially more of
  // the mountain to a grade that cannot currently use it.
  for (const ability of ["blue", "red"]) {
    const baseline = reachAtWith(NODES, LIFTS, RUNS, ability, -1);
    const harder = RUNS.map((r, i) => [r, i]).filter(([r]) => RANK[r[3]] > RANK[ability]);
    const openers = [];
    for (const [, index] of harder) {
      const gained = reachAtWith(NODES, LIFTS, RUNS, ability, index) - baseline;
      if (gained >= 5) openers.push({ run: RUNS[index], gained });
    }
    openers.sort((a, b) => b.gained - a.gained);
    if (openers.length) {
      console.log(`  chokepoint ${ability}: ${openers.length} harder run(s) each open 5+ more places`);
      for (const { run, gained } of openers.slice(0, 3)) {
        console.log(`    note  "${run[2]}" (${run[3]}, ${run[4]} km) would add ${gained} places — ` +
          `check the piste map`);
      }
    } else {
      console.log(`  chokepoint ${ability}: none — no single harder run is blocking the mountain`);
    }
  }

  // --- physical plausibility ----------------------------------------------
  const steep = RUNS.filter(([from, to, , , runKm]) => {
    const drop = NODES[from].alt - NODES[to].alt;
    return runKm > 0 && drop / (runKm * 1000) > MAX_GRADIENT;
  });
  const fast = LIFTS.filter(([from, to, , , minutes]) => {
    const dx = (NODES[to].lon - NODES[from].lon) * 78000;
    const dy = (NODES[to].lat - NODES[from].lat) * 111320;
    const length = Math.hypot(dx, dy);
    const speed = length / (minutes * 60);
    return length > 50 && (speed > LIFT_SPEED.max || speed < LIFT_SPEED.min);
  });
  const huge = RUNS.filter(([, , , , runKm]) => runKm > 12);
  console.log(`  plausible  ${steep.length} impossibly steep, ${fast.length} at an impossible ` +
    `cable speed, ${huge.length} longer than 12 km`);
  for (const r of steep.slice(0, 3)) flag(`GAP  steep   "${r[2]}" drops ${NODES[r[0]].alt - NODES[r[1]].alt} m in ${r[4]} km`);
  for (const l of fast.slice(0, 3)) flag(`GAP  speed   "${l[2]}" ${l[4]} min`);
  for (const r of huge.slice(0, 3)) flag(`GAP  length  "${r[2]}" ${r[4]} km`);
}

const ids = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const targets = ids.length
  ? ids
  : (await readdir(CONFIG_DIR)).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, ""));

for (const id of targets) {
  try { await verify(id); } catch (error) { console.log(`\n${id}: ${error.message.split("\n")[0]}`); }
}
console.log(`\n${problems ? `${problems} gap(s) to look at` : "nothing to flag"}`);
console.log("A PDF piste map or Google's slope layer would settle what is left;");
console.log("neither is reachable from this machine.\n");

/**
 * How much of the mountain a grade can round-trip if one harder run is allowed.
 *
 * Separate from the rest so the "what if this one run were rideable" question
 * is asked the same way every time.
 */
function reachAtWith(NODES, LIFTS, RUNS, ability, allowIndex) {
  const RANK = { blue: 1, red: 2, black: 3 };
  const DOWN = new Set(["gondola", "cable car", "funicular"]);
  const fwd = {};
  const rev = {};
  for (const k of Object.keys(NODES)) { fwd[k] = []; rev[k] = []; }
  for (const [f, t, , kind] of LIFTS) {
    fwd[f].push(t); rev[t].push(f);
    if (DOWN.has(kind)) { fwd[t].push(f); rev[f].push(t); }
  }
  RUNS.forEach((r, i) => {
    if (RANK[r[3]] <= RANK[ability] || i === allowIndex) { fwd[r[0]].push(r[1]); rev[r[1]].push(r[0]); }
  });
  const walk = (adj, start) => {
    const seen = new Set([start]);
    const queue = [start];
    while (queue.length) {
      for (const next of adj[queue.shift()]) if (!seen.has(next)) { seen.add(next); queue.push(next); }
    }
    return seen;
  };
  const start = Object.keys(NODES).find((k) => NODES[k].base) ?? Object.keys(NODES)[0];
  const f = walk(fwd, start);
  const b = walk(rev, start);
  return [...f].filter((k) => b.has(k)).length;
}
