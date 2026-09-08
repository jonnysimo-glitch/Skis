/**
 * The merge, which is the only part of the source layer that can be tested
 * from a machine with no network. Run with: node scripts/sources/merge.test.mjs
 */
import { merge, MATCH_M } from "./index.mjs";
import { covers, toPlace, url } from "./opendatahub.mjs";
import * as manual from "./manual.mjs";

let ran = 0;
let bad = 0;
const check = (name, ok, detail = "") => {
  ran++;
  if (!ok) bad++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
};

const at = (lat, lon, extra = {}) =>
  ({ name: null, kind: "parking", lat, lon, spaces: null, fee: null, covered: null, source: "osm", ...extra });

console.log("\n### two sources, one car park");
{
  // Eighty metres apart: the centroid of a traced polygon and the ticket
  // machine at its entrance, which is the normal case rather than the edge.
  const osm = [at(46.7361, 11.9410, { name: "Kronplatz Talstation" })];
  const odh = [at(46.7368, 11.9410, { spaces: 640, fee: "yes", source: "opendatahub" })];
  const { places, report } = merge(osm, odh, { sourceId: "opendatahub" });
  check("they become one place", places.length === 1, `${places.length} places`);
  check("and it keeps OpenStreetMap's position",
    places[0].lat === 46.7361 && places[0].lon === 11.9410,
    `${places[0].lat}, ${places[0].lon}`);
  check("and takes the capacity nobody else had", places[0].spaces === 640, String(places[0].spaces));
  check("and remembers who supplied it", places[0].from?.spaces === "opendatahub",
    JSON.stringify(places[0].from));
  check("and the run can say what happened", report.enriched === 1 && report.added === 0,
    JSON.stringify(report));
}

console.log("\n### a fact the base already has");
{
  const osm = [at(46.7361, 11.9410, { name: "Talstation", spaces: 600 })];
  const odh = [at(46.7365, 11.9412, { spaces: 640, source: "opendatahub" })];
  const { places, report } = merge(osm, odh, { sourceId: "opendatahub" });
  check("is not overwritten", places[0].spaces === 600, String(places[0].spaces));
  check("and the source is recorded as adding nothing", report.ignored === 1, JSON.stringify(report));
}

console.log("\n### a car park only one source knows");
{
  const osm = [at(46.7361, 11.9410)];
  const odh = [at(46.7600, 11.9800, { name: "Olang Parkhaus", spaces: 300, source: "opendatahub" })];
  const { places, report } = merge(osm, odh, { sourceId: "opendatahub" });
  check("is added rather than merged", places.length === 2 && report.added === 1,
    `${places.length} places, ${JSON.stringify(report)}`);
  check("and says where it came from", places[1].source === "opendatahub", places[1].source);
}

console.log("\n### the match window");
{
  const osm = [at(46.7361, 11.9410)];
  // Just inside and just outside MATCH_M, along a line of longitude where a
  // degree of latitude is 111,320 m however far north you are.
  const inside = MATCH_M * 0.9 / 111320;
  const outside = MATCH_M * 1.1 / 111320;
  check(`${MATCH_M - 12} m apart is one car park`,
    merge(osm, [at(46.7361 + inside, 11.9410, { source: "x" })], { sourceId: "x" }).places.length === 1);
  check(`${MATCH_M + 12} m apart is two`,
    merge(osm, [at(46.7361 + outside, 11.9410, { source: "x" })], { sourceId: "x" }).places.length === 2);
}

console.log("\n### a restaurant is not a car park");
{
  const osm = [{ ...at(46.7361, 11.9410), kind: "restaurant", name: "Kron" }];
  const odh = [at(46.7361, 11.9410, { spaces: 640, source: "opendatahub" })];
  const { places } = merge(osm, odh, { sourceId: "opendatahub" });
  check("even at the same coordinates", places.length === 2, `${places.length} places`);
  check("and the restaurant is left alone", places[0].spaces === undefined || places[0].spaces === null,
    String(places[0].spaces));
}

console.log("\n### which resorts the province can answer for");
{
  // The real boxes out of scripts/resorts/, not approximations of them.
  check("Kronplatz is in South Tyrol", covers([11.8, 46.66, 12.08, 46.84]));
  check("Latemar is in South Tyrol", covers([11.4, 46.27, 11.65, 46.42]));
  check("Monterosa is not", !covers([7.64, 45.74, 8.0, 45.94]));
  // Paganella's box reaches two kilometres over the provincial boundary and
  // the resort is entirely in Trentino. Overlap said yes; the centre says no.
  check("and nor is Paganella, which only grazes the border",
    !covers([10.98, 46.1, 11.13, 46.24]));
}

