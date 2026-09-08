/**
 * What there is to say about a resort, worked out from its own graph.
 *
 * This is the data behind the guide that opens from a card on the home screen:
 * the pistes it has, grouped by grade and longest first, a handful of facts
 * worth knowing, and everywhere you can stop. It is deliberately a separate
 * question from the "what is open" panel on the skiing tab — that one is
 * operational and hedged, because closures are not in OpenStreetMap and the
 * last-lift times are estimates. This one is descriptive: what is on this
 * mountain, which the graph does know.
 *
 * Every number here is derived. Nothing is written by hand, because the one
 * thing this codebase has learned twice is that plausible prose about a
 * mountain is indistinguishable from data until somebody checks it against the
 * piste map. The one sentence of editorial per resort is META.blurb, which
 * came with the resort config and says what links to what.
 *
 * Pure functions and no React, so `node src/lib/guide.test.js` can run them
 * against all four real graphs.
 */

/** Blue, red, black. European convention, hardest last. See PISTE_COLOUR. */
export const GRADES = [
  ["blue", "Blue"],
  ["red", "Red"],
  ["black", "Black"],
];

const RANK = { blue: 0, red: 1, black: 2 };

/**
 * Is this name the mountain's, or the pipeline's?
 *
 * A piste OSM never named is exported described by its endpoints — "Ostafa 1
 * to Crest", "Above Campo Scuola Gardonè to Torre di Pisa" — and that is the
 * right thing for the graph and the wrong thing to print in a list of slopes
 * under a heading that says these are the runs. It is a real piste and it
 * stays in the list, because dropping terrain would be the worse lie; it is
 * just not called that.
 *
 * The test is structural rather than a lookup against node names, because
 * plenty of real pistes ARE named after the place they start from — Alagna,
 * Belvedere, Marchner — and matching on that would rename them. Six of
 * Monterosa's fifty-five and nine of Kronplatz's sixty-one, and no real piste
 * name across the four resorts has " to " in it.
 */
export const isDescribed = (name) => / to /.test(String(name ?? ""));

/**
 * The pistes, one entry per name rather than one per graph edge.
 *
 * OSM maps a single piste as several ways and the graph splits again at every
 * junction, so Monterosa's 122 run rows are 55 pistes. Counting rows is what
 * made the status panel claim 82 red runs — a number nobody could check
 * against a piste map, which is the whole point of the app's figures.
 *
 * Length is the sum of the pieces. Grade is the hardest piece, the same
 * direction the pipeline rounds when OSM leaves `piste:difficulty` off — the
 * mistake that hurts is telling somebody a run is easier than it is.
 *
 * Drop is end to end: the highest endpoint of the piste minus the lowest.
 * Summing each piece's fall was tried first and is arguably the truer measure
 * of how much descending you do, since a piste that rolls loses height more
 * than once — and it read as a bug. Kronplatz's Gassl came out at 1,336 m of
 * descent on a mountain whose whole vertical is 1,334 m, which is a figure
 * nobody will believe however defensible it is. End to end is also what a
 * piste map quotes, so it is the number that can be checked.
 *
 * Stitched connectors are skipped. The pipeline adds them to rejoin pistes
 * that OSM leaves up to 350 m apart, marks them with a seventh field, and its
 * own header says they are "not counted as piste"; they are timed at walking
 * pace and one of them was showing up as Paganella's longest black at nine
 * metres of drop.
 */
export function pistes(runs = [], nodes = {}) {
  const byName = new Map();
  for (const row of runs) {
    const [from, to, name, grade, km, min, link] = row;
    if (!name || link) continue;
    const seen = byName.get(name) ?? {
      name, grade, km: 0, minutes: 0, pieces: 0,
      top: -Infinity, foot: Infinity, described: isDescribed(name),
    };
    seen.km += km ?? 0;
    seen.minutes += min ?? 0;
    seen.pieces += 1;
    if ((RANK[grade] ?? 0) > (RANK[seen.grade] ?? 0)) seen.grade = grade;
    for (const key of [from, to]) {
      const alt = nodes[key]?.alt;
      if (!Number.isFinite(alt)) continue;
      if (alt > seen.top) seen.top = alt;
      if (alt < seen.foot) seen.foot = alt;
    }
    byName.set(name, seen);
  }
  return [...byName.values()].map((p) => ({
    name: p.name,
    grade: p.grade,
    described: p.described,
    pieces: p.pieces,
    km: Math.round(p.km * 10) / 10,
    minutes: Math.round(p.minutes),
    drop: Number.isFinite(p.top) && Number.isFinite(p.foot) ? Math.round(p.top - p.foot) : 0,
    top: Number.isFinite(p.top) ? p.top : null,
  }));
}

/**
 * The pistes grouped by grade, longest first inside each group.
 *
 * Which is the order the request asked for and also the order a skier reads:
 * the grade decides whether a run is for them at all, and the length decides
 * whether it is worth the lift. Empty grades are dropped rather than shown as
 * a heading with nothing under it — two of these resorts have no black at all
 * in what OSM has mapped, and a "Black — 0" row is a claim about the mountain
 * we cannot make.
 */
