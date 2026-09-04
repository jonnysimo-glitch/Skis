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
 *   - 63 runs were unnamed and are described by their endpoints
 *   - 14 nodes, 4 lifts and 17 runs were outside the largest strongly connected component and were dropped
 *   - endpoints within 60 m of each other were treated as the same place
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
  sonne:            { name: "Sonne",                           lat: 46.73205, lon: 11.96107, alt: 2070, area: "Kronplatz", rifugio: true },
  sonne2:           { name: "Sonne",                           lat: 46.73805, lon: 11.95879, alt: 2264, area: "Kronplatz", rifugio: true },
  olangivaldaorai:  { name: "Olang I - Valdaora I",            lat: 46.74669, lon: 12.01065, alt: 1165, area: "Kronplatz" },
  olangiii:         { name: "Olang I / II",                    lat: 46.74380, lon: 11.97219, alt: 2072, area: "Kronplatz" },
  olangii:          { name: "Olang II",                        lat: 46.73936, lon: 11.95960, alt: 2262, area: "Kronplatz", rifugio: true },
  arndt2:           { name: "Arndt",                           lat: 46.74419, lon: 11.99072, alt: 1669, area: "Kronplatz", rifugio: true },
  arndt3:           { name: "Arndt",                           lat: 46.74295, lon: 11.97212, alt: 2073, area: "Kronplatz", rifugio: true },
  kronplatzi:       { name: "Kronplatz I",                     lat: 46.77212, lon: 11.94209, alt: 954, area: "Kronplatz", rifugio: true },
  kronplatziii:     { name: "Kronplatz I / II",                lat: 46.74881, lon: 11.95243, alt: 1860, area: "Kronplatz" },
  korer:            { name: "Korer",                           lat: 46.77270, lon: 11.93989, alt: 942, area: "Kronplatz" },
  p13:              { name: "Korer junction",                  lat: 46.76377, lon: 11.94310, alt: 1112, area: "Kronplatz", named: false },
  kronplatz2000:    { name: "Kronplatz 2000",                  lat: 46.77178, lon: 11.94126, alt: 954, area: "Kronplatz", rifugio: true },
  kronplatzii:      { name: "Kronplatz II",                    lat: 46.73908, lon: 11.95756, alt: 2259, area: "Kronplatz", rifugio: true },
  plateau:          { name: "Plateau",                         lat: 46.74170, lon: 11.97512, alt: 2026, area: "Kronplatz" },
  ruis:             { name: "Ruis",                            lat: 46.72498, lon: 11.96386, alt: 1759, area: "Kronplatz" },
  riedgipfelbahn:   { name: "Ried / Gipfelbahn",               lat: 46.75417, lon: 11.95854, alt: 1730, area: "Kronplatz", rifugio: true },
  costa:            { name: "Costa",                           lat: 46.72273, lon: 11.96410, alt: 1736, area: "Kronplatz", rifugio: true },
  predaperes:       { name: "Pré da Peres",                    lat: 46.71615, lon: 11.97043, alt: 2008, area: "Kronplatz" },
  p21:              { name: "Miara junction",                  lat: 46.70445, lon: 11.93047, alt: 1224, area: "Kronplatz", named: false },
  miara:            { name: "Miara",                           lat: 46.71121, lon: 11.95120, alt: 1478, area: "Kronplatz" },
  coltoron:         { name: "Col Toron",                       lat: 46.71904, lon: 11.96443, alt: 1813, area: "Kronplatz" },
  costa2:           { name: "Costa",                           lat: 46.72689, lon: 11.96879, alt: 1845, area: "Kronplatz" },
  marchner:         { name: "Marchner",                        lat: 46.73366, lon: 11.99452, alt: 1559, area: "Kronplatz", rifugio: true },
  belvedere:        { name: "Belvedere",                       lat: 46.73669, lon: 11.97309, alt: 2006, area: "Kronplatz" },
  rara:             { name: "Rara",                            lat: 46.72160, lon: 11.95973, alt: 1698, area: "Kronplatz" },
  alpenconnect:     { name: "Alpen Connect",                   lat: 46.75212, lon: 11.99296, alt: 1619, area: "Kronplatz", rifugio: true },
  alpenconnect2:    { name: "Alpen Connect",                   lat: 46.74327, lon: 11.96735, alt: 2143, area: "Kronplatz" },
  p36:              { name: "Above Arndt",                     lat: 46.75028, lon: 11.98291, alt: 1803, area: "Kronplatz", rifugio: true, named: false },
  p37:              { name: "Below Olang I / II",              lat: 46.74545, lon: 11.97424, alt: 2027, area: "Kronplatz", named: false },
  p38:              { name: "Above Arndt",                     lat: 46.74533, lon: 11.98804, alt: 1728, area: "Kronplatz", named: false },
  p39:              { name: "Above Alpen Connect",             lat: 46.75150, lon: 11.98428, alt: 1777, area: "Kronplatz", rifugio: true, named: false },
  p40:              { name: "Herrnegg junction",               lat: 46.76824, lon: 11.94286, alt: 1016, area: "Kronplatz", named: false },
  p41:              { name: "Costa junction",                  lat: 46.72548, lon: 11.96662, alt: 1803, area: "Kronplatz", named: false },
  p42:              { name: "Pramstall junction",              lat: 46.74433, lon: 11.95574, alt: 2088, area: "Kronplatz", named: false },
  p43:              { name: "Sylvester junction",              lat: 46.74410, lon: 11.95301, alt: 2052, area: "Kronplatz", named: false },
  p44:              { name: "Rara 31 junction",                lat: 46.72098, lon: 11.96452, alt: 1764, area: "Kronplatz", named: false },
  p45:              { name: "Below Kronplatz II",              lat: 46.74220, lon: 11.95441, alt: 2152, area: "Kronplatz", named: false },
  p46:              { name: "Above Kronplatz I / II",          lat: 46.74633, lon: 11.94993, alt: 1956, area: "Kronplatz", named: false },
  p47:              { name: "Above Alpen Connect",             lat: 46.75140, lon: 11.98125, alt: 1838, area: "Kronplatz", rifugio: true, named: false },
  p48:              { name: "Furcia 9 junction",               lat: 46.72859, lon: 11.96723, alt: 1875, area: "Kronplatz", rifugio: true, named: false },
  costa3:           { name: "Costa",                           lat: 46.72768, lon: 11.96796, alt: 1853, area: "Kronplatz" },
  p50:              { name: "Furcia 9A - Picio Jarú junction", lat: 46.73239, lon: 11.96610, alt: 2051, area: "Kronplatz", named: false },
  alpenconnect3:    { name: "Alpen Connect",                   lat: 46.74281, lon: 11.96807, alt: 2135, area: "Kronplatz" },
  p52:              { name: "Above Costa",                     lat: 46.72748, lon: 11.96518, alt: 1839, area: "Kronplatz", named: false },
  p53:              { name: "Alpen junction",                  lat: 46.74676, lon: 11.97456, alt: 2017, area: "Kronplatz", named: false },
  arndt4:           { name: "Arndt",                           lat: 46.74494, lon: 11.98873, alt: 1712, area: "Kronplatz" },
  p55:              { name: "Trasse junction",                 lat: 46.74456, lon: 11.95444, alt: 2068, area: "Kronplatz", named: false },
  kronplatziii2:    { name: "Kronplatz I / II",                lat: 46.74756, lon: 11.95154, alt: 1914, area: "Kronplatz" },
  ruis2:            { name: "Ruis",                            lat: 46.72402, lon: 11.96462, alt: 1770, area: "Kronplatz" },
  p58:              { name: "Furcia 9 junction",               lat: 46.72899, lon: 11.96965, alt: 1891, area: "Kronplatz", named: false },
  olangii2:         { name: "Olang II",                        lat: 46.74017, lon: 11.96154, alt: 2244, area: "Kronplatz" },
  p61:              { name: "Above Plateau",                   lat: 46.74115, lon: 11.97168, alt: 2073, area: "Kronplatz", named: false },
  olangiii2:        { name: "Olang I / II",                    lat: 46.74450, lon: 11.97343, alt: 2050, area: "Kronplatz" },
  costa4:           { name: "Costa",                           lat: 46.72683, lon: 11.96733, alt: 1838, area: "Kronplatz" },
  p64:              { name: "Furcia 12 junction",              lat: 46.73033, lon: 11.95919, alt: 2040, area: "Kronplatz", rifugio: true, named: false },
  kronplatz20002:   { name: "Kronplatz 2000",                  lat: 46.77147, lon: 11.94026, alt: 953, area: "Kronplatz", rifugio: true },
  sonne3:           { name: "Sonne",                           lat: 46.73352, lon: 11.96129, alt: 2112, area: "Kronplatz" },
  p67:              { name: "Furcia 9 junction",               lat: 46.73212, lon: 11.96966, alt: 1993, area: "Kronplatz", named: false },
  p68:              { name: "Above Kronplatz I / II",          lat: 46.74984, lon: 11.95732, alt: 1901, area: "Kronplatz", named: false },
  olangivaldaorai2: { name: "Olang I - Valdaora I",            lat: 46.74549, lon: 12.00914, alt: 1194, area: "Kronplatz", base: true },
  p70:              { name: "Sylvester junction",              lat: 46.76440, lon: 11.94349, alt: 1095, area: "Kronplatz", named: false },
  p71:              { name: "Above Kronplatz 2000",            lat: 46.76969, lon: 11.94207, alt: 984, area: "Kronplatz", named: false },
  plateau2:         { name: "Plateau",                         lat: 46.74250, lon: 11.97388, alt: 2043, area: "Kronplatz" },
  p73:              { name: "Pramstall junction",              lat: 46.74770, lon: 11.95660, alt: 1985, area: "Kronplatz", named: false },
  p74:              { name: "Above Kronplatz I / II",          lat: 46.74838, lon: 11.95742, alt: 1955, area: "Kronplatz", named: false },
  plateau3:         { name: "Plateau",                         lat: 46.74138, lon: 11.97295, alt: 2056, area: "Kronplatz" },
  plateau4:         { name: "Plateau",                         lat: 46.74226, lon: 11.97556, alt: 2021, area: "Kronplatz" },
  p77:              { name: "Above Marchner",                  lat: 46.73479, lon: 11.98960, alt: 1682, area: "Kronplatz", named: false },
  p78:              { name: "Below Olang I / II",              lat: 46.75037, lon: 11.97653, alt: 1938, area: "Kronplatz", named: false },
  alpenconnect4:    { name: "Alpen Connect",                   lat: 46.74206, lon: 11.96659, alt: 2164, area: "Kronplatz" },
  p82:              { name: "Col Toron junction",              lat: 46.71341, lon: 11.95307, alt: 1545, area: "Kronplatz", named: false },
  ruis3:            { name: "Ruis",                            lat: 46.73736, lon: 11.95584, alt: 2255, area: "Kronplatz" },
  p84:              { name: "Korer junction",                  lat: 46.76487, lon: 11.94287, alt: 1084, area: "Kronplatz", named: false },
  p85:              { name: "Korer junction",                  lat: 46.76851, lon: 11.94166, alt: 1002, area: "Kronplatz", named: false },
  costa5:           { name: "Costa",                           lat: 46.72532, lon: 11.96844, alt: 1821, area: "Kronplatz" },
  predaperes2:      { name: "Pré da Peres",                    lat: 46.72413, lon: 11.96628, alt: 1784, area: "Kronplatz" },
  p88:              { name: "Above Belvedere",                 lat: 46.73664, lon: 11.96874, alt: 2074, area: "Kronplatz", named: false },
  p89:              { name: "Above Marchner",                  lat: 46.73361, lon: 11.99071, alt: 1649, area: "Kronplatz", named: false },
  belvedere2:       { name: "Belvedere",                       lat: 46.73711, lon: 11.97174, alt: 2034, area: "Kronplatz" },
  sonne4:           { name: "Sonne",                           lat: 46.73149, lon: 11.96032, alt: 2064, area: "Kronplatz", rifugio: true },
  marchner2:        { name: "Marchner",                        lat: 46.73660, lon: 11.97511, alt: 1967, area: "Kronplatz" },
  marchner3:        { name: "Marchner",                        lat: 46.73609, lon: 11.97467, alt: 1966, area: "Kronplatz" },
  p94:              { name: "Furcia 9 B junction",             lat: 46.72774, lon: 11.96654, alt: 1852, area: "Kronplatz", rifugio: true, named: false },
  p95:              { name: "Furcia 12 junction",              lat: 46.73207, lon: 11.95838, alt: 2088, area: "Kronplatz", rifugio: true, named: false },
  p100:             { name: "Seewiese junction",               lat: 46.74465, lon: 11.94845, alt: 2021, area: "Kronplatz", named: false },
  p101:             { name: "Below Plateau",                   lat: 46.74447, lon: 11.97855, alt: 1956, area: "Kronplatz", named: false },
  olangiii3:        { name: "Olang I / II",                    lat: 46.74347, lon: 11.97350, alt: 2056, area: "Kronplatz" },
  rara2:            { name: "Rara",                            lat: 46.71950, lon: 11.96629, alt: 1820, area: "Kronplatz" },
  plateau5:         { name: "Plateau",                         lat: 46.74194, lon: 11.97407, alt: 2038, area: "Kronplatz" },
  arndt5:           { name: "Arndt",                           lat: 46.74504, lon: 11.99257, alt: 1624, area: "Kronplatz" },
};

