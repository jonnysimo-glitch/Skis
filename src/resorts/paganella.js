/**
 * Paganella Ski — resort graph.
 *
 * GENERATED. Do not edit by hand: run `npm run resort -- paganella` instead.
 *
 * Source:    OpenStreetMap via the Overpass API, 2026-09-04T19:13:18.467Z
 * Elevation: AWS Terrain Tiles (terrarium), zoom 13
 * Licence:   OSM data is ODbL. Attribution is required wherever this is shown.
 *
 * What had to be assumed:
 *   - 4 pistes had no piste:difficulty and were taken as red
 *   - 34 runs were unnamed and are described by their endpoints
 *   - 3 nodes, 1 lift and 2 runs were outside the largest strongly connected component and were dropped
 *   - endpoints within 75 m of each other were treated as the same place
 *
 * NOT from OpenStreetMap, because it is not in there: last-lift times and
 * queue estimates. Those come from the resort and are the numbers behind the
 * app's promise that nothing will strand you, so they are listed separately in
 * scripts/resorts/paganella.json rather than buried in the graph.
 *
 * Node coordinates are [lat, lon]. They exist so the 3D layer can place the
 * graph on real terrain; the solver itself never reads them.
 */

export const NODES = {
  rindoledosdeleva:  { name: "Rindole - Dos de Leva",       lat: 46.16135, lon: 11.00850, alt: 1064, area: "Andalo" },
  rindoledosdeleva2: { name: "Rindole - Dos de Leva",       lat: 46.16017, lon: 11.00995, alt: 1100, area: "Andalo" },
  andalo:            { name: "Andalo",                      lat: 46.16340, lon: 11.00582, alt: 1035, area: "Andalo", base: true },
  p4:                { name: "Above Albi de Mez",           lat: 46.14550, lon: 11.02157, alt: 1778, area: "Andalo", named: false },
  laselletta:        { name: "La Selletta",                 lat: 46.14955, lon: 11.03735, alt: 1972, area: "Fai" },
  paganella:         { name: "Paganella",                   lat: 46.14304, lon: 11.03752, alt: 2113, area: "Fai", rifugio: true },
  albidemez:         { name: "Albi de Mez",                 lat: 46.14802, lon: 11.02364, alt: 1742, area: "Andalo" },
  meriz:             { name: "Meriz",                       lat: 46.16476, lon: 11.05021, alt: 1414, area: "Fai", rifugio: true },
  meriz2:            { name: "Meriz",                       lat: 46.16362, lon: 11.05012, alt: 1432, area: "Fai", rifugio: true },
  meriz3:            { name: "Meriz",                       lat: 46.15876, lon: 11.05042, alt: 1528, area: "Fai" },
  santel:            { name: "Santel",                      lat: 46.17529, lon: 11.05277, alt: 1048, area: "Fai", base: true, rifugio: true },
  pratidigaggia:     { name: "Prati di Gaggia",             lat: 46.14957, lon: 10.99637, alt: 1332, area: "Andalo", rifugio: true },
  teresat:           { name: "Teresat",                     lat: 46.14719, lon: 10.99703, alt: 1396, area: "Andalo", rifugio: true },
  salareconca:       { name: "Salare Conca",                lat: 46.14515, lon: 11.01568, alt: 1677, area: "Andalo" },
  salareconca2:      { name: "Salare Conca",                lat: 46.13912, lon: 11.02178, alt: 1851, area: "Andalo" },
  paganella2:        { name: "Paganella 2",                 lat: 46.14070, lon: 11.01521, alt: 1758, area: "Andalo", rifugio: true },
  laghet:            { name: "Laghet",                      lat: 46.15987, lon: 11.00230, alt: 1041, area: "Andalo", rifugio: true },
  laghetdoss:        { name: "Laghet - Doss",               lat: 46.16139, lon: 11.00250, alt: 1028, area: "Andalo" },
  laghetdoss2:       { name: "Laghet - Doss",               lat: 46.16056, lon: 11.00450, alt: 1058, area: "Andalo" },
  santantonio:       { name: "Sant'Antonio",                lat: 46.14219, lon: 11.00994, alt: 1696, area: "Andalo" },
  santantonio2:      { name: "Sant'Antonio",                lat: 46.13714, lon: 11.02325, alt: 1911, area: "Andalo" },
  piandosson:        { name: "Pian Dosson",                 lat: 46.15404, lon: 11.01639, alt: 1439, area: "Andalo", rifugio: true },
  intermediadosson:  { name: "Intermedia Dosson",           lat: 46.15257, lon: 11.01677, alt: 1464, area: "Andalo" },
  p25:               { name: "Olimpionica 3 junction",      lat: 46.14606, lon: 11.02541, alt: 1804, area: "Andalo", rifugio: true, named: false },
  rindoledosdeleva3: { name: "Rindole - Dos de Leva",       lat: 46.16065, lon: 11.00765, alt: 1070, area: "Andalo" },
  albidemez2:        { name: "Albi de Mez",                 lat: 46.14680, lon: 11.02335, alt: 1756, area: "Andalo", rifugio: true },
  piandosson2:       { name: "Pian Dosson",                 lat: 46.15524, lon: 11.01636, alt: 1417, area: "Andalo" },
  p29:               { name: "Above Laghet",                lat: 46.15672, lon: 11.00455, alt: 1124, area: "Andalo", named: false },
  p30:               { name: "Above Intermedia Dosson",     lat: 46.15253, lon: 11.01856, alt: 1478, area: "Andalo", named: false },
  rindoledosdeleva4: { name: "Rindole - Dos de Leva",       lat: 46.16010, lon: 11.00694, alt: 1077, area: "Andalo" },
  salareconca3:      { name: "Salare Conca",                lat: 46.13809, lon: 11.02166, alt: 1878, area: "Andalo" },
  p33:               { name: "Above Rindole - Dos de Leva", lat: 46.15883, lon: 11.00594, alt: 1103, area: "Andalo", named: false },
  p34:               { name: "Above Laghet",                lat: 46.15436, lon: 11.00174, alt: 1189, area: "Andalo", named: false },
  laselletta2:       { name: "La Selletta",                 lat: 46.14837, lon: 11.03673, alt: 1967, area: "Fai" },
  p36:               { name: "Below Cima Paganella",        lat: 46.14490, lon: 11.03007, alt: 1919, area: "Andalo", named: false },
  p37:               { name: "Above Albi de Mez",           lat: 46.14885, lon: 11.02816, alt: 1794, area: "Andalo", named: false },
  albidemez3:        { name: "Albi de Mez",                 lat: 46.14892, lon: 11.02543, alt: 1756, area: "Andalo" },
  meriz4:            { name: "Meriz",                       lat: 46.16341, lon: 11.04851, alt: 1452, area: "Fai" },
  cimapaganella:     { name: "Cima Paganella",              lat: 46.14478, lon: 11.03813, alt: 2072, area: "Fai" },
  p41:               { name: "La Rocca junction",           lat: 46.16674, lon: 11.04845, alt: 1398, area: "Fai", named: false },
  p42:               { name: "Above Meriz",                 lat: 46.15827, lon: 11.04604, alt: 1618, area: "Fai", named: false },
  meriz5:            { name: "Meriz",                       lat: 46.15691, lon: 11.04959, alt: 1568, area: "Fai" },
  salareconca4:      { name: "Salare Conca",                lat: 46.14417, lon: 11.01750, alt: 1693, area: "Andalo" },
  p45:               { name: "Above Salare Conca",          lat: 46.14456, lon: 11.02116, alt: 1761, area: "Andalo", named: false },
  albidemez4:        { name: "Albi de Mez",                 lat: 46.14750, lon: 11.02155, alt: 1705, area: "Andalo" },
  santantonio3:      { name: "Sant'Antonio",                lat: 46.14183, lon: 11.01289, alt: 1715, area: "Andalo" },
  salareconca5:      { name: "Salare Conca",                lat: 46.13931, lon: 11.01956, alt: 1819, area: "Andalo" },
  p50:               { name: "Salare junction",             lat: 46.14201, lon: 11.01857, alt: 1756, area: "Andalo", named: false },
  p51:               { name: "Below Cima Paganella",        lat: 46.14708, lon: 11.04166, alt: 1895, area: "Fai", named: false },
  p52:               { name: "Above Teresat",               lat: 46.14655, lon: 11.00237, alt: 1456, area: "Andalo", named: false },
  p53:               { name: "Below Albi de Mez",           lat: 46.15261, lon: 11.02476, alt: 1671, area: "Andalo", named: false },
  intermediadosson2: { name: "Intermedia Dosson",           lat: 46.15235, lon: 11.01561, alt: 1457, area: "Andalo" },
  intermediadosson3: { name: "Intermedia Dosson",           lat: 46.15187, lon: 11.01362, alt: 1430, area: "Andalo" },
  p57:               { name: "Cacciatori 1 junction",       lat: 46.15585, lon: 11.00363, alt: 1141, area: "Andalo", named: false },
  cimapaganella2:    { name: "Cima Paganella",              lat: 46.14207, lon: 11.03559, alt: 2075, area: "Andalo", rifugio: true },
};

