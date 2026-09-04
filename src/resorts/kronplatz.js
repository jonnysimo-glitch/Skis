/**
 * Kronplatz — resort graph.
 *
 * GENERATED. Do not edit by hand: run `npm run resort -- kronplatz` instead.
 *
 * Source:    OpenStreetMap via the Overpass API, 2026-09-04T19:12:14.075Z
 * Elevation: AWS Terrain Tiles (terrarium), zoom 13
 * Licence:   OSM data is ODbL. Attribution is required wherever this is shown.
 *
 * What had to be assumed:
 *   - 44 runs were unnamed and are described by their endpoints
 *   - 9 nodes, 2 lifts and 12 runs were outside the largest strongly connected component and were dropped
 *   - endpoints within 120 m of each other were treated as the same place
 *
 * NOT from OpenStreetMap, because it is not in there: last-lift times and
 * queue estimates. Those come from the resort and are the numbers behind the
 * app's promise that nothing will strand you, so they are listed separately in
 * scripts/resorts/kronplatz.json rather than buried in the graph.
 *
 * Node coordinates are [lat, lon]. They exist so the 3D layer can place the
 * graph on real terrain; the solver itself never reads them.
 */

export const NODES = {
  olangivaldaorai:        { name: "Olang I - Valdaora I",              lat: 46.74533, lon: 12.00933, alt: 1193, area: "St. Vigil" },
  arndt:                  { name: "Arndt",                             lat: 46.74405, lon: 11.99062, alt: 1673, area: "St. Vigil", rifugio: true },
  sonne:                  { name: "Sonne",                             lat: 46.73192, lon: 11.96090, alt: 2069, area: "St. Vigil", rifugio: true },
  kronplatzplandecorones: { name: "Kronplatz - Plan de Corones",       lat: 46.73840, lon: 11.95852, alt: 2267, area: "St. Vigil", rifugio: true },
  olangivaldaorai2:       { name: "Olang I - Valdaora I",              lat: 46.74669, lon: 12.01065, alt: 1165, area: "St. Vigil", base: true },
  olangiii:               { name: "Olang I / II",                      lat: 46.74298, lon: 11.97321, alt: 2057, area: "St. Vigil" },
  kronplatz2000:          { name: "Kronplatz 2000",                    lat: 46.77179, lon: 11.94122, alt: 954, area: "Bruneck", base: true, rifugio: true },
  kronplatziii:           { name: "Kronplatz I / II",                  lat: 46.74881, lon: 11.95243, alt: 1860, area: "Bruneck" },
  korer:                  { name: "Korer",                             lat: 46.77270, lon: 11.93989, alt: 942, area: "Percha", base: true },
  p10:                    { name: "Above Kronplatz 2000",              lat: 46.76423, lon: 11.94318, alt: 1099, area: "Bruneck", named: false },
  costa:                  { name: "Costa",                             lat: 46.72333, lon: 11.96407, alt: 1750, area: "St. Vigil", rifugio: true },
  riedgipfelbahn:         { name: "Ried / Gipfelbahn",                 lat: 46.75417, lon: 11.95854, alt: 1730, area: "Bruneck", rifugio: true },
  predaperes:             { name: "Pré da Peres",                      lat: 46.71615, lon: 11.97043, alt: 2008, area: "St. Vigil" },
  p14:                    { name: "Miara",                             lat: 46.70445, lon: 11.93047, alt: 1224, area: "St. Vigil", base: true, named: false },
  miara:                  { name: "Miara",                             lat: 46.71121, lon: 11.95120, alt: 1478, area: "St. Vigil" },
  coltoron:               { name: "Col Toron",                         lat: 46.71918, lon: 11.96455, alt: 1812, area: "St. Vigil" },
  costa2:                 { name: "Costa",                             lat: 46.72776, lon: 11.96781, alt: 1854, area: "St. Vigil", rifugio: true },
  marchner:               { name: "Marchner",                          lat: 46.73366, lon: 11.99452, alt: 1559, area: "St. Vigil", rifugio: true },
  marchner2:              { name: "Marchner",                          lat: 46.73665, lon: 11.97337, alt: 1999, area: "St. Vigil" },
  rara:                   { name: "Rara",                              lat: 46.72160, lon: 11.95973, alt: 1698, area: "St. Vigil" },
  alpenconnect:           { name: "Alpen Connect",                     lat: 46.75212, lon: 11.99296, alt: 1619, area: "Bruneck", rifugio: true },
  alpenconnect2:          { name: "Alpen Connect",                     lat: 46.74313, lon: 11.96757, alt: 2140, area: "St. Vigil" },
  p28:                    { name: "Above Arndt",                       lat: 46.75028, lon: 11.98291, alt: 1803, area: "Bruneck", rifugio: true, named: false },
  arndt2:                 { name: "Arndt",                             lat: 46.74517, lon: 11.98831, alt: 1721, area: "St. Vigil" },
  p30:                    { name: "Above Alpen Connect",               lat: 46.75150, lon: 11.98428, alt: 1777, area: "Bruneck", rifugio: true, named: false },
  p31:                    { name: "Above Kronplatz 2000",              lat: 46.76837, lon: 11.94226, alt: 1008, area: "Bruneck", named: false },
  ruis:                   { name: "Ruis",                              lat: 46.72548, lon: 11.96662, alt: 1803, area: "St. Vigil" },
  p33:                    { name: "Above Kronplatz I / II",            lat: 46.74444, lon: 11.95509, alt: 2082, area: "Bruneck", named: false },
  p34:                    { name: "Above Kronplatz I / II",            lat: 46.74410, lon: 11.95301, alt: 2052, area: "Bruneck", named: false },
  p35:                    { name: "Below Kronplatz - Plan de Corones", lat: 46.74220, lon: 11.95441, alt: 2152, area: "St. Vigil", named: false },
  kronplatziii2:          { name: "Kronplatz I / II",                  lat: 46.74633, lon: 11.94993, alt: 1956, area: "Bruneck" },
  p37:                    { name: "Above Arndt",                       lat: 46.75140, lon: 11.98125, alt: 1838, area: "Bruneck", rifugio: true, named: false },
  sonne2:                 { name: "Sonne",                             lat: 46.73239, lon: 11.96610, alt: 2051, area: "St. Vigil" },
  p39:                    { name: "Alpen junction",                    lat: 46.74676, lon: 11.97456, alt: 2017, area: "St. Vigil", named: false },
  kronplatziii3:          { name: "Kronplatz I / II",                  lat: 46.74756, lon: 11.95154, alt: 1914, area: "Bruneck" },
  olangii:                { name: "Olang II",                          lat: 46.74017, lon: 11.96154, alt: 2244, area: "St. Vigil" },
  sonne3:                 { name: "Sonne",                             lat: 46.73033, lon: 11.95919, alt: 2040, area: "St. Vigil", rifugio: true },
  sonne4:                 { name: "Sonne",                             lat: 46.73352, lon: 11.96129, alt: 2112, area: "St. Vigil" },
  p44:                    { name: "Below Sonne",                       lat: 46.73212, lon: 11.96966, alt: 1993, area: "St. Vigil", named: false },
  p45:                    { name: "Below Kronplatz I / II",            lat: 46.74984, lon: 11.95732, alt: 1901, area: "Bruneck", named: false },
  kronplatz20003:         { name: "Kronplatz 2000",                    lat: 46.76969, lon: 11.94207, alt: 984, area: "Bruneck" },
  kronplatziii4:          { name: "Kronplatz I / II",                  lat: 46.74804, lon: 11.95701, alt: 1972, area: "Bruneck" },
  p48:                    { name: "Above Marchner",                    lat: 46.73479, lon: 11.98960, alt: 1682, area: "St. Vigil", named: false },
  p49:                    { name: "Below Olang I / II",                lat: 46.75037, lon: 11.97653, alt: 1938, area: "Bruneck", named: false },
  alpenconnect3:          { name: "Alpen Connect",                     lat: 46.74206, lon: 11.96659, alt: 2164, area: "St. Vigil" },
  miara2:                 { name: "Miara",                             lat: 46.71341, lon: 11.95307, alt: 1545, area: "St. Vigil" },
  costa3:                 { name: "Costa",                             lat: 46.72532, lon: 11.96844, alt: 1821, area: "St. Vigil" },
  predaperes2:            { name: "Pré da Peres",                      lat: 46.72413, lon: 11.96628, alt: 1784, area: "St. Vigil" },
  belvedere:              { name: "Belvedere",                         lat: 46.73664, lon: 11.96874, alt: 2074, area: "St. Vigil" },
  marchner3:              { name: "Marchner",                          lat: 46.73361, lon: 11.99071, alt: 1649, area: "St. Vigil" },
  sonne5:                 { name: "Sonne",                             lat: 46.73207, lon: 11.95838, alt: 2088, area: "St. Vigil", rifugio: true },
  p62:                    { name: "Seewiese junction",                 lat: 46.74465, lon: 11.94845, alt: 2021, area: "Bruneck", named: false },
  p63:                    { name: "Below Olang I / II",                lat: 46.74447, lon: 11.97855, alt: 1956, area: "St. Vigil", named: false },
  arndt3:                 { name: "Arndt",                             lat: 46.74504, lon: 11.99257, alt: 1624, area: "St. Vigil" },
};