/** [from, to, name, type, rideMinutes, lastUpMinuteOfDay, typicalQueueMinutes] */
export const LIFTS = [
  ["sonne", "sonne2", "Sonne", "chair", 4, 1000, 2],
  ["olangivaldaorai", "olangiii", "Olang I", "gondola", 10, 1000, 1],
  ["olangiii", "olangii", "Olang II", "gondola", 4, 1000, 1],
  ["arndt2", "arndt3", "Arndt", "chair", 7, 1000, 2],
  ["kronplatzi", "kronplatziii", "Kronplatz I - Plan de Corones I", "gondola", 10, 1000, 2],
  ["korer", "p13", "Korer", "gondola", 5, 1000, 2],
  ["kronplatz2000", "kronplatzii", "Kronplatz 2000", "gondola", 13, 1000, 2],
  ["plateau", "olangii", "Plateau", "chair", 5, 1000, 1],
  ["ruis", "sonne2", "Ruis", "gondola", 7, 1000, 2],
  ["riedgipfelbahn", "kronplatzii", "Gipfelbahn", "gondola", 6, 1000, 1],
  ["costa", "predaperes", "Pré da Peres", "gondola", 4, 1000, 2],
  ["p21", "miara", "Miara", "gondola", 6, 1000, 2],
  ["miara", "coltoron", "Col Toron", "gondola", 6, 1000, 2],
  ["costa", "costa2", "Costa", "chair", 4, 1000, 2],
  ["marchner", "belvedere", "Marchner", "gondola", 6, 1000, 2],
  ["belvedere", "sonne2", "Belvedere", "gondola", 5, 1000, 1],
  ["rara", "coltoron", "Rara", "gondola", 3, 1000, 2],
  ["kronplatziii", "kronplatzii", "Kronplatz II", "gondola", 5, 1000, 2],
  ["alpenconnect", "alpenconnect2", "Alpen Connecting", "gondola", 8, 1000, 2],
];

