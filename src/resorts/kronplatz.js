/**
 * Kronplatz — resort graph.
 *
 * GENERATED. Do not edit by hand: run `npm run resort -- kronplatz` instead.
 *
 * Source:    OpenStreetMap via the Overpass API, 2026-09-05T17:27:17.846Z
 * Elevation: AWS Terrain Tiles (terrarium), zoom 13
 * Licence:   OSM data is ODbL. Attribution is required wherever this is shown.
 *
 * What had to be assumed:
 *   - 46 runs were unnamed and are described by their endpoints
 *   - 14 nodes, 3 lifts and 18 runs were outside the largest strongly connected component and were dropped
 *   - endpoints within 90 m of each other were treated as the same place
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
  olangivaldaorai:    { name: "Olang I - Valdaora I",         lat: 46.74533, lon: 12.00933, alt: 1193, area: "St. Vigil" },
  arndt:              { name: "Arndt",                        lat: 46.74336, lon: 11.99011, alt: 1688, area: "St. Vigil" },
  sonne:              { name: "Sonne",                        lat: 46.73192, lon: 11.96090, alt: 2069, area: "St. Vigil", rifugio: true },
  belvedere:          { name: "Belvedere",                    lat: 46.73824, lon: 11.95890, alt: 2265, area: "St. Vigil", rifugio: true },
  olangivaldaorai2:   { name: "Olang I - Valdaora I",         lat: 46.74669, lon: 12.01065, alt: 1165, area: "St. Vigil", base: true },
  olangiii:           { name: "Olang I / II",                 lat: 46.74304, lon: 11.97325, alt: 2057, area: "St. Vigil" },
  arndt2:             { name: "Arndt",                        lat: 46.74419, lon: 11.99072, alt: 1669, area: "St. Vigil", rifugio: true },
  kronplatz2000:      { name: "Kronplatz 2000",               lat: 46.77179, lon: 11.94122, alt: 954, area: "Bruneck", base: true, rifugio: true },
  kronplatziii:       { name: "Kronplatz I / II",             lat: 46.74881, lon: 11.95243, alt: 1860, area: "Bruneck" },
  korer:              { name: "Korer",                        lat: 46.77270, lon: 11.93989, alt: 942, area: "Percha", base: true },
  p11:                { name: "Above Kronplatz 2000",         lat: 46.76423, lon: 11.94318, alt: 1099, area: "Bruneck", named: false },
  kronplatzii:        { name: "Kronplatz II",                 lat: 46.73908, lon: 11.95756, alt: 2259, area: "St. Vigil", rifugio: true },
  ruis:               { name: "Ruis",                         lat: 46.72480, lon: 11.96400, alt: 1762, area: "St. Vigil" },
  riedgipfelbahn:     { name: "Ried / Gipfelbahn",            lat: 46.75417, lon: 11.95854, alt: 1730, area: "Bruneck", rifugio: true },
  costa:              { name: "Costa",                        lat: 46.72273, lon: 11.96410, alt: 1736, area: "St. Vigil", rifugio: true },
  predaperes:         { name: "Pré da Peres",                 lat: 46.71615, lon: 11.97043, alt: 2008, area: "St. Vigil" },
  miara:              { name: "Miara",                        lat: 46.70449, lon: 11.93023, alt: 1221, area: "St. Vigil", base: true, rifugio: true },
  skitransbronta:     { name: "Skitrans Bronta",              lat: 46.70085, lon: 11.92720, alt: 1181, area: "St. Vigil", rifugio: true },
  pedagapizdeplaies:  { name: "Pedagà / Piz de Plaies",       lat: 46.69676, lon: 11.92135, alt: 1326, area: "St. Vigil" },
  coldancona:         { name: "Col d'Ancona",                 lat: 46.69847, lon: 11.91295, alt: 1596, area: "St. Vigil", rifugio: true },
  piculin:            { name: "Piculin",                      lat: 46.69233, lon: 11.89281, alt: 1097, area: "St. Vigil" },
  miara2:             { name: "Miara",                        lat: 46.71121, lon: 11.95120, alt: 1478, area: "St. Vigil" },
  coltoron:           { name: "Col Toron",                    lat: 46.71908, lon: 11.96456, alt: 1814, area: "St. Vigil" },
  costa2:             { name: "Costa",                        lat: 46.72689, lon: 11.96879, alt: 1845, area: "St. Vigil" },
  marchner:           { name: "Marchner",                     lat: 46.73366, lon: 11.99452, alt: 1559, area: "St. Vigil", rifugio: true },
  belvedere2:         { name: "Belvedere",                    lat: 46.73669, lon: 11.97309, alt: 2006, area: "St. Vigil" },
  rara:               { name: "Rara",                         lat: 46.72160, lon: 11.95973, alt: 1698, area: "St. Vigil" },
  cianross:           { name: "Cianross",                     lat: 46.69754, lon: 11.92819, alt: 1216, area: "St. Vigil" },
  cianross2:          { name: "Cianross",                     lat: 46.69653, lon: 11.92471, alt: 1294, area: "St. Vigil" },
  ried:               { name: "Ried",                         lat: 46.79024, lon: 11.97811, alt: 925, area: "Bruneck", rifugio: true },
  alpenconnect:       { name: "Alpen Connect",                lat: 46.75212, lon: 11.99296, alt: 1619, area: "Bruneck", rifugio: true },
  alpenconnect2:      { name: "Alpen Connect",                lat: 46.74313, lon: 11.96757, alt: 2140, area: "St. Vigil" },
  p41:                { name: "Above Arndt",                  lat: 46.75028, lon: 11.98291, alt: 1803, area: "Bruneck", rifugio: true, named: false },
  olangiii2:          { name: "Olang I / II",                 lat: 46.74545, lon: 11.97424, alt: 2027, area: "Bruneck" },
  arndt3:             { name: "Arndt",                        lat: 46.74517, lon: 11.98831, alt: 1721, area: "St. Vigil" },
  p44:                { name: "Above Alpen Connect",          lat: 46.75150, lon: 11.98428, alt: 1777, area: "Bruneck", rifugio: true, named: false },
  pedagapizdeplaies2: { name: "Pedagà / Piz de Plaies",       lat: 46.69657, lon: 11.91976, alt: 1352, area: "St. Vigil" },
  p46:                { name: "Above Kronplatz 2000",         lat: 46.76824, lon: 11.94286, alt: 1016, area: "Bruneck", named: false },
  ruis2:              { name: "Ruis",                         lat: 46.72548, lon: 11.96662, alt: 1803, area: "St. Vigil" },
  p48:                { name: "Above Kronplatz I / II",       lat: 46.74433, lon: 11.95574, alt: 2088, area: "Bruneck", named: false },
  p49:                { name: "Above Kronplatz I / II",       lat: 46.74410, lon: 11.95301, alt: 2052, area: "Bruneck", named: false },
  coltoron2:          { name: "Col Toron",                    lat: 46.72098, lon: 11.96452, alt: 1764, area: "St. Vigil" },
  p51:                { name: "Below Kronplatz II",           lat: 46.74220, lon: 11.95441, alt: 2152, area: "Bruneck", named: false },
  p52:                { name: "Above Kronplatz I / II",       lat: 46.74633, lon: 11.94993, alt: 1956, area: "Bruneck", named: false },
  p53:                { name: "Below Olang I / II",           lat: 46.75140, lon: 11.98125, alt: 1838, area: "Bruneck", rifugio: true, named: false },
  costa3:             { name: "Costa",                        lat: 46.72859, lon: 11.96723, alt: 1875, area: "St. Vigil", rifugio: true },
  costa4:             { name: "Costa",                        lat: 46.72768, lon: 11.96796, alt: 1853, area: "St. Vigil" },
  p56:                { name: "Below Sonne",                  lat: 46.73239, lon: 11.96610, alt: 2051, area: "St. Vigil", named: false },
  p57:                { name: "Below Costa",                  lat: 46.72748, lon: 11.96518, alt: 1839, area: "St. Vigil", named: false },
  p58:                { name: "Alpen junction",               lat: 46.74676, lon: 11.97456, alt: 2017, area: "Bruneck", named: false },
  p60:                { name: "Above Kronplatz I / II",       lat: 46.74456, lon: 11.95444, alt: 2068, area: "Bruneck", named: false },
  kronplatziii2:      { name: "Kronplatz I / II",             lat: 46.74756, lon: 11.95154, alt: 1914, area: "Bruneck" },
  pedagapizdeplaies3: { name: "Pedagà / Piz de Plaies",       lat: 46.69884, lon: 11.92073, alt: 1373, area: "St. Vigil" },
  costa5:             { name: "Costa",                        lat: 46.72889, lon: 11.96920, alt: 1889, area: "St. Vigil" },
  olangii:            { name: "Olang II",                     lat: 46.74017, lon: 11.96154, alt: 2244, area: "St. Vigil" },
  arndt4:             { name: "Arndt",                        lat: 46.74115, lon: 11.97168, alt: 2073, area: "St. Vigil" },
  costa6:             { name: "Costa",                        lat: 46.72683, lon: 11.96733, alt: 1838, area: "St. Vigil" },
  p67:                { name: "Furcia 12 junction",           lat: 46.73033, lon: 11.95919, alt: 2040, area: "St. Vigil", rifugio: true, named: false },
  sonne2:             { name: "Sonne",                        lat: 46.73352, lon: 11.96129, alt: 2112, area: "St. Vigil" },
  p69:                { name: "Above Costa",                  lat: 46.73212, lon: 11.96966, alt: 1993, area: "St. Vigil", named: false },
  p70:                { name: "Above Kronplatz I / II",       lat: 46.74984, lon: 11.95732, alt: 1901, area: "Bruneck", named: false },
  kronplatz20003:     { name: "Kronplatz 2000",               lat: 46.76969, lon: 11.94207, alt: 984, area: "Bruneck" },
  p72:                { name: "Pramstall junction",           lat: 46.74770, lon: 11.95660, alt: 1985, area: "Bruneck", named: false },
  p73:                { name: "Above Kronplatz I / II",       lat: 46.74838, lon: 11.95742, alt: 1955, area: "Bruneck", named: false },
  p75:                { name: "Above Marchner",               lat: 46.73479, lon: 11.98960, alt: 1682, area: "St. Vigil", named: false },
  p76:                { name: "Below Olang I / II",           lat: 46.75037, lon: 11.97653, alt: 1938, area: "Bruneck", named: false },
  alpenconnect3:      { name: "Alpen Connect",                lat: 46.74206, lon: 11.96659, alt: 2164, area: "St. Vigil" },
  p80:                { name: "Col Toron junction",           lat: 46.71341, lon: 11.95307, alt: 1545, area: "St. Vigil", named: false },
  ruis3:              { name: "Ruis",                         lat: 46.73736, lon: 11.95584, alt: 2255, area: "St. Vigil" },
  p82:                { name: "Korer junction",               lat: 46.76851, lon: 11.94166, alt: 1002, area: "Bruneck", named: false },
  costa7:             { name: "Costa",                        lat: 46.72532, lon: 11.96844, alt: 1821, area: "St. Vigil" },
  predaperes2:        { name: "Pré da Peres",                 lat: 46.72413, lon: 11.96628, alt: 1784, area: "St. Vigil" },
  p85:                { name: "Above Belvedere",              lat: 46.73664, lon: 11.96874, alt: 2074, area: "St. Vigil", named: false },
  p86:                { name: "Above Marchner",               lat: 46.73361, lon: 11.99071, alt: 1649, area: "St. Vigil", named: false },
  belvedere3:         { name: "Belvedere",                    lat: 46.73711, lon: 11.97174, alt: 2034, area: "St. Vigil" },
  marchner2:          { name: "Marchner",                     lat: 46.73634, lon: 11.97489, alt: 1967, area: "St. Vigil" },
  costa8:             { name: "Costa",                        lat: 46.72774, lon: 11.96654, alt: 1852, area: "St. Vigil", rifugio: true },
  sonne3:             { name: "Sonne",                        lat: 46.73207, lon: 11.95838, alt: 2088, area: "St. Vigil", rifugio: true },
  p94:                { name: "Above Pedagà / Piz de Plaies", lat: 46.69974, lon: 11.91843, alt: 1456, area: "St. Vigil", named: false },
  skitransbronta2:    { name: "Skitrans Bronta",              lat: 46.70011, lon: 11.92463, alt: 1233, area: "St. Vigil" },
  p97:                { name: "Seewiese junction",            lat: 46.74465, lon: 11.94845, alt: 2021, area: "Bruneck", named: false },
  p98:                { name: "Below Olang I / II",           lat: 46.74447, lon: 11.97855, alt: 1956, area: "St. Vigil", named: false },
  cianross3:          { name: "Cianross",                     lat: 46.69805, lon: 11.92323, alt: 1289, area: "St. Vigil" },
  arndt5:             { name: "Arndt",                        lat: 46.74504, lon: 11.99257, alt: 1624, area: "St. Vigil" },
};

/** [from, to, name, type, rideMinutes, lastUpMinuteOfDay, typicalQueueMinutes] */
export const LIFTS = [
  ["olangivaldaorai", "arndt", "Lorenzi", "gondola", 6, 1000, 5],
  ["sonne", "belvedere", "Sonne", "chair", 4, 1000, 2],
  ["olangivaldaorai2", "olangiii", "Olang I", "gondola", 10, 1000, 1],
  ["olangiii", "belvedere", "Olang II", "gondola", 4, 1000, 1],
  ["arndt2", "olangiii", "Arndt", "chair", 7, 1000, 2],
  ["kronplatz2000", "kronplatziii", "Kronplatz I - Plan de Corones I", "gondola", 10, 1000, 2],
  ["korer", "p11", "Korer", "gondola", 5, 1000, 2],
  ["kronplatz2000", "kronplatzii", "Kronplatz 2000", "gondola", 13, 1000, 2],
  ["olangiii", "belvedere", "Plateau", "chair", 5, 1000, 1],
  ["ruis", "belvedere", "Ruis", "gondola", 7, 1000, 2],
  ["riedgipfelbahn", "kronplatzii", "Gipfelbahn", "gondola", 6, 1000, 1],
  ["costa", "predaperes", "Pré da Peres", "gondola", 4, 1000, 2],
  ["skitransbronta", "miara", "Skitrans Bronta", "gondola", 3, 1000, 2],
  ["skitransbronta", "pedagapizdeplaies", "Pedagà", "gondola", 3, 1000, 2],
  ["pedagapizdeplaies", "coldancona", "Piz de Plaies", "gondola", 6, 1000, 2],
  ["piculin", "coldancona", "Piculin", "gondola", 6, 1000, 2],
  ["miara", "miara2", "Miara", "gondola", 6, 1000, 2],
  ["miara2", "coltoron", "Col Toron", "gondola", 6, 1000, 2],
  ["costa", "costa2", "Costa", "chair", 4, 1000, 2],
  ["marchner", "belvedere2", "Marchner", "gondola", 6, 1000, 2],
  ["belvedere2", "belvedere", "Belvedere", "gondola", 5, 1000, 1],
  ["rara", "coltoron", "Rara", "gondola", 3, 1000, 2],
  ["cianross", "cianross2", "Cianross", "gondola", 2, 1000, 4],
  ["kronplatziii", "kronplatzii", "Kronplatz II", "gondola", 5, 1000, 2],
  ["ried", "riedgipfelbahn", "Ried", "gondola", 14, 1000, 2],
  ["alpenconnect", "alpenconnect2", "Alpen Connecting", "gondola", 8, 1000, 2],
];

