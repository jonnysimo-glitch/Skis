/**
 * Is the graph WRONG, as opposed to incomplete?  Run with:
 *   node scripts/check-mapping.mjs
 *
 * Every other check in this repo asks whether something is missing. This one
 * asks whether what is there is right, which is a different and quieter kind
 * of fault: a run graded blue that OSM calls black, a lift timed at four
 * minutes for two kilometres of cable, an altitude at sea level in the Alps, a
 * restaurant three valleys away from the nearest node. None of those look
 * broken on a map and every one of them is a wrong answer to a skier.
 *
 * The generated graphs are compared against the OSM they came from, and the
 * distances and times against the pace model in src/lib/pace.js. It found one
 * real fault the first time it ran: a merged run summed its halves\u2019 two
 * minute floors instead of being re-timed over its whole length, so Latemar\u2019s
 * Residenza claimed six minutes for a kilometre that takes three.
 */
import fs from "node:fs";
import { metres, wayLength, label, DIFFICULTY } from "/home/user/Skis/scripts/osm/graph.mjs";
import { runMinutes, liftMinutes, LIFT_SPEED_MS } from "/home/user/Skis/src/lib/pace.js";

let problems = 0;
for (const id of ["monterosa", "kronplatz", "paganella", "latemar"]) {
  const M = await import(`/home/user/Skis/src/resorts/${id}.js`);
  const els = JSON.parse(fs.readFileSync(`/home/user/Skis/data/osm/${id}.json`, "utf8")).elements || [];
  const bad = [];

  // --- node positions: every node should sit on something it belongs to ----
  for (const [key, n] of Object.entries(M.NODES)) {
    if (!Number.isFinite(n.lat) || !Number.isFinite(n.lon)) bad.push(`${key}: no position`);
    if (!Number.isFinite(n.alt)) bad.push(`${key}: no altitude`);
    if (n.alt < 200 || n.alt > 4000) bad.push(`${key} "${n.name}": altitude ${n.alt} m is not alpine`);
  }

  // --- names: nothing generated, nothing empty, nothing absurd -------------
  for (const [key, n] of Object.entries(M.NODES)) {
    if (!n.name || !n.name.trim()) bad.push(`${key}: unnamed`);
    if (/Point \d|undefined|null/.test(n.name)) bad.push(`${key}: placeholder name "${n.name}"`);
    if (n.name && n.name.length > 44) bad.push(`${key}: name is ${n.name.length} chars`);
  }

  // --- runs: the grade has to be one OSM actually gave, or red by rule -----
  const osmGrades = new Map();
  for (const e of els) {
    if (e.type !== "way" || e.tags?.["piste:type"] !== "downhill" || e.tags.area === "yes") continue;
    const nm = label(e.tags.name || e.tags["piste:name"] || "");
    if (!nm) continue;
    const g = DIFFICULTY[e.tags["piste:difficulty"]] ?? "red";
    (osmGrades.get(nm) ?? osmGrades.set(nm, new Set()).get(nm)).add(g);
  }
  for (const r of M.RUNS) {
    const [from, to, name, diff, km, min, link] = r;
    if (!M.NODES[from] || !M.NODES[to]) bad.push(`run "${name}": endpoint missing`);
    if (!link && osmGrades.has(name) && !osmGrades.get(name).has(diff)) {
      bad.push(`run "${name}" is ${diff}; OSM says ${[...osmGrades.get(name)].join("/")}`);
    }
    if (!(km >= 0)) bad.push(`run "${name}": km ${km}`);
    if (!(min > 0)) bad.push(`run "${name}": ${min} min`);
    // The distance and the time have to be consistent with the pace model.
    if (!link && km > 0) {
      const drop = M.NODES[from].alt - M.NODES[to].alt;
      const want = runMinutes(km * 1000, drop, diff);
      if (Math.abs(want - min) > Math.max(2, want * 0.35)) {
        bad.push(`run "${name}": ${min} min for ${km} km / ${drop} m, model says ${want}`);
      }
    }
    // A run that covers ground it could not: 120 km/h is not skiing.
    if (km > 0 && (km * 1000) / min > 2000) bad.push(`run "${name}": ${Math.round(km * 1000 / min)} m/min`);
  }

  // --- lifts: up, timed by their own cable, and of a kind we draw ----------
  for (const l of M.LIFTS) {
    const [from, to, name, kind, ride, lastUp, queue] = l;
    if (!M.NODES[from] || !M.NODES[to]) { bad.push(`lift "${name}": endpoint missing`); continue; }
    const gain = M.NODES[to].alt - M.NODES[from].alt;
    if (gain <= 0) bad.push(`lift "${name}": gains ${gain} m`);
    if (!(ride > 0)) bad.push(`lift "${name}": ${ride} min`);
    if (!LIFT_SPEED_MS[kind]) bad.push(`lift "${name}": unknown kind "${kind}"`);
    if (!(lastUp > 8 * 60 && lastUp < 20 * 60)) bad.push(`lift "${name}": last up ${lastUp}`);
    if (!(queue >= 0 && queue < 60)) bad.push(`lift "${name}": queue ${queue}`);
    const span = metres(M.NODES[from].lat, M.NODES[from].lon, M.NODES[to].lat, M.NODES[to].lon);
    const want = liftMinutes(span, kind);
    if (ride > want * 3 + 3) bad.push(`lift "${name}": ${ride} min for ${Math.round(span)} m, model says ${want}`);
    // A cable that climbs steeper than 100% over its whole length is unlikely.
    if (span > 0 && gain / span > 1.0) bad.push(`lift "${name}": ${gain} m up over ${Math.round(span)} m`);
  }

  // --- places: on the mountain, with a real kind ---------------------------
  //
  // "parking" is in this list because it would otherwise fail the day the data
  // arrives rather than the day the code was written: the Overpass query asks
  // for car parks and the filter keeps them, but every export on disk predates
  // the question, so no resort file has one yet and nothing was watching.
  for (const p of M.PLACES ?? []) {
    const [nm, kind, lat, lon, alt] = p;
    if (!["hut", "restaurant", "cafe", "rental", "parking"].includes(kind)) bad.push(`place "${nm}": kind "${kind}"`);
    if (alt !== null && (alt < 200 || alt > 4000)) bad.push(`place "${nm}": altitude ${alt}`);
    const near = Math.min(...Object.values(M.NODES).map((n) => metres(lat, lon, n.lat, n.lon)));
    if (near > 3000) bad.push(`place "${nm}": ${Math.round(near)} m from the nearest node`);
  }

  problems += bad.length;
  console.log(`  ${bad.length ? "FAIL" : "ok  "}  ${id.padEnd(10)} ${Object.keys(M.NODES).length} nodes, ` +
    `${M.RUNS.length} runs, ${M.LIFTS.length} lifts, ${(M.PLACES ?? []).length} places` +
    `${bad.length ? ` \u2014 ${bad.length} wrong` : ""}`);
  for (const b of bad.slice(0, 25)) console.log(`          ${b}`);
  if (bad.length > 25) console.log(`          ... and ${bad.length - 25} more`);
}

console.log(problems
  ? `\n  ${problems} FAILING\n`
  : "\n  nothing in the graphs contradicts the data it came from\n");
process.exit(problems ? 1 : 0);