/** [from, to, name, difficulty, km, minutes] */
export const RUNS = [
  ["plateau", "plateau4", "Ruipa", "blue", 0.1, 2],
  ["plateau4", "p101", "Ruipa", "blue", 0.3, 2],
  ["p36", "p39", "Pracken", "blue", 0.1, 2],
  ["p39", "alpenconnect", "Pracken", "blue", 0.7, 2],
  ["p37", "p101", "Gassl", "red", 0.4, 2],
  ["p101", "p38", "Gassl", "red", 0.7, 2],
  ["arndt3", "olangiii3", "Alpen", "blue", 0.1, 2],
  ["olangiii3", "olangiii2", "Alpen", "blue", 0.1, 2],
  ["olangiii2", "p37", "Alpen", "blue", 0.1, 2],
  ["p37", "p53", "Alpen", "blue", 0.1, 2],
  ["p53", "p47", "Alpen", "blue", 0.7, 2],
  ["p47", "p39", "Alpen", "blue", 0.3, 2],
  ["belvedere", "marchner2", "Marchner", "blue", 0.2, 2],
  ["marchner2", "p77", "Marchner", "blue", 1.1, 3],
  ["p77", "p89", "Marchner", "blue", 0.2, 2],
  ["p89", "marchner", "Marchner", "blue", 0.4, 2],
  ["predaperes", "coltoron", "Pré da Peres 32 V", "red", 0.5, 2],
  ["predaperes", "rara2", "Pre da Peres 32", "red", 0.5, 2],
  ["rara2", "costa", "Pre da Peres 32", "red", 0.4, 2],
  ["sonne2", "belvedere2", "Belvedere", "blue", 0.9, 3],
  ["belvedere2", "belvedere", "Belvedere", "blue", 0.1, 2],
  ["kronplatziii", "riedgipfelbahn", "Seewiese 2", "red", 0.8, 3],
  ["olangii", "p74", "Herrnegg", "black", 1, 4],
  ["p74", "p68", "Herrnegg", "black", 0.2, 2],
  ["p68", "riedgipfelbahn", "Herrnegg", "black", 0.5, 2],
  ["riedgipfelbahn", "p40", "Herrnegg", "black", 2.6, 9],
  ["costa3", "costa2", "Costa", "blue", 0.1, 2],
  ["costa3", "costa4", "Costa", "blue", 0.1, 2],
  ["costa4", "p41", "Costa", "blue", 0.2, 2],
  ["coltoron", "rara", "Rara", "red", 0.4, 2],
  ["p42", "p55", "Point 42 to Point 55", "red", 0.1, 2],
  ["p55", "p43", "Point 55 to Point 43", "red", 0.1, 2],
  ["rara2", "coltoron", "Rara 31", "blue", 0.1, 2],
  ["rara2", "p44", "Rara 31", "blue", 0.2, 2],
  ["p45", "p100", "Seewiese", "red", 0.6, 2],
  ["p100", "p46", "Seewiese", "red", 0.2, 2],
  ["p47", "p36", "Point 47 to Point 36", "red", 0.2, 2],
  ["p48", "p52", "Furcia 9", "blue", 0.2, 2],
  ["p52", "ruis", "Furcia 9", "blue", 0.3, 2],
  ["sonne2", "kronplatzii", "Sonne to Kronplatz II", "blue", 0.1, 2],
  ["sonne2", "p67", "Furcia 9", "blue", 1, 3],
  ["p67", "p58", "Furcia 9", "blue", 0.5, 2],
  ["p58", "costa3", "Furcia 9", "blue", 0.2, 2],
  ["sonne2", "p50", "Furcia 9A - Picio Jarú", "blue", 0.8, 2],
  ["alpenconnect3", "arndt3", "Alpen Connect to Arndt", "blue", 0.4, 2],
  ["arndt3", "plateau2", "Arndt to Plateau", "blue", 0.1, 2],
  ["plateau2", "plateau5", "Plateau to Plateau", "blue", 0.1, 2],
  ["plateau5", "plateau", "Plateau to Plateau", "blue", 0.1, 2],
  ["olangii", "olangii2", "Olang 2", "blue", 0.2, 2],
  ["olangii2", "alpenconnect4", "Olang 2", "blue", 0.4, 2],
  ["alpenconnect4", "alpenconnect3", "Olang 2", "blue", 0.1, 2],
  ["alpenconnect3", "olangiii", "Olang 2", "blue", 0.3, 2],
  ["costa3", "p94", "Furcia 9 B", "blue", 0.1, 2],
  ["p94", "p52", "Furcia 9 B", "blue", 0.1, 2],
  ["alpenconnect2", "p78", "Spitzhorn", "blue", 1.1, 3],
  ["p78", "p47", "Spitzhorn", "blue", 0.4, 2],
  ["sonne2", "sonne3", "Sonne to Sonne", "blue", 0.5, 2],
  ["sonne3", "sonne", "Sonne to Sonne", "blue", 0.2, 2],
  ["coltoron", "p44", "Rara 31", "blue", 0.1, 2],
  ["p44", "costa", "Rara 31", "blue", 0.2, 2],
  ["costa", "rara", "Rara 31", "blue", 0.3, 2],
  ["p13", "p84", "Korer", "blue", 0.1, 2],
  ["p84", "p85", "Korer", "blue", 0.4, 2],
  ["p85", "kronplatz20002", "Korer", "blue", 0.3, 2],
  ["kronplatz20002", "korer", "Korer", "blue", 0.1, 2],
  ["olangiii", "p53", "Olang I / II to Point 53", "blue", 0.4, 2],
  ["p36", "p38", "Ruipa", "blue", 0.7, 2],
  ["p38", "arndt4", "Ruipa", "blue", 0.1, 2],
  ["p38", "arndt5", "Gassl", "red", 0.4, 2],
  ["arndt5", "olangivaldaorai2", "Gassl", "red", 1.3, 4],
  ["olangivaldaorai2", "olangivaldaorai", "Gassl", "red", 0.2, 2],
  ["sonne2", "p61", "Sonne to Point 61", "blue", 0.9, 3],
  ["p61", "plateau3", "Point 61 to Plateau", "blue", 0.1, 2],
  ["plateau3", "plateau", "Plateau to Plateau", "blue", 0.2, 2],
  ["p55", "kronplatziii2", "Trasse", "black", 0.5, 2],
  ["ruis2", "ruis", "Ruis to Ruis", "blue", 0.1, 2],
  ["sonne2", "olangii2", "Sonne to Olang II", "blue", 0.2, 2],
  ["p61", "arndt3", "Point 61 to Arndt", "blue", 0.2, 2],
  ["olangiii", "olangiii2", "Alpen", "blue", 0.1, 2],
  ["costa4", "ruis", "Costa - Ruis", "blue", 0.3, 2],
  ["p46", "kronplatziii2", "Point 46 to Kronplatz I / II", "red", 0.2, 2],
  ["kronplatziii2", "kronplatziii", "Kronplatz I / II to Kronplatz I / II", "red", 0.1, 2],
  ["sonne", "sonne4", "Sonne to Sonne", "red", 0.1, 2],
  ["sonne4", "p64", "Sonne to Point 64", "red", 0.2, 2],
  ["alpenconnect2", "alpenconnect3", "Alpen Connect to Alpen Connect", "blue", 0.1, 2],
  ["costa2", "costa5", "Costa", "blue", 0.2, 2],
  ["costa5", "p41", "Costa", "blue", 0.1, 2],
  ["p13", "p70", "Point 13 to Point 70", "blue", 0.1, 2],
  ["p70", "p40", "Point 70 to Point 40", "blue", 0.5, 2],
  ["p40", "p71", "Point 40 to Point 71", "blue", 0.2, 2],
  ["p71", "kronplatz20002", "Point 71 to Kronplatz 2000", "blue", 0.2, 2],
  ["sonne2", "ruis3", "Furcia 12", "red", 0.1, 2],
  ["ruis3", "p95", "Furcia 12", "red", 0.6, 2],
  ["p95", "p64", "Furcia 12", "red", 0.2, 2],
  ["ruis", "costa", "Ruis to Costa", "blue", 0.2, 2],
  ["sonne3", "p50", "Sonne to Point 50", "blue", 0.4, 2],
  ["p50", "p67", "Point 50 to Point 67", "blue", 0.3, 2],
  ["kronplatzii", "p42", "Pramstall", "red", 0.6, 2],
  ["p42", "p73", "Pramstall", "red", 0.4, 2],
  ["p73", "p68", "Pramstall", "red", 0.3, 2],
  ["arndt2", "arndt5", "Gassl", "red", 0.2, 2],
  ["arndt5", "olangivaldaorai2", "Gassl", "red", 1.3, 4],
  ["kronplatzii", "p45", "Sylvester", "black", 0.4, 2],
  ["p45", "p43", "Sylvester", "black", 0.2, 2],
  ["p43", "p46", "Sylvester", "black", 0.4, 2],
  ["p46", "p70", "Sylvester", "black", 3.1, 12],
  ["p71", "kronplatz2000", "Point 71 to Kronplatz 2000", "blue", 0.2, 2],
  ["kronplatz2000", "kronplatzi", "Kronplatz 2000 to Kronplatz I", "blue", 0.1, 2],
  ["olangiii", "olangiii3", "Olang I / II to Olang I / II", "blue", 0.1, 2],
  ["olangiii3", "plateau2", "Olang I / II to Plateau", "blue", 0.1, 2],
  ["p73", "p74", "Pramstall", "red", 0.1, 2],
  ["plateau3", "plateau5", "Plateau to Plateau", "blue", 0.1, 2],
  ["plateau5", "plateau4", "Plateau to Plateau", "blue", 0.1, 2],
  ["p77", "marchner", "Marchner 2", "red", 0.4, 2],
  ["alpenconnect4", "alpenconnect2", "Alpen Connect to Alpen Connect", "blue", 0.2, 2],
  ["p82", "miara", "Point 82 to Miara", "black", 0.2, 2],
  ["sonne2", "kronplatzii", "Sonne to Kronplatz II", "blue", 0.1, 2],
  ["kronplatzii", "ruis3", "Furcia 12", "red", 0.2, 2],
  ["p70", "p84", "Point 70 to Point 84", "blue", 0.1, 2],
  ["p85", "p71", "Point 85 to Point 71", "blue", 0.1, 2],
  ["costa5", "predaperes2", "Costa to Pré da Peres", "blue", 0.2, 2],
  ["p41", "ruis2", "Costa", "blue", 0.2, 2],
  ["ruis2", "costa", "Costa", "blue", 0.1, 2],
  ["p41", "predaperes2", "Costa", "blue", 0.2, 2],
  ["predaperes2", "ruis2", "Costa", "blue", 0.1, 2],
  ["p88", "marchner3", "Hinterberg", "blue", 0.5, 2],
  ["marchner3", "p89", "Hinterberg", "blue", 1.3, 4],
  ["p64", "ruis", "Furcia 12", "red", 1.1, 4],
  ["p88", "belvedere2", "Belvedere", "blue", 0.2, 2],
  ["sonne", "sonne4", "Sonne to Sonne", "red", 0.1, 2],
  ["marchner2", "marchner3", "Marchner to Marchner", "blue", 0.1, 2],
  ["plateau", "arndt2", "Lorenzi", "blue", 1.3, 4],
  ["miara", "p21", "Miara", "blue", 1.8, 6],
  ["sonne2", "sonne", "Furcia 12 A", "red", 0.7, 2],
  ["sonne", "sonne4", "Furcia 12 A", "red", 0.1, 2],
  ["p94", "ruis", "Furcia 9 B", "blue", 0.4, 2],
  ["predaperes", "costa", "Pre da Peres 32R", "black", 0.8, 3],
  ["coltoron", "p82", "Col Toron", "red", 1, 3],
  ["p82", "miara", "Col Toron", "red", 0.3, 2],
  ["sonne2", "sonne", "Sonne to Sonne", "red", 0.6, 2],
  ["sonne2", "p88", "Belvedere", "blue", 0.7, 2],
  ["sonne2", "olangii", "Sonne to Olang II", "blue", 0.1, 2],
  ["p95", "sonne", "Point 95 to Sonne", "blue", 0.1, 2],
  ["olangiii2", "p101", "Arndt", "red", 0.4, 2],
  ["p101", "arndt4", "Arndt", "red", 0.8, 3],
  ["arndt4", "arndt2", "Arndt", "red", 0.2, 2],
  ["rara2", "coltoron", "Rara", "blue", 0.1, 2],
  ["coltoron", "rara", "Rara", "blue", 0.4, 2],
  ["arndt3", "olangiii", "Arndt to Olang I / II", "blue", 0.1, 2],
  ["p43", "p100", "Point 43 to Point 100", "red", 0.4, 2],
  ["kronplatzii", "p45", "Lumen", "red", 0.5, 2],
  ["p101", "p36", "Ruipa", "blue", 0.7, 4],
  ["p58", "p48", "Furcia 9 junction to Furcia 9 junction", "blue", 0.2, 4],
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
  "bearing": -102,
  "bbox": [
    11.8,
    46.66,
    12.08,
    46.84
  ],
  "bases": [
    "olangivaldaorai2"
  ],
  "defaultBase": "olangivaldaorai2",
  "firstLift": 510,
  "lastDown": 1020,
  "stats": {
    "lifts": 19,
    "runs": 153,
    "km": 58,
    "top": 2264,
    "bottom": 942,
    "valleys": 1
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
