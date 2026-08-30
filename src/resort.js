/**
 * Monterosa Ski — resort graph.
 *
 * PROVENANCE: hand-typed from memory. Altitudes and lat/lon are approximately
 * right, run names are plausible, times are estimates. This is scaffolding, not
 * data. Replace with the OpenStreetMap Overpass extraction (see CLAUDE.md,
 * "Replacing this file") before anything ships to a real skier.
 *
 * Node coordinates are [lat, lon]. They exist so the 3D layer can place the
 * graph on real terrain; the solver itself never reads them.
 */

export const NODES = {
  staffal:    { name: "Staffal",          lat: 45.8790, lon: 7.8180, alt: 1830, area: "Gressoney", base: true,  rifugio: true },
  jolanda:    { name: "Punta Jolanda",    lat: 45.8830, lon: 7.8090, alt: 2240, area: "Gressoney", rifugio: true },
  gabiet:     { name: "Gabiet",           lat: 45.8700, lon: 7.8330, alt: 2350, area: "Gressoney", rifugio: true },
  salati:     { name: "Passo dei Salati", lat: 45.8890, lon: 7.8730, alt: 2971, area: "Alta quota" },
  indren:     { name: "Punta Indren",     lat: 45.8930, lon: 7.8620, alt: 3260, area: "Alta quota" },
  pianalunga: { name: "Pianalunga",       lat: 45.8960, lon: 7.9080, alt: 2050, area: "Alagna", rifugio: true },
  alagna:     { name: "Alagna",           lat: 45.8530, lon: 7.9370, alt: 1191, area: "Alagna", base: true },
  santanna:   { name: "Sant'Anna",        lat: 45.8700, lon: 7.7950, alt: 2170, area: "Gressoney", rifugio: true },
  bettaforca: { name: "Colle Bettaforca", lat: 45.8570, lon: 7.7560, alt: 2727, area: "Ayas" },
  mandria:    { name: "Alpe Mandria",     lat: 45.8480, lon: 7.7360, alt: 2000, area: "Ayas", rifugio: true },
  crest:      { name: "Crest",            lat: 45.8340, lon: 7.7290, alt: 1900, area: "Ayas", rifugio: true },
  champoluc:  { name: "Champoluc",        lat: 45.8180, lon: 7.7270, alt: 1570, area: "Ayas", base: true },
  frachey:    { name: "Frachey",          lat: 45.8420, lon: 7.7530, alt: 1620, area: "Ayas", base: true },
};

/** [from, to, name, type, rideMinutes, lastUpMinuteOfDay, typicalQueueMinutes] */
export const LIFTS = [
  ["staffal",    "gabiet",     "Gabiet",           "gondola",   8, 960, 6],
  ["gabiet",     "salati",     "Passo dei Salati", "gondola",   7, 945, 5],
  ["salati",     "indren",     "Indren",           "cable car", 6, 915, 9],
  ["staffal",    "jolanda",    "Punta Jolanda",    "drag",      6, 975, 2],
  ["staffal",    "santanna",   "Sant'Anna",        "chair",     6, 975, 4],
  ["santanna",   "bettaforca", "Bettaforca",       "chair",     7, 950, 4],
  ["frachey",    "santanna",   "Ciarcerio",        "chair",     8, 960, 3],
  ["champoluc",  "crest",      "Crest",            "gondola",   7, 980, 6],
  ["crest",      "mandria",    "Mandria",          "chair",     6, 970, 3],
  ["mandria",    "bettaforca", "Colle",            "chair",     8, 950, 4],
  ["alagna",     "pianalunga", "Pianalunga",       "gondola",   9, 960, 5],
  ["pianalunga", "salati",     "Bocchetta",        "gondola",   7, 945, 4],
];

/** [from, to, name, difficulty, km, minutes] */
export const RUNS = [
  ["indren",     "salati",     "Indren",     "black", 2.9,  7],
  ["salati",     "gabiet",     "Salati",     "red",   3.4,  7],
  ["salati",     "gabiet",     "Lys",        "blue",  4.4, 10],
  ["salati",     "pianalunga", "Olen",       "red",   3.9,  8],
  ["gabiet",     "staffal",    "Gabiet",     "red",   2.8,  6],
  ["gabiet",     "staffal",    "Moos",       "blue",  3.6,  8],
  ["jolanda",    "staffal",    "Jolanda",    "blue",  2.1,  5],
  ["pianalunga", "alagna",     "Bosco",      "black", 4.6, 10],
  ["pianalunga", "alagna",     "Valle",      "red",   5.2, 11],
  ["bettaforca", "staffal",    "Bettaforca", "red",   4.1,  9],
  ["bettaforca", "santanna",   "Sitten",     "blue",  2.2,  5],
  ["santanna",   "staffal",    "Leichtu",    "blue",  2.6,  6],
  ["bettaforca", "mandria",    "Colle",      "red",   3.8,  8],
  ["mandria",    "crest",      "Mandria",    "blue",  2.4,  5],
  ["mandria",    "frachey",    "Ostafa",     "red",   3.2,  7],
  ["crest",      "champoluc",  "Crest",      "blue",  3.1,  7],
  ["crest",      "champoluc",  "Del Bosco",  "black", 2.3,  6],
];

export const DIFFICULTY_RANK = { blue: 1, red: 2, black: 3 };

/** Short names used in generated route titles. */
export const SHORT_NAMES = {
  salati: "Salati", indren: "Indren", bettaforca: "Bettaforca", gabiet: "Gabiet",
  pianalunga: "Pianalunga", santanna: "Sant'Anna", jolanda: "Jolanda",
  mandria: "Mandria", crest: "Crest",
};

/** Flatten lifts and runs into a single directed edge list. */
export function buildEdges() {
  const edges = [];
  LIFTS.forEach(([from, to, name, liftType, ride, lastUp, queue], i) => {
    edges.push({
      id: `L${i}`, kind: "lift", from, to, name, liftType, ride, lastUp, queue,
      min: ride + queue,
      gain: NODES[to].alt - NODES[from].alt,
    });
  });
  RUNS.forEach(([from, to, name, difficulty, km, min], i) => {
    edges.push({
      id: `R${i}`, kind: "run", from, to, name, difficulty, km, min,
      drop: NODES[from].alt - NODES[to].alt,
    });
  });
  return edges;
}

/**
 * Project lat/lon to local metres, centred on the resort. The 3D layer uses
 * this to place nodes on the terrain mesh.
 */
export function projector() {
  const lats = Object.values(NODES).map(n => n.lat);
  const lons = Object.values(NODES).map(n => n.lon);
  const lat0 = (Math.min(...lats) + Math.max(...lats)) / 2;
  const lon0 = (Math.min(...lons) + Math.max(...lons)) / 2;
  const mPerLat = 111320;
  const mPerLon = 111320 * Math.cos(lat0 * Math.PI / 180);
  return {
    lat0, lon0,
    project: (lat, lon) => ({ x: (lon - lon0) * mPerLon, z: -(lat - lat0) * mPerLat }),
  };
}
