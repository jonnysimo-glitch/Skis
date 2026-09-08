/**
 * Are the right places on the mountain? Run with: npm run check:places
 *
 * An independent audit of the restaurants, ski hire and car parks in each
 * generated resort module — independent because it recomputes what should be
 * there straight from the raw Overpass export rather than re-running the
 * pipeline that produced the file. A bug in the filter would pass a test that
 * calls the filter; it cannot pass a test that disagrees with it.
 *
 * Four questions per resort:
 *
 *   1. Is anything in the export that a skier would want and the file lacks?
 *      Reported by how far it is from a piste, because that is the rule the
 *      filter applies and the number that says whether a miss is a miss.
 *   2. Is anything in the file that is not in the export, or is a duplicate?
 *   3. Does every place have a usable name and a plausible altitude?
 *   4. Does every place resolve to a Google Maps link a person can open?
 *
 * Car parks are the fourth kind and there is no data for them yet: the query
 * asks for them, the filter keeps them, and the export on disk predates the
 * question. Rather than pass silently on an empty set, this says so.
 */
import fs from "node:fs";
import { RESORTS } from "../src/resorts/index.js";
import { shortName, describe } from "../src/lib/places.js";

const R = 6371000;
const rad = (d) => (d * Math.PI) / 180;
const metres = (a, b) => {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon) * Math.cos(rad((a.lat + b.lat) / 2));
  return Math.hypot(dLat, dLon) * R;
};
/** Distance from a point to a segment, not to its ends. */
const toSegment = (p, a, b) => {
  const ax = 0, ay = 0;
  const bx = (b.lon - a.lon) * Math.cos(rad(a.lat)) * (Math.PI / 180) * R;
  const by = (b.lat - a.lat) * (Math.PI / 180) * R;
  const px = (p.lon - a.lon) * Math.cos(rad(a.lat)) * (Math.PI / 180) * R;
  const py = (p.lat - a.lat) * (Math.PI / 180) * R;
  const len = (bx - ax) ** 2 + (by - ay) ** 2;
  const t = len ? Math.max(0, Math.min(1, ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / len)) : 0;
  return Math.hypot(px - (ax + t * (bx - ax)), py - (ay + t * (by - ay)));
};

/*
 * The same business, spelled twice, written out again here.
 *
 * The pipeline merges these. This file's job is to notice when the pipeline
 * is wrong, so it reimplements the rule rather than importing it — the same
 * reason `metres` and `KIND` above are its own. Two of them are real, both at
 * Monterosa: "Chäisscheri"/"Chaisscheri" 45 m apart at one house number, and
 * "Rifugio Belvedere"/"Baita Rifugio Belvedere" 8 m apart.
 */