console.log("\n### reading a record the API sends");
{
  const rec = {
    scode: "105",
    sname: "Parkhaus Bruneck Nord",
    scoordinate: { x: 11.9410, y: 46.7961, srid: 4326 },
    smetadata: { capacity: "412", free: false },
    sorigin: "SKIDATA",
  };
  const p = toPlace(rec);
  check("name, position and capacity come across",
    p.name === "Parkhaus Bruneck Nord" && p.lat === 46.7961 && p.lon === 11.9410 && p.spaces === 412,
    JSON.stringify(p));
  check("`free: false` means it costs", p.fee === "yes", String(p.fee));
  check("and a Parkhaus is covered", p.covered === true, String(p.covered));
  check("a station with no coordinate is dropped",
    toPlace({ sname: "Nowhere", smetadata: {} }) === null);
  check("and a capacity of zero is not a capacity",
    toPlace({ ...rec, smetadata: { capacity: "0" } }).spaces === null);
}

console.log("\n### the query");
{
  const u = url([11.83, 46.66, 12.08, 46.82]);
  check("asks for the resort's own box, in the order the API wants",
    u.includes("scoordinate.bbi.(11.83,46.66,12.08,46.82,4326)"), u);
  check("and for the fields the merge needs",
    u.includes("sname") && u.includes("smetadata") && u.includes("scoordinate"));
}

console.log("\n### places checked by hand");
{
  const good = {
    name: "Rent and Go Brunico",
    kind: "rental",
    lat: 46.79,
    lon: 11.94,
    note: "checked against the shop's own site",
  };
  check("a well-formed entry becomes a place", manual.toPlace(good).name === "Rent and Go Brunico");
  check("and says it did not come off the map", manual.toPlace(good).source === "manual");
  check("and is not marked as drawn, because nobody traced it",
    manual.toPlace(good).drawn === false);

  /*
   * Every one of these has to throw rather than skip.
   *
   * A hand-typed coordinate with no provenance is the single thing this
   * source must never let through: it is a person walking to the wrong end of
   * a village in ski boots, and it looks exactly like a real place in the
   * app. Skipping quietly would let a typo ship; stopping the build cannot.
   */
  const refuses = [
    ["no note at all", { ...good, note: undefined }],
    ["a note that says nothing", { ...good, note: "n/a" }],
    ["a kind that is not one of ours", { ...good, kind: "shop" }],
    ["a coordinate as a string", { ...good, lat: "46.79" }],
    ["a coordinate off the planet", { ...good, lat: 946 }],
    ["no name", { ...good, name: "  " }],
    ["nothing at all", null],
  ];
  for (const [why, entry] of refuses) {
    let threw = false;
    try { manual.toPlace(entry); } catch { threw = true; }
    check(`refuses ${why}`, threw);
  }

  check("says nothing to add when the config lists nothing",
    manual.covers([11, 46, 12, 47], { extraPlaces: [] }) === false);
  check("and nothing when there is no such key",
    manual.covers([11, 46, 12, 47], {}) === false);
  check("and answers once something is listed",
    manual.covers([11, 46, 12, 47], { extraPlaces: [good] }) === true);

  // It goes through the same merge as any other source, which means it cannot
  // land a second pin on a hire shop OSM already has.
  const osm = [{ name: "Ski Sport Heinz", kind: "rental", lat: 46.79, lon: 11.9401, source: "osm" }];
  const { report } = merge(osm, [manual.toPlace(good)], { sourceId: "manual" });
  check("does not double a shop the map already has", report.added === 0,
    JSON.stringify(report));
  const far = merge(osm, [manual.toPlace({ ...good, lon: 11.96 })], { sourceId: "manual" });
  check("and does add one it does not", far.report.added === 1, JSON.stringify(far.report));
  check("a car park by hand cannot be filed as a restaurant",
    merge([{ name: "X", kind: "restaurant", lat: 46.79, lon: 11.94, source: "osm" }],
      [manual.toPlace({ ...good, kind: "parking" })], { sourceId: "manual" }).report.added === 1);
}

console.log(bad ? `\n  ${bad} FAILING of ${ran} checks\n` : `\n  all ${ran} source checks passed\n`);
process.exit(bad ? 1 : 0);
