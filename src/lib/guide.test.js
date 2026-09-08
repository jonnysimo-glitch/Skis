/**
 * The resort guide's data. Run with: node src/lib/guide.test.js
 *
 * Two halves. A toy resort with each shape that caused trouble — a piste
 * mapped in three pieces, the same piste tagged two different grades, a
 * stitched connector, a piste OSM never named — and then the same rules
 * against all four real graphs, because the toy cannot have the thing that
 * actually went wrong: a resort whose numbers contradict each other.
 */
import { pistes, byGrade, eats, services, highlights, guideFor, isDescribed } from "./guide.js";
import { RESORTS } from "../resorts/index.js";
import { graphFor } from "../resorts/graphs.js";

let failures = 0;
let checks = 0;
function is(name, condition, detail = "") {
  checks++;
  if (!condition) failures++;
  console.log(`  ${condition ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
}

const NODES = {
  top: { name: "Top", alt: 2400 },
  mid: { name: "Mid", alt: 2000 },
  roll: { name: "Roll", alt: 2100 },
  foot: { name: "Foot", alt: 1400 },
};

/*
 * Three pieces of one piste, one of them climbing over a roll; the same piste
 * tagged red once and black once; a connector the pipeline stitched in; and a
 * piste OSM left unnamed.
 */
const RUNS = [
  ["top", "mid", "Cresta", "red", 1.2, 6],
  ["mid", "roll", "Cresta", "red", 0.4, 2],
  ["roll", "foot", "Cresta", "black", 2.0, 9],
  ["top", "foot", "Gully", "black", 1.5, 7],
  ["mid", "foot", "Mid to Foot", "blue", 0.8, 4],
  ["mid", "roll", "Link to Roll", "blue", 0.3, 3, 1],
];

const PLACES = [
  ["Rifugio Alta", "hut", 46, 11, 2300],
  ["Bar Bassa", "cafe", 46, 11, 1500],
  ["Ristorante Media", "restaurant", 46, 11, 2000],
  ["Noleggio Sci", "rental", 46, 11, 1400],
  ["Parcheggio", "parking", 46, 11, 1400],
];

console.log("\nONE PISTE, HOWEVER MANY PIECES OSM MAPPED IT IN");
const list = pistes(RUNS, NODES);
is("the pieces of one piste are one entry", list.length === 3,
  list.map((p) => p.name).join(", "));
const cresta = list.find((p) => p.name === "Cresta");
is("its length is the sum of them", cresta.km === 3.6, String(cresta.km));
is("and it remembers how many there were", cresta.pieces === 3, String(cresta.pieces));
/*
 * The harder of the two tags, which is the direction the pipeline rounds when
 * OSM leaves difficulty off. The mistake that hurts a skier is being told a
 * run is easier than it is.
 */
is("a piste tagged twice takes the harder grade", cresta.grade === "black", cresta.grade);
/*
 * End to end: 2,400 at the top, 1,400 at the foot. Summing the pieces would
 * give 400 + 100 climbed + 700 = 1,100 for a piste that starts 1,000 m above
 * where it finishes, and a run that descends more than the mountain is tall
 * reads as a bug however defensible the arithmetic is.
 */
is("its drop is end to end, not the sum of the pieces", cresta.drop === 1000,
  String(cresta.drop));
is("a stitched connector is not a piste",
  !list.some((p) => /^Link/.test(p.name)), list.map((p) => p.name).join(", "));
is("a piste OSM never named is kept, and marked",
  list.find((p) => p.name === "Mid to Foot")?.described === true);
is("and a real name is not", cresta.described === false);
is("the test for that does not fire on an ordinary name",
  !isDescribed("Cinque Nazioni") && !isDescribed("Del Lago") && isDescribed("Ruis to Costa"));

console.log("\nGROUPED BY GRADE, LONGEST FIRST");
const groups = byGrade(list);
is("only the grades that exist get a heading", groups.length === 2,
  groups.map((g) => g.label).join(", "));
/*
 * Red is the missing one, and it is missing for the interesting reason: both
 * red rows here belong to Cresta, which took the harder of its two tags, so
 * the grade emptied itself out. Blue is present because the unnamed piste is
 * one.
 */
is("red is not one of them, because its only piste graded itself black",
  !groups.some((g) => g.grade === "red"), groups.map((g) => g.grade).join(", "));
const black = groups.find((g) => g.grade === "black");
is("the longest comes first", black.items[0].name === "Cresta",
  black.items.map((p) => `${p.name} ${p.km}`).join(", "));
is("and the group's kilometres are its own items' sum",
  black.km === Math.round(black.items.reduce((s, p) => s + p.km, 0) * 10) / 10,
  String(black.km));

console.log("\nSOMEWHERE TO STOP");
const table = eats(PLACES);
is("only the three kinds you can sit down in", table.length === 3,
  table.map((p) => p.kind).join(", "));
is("highest first, because that says whether it is on your way down",
  table[0].name === "Rifugio Alta" && table[2].name === "Bar Bassa",
  table.map((p) => `${p.name} ${p.alt}`).join(", "));
const svc = services(PLACES);
is("hire and parking are their own lists",
  svc.rental.length === 1 && svc.parking.length === 1);
is("and neither of them is somewhere to eat",
  !table.some((p) => p.kind === "rental" || p.kind === "parking"));

console.log("\nHIGHLIGHTS ARE FACTS, OR THEY ARE NOT THERE");
const facts = highlights({ list, lifts: [["foot", "top", "Big Cable", "cable car"]], nodes: NODES, places: PLACES });
is("the longest run is one of them",
  facts.some((f) => f.k === "Longest run" && f.v === "3.6 km"),
  facts.map((f) => `${f.k}=${f.v}`).join(", "));
/*
 * And it is not repeated as the biggest descent. Cresta is both here, and two
 * rows saying the same thing about the same run is the padding this section is
 * meant to avoid.
 */
is("and not said twice when one run is both",
  facts.filter((f) => f.note?.startsWith("Cresta")).length === 1,
  facts.filter((f) => f.note?.startsWith("Cresta")).map((f) => f.k).join(", "));
is("the highest lift is where it lands, not how long it is",
  facts.find((f) => f.k === "Highest lift")?.v === "2,400 m");
is("a resort with one area says nothing about areas",
  !facts.some((f) => f.k === "Areas"));
is("nothing is empty or undefined",
  facts.every((f) => f.k && f.v !== undefined && String(f.v).length > 0 && !/NaN|undefined/.test(`${f.v}${f.note}`)),
  JSON.stringify(facts));

console.log("\nNOTHING TO GO ON");
is("no runs is an empty guide, not a crash", pistes([], {}).length === 0);
is("no places is no lists", eats([]).length === 0 && services([]).rental.length === 0);
is("and no highlights rather than empty ones", highlights({}).length === 0);
is("a run whose nodes are missing still has a length",
  pistes([["nowhere", "elsewhere", "Ghost", "red", 1.1, 5]], {})[0].km === 1.1);

console.log("\nTHE REAL FOUR");
/*
 * The rules that matter are the ones about a reader being able to add the
 * numbers up. Every fault this section found was of that kind: a connector
 * listed as Paganella's longest black at nine metres of drop, and a run at
 * Kronplatz descending two metres further than the whole mountain is tall.
 */
for (const resort of RESORTS.filter((r) => r.available)) {
  const g = guideFor(graphFor(resort.id), resort);
  const alts = Object.values(graphFor(resort.id).NODES).map((n) => n.alt).filter(Number.isFinite);
  const vertical = Math.max(...alts) - Math.min(...alts);

  is(`${resort.id}: there are pistes to list`, g.pistes.length > 10,
    `${g.pistes.length} pistes, ${g.km} km`);
  is(`${resort.id}: the groups account for every piste`,
    g.grades.reduce((n, grp) => n + grp.count, 0) === g.pistes.length,
    `${g.grades.reduce((n, grp) => n + grp.count, 0)} of ${g.pistes.length}`);
  is(`${resort.id}: and the kilometres add up to the total shown`,
    Math.abs(g.grades.reduce((s, grp) => s + grp.km, 0) - g.km) < 0.15,
    `${g.grades.reduce((s, grp) => s + grp.km, 0).toFixed(1)} against ${g.km}`);
  // No run descends further than the mountain is tall.
  const tall = g.pistes.filter((p) => p.drop > vertical);
  is(`${resort.id}: no run drops further than the mountain`, tall.length === 0,
    tall.map((p) => `${p.name} ${p.drop} > ${vertical}`).join(", "));
  is(`${resort.id}: every piste has a length`,
    g.pistes.every((p) => p.km > 0), g.pistes.filter((p) => !(p.km > 0)).map((p) => p.name).join(", "));
  is(`${resort.id}: every piste has one of the three grades`,
    g.pistes.every((p) => ["blue", "red", "black"].includes(p.grade)),
    [...new Set(g.pistes.map((p) => p.grade))].join(", "));
  // A connector timed at walking pace must not be sitting in the slope list.
  const walking = g.pistes.filter((p) => /^Link to |\bconnector\b/i.test(p.name));
  is(`${resort.id}: no stitched connector in the slopes`, walking.length === 0,
    walking.map((p) => p.name).join(", "));
  is(`${resort.id}: most of the pistes are named by the mountain`,
    g.pistes.filter((p) => !p.described).length > g.pistes.length * 0.7,
    `${g.pistes.filter((p) => p.described).length} described by their ends of ${g.pistes.length}`);
  is(`${resort.id}: there is somewhere to eat`, g.eats.length > 0, `${g.eats.length}`);
  /*
   * And somewhere to hire skis, which used to be true of one resort in four.
   *
   * OSM tags hire shops where a mapper happened to be standing: all six of
   * Kronplatz's were at St Vigil, so Reischach, Olang and Percha had none, and
   * Paganella and Latemar had none at all — the section simply did not render
   * for two of the four. They are in the resort configs' extraPlaces now, so
   * this holds the floor rather than describing it: a rebuild that loses them
   * fails here.
   */
  is(`${resort.id}: and somewhere to hire skis`, g.services.rental.length > 0,
    `${g.services.rental.length}`);
  is(`${resort.id}: the highlights are all real`,
    g.highlights.length >= 3 && g.highlights.every((f) => !/NaN|undefined|Infinity/.test(`${f.v} ${f.note}`)),
    g.highlights.map((f) => `${f.k}=${f.v}`).join(", "));
  is(`${resort.id}: and none of them is said twice`,
    new Set(g.highlights.map((f) => f.k)).size === g.highlights.length);
  is(`${resort.id}: the data says where it came from`, g.sources.length > 0,
    g.sources.join(", "));
}

console.log("\n" + (failures ? `  ${failures} FAILING of ${checks}` : `  the resort guide holds, all ${checks} checks`));
process.exit(failures ? 1 : 0);
