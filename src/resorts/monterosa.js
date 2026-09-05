/**
 * Monterosa Ski — resort graph.
 *
 * GENERATED. Do not edit by hand: run `npm run resort -- monterosa` instead.
 *
 * Source:    OpenStreetMap via the Overpass API, 2026-09-05T17:28:24.087Z
 * Elevation: AWS Terrain Tiles (terrarium), zoom 13
 * Licence:   OSM data is ODbL. Attribution is required wherever this is shown.
 *
 * What had to be assumed:
 *   - 99 runs were unnamed and are described by their endpoints
 *   - 181 nodes, 43 lifts and 312 runs were outside the largest strongly connected component and were dropped
 *   - endpoints within 75 m of each other were treated as the same place
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
  pianalungabocchetta:   { name: "Pianalunga-Bocchetta",         lat: 45.86541, lon: 7.90377, alt: 2040, area: "Alagna", rifugio: true },
  passodeisalati:        { name: "Passo dei Salati",             lat: 45.87716, lon: 7.86840, alt: 2962, area: "Gressoney", rifugio: true },
  alpeostafa:            { name: "Alpe Ostafa",                  lat: 45.83397, lon: 7.76228, alt: 2414, area: "Ayas", rifugio: true },
  collesarezza:          { name: "Colle Sarezza",                lat: 45.83879, lon: 7.76970, alt: 2687, area: "Ayas" },
  p23:                   { name: "Below Belvedere",              lat: 45.84895, lon: 7.75478, alt: 2219, area: "Ayas", named: false },
  lagociarcerio:         { name: "Lago Ciarcerio",               lat: 45.85396, lon: 7.75812, alt: 2375, area: "Ayas" },
  gabiet:                { name: "Gabiet",                       lat: 45.85540, lon: 7.84495, alt: 2310, area: "Gressoney", rifugio: true },
  alagna:                { name: "Alagna",                       lat: 45.85329, lon: 7.93513, alt: 1220, area: "Alagna", base: true, rifugio: true },
  lago:                  { name: "Lago",                         lat: 45.85246, lon: 7.84773, alt: 2376, area: "Gressoney" },
  crest:                 { name: "Crest",                        lat: 45.83238, lon: 7.74411, alt: 1981, area: "Ayas", rifugio: true },
  puntajolanda:          { name: "Punta Jolanda",                lat: 45.83192, lon: 7.82331, alt: 1646, area: "Gressoney", rifugio: true },
  puntajolanda2:         { name: "Punta Jolanda",                lat: 45.84037, lon: 7.83217, alt: 2223, area: "Gressoney" },
  alpemandria:           { name: "Alpe Mandria",                 lat: 45.85599, lon: 7.74258, alt: 1977, area: "Ayas", rifugio: true },
  alpemandria2:          { name: "Alpe Mandria",                 lat: 45.86034, lon: 7.75997, alt: 2433, area: "Ayas", rifugio: true },
  stafal:                { name: "Stafal",                       lat: 45.85764, lon: 7.81190, alt: 1818, area: "Gressoney", base: true, rifugio: true },
  santanna:              { name: "Sant'Anna",                    lat: 45.85545, lon: 7.80291, alt: 2170, area: "Gressoney", rifugio: true },
  collebetta:            { name: "Colle Betta",                  lat: 45.87009, lon: 7.78231, alt: 2716, area: "Gressoney", rifugio: true },
  bedemie:               { name: "Bedemie",                      lat: 45.84412, lon: 7.82211, alt: 1904, area: "Gressoney", rifugio: true },
  seehorn:               { name: "Seehorn",                      lat: 45.84910, lon: 7.83925, alt: 2374, area: "Gressoney" },
  bettaforca:            { name: "Bettaforca",                   lat: 45.86641, lon: 7.76104, alt: 2293, area: "Ayas" },
  bettaforca2:           { name: "Bettaforca",                   lat: 45.86985, lon: 7.78076, alt: 2691, area: "Gressoney", rifugio: true },
  pianalungabocchetta2:  { name: "Pianalunga-Bocchetta",         lat: 45.86501, lon: 7.90552, alt: 2023, area: "Alagna", rifugio: true },
  bocchetta:             { name: "Bocchetta",                    lat: 45.87507, lon: 7.90221, alt: 2393, area: "Alagna" },
  crest2:                { name: "Crest",                        lat: 45.83153, lon: 7.74590, alt: 1990, area: "Ayas" },
  cimalegna:             { name: "Cimalegna",                    lat: 45.87157, lon: 7.88727, alt: 2640, area: "Alagna" },
  collesalati:           { name: "Colle Salati",                 lat: 45.87834, lon: 7.86754, alt: 2994, area: "Gressoney" },
  p82:                   { name: "Champoluc",                    lat: 45.83649, lon: 7.73148, alt: 1584, area: "Ayas", base: true, rifugio: true },
  stafal2:               { name: "Stafal",                       lat: 45.86055, lon: 7.81266, alt: 1838, area: "Gressoney" },
  moos:                  { name: "Moos",                         lat: 45.85982, lon: 7.80929, alt: 1912, area: "Gressoney" },
  belvedere:             { name: "Belvedere",                    lat: 45.84543, lon: 7.75200, alt: 2289, area: "Ayas", rifugio: true },
  p110:                  { name: "Below Passo dei Salati",       lat: 45.87262, lon: 7.87591, alt: 2811, area: "Alagna", named: false },
  collesarezza2:         { name: "Colle Sarezza",                lat: 45.83695, lon: 7.76899, alt: 2634, area: "Ayas" },
  p117:                  { name: "Above Alpe Ostafa",            lat: 45.83532, lon: 7.76518, alt: 2505, area: "Ayas", named: false },
  p118:                  { name: "Ostafa 2 junction",            lat: 45.83081, lon: 7.76084, alt: 2300, area: "Ayas", named: false },
  p120:                  { name: "Below Belvedere",              lat: 45.84907, lon: 7.75599, alt: 2231, area: "Ayas", named: false },
  p121:                  { name: "Above Alpe Mandria",           lat: 45.85583, lon: 7.74922, alt: 2165, area: "Ayas", named: false },
  p122:                  { name: "Above Alpe Mandria",           lat: 45.85764, lon: 7.74717, alt: 2113, area: "Ayas", named: false },
  p123:                  { name: "Below Colle Della Bettaforca", lat: 45.86634, lon: 7.78672, alt: 2585, area: "Gressoney", named: false },
  p124:                  { name: "Above Moos",                   lat: 45.86069, lon: 7.80351, alt: 2091, area: "Gressoney", named: false },
  p125:                  { name: "Below Colle Della Bettaforca", lat: 45.86260, lon: 7.79111, alt: 2474, area: "Gressoney", named: false },
  p126:                  { name: "Above Sant'Anna",              lat: 45.85889, lon: 7.79549, alt: 2320, area: "Gressoney", named: false },
  gabiet3:               { name: "Gabiet",                       lat: 45.85408, lon: 7.84376, alt: 2325, area: "Gressoney" },
  seehorn2:              { name: "Seehorn",                      lat: 45.84987, lon: 7.83906, alt: 2368, area: "Gressoney" },
  p130:                  { name: "Below Seehorn",                lat: 45.85361, lon: 7.83672, alt: 2258, area: "Gressoney", named: false },
  p131:                  { name: "Above Bedemie",                lat: 45.84363, lon: 7.82552, alt: 1972, area: "Gressoney", named: false },
  p135:                  { name: "Above Crest",                  lat: 45.82977, lon: 7.75216, alt: 2095, area: "Ayas", named: false },
  passodeisalati2:       { name: "Passo dei Salati",             lat: 45.87589, lon: 7.86826, alt: 2938, area: "Gressoney", rifugio: true },
  cornodelcamoscio:      { name: "Corno del Camoscio",           lat: 45.87381, lon: 7.86514, alt: 2862, area: "Gressoney" },
  alpemandria3:          { name: "Alpe Mandria",                 lat: 45.86061, lon: 7.75898, alt: 2413, area: "Ayas", rifugio: true },
  p148:                  { name: "Pian de la Sal junction",      lat: 45.85807, lon: 7.75133, alt: 2230, area: "Ayas", named: false },
  colledellabettaforca:  { name: "Colle Della Bettaforca",       lat: 45.86857, lon: 7.78123, alt: 2655, area: "Gressoney" },
  colledellabettaforca2: { name: "Colle Della Bettaforca",       lat: 45.86867, lon: 7.77971, alt: 2631, area: "Gressoney" },
  p152:                  { name: "Below Alpe Mandria",           lat: 45.85933, lon: 7.75284, alt: 2260, area: "Ayas", rifugio: true, named: false },
  p153:                  { name: "Above Cimalegna",              lat: 45.87346, lon: 7.88286, alt: 2731, area: "Alagna", named: false },
  passodeisalati3:       { name: "Passo dei Salati",             lat: 45.87676, lon: 7.87019, alt: 2922, area: "Gressoney" },
  p155:                  { name: "Above Pianalunga-Bocchetta",   lat: 45.86603, lon: 7.90081, alt: 2073, area: "Alagna", named: false },
  p156:                  { name: "Above Sant'Anna",              lat: 45.85799, lon: 7.79865, alt: 2279, area: "Gressoney", rifugio: true, named: false },
  p157:                  { name: "Pistone Betta junction",       lat: 45.85765, lon: 7.79715, alt: 2270, area: "Gressoney", named: false },
  p191:                  { name: "Below Punta Jolanda",          lat: 45.84325, lon: 7.83068, alt: 2132, area: "Gressoney", named: false },
  p192:                  { name: "Below Bocchetta",              lat: 45.87322, lon: 7.90479, alt: 2323, area: "Alagna", named: false },
  p193:                  { name: "Above Pianalunga-Bocchetta",   lat: 45.86790, lon: 7.90766, alt: 2087, area: "Alagna", named: false },
  p217:                  { name: "Above Gabiet",                 lat: 45.85831, lon: 7.84765, alt: 2398, area: "Gressoney", named: false },
  p218:                  { name: "Below Corno del Camoscio",     lat: 45.86722, lon: 7.85945, alt: 2666, area: "Gressoney", named: false },
  lago2:                 { name: "Lago",                         lat: 45.85240, lon: 7.84882, alt: 2368, area: "Gressoney" },
  gabiet4:               { name: "Gabiet",                       lat: 45.85506, lon: 7.84650, alt: 2315, area: "Gressoney" },
  lago3:                 { name: "Lago",                         lat: 45.85311, lon: 7.84687, alt: 2369, area: "Gressoney" },
  gabiet5:               { name: "Gabiet",                       lat: 45.85414, lon: 7.84693, alt: 2332, area: "Gressoney" },
  p225:                  { name: "Del Lago junction",            lat: 45.85617, lon: 7.75927, alt: 2376, area: "Ayas", named: false },
  p226:                  { name: "Del Lago junction",            lat: 45.85555, lon: 7.75421, alt: 2309, area: "Ayas", named: false },
  p227:                  { name: "Ostafa 1 junction",            lat: 45.83191, lon: 7.75827, alt: 2275, area: "Ayas", named: false },
  p228:                  { name: "Ostafa 1 junction",            lat: 45.83073, lon: 7.75498, alt: 2175, area: "Ayas", named: false },
  p229:                  { name: "Ostafa 1 junction",            lat: 45.83093, lon: 7.74734, alt: 2007, area: "Ayas", rifugio: true, named: false },
  crest3:                { name: "Crest",                        lat: 45.83122, lon: 7.74327, alt: 1943, area: "Ayas" },
  alpeostafa2:           { name: "Alpe Ostafa",                  lat: 45.83212, lon: 7.76401, alt: 2378, area: "Ayas", rifugio: true },
  p232:                  { name: "Ostafa 1 junction",            lat: 45.83181, lon: 7.76081, alt: 2332, area: "Ayas", named: false },
  p247:                  { name: "Pistone Betta junction",       lat: 45.85975, lon: 7.79503, alt: 2354, area: "Gressoney", named: false },
  p261:                  { name: "Below Colle Sarezza",          lat: 45.83637, lon: 7.76737, alt: 2575, area: "Ayas", named: false },
};

/** [from, to, name, type, rideMinutes, lastUpMinuteOfDay, typicalQueueMinutes] */
export const LIFTS = [
  ["pianalungabocchetta", "passodeisalati", "Pianalunga - Cimalegna - Salati", "cable car", 7, 960, 6],
  ["alpeostafa", "collesarezza", "Alpe Ostafa - Colle Sarezza II", "chair", 8, 960, 2],
  ["p23", "lagociarcerio", "Lago Ciarcerio - Belvedere", "chair", 5, 960, 5],
  ["gabiet", "passodeisalati", "Gabiet - Passo dei Salati", "gondola", 12, 960, 2],
  ["alagna", "pianalungabocchetta", "Alagna - Pianalunga", "gondola", 12, 960, 3],
  ["gabiet", "lago", "Gabiet - Lago", "chair", 3, 960, 4],
  ["crest", "alpeostafa", "Crest - Alpe Ostafa III", "gondola", 6, 960, 2],
  ["puntajolanda", "puntajolanda2", "Punta Jolanda", "chair", 10, 960, 5],
  ["alpemandria", "alpemandria2", "Alpe Mandria", "chair", 6, 960, 2],
  ["stafal", "santanna", "Stafal - Sant'Anna", "cable car", 2, 960, 5],
  ["santanna", "collebetta", "Sant'Anna - Colle Betta", "chair", 9, 960, 2],
  ["bedemie", "seehorn", "Bedemie - Seehorn", "chair", 12, 960, 4],
  ["stafal", "gabiet", "Stafal - Gabiet", "gondola", 9, 960, 2],
  ["bettaforca", "bettaforca2", "Bettaforca", "chair", 6, 960, 2],
  ["pianalungabocchetta2", "bocchetta", "Pianalunga - Bocchetta", "chair", 8, 960, 4],
  ["crest", "crest2", "Fontaney 2", "carpet", 6, 960, 5],
  ["cimalegna", "collesalati", "Cimalegna-Passo Salati", "chair", 7, 960, 2],
  ["p82", "crest", "Champoluc - Crest", "gondola", 5, 960, 2],
  ["pianalungabocchetta2", "pianalungabocchetta", "Pianalunga", "carpet", 4, 960, 5],
  ["stafal2", "moos", "Moos", "chair", 3, 960, 5],
  ["p23", "belvedere", "Lago Ciarcerio - Belvedere", "chair", 5, 960, 5],
];