export function byGrade(list = []) {
  return GRADES.map(([grade, label]) => {
    const of = list.filter((p) => p.grade === grade).sort((a, b) => b.km - a.km || a.name.localeCompare(b.name));
    return {
      grade,
      label,
      count: of.length,
      km: Math.round(of.reduce((sum, p) => sum + p.km, 0) * 10) / 10,
      items: of,
    };
  }).filter((g) => g.count > 0);
}

/** Everywhere you can stop, in the three kinds the map draws. */
const EATS = new Set(["restaurant", "cafe", "hut"]);

/**
 * Somewhere to eat, highest first.
 *
 * Height is the useful sort on a mountain: it tells you whether a place is on
 * your way down, which is the question. Names are left long here — the map
 * shortens them because a marker is two centimetres wide, and a list is not.
 */
export function eats(places = []) {
  return places
    .filter(([, kind]) => EATS.has(kind))
    .map(([name, kind, lat, lon, alt]) => ({ name, kind, lat, lon, alt }))
    .sort((a, b) => (b.alt ?? 0) - (a.alt ?? 0) || a.name.localeCompare(b.name));
}

/** Ski hire, and the car parks, for the same list treatment. */
export function services(places = []) {
  const of = (kind) =>
    places
      .filter(([, k]) => k === kind)
      .map(([name, k, lat, lon, alt]) => ({ name, kind: k, lat, lon, alt }))
      .sort((a, b) => a.name.localeCompare(b.name));
  return { rental: of("rental"), parking: of("parking") };
}

/**
 * A few facts worth knowing, each one true of this graph.
 *
 * Not marketing. Every line is a maximum or a total taken off the data, so it
 * can be checked against the mountain — which is the only kind of highlight
 * this app is in a position to write. Anything that reads like a brochure
 * ("wide cruising above the treeline") would be me inventing, and a resort
 * description invented from general knowledge is the same mistake as the
 * hand-typed graph this project started from.
 *
 * Returned as { k, v, note } so the caller can lay them out; empty entries are
 * dropped, because a resort with no black runs should say nothing about its
 * hardest rather than say "none".
 */
export function highlights({ list = [], lifts = [], nodes = {}, places = [], meta = {} } = {}) {
  const out = [];
  const alts = Object.values(nodes).map((n) => n.alt).filter(Number.isFinite);
  const longest = [...list].sort((a, b) => b.km - a.km)[0];
  const steepest = [...list].sort((a, b) => b.drop - a.drop)[0];

  if (longest) {
    out.push({
      k: "Longest run",
      v: `${longest.km} km`,
      note: `${longest.name}, ${longest.grade}`,
    });
  }
  if (steepest && steepest.drop > 0 && steepest.name !== longest?.name) {
    out.push({
      k: "Biggest descent",
      v: `${steepest.drop.toLocaleString()} m`,
      note: `${steepest.name}, ${steepest.grade}`,
    });
  }
  if (alts.length) {
    const top = Math.max(...alts);
    const foot = Math.min(...alts);
    out.push({
      k: "Top to bottom",
      v: `${(top - foot).toLocaleString()} m`,
      note: `${foot.toLocaleString()} to ${top.toLocaleString()} m`,
    });
  }
  /*
   * The lift that carries you highest, by where it lands rather than by its
   * length: "which lift gets me to the top" is the question a skier asks at
   * the bottom of the mountain.
   */
  const highest = lifts
    .map(([, to, name, type]) => ({ name, type, alt: nodes[to]?.alt }))
    .filter((l) => Number.isFinite(l.alt))
    .sort((a, b) => b.alt - a.alt)[0];
  if (highest) {
    out.push({
      k: "Highest lift",
      v: `${highest.alt.toLocaleString()} m`,
      note: `${highest.name}, ${highest.type}`,
    });
  }
  const table = eats(places).length;
  if (table) {
    out.push({
      k: "Somewhere to eat",
      v: String(table),
      note: "on the mountain",
    });
  }
  const areas = [...new Set(Object.values(nodes).map((n) => n.area).filter(Boolean))];
  if (areas.length > 1) {
    out.push({ k: "Areas", v: String(areas.length), note: areas.join(", ") });
  }
  return out;
}

/**
 * Everything the guide needs, for one resort, from its graph module.
 *
 * One call so a screen cannot assemble it half a different way from a check.
 */
export function guideFor(module = {}, meta = {}) {
  const list = pistes(module.RUNS, module.NODES);
  return {
    meta,
    pistes: list,
    grades: byGrade(list),
    eats: eats(module.PLACES),
    services: services(module.PLACES),
    highlights: highlights({
      list,
      lifts: module.LIFTS ?? [],
      nodes: module.NODES ?? {},
      places: module.PLACES ?? [],
      meta,
    }),
    km: Math.round(list.reduce((sum, p) => sum + p.km, 0) * 10) / 10,
    lifts: (module.LIFTS ?? []).length,
    sources: module.PLACE_SOURCES ?? ["OpenStreetMap"],
  };
}