/** [from, to, name, type, rideMinutes, lastUpMinuteOfDay, typicalQueueMinutes] */
export const LIFTS = [
  ["rindoledosdeleva", "rindoledosdeleva2", "Rindole - Dos de Leva", "chair", 2, 1000, 3],
  ["andalo", "p4", "Andalo - Doss Pelà", "gondola", 9, 1000, 2],
  ["laselletta", "paganella", "La Selletta - Cima Paganella", "chair", 5, 1000, 3],
  ["albidemez", "paganella", "Albi de Mez - Cima Paganella", "chair", 9, 1000, 2],
  ["meriz", "laselletta", "Meriz - La Selletta", "chair", 14, 1000, 2],
  ["meriz2", "meriz3", "Meriz", "chair", 5, 1000, 2],
  ["santel", "meriz2", "Santel - Meriz", "chair", 10, 1000, 4],
  ["pratidigaggia", "teresat", "Teresat", "chair", 3, 1000, 3],
  ["salareconca", "salareconca2", "Salare Conca", "chair", 7, 1000, 3],
  ["pratidigaggia", "paganella2", "Prati di Gaggia - Paganella 2", "chair", 13, 1000, 3],
  ["laghet", "pratidigaggia", "Laghet - Prati di Gaggia", "gondola", 5, 1000, 3],
  ["laghetdoss", "laghetdoss2", "Laghet - Doss", "chair", 2, 1000, 5],
  ["santantonio", "santantonio2", "Sant'Antonio", "chair", 9, 1000, 3],
  ["piandosson", "laselletta", "Pian Dosson - Selletta", "gondola", 6, 1000, 2],
];

