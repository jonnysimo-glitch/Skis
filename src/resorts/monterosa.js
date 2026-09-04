/**
 * Monterosa Ski — resort graph.
 *
 * GENERATED. Do not edit by hand: run `npm run resort -- monterosa` instead.
 *
 * Source:    OpenStreetMap via the Overpass API, 2026-09-04T19:12:46.124Z
 * Elevation: AWS Terrain Tiles (terrarium), zoom 13
 * Licence:   OSM data is ODbL. Attribution is required wherever this is shown.
 *
 * What had to be assumed:
 *   - 26 runs were unnamed and are described by their endpoints
 *   - 11 nodes, 4 lifts and 11 runs were outside the largest strongly connected component and were dropped
 *   - endpoints within 100 m of each other were treated as the same place
 *
 * NOT from OpenStreetMap, because it is not in there: last-lift times and
 * queue estimates. Those come from the resort and are the numbers behind the
 * app's promise that nothing will strand you, so they are listed separately in
 * scripts/resorts/monterosa.json rather than buried in the graph.
 *
 * Node coordinates are [lat, lon]. They exist so the 3D layer can place the
 * graph on real terrain; the solver itself never reads them.
 */

export const NODES = {
  pianalungabocchetta:   { name: "Pianalunga-Bocchetta",         lat: 45.86527, lon: 7.90441, alt: 2033, area: "Alagna", rifugio: true },
  passodeisalati:        { name: "Passo dei Salati",             lat: 45.87696, lon: 7.86867, alt: 2953, area: "Gressoney", rifugio: true },
  alpeostafa:            { name: "Alpe Ostafa",                  lat: 45.83397, lon: 7.76228, alt: 2414, area: "Ayas", rifugio: true },
  collesarezza:          { name: "Colle Sarezza",                lat: 45.83879, lon: 7.76970, alt: 2687, area: "Ayas" },
  p5:                    { name: "Below Belvedere",              lat: 45.84898, lon: 7.75513, alt: 2222, area: "Ayas", named: false },
  lagociarcerio:         { name: "Lago Ciarcerio",               lat: 45.85396, lon: 7.75812, alt: 2375, area: "Ayas" },
  gabiet:                { name: "Gabiet",                       lat: 45.85535, lon: 7.84514, alt: 2312, area: "Gressoney", rifugio: true },
  lago:                  { name: "Lago",                         lat: 45.85263, lon: 7.84779, alt: 2372, area: "Gressoney" },
  crest:                 { name: "Crest",                        lat: 45.83226, lon: 7.74403, alt: 1978, area: "Ayas", rifugio: true },
  puntajolanda:          { name: "Punta Jolanda",                lat: 45.83192, lon: 7.82331, alt: 1646, area: "Gressoney", rifugio: true },
  puntajolanda2:         { name: "Punta Jolanda",                lat: 45.84037, lon: 7.83217, alt: 2223, area: "Gressoney" },
  alpemandria:           { name: "Alpe Mandria",                 lat: 45.85599, lon: 7.74258, alt: 1977, area: "Ayas", rifugio: true },
  alpemandria2:          { name: "Alpe Mandria",                 lat: 45.86042, lon: 7.75969, alt: 2427, area: "Ayas", rifugio: true },
  stafal:                { name: "Stafal",                       lat: 45.85764, lon: 7.81190, alt: 1818, area: "Gressoney", base: true, rifugio: true },
  santanna:              { name: "Sant'Anna",                    lat: 45.85550, lon: 7.80287, alt: 2171, area: "Gressoney", rifugio: true },
  collebetta:            { name: "Colle Betta",                  lat: 45.87009, lon: 7.78231, alt: 2716, area: "Gressoney", rifugio: true },
  bedemie:               { name: "Bedemie",                      lat: 45.84412, lon: 7.82211, alt: 1904, area: "Gressoney", rifugio: true },
  seehorn:               { name: "Seehorn",                      lat: 45.84954, lon: 7.83914, alt: 2369, area: "Gressoney" },
  bettaforca:            { name: "Bettaforca",                   lat: 45.86641, lon: 7.76104, alt: 2293, area: "Ayas" },
  bettaforca2:           { name: "Bettaforca",                   lat: 45.86985, lon: 7.78076, alt: 2691, area: "Gressoney", rifugio: true },
  bocchetta:             { name: "Bocchetta",                    lat: 45.87507, lon: 7.90221, alt: 2393, area: "Alagna" },
  crest2:                { name: "Crest",                        lat: 45.83153, lon: 7.74590, alt: 1990, area: "Ayas" },
  cimalegna:             { name: "Cimalegna",                    lat: 45.87157, lon: 7.88727, alt: 2640, area: "Alagna" },
  collesalati:           { name: "Colle Salati",                 lat: 45.87834, lon: 7.86754, alt: 2994, area: "Gressoney" },
  p30:                   { name: "Champoluc",                    lat: 45.83649, lon: 7.73148, alt: 1584, area: "Ayas", base: true, rifugio: true, named: false },
  stafal2:               { name: "Stafal",                       lat: 45.86055, lon: 7.81266, alt: 1838, area: "Gressoney" },
  moos:                  { name: "Moos",                         lat: 45.85982, lon: 7.80929, alt: 1912, area: "Gressoney" },
  belvedere:             { name: "Belvedere",                    lat: 45.84543, lon: 7.75200, alt: 2289, area: "Ayas", rifugio: true },
  p35:                   { name: "Below Passo dei Salati",       lat: 45.87262, lon: 7.87591, alt: 2811, area: "Alagna", named: false },
  collesarezza2:         { name: "Colle Sarezza",                lat: 45.83695, lon: 7.76899, alt: 2634, area: "Ayas" },
  alpeostafa2:           { name: "Alpe Ostafa",                  lat: 45.83532, lon: 7.76518, alt: 2505, area: "Ayas" },
  p39:                   { name: "Ostafa 2 junction",            lat: 45.83081, lon: 7.76084, alt: 2300, area: "Ayas", named: false },
  p41:                   { name: "Below Mont Cavallo",           lat: 45.85583, lon: 7.74922, alt: 2165, area: "Ayas", named: false },
  p42:                   { name: "Above Alpe Mandria",           lat: 45.85764, lon: 7.74717, alt: 2113, area: "Ayas", named: false },
  p43:                   { name: "Below Colle Della Bettaforca", lat: 45.86634, lon: 7.78672, alt: 2585, area: "Gressoney", named: false },
  p44:                   { name: "Above Moos",                   lat: 45.86069, lon: 7.80351, alt: 2091, area: "Gressoney", named: false },
  p45:                   { name: "Below Colle Della Bettaforca", lat: 45.86260, lon: 7.79111, alt: 2474, area: "Gressoney", named: false },
  p46:                   { name: "Above Sant'Anna",              lat: 45.85932, lon: 7.79526, alt: 2336, area: "Gressoney", named: false },
  gabiet3:               { name: "Gabiet",                       lat: 45.85408, lon: 7.84376, alt: 2325, area: "Gressoney" },
  p49:                   { name: "Below Gabiet",                 lat: 45.85361, lon: 7.83672, alt: 2258, area: "Gressoney", named: false },
  bedemie2:              { name: "Bedemie",                      lat: 45.84363, lon: 7.82552, alt: 1972, area: "Gressoney" },
  p51:                   { name: "Above Crest",                  lat: 45.82977, lon: 7.75216, alt: 2095, area: "Ayas", named: false },
  cornodelcamoscio:      { name: "Corno del Camoscio",           lat: 45.87381, lon: 7.86514, alt: 2862, area: "Gressoney" },
  p53:                   { name: "Pian de la Sal junction",      lat: 45.85807, lon: 7.75133, alt: 2230, area: "Ayas", named: false },
  colledellabettaforca:  { name: "Colle Della Bettaforca",       lat: 45.86857, lon: 7.78123, alt: 2655, area: "Gressoney" },
  colledellabettaforca2: { name: "Colle Della Bettaforca",       lat: 45.86867, lon: 7.77971, alt: 2631, area: "Gressoney" },
  p57:                   { name: "Below Mont Cavallo",           lat: 45.85933, lon: 7.75284, alt: 2260, area: "Ayas", rifugio: true, named: false },
  p58:                   { name: "Above Cimalegna",              lat: 45.87346, lon: 7.88286, alt: 2731, area: "Alagna", named: false },
  p59:                   { name: "Above Pianalunga-Bocchetta",   lat: 45.86603, lon: 7.90081, alt: 2073, area: "Alagna", named: false },
  p60:                   { name: "Above Sant'Anna",              lat: 45.85788, lon: 7.79818, alt: 2277, area: "Gressoney", rifugio: true, named: false },
  p61:                   { name: "Below Punta Jolanda",          lat: 45.84325, lon: 7.83068, alt: 2132, area: "Gressoney", named: false },
  bocchetta2:            { name: "Bocchetta",                    lat: 45.87322, lon: 7.90479, alt: 2323, area: "Alagna" },
  p63:                   { name: "Above Pianalunga-Bocchetta",   lat: 45.86790, lon: 7.90766, alt: 2087, area: "Alagna", named: false },
  p66:                   { name: "Above Gabiet",                 lat: 45.85831, lon: 7.84765, alt: 2398, area: "Gressoney", named: false },
  p67:                   { name: "Below Corno del Camoscio",     lat: 45.86722, lon: 7.85945, alt: 2666, area: "Gressoney", named: false },
  gabiet4:               { name: "Gabiet",                       lat: 45.85414, lon: 7.84693, alt: 2332, area: "Gressoney" },
  lagociarcerio2:        { name: "Lago Ciarcerio",               lat: 45.85617, lon: 7.75927, alt: 2376, area: "Ayas" },
  montcavallo:           { name: "Mont Cavallo",                 lat: 45.85555, lon: 7.75421, alt: 2309, area: "Ayas" },
  p73:                   { name: "Ostafa 1 junction",            lat: 45.83191, lon: 7.75827, alt: 2275, area: "Ayas", named: false },
  p74:                   { name: "Ostafa 1 junction",            lat: 45.83073, lon: 7.75498, alt: 2175, area: "Ayas", named: false },
  p75:                   { name: "Ostafa 1 junction",            lat: 45.83093, lon: 7.74734, alt: 2007, area: "Ayas", rifugio: true, named: false },
  alpeostafa3:           { name: "Alpe Ostafa",                  lat: 45.83212, lon: 7.76401, alt: 2378, area: "Ayas", rifugio: true },
  alpeostafa4:           { name: "Alpe Ostafa",                  lat: 45.83181, lon: 7.76081, alt: 2332, area: "Ayas" },
  p78:                   { name: "Below Colle Sarezza",          lat: 45.83637, lon: 7.76737, alt: 2575, area: "Ayas", named: false },
};