/** [from, to, name, difficulty, km, minutes] */
export const RUNS = [
  ["collesarezza", "p120", "Sarezza-Contenéry", "black", 2.2, 8],
  ["p120", "p23", "Sarezza-Contenéry", "black", 0.1, 2],
  ["bettaforca", "alpemandria", "Dei Larici", "red", 2.2, 8],
  ["lagociarcerio", "p226", "Del Lago", "blue", 0.3, 2],
  ["p226", "p121", "Del Lago", "blue", 0.5, 2],
  ["p121", "alpemandria", "Del Lago", "blue", 1.2, 4],
  ["alpemandria2", "alpemandria3", "Del Monte", "red", 0.1, 2],
  ["alpemandria3", "p152", "Del Monte", "red", 0.5, 2],
  ["p152", "p122", "Del Monte", "red", 0.5, 2],
  ["p122", "alpemandria", "Del Monte", "red", 0.4, 2],
  ["moos", "stafal2", "Moos to Stafal", "red", 0.2, 2],
  ["passodeisalati", "passodeisalati3", "Bodwitch", "blue", 0.1, 2],
  ["pianalungabocchetta", "pianalungabocchetta2", "Alagna", "red", 0.1, 2],
  ["bocchetta", "p192", "Mullero", "red", 0.3, 2],
  ["p192", "p155", "Mullero", "red", 1.1, 4],
  ["p155", "pianalungabocchetta", "Mullero", "red", 0.2, 2],
  ["passodeisalati", "cornodelcamoscio", "Salati", "red", 0.5, 2],
  ["cornodelcamoscio", "p218", "Salati", "red", 0.9, 3],
  ["p218", "p217", "Salati", "red", 1.5, 5],
  ["p217", "gabiet", "Salati", "red", 0.3, 2],
  ["crest", "crest3", "Del Bosco", "black", 0.3, 2],
  ["crest3", "p82", "Del Bosco", "black", 1.4, 5],
  ["belvedere", "crest", "Belvedere", "blue", 2, 6],
  ["collesarezza2", "p261", "Sarezza Variante", "red", 0.1, 2],
  ["p261", "p117", "Sarezza Variante", "red", 0.3, 2],
  ["lagociarcerio", "p120", "Contenéry", "red", 0.6, 2],
  ["alpemandria2", "p225", "Del Lago", "blue", 0.5, 2],
  ["p225", "lagociarcerio", "Del Lago", "blue", 0.3, 2],
  ["p121", "p122", "Pian de la Sal", "red", 0.3, 2],
  ["collebetta", "colledellabettaforca", "Pistone Betta", "red", 0.2, 2],
  ["colledellabettaforca", "p123", "Pistone Betta", "red", 0.5, 2],
  ["collebetta", "p123", "Betta 1", "red", 0.6, 2],
  ["santanna", "p124", "Delle Marmotte", "red", 0.8, 3],
  ["p125", "p247", "Pistone Betta", "red", 0.4, 2],
  ["p247", "p126", "Pistone Betta", "red", 0.1, 2],
  ["lago", "lago2", "Castore", "blue", 0.1, 2],
  ["lago2", "gabiet4", "Castore", "blue", 0.4, 2],
  ["gabiet4", "gabiet", "Castore", "blue", 0.1, 2],
  ["lago", "lago3", "Castore-Ricka", "red", 0.1, 2],
  ["lago3", "gabiet3", "Castore-Ricka", "red", 0.3, 2],
  ["seehorn", "seehorn2", "Collegamento Gabiet", "red", 0.1, 2],
  ["seehorn2", "gabiet3", "Collegamento Gabiet", "red", 0.7, 2],
  ["seehorn2", "p130", "Collegamento Ricka", "red", 0.5, 2],
  ["p130", "stafal2", "Moos", "black", 2.5, 10],
  ["bedemie", "puntajolanda", "Jolanda", "red", 1.5, 5],
  ["puntajolanda2", "p131", "Jolanda 1", "black", 0.7, 3],
  ["puntajolanda2", "p191", "Jolanda", "red", 0.5, 2],
  ["p191", "p131", "Jolanda", "red", 0.7, 2],
  ["p131", "bedemie", "Jolanda", "red", 0.2, 2],
  ["seehorn", "puntajolanda2", "Chamois", "red", 1.3, 4],
  ["p124", "moos", "Diretta Staffal", "red", 0.5, 2],
  ["moos", "stafal", "Diretta Staffal", "red", 0.4, 2],
  ["collesarezza", "collesarezza2", "Sarezza", "red", 0.3, 2],
  ["collesarezza2", "p261", "Sarezza", "red", 0.3, 2],
  ["p261", "p117", "Sarezza", "red", 0.3, 2],
  ["p117", "alpeostafa", "Sarezza", "red", 0.3, 2],
  ["gabiet", "p130", "Alpe Ricka", "red", 0.7, 3],
  ["p130", "bedemie", "Alpe Ricka", "red", 1.6, 5],
  ["alpeostafa", "p232", "Ostafa 1", "red", 0.3, 2],
  ["p232", "p227", "Ostafa 1", "red", 0.2, 2],
  ["p227", "p228", "Ostafa 1", "red", 0.5, 2],
  ["p228", "p135", "Ostafa 1", "red", 0.3, 2],
  ["p135", "p229", "Ostafa 1", "red", 0.4, 2],
  ["p229", "crest", "Ostafa 1", "red", 0.3, 2],
  ["alpeostafa", "alpeostafa2", "Ostafa 2", "red", 0.2, 2],
  ["alpeostafa2", "p118", "Ostafa 2", "red", 0.3, 2],
  ["p118", "p135", "Ostafa 2", "red", 0.9, 3],
  ["passodeisalati2", "cornodelcamoscio", "Variante Salati", "red", 0.3, 2],
  ["alpemandria3", "p148", "Pian de la Sal", "red", 0.7, 2],
  ["colledellabettaforca", "colledellabettaforca2", "Colle Della Bettaforca link", "red", 0.2, 2],
  ["p152", "p148", "Pian de la Sal", "red", 0.2, 2],
  ["p148", "p121", "Pian de la Sal", "red", 0.3, 2],
  ["p110", "p153", "Bodwitch", "blue", 0.6, 2],
  ["passodeisalati3", "p153", "Cimalegna", "blue", 1.1, 3],
  ["p153", "cimalegna", "Cimalegna", "blue", 0.4, 2],
  ["alpemandria2", "bettaforca", "Liason", "red", 0.7, 2],
  ["p155", "pianalungabocchetta", "Down to Pianalunga-Bocchetta", "red", 0.4, 2],
  ["p156", "p157", "Above Sant'Anna to Pistone Betta", "red", 0.1, 2],
  ["p126", "p156", "Sant Anna", "red", 0.2, 2],
  ["p157", "santanna", "Pistone Betta", "red", 0.4, 2],
  ["seehorn2", "p191", "Seehorn", "red", 1.2, 4],
  ["p192", "p193", "Mullero Competition", "black", 0.7, 2],
  ["p193", "pianalungabocchetta2", "Mullero Competition", "black", 0.4, 2],
  ["collesalati", "passodeisalati", "Cimalegna", "red", 0.3, 2],
  ["passodeisalati", "passodeisalati3", "Cimalegna", "blue", 0.1, 2],
  ["pianalungabocchetta", "pianalungabocchetta2", "Baby Pianalunga", "blue", 0.1, 2],
  ["passodeisalati", "passodeisalati2", "Variante Salati", "red", 0.1, 2],
  ["lago2", "gabiet5", "Castore", "blue", 0.2, 2],
  ["gabiet5", "gabiet4", "Castore", "blue", 0.1, 2],
  ["lago3", "gabiet5", "Castore", "blue", 0.1, 2],
  ["bocchetta", "p192", "Mullero", "red", 0.3, 2],
  ["gabiet3", "gabiet", "Collegamento Gabiet", "red", 0.1, 2],
  ["p156", "p124", "Nera", "black", 0.6, 2],
  ["p124", "moos", "Delle Marmotte", "red", 1.1, 4],
  ["p156", "santanna", "Sant Anna", "red", 0.5, 2],
  ["p126", "p157", "Above Sant'Anna to Pistone Betta", "red", 0.2, 2],
  ["p123", "p125", "Pistone Betta", "red", 0.5, 2],
  ["p123", "p125", "Fun Slope", "red", 0.8, 3],
  ["bettaforca2", "colledellabettaforca", "Del colle", "red", 0.2, 2],
  ["colledellabettaforca", "colledellabettaforca2", "Del colle", "red", 0.1, 2],
  ["colledellabettaforca2", "bettaforca", "Del colle", "red", 1.5, 5],
  ["p225", "p226", "Del Lago", "blue", 0.5, 2],
  ["belvedere", "p23", "Ciosal", "red", 1.1, 4],
  ["p227", "p228", "Ostafa 1", "red", 0.3, 2],
  ["p229", "crest3", "Ostafa 1 to Crest", "red", 0.3, 2],
  ["crest2", "crest", "Fontaney 2", "blue", 0.1, 2],
  ["p117", "alpeostafa", "Sarezza Variante", "red", 0.3, 2],
  ["alpeostafa2", "p232", "Alpe Ostafa to Ostafa 1", "red", 0.3, 2],
  ["p126", "p157", "Pistone Betta", "red", 0.2, 2],
  ["p247", "p156", "Pistone Betta to Above Sant'Anna", "red", 0.3, 2],
  ["passodeisalati3", "p110", "Bodwitch", "blue", 0.8, 4],
  ["p110", "p155", "Olen", "black", 2.8, 10],
  ["p218", "p217", "Salati 1", "red", 1.4, 4],
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
  ["Alpen stop", "restaurant", 45.86485, 7.90495, 2024],
  ["Alpenhutten Lys", "restaurant", 45.85626, 7.84532, 2323],
  ["Baita Rifugio Belvedere", "restaurant", 45.84496, 7.75166, 2285],
  ["Bar \"Passo da Mania'\"", "cafe", 45.87799, 7.86937, 2947],
  ["Bar du Soleil", "restaurant", 45.85658, 7.74269, 1985],
  ["Bar La Miacceria", "cafe", 45.85445, 7.93691, 1194],
  ["Bar Ristorante Ostafa", "restaurant", 45.83432, 7.76165, 2418],
  ["Bar Ristoro L'Aroula", "restaurant", 45.8285, 7.75145, 2047],
  ["Bar Tavola Calda Del Crest", "restaurant", 45.83275, 7.7427, 1978],
  ["Bedemi", "restaurant", 45.84471, 7.82186, 1900],
  ["Caffé delle Guide", "cafe", 45.85446, 7.9368, 1195],
  ["Campo Base", "restaurant", 45.85992, 7.75969, 2432],
  ["Chaisscheri", "restaurant", 45.85334, 7.93558, 1213],
  ["Chäisscheri", "cafe", 45.85355, 7.93509, 1220],
  ["Dir und Don", "restaurant", 45.8532, 7.93757, 1181],
  ["Edelboden", "cafe", 45.83128, 7.8232, 1638],
  ["Edelweiss", "restaurant", 45.83258, 7.7422, 1967],
  ["FZRY", "restaurant", 45.85943, 7.81274, 1826],
  ["Genzianella", "restaurant", 45.85452, 7.93613, 1201],
  ["Kondor", "restaurant", 45.83667, 7.7309, 1578],
  ["L’Abri du ski", "restaurant", 45.8326, 7.76429, 2396],
  ["La Glisse", "rental", 45.83661, 7.73084, 1578],
  ["La Mandria", "restaurant", 45.85961, 7.75351, 2275],
  ["Le Sapin", "restaurant", 45.83703, 7.73123, 1579],
  ["Novez Cafè Bar", "restaurant", 45.83048, 7.7484, 2027],
  ["Osteria il Balivo", "restaurant", 45.83749, 7.7313, 1575],
  ["Retsignon", "restaurant", 45.85559, 7.74218, 1964],
  ["Rifugio Belvedere", "hut", 45.84494, 7.75156, 2284],
  ["Rifugio Jutz", "hut", 45.85562, 7.80349, 2164],
  ["Ristoro Colle Bettaforca", "restaurant", 45.87026, 7.78197, 2722],
  ["Ristoro Sitten", "restaurant", 45.85776, 7.79949, 2268],
  ["Unione Alagnese", "restaurant", 45.85255, 7.93677, 1192],
  ["Wunderbar", "cafe", 45.85827, 7.81195, 1820],
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
    7.83331,
    45.85406
  ],
  "zoom": 11.7,
  "pitch": 62,
  "bearing": -24,
  "bbox": [
    7.64,
    45.74,
    8,
    45.94
  ],
  "bases": [
    "alagna",
    "stafal",
    "p82"
  ],
  "defaultBase": "stafal",
  "firstLift": 510,
  "lastDown": 990,
  "stats": {
    "lifts": 21,
    "runs": 113,
    "km": 62,
    "top": 2994,
    "bottom": 1220,
    "valleys": 3
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
