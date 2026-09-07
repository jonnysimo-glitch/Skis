/**
 * Kronplatz — resort graph.
 *
 * GENERATED. Do not edit by hand: run `npm run resort -- kronplatz` instead.
 *
 * Source:    OpenStreetMap via the Overpass API, 2026-09-07T23:32:21.249Z
 * Places:    OpenStreetMap
 * Elevation: AWS Terrain Tiles (terrarium), zoom 13
 * Licence:   OSM data is ODbL. Attribution is required wherever this is shown.
 *
 * What had to be assumed:
 *   - 46 runs were unnamed and are described by their endpoints
 *   - 6 nodes, 2 lifts and 3 runs were outside the largest strongly connected component and were dropped
 *   - 6 connectors were added, 1156 m in total, to rejoin pistes OSM leaves up to 350 m apart; they are marked as links, not counted as piste, and timed at walking pace
 *   - 9 pistes mapped as an area rather than a line were skipped: the outline of a snow field is not a way down it
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
  belvedere:          { name: "Belvedere",                    lat: 46.73827, lon: 11.95887, alt: 2265, area: "St. Vigil", rifugio: true },
  olangivaldaorai2:   { name: "Olang I - Valdaora I",         lat: 46.74662, lon: 12.01083, alt: 1167, area: "St. Vigil", base: true },
  olangiii:           { name: "Olang I / II",                 lat: 46.74310, lon: 11.97317, alt: 2059, area: "St. Vigil" },
  arndt2:             { name: "Arndt",                        lat: 46.74419, lon: 11.99072, alt: 1669, area: "St. Vigil", rifugio: true },
  kronplatzi:         { name: "Kronplatz I",                  lat: 46.77178, lon: 11.94186, alt: 957, area: "Bruneck", base: true, rifugio: true },
  kronplatziii:       { name: "Kronplatz I / II",             lat: 46.74881, lon: 11.95243, alt: 1860, area: "Bruneck" },
  korer:              { name: "Korer",                        lat: 46.77270, lon: 11.93989, alt: 942, area: "Percha", base: true },
  p11:                { name: "Above Kronplatz 2000",         lat: 46.76423, lon: 11.94318, alt: 1099, area: "Bruneck", named: false },
  kronplatzii:        { name: "Kronplatz II",                 lat: 46.73912, lon: 11.95762, alt: 2259, area: "St. Vigil", rifugio: true },
  ruis:               { name: "Ruis",                         lat: 46.72480, lon: 11.96400, alt: 1762, area: "St. Vigil" },
  riedgipfelbahn:     { name: "Ried / Gipfelbahn",            lat: 46.75419, lon: 11.95861, alt: 1730, area: "Bruneck", rifugio: true },
  costa:              { name: "Costa",                        lat: 46.72273, lon: 11.96410, alt: 1736, area: "St. Vigil", rifugio: true },
  predaperes:         { name: "Pré da Peres",                 lat: 46.71615, lon: 11.97043, alt: 2008, area: "St. Vigil" },
  miara:              { name: "Miara",                        lat: 46.70460, lon: 11.93022, alt: 1222, area: "St. Vigil", base: true, rifugio: true },
  pedaga:             { name: "Pedagà",                       lat: 46.70081, lon: 11.92760, alt: 1180, area: "St. Vigil", rifugio: true },
  pedagapizdeplaies:  { name: "Pedagà / Piz de Plaies",       lat: 46.69676, lon: 11.92140, alt: 1325, area: "St. Vigil" },
  coldancona:         { name: "Col d'Ancona",                 lat: 46.69791, lon: 11.91168, alt: 1605, area: "St. Vigil", rifugio: true },
  piculin:            { name: "Piculin",                      lat: 46.69209, lon: 11.89306, alt: 1094, area: "St. Vigil" },
  miara2:             { name: "Miara",                        lat: 46.71119, lon: 11.95117, alt: 1477, area: "St. Vigil" },
  coltoron:           { name: "Col Toron",                    lat: 46.71908, lon: 11.96456, alt: 1814, area: "St. Vigil" },
  costa2:             { name: "Costa",                        lat: 46.72689, lon: 11.96879, alt: 1845, area: "St. Vigil" },
  marchner:           { name: "Marchner",                     lat: 46.73366, lon: 11.99452, alt: 1559, area: "St. Vigil", rifugio: true },
  belvedere2:         { name: "Belvedere",                    lat: 46.73667, lon: 11.97309, alt: 2005, area: "St. Vigil" },
  rara:               { name: "Rara",                         lat: 46.72160, lon: 11.95973, alt: 1698, area: "St. Vigil" },
  cianross:           { name: "Cianross",                     lat: 46.69754, lon: 11.92819, alt: 1216, area: "St. Vigil" },
  cianross2:          { name: "Cianross",                     lat: 46.69653, lon: 11.92471, alt: 1294, area: "St. Vigil" },
  kronplatz2000:      { name: "Kronplatz 2000",               lat: 46.77024, lon: 11.93951, alt: 961, area: "Bruneck", rifugio: true },
  p33:                { name: "Above Kronplatz 2000",         lat: 46.76932, lon: 11.94011, alt: 978, area: "Bruneck", named: false },
  ried:               { name: "Ried",                         lat: 46.79034, lon: 11.97844, alt: 931, area: "Bruneck", rifugio: true },
  alpenconnect:       { name: "Alpen Connect",                lat: 46.75212, lon: 11.99296, alt: 1619, area: "Bruneck", rifugio: true },
  alpenconnect2:      { name: "Alpen Connect",                lat: 46.74313, lon: 11.96757, alt: 2140, area: "St. Vigil" },
  p41:                { name: "Above Arndt",                  lat: 46.75028, lon: 11.98291, alt: 1803, area: "Bruneck", rifugio: true, named: false },
  olangiii2:          { name: "Olang I / II",                 lat: 46.74545, lon: 11.97424, alt: 2027, area: "Bruneck" },
  arndt3:             { name: "Arndt",                        lat: 46.74517, lon: 11.98831, alt: 1721, area: "St. Vigil" },
  p44:                { name: "Above Alpen Connect",          lat: 46.75150, lon: 11.98428, alt: 1777, area: "Bruneck", rifugio: true, named: false },
  pedagapizdeplaies2: { name: "Pedagà / Piz de Plaies",       lat: 46.69650, lon: 11.91974, alt: 1352, area: "St. Vigil" },
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
  kronplatz20002:     { name: "Kronplatz 2000",               lat: 46.76969, lon: 11.94207, alt: 984, area: "Bruneck" },
  p72:                { name: "Pramstall junction",           lat: 46.74770, lon: 11.95660, alt: 1985, area: "Bruneck", named: false },
  p73:                { name: "Above Kronplatz I / II",       lat: 46.74838, lon: 11.95742, alt: 1955, area: "Bruneck", named: false },
  plateau:            { name: "Plateau",                      lat: 46.74138, lon: 11.97295, alt: 2056, area: "St. Vigil" },
  p75:                { name: "Above Marchner",               lat: 46.73479, lon: 11.98960, alt: 1682, area: "St. Vigil", named: false },
  p76:                { name: "Below Olang I / II",           lat: 46.75037, lon: 11.97653, alt: 1938, area: "Bruneck", named: false },
  p77:                { name: "Ried junction",                lat: 46.78206, lon: 11.98591, alt: 1291, area: "Bruneck", named: false },
  alpenconnect3:      { name: "Alpen Connect",                lat: 46.74206, lon: 11.96659, alt: 2164, area: "St. Vigil" },
  p79:                { name: "Ried junction",                lat: 46.78334, lon: 11.98239, alt: 1168, area: "Bruneck", named: false },
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
  p92:                { name: "Ried junction",                lat: 46.78776, lon: 11.97723, alt: 957, area: "Bruneck", named: false },
  p93:                { name: "Ried junction",                lat: 46.78646, lon: 11.97858, alt: 1017, area: "Bruneck", named: false },
  p94:                { name: "Above Pedagà / Piz de Plaies", lat: 46.69969, lon: 11.91784, alt: 1472, area: "St. Vigil", named: false },
  skitransbronta:     { name: "Skitrans Bronta",              lat: 46.70009, lon: 11.92469, alt: 1232, area: "St. Vigil" },
  p96:                { name: "Seewiese junction",            lat: 46.74465, lon: 11.94845, alt: 2021, area: "Bruneck", named: false },
  p97:                { name: "Below Olang I / II",           lat: 46.74447, lon: 11.97855, alt: 1956, area: "St. Vigil", named: false },
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
  ["kronplatzi", "kronplatziii", "Kronplatz I - Plan de Corones I", "gondola", 10, 1000, 2],
  ["korer", "p11", "Korer", "gondola", 5, 1000, 2],
  ["kronplatzi", "kronplatzii", "Kronplatz 2000", "gondola", 13, 1000, 2],
  ["olangiii", "belvedere", "Plateau", "chair", 5, 1000, 1],
  ["ruis", "belvedere", "Ruis", "gondola", 7, 1000, 2],
  ["riedgipfelbahn", "kronplatzii", "Gipfelbahn", "gondola", 6, 1000, 1],
  ["costa", "predaperes", "Pré da Peres", "gondola", 4, 1000, 2],
  ["pedaga", "miara", "Skitrans Bronta", "gondola", 3, 1000, 2],
  ["pedaga", "pedagapizdeplaies", "Pedagà", "gondola", 3, 1000, 2],
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
  ["kronplatz2000", "p33", "Above Kronplatz 2000 lift", "carpet", 5, 1000, 5],
  ["ried", "riedgipfelbahn", "Ried", "gondola", 14, 1000, 2],
  ["alpenconnect", "alpenconnect2", "Alpen Connecting", "gondola", 8, 1000, 2],
];

/**
 * [from, to, name, difficulty, km, minutes] and, on a connector, a trailing 1.
 *
 * A connector is the flat bit between two pistes — the skiweg round the back
 * of a station, the two hundred metres from where the piste peters out to
 * where the lift queue starts. It is routable, so it lives here with the runs,
 * but it is not a run: it is not counted in the resort's piste distance, it is
 * drawn as a connector rather than graded piste, and navigation tells you to
 * cross it rather than to ski it.
 */
export const RUNS = [
  ["olangiii", "p97", "Ruipa", "blue", 0.3, 2],
  ["p41", "p44", "Pracken", "blue", 0.1, 2],
  ["p44", "alpenconnect", "Pracken", "blue", 0.7, 2],
  ["olangiii2", "p97", "Gassl", "red", 0.4, 2],
  ["p97", "arndt3", "Gassl", "red", 0.7, 2],
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
  ["coldancona", "pedagapizdeplaies2", "Piz de Plaies", "red", 1.3, 4],
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
  ["pedagapizdeplaies3", "skitransbronta", "Erta", "black", 0.3, 2],
  ["skitransbronta", "pedaga", "Erta", "black", 0.2, 2],
  ["p48", "p60", "Seewiese", "red", 0.1, 2],
  ["p60", "p49", "Seewiese", "red", 0.1, 2],
  ["coltoron", "coltoron2", "Rara 31", "blue", 0.2, 2],
  ["p51", "p96", "Seewiese", "red", 0.6, 2],
  ["p96", "p52", "Seewiese", "red", 0.2, 2],
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
  ["p82", "kronplatzi", "Korer", "blue", 0.3, 2],
  ["kronplatzi", "korer", "Korer", "blue", 0.1, 2],
  ["olangiii", "p58", "Olang I / II to Alpen", "blue", 0.4, 2],
  ["cianross2", "cianross", "Cianross", "red", 0.4, 2],
  ["p41", "arndt3", "Ruipa", "blue", 0.7, 2],
  ["arndt3", "arndt5", "Gassl", "red", 0.4, 2],
  ["arndt5", "olangivaldaorai", "Gassl", "red", 1.3, 4],
  ["olangivaldaorai", "olangivaldaorai2", "Gassl", "red", 0.2, 2],
  ["belvedere", "arndt4", "Plateau", "blue", 0.9, 3],
  ["arndt4", "plateau", "Plateau", "blue", 0.1, 2],
  ["olangiii", "plateau", "Plateau", "blue", 0.2, 2],
  ["p60", "kronplatziii2", "Trasse", "black", 0.5, 2],
  ["pedagapizdeplaies3", "pedagapizdeplaies2", "Pedagà", "blue", 0.3, 2],
  ["pedagapizdeplaies2", "pedagapizdeplaies", "Pedagà", "blue", 0.1, 2],
  ["pedagapizdeplaies", "cianross3", "Pedagà", "blue", 0.2, 2],
  ["cianross3", "pedaga", "Pedagà", "blue", 0.4, 2],
  ["belvedere", "olangii", "Belvedere to Olang II", "blue", 0.2, 2],
  ["arndt4", "olangiii", "Arndt to Olang I / II", "blue", 0.2, 2],
  ["costa6", "ruis", "Costa - Ruis", "blue", 0.3, 2],
  ["p52", "kronplatziii2", "Seewiese", "red", 0.2, 2],
  ["kronplatziii2", "kronplatziii", "Seewiese", "red", 0.1, 2],
  ["sonne", "p67", "Sonne to Furcia 12", "red", 0.2, 2],
  ["costa2", "costa7", "Costa", "blue", 0.2, 2],
  ["costa7", "ruis2", "Costa", "blue", 0.1, 2],
  ["p11", "p46", "Korer", "blue", 0.5, 2],
  ["p46", "kronplatz20002", "Korer", "blue", 0.2, 2],
  ["kronplatz20002", "kronplatzi", "Korer", "blue", 0.2, 2],
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
  ["kronplatz20002", "kronplatzi", "Kronplatz 2000 to Kronplatz I", "blue", 0.2, 2],
  ["p72", "p73", "Pramstall", "red", 0.1, 2],
  ["olangiii", "plateau", "Olang I / II to Plateau", "blue", 0.1, 2],
  ["p75", "marchner", "Marchner 2", "red", 0.4, 2],
  ["p76", "p77", "Ried", "red", 4.1, 14],
  ["alpenconnect3", "alpenconnect2", "Spitzhorn", "blue", 0.2, 2],
  ["p77", "p79", "Ried", "blue", 0.6, 2],
  ["p80", "miara2", "Col Toron to Miara", "black", 0.2, 2],
  ["belvedere", "kronplatzii", "Belvedere to Kronplatz II", "blue", 0.1, 2],
  ["kronplatzii", "ruis3", "Furcia 12", "red", 0.2, 2],
  ["p82", "kronplatz20002", "Korer", "blue", 0.1, 2],
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
  ["p79", "p93", "Ried", "red", 0.5, 2],
  ["p93", "p92", "Ried", "red", 0.2, 2],
  ["p77", "p79", "Ried", "black", 0.3, 2],
  ["p93", "p92", "Ried", "blue", 0.3, 2],
  ["olangiii", "p97", "Arndt", "red", 0.4, 2],
  ["p97", "arndt3", "Arndt", "red", 0.8, 3],
  ["arndt3", "arndt2", "Arndt", "red", 0.2, 2],
  ["p94", "skitransbronta", "Sorega", "black", 0.5, 2],
  ["coltoron", "rara", "Rara", "blue", 0.4, 2],
  ["p49", "p96", "Seewiese", "red", 0.4, 2],
  ["kronplatzii", "p51", "Lumen", "red", 0.5, 2],
  ["belvedere", "kronplatzii", "Link to Kronplatz II", "blue", 0.1, 2, 1],
  ["p97", "p41", "Ruipa", "blue", 0.7, 2],
  ["coldancona", "piculin", "Piculin", "black", 1.7, 7],
  ["kronplatz20002", "kronplatz2000", "Link to Kronplatz 2000", "blue", 0.2, 2, 1],
  ["kronplatz2000", "kronplatzi", "Link to Kronplatz I", "blue", 0.2, 2, 1],
  ["p82", "p33", "Link to Above Kronplatz 2000", "blue", 0.1, 2, 1],
  ["p33", "kronplatz20002", "Link to Kronplatz 2000", "blue", 0.2, 2, 1],
  ["plateau", "arndt4", "Link to Arndt", "blue", 0.1, 2, 1],
  ["p92", "ried", "Link to Ried", "blue", 0.3, 3, 1],
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
  ["Chi Vai", "restaurant", 46.70851, 11.94249, 1363],
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
  ["Korer parking", "parking", 46.77295, 11.94025, 943, {"fee":"yes"}],
  ["Kron-Restaurant", "restaurant", 46.73907, 11.96011, 2261],
  ["Kronplatz I parking", "parking", 46.77104, 11.94215, 968],
  ["L'Apetit", "restaurant", 46.70019, 11.93024, 1183],
  ["La Bronta", "restaurant", 46.70514, 11.93044, 1232],
  ["Lé Tablé", "restaurant", 46.70552, 11.93462, 1268],
  ["Lorenzi Hütte", "restaurant", 46.74481, 11.99093, 1660],
  ["Marchner Hütte", "restaurant", 46.73441, 11.99455, 1560],
  ["Miara parking", "parking", 46.72471, 11.96103, 1748, {"spaces":30,"fee":"yes"}],
  ["Moosbichl Alm", "cafe", 46.75653, 11.98048, 1868],
  ["Niederegger Hütte - Rifugio alpino Niederegger", "restaurant", 46.74522, 11.99968, 1453],
  ["Oberegger Alm - Malga Oberegger", "restaurant", 46.74535, 11.99607, 1539],
  ["Olang I - Valdaora I parking", "parking", 46.74695, 12.01136, 1166],
  ["P1", "parking", 46.75353, 12.00948, 1288, {"fee":"no"}],
  ["P2", "parking", 46.75317, 12.00946, 1289, {"fee":"no"}],
  ["P3", "parking", 46.75314, 12.0096, 1286, {"fee":"no"}],
  ["P4", "parking", 46.75312, 12.01002, 1276, {"fee":"no"}],
  ["P5 Mountain Club", "restaurant", 46.73209, 11.96264, 2067],
  ["Panorama", "restaurant", 46.73126, 11.95994, 2060],
  ["Pâtisserie", "cafe", 46.69867, 11.93016, 1187],
  ["Pizzeria Dolasilla", "restaurant", 46.77105, 11.93893, 952],
  ["Prackenhütte - Rifugio Pracken", "restaurant", 46.75254, 11.98288, 1808],
  ["Riff'a Ski & Sky Restaurant", "restaurant", 46.70929, 11.94694, 1410],
  ["Rifugio CAI Plan de Corones - Kronplatzhütte CAI", "restaurant", 46.74065, 11.95727, 2230],
  ["Ritterkeller", "restaurant", 46.70595, 11.92903, 1236],
  ["Schnapskurve", "restaurant", 46.71255, 11.9498, 1497],
  ["Ski Noleggio", "rental", 46.69771, 11.93005, 1192],
  ["Ski Sport Heinz", "rental", 46.69845, 11.93055, 1190],
  ["Skidepot und Verleih - Noleggio", "rental", 46.70098, 11.92785, 1179],
  ["Skisaloon Miara", "rental", 46.70453, 11.93022, 1222],
  ["Tabarel", "restaurant", 46.69799, 11.92998, 1191],
  ["Treff Kronplatz", "cafe", 46.73926, 11.95819, 2261],
  ["Treff Reischach", "cafe", 46.77243, 11.94196, 952],
  ["Treff Ried", "cafe", 46.79046, 11.97783, 927],
  ["Ücia Picio Pré", "restaurant", 46.71783, 11.96978, 1943],
  ["Ütia da Jù", "restaurant", 46.69761, 11.91146, 1604],
];

/*
 * Who the places came from, for the credit in Settings.
 *
 * OpenStreetMap is always in here and is always required — ODbL asks for
 * attribution wherever the data is shown. The rest are here because a person
 * reading "412 spaces" should be able to find out who counted, whether or not
 * that source's licence obliges it.
 */
export const PLACE_SOURCES = ["OpenStreetMap"];

export const DIFFICULTY_RANK = { blue: 1, red: 2, black: 3 };

export const SHORT_NAMES = {};

/**
 * How the app lists and frames this resort. Derived from the graph above and
 * scripts/resorts/kronplatz.json at build time, so adding a resort does not mean
 * hand-typing a camera position.
 */
/**
 * The shape of the ground, 160 by 160 samples of real
 * elevation over the box below.
 *
 * The map used to build its terrain by interpolating between the altitudes of
 * the graph's own nodes, which for a whole resort is under a hundred points.
 * That does not make a mountain: the valleys fill in and every ridge no lift
 * crosses is missing. This is the same elevation every gradient in the graph
 * is measured from, sampled on a grid, so the terrain is the actual mountain
 * and the ground around it is real ground rather than invented ground.
 *
 * Int16 metres, base64, decoded once when the resort loads.
 */