/** [from, to, name, type, rideMinutes, lastUpMinuteOfDay, typicalQueueMinutes] */
export const LIFTS = [
  ["olangivaldaorai", "arndt", "Lorenzi", "gondola", 6, 1000, 5],
  ["sonne", "kronplatzplandecorones", "Sonne", "chair", 4, 1000, 2],
  ["olangivaldaorai2", "olangiii", "Olang I", "gondola", 10, 1000, 1],
  ["olangiii", "kronplatzplandecorones", "Olang II", "gondola", 4, 1000, 1],
  ["arndt", "olangiii", "Arndt", "chair", 7, 1000, 2],
  ["kronplatz2000", "kronplatziii", "Kronplatz I - Plan de Corones I", "gondola", 10, 1000, 2],
  ["korer", "p10", "Korer", "gondola", 5, 1000, 2],
  ["kronplatz2000", "kronplatzplandecorones", "Kronplatz 2000", "gondola", 13, 1000, 2],
  ["olangiii", "kronplatzplandecorones", "Plateau", "chair", 5, 1000, 1],
  ["costa", "kronplatzplandecorones", "Ruis", "gondola", 7, 1000, 2],
  ["riedgipfelbahn", "kronplatzplandecorones", "Gipfelbahn", "gondola", 6, 1000, 1],
  ["costa", "predaperes", "Pré da Peres", "gondola", 4, 1000, 2],
  ["p14", "miara", "Miara", "gondola", 6, 1000, 2],
  ["miara", "coltoron", "Col Toron", "gondola", 6, 1000, 2],
  ["costa", "costa2", "Costa", "chair", 4, 1000, 2],
  ["marchner", "marchner2", "Marchner", "gondola", 6, 1000, 2],
  ["marchner2", "kronplatzplandecorones", "Belvedere", "gondola", 5, 1000, 1],
  ["rara", "coltoron", "Rara", "gondola", 3, 1000, 2],
  ["kronplatziii", "kronplatzplandecorones", "Kronplatz II", "gondola", 5, 1000, 2],
  ["alpenconnect", "alpenconnect2", "Alpen Connecting", "gondola", 8, 1000, 2],
];