/** [from, to, name, type, rideMinutes, lastUpMinuteOfDay, typicalQueueMinutes] */
export const LIFTS = [
  ["pianalungabocchetta", "passodeisalati", "Pianalunga - Cimalegna - Salati", "cable car", 7, 960, 6],
  ["alpeostafa", "collesarezza", "Alpe Ostafa - Colle Sarezza II", "chair", 8, 960, 2],
  ["p5", "lagociarcerio", "Lago Ciarcerio - Belvedere", "chair", 5, 960, 5],
  ["gabiet", "passodeisalati", "Gabiet - Passo dei Salati", "gondola", 12, 960, 2],
  ["gabiet", "lago", "Gabiet - Lago", "chair", 3, 960, 4],
  ["crest", "alpeostafa", "Crest - Alpe Ostafa III", "gondola", 6, 960, 2],
  ["puntajolanda", "puntajolanda2", "Punta Jolanda", "chair", 10, 960, 5],
  ["alpemandria", "alpemandria2", "Alpe Mandria", "chair", 6, 960, 2],
  ["stafal", "santanna", "Stafal - Sant'Anna", "cable car", 2, 960, 5],
  ["santanna", "collebetta", "Sant'Anna - Colle Betta", "chair", 9, 960, 2],
  ["bedemie", "seehorn", "Bedemie - Seehorn", "chair", 12, 960, 4],
  ["stafal", "gabiet", "Stafal - Gabiet", "gondola", 9, 960, 2],
  ["bettaforca", "bettaforca2", "Bettaforca", "chair", 6, 960, 2],
  ["pianalungabocchetta", "bocchetta", "Pianalunga - Bocchetta", "chair", 8, 960, 4],
  ["crest", "crest2", "Fontaney 2", "carpet", 6, 960, 5],
  ["cimalegna", "collesalati", "Cimalegna-Passo Salati", "chair", 7, 960, 2],
  ["p30", "crest", "Champoluc - Crest", "gondola", 5, 960, 2],
  ["stafal2", "moos", "Moos", "chair", 3, 960, 5],
  ["p5", "belvedere", "Lago Ciarcerio - Belvedere", "chair", 5, 960, 5],
];

