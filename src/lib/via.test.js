/**
 * The waypoint picker's data. Run with: node src/lib/via.test.js
 *
 * Everything here is about what a person sees in a list, which is why it is
 * worth checking: the solver's half is covered by solver.test.js, and the
 * mistakes that reach a user are duplicate entries, entries nobody would
 * choose, and an entry for the place they are standing in.
 */
import { viaChoices, viaGroups, viaKeys, viaChoice, viaResolve, viaLabel, AT_NODE } from "./via.js";

let failures = 0;
let checks = 0;
function is(name, condition, detail = "") {
  const status = condition ? "PASS" : "FAIL";
  checks++;
  if (!condition) failures++;
  console.log(`  ${status}  ${name}${detail ? "  — " + detail : ""}`);
}

/*
 * A toy resort with each of the shapes that caused trouble on a real one: a
 * lift whose two stations share its name, a junction OSM never named, a place
 * to eat right by a station, and one 900 m away up the hill.
 */
const NODES = {
  base:      { name: "Valley",        lat: 46.0000, lon: 11.0000, alt: 1000, area: "West", base: true },
  jolanda1:  { name: "Punta Jolanda", lat: 46.0100, lon: 11.0000, alt: 1600, area: "West" },
  jolanda2:  { name: "Punta Jolanda", lat: 46.0150, lon: 11.0000, alt: 2200, area: "West" },
  col:       { name: "Col",           lat: 46.0200, lon: 11.0100, alt: 2600, area: "East" },
  p17:       { name: "Above Col",     lat: 46.0210, lon: 11.0110, alt: 2650, area: "East", named: false },
  unnamed:   { name: "Point 4",       lat: 46.0220, lon: 11.0120, alt: 2660, named: false },
  noarea:    { name: "Lonely",        lat: 46.0300, lon: 11.0200, alt: 2000 },
};
const PLACES = [
  ["Rifugio Jolanda", "hut", 46.0150, 11.0001, 2200],
  ["Bar Jolanda", "cafe", 46.0151, 11.0002, 2205],
  ["Parcheggio Valley", "parking", 46.0000, 11.0001, 1000],
  ["Noleggio Valley", "rental", 46.0000, 11.0001, 1000],
  ["Rifugio Faraway", "hut", 46.0400, 11.0400, 2100],
];

console.log("\nONLY PLACES A PERSON WOULD CHOOSE");
const every = viaChoices(NODES, PLACES);
const all = every.filter((c) => c.kind === "junction");
const eats = every.filter((c) => c.kind === "eat");
is("a junction OSM never named is not offered",
  !all.some((c) => c.name === "Above Col" || c.name === "Point 4"),
  all.map((c) => c.name).join(", "));
is("one entry per name, not per node",
  all.filter((c) => c.name === "Punta Jolanda").length === 1);
is("and it carries both stations",
  viaChoice(all, "jolanda1")?.keys.join(",") === "jolanda1,jolanda2");
is("the id is the lowest key, so it survives a reload",
  all.every((c) => c.id === [...c.keys].sort()[0]));
is("the altitude shown is the lower station",
  viaChoice(all, "jolanda1")?.alt === 1600);

console.log("\nWHAT IS AT EACH");
is("a hut beside the station is listed under it",
  viaChoice(all, "jolanda1")?.at.length === 2,
  JSON.stringify(viaChoice(all, "jolanda1")?.at));
is("nearest first",
  viaChoice(all, "jolanda1")?.at[0] === "Rifugio Jolanda");
// Two places at one station whose short forms collide keep their full names,
// or the list reads "Jolanda, Jolanda".
is("a short name two of them share is not used",
  JSON.stringify(viaChoice(all, "jolanda1")?.at) === JSON.stringify(["Rifugio Jolanda", "Bar Jolanda"]),
  JSON.stringify(viaChoice(all, "jolanda1")?.at));
is("car parks and ski hire are not somewhere to swing by",
  all.every((c) => !c.at.some((n) => /Parcheggio|Noleggio|Valley$/.test(n))),
  JSON.stringify(all.map((c) => c.at)));
is(`nothing further than ${AT_NODE} m is claimed`,
  all.every((c) => !c.at.includes("Faraway")));
{
  // And where nothing collides, it does come off.
  const solo = viaChoices(
    { one: { name: "Station", lat: 46, lon: 11, alt: 1500 } },
    [["Rifugio Belvedere", "hut", 46, 11.0005, 1500]]
  ).filter((c) => c.kind === "junction");
  is("the category word comes off, the same as on the map",
    JSON.stringify(solo[0].at) === JSON.stringify(["Belvedere"]),
    JSON.stringify(solo[0].at));
}

