/**
 * Writing a resort module.
 *
 * The output is the same shape src/resort.js already has, so the solver, the
 * map layer and the offline cache all read it without knowing where it came
 * from. The difference is the provenance header: a generated file says when it
 * was built, from what, and what had to be assumed, because the failure mode
 * this whole pipeline exists to prevent is data that looks authoritative and
 * is not.
 */

const pad = (text, width) => String(text).padEnd(width);
const quote = (text) => JSON.stringify(text);

/**
 * The registry entry for a resort, derived from its own graph.
 *
 * Everything the selection panel, the map camera and the offline tile warmer
 * read has to come from somewhere, and hand-typing it per resort is the manual
 * step this pipeline exists to remove. So it is computed here, at build time,
 * from the graph and the config — and every number below says where it came
 * from.
 */
function registryEntry({ id, config, NODES, LIFTS, RUNS }) {
  const nodes = Object.values(NODES);
  const lats = nodes.map((n) => n.lat);
  const lons = nodes.map((n) => n.lon);
  const alts = nodes.map((n) => n.alt);
  const lat0 = (Math.min(...lats) + Math.max(...lats)) / 2;
  const lon0 = (Math.min(...lons) + Math.max(...lons)) / 2;

  // The governing span is the wider of the two once longitude is corrected for
  // latitude, because that is the dimension that has to fit on screen.
  const span = Math.max(
    Math.max(...lats) - Math.min(...lats),
    (Math.max(...lons) - Math.min(...lons)) * Math.cos((lat0 * Math.PI) / 180)
  );
  // Calibrated against Monterosa, whose 11.6 was set by eye to frame the
  // mountain with a little room around it: this formula returns 11.61 for it.
  // Clamped because a one-lift resort should not open zoomed into a lift
  // station and a linked-valley giant should not open from orbit.
  const zoom = Math.round(Math.min(13.5, Math.max(9.5, Math.log2(360 / span) + 0.35)) * 10) / 10;

  const baseKeys = Object.keys(NODES).filter((k) => NODES[k].base);
  const lowestBase = baseKeys.length
    ? baseKeys.reduce((a, b) => (NODES[b].alt < NODES[a].alt ? b : a))
    : null;
  // The config names the base the app should open on, because which valley
  // that is cannot be derived: it is the one a skier would drive to, not the
  // lowest or the biggest. Matched on name so it survives a graph rebuild
  // renumbering the keys, and falling back to the lowest base if the named one
  // did not survive the connectivity prune.
  // Matched the way base names are matched, not by exact equality: the config
  // asks for "Staffal" and OSM writes "Stafal", so an exact test found nothing
  // and the app opened its default day at whichever base happened to be
  // lowest — which was an unnamed way endpoint.
  const fold = (t) => String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const sameish = (a, b) => {
    const x = fold(a);
    const y = fold(b);
    return Boolean(x && y) && (x === y || x.includes(y) || y.includes(x));
  };
  const namedBase = config.defaultBase
    ? baseKeys.find((k) => sameish(NODES[k].name, config.defaultBase))
    : null;
  const highest = Object.keys(NODES).reduce((a, b) => (NODES[b].alt > NODES[a].alt ? b : a));

  // Look from the valley you would park in towards the high point, so the day
  // opens facing up the mountain. This is NOT what Monterosa's hand-set -24
  // does — the derivation gives -52 there — so that entry keeps its own value
  // and a config may override this one. It is derived rather than invented,
  // which is the rule that matters.
  let bearing = 0;
  if (lowestBase && lowestBase !== highest) {
    const a = NODES[lowestBase];
    const b = NODES[highest];
    const dLon = (b.lon - a.lon) * Math.cos((((a.lat + b.lat) / 2) * Math.PI) / 180);
    bearing = Math.round((Math.atan2(dLon, b.lat - a.lat) * 180) / Math.PI);
  }

  const areas = new Set(baseKeys.map((k) => NODES[k].area).filter(Boolean));

  return {
    id,
    name: config.name,
    region: config.region,
    country: config.country,
    available: true,
    center: [Math.round(lon0 * 1e5) / 1e5, Math.round(lat0 * 1e5) / 1e5],
    zoom,
    pitch: config.camera?.pitch ?? 62,
    bearing: config.camera?.bearing ?? bearing,
    bbox: config.bbox,
    bases: baseKeys,
    defaultBase: namedBase ?? lowestBase ?? Object.keys(NODES)[0],
    firstLift: config.firstLift,
    lastDown: config.lastDown,
    stats: {
      lifts: LIFTS.length,
      // Connectors are excluded from both. A two hundred metre skate across a
      // car park is not a run and its distance is not piste distance; counting
      // it would inflate the one figure on the home screen a skier can check
      // against a piste map.
      runs: RUNS.filter((r) => !r.link).length,
      /**
       * Kilometres of piste, which is the figure to show a skier.
       *
       * The run *count* is not comparable to anything: OSM maps one piste as
       * several ways and the graph splits again at every junction, so
       * Paganella came out as 80 "runs" against the 31 it publishes and the
       * home screen was quoting a number nobody could check against a piste
       * map. Length does not care how the same piste is cut up, and it is
       * what resorts advertise.
       */
      km: Math.round(RUNS.filter((r) => !r.link).reduce((sum, r) => sum + (r.km || 0), 0)),
      top: Math.max(...alts),
      bottom: Math.min(...alts),
      valleys: areas.size || 1,
    },
    blurb: config.note ?? null,
    /**
     * What the resort itself publishes, where the config records it, so the
     * app can say how much of the mountain it actually holds. A planner
     * quietly missing thirteen of thirty-two lifts will tell a skier there is
     * no way across when there is, and that is the failure this whole pipeline
     * exists to prevent.
     */
    published: config.published ?? null,
  };
}

