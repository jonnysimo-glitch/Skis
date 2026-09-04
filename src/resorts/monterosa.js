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
 *   - 12 nodes, 5 lifts and 11 runs were outside the largest strongly connected component and were dropped
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
  p5:                    { name: "Below Belvedere",              lat: 45.84895, lon: 7.75478, alt: 2219, area: "Ayas", named: false },
  lagociarcerio:         { name: "Lago Ciarcerio",               lat: 45.85396, lon: 7.75812, alt: 2375, area: "Ayas" },
  gabiet:                { name: "Gabiet",                       lat: 45.85540, lon: 7.84495, alt: 2310, area: "Gressoney", rifugio: true },
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
  p31:                   { name: "Champoluc",                    lat: 45.83649, lon: 7.73148, alt: 1584, area: "Ayas", base: true, rifugio: true, named: false },
  stafal2:               { name: "Stafal",                       lat: 45.86055, lon: 7.81266, alt: 1838, area: "Gressoney" },
  moos:                  { name: "Moos",                         lat: 45.85982, lon: 7.80929, alt: 1912, area: "Gressoney" },
  belvedere:             { name: "Belvedere",                    lat: 45.84543, lon: 7.75200, alt: 2289, area: "Ayas", rifugio: true },
  p37:                   { name: "Below Passo dei Salati",       lat: 45.87262, lon: 7.87591, alt: 2811, area: "Alagna", named: false },
  collesarezza2:         { name: "Colle Sarezza",                lat: 45.83695, lon: 7.76899, alt: 2634, area: "Ayas" },
  p40:                   { name: "Above Alpe Ostafa",            lat: 45.83532, lon: 7.76518, alt: 2505, area: "Ayas", named: false },
  p41:                   { name: "Ostafa 2 junction",            lat: 45.83081, lon: 7.76084, alt: 2300, area: "Ayas", named: false },
  p43:                   { name: "Below Belvedere",              lat: 45.84907, lon: 7.75599, alt: 2231, area: "Ayas", named: false },
  p44:                   { name: "Above Alpe Mandria",           lat: 45.85583, lon: 7.74922, alt: 2165, area: "Ayas", named: false },
  p45:                   { name: "Above Alpe Mandria",           lat: 45.85764, lon: 7.74717, alt: 2113, area: "Ayas", named: false },
  p46:                   { name: "Below Colle Della Bettaforca", lat: 45.86634, lon: 7.78672, alt: 2585, area: "Gressoney", named: false },
  p47:                   { name: "Above Moos",                   lat: 45.86069, lon: 7.80351, alt: 2091, area: "Gressoney", named: false },
  p48:                   { name: "Below Colle Della Bettaforca", lat: 45.86260, lon: 7.79111, alt: 2474, area: "Gressoney", named: false },
  p49:                   { name: "Above Sant'Anna",              lat: 45.85889, lon: 7.79549, alt: 2320, area: "Gressoney", named: false },
  gabiet3:               { name: "Gabiet",                       lat: 45.85408, lon: 7.84376, alt: 2325, area: "Gressoney" },
  seehorn2:              { name: "Seehorn",                      lat: 45.84987, lon: 7.83906, alt: 2368, area: "Gressoney" },
  p53:                   { name: "Below Seehorn",                lat: 45.85361, lon: 7.83672, alt: 2258, area: "Gressoney", named: false },
  p54:                   { name: "Above Bedemie",                lat: 45.84363, lon: 7.82552, alt: 1972, area: "Gressoney", named: false },
  p55:                   { name: "Above Crest",                  lat: 45.82977, lon: 7.75216, alt: 2095, area: "Ayas", named: false },
  passodeisalati2:       { name: "Passo dei Salati",             lat: 45.87589, lon: 7.86826, alt: 2938, area: "Gressoney", rifugio: true },
  cornodelcamoscio:      { name: "Corno del Camoscio",           lat: 45.87381, lon: 7.86514, alt: 2862, area: "Gressoney" },
  alpemandria3:          { name: "Alpe Mandria",                 lat: 45.86061, lon: 7.75898, alt: 2413, area: "Ayas", rifugio: true },
  p59:                   { name: "Pian de la Sal junction",      lat: 45.85807, lon: 7.75133, alt: 2230, area: "Ayas", named: false },
  colledellabettaforca:  { name: "Colle Della Bettaforca",       lat: 45.86857, lon: 7.78123, alt: 2655, area: "Gressoney" },
  colledellabettaforca2: { name: "Colle Della Bettaforca",       lat: 45.86867, lon: 7.77971, alt: 2631, area: "Gressoney" },
  p63:                   { name: "Below Alpe Mandria",           lat: 45.85933, lon: 7.75284, alt: 2260, area: "Ayas", rifugio: true, named: false },
  p64:                   { name: "Above Cimalegna",              lat: 45.87346, lon: 7.88286, alt: 2731, area: "Alagna", named: false },
  passodeisalati3:       { name: "Passo dei Salati",             lat: 45.87676, lon: 7.87019, alt: 2922, area: "Gressoney" },
  p66:                   { name: "Above Pianalunga-Bocchetta",   lat: 45.86603, lon: 7.90081, alt: 2073, area: "Alagna", named: false },
  p67:                   { name: "Above Sant'Anna",              lat: 45.85799, lon: 7.79865, alt: 2279, area: "Gressoney", rifugio: true, named: false },
  p68:                   { name: "Pistone Betta junction",       lat: 45.85765, lon: 7.79715, alt: 2270, area: "Gressoney", named: false },
  p69:                   { name: "Below Punta Jolanda",          lat: 45.84325, lon: 7.83068, alt: 2132, area: "Gressoney", named: false },
  p70:                   { name: "Below Bocchetta",              lat: 45.87322, lon: 7.90479, alt: 2323, area: "Alagna", named: false },
  p71:                   { name: "Above Pianalunga-Bocchetta",   lat: 45.86790, lon: 7.90766, alt: 2087, area: "Alagna", named: false },
  p74:                   { name: "Above Gabiet",                 lat: 45.85831, lon: 7.84765, alt: 2398, area: "Gressoney", named: false },
  p75:                   { name: "Below Corno del Camoscio",     lat: 45.86722, lon: 7.85945, alt: 2666, area: "Gressoney", named: false },
  lago2:                 { name: "Lago",                         lat: 45.85240, lon: 7.84882, alt: 2368, area: "Gressoney" },
  gabiet4:               { name: "Gabiet",                       lat: 45.85506, lon: 7.84650, alt: 2315, area: "Gressoney" },
  lago3:                 { name: "Lago",                         lat: 45.85311, lon: 7.84687, alt: 2369, area: "Gressoney" },
  gabiet5:               { name: "Gabiet",                       lat: 45.85414, lon: 7.84693, alt: 2332, area: "Gressoney" },
  p82:                   { name: "Del Lago junction",            lat: 45.85617, lon: 7.75927, alt: 2376, area: "Ayas", named: false },
  p83:                   { name: "Del Lago junction",            lat: 45.85555, lon: 7.75421, alt: 2309, area: "Ayas", named: false },
  p84:                   { name: "Ostafa 1 junction",            lat: 45.83191, lon: 7.75827, alt: 2275, area: "Ayas", named: false },
  p85:                   { name: "Ostafa 1 junction",            lat: 45.83073, lon: 7.75498, alt: 2175, area: "Ayas", named: false },
  p86:                   { name: "Ostafa 1 junction",            lat: 45.83093, lon: 7.74734, alt: 2007, area: "Ayas", rifugio: true, named: false },
  crest3:                { name: "Crest",                        lat: 45.83122, lon: 7.74327, alt: 1943, area: "Ayas" },
  alpeostafa2:           { name: "Alpe Ostafa",                  lat: 45.83212, lon: 7.76401, alt: 2378, area: "Ayas", rifugio: true },
  p89:                   { name: "Ostafa 1 junction",            lat: 45.83181, lon: 7.76081, alt: 2332, area: "Ayas", named: false },
  p90:                   { name: "Pistone Betta junction",       lat: 45.85975, lon: 7.79503, alt: 2354, area: "Gressoney", named: false },
  p91:                   { name: "Below Colle Sarezza",          lat: 45.83637, lon: 7.76737, alt: 2575, area: "Ayas", named: false },
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
  ["pianalungabocchetta2", "bocchetta", "Pianalunga - Bocchetta", "chair", 8, 960, 4],
  ["crest", "crest2", "Fontaney 2", "carpet", 6, 960, 5],
  ["cimalegna", "collesalati", "Cimalegna-Passo Salati", "chair", 7, 960, 2],
  ["p31", "crest", "Champoluc - Crest", "gondola", 5, 960, 2],
  ["pianalungabocchetta2", "pianalungabocchetta", "Pianalunga", "carpet", 4, 960, 5],
  ["stafal2", "moos", "Moos", "chair", 3, 960, 5],
  ["p5", "belvedere", "Lago Ciarcerio - Belvedere", "chair", 5, 960, 5],
];