/** [from, to, name, difficulty, km, minutes] */
export const RUNS = [
  ["collesarezza", "p5", "Sarezza-Contenéry", "black", 2.2, 8],
  ["bettaforca", "alpemandria", "Dei Larici", "red", 2.2, 8],
  ["lagociarcerio", "montcavallo", "Del Lago", "blue", 0.3, 2],
  ["montcavallo", "p41", "Del Lago", "blue", 0.5, 2],
  ["p41", "alpemandria", "Del Lago", "blue", 1.2, 4],
  ["alpemandria2", "p57", "Del Monte", "red", 0.5, 2],
  ["p57", "p42", "Del Monte", "red", 0.5, 2],
  ["p42", "alpemandria", "Del Monte", "red", 0.4, 2],
  ["moos", "stafal2", "Moos to Stafal", "red", 0.2, 2],
  ["bocchetta", "bocchetta2", "Mullero", "red", 0.3, 2],
  ["bocchetta2", "p59", "Mullero", "red", 1.1, 4],
  ["p59", "pianalungabocchetta", "Mullero", "red", 0.2, 2],
  ["passodeisalati", "cornodelcamoscio", "Salati", "red", 0.5, 2],
  ["cornodelcamoscio", "p67", "Salati", "red", 0.9, 3],
  ["p67", "p66", "Salati", "red", 1.5, 5],
  ["p66", "gabiet", "Salati", "red", 0.3, 2],
  ["crest", "p30", "Del Bosco", "black", 1.4, 5],
  ["belvedere", "crest", "Belvedere", "blue", 2, 6],
  ["collesarezza2", "p78", "Sarezza Variante", "red", 0.1, 2],
  ["p78", "alpeostafa2", "Sarezza Variante", "red", 0.3, 2],
  ["lagociarcerio", "p5", "Contenéry", "red", 0.6, 2],
  ["alpemandria2", "lagociarcerio2", "Del Lago", "blue", 0.5, 2],
  ["lagociarcerio2", "lagociarcerio", "Del Lago", "blue", 0.3, 2],
  ["p41", "p42", "Pian de la Sal", "red", 0.3, 2],
  ["collebetta", "colledellabettaforca", "Pistone Betta", "red", 0.2, 2],
  ["colledellabettaforca", "p43", "Pistone Betta", "red", 0.5, 2],
  ["collebetta", "p43", "Betta 1", "red", 0.6, 2],
  ["santanna", "p44", "Delle Marmotte", "red", 0.8, 3],
  ["p45", "p46", "Pistone Betta", "red", 0.4, 2],
  ["lago", "gabiet", "Castore", "blue", 0.4, 2],
  ["lago", "gabiet3", "Castore-Ricka", "red", 0.3, 2],
  ["seehorn", "gabiet3", "Collegamento Gabiet", "red", 0.7, 2],
  ["seehorn", "p49", "Collegamento Ricka", "red", 0.5, 2],
  ["p49", "stafal2", "Moos", "black", 2.5, 10],
  ["bedemie", "puntajolanda", "Jolanda", "red", 1.5, 5],
  ["puntajolanda2", "bedemie2", "Jolanda 1", "black", 0.7, 3],
  ["puntajolanda2", "p61", "Jolanda", "red", 0.5, 2],
  ["p61", "bedemie2", "Jolanda", "red", 0.7, 2],
  ["bedemie2", "bedemie", "Jolanda", "red", 0.2, 2],
  ["seehorn", "puntajolanda2", "Chamois", "red", 1.3, 4],
  ["p44", "moos", "Diretta Staffal", "red", 0.5, 2],
  ["moos", "stafal", "Diretta Staffal", "red", 0.4, 2],
  ["collesarezza", "collesarezza2", "Sarezza", "red", 0.3, 2],
  ["collesarezza2", "p78", "Sarezza", "red", 0.3, 2],
  ["p78", "alpeostafa2", "Sarezza", "red", 0.3, 2],
  ["alpeostafa2", "alpeostafa", "Sarezza", "red", 0.3, 2],
  ["gabiet", "p49", "Alpe Ricka", "red", 0.7, 3],
  ["p49", "bedemie", "Alpe Ricka", "red", 1.6, 5],
  ["alpeostafa", "alpeostafa4", "Ostafa 1", "red", 0.3, 2],
  ["alpeostafa4", "p73", "Ostafa 1", "red", 0.2, 2],
  ["p73", "p74", "Ostafa 1", "red", 0.5, 2],
  ["p74", "p51", "Ostafa 1", "red", 0.3, 2],
  ["p51", "p75", "Ostafa 1", "red", 0.4, 2],
  ["p75", "crest", "Ostafa 1", "red", 0.3, 2],
  ["alpeostafa", "alpeostafa3", "Ostafa 2", "red", 0.2, 2],
  ["alpeostafa3", "p39", "Ostafa 2", "red", 0.3, 2],
  ["p39", "p51", "Ostafa 2", "red", 0.9, 3],
  ["passodeisalati", "cornodelcamoscio", "Variante Salati", "red", 0.3, 2],
  ["alpemandria2", "p53", "Pian de la Sal", "red", 0.7, 2],
  ["colledellabettaforca", "colledellabettaforca2", "Colle Della Bettaforca link", "red", 0.2, 2],
  ["p57", "p53", "Pian de la Sal", "red", 0.2, 2],
  ["p53", "p41", "Pian de la Sal", "red", 0.3, 2],
  ["p35", "p58", "Bodwitch", "blue", 0.6, 2],
  ["passodeisalati", "p58", "Cimalegna", "blue", 1.1, 3],
  ["p58", "cimalegna", "Cimalegna", "blue", 0.4, 2],
  ["alpemandria2", "bettaforca", "Liason", "red", 0.7, 2],
  ["p59", "pianalungabocchetta", "Down to Pianalunga-Bocchetta", "red", 0.4, 2],
  ["p46", "p60", "Sant Anna", "red", 0.2, 2],
  ["p60", "santanna", "Pistone Betta", "red", 0.4, 2],
  ["seehorn", "p61", "Seehorn", "red", 1.2, 4],
  ["bocchetta2", "p63", "Mullero Competition", "black", 0.7, 2],
  ["p63", "pianalungabocchetta", "Mullero Competition", "black", 0.4, 2],
  ["collesalati", "passodeisalati", "Cimalegna", "red", 0.3, 2],
  ["lago", "gabiet4", "Castore", "blue", 0.2, 2],
  ["gabiet4", "gabiet", "Castore", "blue", 0.1, 2],
  ["lago", "gabiet4", "Castore", "blue", 0.1, 2],
  ["bocchetta", "bocchetta2", "Mullero", "red", 0.3, 2],
  ["gabiet3", "gabiet", "Collegamento Gabiet", "red", 0.1, 2],
  ["p60", "p44", "Nera", "black", 0.6, 2],
  ["p44", "moos", "Delle Marmotte", "red", 1.1, 4],
  ["p60", "santanna", "Sant Anna", "red", 0.5, 2],
  ["p46", "p60", "Above Sant'Anna link", "red", 0.2, 2],
  ["p43", "p45", "Pistone Betta", "red", 0.5, 2],
  ["p43", "p45", "Fun Slope", "red", 0.8, 3],
  ["bettaforca2", "colledellabettaforca", "Del colle", "red", 0.2, 2],
  ["colledellabettaforca", "colledellabettaforca2", "Del colle", "red", 0.1, 2],
  ["colledellabettaforca2", "bettaforca", "Del colle", "red", 1.5, 5],
  ["lagociarcerio2", "montcavallo", "Del Lago", "blue", 0.5, 2],
  ["belvedere", "p5", "Ciosal", "red", 1.1, 4],
  ["p73", "p74", "Ostafa 1", "red", 0.3, 2],
  ["p75", "crest", "Ostafa 1 to Crest", "red", 0.3, 2],
  ["crest2", "crest", "Fontaney 2", "blue", 0.1, 2],
  ["alpeostafa2", "alpeostafa", "Sarezza Variante", "red", 0.3, 2],
  ["alpeostafa3", "alpeostafa4", "Alpe Ostafa link", "red", 0.3, 2],
  ["p46", "p60", "Pistone Betta", "red", 0.2, 2],
  ["p46", "p60", "Above Sant'Anna link", "red", 0.3, 2],
  ["passodeisalati", "p35", "Bodwitch", "blue", 0.8, 4],
  ["p35", "p59", "Olen", "black", 2.8, 10],
  ["p67", "p66", "Salati 1", "red", 1.4, 4],
];

export const DIFFICULTY_RANK = { blue: 1, red: 2, black: 3 };

export const SHORT_NAMES = {};

/**
 * How the app lists and frames this resort. Derived from the graph above and
 * scripts/resorts/monterosa.json at build time, so adding a resort does not mean
 * hand-typing a camera position.
 */
export const META = {
  "id": "monterosa",
  "name": "Monterosa Ski",
  "region": "Valle d'Aosta",
  "country": "Italy",
  "available": true,
  "center": [
    7.81957,
    45.85406
  ],
  "zoom": 11.9,
  "pitch": 62,
  "bearing": -24,
  "bbox": [
    7.64,
    45.74,
    8,
    45.94
  ],
  "bases": [
    "stafal",
    "p30"
  ],
  "defaultBase": "stafal",
  "firstLift": 510,
  "lastDown": 990,
  "stats": {
    "lifts": 19,
    "runs": 99,
    "km": 61,
    "top": 2994,
    "bottom": 1584,
    "valleys": 2
  },
  "blurb": "Gressoney, Ayas and Alagna, linked over two high cols.",
  "published": null
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