console.log("\nWHERE YOU ARE IS NOT SOMEWHERE TO GO");
const fromJolanda = viaChoices(NODES, PLACES, { exclude: ["jolanda1"] }).filter((c) => c.kind === "junction");
is("the whole group goes, not just the matching station",
  !fromJolanda.some((c) => c.name === "Punta Jolanda"),
  fromJolanda.map((c) => c.name).join(", "));
is("and everything else stays", fromJolanda.length === all.length - 1);

console.log("\nGROUPED THE WAY A SKIER HOLDS THE MOUNTAIN");
const groups = viaGroups(every);
is("by area", groups.some((g) => g.area === "West") && groups.some((g) => g.area === "East"));
is("a node with no area gets the unnamed group",
  groups.some((g) => g.area === "" && g.items.some((c) => c.name === "Lonely")));
is("every choice lands in exactly one group",
  groups.reduce((n, g) => n + g.items.length, 0) === every.length);
is("a col with a side in two areas is filed once",
  groups.filter((g) => g.items.some((c) => c.name === "Col")).length === 1);

console.log("\nHANDED TO THE SOLVER AS GROUPS OF KEYS");
is("one id becomes its whole group",
  JSON.stringify(viaKeys(all, ["jolanda1"])) === JSON.stringify([["jolanda1", "jolanda2"]]));
is("an id nothing knows about is passed through rather than dropped",
  JSON.stringify(viaKeys(all, ["mystery"])) === JSON.stringify([["mystery"]]));
is("nothing asked for is nothing handed over",
  viaKeys(all, []).length === 0 && viaKeys(all, undefined).length === 0);

console.log("\nSOMEWHERE TO EAT IS A CHOICE OF ITS OWN");
// "Must stop at the Gabiet" is what a group of skiers says, and until this
// the only way to ask was to know which lift station it stands at.
is("every place to eat is offered by name",
  eats.map((c) => c.name).sort().join(",") === "Bar Jolanda,Rifugio Jolanda",
  eats.map((c) => c.name).join(", "));
is("and each resolves to the station it stands at",
  eats.every((c) => c.keys.join(",") === "jolanda1,jolanda2"),
  JSON.stringify(eats.map((c) => c.keys)));
is("they come before the junctions, so the list opens on names",
  every.findIndex((c) => c.kind === "eat") < every.findIndex((c) => c.kind === "junction"));
is("and in their own group", viaGroups(every)[0].area === "Somewhere to eat",
  viaGroups(every)[0].area);
is("a place whose name is its station's does not say so twice",
  viaChoices(
    { s: { name: "Absam", lat: 46, lon: 11, alt: 1500 } },
    [["Absam", "restaurant", 46, 11.0002, 1500]]
  ).find((c) => c.kind === "eat")?.at.length === 0);
// A stop that has become the start goes, whichever shape it was stored in.
is("excluding a station drops what is at it too",
  !viaChoices(NODES, PLACES, { exclude: ["jolanda1"] }).some((c) => c.kind === "eat"),
  viaChoices(NODES, PLACES, { exclude: ["jolanda1"] }).filter((c) => c.kind === "eat").map((c) => c.name).join(", "));

console.log("\nAN ID SURVIVES A RELOAD");
/*
 * A plan stores ids, and toSolverOpts translates them with no choice list in
 * scope — so an id has to carry its node inside it. Losing this is silent:
 * the solver drops a key it cannot find and plans a day without the stop.
 */
for (const c of every) {
  is(`${c.kind} ${c.id} resolves to its own keys`,
    JSON.stringify(viaResolve(c.id, NODES)) === JSON.stringify(c.keys),
    JSON.stringify(viaResolve(c.id, NODES)));
}
is("and to its own name", every.every((c) => viaLabel(c.id, NODES) === c.name),
  every.map((c) => viaLabel(c.id, NODES)).join(", "));
is("an id from another resort resolves to nothing that exists",
  JSON.stringify(viaResolve("eat:nowhere:Somewhere", NODES)) === JSON.stringify(["nowhere"]));
is("and a bare key nothing knows about comes back as itself",
  JSON.stringify(viaResolve("mystery", NODES)) === JSON.stringify(["mystery"]));
// A colon in a place name must not eat the name.
is("a place name with a colon in it comes back whole",
  viaLabel("eat:col:Bar 12:30", NODES) === "Bar 12:30",
  viaLabel("eat:col:Bar 12:30", NODES));

console.log("\nA RESORT WITH NOTHING TO OFFER");
is("no places is not a crash", viaChoices(NODES).every((c) => c.at.length === 0 && c.kind === "junction"));
is("no nodes is an empty list", viaChoices({}, PLACES).length === 0);

console.log("\n" + (failures ? `  ${failures} FAILING of ${checks}` : `  the waypoint picker holds, all ${checks} checks`));
process.exit(failures ? 1 : 0);