/** [from, to, name, difficulty, km, minutes] */
export const RUNS = [
  ["olangiii", "p63", "Ruipa", "blue", 0.3, 2],
  ["p28", "p30", "Pracken", "blue", 0.1, 2],
  ["p30", "alpenconnect", "Pracken", "blue", 0.7, 2],
  ["olangiii", "p63", "Gassl", "red", 0.4, 2],
  ["p63", "arndt2", "Gassl", "red", 0.7, 2],
  ["olangiii", "p39", "Alpen", "blue", 0.1, 2],
  ["p39", "p37", "Alpen", "blue", 0.7, 2],
  ["p37", "p30", "Alpen", "blue", 0.3, 2],
  ["marchner2", "p48", "Marchner", "blue", 1.1, 3],
  ["p48", "marchner3", "Marchner", "blue", 0.2, 2],
  ["marchner3", "marchner", "Marchner", "blue", 0.4, 2],
  ["predaperes", "coltoron", "Pré da Peres 32 V", "red", 0.5, 2],
  ["predaperes", "coltoron", "Pre da Peres 32", "red", 0.5, 2],
  ["coltoron", "costa", "Pre da Peres 32", "red", 0.4, 2],
  ["kronplatzplandecorones", "marchner2", "Belvedere", "blue", 0.9, 3],
  ["kronplatziii", "riedgipfelbahn", "Seewiese 2", "red", 0.8, 3],
  ["kronplatzplandecorones", "kronplatziii4", "Herrnegg", "black", 1, 4],
  ["kronplatziii4", "p45", "Herrnegg", "black", 0.2, 2],
  ["p45", "riedgipfelbahn", "Herrnegg", "black", 0.5, 2],
  ["riedgipfelbahn", "p31", "Herrnegg", "black", 2.6, 9],
  ["costa2", "ruis", "Costa", "blue", 0.2, 2],
  ["coltoron", "rara", "Rara", "red", 0.4, 2],
  ["p33", "p34", "Seewiese", "red", 0.1, 2],
  ["p35", "p62", "Seewiese", "red", 0.6, 2],
  ["p62", "kronplatziii2", "Seewiese", "red", 0.2, 2],
  ["p37", "p28", "Arndt", "red", 0.2, 2],
  ["costa2", "costa", "Furcia 9", "blue", 0.3, 2],
  ["kronplatzplandecorones", "p44", "Furcia 9", "blue", 1, 3],
  ["p44", "costa2", "Furcia 9", "blue", 0.5, 2],
  ["kronplatzplandecorones", "sonne2", "Furcia 9A - Picio Jarú", "blue", 0.8, 2],
  ["alpenconnect2", "olangiii", "Plateau", "blue", 0.4, 2],
  ["kronplatzplandecorones", "olangii", "Olang 2", "blue", 0.2, 2],
  ["olangii", "alpenconnect3", "Olang 2", "blue", 0.4, 2],
  ["alpenconnect3", "alpenconnect2", "Olang 2", "blue", 0.1, 2],
  ["alpenconnect2", "olangiii", "Olang 2", "blue", 0.3, 2],
  ["alpenconnect2", "p49", "Spitzhorn", "blue", 1.1, 3],
  ["p49", "p37", "Spitzhorn", "blue", 0.4, 2],
  ["kronplatzplandecorones", "sonne4", "Sonne", "blue", 0.5, 2],
  ["sonne4", "sonne", "Sonne", "blue", 0.2, 2],
  ["coltoron", "costa", "Rara 31", "blue", 0.2, 2],
  ["costa", "rara", "Rara 31", "blue", 0.3, 2],
  ["p10", "p31", "Korer", "blue", 0.4, 2],
  ["p31", "kronplatz2000", "Korer", "blue", 0.3, 2],
  ["kronplatz2000", "korer", "Korer", "blue", 0.1, 2],
  ["olangiii", "p39", "Olang I / II to Alpen", "blue", 0.4, 2],
  ["p28", "arndt2", "Ruipa", "blue", 0.7, 2],
  ["arndt2", "arndt3", "Gassl", "red", 0.4, 2],
  ["arndt3", "olangivaldaorai", "Gassl", "red", 1.3, 4],
  ["olangivaldaorai", "olangivaldaorai2", "Gassl", "red", 0.2, 2],
  ["kronplatzplandecorones", "olangiii", "Plateau", "blue", 0.9, 3],
  ["p33", "kronplatziii3", "Trasse", "black", 0.5, 2],
  ["kronplatzplandecorones", "olangii", "Kronplatz - Plan de Corones to Olang II", "blue", 0.2, 2],
  ["costa2", "costa", "Costa - Ruis", "blue", 0.3, 2],
  ["kronplatziii2", "kronplatziii3", "Seewiese", "red", 0.2, 2],
  ["kronplatziii3", "kronplatziii", "Seewiese", "red", 0.1, 2],
  ["sonne", "sonne3", "Sonne link", "red", 0.2, 2],
  ["costa2", "costa3", "Costa", "blue", 0.2, 2],
  ["costa3", "ruis", "Costa", "blue", 0.1, 2],
  ["p10", "p31", "Korer", "blue", 0.5, 2],
  ["p31", "kronplatz20003", "Korer", "blue", 0.2, 2],
  ["kronplatz20003", "kronplatz2000", "Korer", "blue", 0.2, 2],
  ["kronplatzplandecorones", "sonne5", "Furcia 12", "red", 0.6, 2],
  ["sonne5", "sonne3", "Furcia 12", "red", 0.2, 2],
  ["sonne4", "sonne2", "Furcia 9A", "blue", 0.4, 2],
  ["sonne2", "p44", "Furcia 9A", "blue", 0.3, 2],
  ["kronplatzplandecorones", "p33", "Pramstall", "red", 0.6, 2],
  ["p33", "kronplatziii4", "Pramstall", "red", 0.4, 2],
  ["kronplatziii4", "p45", "Pramstall", "red", 0.3, 2],
  ["arndt", "arndt3", "Gassl", "red", 0.2, 2],
  ["arndt3", "olangivaldaorai", "Gassl", "red", 1.3, 4],
  ["kronplatzplandecorones", "p35", "Sylvester", "black", 0.4, 2],
  ["p35", "p34", "Sylvester", "black", 0.2, 2],
  ["p34", "kronplatziii2", "Sylvester", "black", 0.4, 2],
  ["kronplatziii2", "p10", "Sylvester", "black", 3.1, 12],
  ["kronplatz20003", "kronplatz2000", "Kronplatz 2000 link", "blue", 0.2, 2],
  ["p48", "marchner", "Marchner 2", "red", 0.4, 2],
  ["alpenconnect3", "alpenconnect2", "Spitzhorn", "blue", 0.2, 2],
  ["miara2", "miara", "Miara link", "black", 0.2, 2],
  ["p31", "kronplatz20003", "Korer", "blue", 0.1, 2],
  ["costa3", "predaperes2", "Costa", "blue", 0.2, 2],
  ["ruis", "costa", "Costa", "blue", 0.2, 2],
  ["ruis", "predaperes2", "Costa", "blue", 0.2, 2],
  ["predaperes2", "costa", "Costa", "blue", 0.1, 2],
  ["belvedere", "marchner2", "Hinterberg", "blue", 0.5, 2],
  ["marchner2", "marchner3", "Hinterberg", "blue", 1.3, 4],
  ["sonne3", "costa", "Furcia 12", "red", 1.1, 4],
  ["belvedere", "marchner2", "Belvedere", "blue", 0.2, 2],
  ["olangiii", "arndt", "Lorenzi", "blue", 1.3, 4],
  ["miara", "p14", "Miara", "blue", 1.8, 6],
  ["kronplatzplandecorones", "sonne", "Furcia 12 A", "red", 0.7, 2],
  ["costa2", "costa", "Furcia 9 B", "blue", 0.4, 2],
  ["predaperes", "costa", "Pre da Peres 32R", "black", 0.8, 3],
  ["coltoron", "miara2", "Col Toron", "red", 1, 3],
  ["miara2", "miara", "Col Toron", "red", 0.3, 2],
  ["kronplatzplandecorones", "sonne", "Sonne", "red", 0.6, 2],
  ["kronplatzplandecorones", "belvedere", "Belvedere", "blue", 0.7, 2],
  ["sonne5", "sonne", "Sonne link", "blue", 0.1, 2],
  ["olangiii", "p63", "Arndt", "red", 0.4, 2],
  ["p63", "arndt2", "Arndt", "red", 0.8, 3],
  ["arndt2", "arndt", "Arndt", "red", 0.2, 2],
  ["coltoron", "rara", "Rara", "blue", 0.4, 2],
  ["p34", "p62", "Seewiese", "red", 0.4, 2],
  ["kronplatzplandecorones", "p35", "Lumen", "red", 0.5, 2],
  ["p63", "p28", "Ruipa", "blue", 0.7, 4],
];