/** [from, to, name, difficulty, km, minutes] */
export const RUNS = [
  ["p4", "p45", "Cacciatori 2", "red", 0.1, 2],
  ["p45", "salareconca4", "Cacciatori 2", "red", 0.4, 2],
  ["salareconca4", "salareconca", "Cacciatori 2", "red", 0.1, 2],
  ["salareconca", "intermediadosson", "Cacciatori 2", "red", 1, 3],
  ["p25", "p4", "Olimpionica 3", "red", 0.3, 2],
  ["paganella", "cimapaganella2", "Olimpionica 3", "red", 0.2, 2],
  ["cimapaganella2", "p36", "Olimpionica 3", "red", 0.5, 2],
  ["p36", "p25", "Olimpionica 3", "red", 0.4, 2],
  ["p25", "albidemez2", "Olimpionica 3", "red", 0.2, 2],
  ["albidemez2", "albidemez", "Olimpionica 3", "red", 0.1, 2],
  ["rindoledosdeleva3", "rindoledosdeleva", "Rindole", "blue", 0.1, 2],
  ["albidemez2", "albidemez4", "Olimpionica 2 (H)", "black", 0.1, 2],
  ["albidemez4", "p30", "Olimpionica 2 (H)", "black", 0.6, 2],
  ["p30", "piandosson2", "Olimpionica 2 (H)", "black", 0.4, 2],
  ["intermediadosson", "piandosson", "Olimpionica 1", "red", 0.1, 2],
  ["piandosson", "piandosson2", "Olimpionica 1", "red", 0.2, 2],
  ["piandosson2", "p29", "Olimpionica 1", "red", 1.1, 4],
  ["p30", "intermediadosson", "Cacciatori 1", "blue", 0.1, 2],
  ["intermediadosson", "intermediadosson2", "Cacciatori 1", "blue", 0.1, 2],
  ["intermediadosson2", "intermediadosson3", "Cacciatori 1", "blue", 0.2, 2],
  ["intermediadosson3", "p34", "Cacciatori 1", "blue", 1.2, 4],
  ["p34", "p57", "Cacciatori 1", "blue", 0.2, 2],
  ["p57", "p29", "Cacciatori 1", "blue", 0.1, 2],
  ["p29", "p33", "Cacciatori 1", "blue", 0.3, 2],
  ["p33", "rindoledosdeleva4", "Cacciatori 1", "blue", 0.2, 2],
  ["rindoledosdeleva4", "rindoledosdeleva3", "Cacciatori 1", "blue", 0.1, 2],
  ["rindoledosdeleva3", "andalo", "Cacciatori 1", "blue", 0.3, 2],
  ["rindoledosdeleva2", "rindoledosdeleva4", "Rindole", "blue", 0.3, 2],
  ["salareconca3", "salareconca5", "Sant'Antonio 1", "blue", 0.2, 2],
  ["salareconca5", "paganella2", "Sant'Antonio 1", "blue", 0.4, 2],
  ["paganella2", "santantonio3", "Sant'Antonio 1", "blue", 0.2, 2],
  ["santantonio3", "santantonio", "Sant'Antonio 1", "blue", 0.2, 2],
  ["p33", "laghetdoss2", "Gaggia", "red", 0.2, 2],
  ["laghetdoss2", "laghet", "Gaggia", "red", 0.1, 2],
  ["laghetdoss2", "laghetdoss", "Laghet", "blue", 0.4, 2],
  ["pratidigaggia", "p34", "Gaggia", "red", 0.8, 3],
  ["laselletta", "laselletta2", "Dosso Larici", "red", 0.1, 2],
  ["laselletta", "p42", "Dosso Larici", "red", 1.6, 5],
  ["p42", "meriz4", "Dosso Larici", "red", 0.6, 2],
  ["meriz4", "meriz", "Dosso Larici", "red", 0.2, 2],
  ["p36", "p37", "Traliccio", "red", 0.5, 2],
  ["laselletta2", "p37", "Tre-Tre (selletta)", "red", 0.7, 2],
  ["p37", "albidemez3", "Tre-Tre (selletta)", "red", 0.1, 2],
  ["meriz4", "p41", "La Rocca", "red", 0.4, 2],
  ["p41", "santel", "La Rocca", "red", 1.3, 4],
  ["paganella", "cimapaganella", "Panoramica", "red", 0.2, 2],
  ["meriz", "p41", "La Rocca", "red", 0.3, 2],
  ["p42", "meriz5", "Nuvola Rossa", "red", 0.3, 2],
  ["salareconca2", "p50", "Salare", "blue", 0.6, 2],
  ["p50", "salareconca4", "Salare", "blue", 0.3, 2],
  ["santantonio2", "salareconca3", "Skiweg conca d'argento", "blue", 0.1, 2],
  ["salareconca3", "salareconca2", "Skiweg conca d'argento", "blue", 0.1, 2],
  ["salareconca2", "p45", "Skiweg conca d'argento", "blue", 0.6, 2],
  ["albidemez", "albidemez4", "Albi de Mez link", "black", 0.2, 2],
  ["albidemez3", "albidemez", "Albi de Mez link", "red", 0.1, 2],
  ["salareconca3", "paganella2", "Sant'Antonio 2", "blue", 0.6, 2],
  ["paganella", "cimapaganella", "Panoramica", "red", 0.1, 2],
  ["cimapaganella", "laselletta2", "Panoramica", "red", 0.4, 2],
  ["santantonio", "p52", "Paganella 2", "red", 1, 3],
  ["p52", "pratidigaggia", "Paganella 2", "red", 0.6, 2],
  ["santantonio3", "salareconca", "Skiweg lo Scoiattolo", "blue", 0.4, 2],
  ["paganella", "p51", "Nuvola Rossa", "red", 0.7, 2],
  ["p51", "meriz5", "Nuvola Rossa", "red", 1.5, 5],
  ["meriz5", "meriz2", "Nuvola Rossa", "red", 0.8, 3],
  ["meriz2", "meriz", "Nuvola Rossa", "red", 0.1, 2],
  ["meriz3", "meriz2", "Campo Scuola Rolly Marchi", "blue", 0.5, 2],
  ["salareconca5", "p50", "Salare Conca to Salare", "black", 0.3, 2],
  ["teresat", "pratidigaggia", "Teresat", "blue", 0.3, 2],
  ["laselletta", "p51", "Dosso Larici", "red", 0.3, 2],
  ["santantonio", "p52", "Lupetto", "red", 0.8, 3],
  ["laselletta", "p53", "Jana Granda (N)", "red", 1.2, 4],
  ["p53", "p30", "Jana Granda (N)", "red", 0.8, 3],
  ["p30", "piandosson", "Above Intermedia Dosson to Pian Dosson", "red", 0.3, 2],
  ["albidemez3", "p53", "Gallo Cedrone", "red", 0.4, 2],
  ["albidemez2", "albidemez3", "Albi de Mez link", "blue", 0.2, 2],
  ["albidemez2", "albidemez", "Albi de Mez link", "blue", 0.1, 2],
  ["intermediadosson", "intermediadosson2", "Intermedia Dosson link", "blue", 0.1, 2],
  ["laselletta", "laselletta2", "La Selletta link", "blue", 0.2, 2],
  ["laselletta", "laselletta2", "La Selletta link", "blue", 0.2, 2],
  ["intermediadosson2", "intermediadosson3", "Intermedia Dosson link", "blue", 0.2, 2],
];

export const DIFFICULTY_RANK = { blue: 1, red: 2, black: 3 };

export const SHORT_NAMES = {};

/**
 * How the app lists and frames this resort. Derived from the graph above and
 * scripts/resorts/paganella.json at build time, so adding a resort does not mean
 * hand-typing a camera position.
 */
export const META = {
  "id": "paganella",
  "name": "Paganella Ski",
  "region": "Trentino",
  "country": "Italy",
  "available": true,
  "center": [
    11.02457,
    46.15622
  ],
  "zoom": 13.5,
  "pitch": 62,
  "bearing": 133,
  "bbox": [
    10.98,
    46.1,
    11.13,
    46.24
  ],
  "bases": [
    "andalo",
    "santel"
  ],
  "defaultBase": "andalo",
  "firstLift": 510,
  "lastDown": 1020,
  "stats": {
    "lifts": 14,
    "runs": 80,
    "km": 32,
    "top": 2113,
    "bottom": 1028,
    "valleys": 2
  },
  "blurb": "Andalo and Fai della Paganella, one ridge above the Brenta valley.",
  "published": {
    "lifts": 15,
    "runs": 31,
    "top": 2125,
    "bottom": 1028
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