export function emit({ id, meta, NODES, LIFTS, RUNS, PLACES = [], ways = [], terrain = null, report, fetchedAt }) {
  const nodeKeys = Object.keys(NODES);
  const keyWidth = Math.max(...nodeKeys.map((k) => k.length)) + 2;
  const nameWidth = Math.max(...nodeKeys.map((k) => quote(NODES[k].name).length)) + 1;

  /*
   * On the mountain, measured against the mountain rather than against its
   * junctions.
   *
   * This kept anything within 200 m of a graph NODE, and a node is a junction
   * or a lift station — `contractChains` deletes everything in between, so a
   * three kilometre piste has two of them and nothing along its length. A
   * restaurant beside the middle of that piste is hundreds or thousands of
   * metres from the nearest node and was dropped. Measured across the four
   * resorts: 54 named places sitting within 200 m of a piste, thrown away.
   *
   * So the distance is to the piste itself. The catch is that a bounding box
   * holds more than one ski area — Monterosa's reaches Cervinia, Latemar's
   * takes in Carezza and the Rosengarten — and measuring to every piste in the
   * box would have hauled in Rifugio Guide del Cervino, which is a fine lunch
   * and is over a 3,500 m ridge from anything this resort can route you to.
   *
   * A way is this resort's if any of its own vertices is within OURS of a kept
   * node. Our pistes qualify because their ends ARE junctions; a neighbouring
   * area's do not, because nothing of ours is near them. On Monterosa that is
   * 133 ways of the 393 in the box.
   *
   * A rental is still allowed its walk from the car park, and now also counts
   * as arrived if it is beside the lifts: Kronplatz has two 150-250 m from a
   * node and 700 m from a base, which is a shop at the bottom of the gondola
   * by any reading, and both were being dropped.
   */
  const NEAR_PISTE = 200;
  /*
   * How far from the mountain a place you drive to is allowed to be.
   *
   * Nine hundred metres, and it used to be six, and the six was a guess.
   * Kronplatz names its ski car parks P1 to P4 and they sit 725, 731, 735 and
   * 775 m from the nearest base — so the guess dropped all four of the car
   * parks the resort itself signposts, and kept two of sixty-eight. Nine
   * hundred keeps seven, including all four Ps, and adds nothing at Latemar,
   * where Parking 1 to 4 are inside a hundred and twenty metres anyway. The
   * next thing out is at 1,018 m and then nothing until 2.1 km, so this sits
   * in a gap rather than on a slope.
   *
   * It is not a surprising number once measured: at a resort you park below
   * the village and walk or take the shuttle. Six hundred metres is a car park
   * at the lift, which is the one case that was never in doubt.
   */
  const NEAR_BASE = 900;
  /*
   * Ski hire reaches further, because hiring happens in the village.
   *
   * Nine hundred metres is the right question for a car park — you park below
   * the village and walk — and the wrong one for a hire shop. Hiring is an
   * errand you run before you ski, in the town you drove to, and a shop two
   * kilometres from the gondola is a shop you would want to be told about.
   * Reported twice as a gap: "I know there's a Rent and Go in Brunico and I
   * don't see it."
   *
   * Three thousand, and it is measured rather than guessed. Every hire shop in
   * the four exports, by distance from the nearest base:
   *
   *   8, 441, 555, 684, 766 m   at the lift (Kronplatz's five, Monterosa's one at 52)
   *   2,611 m                   La marmotta rossa, down the valley from Alagna
   *   2,876 m                   Ski Rent Sebatum, San Lorenzo, near Brunico
   *   3,970 m and beyond        Predazzo and Cavalese, which are other resorts'
   *                             valleys and not somewhere to send an Obereggen skier
   *
   * So there is a gap between 2,876 and 3,970 and this sits in it, the same
   * way NEAR_BASE sits in the gap above 1,018. It brings in the two village
   * shops and stops before the other valleys.
   */
  const NEAR_BASE_HIRE = 3000;
  const NEAR_NODE = 350;
  const OURS = 250;
  const spanM = (a, b) => {
    const R = 6371000;
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLon = ((b.lon - a.lon) * Math.PI) / 180;
    const lat = ((a.lat + b.lat) / 2) * Math.PI / 180;
    const x = dLon * Math.cos(lat);
    return Math.round(Math.sqrt(dLat * dLat + x * x) * R);
  };
  /** Metres from a point to a segment, flat-earth, which over a few km it is. */
  const toSegment = (p, a, b) => {
    const R = 6371000;
    const rad = Math.PI / 180;
    const k = Math.cos(p.lat * rad);
    const px = (p.lon - a.lon) * k * R * rad;
    const py = (p.lat - a.lat) * R * rad;
    const bx = (b.lon - a.lon) * k * R * rad;
    const by = (b.lat - a.lat) * R * rad;
    const len2 = bx * bx + by * by;
    if (!len2) return Math.hypot(px, py);
    const t = Math.max(0, Math.min(1, (px * bx + py * by) / len2));
    return Math.hypot(px - bx * t, py - by * t);
  };
  const nodeList = nodeKeys.map((k) => NODES[k]);
  const baseList = nodeList.filter((n) => n.base);
  const nearest = (place, list) =>
    list.reduce((best, n) => Math.min(best, spanM(place, n)), Infinity);

  const lines = ways
    .filter((w) => w.geometry?.length > 1 &&
      (w.tags?.["piste:type"] === "downhill" || w.tags?.aerialway))
    .map((w) => w.geometry)
    .filter((geom) => geom.some((v) => nearest(v, nodeList) <= OURS));
  const toPistes = (place) => {
    let best = Infinity;
    for (const geom of lines) {
      for (let i = 1; i < geom.length; i++) {
        const d = toSegment(place, geom[i - 1], geom[i]);
        if (d < best) best = d;
        if (best <= 5) return best;
      }
    }
    return best;
  };
  /*
   * Two ways to arrive, so two rules.
   *
   * Skis and cars: a rental or a car park is something you walk to from where
   * you parked, so it is measured against the bases. Everything else is
   * something you ski to, and measured against the pistes.
   */
  const DRIVE_TO = new Set(["rental", "parking"]);
  /*
   * And a car park has to look like one.
   *
   * The query now asks for every `amenity=parking` in the box rather than only
   * the named ones, because the car park at the foot of a lift is routinely an
   * untagged polygon and that is the one that matters most. The cost is every
   * passing place in three valleys, so something has to separate them, and it
   * is not the tags: it is whether a mapper drew an area or dropped a pin. A
   * name or a capacity is evidence too — somebody cared enough to type it.
   */
  const worthParking = (place) =>
    place.kind !== "parking" || Boolean(place.name || place.spaces || place.drawn);
  const kept = PLACES.filter((place) =>
    worthParking(place) && (DRIVE_TO.has(place.kind)
      ? nearest(place, baseList) <= (place.kind === "rental" ? NEAR_BASE_HIRE : NEAR_BASE) ||
        nearest(place, nodeList) <= NEAR_NODE
      : toPistes(place) <= NEAR_PISTE));

  /*
   * A car park called after the base it serves.
   *
   * OSM names about a third of them, and "the one at Champoluc" is what a
   * skier means anyway — the mid-day case this app is built around is "my car
   * is at Champoluc", not "my car is at P3 Frachey". So an unnamed one takes
   * the nearest base's name, and where a base has several, the biggest wins:
   * sorted by capacity before the dedupe below, which keeps the first of each
   * name. Asking for parking with a name OR a capacity is what makes that
   * possible; a six-space layby with neither is noise and is never fetched.
   */
  const baseNameFor = (place) =>
    baseList.reduce(
      (best, n) => (spanM(place, n) < spanM(place, best) ? n : best),
      baseList[0]
    )?.name;
  const withNames = kept
    .map((place) => ({
      ...place,
      name: place.name
        ?? (place.kind === "parking" && baseList.length
          ? `${baseNameFor(place)} parking`
          : null),
    }))
    .filter((place) => place.name)
    .sort((a, b) => (b.spaces ?? 0) - (a.spaces ?? 0));

  // One entry per name: OSM often has the building and its restaurant as two
  // objects a few metres apart, and two identical pins is worse than one.
  const seenPlace = new Set();
  const placeLines = withNames
    .filter((place) => !seenPlace.has(place.name) && seenPlace.add(place.name))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((place) => {
      /*
       * A sixth field, and only where there is something in it.
       *
       * Everywhere else the five say all there is to say: what it is called,
       * what it is, where it is, how high. A car park has facts none of those
       * carry and a driver chooses on — spaces, whether it costs, whether it
       * is covered — and they are written as an object rather than as three
       * more slots so that a resort with no car parks reads exactly as it did
       * before, and so a fourth fact later is a key rather than a migration.
       */
      const facts = place.kind === "parking"
        ? Object.fromEntries(Object.entries({
          spaces: place.spaces ?? null,
          fee: place.fee ?? null,
          covered: place.covered ?? null,
        }).filter(([, v]) => v !== null))
        : {};
      /*
       * Which places did not come off the map.
       *
       * One field, on the place itself, because the audit has to know not to
       * look for it in the OSM export and a reader ought to be able to tell.
       * Absent for everything from OSM, which is nearly all of them, so the
       * files do not grow a repeated word.
       */
      if (place.source && place.source !== "osm") facts.src = place.source;
      const tail = Object.keys(facts).length ? `, ${JSON.stringify(facts)}` : "";
      return `  [${quote(place.name)}, ${quote(place.kind)}, ` +
        `${Math.round(place.lat * 1e5) / 1e5}, ${Math.round(place.lon * 1e5) / 1e5}, ` +
        `${Number.isFinite(place.alt) ? place.alt : "null"}${tail}],`;
    });

  const nodeLines = nodeKeys.map((key) => {
    const n = NODES[key];
    const extras = [
      n.area ? `area: ${quote(n.area)}` : null,
      n.base ? "base: true" : null,
      n.rifugio ? "rifugio: true" : null,
      // Whether OSM actually named this place. An unnamed junction carries a
      // description so the plan form can offer it as somewhere you might be
      // standing ("Above Gabiet"), and the map needs to know not to write that
      // on the mountain. Dropping this flag was why "Point 74" was still
      // being drawn after the labels were supposedly fixed.
      n.named === false ? "named: false" : null,
    ].filter(Boolean);
    return `  ${pad(key + ":", keyWidth)}{ name: ${pad(quote(n.name) + ",", nameWidth)} ` +
      `lat: ${n.lat.toFixed(5)}, lon: ${n.lon.toFixed(5)}, alt: ${n.alt}` +
      (extras.length ? `, ${extras.join(", ")}` : "") + " },";
  });

  const liftLines = LIFTS.map((l) =>
    `  [${quote(l.from)}, ${quote(l.to)}, ${quote(l.name)}, ${quote(l.kind)}, ` +
    `${l.minutes}, ${l.lastUp}, ${l.queue}],`
  );

  // The seventh field is only written for a connector, so a resort without
  // one reads exactly as it did before.
  const runLines = RUNS.map((r) =>
    `  [${quote(r.from)}, ${quote(r.to)}, ${quote(r.name)}, ${quote(r.difficulty)}, ` +
    `${r.km}, ${r.minutes}${r.link ? ", 1" : ""}],`
  );

  const assumed = [
    report.difficultyAssumed
      ? `${report.difficultyAssumed} piste${report.difficultyAssumed === 1 ? "" : "s"} had no ` +
        `piste:difficulty and were taken as red`
      : null,
    report.unnamedRuns
      ? `${report.unnamedRuns} run${report.unnamedRuns === 1 ? "" : "s"} were unnamed and are ` +
        `described by their endpoints`
      : null,
    report.geometryHoles
      ? `${report.geometryHoles} vertices across ${report.waysWithHoles} ` +
        `way${report.waysWithHoles === 1 ? "" : "s"} came back from Overpass unresolved; those ` +
        `ways are measured straight across the gap and so read slightly short`
      : null,
    `${report.nodesDropped} node${report.nodesDropped === 1 ? "" : "s"}, ` +
      `${report.liftsDropped} lift${report.liftsDropped === 1 ? "" : "s"} and ` +
      `${report.runsDropped} run${report.runsDropped === 1 ? "" : "s"} were outside the largest ` +
      `strongly connected component and were dropped`,
    report.linksAdded
      ? `${report.linksAdded} connector${report.linksAdded === 1 ? " was" : "s were"} added, ` +
        `${report.linksMetres} m in total, to rejoin pistes OSM leaves up to ` +
        `${report.linkReach} m apart; they are marked as links, not counted as piste, and ` +
        `timed at walking pace`
      : null,
    report.pisteAreasSkipped
      ? `${report.pisteAreasSkipped} piste${report.pisteAreasSkipped === 1 ? "" : "s"} mapped as ` +
        `an area rather than a line ${report.pisteAreasSkipped === 1 ? "was" : "were"} skipped: ` +
        `the outline of a snow field is not a way down it`
      : null,
    `endpoints within ${report.tolerance} m of each other were treated as the same place`,
  ].filter(Boolean);

  /*
   * Who contributed, worked out from the places rather than declared.
   *
   * A source that was asked and had nothing must not appear in the credits,
   * and a source that quietly filled in half the capacities must. Both facts
   * are in the records: `source` says who supplied a whole place and `from`
   * says who supplied a single field of one.
   */
  /*
   * A phrase rather than a name for the manual source, because the two places
   * this ends up read as sentences: "Pistes, lifts and places from
   * OpenStreetMap and a few checked by hand" in the resort guide, and "Resort
   * data — OpenStreetMap, a few checked by hand" in Settings. "manual" is a
   * variable name and "Checked by hand" starts a clause mid-sentence; neither
   * is what a reader wants to be told.
   */
  const CREDIT = {
    osm: "OpenStreetMap",
    opendatahub: "Open Data Hub South Tyrol",
    manual: "a few checked by hand",
  };
  const contributors = [...new Set(
    kept.flatMap((place) => [place.source ?? "osm", ...Object.values(place.from ?? {})])
  )]
    /*
     * OpenStreetMap leads, then the rest alphabetically. A plain sort is on
     * the keys, and "manual" sorts before "osm", so the credit line came out
     * as "a few checked by hand and OpenStreetMap" — which inverts what the
     * data is. OSM is the base every resort is built from and the only source
     * whose licence requires the credit at all.
     */
    .sort((a, b) => (a === "osm" ? -1 : b === "osm" ? 1 : a.localeCompare(b)))
    .map((key) => CREDIT[key] ?? key);

  return `/**
 * ${meta.name} — resort graph.
 *
 * GENERATED. Do not edit by hand: run \`npm run resort -- ${id}\` instead.
 *
 * Source:    OpenStreetMap via the Overpass API, ${fetchedAt || "date unrecorded"}
 * Places:    ${contributors.join(", ")}
 * Elevation: AWS Terrain Tiles (terrarium), zoom 13
 * Licence:   OSM data is ODbL. Attribution is required wherever this is shown.
 *
 * What had to be assumed:
${assumed.map((line) => ` *   - ${line}`).join("\n")}
 *
 * NOT from OpenStreetMap, because it is not in there: last-lift times and
 * queue estimates. Those come from the resort and are the numbers behind the
 * app's promise that nothing will strand you, so they are listed separately in
 * scripts/resorts/${id}.json rather than buried in the graph.
 *
 * Node coordinates are [lat, lon]. They exist so the 3D layer can place the
 * graph on real terrain; the solver itself never reads them.
 */

export const NODES = {
${nodeLines.join("\n")}
};

/** [from, to, name, type, rideMinutes, lastUpMinuteOfDay, typicalQueueMinutes] */
export const LIFTS = [
${liftLines.join("\n")}
];

/**
 * [from, to, name, difficulty, km, minutes] and, on a connector, a trailing 1.
 *
 * A connector is the flat bit between two pistes — the skiweg round the back
 * of a station, the two hundred metres from where the piste peters out to
 * where the lift queue starts. It is routable, so it lives here with the runs,
 * but it is not a run: it is not counted in the resort's piste distance, it is
 * drawn as a connector rather than graded piste, and navigation tells you to
 * cross it rather than to ski it.
 */
export const RUNS = [
${runLines.join("\n")}
];

/**
 * Places on the mountain that are not junctions: where to eat, and where to
 * hire skis.
 *
 * [name, kind, lat, lon, altitudeMetres] with kind one of hut, restaurant,
 * cafe or rental. The altitude can be null where the terrain tiles did not
 * reach, which is honest: a made-up height is worse than none.
 *
 * Narrowed to what is actually on the hill. A resort's bounding box holds
 * every pizzeria in the valley — sixty-two of them at Monterosa — and a map
 * showing all of them shows none of them. Somewhere to eat has to be within a
 * couple of hundred metres of a place the graph can put you; somewhere to hire
 * skis has further to reach, because it is in the village you parked in.
 */
export const PLACES = [
${placeLines.join("\n")}
];

/*
 * Who the places came from, for the credit in Settings.
 *
 * OpenStreetMap is always in here and is always required — ODbL asks for
 * attribution wherever the data is shown. The rest are here because a person
 * reading "412 spaces" should be able to find out who counted, whether or not
 * that source's licence obliges it.
 */
export const PLACE_SOURCES = ${JSON.stringify(contributors)};

export const DIFFICULTY_RANK = { blue: 1, red: 2, black: 3 };

export const SHORT_NAMES = ${JSON.stringify(meta.shortNames || {}, null, 2)};

/**
 * How the app lists and frames this resort. Derived from the graph above and
 * scripts/resorts/${id}.json at build time, so adding a resort does not mean
 * hand-typing a camera position.
 */
${terrain ? `/**
 * The shape of the ground, ${terrain.n} by ${terrain.n} samples of real
 * elevation over the box below.
 *
 * The map used to build its terrain by interpolating between the altitudes of
 * the graph's own nodes, which for a whole resort is under a hundred points.
 * That does not make a mountain: the valleys fill in and every ridge no lift
 * crosses is missing. This is the same elevation every gradient in the graph
 * is measured from, sampled on a grid, so the terrain is the actual mountain
 * and the ground around it is real ground rather than invented ground.
 *
 * Int16 metres, base64, decoded once when the resort loads.
 */
export const TERRAIN = ${JSON.stringify(terrain)};

` : ""}export const META = ${JSON.stringify(registryEntry({ id, config: meta, NODES, LIFTS, RUNS }), null, 2)};

/**
 * Lift kinds a skier can also ride down.
 *
 * You board a gondola or a cable car in either direction; a drag lift or a
 * chair you do not. Leaving this out was not a small omission: with lifts
 * modelled as one-way up, any base whose valley descent is graded red was
 * unreachable for a blue skier, so Monterosa offered a beginner exactly one
 * place to stand and Kronplatz and Paganella offered none at all. Riding the
 * gondola down is what a real skier does there. Adding it takes a blue skier
 * at Stafal from 1 place to 10, and a red skier from 26 to 56.
 *
 * Conservative on purpose: only the kinds that certainly carry passengers
 * downhill. Whether a particular chairlift allows it is the resort's own
 * operating detail, and inventing it is how you strand someone at the top.
 */
const DOWNLOADABLE = new Set(["gondola", "cable car", "funicular"]);

export function buildEdges() {
  const edges = [];
  LIFTS.forEach(([from, to, name, liftType, ride, lastUp, queue], i) => {
    edges.push({
      id: \`L\${i}\`, kind: "lift", from, to, name, liftType, ride, lastUp, queue,
      min: ride + queue,
      gain: NODES[to].alt - NODES[from].alt,
    });
    // The same ride, the other way. Still a lift, so the last-up time still
    // applies — a gondola you cannot board at 16:20 cannot take you down at
    // 16:20 either — and the route reads as a lift ride, which it is.
    if (DOWNLOADABLE.has(liftType)) {
      edges.push({
        id: \`L\${i}d\`, kind: "lift", from: to, to: from, name, liftType, ride, lastUp, queue,
        min: ride + queue,
        gain: NODES[from].alt - NODES[to].alt,
        down: true,
      });
    }
  });
  RUNS.forEach(([from, to, name, difficulty, km, min, link], i) => {
    edges.push({
      id: \`R\${i}\`, kind: "run", from, to, name, difficulty, km, min,
      drop: NODES[from].alt - NODES[to].alt,
      ...(link ? { link: true } : {}),
    });
  });
  return edges;
}
`;
}