export const DIFFICULTY_RANK = { blue: 1, red: 2, black: 3 };

export const SHORT_NAMES = {};

/**
 * How the app lists and frames this resort. Derived from the graph above and
 * scripts/resorts/kronplatz.json at build time, so adding a resort does not mean
 * hand-typing a camera position.
 */
export const META = {
  "id": "kronplatz",
  "name": "Kronplatz",
  "region": "South Tyrol",
  "country": "Italy",
  "available": true,
  "center": [
    11.97056,
    46.73858
  ],
  "zoom": 12.7,
  "pitch": 62,
  "bearing": 160,
  "bbox": [
    11.8,
    46.66,
    12.08,
    46.84
  ],
  "bases": [
    "olangivaldaorai2",
    "kronplatz2000",
    "korer",
    "p14"
  ],
  "defaultBase": "olangivaldaorai2",
  "firstLift": 510,
  "lastDown": 1020,
  "stats": {
    "lifts": 20,
    "runs": 104,
    "km": 53,
    "top": 2267,
    "bottom": 942,
    "valleys": 3
  },
  "blurb": "Plan de Corones. One mountain, lifts up from three valleys.",
  "published": {
    "lifts": 32,
    "top": 2275,
    "bottom": 950
  }
};

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
      id: `L${i}`, kind: "lift", from, to, name, liftType, ride, lastUp, queue,
      min: ride + queue,
      gain: NODES[to].alt - NODES[from].alt,
    });
    // The same ride, the other way. Still a lift, so the last-up time still
    // applies — a gondola you cannot board at 16:20 cannot take you down at
    // 16:20 either — and the route reads as a lift ride, which it is.
    if (DOWNLOADABLE.has(liftType)) {
      edges.push({
        id: `L${i}d`, kind: "lift", from: to, to: from, name, liftType, ride, lastUp, queue,
        min: ride + queue,
        gain: NODES[from].alt - NODES[to].alt,
        down: true,
      });
    }
  });
  RUNS.forEach(([from, to, name, difficulty, km, min], i) => {
    edges.push({
      id: `R${i}`, kind: "run", from, to, name, difficulty, km, min,
      drop: NODES[from].alt - NODES[to].alt,
    });
  });
  return edges;
}