export const TERRAIN = {"n":160,"west":11.825047825,"south":46.635350625,"east":12.078842175,"north":46.847079375,"data":"UgciBxsHGgfrBrYGjQadBtoGHAcbBwIH6Aa2BrIG3wbvBg8HRwd+B4YHYgc6BwAH3AbcBu0G5wa6BuoGQgeQB7sH1AcBCBUIDAjOB50HjAeeB+EHQgibCKsIbggqCNQHswfaB/4HAgjyBwUIJwhFCBsI4weUB0MHCgfLBo4GOgb1Bc0FkQVRBTQFAgXEBGIE8AOYA24DUANCAz0DPQNAA0ADQgNHA0kDSgNUA5gD6ANRBKYEDAVIBYgFswXEBasFlgWdBaMFmQWeBa8FxAXVBe8FEgYpBkwGlQbZBg0HNgdbB4MHwgf7ByUITgiGCKkIugjACLcInQifCKsIwwjXCAoJYwl6CQ4JnQhZCBcI7QfSB6sHcgdHB0MHWQepBwMIZgivCIUIcgiICJAIbAguCO8HoQdtByEH0QaoBocGNwYzB/8G3gbHBqoGgAZ0BpcG0Qb9Bt8GhQZ8BmgGdwajBskGAwdBB2IHMQcMB/cG2AakBogGvAbQBrEGyQYpB1wHXQd4B6oHtweNB1wHWAdmB5MH6wdLCJIIpQh2CDsI6QeZB50HwQfNB9EH6AcFCBcI/gfFB24HPAftBqQGbwZGBg4GygWABRcFxwSpBGkEJQTYA5sDgANmA0YDQQM/A0EDRANIA00DSwNMA2MDkQPnA08ElATWBBwFTwVuBWkFUwVJBU0FbQWZBdsF/wUbBkMGXgZ1BqEGxQbgBvUGLgdeB3sHtgfnBwgIOAh0CK8IwQjCCKoIhQh9CIkImwivCPMISgl2CT4J5QiBCDUI8gfGB6kHcgdHBzkHTgd9B8MHBQhtCIYISwgnCD4IXQhcCCwIAQjLB5AHRAfmBo0GTwYUBiMH8wawBn0GZgZPBm0Gkwa1BsUGkQZEBjgGQwZRBnAGrwYDBykHHQcIB90Gxwa9BnIGXAaLBp4GlAbFBgIHBQccB0UHVgdaBzEHIAcmB1UHnwf9B1UIiQiUCHsIRwgRCLgHeAd7B5AHrQfUB+QH+gf3B+gHuwd9ByQH5ga3BooGSwb1BbQFaQUXBbcEfAQyBPADlANvA10DTQNBAz8DQwNLA1MDaANqA2IDcAOTA80DLAR2BK4EBAUsBRYFBAUBBRgFUwWrBe8FRgaABpQGnQa+Bt8GBwcgBz0HTAdsB6sHyQfsBxgIPghwCJwIuwjCCLgIhghTCEsIZgiDCLUICAk+CTYJ7AifCFoIDAjRB6IHXwc/ByUHMwdpB6QH7Ac7CH4IYQgqCPgH8wcdCAQI8AfbB8QHigc6B/EGugZuBhkG0galBngGTgYaBkUGbAaMBqUGpgZ9BjMGCwYlBkAGewa3BvAG9wbKBqgGfgZvBmwGSgY/Bk4GZAaPBrMGvwbDBtAG6gYAB/gG8QYDBzwHhwfgBysIXQh9CIAIZghFCB8I6QeVB2QHXweKB74H2Qf2B/wH9wfHB5QHRQcIB8IGZAYWBuEFpwVtBTMF6wSpBEwE9wOAA1wDUgNAAzwDPwNDA0kDVgNqA3kDfAN+A5wD2QMjBF8EjgTZBOEEyQTbBAsFVgWmBeAFGAZOBpkGzAb4BiwHXQeAB4wHoQfAB9gH+wcwCFkIewiNCJsIqQitCKUIYgg7CDAINghXCIoI0QgECSgJBAnCCHcIPwjpB6UHaQc4ByEHIAdVB54H5gcpCHUIhghbCC4I5wewB7AHlweAB2cHWAc4Bx4H9wbMBn0GJwaLBlsGQgYmBgUGMQZeBnoGgwZkBjAG7wXmBQMGOgZrBrUGyQazBoQGXQYvBhIGGQYJBgsGHQY+BnYGiQaGBogGkQafBrQGwQbXBgEHVwe5BwoISwhxCHQIUQg7CCMIBgjpB8wHdAckByYHdQexB94H6wfNB5QHcQcUB8MGagYzBuYFswVfBQ4F6wS3BHUEOATiA3UDVANGAz8DOwNBA0gDUgNcA3ADgwOPA4kDqAPtAx4ETQR2BIsEjwS+BP0ESQWMBb4F5wUXBlAGkAbHBggHSgeHB7oH6QciCEQITwhWCGkIfwiDCGwIeAiPCGoIRwgpCAwIBggkCE8IhAisCM0I4wjHCKUIcwgQCLcHYQcoBwoHBwcqB4MH2wc/CIQIlghoCEwIJAjNB4kHbQdSBzIHHQcUB+QG5wbuBsUGegYjBlUGRQYeBvwF7wUTBjgGVAZaBjcG8wW+BbcF5gUkBloGkgasBooGVgYkBvQF2QXRBcAF1gX8BQ8GOQY9BkIGWQZtBoEGnQbIBuoGDAdkB7cHCAgzCEoINQgYCAQI8wfoB9MHsQdxBwQH5wYkB3MHnQeaB4MHZAcpB+AGogZLBvwFzgWjBVsFEAXSBIwEQAQEBMEDhgNaAz8DPANAA0IDRwNQA18DcgOFA5UDmwO7A+UDEAQnBDgEUAR0BKoE/wRSBYQFuwXzBSQGZAafBtsG/AYqB2sHowfvByUIOAg3CEEISghRCF8INwhACFcIQQgUCP4H7wcGCCsIXQiDCJcInwicCHkIWAgwCNwHjgdBBwAH+wYXB1gHowcCCGcIpQiFCFMIGwjbB7EHgQdeB0EH/wa9Bp4GdwZ6BpEGogZxBh4GCAYABuEFuwXNBQEGHwYvBigG/wXVBZwFmwXeBR4GXgacBqgGgwZQBvsFxgWoBaUFoAWyBdQF5gX6BQEGGgY+BmUGlga3BuAGCgcyB3UHmwfdB/YH/Qf+B+cH1AfNB7EHggdPBwcHzQbUBhUHVAdSB1wHVAdAByQH4QauBmgGMQYABsMFiQVKBQ8FzwR7BCMEywNzA1gDQQM9Az8DQwNJA1MDWwNsA3wDkgOgA8UD4wP7Ax4EOwRKBGgEkwTdBEQFdgWXBdEFCgZVBqkG6AYXB0gHfAfHB/YH+gf+B/kHCQgICBoIIQjzB/AHBwj0B9EHyQfjByIIUgh1CIMIhQiMCGsIOwgGCMcHkwdXBxIH8Ab4BiUHZwe7Bw8Igwi4CJMIXAgtCPwH0AecB3MHPAfjBqIGawYmBg0GEgYfBgAG3wXdBbsFowWZBcYF8gUYBjIGGQbgBaMFbAV4BbQFBQY5BnQGjAZtBjIG5wWlBYMFeQWNBZEFlQWkBa4FygXjBQwGOAZXBocGpgbeBiAHVAeDB7QHygfLB8cHxgevB4EHXQcpB/0GvQZ8BrAG7gYFBwQHDgchBy8HLAf4BsQGhwZeBjEG/gW5BW0FKQXfBJUEJwSrA2UDSgNBAz0DPwNDA0wDUgNZA28DewOBA6oD2AP0AxEERQRyBIsEiAR+BKUEBwVIBYcFuAUMBk4GpQYAB0YHegewB+MH2Ae9B78H3gfgB7IHzQfuB9AHrAejB58HsQfOBwAILAhZCHUIfwiDCG0ILgj8B7kHdQdBBwoH5QbcBvcGNAeFB9wHOQilCN8IxgiZCIEIVggaCNEHkQdEB/cGuAZrBiIG0gWxBbgFrwWFBcEFhAVzBYcFvwXuBSAGMwYEBtQFhwVOBVsFiAXTBQsGMwZQBj4GBAa8BYAFUgVOBWAFaQV8BYcFnQXKBf0FJgZQBngGqQbPBgoHPQdhB4kHrQe8B7UHoAePB2wHOQclB/UGzwaOBkkGUAaHBo8GsAbeBu0G/wb7BtsGugaNBmYGLwYIBsMFdAUqBb4EbAT4A5MDWwM/Az4DPgNBA0UDSQNPA1UDXwNpA4MDwQP1AxQEKQRIBHYEswTnBN0EvATeBCcFbQWzBfUFMAZ0BtQGFwdwB6oHqQeAB3kHkwepB5EHfQebB7UHpAd7B3kHmQfLB/cHGwg4CFMIYAh0CGkILQjoB6cHbQczB/kG3AbVBuMGDAdOB6wHDAh6CN8IJgkQCe4I1AidCGQIFwjWB6IHSgf4BroGhQZQBgQGlwVRBSoFjgVRBVQFhwXLBQUGNgY0BvMFtwVyBUAFPQVkBaIF7gUQBhcG+QXCBW0FSwU4BS4FSAVkBYcFqgXHBfsFOwZjBoEGugb8BjMHWwdlB2IHagd7B4AHhgeHB4YHagc+ByEH4wazBm8GIAYXBicGSQZsBo8GmAaiBqsGoAaTBmQGMwYEBrMFiwVIBf4EcAQVBMsDhANMAzwDPQNAA0EDRQNHA0sDUgNYA14DjwPVA/8DJwRRBHMEmwTQBAkFDAXlBNkEKAVsBa8F7AUdBmQGtAb6Bj8HdQdbBzAHJAcuB0AHNwdUB1kHWwdXB2AHhAeyB+IHFQg5CE4IUAhTCDsI8AfHB5QHVAcYB+cG0QbPBtoG/QY6B38H0AcoCJYI8AhKCXgJWwkzCfcIrQhYCBwI6weGBysHCgfmBu4GoQYvBsgFYwU6BS0FXgWeBd4FHAYsBhMG3AWTBVMFJAUkBWIFkgXFBckFqwV6BVAFMAUZBRQFMgVpBY4FuAXcBfYFDwZmBo0GsQbfBg8HKAcsBx4HCQcgBzgHRwdWB1UHQgc9Bz8HIAfjBr4GhQYzBvAF1wXSBdsF/QUeBlAGYwZrBl4GPQb+BcIFhgVMBQAFxwRiBAAEoANhAz4DPQM+A0IDRQNFA0UDSgNNA1ADWAN7A7sD+QMzBF8EjgTYBBEFKwUuBRQF/wQsBV0FogXkBSIGdAa3BvsGFwcaBw8H9wbwBvMG/gb2Bv0GDwcmB0gHcQeTB7MH2wcKCCsIPQhMCEMIAQiXB2oHNgf7BsYGuwa9BskG5wYcB14HowfsB0oIsAgLCWQJhAliCUAJDgniCK4IYgj/B7kHbAc5BzkHOwfrBloGAQa0BQYFLgVfBZMF0gX0BfUF1QWTBWAFNAULBQ8FOAVzBY0FggVYBTcFIQUFBfsEGQVVBYQFswXkBRgGOgZNBnEGiQasBtAG3wbXBssGtAalBrMG0QbYBv8GEgcSBxUHFgcKB+sGxgaWBj8G8gWyBW4FVwWIBbUF3wX+BRwGIQb+BbcFjgVGBfAEwgR/BCsEyAN2A1UDPAM8Az4DRgNJA0sDTwNPA1QDVgNdA3UDogMGBEQEbQSUBO4ELQVQBVYFPQUcBTwFcAWuBfAFKQZ2BqUGsAaoBrIGsAaoBqMGtQbSBvcGGQcrB1QHeAeXB7kH4QcHCCkILggnCP8HyweEB0EHIQfhBrsGrQayBsgG7AYiB18HngfjByUIiAjcCC4JPgkNCesIxQi4CLwIwAijCGUICAjRB5IHjwd3B0IHiQYJBqYFFQUwBVEFewWUBaYFqwWIBWIFQgUhBfQE8wQLBSkFNgUzBSYFDAXwBOcE+QQpBV8FkgXGBfAFJQZFBlYGVgZSBmwGiQaSBo4GdwZGBjYGXAZzBncGlwbhBu8G8wbtBuQG2Qa9BqEGjgYhBtAFiAU3BT8FWAV3BZoFvAXIBbAFiQU+BekElwRYBBkE1AOHA2IDSgM8A0ADSANNA1EDWANcA10DYQNlA2gDdgO7AyEEUwR7BLEE8QQwBVEFagVnBUcFSQV8BbAF5AULBiQGQgZTBlwGYAZkBnUGmAa4Bt4GHAdXB2IHgwepB9AH9gcbCDQINQgWCNIHiAdJByMH9wbLBqkGnQagBsIGBAdAB3UHrQfjByEIaQi7CAsJLQnxCK0IoAiNCE8IXwiFCJoIiwhECAgI6gfMB4wHFgeoBhMGmwUFBRoFMwVOBWAFYgVhBVcFSAUvBRcF7gTZBOEE8AQABQQF/wTmBMIE0AT/BA0FOAVjBYIFtwXbBewFCQYbBiAGNgZJBkwGPwYVBvEF4wX1BREGNwZWBo4GvgbKBsMGxAbEBrkGkAZvBicG2wWHBTsF/wTdBPYEPgVvBXsFYgURBcYEkAReBBUExgOAA1oDNgM6AzkDRANTA1sDXwNiA18DZQNrA3cDgAOQA9oDOwRtBKME1wQIBT8FWwV1BX4FfQVxBXoFjQWxBdAF7QUBBg0GIQY8BlkGhga3BukGCgc/B3cHlweqB9AH9AcSCCAIEwjYB6YHcwc0B/sG0waqBpAGjQaUBsMG+gZFB5gHxQfuBzEIdwisCOUIJAkDCZ0IXwg7CCYI+AcTCDsISAhNCDQIIQjoB58HOgfxBocGCQaLBfgECwUbBSkFMAUwBTAFLwUsBSMFDAXyBM0EtwTNBOEE6ATVBKkEpgTGBOIE/QQRBTIFTgV8BZYFsAXBBdYF1gXlBQMGFAYFBuoFzQWoBa8F2wUBBikGSQZbBm0GfgaGBn4GcwZaBjQGCAbLBW4FOQX4BLQEsgTEBMgECwX3BL8EkwRVBBYE7AOhA2YDSQM3Az0DRwNTA1kDXgNkA24DbgNwA3oDgwOUA7gDCgRiBJMEzgQSBSkFRQVhBYQFlwWXBYcFjAWVBaUFwQXSBeUFBQY6Bl0GkgbFBvcGLgdSB2oHjge6B9UH7Af3B/0H2weVB4MHVwcPB+gGugaDBnAGeQaUBtQGIgdbB5EH0QcNCDQIXwidCNMI6AjgCKkIZQgzCPsH1wenB58HxwfiBwoI8QfXB50HXwcqB+EGcgbXBVoF6QT8BAkFEwUaBRsFFgUVBQ8FBwX5BOkEywSeBKUEsgTFBMgEpgSCBJoEzATmBP8EIAU3BU8FXgV4BYcFmwWbBaEFtQW+BcUFywWkBWkFVwWSBcUF8QUABg0GHgYkBigGNgY3BiIGFwbkBbQFeQVLBRcF4QSiBHsEhwSkBKAEfQRLBBoE2AOyA3sDVQNQAzwDQgNQA1gDZwNtA3IDfgODA4MDhQOUA7UD1wMlBIIEsATrBCIFPAVIBWQFiQWkBbsFtwWmBZwFuAXdBfYFFgZRBn0GvAbyBhMHPgdoB30Hmwe8B8IHwQefB3wHhAdlBzkHJQfxBtAGmgZzBl8GbgaWBt0GIgdrB5sHwwf2BzEIYAiKCLMI4wj0CL4IfghICAkI0weeB2oHRQdhB4cHnQeKB4AHVQciB+8GhgYoBqwFRQXBBNEE3gToBPEE8QT0BPcE8gTtBOAEzwS4BJwEgwSPBKAEnASKBHsEowTLBNoE8AT/BAwFDAUKBS0FNwU8BVAFawV6BX4FiAWYBWUFJAUcBV4FcwWGBZEFqgXCBcgF2gXlBeAF4gXdBcsFnwVtBVkFOwUJBbMEOAQZBDoERwQrBAoEywOfA2gDSwNCAzcDQQNJA1IDWQNpA3gDgQOMA5UDlAOYA6YD2QMCBEkEiQStBOsEHAUxBUoFbwWQBbcF0gXaBdIFtwW3BdkFDwY1Bm8GtQb0BiEHNAc5B2gHjgeeB6QHjgdtBzwHGwcRB/MG2ga2BqUGcAZUBk4GZQaWBs4GAQc8B2YHpQfsByQITghyCJMItwjvCA4J7AinCEwIBwi/B3sHRwceBwYHBQcoBzwHNQcHB9IGjgZVBt8FggUhBYkElwSgBK0EtwTFBM0EzQTJBMMEtwSwBKEEegRrBH0EhQR+BFcEWQSJBLEExQTcBOQE3ATbBOIE7gTtBOIE8wQTBRwFKAVABUkFFAX1BAQFIAU7BToFPgVNBXQFiwWfBaUFsQW2BaAFiwVwBVUFNwUYBecEqQRjBBoE6gPQA8EDuAOWA3UDWgNJAzkDOANEA00DVQNhA3ADfwOIA5YDpAOpA7QDzwMSBFUEgASeBLkE6QT0BAQFNwVfBXQFoAXHBeIF6gXVBcYF4gUBBiUGYwaTBroG4wYZByYHUgd8B2QHTgcpB/YGywa8BqIGigaABlwGSQY6BjMGQgZsBqsGDQdAB3IHkwe4B+AHCQg6CGoIrQjeCAAJCgneCLAIUwgXCNgHigdMBwEHvgapBpwGuQa8BsUGpgZQBhQGmgVKBd8EaARqBG4EcQR2BH8EhgSPBJAEjASBBHIEXwRBBE8EYwRsBFkEQwReBIEEiASQBJMEkgSZBJkElQShBK0EuQS/BNkE4ATjBPQE8wTbBN8E3QTlBP0E/AT2BPgECQUcBSwFPQVRBU8FRQU7BScFDQX7BOUEyQSbBG4ERAQaBNoDvQObA4IDagNbA0wDOwM5A0cDUQNcA2UDbwN4A4EDlQOsA7gDywPkA0EEiQSVBIwEmQStBL4E4AQBBRgFQAVnBawF5AUFBg4G9AUDBisGNwZiBogGsgbhBhsHOAdNB0kHEgf0Br4GlwaFBk0GPgY0BiQGGwYWBh0GLgZZBpAGxwYHB14HnQfXBwsIKAg+CGIIhgi2COUICwkTCe4ItwhpCDEI/Qe8B3EHBgepBlYGLQYeBjYGUgY2BvgFtQV6BQwFqQRwBHkEewR2BHUEcgRrBGgEYgRbBFYEUgRNBCsEPQRJBDEENQRWBFcEWQRZBFgEVgRbBGMEaARnBHAEiwSSBIsEmQSsBLQErgSoBKkErgSrBKYEsQTABMIExwTEBMkE2ATtBPAE/ATzBOsE6ATOBLcEpwSHBF0ESgQuBBYE4gOtA4gDcgNjA1QDTgM+AzgDQANJA1YDYwNtA3wDhAOaA7ADxQPdA+4DCQQ2BE8EVwR+BIcEmQS2BNUE+QQ5BXMFwgUBBhkGMAYkBiQGQwZdBoYGrgbNBu8GCwcxBzIHCQfCBpUGaQZKBjEGFgYEBvUF8gUCBhsGOwZhBpQG4QYXBy8HYQekB+oHKAheCH8IiwioCNAI8AgLCRUJ8wiRCFQIEAjEB4oHVgcKB8UGZQYhBtkF3wXvBcQFnAVmBSIFxgR/BI4EkwSRBJIEkASJBH8EcQRkBFQESgQ/BCwEBAQVBBUECgQcBCwEMQQzBDAELgQtBC8ENgQ8BEQERgRcBGMEZgRqBHMEfQR/BIIEhQSGBIYEhgSMBJEEiASMBIwElQSWBJYEowS4BLYErQSdBIoEegRkBDIEGgQBBPYD3QOaA3UDbANdA1cDVANHAzwDNgM+A0cDVANgA2kDfAOMA6YDzwMYBEEEOQQaBBUEMgROBGIEfASmBNAECwVQBY0FswXoBRIGJgZLBmYGZwZaBmsGjQaqBsEG1wbtBvUG2AaXBm8GLQb5BeoF1wXHBc8F5QUGBiMGRgZ1BpYG1wYkB2cHpAe1B9EHAQgxCGcInAi8CN8I7wgBCQYJ6gi6CH8IOAjzB7UHcQcyB/IGtQaBBjUGuAWLBX8FYgVGBRYFwQR1BFsEfASFBIYEhAR/BHsEcwRoBF4EUARBBC4EGATuA+MD6QMBBAYEBAQIBAoECQQIBAYECQQTBBkEJQQsBDcEPQRBBEIESgRQBFUEWQRcBGIEZgRnBGcEZQRnBGgEaARqBGsEcQR0BHkEeQR2BGsEYwRQBBwEBATbA8cDtwOYA2UDXwNdA1MDTQNGAz8DOQM2Az8DSQNUA1wDawN6A54DygM4BJEEnwSTBHAERAQwBEUEcgSrBNUEDgU+BW0FogXIBfMFFAY1Bl4GcgZ7BoEGfQZ/BoEGfgaABpsGlgZlBjQGEQblBcMFqQWkBbYF1gUDBi8GWwaSBsEG5wYYB2oHqAffB/0HEAg8CFsIcwiaCLwI3QjpCOAIpghxCGsIaAg9CAkIuwdpBxIHwwaYBmcGFQa3BW0FOQUnBRMF1wSOBFsERQRNBFgEXgRlBGEEWARNBEQEPQQ1BC4EJAQeBOsDzQPXA+MD4APoA+wD7QPqA+kD6gPxA/sDBQQQBBYEGQQeBCAEJQQuBDYEOgRABEUETARJBEUERgRKBEoESARLBFEEUgRYBFcEWQRYBFYESQQ5BBQE7APYA7ADiANzA2cDUgNNA0sDTQNEAz0DOQM3AzgDPwNHA1IDXANkA3QDqQP2A3gEpgSlBKcEqASLBHkEbwSGBLAE4wQfBVMFewWeBb0F3AUFBi8GXAZlBnUGkwaOBm8GSwY0BiQGGwYNBvoF7wXCBZsFiwWHBZ4FvwXhBRcGXAakBtkGBQcvB18HlwfPB/cHFQguCE0IcQiXCLEIvQjJCMMIowhxCDMIDAgICBMIBwitB0kHAAe/BoUGSgb/BcYFkwUeBeMEzwSqBGQEPwQ/BBwEIAQpBDoESQRGBDgELgQpBB0EEAQMBPQD0QO8A74DxgPIA8wD0gPUA9cD2QPcA+ED6gPzA/sD/gMEBAsEDwQUBBwEIAQnBC0ENAQ0BDIELwQwBDIEMQQzBDgEPQRCBEQEPAQzBCcEIwQXBP4D5QPCA5wDgQNuA1wDTQNCAz8DPAM5AzkDNwM2AzYDNwM/A0QDSgNQA1wDaQOfA/oDYQSJBI8EqgTGBM8E4ATaBL4ExQT7BCsFUwV0BZcFtgXVBQEGJAZKBl4GZgaABoQGawY0BgoG5wXRBcUFrAWNBXYFZgVpBYMFpgXaBQMGKgZgBqUG5AYeB1gHfgepB8oHAggUCC4IUgh4CJ0Irgi1CLYIpAiJCE0ICAjBB5wHmAeUB4UHPwf/Bs4GkQZFBgEGwQV7BR0FxgSRBHUEUgRCBEEECAQSBBoEIQQfBCAEGgQRBAAE7wPiA9EDyAO4A60DpwOtA7QDwAPHA8wDzgPRA9QD2QPfA+MD7APzA/cD/AMBBAUECwQRBBQEGgQgBCEEHwQfBBsEGgQdBBsEFgQdBC0EKwQgBCAEGAQABOgDxQOlA5EDfANrA1sDTAM+AzoDNwM2AzUDNQM0AzYDNgM1AzgDPQNHA08DWQNeA3cDzQM6BHYEagSnBNoE7AT/BPYE6gT0BBYFNgVHBWsFjwWrBc0F+AUSBiwGQwZLBlUGWgZTBjkGBQa9BYsFdAVfBVIFSAVXBW8FnAXFBQIGPgZuBo8GuQbdBvcGOwdwB5MHsgfXBwEIKQhTCHUIjAiQCIkIgwh0CEEIBgjCB4EHTgcqByAHNQcgB+cGpwZsBgMGzwWZBU4F/ASmBHkEVwQ/BD4EPAQQBA8ECgQIBAEE/gP9A/YD4gPMA8YDtQOjA6MDmQOgA6ADpAOrA7UDvgO/A8IDyAPLA9ED2APfA+UD6QPvA/QD9gP+AwEEAwQKBA0EEAQPBAsECAQFBAYECwQOBA4EEgQUBAoEAQTpA84DvgOqA5sDiAN2A2IDSwNBAzgDNQM0AzQDMwMyAzEDNAM1AzMDMwM4A0QDRwNKA1UDbQOgA/wDTwRjBIcEugTJBN4E5ATpBPoEFgUrBUEFZgWFBaYFwwXgBfwFGQYvBjgGNwYyBh4G/wXaBbQFfQVPBTkFLQU4BVsFgQWsBeMFGQZdBo4GvQYBByUHKgc4B18HhAevB9AH/AcuCFQIXwhkCF4IVAhaCDwI5geuB4IHQQcZB+MG3Qb0BtMGfQZUBjQG1QWPBTwF/ASeBHIEYARQBDwEOwQ6BPsD9gPxA+cD3wPdA9ADyAO5A6wDnwObA5ADjwOVA5YDlAOYA54DpAOpA6sDrwO1A7sDwAPLA9QD1gPbA+ID5gPpA/AD9gP7AwEEAQQABP0D/AP5A/ID9wP9A/4D/QP4A+gD3QPTA8gDvQOxA6ADjwN9A20DVwNEAz4DOgM0AzIDMgMzAzEDMAM0AzMDMwMyAzgDPwNAA0IDSQNqA4kDywMGBDQEXgSJBKQEuATLBNoE+gQPBSAFPgVeBXkFlwWuBc8F8AUKBhEGGgYeBhkGAAbjBa8FegVUBTIFGwURBTMFWgWFBboF8AUtBnIGjQakBuIGBAcyB1gHhQe2B9kHBggiCDoISwhDCDYIJggnCCII+ge3B34HKgcHB9MGjQZWBnUGbAYoBvkFxQV8BUYF6gSjBGYETARABDoEOQQ6BDsEzAOwA6sDrwOiA5sDnwOXA4UDeAN0A3kDfwODA48DlQOYA6EDpwOoA6UDpwOmA6kDsQO4A74DygPTA9kD2QPfA+MD5QPsA+0D8QPzA/ID8QPxA+4D6wPtA+sD6APlA+AD3APOA8ADugOvA6EDkwOEA24DZANZA0wDQwM5AzIDMQMxAzIDMAMvAzIDMgMzAzYDOgM7AzwDPwNCA18DhQOrA9cD8wMMBDMEdASeBLUE1QTwBAkFIQU2BUYFbAWCBaUFwwXjBf8FBAYKBhgGGAb0BdUFiwVJBSAFCAX8BA0FNQVTBXsFpgXaBQ8GNQZIBlsGhAa7BvkGPgeBB7sH1wf2Bx8IMQgvCBkIBAj5B/YH6wfTB5UHWAcfB9QGdQY1BhEGKwYkBvcFqgVqBTQF8gSaBGwEUwQ9BDoENgQ3BDsEQARvA20DdQN7A1oDTgNWA1QDXANVA1UDYQN/A58DsgPAA8UDxQPLA8oDwQPCA70DqQOsA7MDwAPOA9cD2QPbA9oD3QPgA+MD5gPpA+kD6QPpA+cD5wPkA+ED4wPeA9gD0APLA8IDtwOuA6gDmAORA5ADgANwA2cDWwNNAzgDMAMxAzADLwMvAy8DMQMyAzUDOQM8AzwDOwM8A0IDYgN8A5kDtQPRA/ADEgQvBHkEmwS7BNgE+gQTBTUFTAVdBX0FngWzBcwF4wUBBgcGDwYHBtQFigVWBS8FBgXtBP4EGgUyBUoFdAWTBbEF3AX2BRYGTAaGBsEGDgdGB3UHfAeNB7QH9AcMCAgIBAjmB80Hyge+B6gHgAdRByUHyQZ4Bi0G0wWXBagFiwVfBScF1ASlBGsETAQ3BDUENAQ3BDoESARWBB8DIQMbAyADJAMpAycDJgMyAzgDPAM6A2ADwAPlAwYEDwQDBPMD6QPUA9UD3gPTA9ADyQPDA8wD1gPbA94D1wPZA9oD3gPhA+QD4wPiA+QD4QPfA94D3gPhA9sD0wPIA8ADuAOzA6sDtAOoA6IDlQOCA3oDeQNbA0MDMgMvAy4DMAMvAy4DLgMzAzcDOAM5AzwDPQM8Az0DPwNUA28DiAOeA7sD2gMEBCIESQR9BJgEuwTgBAcFIwU7BU8FagWGBZsFswXMBecF5gXiBdIFlQVHBSoFBgXhBNoE9wQXBTkFYwWIBZMFowXHBeQFFgZJBm4GqwbyBhcHLgc2B04HkgfUB+MH4QfPB60HnweuB6AHlQeFB2AHGAezBmcGIgbCBWIFLAUoBRkF3QSdBHoETQQ3BDUENgQ5BDwERgRcBIkEAwMEAwIDBAMHAw8DFwMeAyQDJQMnAyIDLQN5A88DCAQsBDEEMQQmBBYEDwQABPUD7QPfA9kD2wPaA+ED7APqA+cD4gPeA+MD5QPjA+ED4QPdA9oD2APWA9kD3APVA80DyQPCA7wDvQO5A6kDpAORA4wDlAOSA3IDQwM3Ay8DLwMxAy8DMAMyAzYDOAM7AzsDPAM9Az0DQQNFA1MDbwOCA5oDrQPEA/MDEgQcBEgEcQSWBLoE2gQEBSQFNgVHBWUFfwWUBZ8FswWtBYUFeAVgBR4F9QTjBMkE3AQBBSYFUAWEBbUFyQXRBdgF6wUDBi8GXAZ+BrMG2AbaBv0GLgd6B7cHtgelB5kHmgehB64HmgeGB3cHNAfbBpoGXAYSBskFdgUqBeMEvgSdBIUEXAQ/BDQENQQ1BDMEQAROBIUE1gQCAwkDDQMPAxYDFwMRAxADFwMbAxwDHgMaAyMDaQPPAxYEGwQlBDEELwQtBCAEFQQOBAAE9APtA+gD8gP3A/cDAAQGBAME+gP4A/0D9APoA94D3QPdA9kD0wPSA9MDzwPLA8YDwgO9A60DpgOmA6cDpQOlA5kDdANQAzcDNgMzAzADLgMxAzcDOQM6Az0DPAM+Az0DPgNAA0oDXwN5A4kDngObA6cDwgPZA/MDCQRIBG8EjQSrBNIE8AT+BBcFLAU5BUwFSgVSBVgFRQUhBQ8F+QTOBLMEwATuBAQFHQVPBYkFvQXrBfwF/wUEBv4FEwYmBj0GXQaDBqgG3QYwB3EHeQd3B3AHZgd0B4oHiwd3B2wHWAcCB5kGWAYkBvgFxAWCBSkF6wSnBH8EaARSBDoEMgQzBDMEPgRIBHYEuAT6BBADFwMlA0MDVANOAykDHQMXAw8DEAMTAxUDEwMxA40D2wP3AwYEFAQZBCMEJwQjBCMEGwQJBAYEBAQDBAYEBgQPBBQEGQQOBAoEEAQQBA0E/wP5A/ED3APYA9oD1QPPA88DywPDA7QDrQOuA7QDtAOyA6gDmwN8A1oDNgM2AzcDLQM1AzgDOgM8Az0DQAM/A0ADQAM/A0EDSANXA2sDfAOJA5EDmAOhA7YDzwPqAwcEOARfBH4ElgSvBMME0QToBP4EEQUZBRoFGgUfBQgF4gTMBKsEoQTOBPYEHQVBBWcFiQW7Bd8F7wXuBewF8wX0BfMF+AUJBj0GkwbOBiAHQgcdByMHQAdUB2wHeAdqB2IHVQcRB78GZwYWBtsFnQVdBT4F9ATIBHMEXQROBEsEOwQzBDQEOARDBF4EqwT6BDQFRAM8AzMDNgNFA1YDSANCAzoDHAMJAwoDCgMKAxgDVAOWA88D6gP6AwkEGgQhBCgELAQhBB8EGgQfBB0EHQQaBB4EJwQlBB4EHwQaBBkEGQQWBBEEBATwA+kD5QPeA9IDzgPKA74DtwO7A8UDyAPCA74DrwOgA3kDUwM5AzYDOAM2AzoDOgM9Az0DQANCA0ADQQNCA0EDQQNFA08DXgNtA3YDgAOHA4oDmAOrA8kD3QP8Ay8EWQRqBIUEnQSqBLgEwATVBOME7AT5BAAF/gTZBLoEjQSTBMsE9wQwBWUFkgWnBbgFvQWtBaoFrQWmBaIFmQW2BfEFNAaEBsUG9wYFB+wG6AYOB0EHSwdLBzkHKgcSB8QGgAY8Bt0FmgVYBQ0F8gTVBI0EVwRNBEMEPQQ0BDQENQQ4BEoEigTgBDYFfwV3A3IDdQNrA0UDRANLA0cDPgMhAwgDCQMKAwwDGgMrA1cDmgPJA+MD+QMVBCkENQQ6BDcEOQQ2BDIEMQQxBC8ENwQ4BDQEMgQ1BDcEKQQhBBsEEwT9A/cD6gPhA+ED2QPRA88DygO/A8UDyQPPA80DywPGA6cDcwNIAzQDPQM7AzoDPAM9Az0DQANBA0EDQwNEA0MDQgNDA0MDRwNPA1sDZANrA3QDfQONA6EDsgPDA9wD9wMQBDYEXgR3BIgEkQSdBKsEvwTQBNAE1wTaBMAEmQR8BIUEtATaBCsFWQWGBZoFnwWFBV0FYQVcBVcFWwV4BakF5AUhBlwGnQasBp0GoAa8BtYGEQcgBwsH5wbdBsYGjwZbBhQGvwV4BSwF7wTJBKEEcwRRBEQENgQ0BDMEMwQ3BEgEcwTLBCsFcAWwBaQDjQOZA5oDfQNIA0EDPQMyAx4DEAMMAwsDCAMTAyIDPgOAA7AD1QP6AyAENAQ0BDIEPARIBEoESQREBEYEQwRABEEEQAQ7BDsEOwQyBCkEHgQRBP4D7wPnA98D2QPUA9EDzQPDA8gD0QPYA9wD2wPSA9MDpQN5A0YDMAM4AzgDOgM7AzkDPAM8AzwDPgNCA0QDRQNGA0YDRQNFA0oDUQNdA2UDbAN1A4EDkAObA6YDvAPSA/IDBAQfBEoEZQR0BIQEgwSVBKMEpgSqBLUErwSMBGYEcQSuBNcEGAVKBW4FZgVMBTYFIgUXBRAFJAVQBXwFqAXnBRwGOQZJBk0GTgZbBoIGrAbXBuYG0gakBpMGlwZaBhEG2AWkBVwF/gTFBJQEfQRnBEwEMwQyBDEEMgQ1BDwEfATCBA0FXwWqBdwFzwOwA5kDngORA18DPAMxAyYDHwMYAxADDQMLAwoDDgMiA0QDkQPJA/ADBgQKBP0D9gPsAwoEGAQuBDIEOgQ9BEQESwRSBEsEQgRFBDsEMgQoBBcEDAT/A+oD5QPaA9ADzQPBA8ED0APWA9wD4gPrA+wD4AO2A4EDSQMyAzQDNgM5AzwDOQM7AzsDPAM9A0ADQQNEA0gDSANHA0kDTgNYA2ADZANqA3ADdwOAA4wDnQOyA8gD3wPyA/8DEgQuBEQEUwRXBG0EfgSIBJEEpASTBGIEWARvBKEEvAT4BBkFMwU0BRwF/wTWBNQEAAUuBV0FiAWpBdUF/gUaBhwGBgYRBiAGUgaDBqMGsAZ/BjEGEwYYBvwFzAV/BUgFFwXOBJcEeQReBEkENQQxBDEEMwQ0BDwEYwSyBOcEOwWPBeUFFgbXA9sDuAOiA5sDfgNQAz0DKwMkAxoDFQMTAw8DDQMLAwwDGANAA2UDfwOIA5gDpQOwA7kDyQPaA+wDBQQJBA8EKgRfBGwEZwRnBE4EPQQzBCQEGQQRBAYE8APvA+cD2APLA78DxgPOA9ED0QPTA9gD1APGA6kDeQNOAy0DLwMzAzYDNwM2AzgDOQM8AzwDQQNDA0QDRgNHA0kDSwNWA2IDagNrA2wDcQN7A4MDjAOdA6QDuAPPA+ID9AMABA8EIwQ4BEYETARiBHIEfgSHBH4EVwROBHEEiASXBLwE9wQIBQ8F7gTCBLME3QQMBVgFhwWqBckF6gUABg4G9wXWBekFCwYeBkEGXwZjBiQG7QWrBagFrgWaBWIFEQXeBJ8EbwRdBEoEOQQyBDAEMgQzBDcETASYBMcE+ARbBbgFCgZMBvsD8QPLA68DqQONA1oDQAMmAyADIgMnAykDFwMSAw8DCgMNAxUDIgM1A1YDcgOLA5sDrwPBA9AD2gPjA+wD9wMABCkESARIBDsELAQeBBgEEwQOBBIEEAQHBP4D7APXA70DvAPFA8cDyQPCA8EDvgO+A78DlwN4A14DNQMwAzIDMwM1AzUDOQM9A0EDQwNJA0cDRgNHA0kDSgNNA08DYgNqA28DdQN2A30DhAOMA5QDmwOwA8ADygPXA+8D+wMFBB4EHgQjBDUEWQRnBG4EcARDBFQEcwR3BHsEhgSiBLwEtwSKBIEEuAT7BDQFbwWbBboF0QXcBeMF7AXWBbEFtgXXBfMFDAYcBgcG4AW2BXQFUQVcBUsFJwX2BKoEewReBEsEOwQyBDEEMwQxBDQENQRcBKoE2QQXBWoFyQUTBmAGHQQiBAwE3gOoA4UDVAMyAzEDPANWA3YDgANkA0EDKQMcAxUDEgMPAxkDVQOdA7ADvAPCA8gD0QPSA9UD3QPnA+cD3wPrA+0D6QPrA/ID+wMBBAwEJQQpBAwE+gPdA80DtAOsA60DogOfA6ADnAOjA6oDmQOLA3wDYgMwAy4DMAMyAzMDPgM+A0ADRgNQA1wDWgNPA0YDRgNMA04DTgNcA2kDcwN4A3sDfAOBA4gDkAOiA7IDugO+A8MD0wPiA+oD7gP3AwYEEgQ1BEkEUgRRBCMEKgRGBFYEVARhBHcEeARoBGUEeAS5BAEFNwVfBXsFjgWZBZkFnwWzBbUFlQWTBaYFxgXiBfUF3gWZBV4FMAULBRkFDQXlBKwEgwRmBFIEOAQxBDEEMAQxBDAENwRGBGkEpgTpBC0FbAW1BfoFRQZXBDgEJgQLBNcDogNdAywDNgN6A6ADuAPHA7sDnANtA0EDMAMlAxQDEgNLA4ADnAPRA+QD9gP+A+sD3QPWA9QDygO/A8QDxgPGA8UDyAPXA+wDCgQoBB8EBgTfA8ADqAOTA5EDiwOGA4YDiAN8A3kDegN0A2oDYQNPAzYDLgMxAzQDOgM9Az4DQANYA2wDbwNsA1QDTgNIA0gDTANPA1oDZwNwA3gDfQOAA4QDjwObA6gDsQO1A7sDvgO/A8QDzgPWA9oD5QPxAwcEHAQoBDcEIgQBBAcEIQQwBDkESQRIBEsEZgSSBLQE7AQEBR8FOQVJBU8FSwVTBXIFcAVjBXEFjAWzBeMF6AWfBVsFLAUQBfEE4QTZBL0EjgR4BGAETwRDBDcEMAQwBDAEMgQ6BFUEfgStBOQEJwVdBZsF1wUjBoYEcgRHBBkE5gOyA24DQAM4A1oDgAOkA8QDzQPDA6kDjQNyA04DKgMVAxQDLANYA60DzQPQA9wDxwO9A7oDrwOTA4sDkgOeA8EDuwO+A8cD0APXA9MD0AO6A54DjQN+A3kDegOBA4cDfgN1A2oDVQNSA1ADQgM8Az8DOgMwAzUDOQM6AzsDOgNMA4MDmwOOA2UDVgNQA04DSwNLA08DWQNeA3IDfgN9A4MDjgOZA6YDsgO0A7cDvQO9A70DvgO9A8EDxwPMA9cD4wP0AwcEDwQMBPkD6APtAw4EIQQeBCcEUARtBIAEmAS0BNcE6wT8BAwFEwUMBRsFKgU5BUEFVwVxBaIF0QXQBZQFYQVCBS4FCgXcBL0EqQSNBHcEYwRRBEcEPAQyBDIEMAQyBDsEWQSVBNQEEAU2BVIFjgXIBRQGqgSLBGEEKQQIBNIDlANWAz4DNwNQA4kDuAPQA9sDyQOpA4wDZQMyAx0DEQMXAyMDRgNbA2UDagN0A3YDZQNOA0MDPwM3A0ADWgN2A40DlgOMA4cDjAOJA4IDeQN0A3EDfQORA6sDswOJA2gDTQM9AzQDMQMuAysDLQMsAysDNwM4AzcDOAM5A1sDkAO0A7MDhwNjA1gDTgNNA1ADVANUA2cDewOEA4wDjwOaA6ADpgOyA7gDugO8A7wDsAOkA6MDswO/A8EDwgPIA8wD2APfA9sD0gPLA9ID+AMJBB8EOgRQBFYEYwRvBJAEqgS5BMYEwAS4BLkE1ATsBAkFNgVWBXQFlAW6BcoFngVvBWMFXAUwBd8EpgSTBIAEbQRdBFEERAQ3BDQENgQ5BD0ERQRgBKwE7wQqBUYFhwW4BeEFGAbiBKgEkgRnBEAEEQThA5wDYgNKA0QDbwO3A+YD9APvA8kDnAN7A1UDJwMWAxQDGgMpAzsDRgNEA0YDSwM/AzcDMgMvAygDJQMsAzIDQQNOA1IDWQNnA2wDagNkA20DhAOoA8kDygOrA3cDVAM3AzADKAMnAygDLAMrAywDMgMzAzMDMwM3A0UDeAOvA9cD1wOlA2YDZwNjA2YDdQNnA1wDbAOFA40DjwOaA6wDswO3A7kDuAO0A7MDqwOPA4oDkAOWA6IDngOXA5wDpQOzA7kDuQO5A7oDzgPpA/QDAgQbBCUELAQ7BFUEawR7BIUEhwSFBJQEswTWBPYEGwU5BUoFXQV3BYgFjAVvBS4FBQUHBQcF2wSTBH4EbQReBFMESQQ7BDQEOAQ+BEUETgRSBH4EwwQBBS4FaQW2BeAFGAZTBigF7ATBBKAEaQQ9BBIE7wOsA2sDTwNRA2kDwgPwAw4ECgTYA6YDhgNgAzMDGgMXAyADPANHAzcDMgMxAyMDMANKA1gDRwMwAy8DLQMsAzEDQQNJA00DVANeA2cDfgOoA8ADugOlA4sDWQM4AyoDJgMmAykDKAMpAysDLwMyAzADMwM0Az8DbwO6A+QD+QPwA6UDggOSA4wDjgOOA4MDaAODA5YDlgOVA5kDqgOxA6wDqwOsA6YDmgOPA44DnwOoA6EDnwOlA6MDoAOfA6EDogOkA6oDrwPFA9sD5wPvA/ID/wMQBB0EOQRJBEwEWQR5BJkEyATtBA8FIwU8BUoFWAVeBWYFagVoBU0FEwXVBMgEzQS0BHcEZwRdBFQESQRCBDMENQRDBEsEVgRgBGAEmgTnBBcFbAW2BdsF7wUjBl8GSgUTBeIEuwSLBFcEIgQNBO4DwAOEA14DVgN3A8ID/wMXBBME+wO+A44DbgNGAyYDGwMaAxoDHQMeAx4DFgMiA1kDjAOYA4IDZwNGAy4DJwM7Az8DOgM/A1MDYAN7A4UDdQNpA2IDTgM5AykDJwMmAykDKQMrAywDLAMuAy8DMQMxA0YDZgOuA9gD7gPwA98DrAOJA4gDiQOHA5ADiwNnA3sDmgOqA6kDsQO6A7MDpwOhA40DhwOHA5gDtwO/A8gD0QPZA9kD1QPIA8QDvgO3A7YDtAO1A7kDygPSA88D2APuA/gD/wMMBCAESgSQBLQE2gT1BBAFKwVZBXMFdwV8BYYFiQWLBXkFWQUlBeYEwASeBIIEYwRTBE8ESgRBBDIEKwQ6BE8EWwRoBHUEfAS9BAkFVQWPBa8FqgW4BesFIgZ2BUgFHgXfBK0EeQRNBCcEDgT4A98DrwN2A14DfQPdAwwEIgQjBPcDvQOmA40DbAM7AywDJwMhAxkDHQMoAzkDbQOeA7QDsgOmA40DTwM0A0ADSAM0AzIDPANDA1QDVAM8AzMDMQMvAygDKAMsAykDKgMpAysDLAMuAy8DMAMyAzkDYwOeA7gDvQPAA8EDvQOjA4oDigOMA5ADlAOVA4wDewN4A4kDnAPBA8sDuQOpA5ADewOHA6IDwQPRA9ID5QMSBCQEJAQjBBkEDAQQBAIE9wP0A+UDzAPDA8IDuAO9A9sD7gP1A/sDEAQtBH4EsgThBAoFMAVZBX4FoAWvBakFswW6BcIFtgWIBUkFDAW9BIIEaARSBEEEOwQ6BDAEJQQwBEMEVQRnBHcEhQSUBL8EGQVCBUMFTQVkBZIF5AU5BqoFgAVUBSUF+QTXBLUEiARXBC4EIwQJBMYDcwNmA5UD9wMrBEcEQwQiBAQE4APCA5cDdgNeA1QDSQNAAzsDRQNuA50DvwPRA8kDpgOFA1gDMgMpAygDLQMwAykDKwMoAyMDJAMlAyYDKAMrAzEDLQMsAywDKwMsAy4DLwMzAzgDUwN/A5wDpgOoA6gDogOZA5EDigONA5ADlQOaA54DngOdA4YDeAN2A5EDqAOeA5UDmAOMA50DrQO+A9MD4gP6AzIESwRdBG4EdQRyBHAEWgQ+BC0EDwToA+ED4APDA7gDywPfA+QD6QP3AxAETASEBLEE7wQjBVkFcAWXBasFsAW6BcEFwgWpBXAFQwUFBa8EcgRWBD0ELwQsBCwEIwQtBDYEQARUBGYEegSRBKMEvQTkBPUEGQVBBYYF2AUiBlQG8QXRBaUFdAVBBRgF+wTbBLMEjwRYBDAEDASoA3cDcwPEAyIEaQSABH4EaARGBBUE3gO1A44DgwNtA18DVwNRA2MDmAO9A8gDvAOeA4YDbwNEAycDJgMpAygDJgMmAyUDKQMnAyUDJQMpAy4DLwMxAzADLwMtAywDMQM0A0IDSgNiA4UDkwOdA58DnAOYA44DjgOOA48DlgOfA6MDpAOkA6gDrAOpA5cDgAOFA5cDoQOpA7ADygPMA8ADzgPjAwoEOgReBIMEpATDBN4E1QStBI0EZQQ8BA4E/QPyA+EDywPIA80D0wPbA+ID7gMXBEAEdQSqBOgEIwVdBYYFmQWWBZYFkgWLBXgFXwUsBeEEiwRXBEMELwQpBB0EFAQYBCYENARFBFoEawR9BJYEqAS8BNUE8AQaBWAFpQXUBe0FDwY1BhMG6AWwBXoFXQUzBQwF6wTBBKAEWAQRBMIDiAN/A6kDEgRqBJMEqwSrBIsETgQPBNUDnwOWA4wDdgNnA1wDVQNjA5EDtQOwA5gDegNmAz0DJQMkAyYDKAMrAyoDLQMuAy0DKAMpAzQDOgM3AzcDNgM0AzMDMgMyAz4DTwNZA2wDjwOUA5sDnQOZA5wDnwOkA6MDmAOdA54DowOkA6YDrAOwA60DqgOhA5UDlQOlA7kDxgPNA9oD2APtA/kD/gMrBFoEfQSnBPgEGAUUBekEugSSBG8EPgQZBAUE+gPxA+QD0APKA8gDzQPYA+8DCQQxBHoEtAT+BDsFagV/BX4FeQVuBWAFSAUuBQIFswRcBDEEJAQgBBUEBgQNBBoEKAQ8BEoEXARtBIUEmQSrBMEE0gTmBA8FQAVZBYkFuQXZBWoGOwYWBukFwQWfBWsFOgUWBeAEsQR9BC8E2gOeA4cDlwMgBHEEmQS4BLsEsASNBF8EBQSxA5sDjAN4A2sDZANXA0wDaQOjA68DlgNlA0cDNAMnAyUDKgMsAy0DLQM/AzsDOgNBA1YDZQNfA1oDWgNaA1QDSgNIA00DWgNxA4MDjAOZA5UDngOiA6IDowOkA6UDowOeA50DnwOlA6cDqwOuA68DqwOlA6YDqQO0A7oDygPTA90D7gPxA/UDCQQMBBwESQR2BJwE7QQsBT8FHgXnBL0EmARrBE0EMwQUBAYE+gPwA+ID0gPLA8wD3APzAw4EOgRzBKoE9wQ5BV8FYAVRBUkFOAUVBewEsQRpBC0EGAQUBA4EBgQCBA4EGAQjBDcESgReBHQEpgSzBL0E8AQaBSkFPwVMBVIFdgWlBcEFjwZfBjgGDwboBcUFjwVaBSgF6ASbBGMELAToA70DoAOZA/gDXgSGBKQEsQSvBJkEYwQJBLsDoQOGA3QDZgNnA2gDXANTA2IDaQNMAzsDLQMtAzEDMQM4AzQDMAMxAzcDOgNQA3EDjgOJA4EDfgOAA34DcwNoA2UDZwOAA5kDoAOYA5wDmAOdA6EDngOeA58DnwOfA6ADowOhA6kDqwOtA7QDswOwA60DtQO3A8cD2QPqA/oDBQQRBA0E/QMRBCUEMARMBHAEqgT0BC4FSwVABQ8F5gTCBJgEeQRXBEAELAQlBBIE/gPtA9kD0APNA94D+AMSBDgEiwTABO0EHgU2BS4FIwXzBL0ElARrBCcECAQFBAEE/QP8AwIEDAQWBCUENwRWBHwErgTyBAgFBAUuBWIFhwWXBaIFsgW9BdAF3AWrBn4GSAYbBvEFugWPBUsFBgW7BIYEUQQUBN0DwAOnA5QDvgMhBGkEhgSPBIsEegRQBP8DyAOuA48DdQNnA24DbgNTA0UDPwM6AzUDKgMzAz8DUwNRA04DSQNIA0QDRANMA1wDdQOLA44DjQORA4sDhQN9A3cDdgODA54DrAO1A7IDqwOmA54DngOcA50DoAOhA6EDowOqA6sDrQOtA7QDuQO9A7oDvAPIA8kD1wPnA/gDCQQXBBoEFQQfBCsEMQQ/BFUEggTGBAgFRAVuBXgFVQUDBd4EwAS1BJcEgwRuBFoEPQQfBA0E9APYA80D1wPxAwgEIARUBJsExgTdBOAE0ASxBJUEcAQ+BCIEAwT2A/YD9QP3A/kD/wMKBBsEOARhBJAEtgT4BDAFTgVQBWoFlwWwBbgFwgXXBeAF4QXkBb4GigZNBhAG6wWxBXkFQAXvBI0EUQQzBBIEBATaA60DjgOMA7YDDgRRBFQESwQzBBEE8wPGA5YDcANeA1MDSwNHAzkDNwMzAywDLgMwAzQDRgNhA2QDXwNaA1QDUANRA1UDWwNcA2oDfgOQA5wDlQOMA34DewOCA5UDqAOvA6wDrQOtA58DnAObA5wDnQOeA6IDpgOpA6wDrwOzA7gDvAPBA8cDxQPMA9gD4APlA+wD/AMHBBIEHwQmBDUERgRJBFIEewSZBM4ECQVGBXkFmAV1BRgF7wTpBNwEyAS4BKAEjgRtBDQEHgQBBOIDzAPiA/AD+wMIBBIERAR3BIcEgwRvBF8ESAQnBA4EAwT1A/UD9APxA/MD9gP5AwYEGARPBJQE2gQUBT4FYQV5BZMFqAW8BcMFzwXVBdgF0wXOBc0FsAaGBkUG+gXGBZYFYQUiBeEEiwROBFYEWQQ0BO8DyAOYA4UDfgOiA+cD7QPUA8YDuQOlA3cDVwNGA0IDQQNBAzsDNAMyAzIDNQM+Az4DPANHA1sDYgNdA1sDYgNmA2YDaQNoA2MDYQNqA38DjwOGA3wDgQOIA4YDhwOOA5IDlAOXA5YDlAOWA5kDnQObA58DowOpA68DswO0A7cDugPBA8oD0QPWA9gD4wPrA+8D8QMBBBEEIgQ3BEUERARUBGkEewShBKwEywT+BEQFfQWeBYQFNgUDBfUE5gTSBMEEsgSeBJIEWAQvBAoE4QPKA9ID6QPyA/QD+gMHBBYEIAQeBBUECgT/A/gD8gPtA/ED8wPuA+4D8QP2A/kDDQQ8BH4E2AQaBU0FagWNBaMFrQW7BcwFywXIBcUFvwWzBa4FrwWmBnYGNgbeBaUFawUnBewEuQSKBGwEfgR0BDcE+APTA7EDjwN8A3cDggOMA5oDngOSA24DUQM9AzYDOQM8Az0DPgNEA0UDRwNTA1UDTgNIA0oDVgNgA2gDawN2A4YDjwOIA4kDfQNtA2UDawN2A3QDdQOBA4sDiwOMA48DkAOTA5cDlgOYA5kDmgOdA58DowOpA60DsQO3A70DwgPDA8sD0gPaA+kD7QPwA/UD/QMIBBgEKARCBGcEegRuBHgEiQSlBLIEwwTbBPwETQWLBbIFkwVPBQsF9wTsBNoEwwSwBJ8EkwRxBEgEIATxA9ADzQPiA+oD6gPoA+gD4wPiA+oD6QPrA/AD8QP4A/YD8APzA/AD7gPvA/QDBAQjBGAEsAT+BFQFgwWbBbUFvgW+BcMFwgW2BaoFowWcBZEFjgWUBaUGcgY4BvUFnAVOBRcF5QSqBJIEqQS9BKQEaAQZBNoDwwOiA4EDcgNuA3ADhAOEA2YDSgM7AzoDQQNFA08DWANlA3IDZANkA2YDZANdA1oDWQNvA4sDhgN6A3kDkgOhA5UDjgOLA4MDcwNsA28DcwN2A4ADhQOOA5EDmAOdA54DoAOhA6ADogOgA6ADpAOpA7ADtwO4A8EDzAPQA9ED1QPaA+YD9AMBBAcECwQSBBwEJwRDBFkEdwSMBIgEnQS5BMIEzATZBPQEGQVKBYcFuAWsBW0FLAULBeYE3gTOBLkEqwSbBHUETgQuBAAE3APXA9MD1wPcA9oD4gPmA+cD6wPoA+YD7APwA+sD6APnA+gD8QPzA/ID9QMHBEAEfwTUBB4FZQWXBacFuQXEBbwFsgWlBZUFhwV/BXoFdQVzBXgFmwZtBicG6QWtBUoFGgXzBNME5QQBBRoF7QSnBFoECATZA7kDjAODA3IDZwNkA1oDTAM/AzsDSwNvA5kDqAOaA5UDjgN/A3QDdgN4A3QDbwNrA2sDfwOIA4EDgAOOA5sDpgOZA5UDkAODA3YDcwN2A4ADhgOOA5cDnAOgA6UDqgOuA64DrAOpA6UDpQOqA7QDuwPEA8gDzQPZA98D6APwA/kDBgQaBCMEGQQdBC4EPQRABFYEcgSDBKQEtgS/BNkE9gQaBTwFPAUxBUwFhwW3BcIFlgVRBSoFBAXvBN8EyQS6BKsEgwRUBDEECQTrA9wD1QPbA+cD6QP1AwQEBgT9A+8D7gPpA+ID3gPfA98D4QPmA/QD9wP7AxYEZgSyBAAFQgVyBZkFpwWgBaAFoAWTBYUFegVmBVcFVAVUBVIFVQWoBm8GHQbsBZ0FTgUhBRkFHgU0BV8FSAUgBeAElQRFBO8DyAOfA5EDgANuA2MDXgNUA0ADTAOLA7wDwwO9A7cDsgOvA7gDvQOaA44DjwOOA4IDeAN0A3wDgAOJA5UDlQOmA54DlwOXA4wDfgN5A4IDiAORA5gDoAOnA7EDtQO4A7kDugO6A7cDtQO3A7kDwQPJA9QD2gPmA/ID+QMHBAsEEQQlBDkEQQQtBDgEVgRpBGkEbQR8BIsEtQTlBAkFMQVRBXIFlAWJBWEFYAWUBcEF0AW3BXwFTgUiBfsE2wTNBMUEvASbBGgEOwQcBPkD5gPjA+gD8wP7AwUEEwQUBA0E/QPzA+sD4wPhA98D3wPiA+MD8QP+AwYEGwRmBMMECQUwBUoFXwWDBY8FjQWNBX0FXgVJBTsFNQUzBTwFPwVIBbsGdQYkBsQFiAV9BV8FfAWEBZ0FpwV2BTMF8gSuBFYE+wPdA7gDpAOTA3kDZgNcA0wDSQOCA7ED2APdA9UD0gPUA9AD1wPqA9oDxwOoA5sDjgOMA4ADhgOMA5ADkgOWA5sDlwOXA5oDkQOIA4UDiQORA5cDnwOuA7UDvQPFA8gDzAPMA8sDygPJA9ID2APcA+AD6gP2AwQEEgQxBC0EJAQkBDkETQRfBFQESgRlBIQEkASSBJwEuATGBPoEKAVkBY4FrwW+Bb4FpgWkBcMFxwXRBckFogV/BU8FHwX+BNwExgS2BKMEhgRYBCIE/wPxA/ED+AMBBAUECAQMBA4EDQQIBP0D9wPxA+gD5gPoA+UD7QMIBBAEGAQsBGMEqgTpBAkFLwVQBWEFdQWCBXQFTwUqBRoFAgX4BPcEAgUHBRAFoQZUBhYG7QXuBesF0gXaBeQF1QXFBX0FNAXqBKcEXgQKBOkDyAOxA5UDggN1A1oDUwNkA54DtAPUA/YD+gP8A/YD7wPvA/cDCQQIBPQD3AOwA5sDmgOZA54DnwOdA6MDoQOfA54DmAOSA44DkQOXA6QDrAOyA7oDxAPNA9UD2wPjA+MD3QPmA/kDDQQZBCEEFgQEBAgEEAQfBEEESQQ9BEcEUwRpBHcEegRyBHMElwTBBOAE+QQJBQgFBQU3BYsFxwXrBfkF5wXXBesFBAYWBgEG3wXLBZ8FhgVXBSsFAQXfBL8ErASOBGEEKAQMBP4DAgT7A/0DCgQPBBgEHwQaBA0EAwT9A/sD9QPxA+8D6gPqAw4EGQQlBDcEbQSgBM4E8AQUBSwFSQVcBVwFLgX/BO8E6gTdBMkEswSyBM8E2ASqBloGMgYzBkgGOgYqBiIGIAYLBuEFgwUuBeoEswSQBEgECwTjA9EDrQOWA30DaQNjA4sDvQPWA/AD/gMGBAYEBQQTBB4EIgQ4BEEEQAQZBOQDvwOwA6wDrwOzA7EDtAOzA7UDsgOkA6QDpgOqA7QDwgPJA8wD0APXA98D6gPvA/UD+AP4AwMEFAQpBDwEQARABC8EJwQnBC8EQwRbBFkEXgRsBIUEpgSmBKkEpAS6BNkE7wQVBUcFNQUzBVAFiAXGBQgGLQYhBiEGLQY6BjUGIQYCBuoF0wWwBYsFZQUyBf4E1wS7BIkEYgQ1BBcECQQHBPoD/QMNBA0EFAQgBB8EFAQEBP8D/wP4A/sD/QP8A/gDBgQWBC4EOwRiBI0ErwTLBOwEBgUkBTUFKwXnBMYExAS6BJAEeAR/BIAEigSQBMQGmAaZBowGlwaCBnYGZAZTBiYG9AWpBVcFAQXSBLEEjQRcBCgE+gPiA8cDngN8A3EDpQPSA/sDIwQ1BCsEJQQ8BGkEhQSRBJsEqgSIBEAEEwT6A90DxgPDA8oDxwPMA88D0gPQA88D0APsA/wD+wPyA/YD+AMIBBwEDgQCBAQECQQRBBAEGwQvBEwEXgRcBE8ESAREBEQEVgSTBJ0EnASHBJcEsQTcBO4E/ATuBOcE9gQEBRsFcQWXBZMFmAW/BekFLwZjBlwGagZ4BnUGYQZHBigGBwbwBc0FnAWFBWkFIgXkBMEEnQR1BDsEGQQRBA0EAAQBBBMEEwQOBA4EEQQUBAYEBQQFBAYEFQQcBBwEHQQWBAcEIQQ+BFoEeASVBLAEygTjBPkEBwX5BLkElwSABGAESwRQBGwEawRrBGsEJAf+BgsHBAftBtAGzAbEBqoGWwYhBuIFlgVHBRkF6gS1BJsEcwQsBP4D6wPHA5UDbgOTA8AD+AM6BJQEkASHBJEExgTqBPUEBgXsBK8EcQQtBBsEFgQIBPYD6wPuA+wD8QPwA+sDAQQYBDoEVARYBFMESQRVBHIEgwSABEcELAQqBC4ENgRXBIUEmgShBKIEiwR9BHMEawR6BNYE3ATQBMoE2AT5BBQFKQU+BSsFFwVbBWMFTgWVBcwFzQXNBQQGRwaFBpwGggaWBq0GoQaNBmsGQQYcBv8F7QXCBZoFcwVABQEF2ASrBHcESgQuBB8EFwQKBAoEGwQZBBQEEQQRBBAECgQKBAwEDAQcBDEELwQpBBwEDwQfBDYESgRfBHUEiwSYBKAEpQSyBK0EhwRqBEMELQQgBCcEQgRFBEcETAR5B2oHagdpB04HOQccBwIHzgaKBkgGDQbWBYUFSAUoBfYE1gSyBGUEGQT2A9kDwQOXA4sDpAPbAxEEbgSpBLsE0QQCBTsFUQU8BfoEvwSaBE4EMAQ1BDIELwQhBAoECgQbBC0EJwRDBGYEegSKBJYEpASgBKIE1wTrBN4EpQR4BFgETgRbBJYEyATmBOgE3ATVBOAEvwShBK0EDAUwBR4F+QQeBUoFWQVjBXcFXwVfBZ8FlAWHBcUF7gUJBhMGRgaIBsQGzga5BtEG6QbRBrwGkQZiBjcGFQb7BdQFnwV9BUMFDwXiBK8EegRaBDoELgQiBA4EEgQhBB0EGgQYBBYEFAQTBBMEEgQOBB8ENQQzBDAEJQQVBB4EKwQxBEEETARWBFcEXwRlBG0EbAROBCAEIQQhBCEEIQQoBDkEMgQrBN8H0AfRB8QHrQeJB1cHMAcOB78GdQY1BvYFtwWEBV0FLAUJBdsEewRUBDgEMwQTBO8DwAOXA8sD8QMvBFIEdATHBCgFXAVtBVkFDgXKBLAEhgRdBFoEWgRWBFYEOAQlBDgEYgR5BJUEzQToBOcE7QToBOYEBAUzBRMFBAXoBLUEhAR1BIcEwAQaBSIFGwUwBTkFMQUDBeEE9wRGBW4FVwU8BVwFkwWuBc0FtgWDBZoFyQW1BbMF4QUEBkIGbQaRBs4G/AbkBtwG9QYXBwUH0gaaBn4GYQYvBgAG4AWyBYkFUQULBdwEowR/BGYERQQ2BCsEHAQaBCgEKQQiBB8EGwQYBBkEGQQbBB0EJAQ6BDsENgQuBCUEJQQlBB8EJgQkBCAEIQQhBCgELQQuBCAEIQQhBCoEKgQxBDEEOAQ8BD8ECQgOCAcI+wfhB5YHZQc7B/oGzgaXBlgGEAblBcEFlAVjBRoF2AR+BG4EfQR6BF0EKwT1A74DvwPOA/QDHQRLBIgE+wRJBWsFYAUzBQEF6ATFBKkEnwSaBJgElwR3BFwEcQSlBNsEAQVDBUwFQQVDBTQFPQVnBXAFSgUfBfUExwSkBKsEygQBBU4FcAWABYgFdAVQBSMFFAUxBXEFmwV1BXYFigXGBQUGHAbgBaMFuwX8Bf8F3QX0BUQGcQa1BuoGCwcbBwQHCAcpBzYHHgfoBsAGnAZ5Bj4GGAbyBb8FmwVuBSwF6wSvBI8EdQRhBE4EOgQrBCIELwQtBCoEJgQiBB0EHgQhBCIEIwQjBDIEOgQ6BDgELQQxBDcEMAQsBCgEIQQhBCEEIQQhBCEEIQQ0BEYEYQRkBGYEcAR4BH8EfgQuCDYILQgYCPAHmQdrB0UHAQfCBpMGPgYcBu4FwgWQBUYFBgXPBKoEwgTXBLcEmwRuBEAEEQTZA74D1AP2AyEEXgSyBP4EGgUmBSkFOAU0BR4FCgXrBO8E8QTfBLoElgS5BA0FPAVDBXAFkAWfBZoFogWnBaAFfQVXBR4FAAXbBMcE5wQXBVgFmQXVBfIF1gWqBXkFSAVNBY0FyQWyBaYFzAXPBRYGRgZNBvwFyAXsBTYGTAYkBh8GVgahBuYGIQdABzsHMAc2B0cHNwcYB/YG0garBooGZAY1BgMGwgWXBXAFQgUCBdUEtgSQBHIEYwROBDwELwQ3BDgEMwQrBCYEIQQjBCYEJwQsBCwELwQ5BD4EPgQ4BDcEPwQ6BDoEPAQwBDEEKAQtBC0ELgQ3BFYEdgSeBK8EtAS5BLsExATGBEMISwhGCCgI5QeWB1AHCgfMBpgGdgY4BhIG3AWqBW4FNwX0BNkE5gQfBS0F/gTZBKsEbwQ9BP0DxQPEA90DBgQ8BJMEuATPBOsEBwUrBWIFfgVwBUEFMAUtBSYFCQXcBAQFVQVuBWsFfwW1BfAF9gXuBdkFrgVqBVUFMwUFBfsEDQUxBWQFowXtBSkGLQb3BdYFrwWRBa0F6gX3BdgFygUQBiUGYAZ5BmwGHgbsBRsGbAaIBm0GWwZ5Bq0G5wYzB1UHUAdIB0oHTwc+Bx0H+AbQBqkGgAZNBiEG8QW9BZEFZwVJBR8F9ATcBLkEkgRuBFUEOwQyBDkEPgQ4BDEEKwQmBCcELAQwBDQENwQ4BDkEQQRFBEMERARFBEAEPwRDBEUESwRNBEoERwRPBF8EdASKBKoExQTRBNUE2wTpBO4EVQhiCFIIHAjjB5cHWwcXB7gGbgY8Bh4G7gW4BYMFVgUiBRwFIwVWBXgFXQU3BRYF5QSqBGsEKATeA7gDzQPzAy0EXgSFBKsE0wT6BBAFWgWQBagFkAV0BXEFZAU+BSQFYAWgBagFmwWKBdwFJAYdBg4G7gXGBZoFegVQBUkFRAVRBYkFswX7BU4GcAZhBh8GDwb0BdUF9QU3BjoGEwYJBlAGdQaIBqMGqAZwBjYGWgaqBrUGqQaoBr8G5wYbB1IHbQdiB1gHSQc+ByYHEAfoBr8GjQZgBiMG+AXMBaQFfwVhBU4FNwUaBe8ExwSzBH8EWwQ8BEYETgRFBD0ENQQyBC0ELgQyBDgEOwQ+BD4EQgRGBE4ETgRQBFAETwRPBFQEVwRdBGAEZgRqBHgEhASPBJwEsATEBNkE7AT8BBAFIAVrCGcIKgj+B9wHjAdGB/0GugZ8BjAG8wXBBZ4FawVhBWsFegWQBakFrAWOBWgFSAUHBcYEhgQ1BPADsgO8A/ADKwR2BK4E3QQGBTYFVgV9BYQFvwXTBb4FowWgBX0FhQXDBfIF+AXeBcoFCwZFBkcGMQYQBuwFywWhBWwFewWKBacF7AUdBmMGpga8Bp8GcAZJBi8GLgZMBn8GgwZKBj4GdwaoBr8GxQbIBrAGfgaGBtMG9AboBt8G5AYQBzwHaQd7B2cHQwcnBxIH/gblBr0GnwZ8BlgGKQYDBtgFuAWWBXcFXAVFBSAF8wTHBLMEkQRiBFIEXQRYBEsEQwRBBEAEPAQ4BDsEQARDBEkETARMBEwEWARfBGAEXwRiBGgEZgRuBHMEfgSFBIgEjASYBKkEwATRBOQE/AQTBTcFTQVSBXsIYAgeCOcHrQd1BzEH9Aa3BoEGNQYUBgUG5gXQBcwF2wXqBeoF6wXRBZ4FgwVXBRQFywSJBEIE9wPDA8cDEQRcBL4ECwUsBU4FfwWiBcEFzgX6BQgGEgYRBgQGygXaBSAGPQY8BhgGCAY8BmkGagZHBicG+wXdBckFrAXHBekFAAYyBn4Gugb+BgQHyQagBngGbQaDBsAGzwbBBoEGcwa5BukGBAf8BvUG3AasBr8G+AYkByIHDQcEBzcHcgeOB3MHVAcuBw0H8gbaBr4GnwaCBl8GOAYZBvsF1gW2BZoFeAVPBTEFFAX2BMYEpAR/BFsEXQRfBF0EVgRTBFAEUgRQBE0ETgRSBFMEVQRYBFoEXARjBGwEcgR6BH8EjASSBJ0EnQSvBLwExQTFBLYEzATxBA8FJwUyBUwFZAV8BYgFawhbCDQI+geoB3EHHAfjBqsGewZcBmIGUwY7BioGKAYoBhcG7QXXBb8FmwV3BUoFEwXKBIQENwT5A8wD5AM0BJ4E5gQwBXgFqQXdBfQFDQYfBjwGVgZPBj8GOAYjBj0GaAZoBl4GUgZVBnMGjgaKBloGQAYmBgwG6wXaBQoGNQZIBmgGzgYYB0IHNwf4BuQG1QbEBtQGCAcBB+4G1gapBt0GEgczBzUHKgf8BtsG4AYiB1kHWAdMB1UHeQeYB44HbgdMBycHBQfqBskGpAaFBnEGUAYqBgMG2wWsBYoFbgVNBS0FDwXsBNAEsgSQBG4EaQR9BIMEdARpBGoEaQRoBGgEaARmBGkEYARoBG8EaQRpBHYEewSLBJYEmwS0BL4EywTWBNwE6ATxBOgE3AT4BCcFPwVlBXcFjwWYBaIFrAVTCEgILQgGCLoHewcvBwAH5gbbBtEGxgaxBo8GdAZRBjkGFwbbBawFiAVtBUcFIQXnBJ8EbgQrBOgDzQMGBFMEowT3BFAFmgXXBf8FLAZRBnAGiQaSBpQGhwZ6BnQGhwaiBqoGogaTBpoGsQa5BrMGkwZ0BlwGQQYVBgcGPQZzBosGmwbbBioHaQdnB0YHHwcSBxMHHwc9BzwHJAcNB/EGHgdFB2oHawdRByoHIgdKB3YHkgeJB4MHlQemB6EHkwd+B0wHIwcLB+EGuQaVBnQGVwYzBg4G6QW8BZAFbQVJBSkFDAXrBMoEqASQBH4EgQShBKsEowSfBJ0ElgSWBJIEkwSZBIwElQSFBH0EhQR6BHAEhwSUBKIEsATFBNsE4gT7BAcFCwUfBS8FHQUJBR4FVQWEBZ4FvAXLBc4FzgXQBUAIOQggCAAIzgelB4IHagdSBy8HGgf5Bs4GqgaIBlcGMwYMBsYFhQVWBTAFGgX9BMEEgwRfBCME6QPfAygEdQScBPMEUAWJBb8FAAYxBmAGkQa6BrsGxga6BrUGvwbZBt8G3QbTBs0G3QbwBusG2gbIBqkGhQZkBksGSwZ0BpkGsQbeBgoHYAehB5kHgwdsB1oHSQdZB2kHbAdgB0UHSAdRB3sHngecB3gHVwdXB30HsAfFB9MH2AffB94HvgenB4cHWAc2BxUH4Qa9BpEGbgZJBhsG8wXSBaYFgwVnBUQFKQUIBegEwwSdBIAEgASzBMoEzATEBLoEugSzBK4ErQStBK0ErAS4BKMElASbBJYEhASgBLUEuQTUBAQFHgUrBTcFQgVVBW4FcQVlBUYFWgWOBcUF5AX7Bf0F9wX3BfUFKggnCBUIBAjqB9oHwwejB3cHOwcMB+kGxAaaBnEGPwYUBuEFswVoBSMF/QTdBLwElARjBDQEBwTSA9gDJgRfBJUE1gQ2BXoFsAXWBR0GWwaLBrQG0wbdBt4G4Ab0BggHEQcNBxIHEAcYByMHGQcLB+4G2AbCBrEGnwaTBrYG6gYDBxoHUAegB8EHuQewB6oHoweiB6wHqAefB5EHjgePB4cHqAfLB8QHmAd4B3UHlwfWB/8HEQgPCPsH7QfSB7EHggdZB0sHHwfxBs4GqAZ/Bk8GIQb/BeIFwgWcBXsFWAU1BRAF6AS8BJIEjwS7BOAE8wT7BPcE5gTVBMwEzgTMBMwExwTJBNYE1ATNBL8EuAStBKsEsgTEBOwEGgVCBWkFfAWIBZMFqgWrBZ4FhwWEBacF7AUWBiwGLwYsBiYGGAYECP0H9wf7B+0H4QfGB5cHUgcYB/gG0waaBngGOQb5BdsFrQV7BUgF+wS5BJwEhARiBEkELgQKBOID4QMSBEYEdATOBB4FWwWLBaQF1QUvBl4GjQamBsIG5QbzBgAHEgc4B0cHVgdXB1YHRwcwByoHFAcBBwEH9gbxBvAGCActB00HZweZB9AH7gfeB8YHvQfIB9wH4AfeB9oHwAerB7MHugfSB+8H2gfFB7UHwAfZB/YHNQg+CCgIDgj4B9oHvQebB3gHWAc2BxIH6ga/BpgGbgZMBiUGAAboBcYFjQVeBToFCwXhBLcEmgS8BPAEGgUzBUMFSQU1BRUFAAXzBO4E/AQIBQoFEAUXBRsFBwXrBN8EwQSoBLwE8AQdBVkFiAWyBdIF3gXmBfAF4gXOBbgFvgX8BTwGXQZ0BmIGTQY3BrcHuQfGB9kH6gfmB7kHdgcwBwEH3waqBoMGSAb+BckFmQVxBVIFHwXcBLIEnASJBHQEXgRIBCsEAwTPA9gDKAR5BNQEDgU7BV0FdwWgBfMFJgZJBmAGdwakBskG8gYaB1IHegeHB3sHcAdiB1QHTAc/BzIHMQciBygHOgdHB2oHmQe4B9AH4gfvB9gHuQenB6MHrAenB7wH2wfnB+IH3AfxBxIIIggQCPoH/QcRCA4IJghaCEcILwgXCAAI3we/B6gHhwdoB0QHGQfyBsUGnAZ8BlUGJgYBBuIFvgWMBVoFMgUABdgEtQS1BOAEEwVLBXAFgwV9BWoFRwU8BSwFHwU1BU8FXQVnBWYFXAVOBUEFIQXvBMEEtgTpBDgFcgWeBc4FAgYmBjgGJgYSBggG9AX/BTAGaQaTBqYGkwZ2BlkGjQefB7EHzAfqB/MHyAeTB1EHEwfoBp0GXwYxBgAG0wWDBVAFJAX+BO0E9QT7BOYEzwSuBGwETQQSBNcD1gMqBGwEvQTdBPsEKgVQBXYFtAXiBQIGTAaLBr8G6gYZB0MHbweZB6IHkQd9B3EHeAdxB2cHXQdhB2IHaQeBB4UHkAejB6cHrAfAB74HqweQB3wHcgduB2oHewebB9MHBwgYCCMIPwhSCE0IQAhGCEUIOQhRCGEISwgtCB0IBwjuB9EHqQeIB2YHRgcaB+cGxAahBogGTAYZBuUFvAWZBW8FSAUgBfQEzAS0BNwECwVNBYAFrgXFBb4FmwV5BXkFbQVlBYEFmgWnBa0FqQWQBXAFZAVPBR4F4wTLBOQEMQVnBaAF1gUJBkQGbgZrBloGUgZFBk0GXwaeBr0GyAawBoUGWAa5B8QHzgfyBw8ICgjSB5oHZAcbB+cGswZ7BkgGCgbKBX8FVQVLBUEFNgU4BT0FKwUABdAEgwRRBBIE8QMRBDgEZASfBNcEDwVHBYYFrAXTBf8FRwaFBskG+wYoB0sHcQeXB6gHmQeFB3MHaQd0B3EHeweEB5AHmwecB6QHlweIB4UHiweLB4MHgAd9B2QHWQdXB0AHJgdKB3UHnAfaBwkIOAhtCIkIiAh/CHwIhQiFCIAIbQhSCDIIGAgACOoH0wekB38HZwc8BxEH5QbIBqoGewZOBh0G7QW3BYcFYQU9BRsF8ATWBN0EBwU0BWwFqAXoBfkF7gXMBbgFuAWuBb8FzAXXBd8F4gXPBasFlQWCBWcFPQULBeIE8AQtBV0FngXSBfsFJQZcBoQGmwafBn8GfAadBtQG6wbiBsUGkgZjBtYH7gfvBwgIHggTCN8HlAdhBxwH3gaYBlkGKQb4BbwFnwWbBZ0FlAWSBaEFfgVJBQwF0QR9BEEEBAT1AxYENQRVBH0ExAQWBVQFqQXtBR0GPQZmBqcG6AYcB0EHWQd7B5gHfwdsB18HTQdHB08HVQduB6MHwAe4B6IHkwd5B24HaAdiB1AHOgc2B0EHOAclBwsH7wbpBgIHKQdmB6kH+wdDCIgIsgi5CLgIvQi0CJkIhAhmCEsILQgUCP4H4ge8B4cHeAdNBxIHAAfoBsEGowZuBlMGNAYFBtEFpQVrBUMFJAX8BPAEEQU8BWEFhwXEBRIGNgYkBgIG5gXwBeYF+gUNBhQGFAYJBvoF3gXFBasFhQVhBTAF/QT+BCIFTAV2BakF1AX/BS8GUwaHBq8GxgbDBtUG/Ab/BusGzAaxBoEG6QcRCCIIKQgpCBoI9QeyB3cHSQcNB9EGiQZSBhcG6AXeBecF7wXnBdwFwQWYBVcFFQXLBJIEUwQVBOsD6AP8AyMEXASqBAQFTQWZBe8FHgZCBnAGmQbKBgEHIgdEB2gHYQdQBzcHHQcKBwgHHwcmB0sHiAe6B7kHpQeNB2IHPwcmBxcHDAcAB/sG/QbkBswGyQbIBuwGGAdEB3QHsgfvBzIIhQi9CNII1wjRCLUIlQh4CFoIPAgcCAMI6wfMB6sHeQdWBzoHCgfjBscGpwaKBmsGXAY3BhkG6gW2BYUFVAUnBQEF+gQ4BWcFkAWyBeAFNQZVBj4GLQYoBjcGPgZKBkkGSAY/BikGHwYRBvAFxgWnBYgFXgUwBQ8FQQVbBW0FfwWqBeAFEQY+Bm0GsAbuBg4HJAc4ByMHCgfrBtIGsQYHCCUIOAg2CCsIGggECNsHlgdrBzUH+wamBnAGSwZGBkAGRQZZBk0GBwbHBYkFSgUSBdEEmwRjBDQEDgTwA9wDDARIBIYE3QQ7BWYFlAXhBQwGRwaHBroG6gb4Bh4HRwc0BykHCQfrBs8GwQbNBv8GJQdVB7UHuweUB1sHNAcTB/AG5gbaBsYGtQawBqQGnQaOBp8G2gYdB2wHswfpBxcIZAixCM8I1QjXCMMInwiACGIISAgwCBMI+QfbB8IHogd5B1oHNQcQB/QG0Aa4BpUGeAZeBjAGDgbrBcUFkwVeBS0FCgUOBVYFggWbBcoF/AVLBnEGZgZZBmUGeAZ/BnwGdwZuBmIGSAY/BioGCwboBcAFkwVxBT8FIAVlBbEFzAXXBdsFAgYtBlYGiQbUBgsHSwdwB38HXAc6B/wG5AbDBuIHCAgoCCsIHggTCAUI7QfDB4wHWAckB/IGxwa0BqUGpQaiBokGSgYDBroFgwVJBQMFyASWBHAEWARHBDIEBgQABCQEXAS0BPYEMAVhBYQFvQUEBkYGhQasBsIG7AYqByMHBgfrBtIGsAaDBogGswbvBkAHaweJB2oHNQccBwEHxwaqBqEGmAZ+BmwGZwZhBmoGmQbpBjIHggfUBw8IPgiGCLcIwAi7CK8InwiCCGsIVQg5CBkI+AflB8sHrweUB3kHXgc5BxoH9wbaBr4GmQZ3BkoGJwYLBusFuQWNBWEFOgUYBSAFZwWYBbgF6wUkBlwGjwagBp8GrQayBqkGqgapBo8GgQZsBlYGOgYUBvgFvwWlBYIFUQUxBW4FwAX9BSMGRAZZBoUGvQblBh0HVweOB7AHmgdzB1QHLAcFB+QGnQfIB/UHGAgaCBQICgj3B+MHrweRB3gHUgciBw0HBAfnBqoGbwY2BvcFuwWMBVkFIwXoBLsEuwS1BJgEYwQ4BAoEBQQ6BJEEzAQGBTMFYQWkBeMFFAY7BlEGhwbDBvcGBQfrBs4GpAaHBmkGYAaQBsMGEgdJB1sHSQcsBwsH5wauBogGZwZZBkkGLAYhBjQGVgaFBtUGEAdBB4gHxgcKCGEIlAiZCJMIigh2CGgIVwhACB0I/AffB7gHoQeaB4MHbQdSBzUHEgf1BtgGvwacBnIGRgYhBv0F1wWyBY0FaAU+BRoFQgWGBbYF2gUMBjkGewbCBt8G3wbeBuAG3wbdBtUGugafBokGZQZLBiUGBwbhBb8FmgVoBUMFYgWwBfcFPwZxBpMGxQb7BjYHXweTB7kHxwe9B5sHfwddByoHCAd0B5IHugfuBwwIFAgPCAUI9gfWB7kHogeRB3oHXwdEBw4HygaBBk4GGAbIBZ0FdgVSBS4FKQUfBQ4F6wSuBG0EMQQEBBQEXwSeBNMECQVVBZAFrgXOBeIFIwZxBrEG2QblBtMGqwaMBmEGNAY+BnwGqQbMBvoGJwckBwkH3ga9BpsGZgY9BhoGEgYABgkGOAZZBncGngbSBhgHYQe3BwoIYwiACHUIbQhmCFIIRgg2CCQIDAj1B9gHrQeLB2wHTQdBBzEHIQcMB/oG2QazBooGbAZHBiAG9wXaBa8FiAVfBTsFJAVhBasF0gX3BS4GWQaUBuEGDwcZBxMHEQcUBw4H+wbQBrIGkAZqBlYGPAYaBu0FywWiBXgFXQVjBagF5QUaBkoGcAaxBu4GIwdTB3sHpwfAB98H1we0B4QHXwdBB6AHmwelB7kH3Qf8BwQIAQgACPwH7wfOB6kHfgdlB0MHFQfcBqUGcgY5BvwF4QXRBbMFfQVpBUcFHQX1BMUEjQRKBAoE8QMXBGAErwTgBB8FSgVqBX0FrQX3BTMGYwatBsoGuwaeBoUGRwb9BQUGOAZ7BrEG2AbtBtIGzga9BqAGhwZRBiYG9gXUBeEFJAZ6Bq0GxAbpBi4HgAe6B+YHGwhCCDMIQAg/CC4IIggiCBcICQj5B98HxwebB3kHVgcoBxAHAQfqBt0G5AbTBrQGjwZpBkYGIAb8BeAFswWFBVwFPQUqBVoFtAXgBSEGWAaJBsAG1wYEBxgHJwdABzoHKAcPB+UGywatBogGYgZCBhkG9AXJBZgFjAWLBX8FogXTBfcFMAZsBpcG0wb9BjYHVAd6B5wHywfVB9IHwgeiB4EH2QfaB8oHzwfmB/YHAggNCBIIDQj7B88Hlgd8B04HLAcGB9kGsAaDBlgGMAYVBgMGygWIBWkFQQUQBesEsQR2BEkEJgQEBPcDFgSBBLYE1AT8BCEFYgWuBekFIwZKBmUGegaVBpsGfQYyBukF3gUUBl4Gmwa9BsIGpAaNBoYGhQZnBjoGCAbXBcEF7gU1BogG2wYFBzQHbge4B9sH4QfmB+wH+QcQCBkIDAgFCPIH7wfvB94HxAeqB40HZAc/Bx0H9AbCBqsGkgaNBpQGhwZ0BloGPQYcBvwF1AWsBXAFVgVRBUEFSwWIBcwFGgZrBogGjgafBsEG4wYLBzAHMwcrBxcH6wbNBq0GkgZoBkUGFgboBcMFqwW6BcIFmwWiBc4F9AUkBl8GmQbTBvQGFQc9B1MHbQecB7YHwwfOB8wHwwcRCAMI/AcLCCcIKwgwCDkINwgnCPwHwwd9B10HGwfrBtsGsgZ2Bk0GOwYfBgMG7QW9BXEFSQUmBfgExQR/BEwEQQRUBEcELQT7AzEEiQS3BOYENAV/BakF1QUDBiMGKgY0BkUGaAZEBg0G0wWrBegFNAZ+BqAGoAaGBmsGUQZQBkMGGgboBbAFtwX+BTsGdAa6BgkHQgd7B4kHbgd2B44HnQe+B+EH6gfuB8sHtwetB6IHmweSB34HdgdcBzcHGwf7BsUGnAZxBksGSwZNBj8GKwYPBuwFzwXBBZMFYgV6BacFjQVWBXQF1QUNBj4GUAZRBmYGiAayBucGBwcMBwoHBwfrBrUGlQZ2BlAGOAYcBvsF6wXYBdoF8AXKBbMFuAXhBRMGTQaPBsYG3gbyBiAHQQddB3UHgQeXB6cHsgeuBzwIMggrCDUITghWCFsIWAhHCCkI6QesB2UHLgfzBroGoQZyBj8GKgYOBvEF4wXbBcAFewUmBfEExgSfBIIEjASkBLYEhARNBBAE8ANFBJAEygQLBUwFhAWvBdIF0AXbBe8FGAY2BhsG7QWhBY8FygUnBmQGiQaaBm8GNwYcBhIGCgblBb0FkwWnBc0FBQZZBp8G4QYQBywHNwdBB0UHVwdkB3cHpQepB6EHigdtB1wHVwdSB1YHTgdIBzMHIwcFB+oGugaXBnMGOgYcBg4GAAbrBdEFwAW4BbEFmwV/BYMFsQW1BZMFdAWkBewFCwYYBiMGOgZiBogGqAa+Bs8G6AYHBxQH7AbLBpcGXQZQBjcGIgYkBhAGCwYaBgsG+gXKBdMF9wUuBmoGqAbHBtoG/AYZBy8HSAdVB2UHegeOB4sHSwhSCE4IWwhtCG8IawhgCEsIIQjjB5sHWwcdB9YGowaABlsGJQb9BdgFtwWcBYsFeQVTBSIF1gTDBOIE8QT8BAAF/QTOBJEETQQABAQEYwSiBNYEDwVHBWYFfwWFBYQFqwXrBRUGAwbCBYkFdQWpBeMFHAZnBnwGZQYfBuYF0wXZBcgFmQVxBYgFtAXfBTYGfgbHBvAG/gYNBxgHKgcpBywHQgdpB3AHeAdgBygHJgcnBzMHNQcnBwwH8AblBsUGsgaPBnAGUgYzBh0GDAbyBeIF0wXXBeIFwQWjBbIFoAWkBc0FzgXCBbIFuAXRBe0FCQYXBjcGaAaUBrYG1AbxBg8HPgc5Bw4H2wavBpAGRQZCBlAGLQZGBk8GRgYyBgUGCQYJBhMGPwaKBqcGsgbMBuwG/gYHByAHOgdZB3QHfwdNCGUIdQh+CHoIdghwCGIISAgjCMoHlAdWBxgH3QaLBlwGPAYKBuAFsgWPBWkFSAUqBRkFCAUGBR0FPAVQBVIFVAU9BQ0F0ASXBEUEDQQkBHsEpgTZBPwEEQUjBS8FSQWBBbAFzgW6BZQFVAVVBZkF2gUYBk8GXgZRBiUG5gWzBaAFmgV2BWIFjgXKBf4FUAaHBqwGxAbBBswG2AblBgEHDwcEBx8HLwciBwcH7wbpBv4GFgcoBxUH3wa9BqsGlgaBBm0GYwZcBkQGLAYXBhAGDgYNBgwG9wXHBbkF3AXVBcIF4AX3BfsF6QXaBesFGAZEBjMGNwZoBrMG4AYEBxsHJAdMB2MHRQchB/wGwAZ/BnUGgwZZBmEGeQZwBksGJAZPBj0GKwY6Bl4GeQaSBp0GuwbVBuMG/QYcB08Hbwd9BywIVAhvCH8IhQiACHYIZwhKCB0IxgebB10HMwcDB64GegZEBiIGBwbpBb0FlQV5BVcFQQU/BUwFZgWUBbQFqwWTBW4FQQX7BK0EegQ/BBAEMgR3BJYEvATMBNQE/gQwBVMFbAWFBX4FSgUpBVgFsQXlBQEGLAYwBhsGAQbYBZkFcQVeBUEFbQWwBd4FDAY6BlIGZAaFBpcGlQaVBqsGxAbLBsYG0wbpBtoG0AbRBuMG9wYFBwwH/QbmBswGuQapBp8GjgaZBooGYAZdBkwGTAZHBjAGDQb3BdwF3AX3BfAF1gX3BSsGOAYsBhwGIwZDBmUGcwZWBm8GmAbHBvcGJQdCB1oHeAd2B0wHDgfdBqoGnAaaBocGkwa8BqgGYQZaBoYGfQZ5BlYGVgZpBoEGlgasBsUG4QYJB0oHkge2B6MHBQgwCFsIcgiACIEIfAhzCFgIKwjgB60HcAc3BwQH1gasBpgGewZJBhEG7AXQBdYFuAWwBbYFvQXBBeUF7gXoBcsFkQVlBScF5QSvBF4EFwT4AxoEQgRsBH8ErQTUBPUECwUhBS8FOAUYBRwFZAWiBcYF3AXeBc0FuQWmBZwFfQVHBS8FWAWlBcsF5wXyBfgFDwYwBjoGSQZUBlAGWQZsBnkGiwacBqoGpwa0BskG0wbcBuQG5wbuBuoG3gbTBscGugbABsYGpAaSBpoGhQaIBmEGQwYuBhMG8QUEBiYG/AX2BTAGbgaZBpcGiwZzBocGtAa+BpgGhgamBtoGCgc7B2IHdgeaB5sHawc/ByAH3ga/BrUGrwbOBuUGtgaGBp4GuwapBqQGhQaSBqEGpgayBtkG5AbzBiIHaAe0B9cHtgfaBwYINQhjCHUIdAhyCHAIYwhHCBYI4QetB3QHPAcWB+gGwAaQBlkGNgYaBh4GGQYQBgYGAwYMBh4GMwYXBvAF2QWfBXgFRgUKBc0EfAQ1BAkE/AMBBBsEOQRfBJEEvgTCBMYE2ATqBPwEKAVTBX4FkAWQBY8FhQWABV4FQwU2BR4FLgVrBY0FqgXFBcIFwwXRBeoFAQYOBh0GGgYwBk8GZwZ3BnoGhwaYBqsGvgbGBtcG6AYABwoHAgf+Bv4GBwcWBxUH6gbXBucG6Qa9BpcGcQZgBkgGIQYMBigGTAYUBhgGWAauBu4GDAf/BsEGywYNBxcH8QbBBuUGJwdXB3sHggeLB9AH7AfAB4wHSAcHB+0G2QbcBgYH8Qa7BrQG6gYEB+wGzAbMBuYG4wbnBugGAAcaBz8HaQeWB5YHhQdqB7gH7wcmCEsIYAhhCF8IZwhlCFoIOwj0B8cHpQduB0sHGAfjBsIGrAaDBl8GbAZ+Bn4GdgZ4BncGegZTBiwGAwbdBagFagU1Bf0EzgSGBCsEIQQ1BCYEEQQIBCAEOwRpBIAElwTCBOoECQUkBTcFRgVHBTsFPQU1BSwFDgXvBPMEEQUaBSIFLwVGBWUFgQWXBZ4FqQXFBeEF+AUkBl8GiAamBrgGrgapBrcGwQbaBuwG+gYNByEHKgcjByIHJgdKB2EHTgc3B0MHUQc3B+gGrQa9BsEGhwZgBnAGcQZqBjsGMgZqBrQGBwdCB0kHLAceB0AHQAcYB/EG9QYsB10HiQeRB6sH+gcsCA0I1gdaBysHHQcHBxEHKAcIB+QG8wYnBzsHHwf7BgQHLQclByYHIwc0B2wHmweoB5gHXQc5ByAHxgfoBxcIKQgwCD4IWAhtCHgIcghRCBQI2AfAB5IHbAdUBzwHHgfwBtUGxgbJBuEG3gbUBsAGnQaCBmAGOgYMBsQFoAVfBSUF7QSuBHYEQgQjBG0EkwRxBDUEFAQQBBwEQQR/BK8E3AT4BP4EBgUFBQQF/wQKBQwF9QTZBNUE8AQJBRUFLAVOBVwFXQVjBWwFegWVBcMF9gUsBmYGogbQBukG4AbPBrsGwgbaBvMGDAcaBzYHTwdMB0gHUwdRB3AHmAeDB4YHhAdxB0IH+wbeBgsHBQfaBs4G2wa3BogGUAZXBoIGuQb3BkAHcwd8B3AHnAesB2QHOQcvB04HcAeJB7QH2gcLCDgIIgjiB5EHaAdPBzQHMgdZBzIHIwcyB2YHhwdYBzQHKwdeB3UHewd4B4gHqQevB44HcQdABwUH4QakB7wH4wf+B/cHEwhHCGEIbAhmCEYIIAgACOoHygetB5cHgQdoBzsHIgcfByUHHAcEB+cGwgaaBn4GYgZCBhcGvgWGBU8FEQXaBKYEdQRDBA8EOASeBLgElARsBE4EJAQiBEsEdQSjBLEErQS3BK8EtgTCBM0E2wTABLAEzQTxBAwFOgVyBZYFrgWtBacFogWvBeEFEgZFBncGrQa+BsUGxga9BqIGjAaUBrkG2wYTB0oHaAeFB5YHhgeEB5AHpAfGB88H9we+B34HSwcdBxkHPQc7Bw8HFwcZB+YGsAaCBpEG1AbxBh4HRwd+B78HyQfnB/gHuAeNB3YHlAe5B9MH+QcgCE4IeQhPCPkHwQemB4QHfweXB5EHagdcB2cHvAfeB6kHcQeIB8YH6gfmB98H7wfwB8cHgAdXByYH+wbFBlMHhAezB8cHzQfrByMIVghpCGYIUgg4CCUIFQj1B9QHuQeZB4UHbQdnB2AHTwcsBwgH3QbHBqEGiQZsBkUGFgbPBZoFZAUsBfME0ASWBFsEIwQdBIgE1gTuBNoEvQR9BEYEKwQvBHMEdARqBG8EbAR0BIEEiQScBKoExwQJBTgFVQV5BZwFtgXMBdMFygXEBeEFEQZMBmUGbwaDBooGiAZ9BnEGYAZqBo4GvwbnBjMHdwecB7AHywfWB9UH3wf5BwkIGAggCOwHpAdoB1QHdQecB38HWwdQB0IHFwfYBrEGrQbcBhoHSAd+B6QH4wciCEMIQQgNCOYHvgfHB/sHLwhSCHkItwjbCL4IVAgWCPQH7AcFCP8H4AevB7IHsQf3BxoIAwjhB+IHGAg6CD8IQQhNCDMI6QeYB1wHHQfZBroGCgcmB1wHfwerB9kHDgg6CF8IaghjCEkIMggfCAMI7AfWB7AHkgd8B3QHagdXBz4HDgfZBq4GkAZsBj0GIQb2BdcFpAV+BVEFGAXpBJsEZAQlBC0EmQTeBBcFIAX7BOEEngRLBDUEPgRQBFAEVARlBH0EmgSpBLkE1QTwBBcFNwVQBW0FgAWaBbAFtgWpBbkF5AUWBjUGOwY7BjwGOwY7BjYGNAY8BmEGhAaoBs8GAQdFB3wHrgfpBxUIJQg6CFQIcQiDCHYIIAjoB8QHrQe7B9QHyge1B58HYwcxBwIH0AbWBu4GGwdNB5EH7Ac0CHYIvAi0CHAIOQgOCBIIRgiNCLAI3ggOCUIJJgnwCLgImAiICIkIhQhiCCcIIQgSCBcIfQh5CF8IWAhlCF0IGAj9BwAIDwjrB7UHggcvB+kGxgYYBx8HOgdXB4cHuwf4ByAISQhfCEIIKggoCB4ICwjzB9IHuQegB4sHfAdkB0sHLAcMB9UGjwZSBiYG9AXeBcwFuQWfBX0FRAUPBdQEowRYBBEEVQSjBOQEQQVbBTkFDwXqBJgEYAQ7BDsEPwReBJYExwTZBOsE9wT5BAAFBAUABRMFLAVHBV0FYwVxBXkFlgXABeYFBAYJBvwF/wX5Bf8FDQYkBkAGWwZwBpoGxgb2BjEHcAe4BxkIYQigCKwI3wj5COoIwQh7CEsINggaCAUIDgggCAII1geUB2oHPQcgBysHUQdtB34HvQchCHoIxQgUCRAJvAhyCFcIbAiSCPEITglbCXIJoQmQCW8JRAkiCScJKAlLCR8J8QibCOQI7QjZCNgIzgjPCLoIaAgmCN8HrAesB7UHsQePB2wHQQcRB0AHPAdgB3QHegeVB8gH+wcUCBQIDQgZCBsIIAgkCP8Hzge1B4gHeQd2B2UHSgcpB/sGxgaCBi8G9wWyBYgFdwV3BW0FSwUWBecErgRoBCsEKgR0BLwEDgVpBaAFjgVWBRkF3gSyBIsEagRRBFQEhgSqBMEE4gT6BAAF4wTMBNgE6wT1BA4FHwUuBUoFYwV9BaAFvAXEBcEFwwXRBdoF4AXuBQQGFQYpBkEGdAapBu8GOwedB+4HPQiVCOAIMwlKCXkJiAk8CfIIvAiKCEsIRQhYCH8IWwgyCCYI9gehB2YHaAeCB6IHqAfqBycIjgjqCDEJMAnxCKQIoQjBCPcIOQmGCawJ0wnfCdUJyAmMCVwJYgmSCbUJmgmMCXQJXwkxCdIIlAiQCJUIcgg7CBYI5wezB2wHUAdPB04HWgdNBzIHgQdpB48HxwfOB8UHzAfaB94H5AfqBwQICwgSCB0IAgjXB6MHaAdZB2IHZQc9BxgH7Qa7BoQGOwb1BaQFXwU4BSEFGQUHBeQEqgRiBDAEIARdBL4EEAVQBaAFxgW4BYYFSgUQBf4E5gSyBIIEZQRQBFkEcwSYBL8EvgSrBMkE9AQRBR4FLQU/BVIFVgVTBV0FbgWDBY0FogW4BbkFugXGBdsF9QUVBjEGUAZpBp4G9AZZB7kHFAhKCHgIwAgnCWIJgwmhCZYJXgkBCcIIhwiTCNMI2Qi5CKUIggg/CPMHrweNB5oH2gcDCEIIeQi9CBAJSgk+CQMJxwiwCMQI+Qg3CXYJnwmiCaUJswmqCWkJNQk7CXQJpwmRCXEJVAkzCRIJwQhoCDcIHwgRCPIH0gezB6AHigdMBw8H8QbWBt8G/wa1B5oHvQcECCcIKQgkCAAIywedB5IHqgeuB58Hrge2B40HdQc9ByIHSgdYB0IHHQflBqUGegY9Bu0FqAVxBS0F4wTJBLcEiQRgBCwEIgRXBKoE9wRJBZgF2AX+BeoFpgV/BUcFHwUBBdwEpgR+BF0EQwROBGUEdgR+BKgEyATbBPAEEQUwBUkFcAWOBZIFfwVtBXYFggWMBYwFlAWlBbgF0AUNBkoGdQaXBrIG5gYxB4MH1wfxB/MHFwh1COgIFgkmCWQJhwl4CToJDAn8CEoJYQlcCTcJCAnkCKIIUggcCNEHwQcaCIUIkgjECAQJMAlHCSoJ+AjHCLUI0ggJCUQJewl4CWIJZAl8CWkJQgkCCfQIJAldCUYJKAkhCf0I4wi7CF0IFwjQB64HlgeDB28Hawd6B3EHLQf/BrAGfAZpBtwHyQflBy0IXwhiCDII9Ae+B2wHPgdHB1sHTwdUB2UHUQcaBwEHCgc3B00HQwclB/MGwwaABiEG8wW4BXkFMgXnBLcEkQRvBEgEMQRqBKQE2QQWBWcFugUNBjEGGAbhBaIFdgVWBSkF+gTDBJsEggRgBFMEWQRpBHcEkgStBMIE0ATpBAEFGwVBBWsFhAV+BW4FWQVYBWYFdQWOBaoFwwXrBSQGYQapBv0GRwddB3MHhAd9B58HugcBCGIImwinCNgIIAlCCTMJHQkJCR0JSAl3CYIJbglkCUIJ/AirCEsI/gfrB0IIlgirCMsIAwkeCSYJIQkACcwIngitCP4IPgljCUMJNwlACUoJTAksCeYIyQjVCAYJEQn8COwIzAi4CIYITQj5B6YHiwdwB1IHNgcoByEHHQcbBwwH5AaSBlAGEgj/BxAIRwhqCFUILAjvB7wHbQctBw8HAAcFBxkHPQcqB80GlwbABv4GIQcAB+0G5AbGBpQGUQYXBs4FmgViBSQF/wS9BHEEPwQnBHEEtAT9BEoFiAXlBTwGUQYwBhMG1QWxBZMFaQU4BfwE6wTPBKoEegRfBF4EagR+BIwEqATBBN4E8wQFBR8FOQVOBToFOAVCBVAFYwV4BaMF0QX0BRgGXAajBusGOQdWB1oHTQcyBzUHUgeaB+cH9QcSCCIIVQh9CJsIoAi/CNEI1wgjCUMJTAlYCUMJIQnvCMoIowhbCDAIMAh7CJ8ItwjkCAEJCAkICfYIxQiNCIwI2wgcCTMJIAkgCScJNAkyCRYJ3wjCCLUIvwjCCLIIrAieCKgIkghUCP0HqAdwB0QHJwcMBwcH5AbGBrIGsQafBnoGTgZiCFMIbgiKCGsIMQgGCN4HsgdgByYH+AbDBpkGugbtBusGoQZYBmwGtQboBscGlwZ4BnUGUwYlBgAGxwWsBY8FUQUvBc0EcAQ2BDkEegTJBCIFZgWqBQQGWwaGBmoGRgYfBv0FywVzBVUFRgU3BSUFBQXbBKQEfARyBHEEgASWBLkE0ATgBOoE9wQEBRIFHgU+BVwFbQWFBZsFugXZBRAGRwaVBs4G6gb6BgAHBQfyBusG+wYQB04HbgeJB6YHvgfmBwEIEAgwCFcIdQhvCJ8I0ggOCSsJOQk1CR0JBgn1CNMImwh5CI0IoAivCNYI7AjvCPoI8AjGCIUIYwiXCOoI/QjnCOsIBAkRCRYJBwnjCLcIpAisCJ8IbQhPCHYItwiqCGcIIwjKB5gHRQcSB+0G2wbBBq0GjAZ4BmAGSwYxBpIIhwiWCI0IVAgXCN8Hqgd8B00HHQfjBrAGagZhBncGgQZVBh4GFQZOBogGhwZhBi0GBQbsBcIFrgWRBW4FXwVNBR4FwAR3BD0EOwR+BMQEKQWCBcwFKgZ3BpUGiAZsBkIGIAYFBuAFvwWcBXEFZgVXBTEF/gTRBKsEhwSBBJUEqwS7BMgE3gTyBAIFGQU0BU4FZgV3BY8FowW3BdwFDAY3BogGtQasBq8GrwauBp8Gqwa5BskG5QYKBzEHYQd/B5gHtQfQB+YH+wcdCDgIVwh5CMsI4Aj2CA8JGAkeCSkJFAnrCNEItgisCK8IvQjICN4I+Aj7COoIoghbCFYIgAiiCLYI3AjiCN0IAgkBCesIugh5CHEIaAhCCDsIhAjBCMAIlQhhCCgI4QeYB0sH+QbPBq8GmgaJBmcGUgZABisGqAiVCHUIWAg8CA4IzweGB1oHJQf5BtgGoQZSBjUGKAYkBiwGEwbzBQ4GNgY3BhkG9QXSBa8FcwVWBTEFDwUQBSYF9QSLBG8ESgQmBFUEqQQHBWAFsQUBBkkGeQaCBnsGbgZSBj8GMgYXBugFvAW7Ba8FjwVQBSEFBQXABJQElQSlBK8EugTVBPQEDAUhBTEFUAVvBYwFpAW9BdIF6gUGBikGWAZpBmgGaQZfBloGawaNBr4G6wYYBzkHVAd5B4YHnge7B9gH6wcJCCoIPQhJCFwIjgjDCMoIyQjUCNwIAwkQCQIJ6QjKCLUIoAiOCHgIngjQCOcI7Ai+CIEITwg7CGQIqAi1CJcIegiJCLAIugibCEsIEQgSCPgHEghtCGIIYghtCHUIXQgYCN4HnAcyB+gGwAaWBoEGawZMBi0GGwaHCG8IUAgfCAUI7wfZB7EHfAdCB/4GzgaOBlYGNwYBBukF2AW8BagFzwXlBdQFugWZBYQFagUrBd0EsASxBNIE2ASXBFoEXARNBDMEQgSXBPAEWwWaBdcFDgY4BmAGaQZiBlgGVwZWBjcGGwYHBvwF3AWvBY0FdgVUBfYEqgSdBJsEowSoBLEEuwTWBP4EIgU+BV8FfwWkBcAF2QXwBfsFBgYNBvwF+gUHBiQGYwaVBscGCQdEB4MHoge0B9wH3QfXBwAIKQg/CGgIiAiUCI0IlAiMCJYIyQjlCN8IzwjPCNEI1wjPCL4IqgiNCGoISQhYCHoIjwinCJoIbQg8CPQH+wdSCF8IIwj+ByQINAgVCBcI9wesB3gHmQe+BwUI2Qf2B/QHBQgTCAAI+AeqB1wHIAf0BsgGnQZ3BlUGOQYeBmQIPggTCPQH3gfMB8QHugeXB2kHLgf5BsUGfwZKBh0G8QXMBaMFhAV7BYYFfQVaBTEFJQUHBdgEvgS/BKIElASTBHsEmgSwBJUEVAREBIYE1gQWBWYFtQXzBRQGLQY7BjgGQAZSBlsGZgZcBkkGMQb9BdYFtgWUBWUFFQXPBLIEoQScBKEEqgSwBLgEzATvBB0FQwVkBZUFugXLBdMF1wXUBdEFzAXrBRMGPwZpBo4GwAYABz4HeAfcBzAIYAh0CD0ISwh5CKYIyQjiCPcIBwkDCe0I0gjFCN4I5gjeCNwI1wi9CLkIrAiPCIMIdQhbCD4INggvCEIIRQghCP0HwQemB80H4Qe/B40HmgezB6EHeAdkBz4HIAc3B04HhQdQB1wHZQdvB4oHuAfbB9IHnAdsBz8HIgfcBrkGowZDBigGOwgPCPEHzAesB6MHlweCB4AHfQdnBy8H6QapBoYGXAYuBvkFugWFBV0FSQU0BSMFDAX4BNQEwgT3BBgF4QSxBKAE0QT2BAwF1AR/BDUEXwSmBAEFVQWmBdMF6QUDBgsGBwYaBi8GOAZQBmEGTQY8BhcG8AXIBZcFYAUjBe8EygSzBKEEogSpBLAEvATIBNME6AQRBTwFcQWZBaAFkAWPBZEFpgXbBQYGJgZHBkkGVAZ6BroGEAdvB9cHMwh+CLYImwiVCNMIAQksCUQJYQlyCVwJLgkTCQkJDgnpCMQItAi1CLAIqAiYCIwIhghxCEgIHQgICOYH4QfkB78HqQeNB1UHWgdQBzkHKwcmByYHKAcSB/0G7AbaBt0G3gbXBtgG3wb7BhUHPgeBB8wH9gf8B+MH3wfRB5cHVgceB6gGSQY2CP8HwgeWB3UHaAdbB08HRgdFB0wHNQfyBswGrAZ9BlAGHwbfBZkFbwVNBTAFFgX1BOAE4gT2BDoFXgVPBTUFJQUtBUgFRgUWBcIEWgRDBI0E9gRKBYoFoAWrBcUFxAXOBfgFDQYbBi8GSQZHBkEGJQbrBbgFggVHBRkF+QThBMYEsgSpBK8EtwTABMkE0wTfBPAECQUjBUIFTAVNBVkFfQWaBbkF2gXmBegF9gUkBmAGrwYLB4QH5gdHCIQIwAjdCNcI1wj1CCIJSQlUCTwJLgkiCT0JTQlSCSUJ8wjKCK8IngiRCIcIfwh9CHMIWAglCOUHsAehB5AHdwdUBywHBgfyBvQG8gbvBvMG3AbRBskGxAazBqYGmAaLBoMGhAaIBp0GvwYGB3AHowfKBwIIGAgoCBgI8weqB2sHMgfDBi4IAAjWB7IHdwdGByoHEgcDBxYHJAcYB/gG0AapBoIGTwYsBuoFoQVtBToFAQXsBOgEDgUmBTEFVAVxBXwFcwViBVwFYAVQBS4FzQRsBEUEhgTgBBkFOAVXBXgFeAVxBZYFvQXNBd0F9AUGBiIGLwYHBs8FjwVXBTYFIwUSBQIF5AS/BKwErQS3BMEEzATZBOYE9gQDBRQFJQUuBTkFUgVjBXMFfwWVBa0FygX4BTIGhgbVBksHtQcpCI4ItAjNCPQI4givCLwI6QgUCQAJ3wjxCAMJOQlmCX0JdQlDCQoJ6gi9CKEIoQiiCK8IsAiXCGkIJwjyB9gHzAeqB28HMgcCB/AG6wbhBtcGzwbLBsAGuga7BrIGrgaqBq8GpAaGBm0GaAZyBq0G6QYiB1gHiAfKBw8I9gf2B/AHowdrBx4HWghBCB0I3weeB2EHHAfsBsgGtwbGBtUGxQasBpUGZwY/BiIGzgWGBT8FGAUfBTYFSQVuBV8FZAWOBaIFrgWsBYoFawVJBTYFFAW0BFkEQAR8BL4E1gTsBBkFRgU/BTYFWQVxBXwFhgV9BZMFzwX2Bd4FpQV/BWUFTwVEBUIFHwX7BNQEuwS1BLsExATRBNwE6AT1BAEFEQUdBSkFPAVSBXMFlwWqBb4F5QUYBkkGeAa8BggHcgfFBzcIiQh2CGoIsgi7CKsIlgh8CJ0ItQihCK8ItAj9CD8JWQlGCVsJWQkpCeUIywjDCLwIxwjMCLkIlQhmCEIIPAg/CCIItAc+BwgHAgcJBxUHFgf7BvoG/QYjByUHHAcWBx0HKgchB+wGtAaABlcGUwZ0BqAG0AbtBicHfAeRB7kHxweGB0IHEgdtCF0IOQj/B8cHggc9B/4GxwacBn4GjQaVBoMGZgY1BicG+gW5BW8FUQVrBZIFpwW7BbEFjgWdBccF6QX1BeYFqgV1BTEF7QTABJ4EfQRDBDwEUgR9BKEE4gQOBRAFCQUpBS0FLgUgBSsFNwV8BdQF5QW9BakFqQWbBY4FigVbBT8FGwXsBLsEuwTEBMkE0wTjBOwE9wQDBREFJgVkBbwF7gUGBg0GFwZABlYGaAaFBroGBAdeB74HBggpCBYIAggmCFYIgAhfCCgIJwhECDgIVgh0CKUI7ggNCeUI8AghCT0JEwkECe4I1QjkCP8I6QixCHIIUQhHCFQIMwixB0kHEwcSBzAHUQd6B5kHvAeSB5EHkQeyB6EHtge1B9UHoQcgB7UGdQZNBkwGVAZmBoQGpwbkBv8G+gYcBy0HDgfaBl0IUwgxCAgI5QeqB2oHLAfpBrAGdQZLBjEGGwYEBugF1gXBBZsFcQV9BbgF3AXlBeIFwAWhBbcF5gUABgcG9gXNBYwFVgUqBfwE3gSuBHMENwQvBEIEZASYBNQE3ATOBNoE2wTcBOsEHAVZBaAFBAYpBgIG+QX+BQcGBgbkBbMFjwVkBS0F7QTEBL8ExATLBNoE4QTxBP8EAwUHBVUFoQXVBQsGIQYgBiEGGAYwBlwGlQbOBigHeAe3B70HtQePB9UH/AcSCOAHuweiB9kHzwfjBw0IUwhkCI4IjwipCOMIQQlLCT4JKAn6CNYI5QjJCJsIeQhmCFIISQj7B5IHMQcYBy0HVgeIB84HOghSCEcIUwhrCEQINQhBCA4I6gerB18H8waWBmMGTgZDBj4GPgZQBmgGfAaMBpcGkgZgBlsGOgg3CCYI8gfHB6oHggdUBxEHxwaZBm4GRwYhBgUG8wXmBdIFqQWFBXsFlQWzBcUFyQW9BbQFwwXUBdkF1wXYBcoFogV2BT8FFgX7BNAElwRSBDIEMwRDBGMEkwSnBKYErgS/BNgECwVUBbgFBgZNBm4GWgY+BlcGZQZmBjwGEAbnBcYFkAVbBfgEzwTABMYEzATUBOME8gT3BOsE+wQ3BWkFkwXdBfEFxgXEBfsFLQZbBp4G5gY7B30HWAcpBxwHMAdOB0wHXAdnB2IHfAeZB5UHqQfrBwoIGwhACHwIwAgICUkJRQkaCfYIxgiqCK0IpgiaCJoIgwhiCOwHgAc2BygHUwd8B8YHJQh/CLwIswijCIEIXgg7CBwI5wfFB2IHBAfFBnoGaQZXBk8GRwY+BjIGLgYsBigGMgYtBhgG+AUNCAkI+AfUB6cHfgdgB0AHDAflBrEGjQZkBjgGFgb0BeYFzgWtBY4FdwWGBaUFwwXOBccF0wXeBdkFyQW4Ba8FpwWbBX0FTwUtBQoF5wSxBHMESQRBBE0EWQRxBIcEmQSzBNIE9gQ2BYwF2AUjBmIGogazBsUG2Qb2BucGrQZwBlEGHgbVBXMFGgUDBdcEyATIBNEE2ATgBOME3gTaBOkEFgVIBZwFygWpBZMFugXxBSYGXgbVBjgHYgcXB9UGxgbABswG5AYEByAHLQdDB1YHYwdyB5UHwQfzByMIVAiRCMQI9wj0CM4IpwiCCGEIXQhzCG0ITQg0CBIIqgdzB1QHVgd5B60H/QcxCNQI9QjnCJUIJQjyB9sHwweMB1wHGgfTBqMGlgaRBnIGYQZoBmEGSwY2Bi4GGgYPBgUG+wXoBboHxwfWB8UHogdrBzMHDwfuBs4GpAZvBjoGFQbxBcoFvQWuBZoFfgV2BZAFqAXGBdsF4gXlBeUF4AXNBaYFkAWBBW8FVwVNBTYFDQXjBLIEhARrBEUERQRSBGEEfQSyBOgEAAUNBTIFcgWnBewFOAadBvAGJgc+BzEH+AaxBmQGNAb4BaYFbAVYBWEFMwXyBNgEzwTPBNME1gTWBNIE1ATbBPwENwWEBY0FewWkBdIFAwZFBpgGBAcdB8sGfQaHBqwGygbTBuIG9wYPBygHOAdRB2EHdQeQB74H6AceCGYIogjjCO8IzwilCIgIVAgjCPkH7AfhB9AHrQeLB28HYwd7B6wHAghcCMsILQkkCe4IdQgRCMcHiQdpB0QHGwf7BuwGFQcUBw0HzgaCBoQGcwZfBksGMwYjBhgGBwb9BfUFiQeWB5wHjwd+B2QHMQf3BswGmgZ2BkYGFgboBcEFrgWgBZIFigWDBX0FlwW3BdsF8gXyBfYFAQbxBckFqwWnBZsFewU7BQ4F/AToBMQEnwSJBH8EXwRBBDoERARmBLME3ATUBOQEAwUwBXAFsAUYBnYGxwYMByMHKwf2BqoGaQYkBvIF1gXZBeAF1AWKBTkF/QTlBN0E0wTQBNME0gTWBN8E8QQKBTEFTQVtBZIFsQXmBSEGcgajBrsGkwZsBq8GOQdUB0YHPAdaB3sHfAd8B54HswepB50HpQfLBwEINwiUCAEJOwkgCQ4J7QiuCF8IBwjXB78HpAefB5YHgweIB6sH2wcoCHEI6Ag1CfcIrghZCAoIvgd/B1sHPgcsBx0HIAcwB0MHQgfrBqoGoAaWBogGfgZhBjwGJwYdBhMG/QVqB24HbQdiB1wHSwchB+4GwQafBmsGLgb6BdgF0wXaBcEFsgWyBakFkQWWBc0F8gUFBgoGDQYHBtoFtwWZBXYFdwV/BVAFCgXSBLUEoASjBLIEoARwBEkEPgQ5BFQEkgSpBLIExQTlBBUFRwWXBeoFRAaMBtEG+AYhBwcHzgZ/BkUGLAZBBkwGLgYFBrMFawU/BUkFMgUMBesE6gTwBOkE5gT3BAoFHQUvBWEFcQWIBaoF9wU4Bj0GMgYnBpUGUAfRB/AH5AffB9oHywfFB/IHIghJCEYIHAjKB7kH6gckCGoI1Qg8CWkJUwkXCeEI2QiXCAsIAwjZB8cHuge1B7QHxQf3B0QIjQj1CC8JywiECEYI/Ae2B44HgQeEB4UHiAduB3cHcQc9BwwH3wbhBuwGCwf7BqQGcAZJBjoGMQYhBo8HewdpB0gHMwciBwoH4AajBoMGVAYgBvoF4gXyBRcG5gW0Bc4FzgXEBakFuAXcBfoFDQYABuMFrgV/BVUFJwUeBSMFFAX8BNYEvgTGBNkE0gTIBKkEYwRKBD8EQARRBH0ElASmBMYE8wQVBVYFsAUIBkUGiAbCBgMHAQfJBoQGUgZtBo4GmAZiBh4G1QWRBX8FrwW2BXwFOgUYBRUFEQXuBO8E/QQKBRUFJAUrBTsFaQW8BfMF7gXxBYAG+wY8B4EHugemB6MHkweFB58H8Qc1CHwImAhqCA0I1gfjBxkIVQigCOsIHglNCU0JMQkgCSwJ7gh8CDAIEAgNCCgIIAj8BxkIZQi6CBkJQwm/CHQINQgRCN0HxwfJB9kHKQgyCAwI+gewBzwHCQfuBhEHWQdlBzIH4gbJBr8GqQalBo0GfQdrB08HLAcMB/cG3Aa4BnkGWQY3BiQGIAb2Bf0FIQbwBcMFAwYEBvcF2wXDBd8F/gUKBvIFyQWOBXIFaAVOBSoFDAXwBOgE2wTsBP4E8ATjBNsE0gShBGkEVARVBEwETwSGBK0E6gQhBVAFegWwBekFHwZWBocGyAbkBtsGuQaVBrsG2QbIBn8GNgb/BbUFmgXJBdQFrgV0BT8FMgU1BRgFBQX3BPcE+gT9BAoFEgUxBYAFmAWdBQkGewbLBvIG/wZABzsHPgdOBz4HVwekB98HJQhYCHMIOwgUCAkIKghWCIAIqwjUCAsJKwk7CTUJCAnQCLcIjghiCG4IpwiBCDUIPQh8CNAISglECdsIkQiUCIcIJwj0BwkIsggACRYJxghpCPsHfQcyByMHXwfaB5gHJwcRBxEHNAdeBzMHDQdJBzsHIwcDB+cGyQamBoQGXgZCBkUGaAZmBiYGCQY0Bv8F1gX2BRUGFAb7BdwFBAYoBjIGFwb1BdEFuQWfBYQFaAVIBSYFKQUcBR0FEQUCBf8E8gTgBLoEjARxBG0ETwRCBGwEmgTeBCoFjQXkBQcGGAY9BnkGoAbNBg8HMAcPB+YG8QbfBtEGkAZOBhoG8AX8BfkF0AWlBYYFYAVOBVoFRgUsBSIFEQUABfgE+wQDBRQFLwVVBZIF1wUuBp0GrgaZBuMG7wb2BgwH/gYRB0MHhAfKByYIeAiPCHgIUghDCFMIZwh8CJAItAjVCAkJBAngCOIICgn7CL8IpgivCJwIewh1CJQI1ggoCRcJ0AixCNAI2AiBCDkIKwhrCNUIQglBCaIISQjWB5UHjwejBwgIvQdLBzMHUgeXBxEI2wd+BzoHFgfxBsQGpAaUBoQGggaCBoYGkwaDBnAGTAYgBjYGJAYABu4FAwYVBhoG8wUYBkgGYAZMBiIGFgb+BeUF2AW/BasFiQV3BWYFTQUwBRoFBgXxBOQE0QSeBH0EcgRgBEQEVQSmBPYENAWXBQIGRgZQBmcGmAa5Bu0GIAckByIHMwcpB+wG1gakBmUGOQY0BjQGDAbWBa0FkwWKBZAFkwV7BV8FRgUpBQsF/gT7BAAFDQUdBTAFYwWcBdsFHAZFBmIGjAafBqAGuwbDBt0GGQddB6AH4Qc+CI8IzAipCHoIegh8CIMIhgiPCKAIywjxCPgI/ggVCQsJ3gjLCMMIzgjJCMIIyQgECTcJJQnpCNUI9QgLCbcIXQglCFkI2AhCCWIJ+wiwCEgI5gfWBxcILQjkB4gHiAfLByMIXghbCA4IHgfvBsYGwAbMBtEG1gbPBsUGtQacBnwGXwZNBjMGLwYwBiMGEgYGBhsGLQYeBhsGRwZuBmYGSwY/BjYGJQYJBuYF0gWyBaAFjwV1BUAFFgUKBe0E1QS9BKUEjwR7BGMETgRzBLcEDAVkBagF+AVBBlcGWgZiBncGrAbbBvIGHQdKB00HDQffBrMGiwZpBnMGagY4BvoFxwWyBaEFngWvBaIFgwVuBVEFIwUXBQ0FAwUGBRAFGAUrBVUFkQXVBfcFDAY3BmMGaAaEBpwGxwb6Bj4HcgedB/kHbwjJCOsIyQjVCN8Izgi/CLoIsQi9CPMIHAknCRUJAQkACfwI6AgBCRUJGgk/CYAJmQl1CToJRwlmCUgJ9QiECE0IVwgXCXkJlgliCQ8JyQhGCEoIhwiPCEYI/gcXCHEIAgnsCKcIQggcB9oG0AbuBgsHEgcRB/oG0gaqBo4GfQZzBmMGTwZMBkkGOQYoBhEGLgZPBl0GSwZeBoMGiwaCBm4GVwZBBhUG7gXZBbkFnQWGBWwFPwUYBfEE0gTBBLwEsQSaBHUEUwRhBJkEvAQJBU4FkgXmBRYGEgYWBiUGPAZuBpsGyAYXB1QHVwcWB9UGvAa0BtMG0QaiBlIGFQbiBcwFuwWwBb0FxQWrBYwFdgVNBSgFGwUQBQkFDAUPBRYFMAVSBYUFpwXTBf8FDgYZBkYGeQapBt0GIgdMB3kHnQcXCLoIAQkiCVMJZgk8CS0J8AjaCOMIEQk6CUsJOQkgCQsJ9wjlCPIIOAlyCZwJ/QkNCucJ3gnUCdsJggkUCcUIjQjfCHIJtgnfCdQJkAktCbwIqwjzCAsJ1AjCCOMIMAlwCVIJEQnRCAsH5Qb+BjQHQwcyByMHEwf+BswGrwasBpkGcQZUBmsGdAZeBlMGPgZSBnoGoQaxBq8Gvga6Bp4GeQZSBhwG8QXSBb8FqAWEBVwFMwUZBf0E8QTyBP4EAQXWBJMEcwRLBF0EnwTHBCQFbAWkBcUF2AW7Bb0F6QUcBj4GaQakBgcHSwdXBzwHEQcPBxAHDwfvBswGegYYBvIF6QXkBd0F7AXnBdsFwwWRBWEFSgU4BSkFHAUUBRQFGAUcBS4FSAVhBYUFvAXRBekFHwZZBoMGsAbZBhAHPAdvB6wHXAj0CD8JrAnpCSYK3AlfCSMJIgk8CVIJZAlfCUEJJwkMCfQI7wgZCXIJ0gkcCjAKPQo/CioK9AmSCS8J7QjqCDYJignfCSQKMwoBCpgJMQkaCXIJsQmhCaYJ2AkCCvwJxAl8CRYJBQcCBzMHZwdsB2EHSgcvBxEH9AbgBssGuQaGBl4GhgaWBoIGgAZzBn8GsAbhBvkGCgcIB78GkAZxBk0GLAYKBuoFugWIBV0FNAUbBRIFFgUoBUIFQwU0BfEEoQR6BFMEUwSMBNEENgVqBZEFlwWOBYIFigW+Bf0FMwZxBsgGCQclBzcHPAdSB20HWQcmB/QGzwaqBlsGIgYWBg8GFQYZBgsGBAbvBcoFegVnBVMFPwUwBRwFGwUbBSIFKgU6BUQFVgV7BZsFxAUABikGXAaFBrMG7QYUB0AHfQfzB2YI/ghsCdsJPQoxCqAJawlvCX4JiwmOCZUJdQlMCSsJCgkGCSMJcQnCCeQJ9wkLCvEJywmnCXkJPAkaCSAJTwmJCd8JFAoeChoK8AmgCYsJCwpkCmgKZgp/CqwKogpHCt4JfQkaBzAHWweHB44HhQd2B00HNgcwBx0H+wbeBrQGkgabBqUGnQaGBn8GnwbiBiMHRgcyBwwHzAayBp8GjQZyBmgGPwb5BdAFogV4BU8FSgVxBXsFXAVCBTAFCwXCBHwEXARQBHIE0wQhBVMFaQVoBVcFWAV+BaoF4AUhBoQG1gbyBhMHHAcgB0oHZgdKByAH9AbMBpsGdQZUBj4GNgYyBioGJgYlBvoFwwWRBYcFdQVlBVQFNAUiBRwFIwUuBTsFSgVYBWcFcwWVBcMF7QUUBk4GfgasBvcGVAerB/QHHgizCCgJbgn+CUIKJArvCecJ6gnpCegJ3gnBCZoJeQlaCU8JbAmcCcUJpQmgCa4JrwmXCXQJYgk6CRcJGwlJCYsJvgnMCesJEgoYCvwJCwpYCl0KUApOCoEKtgrECrYKhQoHCmAHWAd1B6UHsQetB5sHeAdpB18HMQf7BtkGtwajBrsG0QbRBrgGnAbTBggHXweGB28HTQcvBwsH9QbmBuQGxAaRBjkG/gXCBYoFewWZBZEFdwVZBSQFBAX3BMcEgwRvBFYEZQS8BPMEEAUaBRYFAgU1BXoFsQX+BT4GgAa4BskG5wb3Bg0HRAdaB0MHHQf+Bt8GvAaoBpEGawZbBlMGSgZHBkcGHwbnBbQFwQW6BZYFeQVVBT4FMgU1BTYFOgU+BUoFUwVjBYEFrAXbBQEGJwZNBm8GmQYSB3oHzQfgB1IIzgg2CbMJAQohCi8KQwpDCksKaQpdChsK9QndCdUJxwnHCcwJtQl4CWMJagltCWoJXAlLCTUJIQkmCTsJXQl5CYkJmwmxCdYJCgo6CkkKJQrdCc8JFQpcCncKkQqRCk0KjQeKB6AHuwfEB8YHsQeVB40HbAcwBwEH0wa9BrAGygb8Bv8G5gbJBvkGRgejB8sH1gfAB5cHfwdpB1wHQAcXB9MGdwYfBtsFrQW7BckFmgVeBRsF8ATRBLMEfASRBMcElwRkBIIEpwTOBNcE7AQoBXoFuwXyBSsGSwZtBpMGtQbHBs8G8AYZBz4HTwdHBy8HDgf8BtoGuQahBqQGmwaUBnkGTgYsBgYG2AXpBe4F0wW3BaYFkwWYBX0FVwU6BToFQQVMBWAFewWYBbsF3QUCBjoGYQaoBhQHjgfpBwwINgiQCPoIcAmSCZMJwQn+CUwKiAqzCqcKkApbChcK7AnPCbIJjgl3CWcJSQlKCUoJPgk5CTMJIQkPCRUJJgk3CUYJTAlZCXwJrwn3CQ8KCgrOCZ0JlQmzCd4JCwpGCloKUAqaB60HyQfVB94Hzwe0B6MHhgdRByoHDgf+Bt4GwwbkBhEHOgcxBxwHNgeRB+AHDwgcCAcI4weoB2kHSwc4ByoH9waGBk4GEwb+BfMFwgWABUAFAwXdBKIEiASfBPkEIAUEBaQEfQSDBJoEtwQGBWwFuQXmBfUFDAYyBlsGhQaQBqsGugbOBv8GGgc0B08HPgciBxMHAgfsBuUG5AbbBtAGowZsBksGLAYNBh4GJwYoBisGMgYPBvQFvwWLBVcFOwU/BUYFVwVwBYMFngW7BeUF/gUmBp4GCgdeB7UH6QcJCCYIoggKCTUJRAllCakJBApSCnUKdgpwClUKHArfCZ4JeQlXCVEJUAlBCS8JHgkPCQsJCgkECfgI9QgCCSAJMgk1CTkJZAmQCa4JwAm9CZkJdQlvCXkJggl5CaQJ/AkWCrcHvgfcB+wH5gfTB8AHqAeEB28HZQdZBzUHBAfwBgwHNgdXB1wHdAd7B7sH9gcQCAwI+geyB30HMwcFB/sG6wa+Bo4GXgYrBgcG0wWoBXwFNAX3BMcEnAS8BP8EVQVlBTYF7wSkBHgEdwSiBPwERgWLBa8F0AXyBR4GSAZgBnUGjgaVBqAGxwbyBhYHNwdUB0IHMgcpBxYHEAcVBwwH9gbeBp8GgwZ0BlcGYAZ7BpUGvgayBpQGRAYPBvgFtQWFBWEFQQVKBWQFdwWPBZsFtgWwBcYFHgaCBugGOgdvB54HuQcFCHQIsAgKCVQJkgn7CS0KIgovCkgKRwoqCvoJngl5CVEJQAlGCT4JNQkkCREJAQnxCN0I1QjXCN4I5QgCCSMJMglJCWEJcQmICY8JcQlXCUQJRAk9CToJVQliCZAJ0wfVB+oH/QfxB9kHxwezB6UHlgeIB3IHUAcrByEHOQdoB4gHpQfEB+IHBwgFCOYH5QfOB6gHfwdHB+MGkAZrBlMGPQYXBuIFsQWiBZEFZgUeBeYErwSjBOgEQQVpBYkFVgUgBewEqARyBJIE5gQvBVMFbwWoBfkFMwZJBlUGWwZqBm0GbgaXBsYG6gYSBzIHTgdaB3QHYwdOB0UHOgcrBw4H1wbiBscGpQa6Bt4GEgd1BxkH+AbhBrEGbAYXBtYFiwVhBVAFTAViBXYFfwWQBZgFnQXlBSEGaAatBvAGMgd5B9YHOQhrCLkIEAlZCb4J/wn6Ce0J7AkDCu8JsQmUCYIJbAk6CRsJGwkZCRkJBgn+CPAI3wjMCMgIzwjXCO4ICQkTCR8JMwlICWIJaglcCUUJLQkiCREJCwkSCRwJGwnyB/kHBggHCAYI8wfaB8gHsQelB5oHiwdrB1IHVgd7B58HwwfqBygIWAg0CPAHwQebB3kHgQd0B1gH/QauBmIGIgbvBdAFrgWDBV0FTAUvBfcEwwStBM0E+gQ6BXAFpgWEBUEFEQXZBKQEjwTDBAUFLAVoBc8FIwYuBjoGTAZSBlMGSAZXBo8GrgbEBt8GDAcuB1QHeAedB7oHtgeuB5oHbQc7BzIHJgcEBxUHcwejB+MH4AelB5cHMge6BnsGUQYdBroFegVWBVgFXQVrBX0FhAV5BZ0FzgX8BU0GjQbcBjwHoQcTCFEIcAjECAQJVwmeCc8JxgmzCasJmQmCCWoJXglUCT8JGwkACfgI+wj8CPII7AjnCN4I1QjSCNAI3QjpCPwIEAkaCSQJMwk4CS4JJwkSCQEJ8AjmCOMI7QjzCBIIIAgtCDcIRAgkCAEI5QfLB7UHrAekB4kHdQeBB54H0AcLCD0IZghsCDcI3wegB2cHJQcjBzQHNgcNB9UGpAZsBiwG8wXeBZUFSQUdBfMEyASqBLwE/AQ9BWsFnwXDBawFVwUWBdsEogSOBK8E+ARYBagFAQYUBg0GIAY2BjUGMAYwBj8GdgaQBqYGuwbTBuMG/gYWB20HzwfZB9YH0Qe1B5sHmweNB1sHgwcNCCIINghGCCkIGwjqB5UH+ga/BqQGRAbDBYkFdwVjBV8FZAVtBXcFdgWOBakF0wUUBo8G7wZcB9gH/wcaCHQIuwjkCEQJnwmiCY0JgQlwCWwJWQlGCUIJNwkXCfgI5AjVCNYI2gjbCNwI3AjZCNUIygjICNYI7AgBCQUJDwkUCRAJEAkNCQcJ8AjZCNAIxwjHCNMIVAhoCHwIogi9CIwIYghCCCMI/QftB9sHzge2B7YH1AcNCEkIZAhoCCwI5QeiB3MHPAf4BsoGywbZBusG5Aa/BogGXwZABu4FmQU1BQMF1wS6BL4E6AQ0BXcFrAXQBdwFtQVaBSkF3wSmBJAEwAQLBWcFzgXyBeoF6QX8BRwGFQYHBhYGJwZCBmcGhwakBqwGoAa2BuAGGwd6B6gHtwfGB9EHwwe2B8cHyAfbB0MIlAitCLYImwh/CEEICQinBy4H6QaMBh4GwwWYBXAFYQVhBWUFYwV4BYIFlwWnBboFBgZ0Br4GVQd/B68H+wdYCL4IBwlsCYgJawlfCVEJTAlMCUEJMAkjCRgJDAnyCNwIxgi+CLgIswiwCL0I1QjUCL4IxAjRCN0I4gjjCOoI7gjyCPAI8wj0CNYIxQi9CLQIuAi+CNAI4AgOCRwJ7QjRCLUIlQh+CGQIQQg3CDAILggnCCMIRAhECCUIuweAB1IHKQf2Bs8GjAZVBnAGdAZ7BoIGVgYqBvgFoQVZBQ0F3ATGBM4E5gQiBXUFrwXjBfYF5QXDBWsFNgXnBKgEjQTJBBUFbQWqBb8FwAXJBc0F6wX/BewF7gUFBgUGFgY0BmIGeAZ2BnwGoAbVBkIHbwd+B6cHzAfKB8wH5QfgB/YHUQicCNwIDwkXCd8IxQiCCAEIlAc2B9IGTQYUBs8FjAVoBWgFaAVoBXQFhwWSBZoFqAXQBRQGcwbIBucGMQeIB/AHYgjACBwJNgkuCTQJPQkvCTUJPQknCRoJEgkPCfAI2gjECK8IoQiTCI4IoAjICMsIvQjKCM4I2QjLCM4IzQjTCOAI6gj4CPkI7wjNCL8Iuwi3CC4JcQlnCWQJLAn1CNIIwwi6CK0InQh4CGEITQhGCDQIKwgvCCcI+weZB1wHDgfOBq4GsgaCBh8GAwYPBiQGLAYFBtwFkAVYBRYF5gTRBOAE/gQ+BXQFqAXlBQoGCwbwBcAFfgU9BQMFpgR7BLgEDQViBY4FogWkBaUFogWxBcgF0QXXBegF6QXxBf4FBwYbBjIGPgZkBp4G+wZGB2cHhAeXB58HsAfSB/MHAggyCHcIpAjbCCUJKQn6CMoIVgjnB4IHNweqBnIGKgbIBZ0FhAV2BXAFcQV3BYIFkwWlBb8F4AUJBj4GbQbNBi8HpAcQCHwIxQjsCAYJGAkfCSAJFwkZCRcJBQnsCOYI3gjPCL4IpgiTCIwIkAiPCJ0IuQisCLAIwwjLCMYIwgjJCMsI4AjwCPMI9wjwCNgIxQi/CLMI6AnGCZ8JVQkhCe0IxwieCI8Ihgh9CFYIOQggCA0I+Qf7BwgIFgj8B40HPAfhBo8GbwZRBkIGEAbLBaMFpAWvBZEFdwVOBR4F/ATcBOUEJQVaBYMFtAXdBfYFBAb8BdoFnAVrBSsF9ASuBH4EsAQEBToFWwVnBV4FWQVlBXgFkwWzBb4FvwW8Bc8F3gXmBfQFCAYZBjQGYQaMBtEGJwdpB4QHfAeJB7MHwgfIB+EHGAhnCK4ICQkoCRIJ3QiRCEQI1QeWB1QH7AaNBgAG3AW0BaUFlAWABXsFfAWMBacFwwXeBf8FHAZNBm8G7QaHB/4HVAiQCKQI1QgACQ8JEwkJCQcJEQkICd8IxAi5CLQIqgibCJQIjgiQCJcImAiwCKwIngijCL4IxQjDCMMIygjPCN0I6wjyCPEI3AjECL4ItwgdCrgJcgkxCQMJzwieCIAIdghlCFsIPwgqCAQI6QfaB9YH3gfwB+QHmAdLBwcH0QacBlwGJQb2BdoFtAWDBWcFWQU6BSEFCgXtBNgEGgV0BbAF0gXwBQ4GCwb8BecFxgWMBVIFIAXsBKcEgAS2BO0EBAUSBRIFFgUnBTkFUAVbBXQFfQWMBZcFpwW+BcUF0wXnBf0FEAY0Bl8Gfga8BhgHRgdeB20HkAenB6sHxAfdBxgIhgjcCAcJ/QjfCKcIXAgFCLwHcwcLB7IGZQZMBhQG3AXFBa0FlAV9BYEFoQW7BdQF3AXnBe4FHwaVBlgH7AcsCFAIVAhvCJkIswivCLUI5ggLCREJ8wjJCJ4IiAiACH4IhwiLCIgIoAirCLMItAisCJ0IsQi+CMYIygjFCMYIygjgCO0I6wjhCMcIrwieCOUJkQlVCR4J8Qi9CI8IcQhZCEoIOQgnCBAI2we6B7UHrAfEB9gHzwewB30HOQcMB8sGmQZxBk0GPwYIBrQFgAVbBTAFCAXvBOoECwVVBa0FCQYiBisGJQYSBvkF1wWyBYQFRwUKBd8EsASOBJ0EtwTCBMME1ATsBAMFGQUrBTQFSQVPBVwFcAWFBaIFoQWsBb8F1wXuBQkGJAZHBn4GqQbXBhUHRgdyB5MHogfIB+MHAAhICKAI0wjnCN4IwQiKCEYIBwiwB2AH5Aa4BqMGfQYRBuUF1gW5BZwFiQWQBZ8FrwW4BboFuQXHBeEFxQZkB7IH8wf9BwEIHQg8CC0IYAiuCO4IHgkLCbsIcghUCFkIXwhoCHoIdgiHCKcItAi4CKcIlAiLCKUIwwjUCM8I0gjVCNcI2gjhCNYIwwipCJIIoglSCSoJDwnqCMMImghwCFcIPAgxCBsI8gfIB58HiQeRB60Htge1B5sHYQcYB/MG2AbCBp4GgQZiBj0G5gWHBV4FIQX5BPUEGAVUBY8FxQULBkEGTwZBBiQGBAbUBaYFiwVIBfkEzwSbBIgEnAS4BMEExATJBNYE5QT/BBEFHAUjBSAFHgUkBTMFUAVsBYkFpAW7Bc8F6gUQBjAGYQabBroG/AZFB3wHmAehB7cH2wf/BwkIPwiVCMYI4AjjCMMIhwhLCBEIoAdCByMHHwfkBlAGJgY2BhMG9AXSBaEFjgWQBZ0FowWlBaIFwgUOBqQG/gZGB4gHmAedB7IH3QcXCHMIvAjfCOAIswhrCE8IUAhPCEsITghRCGQIlQi6CLYInAiCCG8IdAiiCMYI0wjeCOUI5wjrCPYI8gjjCLgIkQhfCR0J+gjaCM4IwAiWCGcITwg+CCcIDQjsB6oHcwdnB3EHhgeBB3YHVwc6BwMH2galBngGYAZQBkEGLQbxBXgFOgULBQcFDgUrBVgFjgW7Be0FPwZxBmcGTAYjBuUFqgV3BTwF6gS1BIwEjATGBAIFEAX5BO4E7gTkBPUE/AQDBQ8FFQUiBS0FNAVABUkFVwV0BZIFuAXcBQEGNAZUBmwGhAa+BgwHWAd5B38HiQeYB88H8gfsBwIIZwiwCOAI8QjWCKgIXQjwB6oHbgc5B+4GqAaGBoIGZgZPBhwG4wXFBaEFnAWXBZYFmgWhBb0FuQU3BnAGxgYEBxAHQwedB/EHSgiRCKMIjwiJCGsIWghPCE8IUghOCF4IiwiyCNAIxgiYCGIIXAhVCGQIhwivCMUI0QjYCOEI+QgHCfoI3wizCBMJ3wi4CKEImQiVCIEIZQhHCDAIJAjvB8gHhgdYBzoHPQdOB0cHSgc+Bw0H2QaiBnsGTQYgBg0G+gXvBc0FaQUoBQYFFAUvBUMFawWYBcoF/gVTBoMGjwZ+Bj0GCAbCBXUFTQXpBKMEkwS5BAYFOQVbBWcFYwU8BTUFNAUsBTAFTwVoBXIFdgWEBYcFigV6BXEFdgWOBdUFCQYjBi8GRwZlBooGtwbpBi4HVAdUB2wHkwe4B7QHrgfxB2EIrgjuCAIJ4QilCD0I0QdvB0wHKgfvBtEGtwalBocGVgYmBgkG2QXCBbcFrwWjBaIFpwWsBbgF0gUKBksGaAbYBkYHsQcMCE4ISQg6CDsITQhTCFYIUghLCFsItgjRCMwI2gjTCJ4IZQhPCEoITghTCFoIdQiWCK8IuAjLCNUI3QjeCM4I0AimCI4Ifgh2CHUIbAhWCEAIGAjxB7EHiwdnBzEHCwcABwMHBwcCBwcH+QbfBqUGcAZPBiEG+QXRBawFhgVABRgFDAUpBXAFhwWXBccFDQZQBpUGswaXBlMGBQbNBYkFXwUNBcAEjASsBOQEGwVqBZYFpQWkBZMFlAWABXIFcAWCBZ4FsgW4BckF4QXjBdoFuQWOBX4FpQXmBf4FJwZJBmEGdAZ7BpsG3wYWBzAHUgd0B5AHjAeHB5YH5QdkCKkIxQjaCMoIhAgyCOAHmwd4B0kHHAftBtsGxwadBmkGUQYoBvoF6gXZBb8FsQWlBawFrAW3BdkF+wUrBmkGygYZB6IHvAfBB7oH4QcUCB8IQQhpCGsIjgjtCOIIvwivCLoIowh3CF0IUwhOCFEITAg5CEIIZQiBCJYIogilCJUIjQiTCHYIZAhdCFkIWAhcCFsISAgVCNcHqQeIB2UHIwf3BuUG3QbbBs8GygbTBs8GpAaDBmMGNQb5BbUFggVGBSIFIQUkBTwFjgXWBfcFCwZEBpcGvwapBnYGIwbbBaIFUQUZBdkEowSVBMIEAwUlBVUFigXABdkF2gXaBbcFmAWSBa0F0gX3BRcGKgZABkgGJwb/BcoFmAWRBaYFxwX7BSEGMAZFBlsGdAauBvcGIAcwB1cHdQdjB2gHfQeMB7MHKQhVCKcI5QjdCKsIYwgDCLsHfgdFBygHDgf4Bt0GyQagBm8GMgYLBvUF4wXUBboFrgWyBbMFxQXrBQYGHgZPBn8GuQYQBzIHOAdzB8QH3gcKCEEIjAikCMoIywizCJIIfwiCCHQIXQhUCEkIRQg+CDMIIggiCDgIVghmCHMIfAiBCF0IUQhFCEAIOwgxCDcIPwguCAgIwgemB3MHRQcbB/kG3AbFBrEGqAahBpcGkQaJBnAGUgYaBt4FsQVyBTgFJgUqBTwFhQXJBQQGNgZXBo4Gwwa1BpcGWgb/BckFjAVKBQoFzwSnBKkE6AQrBVAFdAWoBd0F+gUJBh0GCQbqBeQF+gUkBlQGggaHBpQGjgZhBhcG6AXGBcsFwgXCBcsF6gUHBiMGOwZYBoMGuQbxBgwHKAdLB0cHUAdjB2wHdweRB9gHMAiFCOsI9Qi9CGgICgjCB48HagdJBzgHJwcJB9UGlQZ3Bl4GPgYcBgwG3gXIBcoFwQXBBcoF4gXuBfAFDQYdBkAGkga6BtwGUwePB7oH8QdgCJIIpAioCJgIdwhRCF4IYwhOCEAIOAgwCCMIIQgaCBEIDwgZCDIIWQhuCH4IMwgrCDEIIQgJCPkH/wcACAUI4Qe1B5QHcwdGBysHAQfaBrsGnAZ7BnQGagZTBjwGMgYfBv8FzQWaBV0FNwU7BUoFdAWmBdQFEwY+Bn4GtgbHBrEGdAYtBu8FsAV2BU4FAgW1BLoE7QQtBU8FfwWZBbcF3wUKBisGXQZbBk4GQwZUBpQGvwbSBsoGpwaOBmoGJQYTBiQGMwYrBg8G9gXrBfMFCgYnBjsGXwaTBsEG5gYUBysHKwcvB0MHVQdgB24HdgepBx8IdAi5CNsIywhYCAgIyAeRB3QHbAdNByIH+QbLBrwGmgaEBlwGSQYpBgkG8QXlBdwFywXIBckFxwXKBdUF4QUYBkcGUwaFBskGIwecB+oHRghsCG4IaghNCEEIUghgCEwIMwgXCA8IAwj4B/oH9wf3B/oH9QcGCCwIPQgXCPIH6QfVB9MHvwe9B8UHywfOB74HogeGB2IHRAcXB/UGzwa2BoIGZQYzBgQG8gX6BfUF2QWkBWcFSwVTBYEFnAWtBdAF9wUiBkkGkQa6BqsGcgY/BgUG2gWhBXEFRgXoBJgE2QQoBVQFjAW5Bb4F3QUTBjoGXwaWBssG1wbVBtoG8gYCB/8G1AamBoAGRwYpBk8GhgajBooGZwZGBioGFgYMBhsGNQZPBnMGogbLBt0G/QYKBwwHFwcvB0MHWwduB4gHrgf2B2AIpwjUCLAIWAgjCOcHwweyB4UHVQcxByAHDAf1BucGwwahBosGZQZOBjwGGgb2BeEFzwXMBcwFywXYBdgF+wURBhgGQgZ/BuoGTQezBwQIMAg4CDMILQhGCFcITQg1CCIIEwj3B+sH6wfrB+0H7QfqB9YHxgfMB0oIEAjFB6IHkweKB5AHlgegB6gHpgecB4UHYQdEBykHCwfyBtUGrgZ0Bj0GCQbYBbQFrgWPBWIFTQVDBWkFoAXNBeoFBAYhBkMGdQayBrwGgQZQBiwG/QXCBZwFZQUXBcoEqQTpBDcFdgW8BegF9AUTBkoGVQZ6BrcG4wYWBykHIwcOB/8G7AbCBp4GcwZCBjkGfwa5BrsGoAaCBmkGTgZIBkMGNAZHBlUGbgaOBq8GygbfBvIG+gb8BgkHDAckBzoHXweTB8EH+AcuCFkIjQikCJsIZQggCOEHuAeQB4YHlweVB3kHVgcdB/wG3QbGBrcGtwadBmwGQQYVBu8F7gXwBd8F3AXcBeIF4wUCBisGhgb6BkkHhwfdBw0IJggrCCcINwg5CCsIIQgXCP0H7AfpB/AH8gftB+YH2geyB4kHUQgiCPMHqwduB0AHRAdiB4EHmAedB4gHdQdrB0cHKAcOB/4G2QatBmUGLQYEBtIFnAWCBWwFXAVQBUkFeAXCBeQF/gUxBlMGbQaoBtQGrwZUBjQGBQbbBbUFlQU7BdcEsQS+BN8EGQViBa4F3QXxBRAGMwZNBnEGrgbUBvoGIQcnBwUH7gbXBrYGkgZjBlkGaQaRBq8GwAbDBqsGkgZ+Bm8GcAZlBmYGZAZxBowGpwbGBtgG3QbeBuYG9wYDBxkHNgdLB2sHkge8B90H/gckCFsIoAjCCKQIdghDCCUIMAgnCPgHvgehB14HaQc1BwAHBgcuB40HHwfmBrwGjgZJBioGFQb3BecF6QXjBekF8gUyBqoGAQdSB7QH9AcJCBMIEwgYCBUIFggOCA0IBwj8B/QH9gf1B/QH7AfjB8YHpQcoCO8HygeLB1cHHgcSBy4HVQdeB04HNwcgBz0HQgcMB+0G3QatBnkGPgYDBs8FmgWABXQFZQVZBV4FYAWQBdEFDgY+BlsGfgalBtQG4Qa3BlMGJwYABtoFrwVxBfkEvASzBO0ELAVJBVYFfwWnBdUFBwYtBk0GbwaeBsMG/QYuB1YHMwcVB9wGqgaYBoAGjgasBr4GzQbwBgoHAwfkBrsGrga0BqwGmwaFBn8GjAabBqcGtQa9BsgG3AbtBgYHJwdFB1gHagd9B5AHlwe1B+IHGghUCJ0I2wjhCMkIzQjNCKgIbgg4CB8IrgdwBzIHJQdbB94H9weiB3YHRgfyBq4GhAZZBioG9AXpBe4F8QXzBQAGYQboBl0HxgfkB+QH6AfvB/UH9wcICAcICQgJCAoIAggICBQIDwgHCAII9AfeBzMIHQjvB78HmAdHB+8G4Qb2BvMG6Qb2BuMG7gYSBwEHywaJBmIGPgb3Bb4FkgV7BXAFZwVkBWkFeQWeBdAFBQZQBoMGqQbFBuwGBgflBsUGbgY+BiUG+gWuBWMFGAXABMUEHQVaBZYFsAW7Bb4F1wUOBjkGUQZzBpsGygYHB0QHTAcmBxIH7gbABsEGxQbCBtkG8AYQB0oHRQcjBwwH7wbgBtgGwga5BrIGpgacBqAGoQapBrIGvAbXBgsHTgeRB8wHxQe7B6QHsQe/B9AH2gftByMIXwitCPIIGQlFCWAJIAnzCJ8IQgjkB40HTwdRB6gHNAhICAMI9AfUB3IH8gbZBqQGYgYrBgQG8AX2Bf0F/wUoBokGFAeDB7AHwgfOB9kH3gfpB/YH/QcOCBcIGwgbCB0IJQgcCBQIAwjuB+kHYwhDCA0I6AfFB24HBQe5BqcGmgaPBpIGkAaTBqoGnAZ5BkUGFQbqBbgFlwWFBXkFcgVuBXYFigWbBcMFFAY8BnEGqwbaBvkGFgcJB9gGugZ7BkUGGgbwBZoFZQUOBbUE1wQbBXMFtwXnBQQG9gX4BRIGOAZbBoYGsAbdBiwHSwcyBw8H+gbqBugG+Ab+BvkG9QYJBy4HVAdQBzAHGAcHB/gG8QbhBtgGzQa+BqwGrwa6BroGwwbVBgMHVwfGBw8IaQhvCEAI/QftBw4IIQgUCP8HDAhACIAIwggpCYgJiAlQCe4IkAg4COsHoAd6B4UH0gcrCHAIYwhOCDwI7QeOBz4H8AagBncGSwYiBgUGAAYBBnQGrgbQBh0HTQdvB40HuAfVB9oH5gf+ByEIPgg+CCIIEggTCBEICQjsB9MHygclCPQH0weRB3UHXQcqB+sGpQaJBm8GYQZXBlMGYwZhBkcGHwbmBboFpQWYBY8FhwWGBZgFxAXdBesF9wUdBlgGrQbvBgQHCQfoBsIGzAa9BngGSgb8BdMFlgVjBfYEqwTTBC0FhAW7BfMFGQZMBmYGagZmBogGrwbkBhUHPwc4BxoHBwcEBwUHBQceBzQHQAc5ByoHQwdcB1sHPgcZBw0HCQf/BvUG5AbXBssGwwbHBtEG1gbbBvAGLQfCBx0IVgiICN0I7QjMCIkIdAhwCGgIOwgWCC4IZgi0CCAJfgl+CT0JAwnRCHEIFQjTB7kHwQf7B0gImAi/CLgIpAhwCP4HkAczB9oGgQZPBi8GCgYDBhsGkwblBhkHNAdZB28HaAd8B6MHuwfOB+wHIwg7CC0IGggXCBgIDgjyB94Hzge9B4sHbAdABxgHBwcEBwUHAAfUBqMGgwZoBkkGNQY1BjgGJQb7BccFsQWqBZ8FlAWfBb4F5wUbBkUGPQYtBjsGgQbOBgAH/Aa8BowGVwZ5Bn4GYwY5Bv8FyQWMBT0F1wS8BPAERgWHBbwF8wUjBmMGuwbLBrgGyAbqBgoHGwcrBy0HGQcJBwwHFwcUByUHSAdgB2AHSgdNB2wHbQdQBzQHLwclBxUHAQfuBtsG1gbcBuMG6gbzBvQGEQd9BwkIbQiiCL4I5whxCYYJSAn0COkIvghxCC0IIQhOCJMI9ghRCUMJKQkzCSIJywhcCB0IAAgXCFMIrAjaCPYIAgkECcUIVgjtB40HLAepBk4GGwYHBgcGJAahBiwHcgeUB6kHrgeZB4UHiweiB7QHywfmB+8H+gcCCAMIBAgCCOsHzAfAB7kHHwcAB+wG0gbBBrgGugbGBtsGyAanBn4GTQYuBhQGCwb3Bd0FyQW3BbMFrQWyBcoF/QU1BmQGhgaPBoMGiAa/BgEH7wafBnEGPAYaBhkGHgYpBgsG4QWmBYIFGQXSBMsE+wRMBZgF1QUIBj4GgQbYBvwGzwbPBvAGGwcuBzMHLgcoBxsHHgcjByUHMwdOB2EHcwdoB0gHcwdzB1YHSwdEBzAHJAcQB/EG5AbrBvwGDgcHBxEHDQddBxYIeAjYCCwJcQlkCYoJzwnNCXEJTwn1CLkIbQg+CEUIewjeCGMJewlwCX8JTwnyCJwIUghFCFsIrgj4CDoJfAmICVUJDAm5CGMI+geTB/MGggY7BhkGEAYgBowGRgelB+AH7gfwB9sHvAeyB7MHrge2B78HyAffB+MH7AftB+EH0gfBB78Huwc="};

export const META = {
  "id": "kronplatz",
  "name": "Kronplatz",
  "region": "South Tyrol",
  "country": "Italy",
  "available": true,
  "center": [
    11.95195,
    46.74122
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
    "kronplatzi",
    "korer",
    "miara"
  ],
  "defaultBase": "olangivaldaorai2",
  "firstLift": 510,
  "lastDown": 1020,
  "stats": {
    "lifts": 27,
    "runs": 148,
    "km": 69,
    "top": 2265,
    "bottom": 931,
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
  RUNS.forEach(([from, to, name, difficulty, km, min, link], i) => {
    edges.push({
      id: `R${i}`, kind: "run", from, to, name, difficulty, km, min,
      drop: NODES[from].alt - NODES[to].alt,
      ...(link ? { link: true } : {}),
    });
  });
  return edges;
}