/** [from, to, name, difficulty, km, minutes] */
export const RUNS = [
  ["olangiii", "p98", "Ruipa", "blue", 0.3, 2],
  ["p41", "p44", "Pracken", "blue", 0.1, 2],
  ["p44", "alpenconnect", "Pracken", "blue", 0.7, 2],
  ["olangiii2", "p98", "Gassl", "red", 0.4, 2],
  ["p98", "arndt3", "Gassl", "red", 0.7, 2],
  ["olangiii", "olangiii2", "Alpen", "blue", 0.1, 2],
  ["olangiii2", "p58", "Alpen", "blue", 0.1, 2],
  ["p58", "p53", "Alpen", "blue", 0.7, 2],
  ["p53", "p44", "Alpen", "blue", 0.3, 2],
  ["belvedere2", "marchner2", "Marchner", "blue", 0.2, 2],
  ["marchner2", "p75", "Marchner", "blue", 1.1, 3],
  ["p75", "p86", "Marchner", "blue", 0.2, 2],
  ["p86", "marchner", "Marchner", "blue", 0.4, 2],
  ["predaperes", "coltoron", "Pré da Peres 32 V", "red", 0.5, 2],
  ["predaperes", "coltoron", "Pre da Peres 32", "red", 0.5, 2],
  ["coltoron", "costa", "Pre da Peres 32", "red", 0.4, 2],
  ["coldancona", "pedagapizdeplaies2", "Piz de Plaies", "red", 1.2, 4],
  ["belvedere", "belvedere3", "Belvedere", "blue", 0.9, 3],
  ["belvedere3", "belvedere2", "Belvedere", "blue", 0.1, 2],
  ["cianross2", "cianross3", "Corn", "blue", 0.2, 2],
  ["cianross3", "cianross", "Corn", "blue", 0.4, 2],
  ["kronplatziii", "riedgipfelbahn", "Seewiese 2", "red", 0.8, 3],
  ["belvedere", "p73", "Herrnegg", "black", 1, 4],
  ["p73", "p70", "Herrnegg", "black", 0.2, 2],
  ["p70", "riedgipfelbahn", "Herrnegg", "black", 0.5, 2],
  ["riedgipfelbahn", "p46", "Herrnegg", "black", 2.6, 9],
  ["costa4", "costa2", "Costa", "blue", 0.1, 2],
  ["costa4", "costa6", "Costa", "blue", 0.1, 2],
  ["costa6", "ruis2", "Costa", "blue", 0.2, 2],
  ["coltoron", "rara", "Rara", "red", 0.4, 2],
  ["coldancona", "p94", "Erta", "black", 0.6, 2],
  ["p94", "pedagapizdeplaies3", "Erta", "black", 0.2, 2],
  ["pedagapizdeplaies3", "skitransbronta2", "Erta", "black", 0.3, 2],
  ["skitransbronta2", "skitransbronta", "Erta", "black", 0.2, 2],
  ["p48", "p60", "Seewiese", "red", 0.1, 2],
  ["p60", "p49", "Seewiese", "red", 0.1, 2],
  ["coltoron", "coltoron2", "Rara 31", "blue", 0.2, 2],
  ["p51", "p97", "Seewiese", "red", 0.6, 2],
  ["p97", "p52", "Seewiese", "red", 0.2, 2],
  ["p53", "p41", "Arndt", "red", 0.2, 2],
  ["costa3", "p57", "Furcia 9", "blue", 0.2, 2],
  ["p57", "ruis", "Furcia 9", "blue", 0.3, 2],
  ["belvedere", "kronplatzii", "Belvedere to Kronplatz II", "blue", 0.1, 2],
  ["belvedere", "p69", "Furcia 9", "blue", 1, 3],
  ["p69", "costa5", "Furcia 9", "blue", 0.5, 2],
  ["costa5", "costa4", "Furcia 9", "blue", 0.2, 2],
  ["belvedere", "p56", "Furcia 9A - Picio Jarú", "blue", 0.8, 2],
  ["alpenconnect2", "olangiii", "Plateau", "blue", 0.4, 2],
  ["belvedere", "olangii", "Olang 2", "blue", 0.2, 2],
  ["olangii", "alpenconnect3", "Olang 2", "blue", 0.4, 2],
  ["alpenconnect3", "alpenconnect2", "Olang 2", "blue", 0.1, 2],
  ["alpenconnect2", "olangiii", "Olang 2", "blue", 0.3, 2],
  ["costa4", "costa8", "Furcia 9 B", "blue", 0.1, 2],
  ["costa8", "p57", "Furcia 9 B", "blue", 0.1, 2],
  ["alpenconnect2", "p76", "Spitzhorn", "blue", 1.1, 3],
  ["p76", "p53", "Spitzhorn", "blue", 0.4, 2],
  ["belvedere", "sonne2", "Sonne", "blue", 0.5, 2],
  ["sonne2", "sonne", "Sonne", "blue", 0.2, 2],
  ["coltoron", "coltoron2", "Rara 31", "blue", 0.1, 2],
  ["coltoron2", "costa", "Rara 31", "blue", 0.2, 2],
  ["costa", "rara", "Rara 31", "blue", 0.3, 2],
  ["p11", "p82", "Korer", "blue", 0.4, 2],
  ["p82", "kronplatz2000", "Korer", "blue", 0.3, 2],
  ["kronplatz2000", "korer", "Korer", "blue", 0.1, 2],
  ["olangiii", "p58", "Olang I / II to Alpen", "blue", 0.4, 2],
  ["cianross2", "cianross", "Cianross", "red", 0.4, 2],
  ["p41", "arndt3", "Ruipa", "blue", 0.7, 2],
  ["arndt3", "arndt5", "Gassl", "red", 0.4, 2],
  ["arndt5", "olangivaldaorai", "Gassl", "red", 1.3, 4],
  ["olangivaldaorai", "olangivaldaorai2", "Gassl", "red", 0.2, 2],
  ["belvedere", "arndt4", "Plateau", "blue", 0.9, 3],
  ["p60", "kronplatziii2", "Trasse", "black", 0.5, 2],
  ["pedagapizdeplaies3", "pedagapizdeplaies2", "Pedagà", "blue", 0.3, 2],
  ["pedagapizdeplaies2", "pedagapizdeplaies", "Pedagà", "blue", 0.1, 2],
  ["pedagapizdeplaies", "cianross3", "Pedagà", "blue", 0.2, 2],
  ["cianross3", "skitransbronta", "Pedagà", "blue", 0.4, 2],
  ["belvedere", "olangii", "Belvedere to Olang II", "blue", 0.2, 2],
  ["arndt4", "olangiii", "Arndt to Olang I / II", "blue", 0.2, 2],
  ["costa6", "ruis", "Costa - Ruis", "blue", 0.3, 2],
  ["p52", "kronplatziii2", "Seewiese", "red", 0.2, 2],
  ["kronplatziii2", "kronplatziii", "Seewiese", "red", 0.1, 2],
  ["sonne", "p67", "Sonne to Furcia 12", "red", 0.2, 2],
  ["costa2", "costa7", "Costa", "blue", 0.2, 2],
  ["costa7", "ruis2", "Costa", "blue", 0.1, 2],
  ["p11", "p46", "Korer", "blue", 0.5, 2],
  ["p46", "kronplatz20003", "Korer", "blue", 0.2, 2],
  ["kronplatz20003", "kronplatz2000", "Korer", "blue", 0.2, 2],
  ["belvedere", "ruis3", "Furcia 12", "red", 0.1, 2],
  ["ruis3", "sonne3", "Furcia 12", "red", 0.6, 2],
  ["sonne3", "p67", "Furcia 12", "red", 0.2, 2],
  ["ruis", "costa", "Ruis to Costa", "blue", 0.2, 2],
  ["sonne2", "p56", "Furcia 9A", "blue", 0.4, 2],
  ["p56", "p69", "Furcia 9A", "blue", 0.3, 2],
  ["kronplatzii", "p48", "Pramstall", "red", 0.6, 2],
  ["p48", "p72", "Pramstall", "red", 0.4, 2],
  ["p72", "p70", "Pramstall", "red", 0.3, 2],
  ["arndt2", "arndt5", "Gassl", "red", 0.2, 2],
  ["arndt5", "olangivaldaorai", "Gassl", "red", 1.3, 4],
  ["kronplatzii", "p51", "Sylvester", "black", 0.4, 2],
  ["p51", "p49", "Sylvester", "black", 0.2, 2],
  ["p49", "p52", "Sylvester", "black", 0.4, 2],
  ["p52", "p11", "Sylvester", "black", 3.1, 12],
  ["kronplatz20003", "kronplatz2000", "Kronplatz 2000 link", "blue", 0.2, 2],
  ["p72", "p73", "Pramstall", "red", 0.1, 2],
  ["p75", "marchner", "Marchner 2", "red", 0.4, 2],
  ["alpenconnect3", "alpenconnect2", "Spitzhorn", "blue", 0.2, 2],
  ["p80", "miara2", "Col Toron to Miara", "black", 0.2, 2],
  ["belvedere", "kronplatzii", "Belvedere to Kronplatz II", "blue", 0.1, 2],
  ["kronplatzii", "ruis3", "Furcia 12", "red", 0.2, 2],
  ["p82", "kronplatz20003", "Korer", "blue", 0.1, 2],
  ["costa5", "costa3", "Furcia 9", "blue", 0.1, 2],
  ["costa7", "predaperes2", "Costa", "blue", 0.2, 2],
  ["ruis2", "ruis", "Costa", "blue", 0.2, 2],
  ["ruis", "costa", "Costa", "blue", 0.1, 2],
  ["ruis2", "predaperes2", "Costa", "blue", 0.2, 2],
  ["predaperes2", "ruis", "Costa", "blue", 0.1, 2],
  ["p85", "marchner2", "Hinterberg", "blue", 0.5, 2],
  ["marchner2", "p86", "Hinterberg", "blue", 1.3, 4],
  ["p67", "ruis", "Furcia 12", "red", 1.1, 4],
  ["p85", "belvedere3", "Belvedere", "blue", 0.2, 2],
  ["olangiii", "arndt2", "Lorenzi", "blue", 1.3, 4],
  ["miara2", "miara", "Miara", "blue", 1.8, 6],
  ["belvedere", "sonne", "Furcia 12 A", "red", 0.7, 2],
  ["costa8", "ruis", "Furcia 9 B", "blue", 0.4, 2],
  ["predaperes", "costa", "Pre da Peres 32R", "black", 0.8, 3],
  ["coltoron", "p80", "Col Toron", "red", 1, 3],
  ["p80", "miara2", "Col Toron", "red", 0.3, 2],
  ["belvedere", "sonne", "Sonne", "red", 0.6, 2],
  ["belvedere", "p85", "Belvedere", "blue", 0.7, 2],
  ["sonne3", "sonne", "Sonne link", "blue", 0.1, 2],
  ["olangiii", "p98", "Arndt", "red", 0.4, 2],
  ["p98", "arndt3", "Arndt", "red", 0.8, 3],
  ["arndt3", "arndt2", "Arndt", "red", 0.2, 2],
  ["coldancona", "skitransbronta2", "Erta", "black", 0.8, 3],
  ["skitransbronta2", "skitransbronta", "Erta", "black", 0.1, 2],
  ["skitransbronta2", "skitransbronta", "Erta", "black", 0.3, 2],
  ["p94", "skitransbronta2", "Erta", "black", 0.4, 2],
  ["coldancona", "p94", "Erta", "black", 0.6, 2],
  ["pedagapizdeplaies", "skitransbronta", "Pedagà", "blue", 0.7, 2],
  ["skitransbronta2", "skitransbronta", "Pedagà", "blue", 0.1, 2],
  ["pedagapizdeplaies2", "skitransbronta2", "Pedagà", "blue", 0.6, 2],
  ["pedagapizdeplaies2", "pedagapizdeplaies", "Pedagà", "blue", 0.2, 2],
  ["p94", "skitransbronta2", "Sorega", "black", 0.5, 2],
  ["coltoron", "rara", "Rara", "blue", 0.4, 2],
  ["p94", "skitransbronta2", "Sorega", "black", 0.4, 2],
  ["p94", "skitransbronta2", "Sorega", "black", 0.5, 2],
  ["p49", "p97", "Seewiese", "red", 0.4, 2],
  ["kronplatzii", "p51", "Lumen", "red", 0.5, 2],
  ["p98", "p41", "Ruipa", "blue", 0.7, 4],
  ["coldancona", "piculin", "Piculin", "black", 1.8, 7],
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
  ["Al Cir", "restaurant", 46.69855, 11.9112, 1608],
  ["AlpINN", "restaurant", 46.74074, 11.95565, 2219],
  ["Alpres", "restaurant", 46.75173, 11.99306, 1614],
  ["Andrea & Marco", "rental", 46.69961, 11.93024, 1184],
  ["Bivacco", "restaurant", 46.72819, 11.96644, 1866],
  ["Chi Cianeis - Ristorante, Bar", "restaurant", 46.701, 11.92775, 1179],
  ["Ciolá", "restaurant", 46.703, 11.93007, 1202],
  ["Col dl'Ancona", "restaurant", 46.69751, 11.91224, 1605],
  ["Corones", "restaurant", 46.7382, 11.9579, 2263],
  ["Furcia Center", "restaurant", 46.72294, 11.9646, 1744],
  ["Geiselsberger Hütte", "restaurant", 46.74246, 11.97086, 2088],
  ["Gipfel Restaurant Cima", "restaurant", 46.73907, 11.95891, 2264],
  ["Graziani Lodge & Chalets", "restaurant", 46.73204, 11.9571, 2098],
  ["Hardimitz‘n", "restaurant", 46.77156, 11.94316, 963],
  ["Herzlalm", "restaurant", 46.7545, 11.95859, 1726],
  ["Huiba Hitte", "restaurant", 46.75136, 11.98283, 1802],
  ["K1", "restaurant", 46.77221, 11.94143, 952],
  ["Kron-Restaurant", "restaurant", 46.73907, 11.96011, 2261],
  ["La Bronta", "restaurant", 46.70514, 11.93044, 1232],
  ["Lorenzi Hütte", "restaurant", 46.74481, 11.99093, 1660],
  ["Marchner Hütte", "restaurant", 46.73441, 11.99455, 1560],
  ["P5 Mountain Club", "restaurant", 46.73209, 11.96264, 2067],
  ["Panorama", "restaurant", 46.73126, 11.95994, 2060],
  ["Pâtisserie", "cafe", 46.69867, 11.93016, 1187],
  ["Pizzeria Dolasilla", "restaurant", 46.77105, 11.93893, 952],
  ["Prackenhütte - Rifugio Pracken", "restaurant", 46.75254, 11.98288, 1808],
  ["Rifugio CAI Plan de Corones - Kronplatzhütte CAI", "restaurant", 46.74065, 11.95727, 2230],
  ["Ritterkeller", "restaurant", 46.70595, 11.92903, 1236],
  ["Schnapskurve", "restaurant", 46.71255, 11.9498, 1497],
  ["Skidepot und Verleih - Noleggio", "rental", 46.70098, 11.92785, 1179],
  ["Skisaloon Miara", "rental", 46.70453, 11.93022, 1222],
  ["Tabarel", "restaurant", 46.69799, 11.92998, 1191],
  ["Treff Kronplatz", "cafe", 46.73926, 11.95819, 2261],
  ["Treff Reischach", "cafe", 46.77243, 11.94196, 952],
  ["Treff Ried", "cafe", 46.79046, 11.97783, 927],
  ["Ücia Picio Pré", "restaurant", 46.71783, 11.96978, 1943],
  ["Ütia da Jù", "restaurant", 46.69761, 11.91146, 1604],
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
    11.95173,
    46.74129
  ],
  "zoom": 12.2,
  "pitch": 62,
  "bearing": 159,
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
    "miara"
  ],
  "defaultBase": "olangivaldaorai2",
  "firstLift": 510,
  "lastDown": 1020,
  "stats": {
    "lifts": 26,
    "runs": 150,
    "km": 67,
    "top": 2265,
    "bottom": 925,
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