/** [from, to, name, difficulty, km, minutes] */
export const RUNS = [
  ["collesarezza", "p43", "Sarezza-Contenéry", "black", 2.2, 8],
  ["p43", "p5", "Sarezza-Contenéry", "black", 0.1, 2],
  ["bettaforca", "alpemandria", "Dei Larici", "red", 2.2, 8],
  ["lagociarcerio", "p83", "Del Lago", "blue", 0.3, 2],
  ["p83", "p44", "Del Lago", "blue", 0.5, 2],
  ["p44", "alpemandria", "Del Lago", "blue", 1.2, 4],
  ["alpemandria2", "alpemandria3", "Del Monte", "red", 0.1, 2],
  ["alpemandria3", "p63", "Del Monte", "red", 0.5, 2],
  ["p63", "p45", "Del Monte", "red", 0.5, 2],
  ["p45", "alpemandria", "Del Monte", "red", 0.4, 2],
  ["moos", "stafal2", "Moos to Stafal", "red", 0.2, 2],
  ["passodeisalati", "passodeisalati3", "Bodwitch", "blue", 0.1, 2],
  ["pianalungabocchetta", "pianalungabocchetta2", "Alagna", "red", 0.1, 2],
  ["bocchetta", "p70", "Mullero", "red", 0.3, 2],
  ["p70", "p66", "Mullero", "red", 1.1, 4],
  ["p66", "pianalungabocchetta", "Mullero", "red", 0.2, 2],
  ["passodeisalati", "cornodelcamoscio", "Salati", "red", 0.5, 2],
  ["cornodelcamoscio", "p75", "Salati", "red", 0.9, 3],
  ["p75", "p74", "Salati", "red", 1.5, 5],
  ["p74", "gabiet", "Salati", "red", 0.3, 2],
  ["crest", "crest3", "Del Bosco", "black", 0.3, 2],
  ["crest3", "p31", "Del Bosco", "black", 1.4, 5],
  ["belvedere", "crest", "Belvedere", "blue", 2, 6],
  ["collesarezza2", "p91", "Sarezza Variante", "red", 0.1, 2],
  ["p91", "p40", "Sarezza Variante", "red", 0.3, 2],
  ["lagociarcerio", "p43", "Contenéry", "red", 0.6, 2],
  ["alpemandria2", "p82", "Del Lago", "blue", 0.5, 2],
  ["p82", "lagociarcerio", "Del Lago", "blue", 0.3, 2],
  ["p44", "p45", "Pian de la Sal", "red", 0.3, 2],
  ["collebetta", "colledellabettaforca", "Pistone Betta", "red", 0.2, 2],
  ["colledellabettaforca", "p46", "Pistone Betta", "red", 0.5, 2],
  ["collebetta", "p46", "Betta 1", "red", 0.6, 2],
  ["santanna", "p47", "Delle Marmotte", "red", 0.8, 3],
  ["p48", "p90", "Pistone Betta", "red", 0.4, 2],
  ["p90", "p49", "Pistone Betta", "red", 0.1, 2],
  ["lago", "lago2", "Castore", "blue", 0.1, 2],
  ["lago2", "gabiet4", "Castore", "blue", 0.4, 2],
  ["gabiet4", "gabiet", "Castore", "blue", 0.1, 2],
  ["lago", "lago3", "Castore-Ricka", "red", 0.1, 2],
  ["lago3", "gabiet3", "Castore-Ricka", "red", 0.3, 2],
  ["seehorn", "seehorn2", "Collegamento Gabiet", "red", 0.1, 2],
  ["seehorn2", "gabiet3", "Collegamento Gabiet", "red", 0.7, 2],
  ["seehorn2", "p53", "Collegamento Ricka", "red", 0.5, 2],
  ["p53", "stafal2", "Moos", "black", 2.5, 10],
  ["bedemie", "puntajolanda", "Jolanda", "red", 1.5, 5],
  ["puntajolanda2", "p54", "Jolanda 1", "black", 0.7, 3],
  ["puntajolanda2", "p69", "Jolanda", "red", 0.5, 2],
  ["p69", "p54", "Jolanda", "red", 0.7, 2],
  ["p54", "bedemie", "Jolanda", "red", 0.2, 2],
  ["seehorn", "puntajolanda2", "Chamois", "red", 1.3, 4],
  ["p47", "moos", "Diretta Staffal", "red", 0.5, 2],
  ["moos", "stafal", "Diretta Staffal", "red", 0.4, 2],
  ["collesarezza", "collesarezza2", "Sarezza", "red", 0.3, 2],
  ["collesarezza2", "p91", "Sarezza", "red", 0.3, 2],
  ["p91", "p40", "Sarezza", "red", 0.3, 2],
  ["p40", "alpeostafa", "Sarezza", "red", 0.3, 2],
  ["gabiet", "p53", "Alpe Ricka", "red", 0.7, 3],
  ["p53", "bedemie", "Alpe Ricka", "red", 1.6, 5],
  ["alpeostafa", "p89", "Ostafa 1", "red", 0.3, 2],
  ["p89", "p84", "Ostafa 1", "red", 0.2, 2],
  ["p84", "p85", "Ostafa 1", "red", 0.5, 2],
  ["p85", "p55", "Ostafa 1", "red", 0.3, 2],
  ["p55", "p86", "Ostafa 1", "red", 0.4, 2],
  ["p86", "crest", "Ostafa 1", "red", 0.3, 2],
  ["alpeostafa", "alpeostafa2", "Ostafa 2", "red", 0.2, 2],
  ["alpeostafa2", "p41", "Ostafa 2", "red", 0.3, 2],
  ["p41", "p55", "Ostafa 2", "red", 0.9, 3],
  ["passodeisalati2", "cornodelcamoscio", "Variante Salati", "red", 0.3, 2],
  ["alpemandria3", "p59", "Pian de la Sal", "red", 0.7, 2],
  ["colledellabettaforca", "colledellabettaforca2", "Colle Della Bettaforca to Colle Della Bettaforca", "red", 0.2, 2],
  ["p63", "p59", "Pian de la Sal", "red", 0.2, 2],
  ["p59", "p44", "Pian de la Sal", "red", 0.3, 2],
  ["p37", "p64", "Bodwitch", "blue", 0.6, 2],
  ["passodeisalati3", "p64", "Cimalegna", "blue", 1.1, 3],
  ["p64", "cimalegna", "Cimalegna", "blue", 0.4, 2],
  ["alpemandria2", "bettaforca", "Liason", "red", 0.7, 2],
  ["p66", "pianalungabocchetta", "Point 66 to Pianalunga-Bocchetta", "red", 0.4, 2],
  ["p67", "p68", "Point 67 to Point 68", "red", 0.1, 2],
  ["p49", "p67", "Sant Anna", "red", 0.2, 2],
  ["p68", "santanna", "Pistone Betta", "red", 0.4, 2],
  ["seehorn2", "p69", "Seehorn", "red", 1.2, 4],
  ["p70", "p71", "Mullero Competition", "black", 0.7, 2],
  ["p71", "pianalungabocchetta2", "Mullero Competition", "black", 0.4, 2],
  ["collesalati", "passodeisalati", "Cimalegna", "red", 0.3, 2],
  ["passodeisalati", "passodeisalati3", "Cimalegna", "blue", 0.1, 2],
  ["pianalungabocchetta", "pianalungabocchetta2", "Baby Pianalunga", "blue", 0.1, 2],
  ["passodeisalati", "passodeisalati2", "Variante Salati", "red", 0.1, 2],
  ["lago2", "gabiet5", "Castore", "blue", 0.2, 2],
  ["gabiet5", "gabiet4", "Castore", "blue", 0.1, 2],
  ["lago3", "gabiet5", "Castore", "blue", 0.1, 2],
  ["bocchetta", "p70", "Mullero", "red", 0.3, 2],
  ["gabiet3", "gabiet", "Collegamento Gabiet", "red", 0.1, 2],
  ["p67", "p47", "Nera", "black", 0.6, 2],
  ["p47", "moos", "Delle Marmotte", "red", 1.1, 4],
  ["p67", "santanna", "Sant Anna", "red", 0.5, 2],
  ["p49", "p68", "Point 49 to Point 68", "red", 0.2, 2],
  ["p46", "p48", "Pistone Betta", "red", 0.5, 2],
  ["p46", "p48", "Fun Slope", "red", 0.8, 3],
  ["bettaforca2", "colledellabettaforca", "Del colle", "red", 0.2, 2],
  ["colledellabettaforca", "colledellabettaforca2", "Del colle", "red", 0.1, 2],
  ["colledellabettaforca2", "bettaforca", "Del colle", "red", 1.5, 5],
  ["p82", "p83", "Del Lago", "blue", 0.5, 2],
  ["belvedere", "p5", "Ciosal", "red", 1.1, 4],
  ["p84", "p85", "Ostafa 1", "red", 0.3, 2],
  ["p86", "crest3", "Point 86 to Crest", "red", 0.3, 2],
  ["crest2", "crest", "Fontaney 2", "blue", 0.1, 2],
  ["p40", "alpeostafa", "Sarezza Variante", "red", 0.3, 2],
  ["alpeostafa2", "p89", "Alpe Ostafa to Point 89", "red", 0.3, 2],
  ["p49", "p68", "Pistone Betta", "red", 0.2, 2],
  ["p90", "p67", "Point 90 to Point 67", "red", 0.3, 2],
  ["passodeisalati3", "p37", "Bodwitch", "blue", 0.8, 4],
  ["p37", "p66", "Olen", "black", 2.8, 10],
  ["p75", "p74", "Salati 1", "red", 1.4, 4],
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
    "p31"
  ],
  "defaultBase": "stafal",
  "firstLift": 510,
  "lastDown": 990,
  "stats": {
    "lifts": 20,
    "runs": 113,
    "km": 62,
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