const plain = (name) =>
  String(name ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const NEAR_SAME = 60;
const NEAR_SAME_PARTIAL = 30;
/** Whether these two are one place under two spellings. */
const oneAndTheSame = (a, b) => {
  const x = plain(a.name);
  const y = plain(b.name);
  if (!x || !y) return false;
  const d = metres(a, b);
  if (x === y) return d <= NEAR_SAME;
  return (
    d <= NEAR_SAME_PARTIAL &&
    x.length >= 5 && y.length >= 5 &&
    (x.includes(y) || y.includes(x))
  );
};

const KIND = (t) =>
  t.tourism === "alpine_hut" || t.tourism === "wilderness_hut" ? "hut"
    : t.amenity === "restaurant" ? "restaurant"
      : t.amenity === "cafe" ? "cafe"
        : t.shop === "ski" || t.shop === "rental" || t.amenity === "ski_rental" ? "rental"
          : t.amenity === "parking" ? "parking"
            : null;

// The same thresholds emit.mjs applies, restated rather than imported: a copy
// that drifts is a finding, an import that agrees proves nothing.
const NEAR_PISTE = 200;
/*
 * How near a base a hire shop has to be before the file is expected to carry
 * it. Independently chosen, and deliberately TIGHTER than the pipeline's
 * NEAR_BASE_HIRE: this asks "was anything obviously nearby left out", and a
 * check that used the same number as the thing it audits would only ever be
 * confirming arithmetic. 600 m is unarguable — a shop that close is at the
 * lift.
 */
const NEAR_BASE = 600;
const OURS = 250;

let problems = 0;
let checks = 0;
const note = (ok, line) => {
  checks++;
  if (!ok) problems++;
  console.log(`  ${ok ? "ok  " : "MISS"}  ${line}`);
};

for (const meta of RESORTS.filter((r) => r.available)) {
  const id = meta.id;
  const mod = await import(`../src/resorts/${id}.js`);
  const raw = JSON.parse(fs.readFileSync(new URL(`../data/osm/${id}.json`, import.meta.url), "utf8"));
  const nodes = Object.values(mod.NODES);

  // Where the pistes are, from the export, restricted to ways this resort
  // actually owns — the bbox catches a neighbouring area sharing the valley.
  const pistes = (raw.elements ?? [])
    .filter((el) => el.type === "way" && el.tags?.["piste:type"] === "downhill" && el.geometry?.length)
    .map((el) => el.geometry.filter((g) => g && Number.isFinite(g.lat)))
    .filter((geom) => geom.some((v) => nodes.some((n) => metres(v, n) <= OURS)));
  const bases = nodes.filter((n) => n.base);

  const toPistes = (p) => {
    let best = Infinity;
    for (const geom of pistes) {
      for (let i = 1; i < geom.length; i++) best = Math.min(best, toSegment(p, geom[i - 1], geom[i]));
      if (best <= 5) break;
    }
    return best;
  };
  const toBases = (p) => (bases.length ? Math.min(...bases.map((b) => metres(p, b))) : Infinity);

  /*
   * Every candidate in the export, under every name it answers to.
   *
   * `aka` rather than one name, because the pipeline is allowed to prefer a
   * readable alternative where the primary is a logo: a restaurant above
   * Gressoney is tagged name=FZRY, alt_name=Fitz Roy, and the file says Fitz
   * Roy. This audit exists to catch a name the pipeline invented, and it has
   * to keep catching those — so it accepts any name the OSM element actually
   * carries and nothing else. Checking `name` alone made a legitimate
   * substitution look like both a missing place and a fabricated one, which
   * is two false alarms for one correct behaviour.
   */
  const aliases = (t) =>
    [t.name, t.alt_name, t["name:en"], t.official_name]
      .filter((n) => typeof n === "string" && n.trim());
  const candidates = (raw.elements ?? [])
    .filter((el) => el.tags && KIND(el.tags) && el.tags.name)
    .map((el) => ({
      name: el.tags.name,
      aka: aliases(el.tags),
      kind: KIND(el.tags),
      lat: el.lat ?? el.center?.lat,
      lon: el.lon ?? el.center?.lon,
    }))
    .filter((c) => Number.isFinite(c.lat) && Number.isFinite(c.lon));

  const inFile = new Map(mod.PLACES.map((p) => [p[0], p]));
  /*
   * Or represented by something the file already has under another spelling.
   *
   * Without this the merge reads as a loss: the two Monterosa duplicates came
   * back as "nothing to eat within 200 m of a piste is missing: Baita Rifugio
   * Belvedere, Chaisscheri" — both of which are on the mountain, under the
   * other name, eight and forty-five metres away.
   */
  const filePoints = mod.PLACES.map(([name, kind, lat, lon]) => ({ name, kind, lat, lon }));
  const merged = [];
  const covered = (c) => {
    if (c.aka.some((n) => inFile.has(n))) return true;
    const twin = filePoints.find((p) => oneAndTheSame(c, p));
    if (twin) { merged.push(`${c.name} → ${twin.name}`); return true; }
    return false;
  };
  const eats = mod.PLACES.filter((p) => ["restaurant", "cafe", "hut"].includes(p[1]));
  const hire = mod.PLACES.filter((p) => p[1] === "rental");
  const cars = mod.PLACES.filter((p) => p[1] === "parking");

  console.log(`\n${meta.name} — ${eats.length} places to eat, ${hire.length} ski hire, ${cars.length} car parks`);

  // 1. Anything the file should have and does not.
  const missedEats = candidates
    .filter((c) => ["restaurant", "cafe", "hut"].includes(c.kind) && !covered(c))
    .map((c) => ({ ...c, d: toPistes(c) }))
    .filter((c) => c.d <= NEAR_PISTE)
    .sort((a, b) => a.d - b.d);
  note(missedEats.length === 0,
    `nothing to eat within ${NEAR_PISTE} m of a piste is missing` +
    (missedEats.length ? `: ${missedEats.slice(0, 6).map((c) => `${c.name} (${Math.round(c.d)} m)`).join(", ")}` : ""));

  /*
   * Hire is measured on its own radius, the wider one. See NEAR_BASE_HIRE in
   * emit.mjs: hiring is an errand in the village, not a walk from the car.
   */
  const missedHire = candidates
    .filter((c) => c.kind === "rental" && !covered(c))
    .map((c) => ({ ...c, d: toBases(c) }))
    .filter((c) => c.d <= NEAR_BASE)
    .sort((a, b) => a.d - b.d);
  note(missedHire.length === 0,
    `no ski hire within ${NEAR_BASE} m of a base is missing` +
    (missedHire.length ? `: ${missedHire.slice(0, 6).map((c) => `${c.name} (${Math.round(c.d)} m)`).join(", ")}` : ""));

  /*
   * How many the export had at all, which is the difference between a filter
   * that is too tight and a resort OSM has not finished mapping. Monterosa
   * ships one ski hire and certainly has more than one in real life; this
   * line is what says whether that is our rule or OSM's coverage.
   */
  const hireInExport = candidates.filter((c) => c.kind === "rental");
  const hireFar = hireInExport
    .filter((c) => !covered(c))
    .map((c) => Math.round(toBases(c)))
    .sort((a, b) => a - b);
  console.log(`        (ski hire in the export: ${hireInExport.length}` +
    (hireFar.length ? `, ${hireFar.length} too far from a base, nearest ${hireFar[0]} m` : "") + ")");

  // What was excluded, and how far away it was: the number that shows the
  // rule is doing work rather than the export simply being small.
  const farEats = candidates
    .filter((c) => ["restaurant", "cafe", "hut"].includes(c.kind) && !covered(c))
    .map((c) => Math.round(toPistes(c)))
    .sort((a, b) => a - b);
  if (farEats.length) {
    console.log(`        (${farEats.length} excluded, nearest ${farEats[0]} m from a piste)`);
  }

  if (merged.length) {
    console.log(`        (${merged.length} merged as one place: ${[...new Set(merged)].slice(0, 4).join("; ")})`);
  }

  /*
   * And the file must not carry one twice itself.
   *
   * The check above says nothing was lost. This says nothing was doubled,
   * which is the failure a skier actually sees: two pins on one building, and
   * a count of the places on a mountain that is wrong.
   */
  const doubledPlaces = [];
  for (let i = 0; i < filePoints.length; i++) {
    for (let j = i + 1; j < filePoints.length; j++) {
      if (oneAndTheSame(filePoints[i], filePoints[j])) {
        doubledPlaces.push(`${filePoints[i].name} / ${filePoints[j].name}`);
      }
    }
  }
  note(doubledPlaces.length === 0,
    "no place is on the mountain twice under two spellings" +
    (doubledPlaces.length ? `: ${doubledPlaces.slice(0, 4).join(", ")}` : ""));

  // 2. Nothing invented, nothing doubled.
  const known = new Set(candidates.flatMap((c) => c.aka));
  /*
   * Except the ones that are in the file because somebody looked.
   *
   * A place carrying `src` did not come off the map — see
   * scripts/sources/manual.mjs, and the hire shop in Brunico that OSM does
   * not have. Requiring it in the export would make the honest case fail; not
   * counting them at all would make this check hollow, so they are counted
   * and named instead.
   */
  const byHand = mod.PLACES.filter((p) => p[5]?.src);
  const invented = mod.PLACES
    .filter((p) => p[1] !== "parking" && !p[5]?.src && !known.has(p[0]))
    .map((p) => p[0]);
  note(invented.length === 0,
    `every place in the file is in the export, or says it is not` +
    (invented.length ? `: ${invented.slice(0, 5).join(", ")} are neither` : ""));
  if (byHand.length) {
    console.log(`        (${byHand.length} added by hand: ` +
      `${byHand.slice(0, 4).map((p) => `${p[0]} [${p[5].src}]`).join(", ")})`);
  }

  const seen = new Set();
  const doubled = mod.PLACES.filter((p) => seen.has(p[0]) || !seen.add(p[0]));
  note(doubled.length === 0, `no place appears twice` + (doubled.length ? `: ${doubled.map((p) => p[0]).join(", ")}` : ""));

  /*
   * Short names that collide, and the long ones the map falls back to.
   *
   * A collision is not a fault in the data — Monterosa really does have a Bar
   * Gabiet and a Rifugio Gabiet — and it is not a fault in the app either: the
   * renderer scans the whole place list, and any short name two places share
   * is dropped in favour of both full names. What would be a fault is the
   * fallback not distinguishing them, so that is what is asserted. Checking
   * `shortName` alone here would fail on data the app draws correctly, which
   * is a check that costs more than it finds.
   */
  const shortOf = new Map();
  for (const p of mod.PLACES) {
    const s = shortName(p[0]);
    shortOf.set(s, [...(shortOf.get(s) ?? []), p[0]]);
  }
  const collide = [...shortOf].filter(([, list]) => list.length > 1);
  for (const [short, list] of collide) {
    console.log(`        "${short}" is shared by ${list.length}, so each keeps its full name: ${list.join(", ")}`);
  }
  note(collide.every(([, list]) => new Set(list).size === list.length),
    `where short names collide the full names still tell them apart` +
    (collide.length ? ` (${collide.length} collision${collide.length === 1 ? "" : "s"})` : ""));

  // 3. A name a person can read, and a height on this mountain.
  const alts = nodes.map((n) => n.alt).filter(Number.isFinite);
  const lo = Math.min(...alts) - 300, hi = Math.max(...alts) + 300;
  const badName = mod.PLACES.filter((p) => !p[0] || !shortName(p[0]).trim());
  note(badName.length === 0, `every place has a name that survives shortening`);
  const badAlt = mod.PLACES.filter((p) => !Number.isFinite(p[4]) || p[4] < lo || p[4] > hi);
  note(badAlt.length === 0,
    `every place sits between ${Math.round(lo)} and ${Math.round(hi)} m` +
    (badAlt.length ? `: ${badAlt.slice(0, 4).map((p) => `${p[0]} at ${p[4]}`).join(", ")}` : ""));

  /*
   * 4. Is a restaurant a restaurant?
   *
   * Everything above asks whether the right places are present. This asks
   * whether they are what the file says they are, by going back to the tags
   * the classification was made from — because a wrong kind is worse than a
   * missing place. A skier sent to a bus shelter for lunch is a skier who
   * stops trusting the map, and the pin gives no clue: it looks exactly like
   * the pin for a rifugio.
   *
   * The tag has to say so. `amenity` in the eating set, or `tourism` one of
   * the hut kinds — nothing is admitted on the strength of its name.
   */
  const EATS = new Set(["restaurant", "cafe", "bar", "pub", "fast_food", "biergarten"]);
  /*
   * Under every name it answers to, for the same reason as `aka` above — but
   * primary names first, and an alias never displaces one.
   *
   * Filling this in one pass let an alias win: something in the Paganella
   * export carries `alt_name=Albi de Mez`, so the real Albi de Mez — an
   * `amenity=restaurant` a few hundred metres away — was looked up against
   * the wrong element's tags and reported as a restaurant OSM had never
   * called one. An alias is a fallback for a place whose primary name is a
   * logo, so it only answers for a name nothing is primarily called.
   */
  const tagsFor = new Map();
  for (const el of raw.elements ?? []) {
    if (typeof el.tags?.name === "string" && el.tags.name.trim()) tagsFor.set(el.tags.name, el.tags);
  }
  for (const el of raw.elements ?? []) {
    for (const n of aliases(el.tags ?? {})) if (!tagsFor.has(n)) tagsFor.set(n, el.tags);
  }
  const wrongKind = [];
  for (const p of mod.PLACES) {
    const [name, kind] = p;
    if (kind === "parking") continue;             // named after a base, not OSM
    const t = tagsFor.get(name);
    if (!t) continue;                             // covered by the export check
    const ok =
      kind === "rental"
        ? t.shop === "ski" || t.shop === "rental" || t.amenity === "ski_rental" || t.shop === "sports"
        : kind === "hut"
          ? t.tourism === "alpine_hut" || t.tourism === "wilderness_hut"
          : EATS.has(t.amenity) || t.tourism === "alpine_hut" || t.tourism === "wilderness_hut";
    if (!ok) {
      const said = ["amenity", "shop", "tourism"].map((k) => t[k] && `${k}=${t[k]}`).filter(Boolean);
      wrongKind.push(`${name} is "${kind}" but OSM says ${said.join(" ") || "nothing relevant"}`);
    }
  }
  note(wrongKind.length === 0,
    `every place is the kind OSM says it is` +
    (wrongKind.length ? `: ${wrongKind.slice(0, 4).join("; ")}` : ""));

  /*
   * And a place to eat that is really somewhere to sleep.
   *
   * Not a failure — a hotel with a restaurant is a real lunch stop and OSM
   * tags plenty of them amenity=restaurant, correctly. But it is worth
   * printing, because the difference between "Hotel Something serves lunch"
   * and "Hotel Something is on the map for no reason" is a judgement nobody
   * can make without seeing the list.
   */
  const LODGING = /\b(hotel|garni|pension|residence|apartments?|appartement|camping|b&b|bed ?and ?breakfast)\b/i;
  const beds = mod.PLACES
    .filter((p) => ["restaurant", "cafe", "hut"].includes(p[1]) && LODGING.test(p[0]))
    .map((p) => p[0]);
  if (beds.length) {
    console.log(`        ${beds.length} place(s) to eat are named like lodging: ${beds.slice(0, 5).join(", ")}`);
  }

  // 5. A link that opens somewhere, and a line that says what the place is.
  const badLink = mod.PLACES.filter((p) => {
    const q = encodeURIComponent(p[0]);
    const url = `https://www.google.com/maps/search/${q}/@${p[2]},${p[3]},16z`;
    return !q || !/^https:\/\/www\.google\.com\/maps\/search\/.+\/@-?\d+(\.\d+)?,-?\d+(\.\d+)?,16z$/.test(url);
  });
  note(badLink.length === 0, `every place makes a Google Maps link`);
  const badLine = mod.PLACES.filter((p) => !describe(p[0], p[1], p[4]));
  note(badLine.length === 0, `every place says what it is`);

  // Car parks: the query asks, the filter keeps, the export cannot answer yet.
  const parksInExport = (raw.elements ?? []).filter((el) => el.tags?.amenity === "parking").length;
  if (!cars.length) {
    console.log(`        car parks: none yet — ${parksInExport} in the export on disk, which was ` +
      `fetched before the query asked for them. The next resort-data run re-fetches.`);
  } else {
    note(cars.every((p) => /parking/i.test(describe(p[0], p[1], p[4]))), `every car park says it is parking`);
  }
}

console.log(problems
  ? `\n  ${problems} PROBLEM${problems === 1 ? "" : "S"} of ${checks} checks\n`
  : `\n  all ${checks} place checks passed\n`);
process.exit(problems ? 1 : 0);
