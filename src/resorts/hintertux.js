/**
 * Hintertux Glacier — resort graph.
 *
 * GENERATED. Do not edit by hand: run `npm run resort -- hintertux` instead.
 *
 * Source:    OpenStreetMap via the Overpass API, 2026-09-14T22:50:14.567Z
 * Places:    OpenStreetMap
 * Elevation: AWS Terrain Tiles (terrarium), zoom 13
 * Licence:   OSM data is ODbL. Attribution is required wherever this is shown.
 *
 * What had to be assumed:
 *   - 34 runs were unnamed and are described by their endpoints
 *   - 1 node, 0 lifts and 1 run were outside the largest strongly connected component and were dropped
 *   - 11 connectors were added, 1259 m in total, to rejoin pistes OSM leaves up to 350 m apart; they are marked as links, not counted as piste, and timed at walking pace
 *   - 12 pistes mapped as an area rather than a line were skipped: the outline of a snow field is not a way down it
 *   - endpoints within 60 m of each other were treated as the same place
 *
 * NOT from OpenStreetMap, because it is not in there: last-lift times and
 * queue estimates. Those come from the resort and are the numbers behind the
 * app's promise that nothing will strand you, so they are listed separately in
 * scripts/resorts/hintertux.json rather than buried in the graph.
 *
 * Node coordinates are [lat, lon]. They exist so the 3D layer can place the
 * graph on real terrain; the solver itself never reads them.
 */

export const NODES = {
  talstation8ersommerber: { name: "Hintertux",                   lat: 47.10738, lon: 11.67465, alt: 1499, area: "Hintertux", base: true, rifugio: true },
  ramsmoos:               { name: "Ramsmoos",                    lat: 47.09731, lon: 11.66315, alt: 2028, area: "Hintertux", rifugio: true },
  tuxerjoch:              { name: "Tuxerjoch",                   lat: 47.09382, lon: 11.64740, alt: 2388, area: "Hintertux" },
  sommerberg:             { name: "Sommerberg",                  lat: 47.09420, lon: 11.66689, alt: 1946, area: "Hintertux" },
  gefrorenewand:          { name: "Gefrorene Wand",              lat: 47.07708, lon: 11.67131, alt: 2596, area: "Hintertux", rifugio: true },
  gletscherbus3:          { name: "Gletscherbus 3",              lat: 47.06238, lon: 11.67975, alt: 3229, area: "Hintertux" },
  schlegeis:              { name: "Schlegeis",                   lat: 47.04998, lon: 11.67856, alt: 2769, area: "Hintertux" },
  schlegeis2:             { name: "Schlegeis",                   lat: 47.05869, lon: 11.67449, alt: 3069, area: "Hintertux", rifugio: true },
  p9:                     { name: "Below Schlegeis",             lat: 47.06051, lon: 11.66971, alt: 3007, area: "Hintertux", named: false },
  falscherkaserer:        { name: "Falscher Kaserer",            lat: 47.05725, lon: 11.65825, alt: 3200, area: "Hintertux" },
  p11:                    { name: "Above Gefrorene Wand 3b",     lat: 47.06590, lon: 11.67293, alt: 3023, area: "Hintertux", named: false },
  gefrorenewand3b:        { name: "Gefrorene Wand 3b",           lat: 47.06794, lon: 11.67123, alt: 2965, area: "Hintertux" },
  gefrorenewand3b2:       { name: "Gefrorene Wand 3b",           lat: 47.06364, lon: 11.67953, alt: 3242, area: "Hintertux" },
  p14:                    { name: "Below Lärmstange 2",          lat: 47.07403, lon: 11.65604, alt: 2708, area: "Hintertux", named: false },
  larmstange2:            { name: "Lärmstange 2",                lat: 47.06240, lon: 11.65775, alt: 3151, area: "Hintertux" },
  p16:                    { name: "Kaserer 2 junction",          lat: 47.06466, lon: 11.65065, alt: 3025, area: "Hintertux", named: false },
  p17:                    { name: "Below Schlegeis",             lat: 47.06308, lon: 11.67038, alt: 2986, area: "Hintertux", named: false },
  ramsmoos2:              { name: "Ramsmoos",                    lat: 47.09374, lon: 11.65775, alt: 2144, area: "Hintertux" },
  larmstange22:           { name: "Lärmstange 2",                lat: 47.07204, lon: 11.66092, alt: 2742, area: "Hintertux" },
  p20:                    { name: "Babylift Hintertux junction", lat: 47.10986, lon: 11.67494, alt: 1500, area: "Hintertux", named: false },
  p21:                    { name: "Babylift Hintertux junction", lat: 47.11023, lon: 11.67428, alt: 1503, area: "Hintertux", named: false },
  gletscherbus2:          { name: "Gletscherbus 2",              lat: 47.07631, lon: 11.66980, alt: 2601, area: "Hintertux", rifugio: true },
  larmstange1:            { name: "Lärmstange 1",                lat: 47.08630, lon: 11.66134, alt: 2131, area: "Hintertux" },
  larmstange12:           { name: "Lärmstange 1",                lat: 47.07119, lon: 11.66032, alt: 2774, area: "Hintertux" },
  p25:                    { name: "Below Tuxerjoch",             lat: 47.09778, lon: 11.65004, alt: 2265, area: "Hintertux", named: false },
  schlegeis3:             { name: "Schlegeis",                   lat: 47.05974, lon: 11.67530, alt: 3069, area: "Hintertux" },
  p28:                    { name: "Below Lärmstange 2",          lat: 47.06571, lon: 11.65062, alt: 2986, area: "Hintertux", named: false },
  p29:                    { name: "Above Lärmstange 1",          lat: 47.07121, lon: 11.65192, alt: 2786, area: "Hintertux", named: false },
  larmstange13:           { name: "Lärmstange 1",                lat: 47.08626, lon: 11.65993, alt: 2122, area: "Hintertux" },
  p32:                    { name: "Above Lärmstange 1",          lat: 47.08465, lon: 11.66924, alt: 2330, area: "Hintertux", named: false },
  p33:                    { name: "Below Gefrorene Wand",        lat: 47.08025, lon: 11.66892, alt: 2495, area: "Hintertux", named: false },
  p34:                    { name: "Above Lärmstange 1",          lat: 47.08404, lon: 11.66651, alt: 2286, area: "Hintertux", named: false },
  p35:                    { name: "Schlegeis junction",          lat: 47.05671, lon: 11.67171, alt: 3017, area: "Hintertux", named: false },
  p36:                    { name: "Above Lärmstange 2",          lat: 47.06704, lon: 11.66287, alt: 2894, area: "Hintertux", named: false },
  p37:                    { name: "Tuxer Fernerhaus junction",   lat: 47.07032, lon: 11.66822, alt: 2824, area: "Hintertux", named: false },
  p38:                    { name: "Kaserer junction",            lat: 47.06769, lon: 11.65621, alt: 2941, area: "Hintertux", named: false },
  p39:                    { name: "Below Lärmstange 1",          lat: 47.07234, lon: 11.65639, alt: 2759, area: "Hintertux", named: false },
  gefrorenewand3b3:       { name: "Gefrorene Wand 3b",           lat: 47.06337, lon: 11.67839, alt: 3191, area: "Hintertux" },
  p42:                    { name: "Above Lärmstange 2",          lat: 47.06838, lon: 11.66241, alt: 2868, area: "Hintertux", named: false },
  p43:                    { name: "Above Lärmstange 1",          lat: 47.07072, lon: 11.65672, alt: 2822, area: "Hintertux", named: false },
  p45:                    { name: "Höllscharte junction",        lat: 47.07232, lon: 11.65381, alt: 2754, area: "Hintertux", named: false },
  p46:                    { name: "Below Schlegeis",             lat: 47.05560, lon: 11.66831, alt: 3052, area: "Hintertux", named: false },
  p47:                    { name: "Below Lärmstange 2",          lat: 47.06157, lon: 11.66508, alt: 2992, area: "Hintertux", named: false },
  p48:                    { name: "Below Gefrorene Wand 3b",     lat: 47.06646, lon: 11.66648, alt: 2915, area: "Hintertux", named: false },
  schlegeis4:             { name: "Schlegeis",                   lat: 47.05938, lon: 11.67367, alt: 3046, area: "Hintertux" },
  p50:                    { name: "Below Falscher Kaserer",      lat: 47.05927, lon: 11.66237, alt: 3084, area: "Hintertux", named: false },
  p51:                    { name: "Below Lärmstange 2",          lat: 47.06588, lon: 11.65232, alt: 2975, area: "Hintertux", named: false },
  p52:                    { name: "Tuxer Fernerhaus junction",   lat: 47.07392, lon: 11.67097, alt: 2686, area: "Hintertux", named: false },
  p53:                    { name: "Tuxer Fernerhaus junction",   lat: 47.07444, lon: 11.66885, alt: 2667, area: "Hintertux", named: false },
  tuxerjoch2:             { name: "Tuxerjoch",                   lat: 47.09423, lon: 11.64682, alt: 2383, area: "Hintertux" },
  p55:                    { name: "Tuxerjoch junction",          lat: 47.09740, lon: 11.65225, alt: 2215, area: "Hintertux", named: false },
  ramsmoos3:              { name: "Ramsmoos",                    lat: 47.09455, lon: 11.65857, alt: 2132, area: "Hintertux" },
  p57:                    { name: "Above Ramsmoos",              lat: 47.09639, lon: 11.65612, alt: 2148, area: "Hintertux", named: false },
  ramsmoos4:              { name: "Ramsmoos",                    lat: 47.09755, lon: 11.66195, alt: 2035, area: "Hintertux", rifugio: true },
  larmstange23:           { name: "Lärmstange 2",                lat: 47.07138, lon: 11.66193, alt: 2774, area: "Hintertux" },
  p60:                    { name: "Kaserereck junction",         lat: 47.06180, lon: 11.66022, alt: 3133, area: "Hintertux", named: false },
  p61:                    { name: "Below Falscher Kaserer",      lat: 47.06010, lon: 11.66525, alt: 3016, area: "Hintertux", named: false },
  sommerberg2:            { name: "Sommerberg",                  lat: 47.09375, lon: 11.66489, alt: 1949, area: "Hintertux" },
  p63:                    { name: "Schwarze Pfanne junction",    lat: 47.11380, lon: 11.67489, alt: 1567, area: "Hintertux", named: false },
  p65:                    { name: "Gletscherzunge junction",     lat: 47.07821, lon: 11.65645, alt: 2491, area: "Hintertux", named: false },
  p66:                    { name: "Above Lärmstange 1",          lat: 47.08060, lon: 11.66028, alt: 2370, area: "Hintertux", named: false },
  p67:                    { name: "Below Gletscherbus 2",        lat: 47.07860, lon: 11.66716, alt: 2523, area: "Hintertux", named: false },
  p68:                    { name: "Unterm Eisbruch junction",    lat: 47.07965, lon: 11.66599, alt: 2456, area: "Hintertux", named: false },
  p69:                    { name: "Gletscherzunge junction",     lat: 47.08043, lon: 11.65734, alt: 2374, area: "Hintertux", named: false },
  sommerberg3:            { name: "Sommerberg",                  lat: 47.09687, lon: 11.66145, alt: 2059, area: "Hintertux" },
  p71:                    { name: "Tuxerjoch junction",          lat: 47.09661, lon: 11.64775, alt: 2335, area: "Hintertux", named: false },
  p72:                    { name: "Tuxerjoch junction",          lat: 47.09675, lon: 11.65094, alt: 2242, area: "Hintertux", named: false },
  p73:                    { name: "Gletscherzunge junction",     lat: 47.08268, lon: 11.65981, alt: 2274, area: "Hintertux", named: false },
  p74:                    { name: "Tuxer Fernerhaus junction",   lat: 47.06897, lon: 11.66747, alt: 2853, area: "Hintertux", named: false },
  p75:                    { name: "Tuxer Fernerhaus junction",   lat: 47.07494, lon: 11.66445, alt: 2666, area: "Hintertux", named: false },
  p76:                    { name: "Schwarze Pfanne junction",    lat: 47.11037, lon: 11.67337, alt: 1514, area: "Hintertux", named: false },
  p77:                    { name: "Schlegeis junction",          lat: 47.05575, lon: 11.67693, alt: 2909, area: "Hintertux", named: false },
  p78:                    { name: "Schlegeis junction",          lat: 47.05365, lon: 11.67683, alt: 2843, area: "Hintertux", named: false },
  p79:                    { name: "Höllscharte junction",        lat: 47.07120, lon: 11.65444, alt: 2799, area: "Hintertux", named: false },
  larmstange24:           { name: "Lärmstange 2",                lat: 47.06359, lon: 11.65619, alt: 3089, area: "Hintertux" },
  p81:                    { name: "Eissattel junction",          lat: 47.06687, lon: 11.66749, alt: 2907, area: "Hintertux", named: false },
  p82:                    { name: "Above Gletscherbus 2",        lat: 47.07404, lon: 11.66952, alt: 2681, area: "Hintertux", named: false },
  p83:                    { name: "Tuxer Fernerhaus junction",   lat: 47.07547, lon: 11.66858, alt: 2620, area: "Hintertux", named: false },
  p84:                    { name: "Gefrorene Wand junction",     lat: 47.06452, lon: 11.67208, alt: 3004, area: "Hintertux", named: false },
  p85:                    { name: "Tuxer Fernerhaus junction",   lat: 47.05949, lon: 11.67206, alt: 3026, area: "Hintertux", named: false },
  p86:                    { name: "Below Lärmstange 2",          lat: 47.06268, lon: 11.66482, alt: 2974, area: "Hintertux", named: false },
  p87:                    { name: "Tuxer Fernerhaus junction",   lat: 47.06178, lon: 11.67025, alt: 2993, area: "Hintertux", named: false },
  p88:                    { name: "Eissattel junction",          lat: 47.06492, lon: 11.67061, alt: 2980, area: "Hintertux", named: false },
};

/** [from, to, name, type, rideMinutes, lastUpMinuteOfDay, typicalQueueMinutes] */
export const LIFTS = [
  ["talstation8ersommerber", "ramsmoos", "8er Sommerberg", "gondola", 5, 975, 2],
  ["talstation8ersommerber", "ramsmoos", "Gletscherbus 1", "gondola", 7, 975, 2],
  ["ramsmoos", "tuxerjoch", "Tuxerjoch", "chair", 7, 975, 2],
  ["sommerberg", "ramsmoos", "Sommerberg", "chair", 4, 975, 2],
  ["ramsmoos", "gefrorenewand", "Gletscherbus 2", "gondola", 9, 975, 2],
  ["ramsmoos", "gefrorenewand", "Fernerhaus", "gondola", 8, 975, 3],
  ["gefrorenewand", "gletscherbus3", "Gletscherbus 3", "gondola", 9, 975, 2],
  ["schlegeis", "schlegeis2", "Schlegeis", "chair", 10, 975, 2],
  ["p9", "falscherkaserer", "Olperer 1", "drag", 7, 975, 3],
  ["gefrorenewand", "p11", "Gefrorene Wand", "gondola", 7, 975, 2],
  ["gefrorenewand3b", "gefrorenewand3b2", "Gefrorene Wand 3b", "chair", 6, 975, 4],
  ["p14", "larmstange2", "Kaserer 1", "drag", 8, 975, 3],
  ["p14", "p16", "Kaserer 2", "drag", 8, 975, 3],
  ["p9", "falscherkaserer", "Olperer 2", "drag", 7, 975, 3],
  ["p17", "gletscherbus3", "Gefrorene Wand 2", "drag", 5, 975, 3],
  ["p17", "gletscherbus3", "Gefrorene Wand 1", "drag", 5, 975, 3],
  ["ramsmoos", "ramsmoos2", "Ramsmoos", "drag", 6, 975, 4],
  ["larmstange22", "larmstange2", "Lärmstange 2", "chair", 5, 975, 2],
  ["p20", "p21", "Babylift Hintertux", "drag", 2, 975, 12],
  ["larmstange1", "larmstange12", "Lärmstange 1", "chair", 9, 975, 2],
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
  ["tuxerjoch", "tuxerjoch2", "Tuxerjoch", "blue", 0.1, 2],
  ["tuxerjoch2", "p71", "Tuxerjoch", "blue", 0.3, 2],
  ["p71", "p25", "Tuxerjoch", "blue", 0.4, 2],
  ["p25", "p55", "Tuxerjoch", "blue", 0.2, 2],
  ["p55", "p57", "Tuxerjoch", "blue", 0.3, 2],
  ["p57", "ramsmoos4", "Tuxerjoch", "blue", 0.5, 2],
  ["ramsmoos4", "ramsmoos", "Tuxerjoch", "blue", 0.1, 2],
  ["schlegeis2", "schlegeis3", "Schlegeis link", "red", 0.1, 2],
  ["p28", "p29", "Gletscherzunge", "blue", 0.7, 2],
  ["p29", "p65", "Gletscherzunge", "red", 1, 3],
  ["p65", "p69", "Gletscherzunge", "red", 0.3, 2],
  ["p69", "p73", "Gletscherzunge", "red", 0.3, 2],
  ["p73", "larmstange13", "Gletscherzunge", "red", 0.4, 2],
  ["gletscherbus2", "p67", "Spannagelabfahrt", "red", 0.3, 2],
  ["p67", "p33", "Spannagelabfahrt", "red", 0.2, 2],
  ["p33", "p32", "Spannagelabfahrt", "red", 0.6, 2],
  ["p32", "p34", "Keesboden", "red", 0.2, 2],
  ["p34", "larmstange1", "Keesboden", "red", 0.6, 2],
  ["larmstange1", "larmstange13", "Keesboden", "red", 0.1, 2],
  ["p33", "p34", "Piste 2b", "black", 0.5, 2],
  ["p35", "schlegeis", "Schlegeis", "black", 0.9, 3],
  ["larmstange2", "p36", "Sonnenhang", "black", 0.6, 2],
  ["ramsmoos", "talstation8ersommerber", "Waldabfahrt (manchmal präpariert)", "red", 2.2, 7],
  ["p37", "p52", "Tuxer Fernerhaus", "red", 0.5, 2],
  ["p52", "gletscherbus2", "Tuxer Fernerhaus", "red", 0.3, 2],
  ["p38", "p43", "Kaserer", "red", 0.3, 2],
  ["p43", "p39", "Kaserer", "red", 0.2, 2],
  ["gefrorenewand3b2", "gletscherbus3", "Gefrorene Wand 3b to Gletscherbus 3", "red", 0.1, 2],
  ["gefrorenewand3b3", "p17", "Gefrorene Wand", "red", 0.5, 2],
  ["p63", "p76", "Schwarze Pfanne", "red", 0.4, 2],
  ["p76", "talstation8ersommerber", "Schwarze Pfanne", "red", 0.3, 2],
  ["larmstange2", "p38", "Kaserer", "red", 0.6, 2],
  ["p42", "p43", "Kaserer", "red", 0.5, 2],
  ["falscherkaserer", "p46", "Olperer 2", "blue", 0.8, 3],
  ["p46", "p9", "Olperer 2", "blue", 0.5, 2],
  ["falscherkaserer", "p9", "Olperer 1", "red", 1, 3],
  ["falscherkaserer", "p50", "Olperer 1", "blue", 0.4, 2],
  ["p50", "p61", "Olperer 1", "blue", 0.2, 2],
  ["p61", "p9", "Olperer 1", "blue", 0.4, 2],
  ["p79", "p45", "Höllscharte", "blue", 0.1, 2],
  ["p46", "p35", "Schlegeis", "red", 0.3, 2],
  ["gefrorenewand", "p33", "Spannagelabfahrt", "red", 0.6, 2],
  ["p47", "p48", "Tuxer Fernerhaus", "red", 0.6, 2],
  ["p37", "p53", "Tuxer Fernerhaus", "red", 0.5, 2],
  ["p53", "gletscherbus2", "Tuxer Fernerhaus", "red", 0.2, 2],
  ["sommerberg2", "sommerberg", "Spannagelabfahrt", "red", 0.2, 2],
  ["falscherkaserer", "p50", "Olperer 1", "blue", 0.3, 2],
  ["p51", "p38", "Kaserer", "red", 0.4, 2],
  ["p52", "p53", "Tuxer Fernerhaus", "red", 0.2, 2],
  ["p11", "gefrorenewand3b", "Gefrorene Wand", "red", 0.3, 2],
  ["larmstange2", "p51", "Höllscharte", "blue", 0.5, 2],
  ["p28", "p29", "Höllscharte", "blue", 0.7, 2],
  ["larmstange2", "p60", "Kaserereck", "blue", 0.1, 2],
  ["p60", "p50", "Kaserereck", "blue", 0.3, 2],
  ["schlegeis4", "p17", "Tuxer Fernerhaus", "blue", 0.4, 2],
  ["p17", "p48", "Tuxer Fernerhaus", "blue", 0.4, 2],
  ["tuxerjoch2", "p72", "Tuxerjoch", "red", 0.5, 2],
  ["p72", "p55", "Tuxerjoch", "red", 0.1, 2],
  ["ramsmoos3", "sommerberg3", "Ramsmoos", "blue", 0.3, 2],
  ["sommerberg3", "ramsmoos", "Ramsmoos", "blue", 0.1, 2],
  ["p57", "ramsmoos4", "Mahlgrube", "blue", 0.5, 2],
  ["p11", "p48", "Eissattel", "blue", 0.5, 2],
  ["p48", "larmstange23", "Eissattel", "blue", 0.7, 2],
  ["larmstange2", "p60", "Kaserereck", "blue", 0.2, 2],
  ["p11", "p17", "Above Gefrorene Wand 3b to Below Schlegeis", "blue", 0.3, 2],
  ["p9", "p17", "Below Schlegeis link", "blue", 0.2, 2],
  ["larmstange13", "sommerberg2", "Keesboden", "red", 1.1, 4],
  ["p14", "p65", "Gletscherzunge", "red", 0.5, 2],
  ["larmstange23", "p66", "Haxenbrecher", "red", 1, 3],
  ["p67", "p68", "Unterm Eisbruch", "red", 0.1, 2],
  ["p68", "larmstange1", "Unterm Eisbruch", "red", 0.8, 3],
  ["p68", "p66", "Unterm Eisbruch", "red", 0.5, 2],
  ["p69", "p66", "Gletscherzunge", "red", 0.2, 2],
  ["ramsmoos3", "sommerberg3", "Ramsmoos", "blue", 0.4, 2],
  ["p71", "p72", "Tuxerjoch", "black", 0.2, 2],
  ["larmstange23", "p75", "Tuxer Fernerhaus", "blue", 0.6, 2],
  ["p75", "gletscherbus2", "Tuxer Fernerhaus", "blue", 0.4, 2],
  ["p66", "p73", "Gletscherzunge", "red", 0.2, 2],
  ["p45", "p14", "Höllscharte to Below Lärmstange 2", "blue", 0.2, 2],
  ["gletscherbus2", "gefrorenewand", "Piste 3", "blue", 0.1, 2],
  ["gletscherbus3", "schlegeis4", "Slalomhang", "red", 0.6, 2],
  ["schlegeis4", "p9", "Tuxer Fernerhaus", "blue", 0.3, 2],
  ["p9", "p17", "Tuxer Fernerhaus", "blue", 0.3, 2],
  ["gletscherbus3", "schlegeis3", "Riepensattel", "red", 0.4, 2],
  ["schlegeis3", "schlegeis4", "Riepensattel", "red", 0.1, 2],
  ["p50", "p61", "Kaserereck", "red", 0.3, 2],
  ["p61", "p47", "Kaserereck", "red", 0.1, 2],
  ["p47", "p36", "Kaserereck", "red", 0.6, 2],
  ["p36", "p42", "Kaserereck", "red", 0.2, 2],
  ["gletscherbus3", "gefrorenewand3b3", "Gefrorene Wand", "red", 0.1, 2],
  ["gletscherbus3", "gefrorenewand3b3", "Gefrorene Wand", "red", 0.1, 2],
  ["p35", "p77", "Schlegeis", "red", 0.4, 2],
  ["p77", "p78", "Schlegeis", "red", 0.4, 2],
  ["p78", "schlegeis", "Schlegeis", "red", 0.4, 2],
  ["schlegeis4", "p35", "Schlegeis", "red", 0.5, 2],
  ["p74", "p75", "Tuxer Fernerhaus", "blue", 0.8, 2],
  ["gletscherbus3", "p17", "Gletscherbus 3 to Below Schlegeis", "black", 0.6, 2],
  ["gefrorenewand3b3", "p11", "Gefrorene Wand", "red", 0.5, 2],
  ["p76", "p21", "Schwarze Pfanne to Babylift Hintertux", "blue", 0.1, 2],
  ["p21", "p20", "Babylift Hintertux link", "blue", 0.1, 2],
  ["p21", "p20", "Babylift Hintertux link", "blue", 0.1, 2],
  ["falscherkaserer", "p50", "Olperer 1", "blue", 0.3, 2],
  ["falscherkaserer", "p50", "Olperer 1", "blue", 0.3, 2],
  ["falscherkaserer", "p50", "Olperer 1", "blue", 0.3, 2],
  ["p50", "p61", "Olperer 1", "blue", 0.1, 2],
  ["p61", "p9", "Olperer 1", "blue", 0.3, 2],
  ["falscherkaserer", "p9", "Olperer 1", "blue", 0.9, 3],
  ["falscherkaserer", "p9", "Olperer 1", "red", 0.9, 3],
  ["falscherkaserer", "p9", "Olperer 1", "red", 1, 3],
  ["p77", "p78", "Schlegeis", "red", 0.2, 2],
  ["p79", "p39", "Höllscharte", "blue", 0.2, 2],
  ["p43", "larmstange12", "Tuxer Fernerhaus", "blue", 0.3, 2],
  ["larmstange2", "p51", "Höllscharte", "blue", 0.5, 2],
  ["larmstange24", "p51", "Höllscharte", "blue", 0.4, 2],
  ["larmstange2", "larmstange24", "Höllscharte", "blue", 0.1, 2],
  ["larmstange2", "p60", "Kaserereck", "blue", 0.2, 2],
  ["larmstange2", "p60", "Kaserereck", "blue", 0.2, 2],
  ["larmstange2", "p60", "Kaserereck", "blue", 0.2, 2],
  ["p60", "p50", "Kaserereck", "blue", 0.3, 2],
  ["larmstange2", "p50", "Kaserereck", "blue", 0.5, 2],
  ["larmstange24", "p38", "Kaserer", "red", 0.4, 2],
  ["p38", "p39", "Kaserer", "red", 0.5, 2],
  ["p43", "p39", "Kaserer", "red", 0.1, 2],
  ["p38", "p43", "Kaserer", "red", 0.3, 2],
  ["larmstange2", "p38", "Kaserer", "red", 0.5, 2],
  ["larmstange2", "larmstange24", "Kaserer", "red", 0.1, 2],
  ["p51", "p38", "Kaserer", "red", 0.3, 2],
  ["p51", "p38", "Kaserer", "red", 0.3, 2],
  ["p28", "p51", "Höllscharte", "blue", 0.1, 2],
  ["p51", "p79", "Höllscharte", "blue", 0.6, 2],
  ["p79", "p45", "Höllscharte", "blue", 0.1, 2],
  ["p28", "p45", "Höllscharte", "blue", 0.8, 2],
  ["p79", "p39", "Höllscharte", "blue", 0.2, 2],
  ["p79", "p39", "Höllscharte", "blue", 0.2, 2],
  ["p28", "p29", "Gletscherzunge", "blue", 0.7, 2],
  ["p28", "p29", "Gletscherzunge", "blue", 0.6, 2],
  ["p28", "p29", "Höllscharte", "blue", 0.7, 2],
  ["p28", "p29", "Höllscharte", "blue", 0.6, 2],
  ["larmstange2", "p38", "Kaserer", "red", 0.6, 2],
  ["larmstange2", "p38", "Kaserer", "red", 0.5, 2],
  ["p29", "p45", "Above Lärmstange 1 to Höllscharte", "blue", 0.7, 2],
  ["p29", "p45", "Above Lärmstange 1 to Höllscharte", "blue", 0.1, 2],
  ["p29", "p45", "Above Lärmstange 1 to Höllscharte", "blue", 0.1, 2],
  ["p50", "p61", "Kaserereck", "red", 0.2, 2],
  ["p61", "p47", "Kaserereck", "red", 0.1, 2],
  ["p47", "p86", "Kaserereck", "red", 0.1, 2],
  ["p86", "p42", "Kaserereck", "red", 0.6, 2],
  ["p42", "larmstange23", "Kaserereck", "red", 0.3, 2],
  ["p42", "larmstange23", "Kaserereck", "red", 0.2, 2],
  ["p50", "p42", "Kaserereck", "red", 1.2, 4],
  ["p42", "p43", "Kaserer", "red", 0.4, 2],
  ["p42", "p43", "Kaserer", "red", 0.5, 2],
  ["p43", "larmstange23", "Tuxer Fernerhaus", "blue", 0.3, 2],
  ["p43", "larmstange23", "Tuxer Fernerhaus", "blue", 0.3, 2],
  ["larmstange23", "larmstange22", "Lärmstange 2 link", "blue", 0.1, 2],
  ["larmstange12", "larmstange23", "Lärmstange 1 to Lärmstange 2", "blue", 0.1, 2],
  ["p48", "p42", "Kaserer", "red", 0.3, 2],
  ["p48", "p42", "Kaserer", "red", 0.3, 2],
  ["larmstange23", "p75", "Tuxer Fernerhaus", "blue", 0.5, 2],
  ["p75", "p83", "Tuxer Fernerhaus", "blue", 0.3, 2],
  ["larmstange23", "p83", "Tuxer Fernerhaus", "blue", 0.8, 3],
  ["p47", "p48", "Tuxer Fernerhaus", "red", 0.5, 2],
  ["p86", "p48", "Tuxer Fernerhaus", "red", 0.4, 2],
  ["p47", "p86", "Tuxer Fernerhaus", "red", 0.1, 2],
  ["p48", "larmstange23", "Eissattel", "blue", 0.6, 2],
  ["p48", "larmstange23", "Eissattel", "blue", 0.6, 2],
  ["p9", "p48", "Tuxer Fernerhaus", "blue", 0.6, 2],
  ["p9", "p87", "Tuxer Fernerhaus", "blue", 0.1, 2],
  ["p87", "p17", "Tuxer Fernerhaus", "blue", 0.1, 2],
  ["p17", "p48", "Tuxer Fernerhaus", "blue", 0.3, 2],
  ["p11", "p81", "Eissattel", "blue", 0.5, 2],
  ["p48", "p81", "Eissattel", "blue", 0.1, 2],
  ["p88", "p48", "Eissattel", "blue", 0.3, 2],
  ["p11", "p88", "Eissattel", "blue", 0.2, 2],
  ["p48", "p81", "Below Gefrorene Wand 3b to Eissattel", "blue", 0.1, 2],
  ["p48", "p81", "Below Gefrorene Wand 3b to Eissattel", "blue", 0.1, 2],
  ["p83", "gefrorenewand", "Tuxer Fernerhaus to Gefrorene Wand", "blue", 0.4, 2],
  ["gletscherbus2", "gefrorenewand", "Gletscherbus 2 to Gefrorene Wand", "blue", 0.1, 2],
  ["p83", "gletscherbus2", "Tuxer Fernerhaus to Gletscherbus 2", "blue", 0.1, 2],
  ["p11", "p84", "Above Gefrorene Wand 3b to Gefrorene Wand", "blue", 0.1, 2],
  ["p84", "p17", "Gefrorene Wand to Below Schlegeis", "blue", 0.1, 2],
  ["p17", "p88", "Below Schlegeis to Eissattel", "blue", 0.2, 2],
  ["p11", "p88", "Above Gefrorene Wand 3b to Eissattel", "blue", 0.2, 2],
  ["p84", "p17", "Gefrorene Wand", "red", 1, 4],
  ["p84", "p17", "Gefrorene Wand", "red", 0.1, 2],
  ["gletscherbus3", "gefrorenewand3b3", "Gefrorene Wand", "red", 0.1, 2],
  ["gletscherbus3", "gefrorenewand3b3", "Gefrorene Wand", "red", 0.1, 2],
  ["gletscherbus3", "schlegeis3", "Slalomhang", "red", 0.4, 2],
  ["gletscherbus3", "schlegeis3", "Slalomhang", "red", 0.4, 2],
  ["gletscherbus3", "schlegeis3", "Riepensattel", "red", 0.4, 2],
  ["gletscherbus3", "schlegeis3", "Riepensattel", "red", 0.4, 2],
  ["schlegeis3", "p17", "Tuxer Fernerhaus", "blue", 0.6, 2],
  ["p87", "p17", "Tuxer Fernerhaus", "blue", 0.1, 2],
  ["p85", "p87", "Tuxer Fernerhaus", "blue", 0.3, 2],
  ["schlegeis4", "p85", "Tuxer Fernerhaus", "blue", 0.1, 2],
  ["schlegeis3", "schlegeis4", "Tuxer Fernerhaus", "blue", 0.1, 2],
  ["p85", "p9", "Tuxer Fernerhaus", "blue", 0.2, 2],
  ["p85", "p9", "Tuxer Fernerhaus", "blue", 0.2, 2],
  ["p46", "p35", "Schlegeis", "red", 0.3, 2],
  ["p46", "p35", "Schlegeis", "red", 0.3, 2],
  ["schlegeis4", "p35", "Schlegeis", "red", 0.4, 2],
  ["p35", "p77", "Schlegeis", "red", 0.4, 2],
  ["p77", "p78", "Schlegeis", "red", 0.4, 2],
  ["schlegeis4", "p78", "Schlegeis", "red", 2.1, 8],
  ["p77", "p78", "Schlegeis", "red", 0.3, 2],
  ["p77", "p78", "Schlegeis", "red", 0.2, 2],
  ["schlegeis2", "schlegeis3", "Schlegeis link", "red", 0.1, 2],
  ["schlegeis3", "schlegeis2", "Schlegeis link", "red", 0.1, 2],
  ["gletscherbus2", "p33", "Spannagelabfahrt", "red", 0.5, 2],
  ["p33", "p32", "Spannagelabfahrt", "red", 0.6, 2],
  ["gletscherbus2", "p32", "Spannagelabfahrt", "red", 1.2, 4],
  ["gefrorenewand", "p33", "Spannagelabfahrt", "red", 0.5, 2],
  ["gefrorenewand", "p33", "Spannagelabfahrt", "red", 0.5, 2],
  ["p32", "larmstange1", "Keesboden", "red", 0.8, 3],
  ["p32", "larmstange1", "Keesboden", "red", 0.8, 3],
  ["larmstange1", "sommerberg2", "Keesboden", "red", 1.1, 4],
  ["larmstange1", "sommerberg2", "Keesboden", "red", 1.3, 4],
  ["p32", "sommerberg2", "Spannagelabfahrt", "red", 2, 7],
  ["p32", "sommerberg2", "Spannagelabfahrt", "red", 1.6, 6],
  ["p48", "p74", "Tuxer Fernerhaus", "red", 0.3, 2],
  ["p74", "p37", "Tuxer Fernerhaus", "red", 0.2, 2],
  ["larmstange12", "larmstange23", "Tuxer Fernerhaus", "blue", 0.1, 2],
  ["p48", "p42", "Kaserer", "red", 0.4, 2],
  ["p42", "larmstange23", "Kaserereck", "red", 0.3, 2],
  ["larmstange2", "p38", "Kaserer", "red", 0.5, 2],
  ["p28", "p51", "Höllscharte", "blue", 0.1, 2],
  ["p32", "sommerberg2", "Spannagelabfahrt", "red", 1.7, 6],
  ["p51", "p79", "Höllscharte", "blue", 0.6, 2],
  ["p25", "p63", "Schwarze Pfanne", "red", 3.6, 12],
  ["p16", "p28", "Link to Below Lärmstange 2", "blue", 0.1, 2, 1],
  ["ramsmoos2", "ramsmoos3", "Link to Ramsmoos", "blue", 0.1, 2, 1],
  ["p20", "p76", "Link to Schwarze Pfanne", "blue", 0.1, 2, 1],
  ["p21", "p76", "Link to Schwarze Pfanne", "blue", 0.1, 2, 1],
  ["p16", "p28", "Link to Below Lärmstange 2", "blue", 0.1, 2, 1],
  ["p79", "p29", "Link to Above Lärmstange 1", "blue", 0.2, 2, 1],
  ["p39", "p14", "Link to Below Lärmstange 2", "blue", 0.2, 2, 1],
  ["ramsmoos2", "ramsmoos3", "Link to Ramsmoos", "blue", 0.1, 2, 1],
  ["p81", "p48", "Link to Below Gefrorene Wand 3b", "blue", 0.1, 2, 1],
  ["p53", "p82", "Link to Above Gletscherbus 2", "blue", 0.1, 2, 1],
  ["p82", "p53", "Link to Tuxer Fernerhaus", "blue", 0.1, 2, 1],
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
  ["Almhit", "cafe", 47.10807, 11.67463, 1499],
  ["Fernerhaus", "restaurant", 47.07704, 11.67031, 2608],
  ["Gletscherhütte", "restaurant", 47.05798, 11.67385, 3065],
  ["Hintertux parking", "parking", 47.10792, 11.67412, 1500, {"fee":"no"}],
  ["Hohenhaus Tenne", "cafe", 47.10778, 11.67489, 1498],
  ["Hotel Vierjahreszeiten", "restaurant", 47.10845, 11.67407, 1502],
  ["Kaiserbründl", "restaurant", 47.10787, 11.67446, 1499],
  ["Mäk Tux", "cafe", 47.10793, 11.675, 1498],
  ["Parkplatz Hintertuxer Gletscher", "parking", 47.10955, 11.67382, 1504, {"spaces":756,"covered":true}],
  ["Restaurant Beim Hesser", "restaurant", 47.11477, 11.68179, 1485],
  ["Schirmbar", "cafe", 47.0967, 11.66324, 2024],
  ["Skiverleih", "rental", 47.1071, 11.67482, 1501],
  ["Sommerbergalm", "restaurant", 47.09731, 11.66328, 2028],
  ["Spannagelhaus", "restaurant", 47.07995, 11.67125, 2529],
  ["Tuxerjoch Haus", "hut", 47.09887, 11.64953, 2315],
  ["VALARA Alpine Art Hotel", "restaurant", 47.10724, 11.67407, 1504],
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
 * scripts/resorts/hintertux.json at build time, so adding a resort does not mean
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
export const TERRAIN = {"n":160,"west":11.613262952856099,"south":47.01312395,"east":11.713307047143902,"north":47.150656049999995,"data":"zwgCCTgJXwmFCa0J0wnlCdQJxwnbCfsJGgobCiEKNQo9CjkKJAogCiMKLwpMClgKaQp6CowKkAqfCrAKwgqTCmIKNQoUCvYJ5AnkCdYJwAmeCYMJfwkkCQ0J/ggNCQgJAQnpCNwI6QjpCPUIAwkQCSAJMwlHCVcJaAmCCZ0JwwnvCQwKKgr4CbIJlgmBCXMJawlxCX0JhAl9CXUJbwl5CWcJVwlNCTwJKgkaCQoJ/Aj1CPQI8wjmCNoIxwi9CK4IqwihCJQIewhqCF0ITwg6CCQIDQj/B9kH7AfhB9YHxAetB54HlQeQB4kHeAdeB2wHfgeEB3AHZAddB1kHXAdYB2cHdAeQB6wHvAfFB+YHDgggCCwILggnCB0ICgj4B+AH1AfDB7UHpQePB3wHaAdVBzoHJAcPB/oG5AbGBqcGjgbXCP8INQlbCXEJggmzCcgJzQnNCd8JBQpEClYKSApFClAKOwomCiEKIgosCjgKQgpQCmAKcAqBCogKmAquCpsKUQo0ChgK/QnpCeIJ5wnxCfkJ6AmGCT0JIQkSCRYJDwkECQAJFgkYCR0JHgknCTUJRwlbCW4JewmJCaEJuAnSCfAJ2Am3CZUJfQlmCVIJQglCCT0JQQlFCT8JOwk5CUsJPQkkCRMJBQkBCfcI7gjrCOkI4QjZCMsIwAi0CKQImgiVCI0IgghlCFEIPggfCAoI/gfnB9IHvwezB6YHmgeNB4EHcgdlB1gHTgdBBzsHTAdaB1kHUgdJBzkHKwctBz4HQwdQB1wHaQeJB68HzgfcB+wH/AcJCAsIBAj7B/AH4wfTB8AHrweXB4QHWwc3BxcH+gbmBswGuwamBo4GcwZeBskI7QgZCVcJbQl8CY4JoQm8CdYJ8wkbCkAKRwpBCjkKLgogCiAKJQoqCi8KOwpJClUKcAp/CoUKigqYCq0KrApmCk4KOAopChcKFgoYCh4KHQrlCY8JUQk0CSUJHwkYCREJFQkeCS8JQglOCVgJagl7CZIJqAmwCbMJ0gnWCcAJkQl+CW4JZAlfCVsJVAlACSgJGQkVCRQJEwkSCQwJCAkDCewI1wjJCMEIvQi5CLQIsAiyCLIIpgiaCJYIlgiNCHYIXghPCEMILAgVCP8H6wfSB7kHqgeYB4MHcgdWB2IHUgdVB0YHNAciBxYHFAclBzkHQwcuByMHFwcGB/8GDAcXByAHJAdEB1gHbAeKB5UHqQe+B80H2wfkB+MH3wfVB8sHtAeeB4MHYAdBBw4H7QbUBr4GrgabBo0GdgZiBkoG4Qj5CBQJOAmDCZsJtgnXCe0JEAoWCikKOApCCkMKQwpDCkcKTQpUClcKWgpVCmEKbwp5CoQKjAqTCqUKtAq8CpcKbQpcClQKTgpFCkQKQQoMCrcJiAlnCUgJPAk4CSgJKgktCTQJQQlYCXYJgQmRCa0JwAm2CaoJpgmVCYoJiwl+CW8JYwlXCVAJTglCCTkJLgkfCRcJEQkKCQUJ/QjvCNgIvAisCJsIkgiECHsIegh5CHkIcwhsCGQIXQhcCFkITwg9CCQIFAgACO4H2Qe+B6MHjgeBB2sHXQdJBz4HJQcpBywHKQckBxEHAQf+Bg0HIQcVBxUHCAf9BuwG3AbiBvIG9QbzBv8GDwcgBzAHRgdnB4YHmwetB7wHxgfLB8YHtQebB3UHUAcyBxAH7gbFBq0GngaLBnoGZgZXBk8GRgb7CBYJMAlRCXsJpQnmCSQKSQo4CjYKQApVCmIKXApaCmAKZQpvCnIKcgp1CnwKdAp+CoMKiAqQCpgKmwqjCqYKogqoCqEKfgpxCkgKJArzCcsJrAmOCXYJYglWCVgJSglMCVEJWQlkCXIJiQmrCbwJzQnFCbUJogmVCYYJbwlfCVsJWwlaCV4JYQlZCUIJLAkZCQkJ+wjuCOEI2QjXCM0IuAieCIYIbwhqCF8IWQhLCEQIRwhJCEcIQAg1CDAIKggeCBQIBAj0B+gHygexB5sHigd5B2MHUQc4BycHHQcSBwMHBgcABwwH/wbzBuQG8gb3BvEG/wbsBuYG2QbFBsAG0wbOBsgGyAbOBuAG9QYWBykHPwdUB3oHlQejB6gHqAeXB24HSwcvBw0H5wbEBqwGkgZ9BmwGXAZSBlAGSQY6BhgJMAlMCW4Jjgm9Cf4JLAo9Ck4KVApcCnkKeAp2CnYKegqGCoMKfAqBCoQKhAqLCpQKkAqICpEKlAqdCqgKtAqvCqwKqAqOCoAKSQoWCvQJ0Qm4CaYJlAmVCX4JhAmHCX0JgAmHCZMJogmzCcwJ5QnyCeUJzAmnCYAJbwlkCWgJbwlgCVkJUAkzCSYJEQn2COEI1gjLCLwItgirCKkIoQiPCHoIZwhXCEsIQwg8CDEIKggiCB8IHQgUCAwIBQj8B/EH5AfUB8UHwwewB5cHkQeTB5EHkQd3B1kHOwcyBzIHHAf9Bu8G4wbiBt4G0wbLBtAGzgbQBsoGxQa5Bq0GoAanBqcGlQaaBp4GoQazBssG7gYVBz4HWgdwB4MHiQeFB3kHTgcnBwcH4ga/BqQGiQZzBmIGWAZSBk4GRwY/BioGOglLCWgJhwmnCdcJDwozCjwKSApjCosKnwqZCpEKlAqYCpgKkwqMCo4KkgqQCpYKmwqbCqIKpwqnCqYKpwqvCrEKnwqPCoUKeQppCjgKDQrnCdoJzQnGCcIJrQm1CcEJvgm2Cb0JyAnXCekJAQoRCiAK8gnCCaAJhAl5CW4JbAlqCWAJXQlFCRgJ9AjUCLsIswinCJ8ImAiNCIUIhAiDCHkIaQhSCEEINAgfCA8ICwgBCPYH8AftB+YH4AfXB80Hxge/B7wHuwekB5cHoAezB7YHrgeHB4UHdAdBBzIHKAchBx8HIgchBx8HFAcFB+4G4AbVBsEGswaxBqUGrAabBo4GhQZ/Bm0GXgZpBoEGoga+BuUGCQcuB0oHWQdhB2IHVQcsBwIH2wa7BpwGiAZyBmIGUwZJBkYGPgY1Bh8G/gWCCZAJmAnDCeIJ9wkJCh4KOApbCoUKjwqOCpkKrArBCsAKwwq3CqoKogqdCpUKngqzCs0K5Qr1CvEK7Qq8CqkKogqNCoEKgAp0CmEKRQobCgsKAgr6CfYJ7QnkCe0J+gn9CfYJ/AkKChUKJQpCClMKFgrpCcoJrwmeCZoJlQmDCXUJZwk2CRAJ8wjVCL4IqAiKCIIIeAhxCGoIXQhjCGAIXQhXCEAILAgQCAMI8QfqB+IH3QfVB88HywfJB8UHwQe7B6cHogeuB7UHsAetB64HtAe7B70HigdkB1UHUAdTB1AHVwdbB1kHWAdKB0gHTAcdBxIHDwcNBwYHBAcMBxsHEQfqBrQGkwZ0Bk8GbAaFBpgGuwbhBgQHIgcyBzwHOgc0BxAH1garBo0GeQZrBl0GSQY4BiYGJwYpBg0G9AXaBdAJygnMCdQJ4wnvCQIKHwo2ClwKdAp6CocKmwqwCsUK0QrlCvQK7QraCs8K1wrZCvYKBQsMCxELMwvwCscKuAq2CqAKgQp2CncKbgp2CkwKMwoxCjkKJgoiCigKMQo6CkAKOwpAClMKZQpzCkAKJQoHCugJyQmxCaoJmwmQCYoJcwlPCRMJ8AjHCK0ImgiICHUIaQhXCFEISAg9CDQIKggiCBoIEggICP8H9gfyB+kH1QfDB78HxwfKB8gHwge4B7sHwQfGB88H2QfgB9oH2gfdB8gHsAeaB5oHkgeIB4gHlgehB6UHlweXB5EHmwd+B2UHgAeIB4UHiQd8B4MHXQctB+UGuQaWBnUGSAZOBnEGiAamBsUG3gbyBgAHCgcGB/sG3AaqBoUGZQZSBkEGMAYhBhkGFAYLBgIG6AXOBbwF7An/CRUKIQorCi8KOgpCCl8KaApkCmAKdwqFCogKmAqfCpoKogqfCqIKnwqaCp0KpQq0CsQK1grxCg0L1wrBCsAKtgqnCo0Kgwp/Co4KZwpECkoKXApZClwKaQpuCnAKdgp/Co4KowqJClkKNgoWCvsJ4QnPCcIJtAmkCZwJhAlgCTIJBwncCLIImQiFCHUIXghPCD4IMQgoCBsIFggNCAkIBAj/B/wH9wffB9UH6AfuB+wH6gfaB9QH0wfbB+MH8gf6B/sH+wf7B/oH8QfxB+oH6QfhB+kH5wfkB8AH1AfcB+EH7AfiB9oH7AfwB/kH6AfrB/oH9AfHB5IHYAdCBxYH4Qa7BpQGagY5Bj8GWQZ0Bo4Gpga9BtAG5AbiBtkGzAaoBn8GXgZNBjkGJAYVBgEG8QXvBeoF2gXDBa0FnQWpCcEJ2An7CRkKHQojCiUKPApNCk4KTgpcCnUKegp/CoMKgwqFCoMKfwp+CnsKfAqLCpUKpAq9CssK4Qr3CvQK6QrpCuYKuwqsCpgKhwp1CmIKXgpuCn4KjAqXCpwKiwqTCqgKuAqaCngKWQo7Ci4KGArtCcoJsAmTCYsJeQlsCVAJJAn0CMYIrAiOCGoIVwhGCDcIKwgjCBoIEggPCAoIBwgACOwH4wf0BwcIBggFCAMIAwgCCP0HAQgECAgIDwgUCBgIHgghCCYIKggdCBwIHAgeCCQIJgggCA0ICggZCBgIGwgnCDYIUwg/CDcIPwg8CEMI8gfAB4MHTgcmBwYH/AbIBp0GgQZpBkQGHAY/BlcGbwaIBp4GrgauBqYGmgaNBoUGXAY3BiIGGwYVBgIG6wXYBdgF0wW2BZ8FkAWEBYYJkgmjCbUJxgnPCdUJ2wnbCe0JEQoyClIKZQppCmcKbgpuCmwKcwp1CmwKZwpxCnAKiAqpCswK5Qr9Cg8LGAsUCwsLAgvtCtYKtwqnCpgKiwqKCpYKpgq7CsQKtAqkCpAKkQqVCpIKbApWCj0KDwriCboJpwmDCV4JQglCCTMJHwn8COAIxQiaCHoIYwhNCDsILQgkCBsIEwgNCAkI/gcACAoIEwgcCBkIIgguCDIIOghBCDMILAgkCCUIKAgtCDgIQQhPCFgIXghXCFsIXAhaCE4IVAhcCFUIRghOCFMIUQhUCGgIhwh5CGUIWghPCDgIBAjWB70HpQeWB20HNwcUB+IGpgZ3Bk8GNwYKBioGRAZTBloGbQZ+Bn8GeAZvBmYGWQYpBhAGAwYBBvYF4wXNBbsFtQWnBZIFfwVxBWUFfQmICY4JiwmPCZUJnQmoCa0JvAnTCfAJCwotClYKZwpsCnMKeQp5Cn8KcwpkCmQKcQqLCqcKuArTCvIKFAsmCxcLBAv9CuoK3QrNCscKuwqxCrgKygrWCqwKhApqClMKRgo/CkIKSwowChcK/gnlCcgJrQmLCWsJRgkfCfwI8AjiCMQIqgiVCH8IaghVCEIINggtCCUIIQgaCBIIFggaCCQIMwg8CEcITAhUCFwIYwhlCGwIZAhfCFEITwhWCFoIZwh0CIYImAidCIYIewh5CH0IiAiTCJsInwifCKUImwibCJ4InwiOCIcIdwhuCFgIRQgwCBAIAgjfB7kHiQdoBwsH3AarBoMGXQY4Bg4G+wUJBh4GMgZGBkwGSAZDBjoGNQYjBgUG3AXOBdAFzQW6BaMFjwWEBX0FdAViBVEFSAVwCXoJewl8CYUJiQmQCZoJowmxCcAJ1AntCQoKJwo8CkkKUgpTClEKUApXCmAKbgqGCpoKuArMCtcK5Qr0CgkL9QrpCs8KwwqsCo8KiwqJCosKkgqWCowKbQpVCjsKIwoMCvYJ9Qn3CfYJ1gm/CacJiQlvCV0JQgkhCQIJ5QjMCLEIlwiACHgIewhtCFgISQhACDcIMAgtCC8IQQhGCEoIVQhjCHAIeQiDCIUIjgiLCIsIjAiKCJgIiQiBCH8IgwiGCIoInwi5CLQIrAidCJUInQi4CNAI3gjaCNcI2gjaCNoI0Qi/CKoInwiVCIkIcQhFCDMIBgjeB7cHmQeHB0wHJgcNB8gGigZlBkUGLQYVBtoF9gUbBiwGJgYeBhMGBwb7Be0F3wW3Ba8FrgWoBZUFfwVsBVoFUQVMBUoFSgVJBVsJbgl0CXcJiAmdCagJqAmsCbcJzAnaCewJ/QkKChwKIAoFCgwKBAoeCiMKNwpSCm0KfAp+CoUKjAqRCqAKsgrOCrwKnwqHCnAKaQppCmkKaQptCnMKUQo0CiMKGAoHCvIJ1Qm5Ca0JrwmeCYwJeAllCU0JMQkWCQUJ7QjjCM4IqQisCLcIwAioCIIIZQhaCFYIUghQCFEIYAhmCHQIhQiXCK0Ivgi6CK0IsQi3CLsIuwiqCKQIqQi3CMwIuQioCKIIpwi6CN0I2AjYCNUI0AjSCNwI7gjpCOgI4QjVCM8IywjACLAIowidCJMIgwhmCDgIGAjtB8UHogd8B1cHLgcIB+4GzQaVBm8GUwY6BhUG3QXbBfkF7wXjBeMF6QXhBdIFvwWjBYUFggWBBYAFagVZBVAFTwVPBU4FTQVMBUgFaAlwCXYJgAmLCZUJnwmvCbgJtwm3CbQJswm6CcUJyQnDCcMJyAnJCdwJ9QkQCikKKgoyCjkKPgpFClEKYgp0CogKjQp4CnAKbQpqCm8KagpyCmwKUwozChQK+QnoCd4J4QnWCbMJkwl0CWEJSgk4CTkJOQklCRUJBAn6CNsIwAjdCOYI1gi4CKgIrwicCIsIkAiXCJMIlgiOCJ4Irwi7CL4IxQjPCMsIxwjHCMYIzgjUCM4IwQjECMgI3gjoCPAI4gjiCO8IAQn0COwIzgiuCKQIsgijCJ4IpwijCJUIigiKCIkIfAh6CHIIZwhXCEIIJAgCCNYHtAegB4AHVwczBwYH4Aa7BpkGbAZJBjEGFwbsBecFuAWbBaAFgwWFBZ0FlQV6BWQFXAVaBVgFVgVSBVAFTgVNBUwFTQVKBUkFSAV3CYQJjgmaCacJrwmmCYAJbAlkCWUJcQl9CX4JfwmBCYYJjQmQCaUJvQnTCd0J4QnkCfYJ/QkFChAKHgosCkAKWgp5CocKdApXCkkKQwpCCjkKIgoSCgEK8gnZCccJxAnKCcAJogmNCXsJaQlSCTgJKAkMCfwI8wjpCNkI1QjbCNoI1gjTCMwIzgjQCM0IzAjTCNQI0gjKCMQIzgjVCNkI3QjgCOwI/gjxCO4I6gjrCOII5QjvCPgIAwkZCSkJJwkUCQEJ7AjJCKYIjgh0CGgIUAhgCEoITghnCF4IXAhDCEIITghHCDcINgguCCQIEgj5B+QHugeUB3UHVAcsBwUH3Aa+BqwGlQZ5BmAGSAYyBiIGDwb2BekF1AW2BYQFbgVsBWcFYwVfBVoFVAVTBVEFXwVjBWMFYwViBV8FYAVjBZYJoQmmCZYJhAl4CW8JTgk6CTAJNQk/CUQJTQlUCVIJWQleCWsJfgmMCZgJmgmsCbkJxQnQCdoJ6AkAChoKNgpVCnsKYApQCkYKRwpGCjYKCwrYCdQJyAm7Ca8JogmbCaAJngmJCXcJaglUCUIJRQlLCSgJFwkTCQkJAQn4CO8IAQkKCQYJAAn7CPcI+Aj6CPsIBQkFCf4I9Aj3CP0I/ggICREJHgkwCTMJKwknCR8JGQkbCTEJSwlKCTIJEgn/COEIxQinCJkIYQgyCCYIIggCCPgHAQgRCDgIHwgcCBAI/wcOCA4IBAjwB/MH7AfdB8sHsAeJB2gHSQcpBwYH4gbLBrcGowaMBnoGZQZEBisGDAbxBdkFwQWeBX8FaAVlBWYFZAVfBVkFVgViBWkFbwVxBXMFcwVzBXEFbgVvBYsFjgl6CV0JSQk0CSoJIgkXCQwJDgkTCRcJGwkhCSMJKwk1CUMJTQlXCWwJewmFCY8JlgmpCb4J1QntCQcKIAo6CloKeApvCloKVgoxCgwK7wnXCcEJrgmcCZMJkQmICYMJfwl3CWwJbQlyCVsJSwlCCUUJSAlECUYJQAk8CS4JFwlMCVMJRwk/CTUJMwk1CTQJNgk5CTsJMQkqCSoJLgk1CT4JSQlPCV8JcgmGCXAJZQltCVkJPAkgCQsJ8QjUCLMImQiLCFoIPgg0CAMIyAfVB7AHqgfEB9oH5AfpB9gH2wfBB8IHyQfEB70HrgeyB6wHngeCB1wHSAcpBwcH7AbOBrgGpQaXBogGdAZRBisGDwbxBdQFtAWYBYMFdAVlBWEFXgVeBVoFWQVsBXEFdwV9BYMFhgWGBYUFggWNBZQFnQVkCUAJHQkPCQEJ9wjqCOII4gjhCOQI5wjwCAAJDwkWCRMJ/QgSCTYJUglkCXMJhgmbCbIJygnhCQcKKApFClwKdQqNCm4KSwozCgwK7QnXCccJuAmzCbYJpQmOCX4JeQl0CW8JdAl+CXcJcAlqCWUJcwl+CY4JmQmcCX8JXglACV8JjwmbCYcJdQlwCW4JawltCXAJbAlwCW4JbQluCXIJggmHCZcJqQmyCagJiglsCUwJKgkNCewIzgi7CLUIkghhCDYIBAjyB9gHrgeUB3oHewdmB4EHjQePB6IHrAeZB5MHdgeIB4cHhAd+B3YHeAdwB1gHMQceBwQH5gbLBrIGnQaQBoAGcwZVBjAGEgbzBdYFvQWkBYQFcQVkBV4FXgVaBV0FZgVtBXQFewWCBYkFkAWXBZoFlwWZBagFugXNBUIJHwn2CN4IzQjACLYIqgioCKcIrAipCLoIzwjJCLsI1gj3CCYJTAleCW8JhAmbCbUJ0gnuCQcKHQo1ClQKegqQCnYKUAouChEK+gnqCdgJygnRCdEJwAmqCaEJkQmFCYQJiQmWCaUJsQm4CaQJnwmuCcMJxgm6CakJpQmQCW4JjAmiCZQJlgmYCXwJawlqCWsJWAlDCTAJLAlACUwJaAl4CYQJfwl2CW0JbglZCT0JIQn/CNoItQiWCH4IYQhaCD0IBAjWB7EHjAd6B2wHSAc6ByAHOwdCB0wHVAdcB2IHQQc0B0QHQAdAB0EHNwc+BzwHMgcPB/gG6AbMBq4GmQaCBm4GUgY+BisGDwbvBcwFsgWeBYsFeAViBV8FXwVfBV8FXgVpBXAFdwV+BYcFkgWcBaUFrgWzBb0F0gXgBe0FIwkICe0IzQimCI4IfQh5CHgIewiCCIEIlgiUCKEIwQjoCAoJLQlPCW0JiAmlCcMJ2QnrCf4JFgoeCiwKOgppCoIKawo5ChsKBwr7CegJ3gngCeMJ0gm5CbgJvQm5Ca0JqgmnCagJsAmmCZ4JngmmCZQJjgmDCYAJgAmGCZIJnwmmCaMJlwmQCYQJaQlWCUQJOgkxCREJ9AjtCPwIDAkqCToJRQk4CS4JKgksCRkJBQnuCMsIpwiICGkITQguCBQI/QffB7kHgwdYB0EHNwccB/0G8Ab1BvQG/AYJBw0HEAcLB/cG+Qb6Bv0G/AbyBvoG+Ab2Bu4Gzga9BrUGngaEBmsGUwY1Bh0GDgbyBc8FsgWdBYkFdwVqBWUFYAVgBWAFXwViBWgFcgV8BYoFlgWfBbAFvgXOBccF1QX0BQcGIwYCCeUIwwibCH4IYghdCFQITwhRCFsIcQiFCJcIsAjJCOEI/AgeCTsJSwlQCWUJhAmHCYwJpAm8CeMJFApACkgKZgpNCi4KHwoZCg8KDgoACvYJ5wnUCcIJwgm9CbMJrAmlCZwJmAmSCYsJigmICYgJjAmQCZUJjwmSCZEJmwmYCZYJmQmHCXIJYwldCUkJNwkYCf8I8gjMCL4IxAjRCOcI9wj3CPAI6gjjCOEI0gjDCLMIighoCEMIKggUCAAI7QfbB8QHqQeAB1QHMgcMB+IG3wbSBsAGrQayBroGvga9BsEGvwa8BroGsga0BrIGtwa1BrUGuQasBpIGjgZzBlcGRAYmBg0G8gXeBc4FvgWqBY0FeQVuBWgFZAVjBWEFYQVfBWgFdQWFBZIFowW0BcAFzwXiBfsFFgYiBjAGPwZIBv4I1QivCJYIcAhRCDoIHgg9CFkIaQiECKEItwjCCL8I4AjcCOUIAQkQCRwJJQk4CV8JhAmmCaAJswnECfEJ/QkSCjoKTgpHCkwKQgotChMK7gnTCcgJvQm3CbUJswmzCaoJnwmVCZoJnAmbCZoJpAmiCZ4JnAmhCZoJkAmBCWUJdwl7CXUJZwlZCT8JJwkMCfcI3wjPCMkIywiaCJ4Itwi7CLUItAivCKoIoQiVCIcIcQhTCDkIIAgGCPMH3AfDB6wHmgeQB30HZwc0B/wG4AbqBtgGxgayBqAGjgZ/BoIGiwaOBowGhgZ8BngGfgaIBocGgwaLBoMGeQZuBmYGRAYhBgIG7gXeBcoFtQWpBZwFiwVxBW0FagVoBWMFYgVgBW0FggWTBaYFtgXNBeQF+gUZBjQGPQZZBk0GPAZUBnUG2Ai2CJQIbwhVCCsIEAj6BwcIIAg3CFAIWgheCGgIfgiACIUImgipCLsIvAjgCPwIEAkkCT8JUglhCXoJmQm8CeEJCQoxCioKGAoKCvwJ7wnfCc8Jvgm4CbYJswm3CbcJrwmnCa0JpQmfCZwJoAmoCZ8JlgmQCX8JaQlgCUUJKwknCTcJPQk4CTYJNAksCSEJDgnuCNUIuAigCIcIcQh+CHsIdwh9CHkIaghkCGAIWQhJCDkIIQgCCN8HxweqB4sHcQduB1EHSQcqBx8HJQcvBzoHNwcKB/AG4wbCBqcGmgaHBnsGdAZrBmMGYAZRBk0GWQZfBlsGWwZXBkMGMQYWBvkF2QXIBbcFrAWZBX8FeAV1BXIFcAVtBWoFZAVjBXMFigWhBbgF0AXvBQsGJwZBBlMGZQZwBngGcwZcBlsGcQaKCJsIgAhVCDsIFQjqB88HxQfVB+oHAAgQCBYIHwgqCDMIRwhaCGwIgAiXCLAIygjhCPwIEgkqCU4JfAmaCbkJ2An3CRQKHwoXCg8K/QnqCdgJ0QnHCbwJtQmzCa8JrgmsCaoJngmXCZEJiwmECXIJYwleCU4JRAk8CTUJLAkeCRAJAQkBCe0I+Aj8CPwI7AjbCK4IoQiSCGkISQg8CC0IKQgpCCsIKQgYCBMICwgHCAII8QfeB8EHpweQB54HtgfHB6EHlweLB5MHlgd9B5AHlQeVB2sHRwdCBwMH6QbQBsEGtAasBpgGkAaUBokGeQZnBlUGPAYdBgQGAAb5Bd0F0AW3BZoFkAWJBYMFfwV6BXcFcwVvBWwFZgVkBXwFnQW1BdcF7wUSBi0GRwZdBm0GfwaSBp4GowaeBo0GdAZ4Bk0IbwhXCCwI9wfUB7kHqgfVB+4H8Qf5Bw0IJAg2CEwIXwh5CJcIsQjFCNUI3QjrCAQJGAk6CWMJhAmsCcYJ4QkNCiwKQgpCCjQKHwr+CewJ3QnVCcgJuwm1CbIJtAmxCakJowmdCZoJkQmZCZUJkQmKCYgJfglsCWkJYQlZCTYJDQngCMIIqQilCKIImQiJCH4IZwhQCDsIKQgdCBoIHwgYCBYIDwgACPEH6gfeB90H2wfWB88HzwfiB+sH8gcDCAsICwj9B/cH5QfcB9sH3wfhB+MHsAeNB3wHTQcnBwcH8gbjBskGtga8BrcGpQaXBokGeQZPBjYGHAYFBusF2AW7BZ0FjAWKBYUFgAV8BXgFdAVwBW0FaAVpBYQFpgXPBe8FCQYnBj8GVwZrBoEGkwanBroGzAbbBswGrAabBo4GIgg6CDUIJQj0B7gHkAevB9kH/gcnCD0IRghaCHIIgQiVCK0IvgjQCOMI+AgRCSIJQQlZCWoJjgm0CcMJ3gkACikKWwpZCj0KHgoDCvEJ6QnjCd8J1gnKCcoJxAm7CboJuwm2CaoJoQmhCaEJpgmpCaUJmwmRCYoJgwmBCYYJWQkmCQoJ5AjSCK4IkgiCCHUIaAhcCFMIUAhOCFQIUghUCGAIZQh1CFYIOgg7CDsINggpCB0IFAgbCCEIHAghCCgILQg5CEoIPwg1CCcIFwgSCBYICQjlB8cHqgeOB2sHQAchBwEH7gbmBtoGywa0BpkGewZfBkUGLgYdBgcG7AXQBa8FiQWHBYAFewV7BXoFdgVyBW4FagVrBYIFpQXVBfoFGAY3BlEGZAZpBn4GmgayBsQG2gbsBv8G6wbbBscGrwb3BwYIBAjyB78HkgeGB6cHzAf7ByMIQghrCIEIpAi3CMoI2QjuCAUJHgk1CVMJYQlzCYwJrQnBCdcJ5gnwCQUKGgo7ClQKQgozChMK/wn9Cf0J/wn/CfMJ5gnTCdQJ2QniCdsJzwnKCcgJzAnbCdcJygnFCb4JvQm4CboJnAl+CVUJLAkFCeIIyAi4CKwInwiSCIcIhwiHCIUIjgiWCJsIoQilCIwIhAh8CHoIfgh2CGwIbghZCFUIUQhOCFEIVQhkCHAIcgh0CFcIRQgSCP0H6wfcB74HoweMB3sHbQdkB1IHNwcgBwsH9gbhBrwGmgZ6BmIGRQYuBhkG/gXWBa8FjwWBBX4FfQV8BXoFdwVzBWwFagVwBYMFmQW6BeYFHQY9BlUGcgaGBpYGoAanBsAG1gbwBgYHFQcaB/sG5gbUBtMH1QfUB8QHpQd6B3YHlAexB8kH4gfvBwsIHgg7CGAIigirCNcIBAkWCSUJNwlLCVoJXglvCXUJfQmPCZUJrAnCCeUJBAotCkwKLAocChoKHAodChIKBwr8CfUJ/gkFChAKDAoCCv4J/wkFCg4KEAoPCv4J9QnyCfgJ0wmfCXAJUAk1CSoJGQkHCfQI7AjkCMsIyQjJCM4I0wjUCMcIyAjRCNEIvAirCKMIkgiKCIEIhgiZCKMIeQhuCHAIfAiNCJMIbQhICCMIAQjoB80HsgeeB4kHdAdbB0YHOAcqBx4HDgcGBwIH9QbkBtAGtgaTBngGYwZDBicGDQbdBbkFmAV8BXkFeAV2BXUFdAVvBW0FbwV+BY8FqQXEBfgFLwZHBl4GeQaQBqUGuAbLBtkG5AbyBgUHFwchByoHLQcWBwUHqgehB5EHjgd6B2QHcweDB5MHqQfLB/AHEAguCEsIfQiUCKUItAjCCNMI4AjpCAIJBAkECRkJFgknCTkJUglsCYwJsgnfCQ4KNApQCkoKSwpUCkcKPAosCigKKAopCi0KOgpUClAKPQo5CjQKMwo3CkAKSQpLCjcK+AnGCaUJhgl7CW0JaglxCWAJTQk7CR8JEgkJCQsJDAkSCQcJ8AjnCOoIAwnqCOQI2QjLCMoIygjICMcI0QjFCKEIkgidCH8IVwgXCPsH2we7B6IHkAd4B2IHUAc+By8HGwcPB/wG6gbgBtYGyQbBBrkGtAaoBogGaQZRBjAGEQbuBbsFlwV8BXUFdQVzBXMFbwVuBXEFdQWBBZEFqgXJBeoFEQYyBk8GcAaVBrIGxwbcBuwG/wYJBxcHIQclBywHOQc+B0gHRgeVB4QHZwdYB1YHXQdmB3MHjQewB9UH+AcMCCQINQhTCFwIYQhqCHgIgwiSCKgIpgitCLII2AjiCAoJNglPCWoJhwmqCckJ7wkSCjwKewqECngKfwqJCmcKXApaCl4KXwpXCk0KTApVCl0KZQpuCnMKfQqQCngKPgovCusJywm5CbQJuwm9CccJtQmgCYkJbglUCWAJWwlUCVAJOQkkCRUJDwkiCTsJLQkqCRoJFgkUCQgJBQn5CNMInAh1CE4IIwjxB9EHtAeZB4QHcAdeB0wHNAckBxgHDQcAB/QG6gbeBs0Gwwa3BqkGngaMBnUGYAZFBioGBgbiBb4FnAV/BXYFdgV1BXEFcAVyBXYFewWDBY4FoQXBBd4F/AUfBkkGbwaPBq0GyAbgBvEG+wYOBx0HJgcvBy8HOwdHB04HVwdpB2kHVwdGB0cHTQdTB1sHYgdqB4AHmQe1B9AH4gfoBwkIJQgkCCMILgg+CFsIXgh5CJEItAjICOAI9QgTCS4JSAloCYQJqAnSCfgJKApbCoQKsQqrCo8KeQpgCkwKPAonCg4K+wn/CQIKDwofCi4KPwpUCmkKfgp7CloKJwr9CeoJ2wnoCQQKEwr+CeMJuQmwCZUJigmNCYwJhgl/CWcJTglFCU0JZwlXCUQJNAkbCQQJ7gjcCMsIsAiOCFwIFAjWB7gHoAeFB2cHTwc+By8HHwcQBwoHAQf7BvQG6wbiBtMGvgaoBpoGkQaEBmoGVQY2BhwGBgbkBcsFrgWSBXoFeAV0BXIFcQVzBXcFgAWIBY0FogXABc0F6gUXBkkGbQaTBqIGwgbfBvMG/gYIBw4HFwcjBzEHNwdEB08HVgdiB3UHPAc5BzoHQgdLB1QHXgdmB3EHeAeAB4kHlAegB7AHzwfaB/EHIAhHCGEIdAiCCJwItAjPCOII7AgGCSoJVwmCCbIJtwnRCfYJIgpYCm8KngqbCncKWAo7CiEKCAr2Cd4JyQmpCa4JrQnFCdkJ7wkDChkKMApICmEKZwpTCjoKHgoWCg4KEQohCiYKBwrsCdUJvgmsCaQJrwnDCbEJngmMCXUJXAlBCSYJDAn3COoIzgiyCJkIYAhWCBMI3ge1B6UHlgd+B2UHTgc6BykHFwcHB/oG9gbvBu0G5wbeBs0GxAa3BqQGigZxBmMGUAY8BiIGBAb0BeIFxwWpBY4FeQV5BXUFdQV2BYEFjQWdBakFswXHBecFCwYkBkQGcQaZBrAGyAbaBucG7AbxBvsGBQcYBywHNQc9B0wHYQdxB4AHiQcpBy4HOAdBB1IHZAd6B5IHoge2B8kH2QfmB/kHDggfCDAINghECF8IeAiUCLAIzQjpCAEJHglBCVQJbAl6CaQJyAnuCRAKMQpbCoUKmAqMCogKagpBCh4K+QnXCbsJpwl8CWkJaAlrCXgJiAmiCccJ5wn/CRQKKAo7CicKGAoZCiEKKwouCi8KKwonChUK/AntCdwJxgm2CaMJiglzCWIJUgkyCRQJ9wjYCLQImwiRCH4IOgj7B+QH0ge+B6oHmgeGB24HTwc7BykHFwcEB/YG7AbgBtQGywbHBsIGtQamBp4GjwZ3BmcGVQZDBiUGCgb+BesF2QXIBaMFlQV/BXoFdgV8BYQFkQWhBbMFyAXdBe4FFQYtBkoGeQalBrMGxAbOBtAG1AbgBu8G+gYJBxwHMAc/B04HWwduB4EHlQeqBygHQwdXB2wHgweeB7QHyQfhB/AH/QcOCBgIJggyCD0IVAhdCGkIhAijCLgIzQjlCAAJIQlLCXEJmgmzCcQJyQnUCfwJKgpKCnsKcApWCkIKOAo0CjkKHQrtCckJpQmBCVkJQAk6CUAJTwlhCXMJlQmyCcYJ3AnxCfcJ4wnPCcsJ3AnzCf4JAwr8CfcJ/QkACuYJvgmfCYUJbAldCUkJLAkZCQ8J7QjICKwIkQhqCDwICgjmB8kHsAefB4oHeAdqB1QHRwc4ByQHCQf0BucG3QbVBskGuQaqBp8GlwaRBo0GjAZ7BmUGSQY5BiwGIgYSBvUF3gXBBa8FowWFBXsFiQWOBZgFngWiBa8FvQXXBfkFGQYqBkoGcgaZBr0G3Qb2BvQG+Qb2BucG5gbvBgYHGAcpBzsHTQdhB3sHlAesB8IHaAd/B5UHrAeyB8QH3gfyBwoIGAgqCEEITAhPCFoIYwhuCIMImgiqCMoI0QjbCO0IBQkiCUMJZwmNCbUJ4QkCChQKJwpCCmIKTAoxChQKAQrxCecJ4AngCewJxgmjCYUJcglNCSYJDgkeCTEJPwlUCW0JggmaCaoJrgmgCZ0JmwmqCbkJxwnPCcoJwwnOCdcJxwmhCYUJaAlJCS4JFQkGCeEIxwi5CKMIighpCE0ILQjwB80HnAeDB3UHZQdZB0oHOgcmBxAH+wbmBs0GxQa8BrAGpAacBpYGjAaEBngGbQZbBkcGOQYsBh8GFAYFBu8FzQW2Ba8FpQWIBZ8FogWlBawFtwXHBc4F3gXuBQQGKwZNBmcGfAaRBqoGwQbfBuwG8Ab+BgIH/QbxBvQG9wYOByoHRAdbB28HhgejB8wH8geaB6oHwQfRB+MH9gcNCCUIOAhQCGgIggiLCJQImwifCKoIvQjaCO8IAwkcCSkJMAk7CUgJVQltCXsJjAmgCbkJ1wnhCQsKJgohCvwJ4QnLCbsJrwmmCZ4JmQmpCa0JiQljCUIJKQkLCf4IDAkaCRoJIgkzCVEJXAldCVwJYQloCXIJgAmLCXoJfwl8CYcJlwmUCYoJeQlaCTYJEQnuCNcItwioCIUIaAhRCCUI7wfEB6UHggdiB08HSgdIBzkHHgcLB/wG6QbbBssGvwaoBpgGkwaOBooGgAZpBlQGSAY/BjEGJQYWBgcG/QXzBdUFvQWkBZ0FoQWtBbQFugXEBdoF6gXwBf0FAwYTBisGRgZbBnoGjQagBr8G3wb1BvkG8wb5Bv4GBQcTBxAHFgcUBxAHJwc8B1YHcgeLB6QH1gcACN4H7AcACA8IJwg5CEoIXgh6CI8IpAi4CMUI0QjfCOcI6QjoCOII5AjnCOkI7Aj2CPsICQkaCS0JOwlRCWIJegmSCaoJygnpCQAK1Am6CaEJjAl4CXAJaAllCWEJZwlqCVsJMQkZCQMJ2QjjCN0I5wjuCPkICQkaCSEJKQksCTcJSwk7CTEJIwklCSQJUQlbCVYJPgkzCSsJCQm9CJcIcQhnCEkICgjqB9sHwAexB6EHdAdPBzEHHAcTBxIHEAcAB+QG2AbKBr0GtwasBpcGggZuBmEGVwZPBkQGPQY0BiUGGQYTBgkG+wXqBd4FzAW6BagFvAW+BcUF1AXjBfsFEAYiBjUGQAZFBkcGagaBBpsGqwbEBtcG4QblBu8G/QYWBxMHFAcXBx4HMQcyB0EHSAdLBz8HTwdoB4IHowfbBw4IMwhFCFIIUAhUCFsIYwhqCG0Icgh0CHgIfgiHCJEImQidCKIIowioCLEIuQi8CMgI1wjnCPUIBgkYCSoJOglRCW0JiwmsCdcJ8Qm/CZsJgQloCVAJQQk1CSwJKQkqCSoJIwn+CNwIygi+CLEIuAi4CLsIxgjRCNwI5wjvCPsIDAkjCf4I3gi6CMkI2gjoCPkI9gjmCN0IzgiPCGEIQQgYCPwH3ge/B6gHmAeMB38HZwdCBx0HBgcDB/wG7wbmBtEGwQa6BrAGmQaHBnkGZwZMBjYGKQYtBisGHgYXBhIGDwYCBvcF7gXgBc0FuwW5BcgF2gXgBe0F9wUABg8GJwY3BkUGWQZtBn0GhwaPBpsGtwbQBuoGAQcUBxgHFgcYBzAHOwc2BzYHPAdBB0YHRQdZB2MHbAdmB20HiQejB9EHCAhdCFMIOggnCB8IHwggCCcILggyCDcIPQhHCFIIXwhlCHAIdAh2CIYIlwijCLAIuwjJCNgI5gj0CAIJEQkjCTcJTwlqCYsJpgnWCbYJkAlsCUwJMAkTCQQJ/QgGCQgJAAnsCM8ItgiiCIwIgQiACIsImAigCKcIsQi3CL0IygjZCOUI2Ah2CE4IQAhqCJIIdwicCKMIYAhKCC4IMwgcCO4H0ge7B6QHjgd6B2oHXQdEBx4HAQfxBugG1wbOBssGugaiBoQGdAZmBl0GSwY5BiMGGgYLBgsGBgYCBgEG+AXrBd8F2AXSBcoF1gXcBd8F5QX2Bf0FFgYmBi8GOAZOBmEGcgaCBpAGnQavBrwGzgbnBgUHJAdCB1MHWAdXB1MHTgdYB10HXwdjB2QHYgdvB3sHiQePB5UHlAedB8EH5AcmCBEIBwj3B+0H5QfkB+cH1gflB/4HFwgtCD0IQwhKCFQIYghvCHkIigidCKwItAjCCM4I1QjbCOQI9AgGCRcJKAk3CUsJYwmFCagJmwl7CV8JQgkkCQEJ3wjVCNII0wjTCM4IqwiPCH4IbQhdCFgIYAhqCH8IhQh/CHsIiAiYCKIIrQiBCDcIBQj5B/QH/QfmB/QHAwgCCN0H6AflB+gH1gewB5AHgAd0B2kHWwdIBy8HEQfwBtkG0Qa/BqkGlgZ+BmoGVgZHBkAGOAYpBhoGBwb8Bf0F6wXjBdYF1QXOBc4FxgXJBc4F2QXmBfMF/AUABhAGJQY+BlMGZAZxBngGjAalBrcGygbjBvMGAgcdByYHUQdvB4MHjgeaB5wHlAeNB48HkgeSB5IHjgeHB5sHsQfAB78HyAfUB+MH8wf/ByUIywfCB7sHtQewB6oHuQfaB/AHCQgaCCsIQwhbCGsIcgh4CHgIfgiCCJQIqgizCLsIwQjLCN0I5Qj5CAUJHwk3CU8JWQlnCYIJowmWCWoJRAkcCfsI5QjOCL4ImwiUCI4IgQh2CG4IZghPCCgIFAgdCCsINghACEwIVwhaCFYIPwgqCBwI5gfFB7kHsAefB5gHjAeFB40HkweRB5oHmAeWB4gHeAdhB1EHSAc+By0HEQfwBtsGyAa0BqcGlAZvBlsGRgY1BigGGwYXBgwGBAb3Be0F4AXYBdAFzQXLBcgFyQXSBeIF6wX9BQ4GFwYqBjgGRAZRBmkGegaVBqgGtgbLBuAG8wYLByAHMgdCB1gHcAeMB50HtAfPB9sH5gfaB9IH0QfQB8wHxwe+B7YHuAfEB9kH8Af7BwUIDQgXCCQIOAiOB4QHdgePB6sHwgfWB+gH9gcOCCgIOwhFCFQIZAhxCHwIiQiXCJsIpgi4CMEIyQjUCNgI6Aj7CA4JIwk3CUsJZwl3CYYJnQmVCXMJUwkyCQgJ5wjHCJcIkAiSCHUISwhMCCQIEggHCPwH7AfrB/EHAwgaCCQIDgj5B+0H9Af0B+gH1AeTB4sHhgd6B3EHawdfB1MHUwdUB1gHVwdZB1YHWQdQB0cHMgcWBwsHAAfyBtoGwQaxBqEGlQaCBnEGUgZABi0GGAYJBgIG9QXnBdwF0wXPBc0FzAXKBcoF1QXnBf4FDAYVBh0GKQZABlYGcAaGBpUGqga6BsoG3QbwBgIHGQcxB0UHXAdtB30HkAeqB8EH0wfkB/YHGQgpCDgIGggVCBQIDQgACPYH7wfxB/wHDggbCB8IMQg9CDgIPghICEoHZQd7B5YHqwfAB90H7Af4BxYILAg6CEcIUwhoCH8IkQiiCLUIvwjACMgI1AjcCOII6gj2CAoJHwk/CVQJaQmDCaAJqgmNCWwJUQk4CQ4J/gjaCLMIighhCD8ILQgUCAUI+QfwB+oH5gfjB+EH3wfcB9gH1gfZB9oH5gfpB8cHtAekB20HWAdYB1AHSQdIB0EHOQcwByUHGwcUBxgHHQcmByAHHAcQBwEH7wbeBtIGwAauBpsGhAZ1BmYGTgY5Bi0GHgYLBvsF7QXdBdUF0gXQBc4FzQXLBdMF3gXpBfAF+gUDBhYGLgZIBmIGgwaeBq8GxQbeBvUGCwcRByQHNAdIB2AHcwd/B5MHrAfEB9oH7wcGCBoILghNCHAIjghgCFwIWwhLCD8IPgg5CCMIHQgfCCUIKwgzCD4ISQhWCGEIOwdCB1MHaAd5B4cHnAewB8cH4Af4BxUINAhTCHYIngiyCMUI2gjvCAIJBgkICRQJIAkZCSIJMglHCVUJawl7CY0JrwmBCWsJUwkxCQQJ3wi0CJQIdAhTCDYIIQgUCAsI/wf0B+wH5wfkB+IH5wfnB/EH/AcFCBIIHAgkCBII3gezB5UHaAdHBzQHMgcsBykHJgchBxsHEwcLBwEH+Qb2BvgG9gbxBusG4wbXBsYGswacBogGdgZeBkoGOAYtBh4GEQYHBvkF5AXXBdQF0wXSBdAF0AXRBd0F5QXvBfQFAQYcBjAGRwZhBnkGjQakBrsG2gbrBgIHFwcsB0EHSwdXB28HjQeiB7sHwgfJB+4HEAgiCD4IhQilCMEI3Qj6CAMJ3QicCI8IiwiJCIYIgAhXCEgIQghDCEgIUghiCHEIgAg9B0oHVQdkB3UHiQeTB6AHuwfMB+MH/AcUCDQIRwhVCGwIggicCKoIuAjFCNII5Qj3CAQJEAkZCSAJLQk5CUkJWQlxCYsJawlSCTgJFwnlCMQIhAhSCDkILAgcCA0IAgj5B/IH+AcECA4IFggbCCIIKAgxCD8IRghHCBQI4QfDB6YHjAdyB1cHPQctBx4HFAcPBwsHBwcAB/wG+AbyBvAG6wblBtYGyQbABrUGqwacBo4GTgYzBicGGwYRBgkG/wX0BeoF3wXaBdcF1QXUBdMF0QXPBdwF7gUABg8GHQY4BmYGcgaLBrAG2gbiBvoGBAcLByIHMwdCB1kHbwd7B4UHpQfPB/AH+wcFCDQIYAiCCJwItgjTCO4ICwktCU4JaQk7CS8J5gjTCN4I2QizCJYIgwh2CGUIYQhnCGsIeAiQCEEHWwdvB4UHlgegB7oHwQfDB74H0gfeB/AHBwgbCDAIRQhbCHAIgAiRCJ4IsAjGCNsI8QgBCREJIgkoCTIJQglYCXQJmwmNCUQJAwndCLkIkghpCE8IOAgmCBcIDAgBCAoIGwgpCDcIRwhYCGEIYQhsCHIIggiICEkIBwjkB8UHqweRB3wHZwdbB1AHRwc5BzEHKgckByEHIgcdBxUHDwcGB/wG9gbqBuIG2Aa7BpcGdwZWBjwGJQYRBvkF7AXnBeIF3wXcBdkF1wXUBdIF0QXTBecFAAYbBjIGTwZnBoEGqgbCBt8GCwchBywHSQdPB18HaweFB5wHsQe8B9sH/gcjCEMIVghtCFsIVQhxCI4IvAjsCA4JLQlMCWgJfwmUCawJnwmFCWMJWgkZCfoI0wi2CJ8IkwiECHcIdgh8CIgIXgeIB6kHvgfRB98H1QfOB84H0wfWB90H5wfyBwQIHQg0CE0IYgh1CIkInQiuCLYIwQjMCNkI8QgNCSwJUwloCX4JmgmbCWIJHwkFCckIpgiHCGkITQg7CCwIIAgTCBsILwhCCFUIZQh0CH0IdAhzCHYIhQiTCHYISAgaCPcH2Qe+B6wHmQeNB4AHdAdnB1YHTQdKB0IHQwdDB0AHOgc1By8HKAchBxYH/gbWBsMGpQaOBnUGVQY5Bh8G+gXwBeMF4AXdBdsF2QXXBdUF0wXfBfkFGQY2BlEGbAaJBqkGxwbdBvMGDAclBz4HVQduB4UHnQeyB9EH6QcACB0IOAhNCG4IjAieCLQIxgjSCLQItwjaCPIIFQk7CWYJiQmnCb8J0AnDCbsJuQnHCYQJNgkgCe4I1gi+CKYIjwiFCIMIhwgxB1YHcwePB6gHxwfbB/AH/Af3B+0H7AfzB/8HDQgoCD4IVAhqCHcIlwiqCLUIvAjFCM8I3QjvCAYJIAk8CV8JfgmkCaQJcQk0Cd8IuwiaCH4IaAhVCEUIOAgtCCgIPwhRCGYIegiNCIoIfwiFCIUIiAiQCKsImAhbCCkIDwj1B9wH0QfLB7oHoweUB5AHigd8B30Hegd2B3YHeAdzB2oHYwddBz4HFgf/BuoG1wa+BqkGjQZiBj4GHwYBBuwF4wXeBdwF2gXYBdcF1AXpBRIGMgZLBmQGfgahBsEG3Ab1BhQHOQdKB1gHZweAB5oHsQfIB98H/AcUCCsIRghgCHQIjginCMEI2gjyCAkJHwkxCR8JJglDCXUJrAnQCfQJAQr7Ce0J9gkGCgQKjglWCTUJFwnwCNMIvQipCJkIlAilCNkGEQc5B1wHaAeOB58HxAflBwUIIQguCCoILghACFcIYAhjCG4IeQiHCJAIqQjCCNQI2wjnCPcIDAkjCTwJWQl8CasJpwlNCQ4J7AjJCKgIjQh1CGEIUwhFCDsIPQhXCGwIhQibCJcIgwiECI8IngipCLMIxQiwCG8IPwgjCAwI/gfyB+IH2AfNB8gHxgfAB7MHrQeqB64HtAe5B7oHrAeBB1cHQgcsBxEHAAfmBtMGtAaRBmoGRwYpBhIGCQbsBd8F2wXbBdgF1gXgBQcGOgZZBm8GgwaZBrkG5AYJBycHPgdQB2QHfAeUB60HwgfbB/UHCQgeCD4ITghjCHgIkgiqCMMI4Aj9CBwJOwlZCXcJkwmcCYcJpQnBCRMKJgoyCkAKMwotCkYKzQmjCZ0JWwksCRMJ9wjcCMQIswi1CMgIlwa1BtAG8wYXBzsHdAeSB6QHuQfbBwcINAhVCGkIewiNCJ0IoQiQCJMIpAi4CMgI3wjyCAMJEgklCT4JWAl3CZgJyQnKCZsJOgn7CMoIrQiZCIEIbAhbCE8IQQhVCGwIhQiiCKwIsAihCJ0InwitCLQIygi7CIgIZQhLCDYIKggiCBoIAwj6B/QH8AfrB+oH5wfhB9wH5gfyB+cHugehB4gHYAdFBzMHHQcFB+MGyQaqBoMGYQZGBjkGJgYMBvIF6QXfBd4F2gXaBfQFGAZPBmoGhgakBsEG2gb/BiAHPAdWB2oHgAefB7gH1AftBwQIHAg3CFMIZghzCIQIoAi6CNUI8AgLCS0JWwl6CZAJqgnBCdgJ8QkKCiYKPQpTCmcKeQpoClkKWgoVCuMJnwl6CU8JIQkFCesI1wjHCMAIvQhxBn4Gnwa0BtcGBgcqB1QHgQeyB9QH4gcECBsIRghsCHgIgQiOCKIIwgjhCPMI/wgLCRkJJwk7CU0JZgmDCaAJuwnmCe4JswlMCScJ8AjTCKQIiwh0CGIIVAhMCF8IeAiUCLEIuAi4CMYIyQjJCMoIxgjMCK0Ikwh9CGYIUQhCCDsIPAglCBQIDwgLCAgIAggACP8H/wcKCOEHwwe8B6EHjwdrB0wHOQcVB/sG2ga5BpwGfgZoBlUGQwYnBggG+AXuBegF4QXdBfQFDAYxBlwGegaYBrQG1Qb/BhsHOQdWB3AHhwefB7sH2gf9BxsIOAhSCGEIeQiPCJwIrQjECOII/AgcCToJaAmCCYQJmwm4CdAJ5gn8CRAKJQo6ClEKZgp5CosKmgqeCiEKBwrFCasJeAlKCS4JEgn0CNsI0QjPCFkGXgZrBn0Gnga5BuQGFQdGB3IHfAePB70Hwge9B9QH9gcfCFAIcwiSCLcI4QgJCTAJVQlqCXwJjQmkCbUJygnsCQ0KEQqjCYMJVgk8CREJzQiuCIsIeQhrCGMIYwh8CJcIswi5CL4IyAjSCNcI2AjgCO0I3QjECK0IjwhyCGAIUwhMCDsILQglCB0IFQgRCBYIFQgbCO4H1ge8B7IHnAeLB3UHXAc5BxwHAQffBrkGogaCBmYGRgYxBhsGCAb8BfkF8QX8BRIGIAY9BlwGfAahBrgG1wYBByUHPQdXB3QHkAesB8UH6QcMCCsISAhrCIcIogjBCNAI3wjuCP4IHAkzCU0JYQlwCXoJjQmrCcsJ3QnpCfgJ/wkDCgoKEwofCi8KRgpiCnkKhApYCu8JsQmZCXUJRgkqCQ4J/QjvCOsIXAZeBmIGbwaABpIGqgbGBuIG/AYhB0UHbweeB70H2wceCDcIXQiICKkIvgjICM8I7ggWCUYJegmoCc4J8An+CRcKOAr6CfsJ4gnBCZQJZQkHCdMItQicCIUIcwhqCH0IkgivCL8IxwjMCNQI2wjjCOoIBAkRCecIyAiuCJoIiQh5CGoIXAhQCEIINQgoCC0ILAgtCAkI7QfXB8YHrgedB4gHdAdUBzAHFQf8BuYG3wbGBqMGkwZ0BlIGNgYlBikGNQY6BkEGSgZpBnUGjQaqBsQG0QbsBhQHPwdkB4gHqgfLB+gHAQgcCDcIUQhtCIgIowi4CNgI9ggXCTcJUAlYCXYJiAmVCaIJoAmmCacJogmqCbAJuAm+CcgJ1QneCeUJ8An9CRIKJQpOCmEKHgoSCrcJjQlpCUwJMwkjCSUJLAlgBmQGagZxBn4GjgafBrAGvQbSBukGBgcqB0oHbweEB7EH4QcICDwIZwiPCLwI3wj/CCcJUAl4CYsJjwmjCbsJ2wkDCi0KRwoiCvcJtgk+CREJ6AjICKoIkQh/CHMIgAiUCKkIvQjJCNQI2gjkCOgI+QgZCfkI2QjHCLAIqQiXCIEIdAhpCF8IUAhPCE4ISQg6CCkIFwgACO0H0wezB58Hjwd/B08HLgcfBw4HFwf4BuMG4Aa4BpIGZwZfBlUGSwZKBlAGWgZiBnAGgAaUBq8G0QbbBvgGHwdRB3wHpwfVB/QHCQgdCDAIQQhUCGgIhQicCKsIxQjkCAsJGwkQCQwJFgkiCTAJQQlMCVUJXQllCXUJeQl/CYkJkwmgCakJtQnFCdQJ4wn6CRgKOApXCiEKywmnCYoJbQlWCU8JTQlTCXoGbQZoBnEGeAaCBo0GmgaqBrkGxAbpBhsHOAd6B7MH6AcNCC4IUQhvCIoIpgi5CNEI9AgRCSAJOAlpCZEJtwndCeQJ+QkYCjEK3QmWCVAJLQnwCMwIrwidCIwIgAh/CI0InwizCMUIzgjcCOgI9AgOCRkJFwn8CN0Ixwi4CKYIoQiTCIMIbwhiCGAIaAhhCEMIOQgmCA0I7QfOB7UHpweXB34HZQdHBzoHMAcbBwYH9Qb3Bu4GtwaaBn8GcQZzBm8GeAZ7BncGiAaQBpwGtwbXBvUGEAc5B3EHmQe5B9gH9wcRCCEINAhICEoITwhdCG8IeAiKCJ4Irwi9CMoI2gjoCPYI/wgJCRUJIgkyCT8JVAljCXEJggmSCaEJrQm6CcgJ2QnjCe0J+QkKCicKSQoFCt0JqQmUCYEJeQl5CX8JpQaPBn0GdAZxBnUGfAaGBpEGmwamBrsG3gYEBycHTgdmB4AHqAfMB+cHCAgzCH0IogjDCOYI+wgKCSkJRQljCYMJjAmsCdIJ+QnaCZwJYgksCQsJ3wjKCK8ImwiLCIIIhgiSCKcItwjHCNEI3gjsCP0IDAkcCTMJKwkNCfwIzAivCKwIoQiFCHsIeghzCFcIOQggCAUI7wfeB9EHuwehB4kHhQdxB2IHYQdaBzoHPwckBx4HFgfpBsMGqAawBr4GvQanBpkGkQaZBq4GtwbNBu0GAwcWBz8HdweiB74H2AfsBwMIEgggCC8IPghJCFcIZwh3CJIIoAirCLwIygjYCOgI+QgICRgJHwkvCTwJTAleCW8JewmLCZ4JsAm9CccJ0wnhCfIJ/wkJChMKIgorCj0KBQr4CeAJtgm0CbMJswnTBrQGogaVBoYGfQZ7Bn8GiAaWBqgGvAbRBuoGAQcVBzsHZAePB54HvgfwBxMIFAgyCFsIhQiqCM4I7ggJCSYJQgleCYEJpwnLCcsJpQltCUsJGwkACesIxgiuCJoIkAiUCJwIqAi2CMwI1gjcCOYI8gj4CAIJGwk+CRMJ7AjWCMoIygjHCK8IkwhnCE4IPggtCBgICgj0B9QHwAe0B60HngeUB4oHgQdzB2kHZQd1B4EHWwdSByUH5AbVBucG6gbaBsUGrgafBqkGtwbEBtkG8gYQBygHSAdsB4kHngexB8cH3wf0BwcIHAgvCEMIUghiCG0IfwiOCJ0IrwjCCNQI5AjxCAQJGAkqCTkJSwlXCWcJcwmECZkJogmpCbMJwAngCfwJGgowCkcKMAozCkcKVwpfCmAKZQoXCiAK8gnxCQEH5AbNBrEGmwaOBoQGgAaGBo8GnQasBrwGzgbjBvoGEQcuB04HbQeMB68H3AcECCkITAhwCJkIwQjgCP4IGwk5CVUJbwmOCasJxwmeCXcJXQk7CSAJFgn6CNEIuwiwCLQIugi6CMUIzAjUCN0I5gjyCPwIEwkdCTEJKgkMCQEJ5wi+CKQIhwhvCFcIQwg0CB4IEwgHCPcH4wfIB8QHwgeuB5gHlQeQB5UHnQehB6AHlAdLByEHBAfwBvkGBQf+BvcG0gawBqYGrga9Bs0G5AYJBykHPQdTB24HigenB8UH4gf4BwYIFAgoCDkIRghXCHMIiAiXCJkIpgi4CMkI1gjlCPEI/ggNCR0JLQk9CUgJTQlWCW0JeAmECZQJrwnLCfAJFAovClIKWQpUClMKZgpzCngKeAp4ClkKSQpaCkkKKQcPB/QGzAa4BqIGlwaLBocGjAaWBqMGsQbABs0GAAcnB0UHZAeZB8gH4wcMCDEIRwhSCFwIbQiLCKUIwwjhCP4IIAlGCWoJiwmgCaYJfwlrCWAJSAk5CRwJ+wjnCNUI3AjeCNkI3QjcCOAI6gj2CAQJCQkHCe4I1gjPCL8IsQihCIoIeQhqCF0IVwhLCDMIJwgUCAAI9Qf5B+oH3wfLB88Hvwe3B7YHqgeZB4kHcAc7BxYHAQf3BvYG+wb7BvUG8QbXBrMGwgbIBtMG5wYEByQHQQdWB2sHgAeYB7UH1Af2BwkIGAgqCD8IVghqCHcIhQieCKUIsgi+CNEI2wjoCPcI/AgKCRYJIgkvCTwJRQlJCVIJYwlxCYwJqgnSCe8JEQolCjMKTQpfCmcKagpsCngKfAqHCpgKpwq7Cr4KqwpoB0MHGQcPB+gG1ga9BqwGmgaOBpMGmgagBqgGvQbRBgcHNwdiB4wHsQfOB8wH0Qf5BxwIPghjCIYIqAjNCOgI9ggFCRoJNQlXCXoJlAmeCZEJcQlXCT8JJQkLCfgI+gjwCOwI7QjuCPMIAwkLCRMJEAn0COEI0wi+CK4IpwidCIwIgQh8CHUIZQhRCEYIMQgqCCIIHggVCAcI7wfuB/IH5gfcB8wHrgefB40HcgdJByEHDQcBB/8GBAcAB/AG4AbdBtQG4wbrBu8G6gb9BiEHPgdSB2cHfAeSB7EHzwfoBwIIHAg0CEkIZQh7CI0IkgicCKkIvAjECMsI1gjpCPcIAwkICQ4JFwkjCS4JOAlECVMJYwl1CX8JjAmmCb0J1AnsCQYKIwpACl8KewqJCocKiwqWCqkKuArKCuAK/wojC5IHbQdvBzoHJgcLB+4G1QazBp4GlwaYBpsGoAavBsMG2gb4BhQHPAdtB5UHxAfkBwIIHwhBCGQIbQh/CIYIpQi+CNoIAwkiCSwJMAk8CTQJRAlRCVwJTQk1CRwJFwkbCRIJBgkJCQ0JEQkTCRgJHgkVCfQI3wjICL4ItwisCJsIhgiCCIEIeAheCEwISAg+CDYIKggdCA4ICQgECPgH7gfnB8oHuAewB7UHpgeIB3QHUQc3BxcHAAfwBuEG3AbXBtQG2wbiBu4G9wYDBxkHNwdNB1gHcQeQB7MHzAfrBwUIHgg6CFYIZAh8CIgIjQiaCKQIrQjACM8I2QjkCPAI9gj+CAYJEQkeCSwJOQlICVcJYwluCX0JjQmeCa4JwwnbCfsJEwosCkwKcAqOCqQKswrBCs0K2wrpCvMKBQsmC0YL3AeqB5IHfwdSB0IHNAf/BtQGwgawBqMGoQaiBqYGrAa2BtwGCgctB0IHYAeHB6wHuwfQB+kH+AcJCC8IbQiaCMAI1gjGCMUIzwjWCNoI5wjyCPgIBgkYCSMJOwkwCSsJIgkgCRoJHQkgCSMJJwkkCQQJ6QjZCMgIwAi/CLMImAiSCI0IhQh4CGUIWQhJCD4INQgsCCMIIQgfCBEI+QftB9kHwQe2B7YHvQfHB8IHrgepB4AHUAcIB/IG6gbnBuUG7gbuBvYGBQcaBzgHSQdiB20HhweiB8IH5QcACBkILQhICF0IcAh2CIcImgisCLAIvwjFCNMI4QjsCPoIDwkUCQ4JGgkhCSkJNwlFCVQJYwl1CYUJkwmjCbQJxQnXCe8JCAolCkEKXwp/Cp4KugrPCuEK8goFCxILJgs9C1cLTAsKCPYHvQerB54Hkgc/BxoHAgfoBs8GtQanBqkGqwavBrYGwwbPBvEGEActBzcHVweIB6QHxQfqBxIIQgheCF4IcAh9CHsIgQiHCJMIoQiqCLkIwAjKCNYI5QjzCBAJKgkmCSIJIAklCSoJMAkwCSUJGAkRCQUJ6QjcCNMIzQi7CKYIowihCJIIgQhyCFUIRQg+CDoINAgzCCEIEwgPCA0I9wfaB8EHtgetB6MHowerB64HQwcYBx0HDQcLB/0GBQcJBxYHJAc0B1UHZgeAB5UHqgfJB+oHDAgfCEgIXAhvCIYIlQisCLgIvwjECMsI2AjfCOMI9wj8CP4ICAkoCSwJNAk9CUAJRAlSCV4JcAmBCY8JogmzCcQJ1QnqCf4JEgosCksKYwqBCqMKwgrfCvgKDwsjCzwLVQtMCz8LLgseCzcIFQgJCAcIxgd9B1kHTgcuBxIH8gbeBsgGvQa8BrkGvAbGBtUG5Qb0Bg4HMgdXB4UHrQe0B8UH4Af8BwsIHwgnCDYIRAhRCGEIfQiSCJgIpQiyCMAIywjYCOoI9wj/CBQJIwktCTMJPQlJCUQJQAk+CS0JKgklCRsJ7QjKCL8IvAi4CKUIpAiWCH8IaQhZCFUITQhCCDEIJwgdCPQH3AfHB7QHpQeeB54HmwegB4oHlgevB48HgAdNBzsHOQc9Bz4HRgdRB24HhwedB70H3gfxBwwIMAg4CF4IigiqCMgIzgjqCPkICQkxCSAJFgkTCREJFAkdCS0JNQk9CU4JUglYCWYJegmACYgJjAmZCa0JvgnLCd0J7Qn+CREKIwo7ClUKcQqOCqwKywroCggLJAtBC0sLMwsoCyoLEQsJCwsLeghnCDsI6Ae7B6QHmAeRB1YHMQcYB/8G4QbYBtQGzQbGBsUGzgbVBtsG9AYMBygHXAd5B4QHmQeqB8EHzwfgB/8HIgg7CEoIWghvCIoIqAjJCOcI/QgFCQcJDwkWCRcJJwk6CUgJUwlmCV8JVAlPCVEJRQk0CQ0J9AjiCNYI1wjuCOMIzQi9CK0IkwhuCF0ISgg4CBcI/gfoB9MHvQeuB6YHoAeeB5EHjwedB7AHxgfaB9AHwgeRB3UHZAduB3MHcwd3B4AHlgesB8YH5wcLCDUIUghiCHQIjAiiCMcI7AgQCSUJMQkzCUIJWAlqCXgJfwltCWQJYAlnCXgJjQmfCaEJpgm1CcMJ0wnXCeQJ8gn8CQgKHwotCjEKPwpSCmoKhgqhCrkK2gr9ChsLLws6CywLIwsUCwsLBAsCCwEL/gqJCE4IJggCCPIH9QfCB5sHeAdfB1AHIgcEB/UG6AbYBtAG0wbPBtEG1wbhBvMGBAcgBzgHSwdoB5IHsAfKB+AH8wcUCDYIUwhrCIAInAipCL8I5QgNCRkJLQlECT4JSwldCWYJcwl2CXYJawlhCVcJRQksCR8JIAkcCRYJEAkOCR0J9gjUCLwIkwhyCE0INQgVCPgH4QfOB74HswevB7IHpQegB5gHpQfBB90H7gfyB/EH0wfHB98H1we0B6kHqweoB7wHxgfaB+8HBwgfCDUITghsCIUIkQiaCKkIugjMCOAI+QgDCQ0JGQkkCTIJSAlYCWQJdQmECZgJrAm+CdEJ6Qn5CfwJ+gkLCh4KLgo8Ck8KXQpmCnYKcgp5CowKpQq8CtoK9AoaCzULPwsuCykLLAsTCwoLBAv5CukK3ArVCo4IaghMCDcIKwgGCMYHlQdyB1YHPgc2BzUHPAczBw8H9gbqBuwG7gbuBu4G6wbzBg4HLAdNB3IHmQe+B/AHHAg0CEEIUwhtCJQIqwi0CMQI1wjtCA4JOAlQCVoJUQldCXYJgQmICYcJiwl+CXEJcAlqCVoJWwlgCWQJcwlJCRkJ8QjQCKwIkAhvCE4IMggUCPQH3gfKB8AHtweyB7EHsAeoB6MHswfHB98H9gcLCA4ICAjzBwQIDQgRCA0IDwjyB+YH9AcACA4IKgg9CEkIWwhpCG8IgAiTCK8ItwjJCNsI7wgACREJGgkkCTIJQwlOCVUJXgloCWsJcwl4CYUJngm4CdMJ7QkPCjEKSApeCnQKiQqfCq4KuwrFCsQKzgrdCvkKGAs1C1QLagtMCzkLNgsyCw4L/wr0CuoK3wrUCsoKsgiXCHUIOAgPCOQHugedB4MHhQeQB48HkQd1B1MHOAcoBxYHDQcKBwcHBQcCB/kGFgc+B2kHlQe6B9gH9wcSCCwIRwhbCHIIhQiWCKkIvwjNCNkI5Qj1CAQJFAkzCUsJagl6CYYJiQmZCZoJmAmaCY0JiQmFCYQJhglUCSoJAwnVCLAIkwhyCFMILggUCP0H5AfQB8sHxwfFB8YHzAe3B7EHvgfPB+MH/QchCDEIOQg0CDAILwg7CEIIQwhICEUILAggCCgIRAhRCFgIWgheCGEIcAiDCKUIvgjQCN8I7wj/CA8JGwkrCT8JPwlHCVUJYwlwCXQJdwmACYcJkQmhCbgJ0QnrCQgKKwpQCnMKmAqzCsIK2ArkCusK9woGCxgLMQtPC3ILowtyC1oLSQs6CyoLGQsJC/oK7QrfCtIKxAqVCG0ITAgsCA4I4gfHB8kH1wfOB8QHuQeuB5MHhgeDB1sHRgc6ByoHIQcdBxgHEwcJByIHTAd9B5YHuwfpBwQIEwgrCEUIXghsCHUIgQiQCKIIsgjCCNkI6gj9CA4JJAk9CVAJaQmKCZ0JowmlCa0JvwnACbIJjAlnCUMJJwn8CMUIpwiSCGkIQgggCAcI7QfhB90H2gfTB9AH0AfKB8UH0wfqBwcIJggvCEEITQhVCEQIQwg+CDwISQhRCFUIWAhaCFEIUAhYCF4IYQhkCGUIbwiKCJ0IuQjTCOYI8gj5CAgJFAkWCSAJPglPCU4JVAleCWYJbQl2CYAJjQmcCa8JxAnbCfMJDwovClMKggqmCscK4Ar9ChkLJAs8C1cLcguMC78L4gu9C4YLVwtGCzsLMQslCxYLCAv5CuwK3wrVCoQIaAhHCCoIEQgCCAUIBggFCPgH8AfrB+EH5AfIB68HnAeAB3MHTQc/BzkHLwcpByAHJAc4B0wHageNB7QHzgfhB/sHGQg6CFwIfwidCLIIxQjVCOkIBAkWCSYJOQlRCWcJhQmKCZQJoQmtCbIJvQnMCacJjQloCToJ+wjmCMsIsAiRCGsITQgxCBUIBwj9B/YH8QcBCPwH9wcCCO4H8wcLCCUIPAhVCFwIXwhxCGwIbAhnCFoITQhICEoIUAhWCGEIbghzCHEIaQh0CHMIbwh5CI4IsAjNCNYI3AjgCOwI+AgECQ8JHQk6CUYJRwlMCVUJXwlsCXgJiAmbCa4JxQncCfQJDAoqCkUKYQqWCrkK4QoWC0ULdwujC9kL7gvnC9sL1QvVC8ALoAt6C2ILUQtHCzsLLgshCxMLCAsACwMLiwh5CGUIUwhFCDoIRAhDCEoISghGCEYIOgg4CA8I2gfeB8cHmAd8B2QHWgdHBz4HNgcyBy0HNgdUB3cHogfLB+oHCggsCFMIcwiYCMYI1wjsCAAJGAkqCTwJUwltCYcJnAm1CbYJrQm2Cb0Jxgm+CZIJZgk8CSUJCQnaCMIIrwiYCIIIYQg+CCwIJggeCBYIFwgSCC0IOAhRCEwIUwhLCD4IVAhjCGwIfAiJCJYIngihCJYIgghnCEoISwhMCFEIWQhoCH8IjQiNCH4Iewh6CHwIhAiXCLEIxgjVCOgI8Aj4CAIJEAkmCTUJQAlHCU0JXQlmCXQJhQmZCa0JwgnZCfIJDAonCkQKYAqECqYKzArrChILWgu6C/cL7AvdC90L4gvkC+gL4wvdC8kLlAuDC3ULZQtXC0oLPgs6CyILEQutCJ8IkQiBCHYIdwh/CIEIkgibCI4IowhvCEYIOggUCPkH5ge4B54HiAduB1wHSwdJB0YHQQc9B0cHWweAB6UH0Af8ByIIQQhhCIQIjwijCL8I1gjgCPEIAwkcCTcJWgmfCcYJ1QnNCcsJywmpCXwJXgk4CQ4J+AjgCMkIrAiSCIMIeAhnCFwISQhKCDwIOQg0CCcIOAhACEUITwhZCGcIbQh6CIsIoAilCK0IvgjCCL0IuAi1CJsIawhcCF4IWQhhCGwIfgiGCJAIkQiVCIoIiwiMCJQInginCLkIzAjcCOoI9wgECRUJJgk2CUUJVAlkCXEJhQmXCawJwQnaCfUJDwopCkYKXwqICrQK2Ar4ChYLOwuDC80LAwwADAAMAAz/C/8L/gv7C/sL4AvJC7gLpguVC4YLeAtoC1cLSAtBC+AI2AjVCNQIwQi7CKMImAiUCKgIyQi1CLgIugh1CDgICQjxB9wH0ge3B5UHdAdjB2EHWwdVB0wHVAdjB3cHkAewB84H9QcTCDUIXQh9CJoItAjSCN8I6gj1CAIJGgk3CVYJgAmpCcsJwgmkCXwJSwkrCRIJ/QjnCNQI0wjJCMQIrwidCJIIgwh2CGsIXghZCFUIRgg/CEcITQhUCGIIdAiOCJwIrAi2CL8IxwjYCNUI3wjbCNoIzQijCIkIcwhrCGYIbgh+CI0InAihCKUIpQiSCJEImQiiCLAIwAjOCNwI7Aj9CA8JIQkzCUEJUQlfCWwJegmSCakJxAneCfcJEwovCkwKcwqqCs0K7AoSCy0LVQuDC9gL+gsRDBgMHAwgDB0MGwwZDBUMDwwFDPcL5wvVC8MLsQudC4kLdQtiC1ELJwkiCSUJBgkTCfcI3QjKCMUIzwj2CBkJxAiHCGMISgg/CDwILAgTCO4HuweZB4QHewdvB2QHXAdeB2MHdAeVB7sH5QcOCCoITAh+CJ0ItAjNCOcIAwkLCQUJFQkrCUwJcAmVCbMJpAmHCWAJPwkkCQ0J/gj8CPcI6AjoCPQI8gjmCNIIwwi7CKUImgiGCHwIbwhgCFUIUQhYCGUIdQiFCJ0ItQi3CL4IzwjaCOoI+ggECfoI8QjqCNgIvQiZCIIIbwhxCHQIdwiDCI8IlgiZCJ8IpAiqCLkIzQjjCPYIBQkQCRwJLglFCVcJaAlzCXsJjwmYCawJxQnoCQcKKQpeCoAKpQrMCuMKBQtCC2kLjwu1C9cLAQwQDB0MLAw3DDoMOQw3DDUMMgwqDB8MEwwFDPQL4gvPC7kLowuNC3oLZgtoCW4JWAlQCUIJNgkrCREJDAkdCTUJ5wjQCLcIogiICHYIWwgnCAII4wfVB8IHoAeQB4EHcgdrB2wHcQd7B4oHqwfcBwYIMghhCIoIrgjNCPAIDQklCTkJRwlZCXUJjQmrCZ4JgAllCU8JPwkwCR4JBAnxCOwI5wjjCOcI9wjvCOMI2AjVCNYIzwi7CK0IoQiHCHcIaghoCGoIbwh+CJcIqwjJCNUIzAjYCOgI/AgGCQsJEQkNCfcI9AjoCNUIuwiGCH4IgQiFCIkIiwiOCJQIrAjNCNkI4gj+CB0JMwlDCVEJXwlsCXQJfgmMCZkJpwmtCbMJ0gnyCQcKEQooCkcKawqICrwK9wo1C0gLZguIC68L5AvyCwYMGwwlDDMMQAxIDEsMRgxBDDsMMgwnDBsMCwz6C+ULzgu1C50LjAt6CywJNglHCVoJXglcCWQJVQlhCVYJOgkpCSAJ+wjRCJ4IiAh4CFgIMggmCPUH6AfVB8EHrQePB4EHfQd+B4UHkAefB7wH6gcQCCkIQQhhCIQIrAjCCOUI+ggUCTEJWwmJCZAJcAlbCUsJSglPCU8JOgkOCQwJBgn2CPII8Qj1CO4I6gjzCPAI7QjrCN0I0gi4CKEImAiXCJ0IoAikCKAIpAixCMAI3Qj4CO0I8wgBCRQJKgk0CSkJJAkgCRYJDQn8CM0IkgiTCJcInQiiCKMIvwjfCPAI/ggQCSkJOglJCU0JUglcCWoJfgmNCZkJpAm0CcsJ1QniCfAJ/gkNCh8KOQpQCooKyArpCgQLMwtZC4ULsQvbC+wL/wsNDBcMJQw0DEEMTAxLDEoMRgw/DDUMKAwZDAcM8gvaC78LpAuMC3oL4wgBCQYJFgkZCSQJLAk9CU0JVglmCV4JOgkHCfcI4AjLCKAIiAhTCEoITggpCBgIBgjZB70HpweWB5AHkweYB6IHswfKB+YHAAgdCDYIWAiNCLUI2gj5CA8JMwlcCYIJhQlnCWUJbgmOCasJsAlvCUgJNwk6CTsJLgkgCR0JDgkRCSUJLQkwCS8JGwnnCMgIxAjFCMgI1wjbCNYI0wjQCNcI4AjoCPwIHAkTCRoJPQlPCVYJSwlICUQJOgklCRcJBQnBCKoIsAi3CLsIwAjHCNgI6wgJCSgJPwlPCVgJVwlfCWcJdgmCCZAJoAmvCcIJ3An5CQMKAwoFChMKIwozClAKawqUCsIK4woXC0oLdAuYC64LxwvcC+0L+QsUDDIMRQxSDFoMXAxXDE4MQAwxDCMMGQwFDOQLvgufC4MLbgurCLwIxgjUCOAI7Qj5CP0ICAkXCSgJOgksCQkJ6gjMCLQIpwibCJkImQiZCHoISQg7CAII6AfJB68HpAelB6gHrge1B9EH9QcoCEIIVwhzCIIIrQjTCPoINglsCXgJhAmSCYcJggmMCZgJpAmrCXwJZglpCX4JhgltCWAJXAltCXwJfgl9CYIJcQkbCQ0J9Qj4CPII8wjzCPwIBgkKCQsJDAkVCRIJHAkuCUQJRwlUCV4JagltCWwJbQlaCUcJLgkbCQkJ5wjMCNYI2QjdCOII5AjsCAYJLwlMCVkJZQlyCXsJlAmfCa8JugnGCc4J1gnoCQMKJQosCi8KNQo8CksKVwprCpkKzgrzCiELQQtSC2oLnQunC7QLxgvjCwYMOgxuDHoMegxxDGMMNAwTDAoM3gvEC7YLugvFC5ELcAtcC3oIiAiXCKQIqwi1CMAIygjbCOUI9QgLCQEJ+AjhCMsIvQjACMkIzAjJCMQIwAiRCFIISQgKCOcH0Ae9B7wHuwfAB8kH5AcLCDsIYAiHCKEIvgjKCNII5wgACRwJOglYCX0JqgmnCbkJygm6CakJhQl2CYIJpAnZCd4JtQmuCbAJwAn7CRAKiQlPCTMJHAkmCScJHwkZCSEJIgkjCSUJKAkkCSwJOQlCCUkJWQlyCXAJfAmUCZwJlQmUCXwJZQlRCTUJMwkxCSYJ/wgACfsIBQkKCQ8JIglACXQJhAmXCakJuwnNCdsJ6AnxCfMJ+wkCChsKMwpIClAKZApnCm4KfAqOCpwKsgrMCuIKBQspC0ULXQtwC4ULnQu4C9cLFQw6DI0MmQyQDHMMVgwhDMkLtQt9C2kLZQtsC3MLdwt8C38LYghxCHwIhgiTCJ8IrAi4CMoI2AjrCAEJDwkJCQEJ+gj4CPsIAQkFCf8I/QjYCKkIcQhLCCcIDQj2B+EH1QfSB9wH8Af2BxQIQghgCIMIqAjKCOII7ggACQ4JIwk1CUsJZgmICakJyAnECcAJtAmZCZMJlQmtCeIJCQogCiUKKwo9CmAKnQlyCVEJOQk/CUsJTwk8CUAJQwlGCUcJRwlDCUEJUQlbCWQJaAlzCYkJpAmrCbMJtwnECb0JpQmPCYIJcAlYCVQJSQk9CSUJIQkqCSsJOAlJCWEJpQnGCdIJ6wn8CQQKEgoiCjAKRApFCj4KUgpwCpEKnAqNCqUKuwrTCuYK8grwCvkKEAsrC0ELVwtvC4gLnwu1C8gL6AsbDFIMhAxwDE0MLQwNDPELyQuAC1kLRAs1Cy0LKQskCzALRwtaCGsIfQiPCKYItgjECNwI9AgLCSIJMQkvCTYJMQkxCTMJNgkzCT0JIAnpCLUIlgh9CGkIUAg0CBUICAjxB/sHCAgYCDAITQhWCHwIowixCM0I9wgQCSgJPglPCVoJZgl6CZcJsQnVCfAJ5gnhCdUJyQnECdQJ5Qn/CQoKGgoyClgKEAqDCWgJXQlfCWcJeQltCWsJbQlzCXcJbQlpCWoJbwl1CYMJjQmWCawJrgm+CdIJ4wnsCegJ4gnQCcEJqgmTCYQJcwl4CWYJVQlPCVcJVglpCYIJ1AkNChsKKAozCj4KSgpcCmsKdwqICpQKoAqlCqEKtgrMCtoK7Ar4CgMLBwsPCxoLMQtJC1gLaAt6C40Logu1C8oL5QsODEsMTgxHDDEMDAzvC8sLmgt6C0ILKgsfCw4LBQv+CgQLBwsHC1kIbwiECJ0IuQjNCN8I8wgMCR0JJAkyCT0JSQlOCVAJTQlNCUkJUAkbCesIugieCIQIbwhlCGIIRAgpCBQIFggfCDEIRQhkCH4ImgipCMcI3gjwCAcJNwlXCXQJhwmcCa0JvAnWCfAJFAobChYKCAoBCgEKBAoJChcKJQooCjQKEQqmCZgJlwmOCZMJnQmuCaEJoQmhCZsJnQmbCZYJjwmRCZ8Jqwm+CcgJ0QnXCeQJ6gn2Cf8JFAoPCvcJ4AnNCcAJqwmdCZwJfwlzCXgJgQmFCZQJvAn3CQkKGAomCjYKRQpTCmIKdgqECowKmgqmCrUKvwrUCuMK8AoDCxcLHwshCyMLLgtFC1wLdAuQC7ALvQuiC6oLtQvQC+cL/QsYDA0M4wvBC5wLgAtoC1YLOgsiCw8L/Ar1Cu4K5wrnCugKOAhRCG0IkAi0CNgI5wj1CAsJJAk0CT8JRglJCUQJRglDCUMJSQk/CRYJ4wi+CKEIjgiHCIYIhwhuCFQINwg4CD0IQwhNCGsInwjJCOII+Aj5CAAJDQklCUMJbwmZCckJ6An5CQ0KIAo4CkwKUwpSCkkKOwo1CjUKNgo/CjcKOQrHCbcJrwm9CcAJzAnDCcoJ1wnUCccJzwnRCdAJ0gnUCcwJxAnKCdcJ5AnoCe0J9wn9CQUKDAoQCg0KCgr/CfMJ8AnhCcsJvQmkCZcJowmnCbQJzgnyCQwKHgoqCjQKPwpHCk4KYgp5CosKmQqmCrYKwwrRCuQK9QoDCxALHAsqCz8LSwthC24LhQtXC0ILOwtMC1cLaAt/C5ALoQu9C80L3QvCC6wLjAtzC18LTAsxCxQL9wriCtsK0wrUCtMK0gpeCH0IjQinCMEI0gjmCPsIEAksCVEJZgl1CYUJbwlrCWYJXgllCWcJRwnoCMwIuQivCLMIuQi2CKIIfAhjCFsIYAhlCHEIhgi9COwIEQkrCTsJOwlBCU0JUglfCX8JpwniCRQKPgpbCnAKhgqVCpAKhAp1CmoKZApbClUKUwoiCtsJ0wnXCeIJ7QnsCeoJ6gnsCf0J/wn5CfYJ/wkDCvUJ7QnsCfMJ/AkBCgYKCQoSChsKJAorCjAKKgodCicKLQolCg8K/gnoCdIJvQm9CcoJ2wn3CQQKHgooCjQKRQpIClwKZAp5CocKlwqpCrUKxQrTCtsK7wr+CgwLFQshCyULMwtNC2ALcgtGCwUL+Ar5CgQLFwspCz8LUgtpC3cLhguRC6ELsQueC1ILOgsjCxsLAwvuCskKvgrBCsUKzArLCmYIfQihCLoIzQjjCP4IFgkvCUoJZgmKCbEJxQmpCZwJlQmYCaMJbAklCQYJ6gjbCOAI4QjkCOgI4wjFCKIIjgiHCI0IkwioCNQIBwknCTYJTwlwCYQJjAmUCZoJnwmtCcQJ3wkKCjQKbwqjCsYK1QrICrcKpwqYCpsKlQpsCgoK7wn1CQcKEAoVChcKFQoRChMKFgoaChoKHQojCikKMAorChQKHwocCiEKIwolCicKKwooCikKLAo1CkAKSApDCjkKNwovCiQK/gniCdoJ4QnoCfsJBQoRCi0KSApYClgKXgpmCnoKhwqZCqsKuQrKCt0K6Ar7CgwLGwsoCzMLOwtJC2ILUgsFC+cK1ArNCtkK0griCvgKCwsaCycLMAs7C0wLagtzC2YLLwsXCwIL7wrmCtQKxAq1CrAKtwq5CqgKfwiXCLMIzAjtCA8JMglTCXoJpAm1CccJ5wkACv8JzgnOCdMJ3wlgCT8JJgkOCQAJCAkaCSkJOQk7CR8J3gjGCLcItgi/CMkI5AgHCUQJVglqCYEJnAmtCboJxwnOCdgJ5An0CRIKLgpVCpwKygr1ChgLCAvyCgcL4AqLCjcKGwoeCikKMgo8CkYKRQpFCkAKNwozCjAKMQozCjoKRQpMClAKUgpFCjkKQwpFCkQKQwo/Cj8KQgpFCkwKVgpcCmAKWgpdClUKTQo0ChIKBQoRChIKEQoeCg8KIQotCj8KTwpdCnEKhAqZCqUKrwrHCuoK9woACw4LHQsiCyoLOAtPC3ALXgsnC+IKwAqxCqwKugq0CrUKxArSCtwK5grwCvwKBwsaCyELOwsiCwAL4wrRCssKwQq3CqkKlgqZCowKeAqNCL8I4gjvCAkJKAlCCVwJbAl/CZcJsQnACccJxwnXCfgJHQrmCY8JZwlGCTIJNQlGCVgJZQlzCXcJXgk5CQ8J9QjoCO8I9AgGCSwJewmeCbAJvgnHCdIJ3gnzCQoKDAoWCiIKLQpBCmkKlArMCvwKKAtQCzIL0Qp7CmIKVQpTClwKaQpzCn4KeApxCmsKYwpaCkoKSQpMClkKaQp2Cn0KggqCCn4KcgptCmoKbgpnCmgKYwphCmQKaApqCnIKfQqDCoAKfQp4CmAKQAopCioKMAowCiIKIAokCjIKQApMCl4KcgqHCpAKngqqCsIK2QryCgALDQsUCyALNwtUC00LLgshC+AKqQqVCpYKjQqJCokKiwqPCpYKpAqwCrkKvwrICtIK3gr7CgML/wraCroKoQqOCnwKdgprCmQKZgpgCpsIugjXCPQIBAkNCRgJMwlCCVwJcQl/CYUJkQmSCaEJwQngCcMJnQl9CWkJZQlyCX0JkQmcCaIJpgmUCYAJWQldCScJIwkrCT0JbQm8CdkJ/QkFChAKEAoTChwKMQo6CkAKVgpdCmsKjQrBCu0KFgtEC0QL5gqaCosKhAqBCoEKhQqMCpAKngqjCpEKjgqKCnsKcQprCnIKfAqICo8KlwqaCp8KpQqqCqcKjAqMCpgKkwqNCo8KiAqICo8KlQqaCpgKlAqZCpwKkAp/CmAKUQpQCkIKOQo7CkcKSwpRCmYKagp7CoIKlgqrCr0KzArhCgQLCgsYCyQLNwtZCzsL/wrkCswKrAqMCnEKcAprCnAKbwpzCnQKbgp6CoEKhAqMCpoKoQqiCrIKwArDCsAKpAqNCm4KWgpRClMKWQpGCkkKfwigCLYIzgjfCO4IAQkbCTQJSgldCWgJdgmECZQJqQnBCd0J5AnfCbAJlQmUCaEJsgnFCdsJ4gnpCdoJwwmtCZAJfQl2CYMJhQmrCfEJHApIClYKWApZCl8KdAp5CoQKdQqBCowKrQrcCv0KIgtIC0wL8wq6Cq4KqQqoCqoKrAqvCrMKtgqzCrcKuAquCqsKpAqfCpoKkwqbCqYKrQq0Cr4KxgrICskKxwrFCsYKxgq/CrgKtQqrCqkKrAqwCrIKsgq0CrcKzQrBCqkKiApxCmUKWwpaCl4KZApvCngKgAqJCpQKngqsCsEK1ArpCvcKCAsWCy0LRQtyC08LKAvlCrwKowqQCnsKXgpbClwKUgpICkAKOQpHCk4KVApcCmYKbgp0CngKewqACoAKggp8CmUKVgpPCkwKTwpNCj4KMgqfCKgItQjKCNgI6wj7CAkJCwkMCRcJJgkwCUIJVwlzCY0JmwmhCawJsgnCCc4J2gnlCfsJDwogCioKIgoECvgJxwm9CcwJ3gnjCfwJLgpVCocKmgqwCrgK0QrZCtoK4ArTCrgKvgrSChgLNAtRC3ELGQvgCtAKyArGCsYKygrNCtAK0wrUCtcK1QrWCs8KxwrACr4KuQq5CrwKwArICtQK3QriCuQK4wrfCuEK5groCuIK2QrSCs0KzQrOCtEK1wrdCuUK7Ar0CuEK3Qq3CpoKjgqLCo8KlAqYCpsKnQqlCrUKygrXCuIK7Qr7CgoLGwsvC0ALYguKC20LNwv6CtIKrwqPCnIKWQpCCiwKJgoJCgAK+wnzCfEJBwoyCjoKRwpOClEKUQpVClsKVgpTClkKXQpcCk4KSQpPCj0KJAoVCnIIhwilCMUI3QjjCOoI9Aj7CAYJEAkbCSYJMwk9CUwJaAmFCZwJrwnBCdMJ6QkAChkKMApCClEKWQpgCj0KGwoVChUKJQosCiEKJwpVCpAKwArzCgcLEQskCycLJgswCy0LBAv5CgMLNgtcC3oLbAsbC/cK7ArnCuQK5QrqCu8K8gr0CvUK+Ar5CvgK9QruCucK3wraCtsK3grhCuYK7wr2CvsK/gr/CvoK+wr9CvwK9wryCu4K8Qr7Cg0LJAslCyULKgssCyYLFgsUCxgL0QrKCsgKzwrLCscKygrLCtQK3grpCvIK/AoFCw8LIAsyC1QLdwtuC0ILIwv/Ct8KuQqaCn0KYwpBCg8K7QnTCcIJvwm9CboJtQm/CdoJ/AkgCi0KNwo1CjYKMQoxCkEKTApVCksKPwpDCjoKJgoXCvoJewiQCKsItgi6CMsI1wjpCPUIBgkVCSUJMwlECVsJcglvCYMJjAmXCbEJzAnsCRMKMwpOCmwKgwqWCpkKfQpwCmcKXApeCl0KXAphCm8KiQrDCu8KFws7C1kLawt0C20LSwtCCz0LWAt4C5cLoQtdCyQLDwsFCwMLBAsHCwoLDwsTCxMLGAsbCxsLGwsZCxYLEwsPCwULAgsBCwMLAgsGCwwLDwsPCw8LDgsNCwwLCwsICwkLDgsUCzkLRgtUC1wLYQtkC2YLWgtOC2MLnQt9C2wLOQszCzYLLQsoCxMLDwsRCxcLHwslCycLMQtIC3YLigthCzoLGgv7CuEKxwquCpQKfQpcCkEK8gnJCa4JoAmUCZIJkwmYCaAJtgnICfoJAwoMChcKGwoaCiMKJAo/CmIKcgo8CiAKGAoZCgYK6gljCHkIjAigCLIIwwjRCN8I8Qj8CAcJFwkmCTcJSQlbCWwJdgl7CX4JmAm7CdgJ9gkYCjkKVgpyCowKqQrFCskKwgqxCqIKnAqbCqEKrgq9CuQKJAtLC24LhQuSC6kLsAubC4wLiguvC8kLywubC3gLOgsuCycLJgsnCysLLAssCy4LNAs4CzoLPQs/Cz8LQAtMC0wLNAsqCx8LIAshCyILJAskCyMLIAsdCxsLHAscCx0LIwsuCzwLdAt8C4ALhQuNC5ILmQuLC6AL2AvrC/cLAQyyC5sLrAugC7sLsQuZC4MLbgtpC30LlAuxC40LcAtdC0wLKAsKC+0KzQqzCpwKiAp0ClsKPQoOCrcJngmSCY4JjgmOCZkJoAmxCc0J5gnsCfEJ9gn3CfUJBQokCk4KZQpuCmgKJwoLCv0J8wnpCTwITwhjCHQIiQiiCLoIzQjYCOoI9wgCCQ4JIAkyCUkJZwlwCXYJfAmKCacJwwncCfQJDgonCkIKXgp8CpkKtArOCucK8QrtCuAK5wryCg8LLAtVC3sLogu1C8ML0QvjC+wL8Qv1C/wLCQzpC7ULdAtWC0sLSAtHC0gLSwtKC0sLUAtVC1gLXAthC2ILYwtlC20LbwthC0wLOgsyCzILMQszCzcLNgs1CzYLNAs0CzQLNQs/C0wLYguFC5ULngumC7ALtQvBC8oLwAvaC+4LAQwLDBcMEAwRDBUMDgwaDCUMDQzaC+ILugueC4cLcgtjC1ILRQsgCwsL6wrKCqwKlQp5CmEKTwooCg0KygmwCaAJjgmOCY8JlwmwCcIJxwnOCdYJ1QnTCcsJ0AnpCREKNQpNClIKUwpVCgcK+gnlCc0JCggaCDMIRwhbCGsIewiOCKQIuwjUCOsI/QgLCRwJLwlCCVQJbgl4CYAJmAmwCcUJ2gn0CRMKMApMCmgKhQqgCrsK0wrpCgMLGwswCzkLQQtICzsLRQtFC0cLWQtjC3ALfAucC7kLxgveC+0LzAuRC24LaQtoC2kLawtrC2wLbQtyC3cLeQt7C38LgQuEC4YLiAuMC34LaQtSC0ULRAtEC0QLRwtKC0sLTAtMC0sLSgtQC1kLaguAC5MLowuwC7sLxgvSC+AL9QvzC/ML+QsPDCAMMAxADEYMRgxGDEkMKgwHDNYLuQufC4kLdwteC04LOAsuCw4L8ArVCrkKmwqDCmoKSAooCg0K8wnjCdAJowmSCY0JjQmXCaAJrgmwCbAJowmYCZUJmgmdCasJugnUCfcJGAoxCioKIwruCc0JtQniB+8HDggrCEIIVghpCHkIhgiXCKwIwgjTCOcI/AgMCR4JMQlCCVMJawl5CYoJnwm6CdkJ9wkYCjsKYAp5CpQKqgrBCtoK6groCuYK4wrSCsUKwQrBCr8KxwrSCuAK9QoMCygLSAtjC5MLvwvGC5sLjguJC4cLhguIC4sLjQuPC5ILlAuYC5sLnguhC6MLpQunC6sLmAuDC20LXAtTC1MLUwtYC1oLXAtdC14LXQteC2YLcwuBC5ILoQuvC7kLxgvYC+UL+AsPDBQMFQwfDDYMTAxdDGoMZAxYDDYMCAzsC9QLvguqC5YLfgtoC1kLRQs0CyUL/wroCscKqgqUCoEKXQpHCi4KGAr7CeIJ1QmVCYcJfQl/CYEJhAmHCX4JcwlyCXEJbwlmCWoJfwmOCaAJugnhCfwJ+gnzCd4Jugm6Cb0H2Qf4BxEIKwhBCFEIXQhxCIYImAikCLUIxgjYCO0I/ggLCRgJKQk+CVEJZwl9CZUJsQnOCe8JEQo+CmgKjgqKCncKcQphCmkKYwpSClMKUwpeCm4KewqOCqIKugrVCvIKEAspC0ELXwt8C54LqgunC6ULoQujC6QLowufC6ELpwutC7MLuAu6C70LvwvEC8sL1wuvC5wLiAt2C2gLYwtiC2ULZwtoC2oLbAtuC3MLeAuHC5MLnAuoC7YLxAvSC+EL9wsfDDoMVAxVDF4McAyFDJkMcgxKDCAMAgznC9ELvguvC5QLhQt4C18LSws3CyYLDAvyCtsKwAqlCo4KdgplClMKOAofCgUK7gnICYsJfQlwCWUJXwlSCUwJRAk5CS0JKAksCTAJPglICVYJaAmMCbkJzAnVCc8JuwmdCZIJxAfcB9wH+AcNCBcIJgg7CFMIbAiCCIgIjgigCLQItQjRCOQI8AgDCR4JNglRCXQJkwmuCckJ6wkDChwKIQobCv8J+Qn8CQYKBwoNChkKJwo1CkUKVQplCnkKlQq3CtkK8woPCy8LSQtjC4ELogvFC8wLzAvJC8ULwAu5C7oLwAvGC8sLzgvQC9ML2QvgC+gL8wvwC84LtguhC44LfQtzC3ALbwtwC3MLdgt6C4ALhguNC5ILmAuiC6oLtQvAC9AL6Qv9CwkMFgwrDFcMeQy1DNAMmwxNDCsMDAzwC9gLwQuvC5wLjAt1C2kLWAtCCyMLEAsHC/IK2wrLCrYKmAp3Cl0KRAooChEK+QniCcoJpQlzCVsJTglDCTkJKgkcCQgJ+Aj+CAYJEQkZCR8JLQlBCV0JgwmnCbcJrQmgCYsJcAnQB98H9QcBCAYIDwgjCCsIOQhCCE4IWghiCGwIdgiMCKMIwAjTCOQIDgkyCVQJgQmfCaIJlAmYCZ0JqAm0CbkJyQndCe4JBAoTCiEKKwo2CkQKUQpeCmsKfgqYCrIKzArjCvgKDgsoC0gLdQugC84L8wsADAcMAwzkC90L3gvhC+QL5gvrC/AL9wv+CwQMDQwVDP4L6gvUC7wLpwuVC4QLfAt6C3sLfwuFC4sLkAuVC5oLnwuhC6cLqwu1C8IL0wvnC/sLEAwjDDQMQwxVDHsMnwysDGcMJwwBDOELwwuqC5cLiAt2C2ALVQtMCzwLJQsHC/wK4ArJCrsKqgqVCn0KZApECikKDwr4CdgJvAmgCXsJZglVCUMJNwkpCQsJ5QjaCNEIzwjdCPYIBwkeCTIJUQluCZAJvwmcCYEJdAlbCeQH9wcJCBgIIggdCBUIGAgeCCUIKgguCDYIQAhOCGIIfQiXCLIIzQjiCP0IDgkhCTwJVwlkCXwJkwmjCawJuQnCCdIJ4wnzCQAKEQojCjYKRwpmCnsKkQqhCqsKuQrICuIK9AoJCx8LRQtvC5MLswvOC+0LDwwgDCoMIgwKDAQMBQwJDA4MEwwaDCEMKQw2DCkMHQwMDPIL2QvDC7ALnwuTC5ALjwuOC5QLlguZC5wLoAujC6gLqQurC7ELvwvSC+cL/QsTDCYMOQxMDGAMcQyADJUMpQx7DDUM7Au9C54LhAtvC14LTgs3CzYLLwsdCwAL8ArKCrgKrAqfCo8KfAphCkoKOAodCgQK7QnUCbcJlwl1CV4JUglPCTwJCAniCMYIwAi8CMUI4gj6CAoJHgk0CUsJZwmSCa4JggllCVIJGggfCCYILwgwCDQIMggwCC0ILgg3CDsIPwhHCFwIcwiECJcIqQi8CNEI6Qj8CBUJMglOCWYJfQmECZIJnQmoCb4JzAnUCeIJ8QkDCh4KPgpcCmQKZAptCnoKiAqLCpYKpAq1CsUKzQrhCvUKBQsTCywLSQthC3sLoAsFDCwMNww1DDMMNQw3DDoMPwxJDE8MSww+DC4MGgwADOQLzwu8C64LpwujC6ALnwufC6ALogulC6gLqwutC64Lswu9C88L5wv/CxYMJww5DE8MZAx2DIYMkwyhDKwMagwsDN0LqQuDC2ELQwssCxwLFgsSCwUL9wrkCsMKrgqgCpQKiQp4CmUKUQo9CiEKDAryCdsJxwmzCZkJiwl9CWoJUQkcCdcItwizCLEIrwjJCOII9wgYCSEJKgk7CVkJewmICXwJYglGCFQIUwhQCEkIUAhWCFUITwhHCEEITAhSCFcIbAiGCJwIsgjBCM4I3AjoCPQIBgkiCUAJWAllCXYJhQmWCagJwQnbCeMJ9AkIChoKKAo1CkUKSQpKClEKYApzCn4KiAqSCp4Kqgq1CsEK0AreCusK/QoRCyYLOQtYC4ELngu8C/MLNwxpDGUMaQxtDHAMcQxpDF0MTwxCDB0M/QvnC9ULxgu5C7ILrgusC6sLrAutC68LsQuzC7QLtgu6C8ELzwv8CwIMEQweDDIMSQxeDHMMgwyQDJ0MlgxsDBoM4AvWC8YLoAtbCzILFQv8CvMK6graCskKuAqsCqYKoAqOCnkKZwpKCjAKHgoNCvgJ4AnKCbYJpAmPCXgJYQkgCfwI3wjFCLUIrAipCLAI0AjkCPwICgkPCR0JJwk7CVMJWQlWCY0IjwiNCIoIjQiKCIUIgQh6CHcIegh4CHYIawiICKYIugjNCNoI4wjtCPgIBQkTCScJPAlPCWAJcAmDCZMJowm2CcwJ4AnrCfwJCwocCiMKLQo5CkkKVwpjCm8KegqDCooKlQqfCqkKtAq+CssK1ArgCvAK/goPCyILPgthC4ALqwvUC/4LDgw2DGEMjwylDJAMZgw9DCsMIAwQDP4L6wvZC8sLwgu+C7sLugu6C7sLvAu9C78LvwvAC8MLyQvSC+AL8QsBDBMMKAw+DFEMYQxmDIEMdwxLDAIMwQupC5YLhAt7C2cLUgtDCwQL5ArMCsQKwgq3Cq8KnwqNCnkKbApUCjwKJQoSCv8J7QnbCcEJqwmYCYYJbglQCS0JEgnsCMAIrAikCKEIpwi3CMUI4wjuCPYI/wgHCQgJCAkQCRcJ6AjXCM4IyQjaCMUIuwi6CLwIvwi/CL0IswioCKoIswi+CMcI1AjmCPQI/wgICRcJMAlFCVQJYwl3CY0JnQmtCb4J0QncCeIJ7gn8CQsKHAoqCjYKRQpTClwKXwpqCnwKiQqSCqEKswrECs4K3QrrCvkKCAsVCyMLMgtCC08LXQt6C58L0Av5CycMVgycDIUMYAxLDDwMLQwhDBYMDAz9C+wL2wvPC8gLxQvEC8MLwwvEC8QLxAvHC8kLzAvRC9kL5AvzC/oLAwwTDCIMMQw/DHsMbQw2DMsLrQuXC4gLdgtmC1YLPQsnCxELAwsBC+wKwQq4Cq0KngqJCnUKaQpXCj0KKwoaCvkJ5gnYCb0JpwmQCXsJcAliCTwJJAkHCeUIuwihCI4IjgiZCKAInwitCMkI1gjhCOYI5gjjCN8I7AgJCRAJGgkVCSMJBgn8CPcI+wj9CAIJAQn1CPUI7wj3CPsI/ggDCQ0JHQkpCS4JNglBCU4JWQloCXcJiAmhCbUJxAnWCd0J6wn3CQAKCgoVCh0KIgowCkYKWQprCnoKhwqQCqAKrgq6CsgK2QrrCvgKBgsWCygLNwtJC1YLXwtwC4sLowu2C84LCww+DGoMaAxrDFoMSAw8DC8MIAwQDAAM8wvmC9kLzwvLC8kLyAvIC8kLyQvKC8wLzwvUC9oL4AvpC/cL9gv4C/wL/gsMDCUMKAwoDM4LpwuPC3oLbAtjC1QLRwswCxkLAwvqCtcKygq9CrcKmgqSCnsKXwpECiwKGgoLCvwJ5AnPCcgJvgmoCY8JfglvCVIJNQkaCQEJ2witCIYIbQhlCGgIcQh6CIUIpwi4CMIIygjMCMoIygizCDUJNglACVsJYQlVCUwJQQk6CTwJOwlFCVAJTQlCCUMJRQlBCUYJUglfCWoJcwlsCW4JaAluCYEJkgmdCa8JugnLCdwJ7An9CQQKDQoUChkKJAoxCj0KTQpdCm0KgAqNCpoKpgq2CscK1ArfCu8KAgsRCyMLNQtMC18LbQtyC4oLnQuuC8ML2QsbDFwMjgx+DG8MYwxXDEwMRAw2DCQMEAz7C+sL3wvVC9ALzQvMC84LzgvOC80LzwvSC9QL3QvpC/cL4wvRC9IL0AvUC9gL1wvhC+QLvwulC4ULbwtRC0sLQgsqCx0LDQv4CuYK1grFCrUKpAqJCnEKWAo9CiUKEQoBCvgJ9AnrCd0Jywm1CagJhgltCVQJPAkhCQMJ6wjOCKkIhAhaCEwITQhPCFoIcAiGCJgInQifCKQIoQiMCIIIeQl2CXgJiQmiCaQJmQmiCa4Jegl7CYMJjQmSCZAJjQmQCY4JmAmiCbIJvQnCCcgJwQmlCZcJngmsCbYJwQnTCfEJAQoJCg8KHAonCikKLQo5Ck0KXQpnCnMKhAqQCpwKqAq3CsIKzArYCuIK8woKCxwLMQtJC1sLbAt/C5ELoQuyC8oL+QszDGsMpwyfDIkMdwxoDFsMVwxKDEYMPAwyDCUMEwz/C+4L4gvbC9gL1wvVC9ML0gvSC9ALzAvLC8gLvguqC6cLpAumC6oLrwuuC7IL5gvzC8ELhgtgCzMLHQsYCw0L/Qr8Cu4K3ArGCqoKjQp4ClsKRQowChwKCgr6CegJ2QnSCc0Jxwm/CbIJoQmCCWwJTAkzCRwJAQnnCMkIsQiOCFwIQwg5CDgIOAg/CFAIZAhqCG8Icwh1CGgIXAjgCcgJygnWCc4JzAnFCbUJpgmlCZsJjAmQCZEJmAmiCaEJngmgCaUJrgmzCcAJygnLCdIJ1AnMCdMJ2QnhCegJ9gkRCikKKwoxCjgKQQpNClsKZgpvCnkKggqOCpgKpQqyCsEKygrVCuUK8woBCxQLJQs7C1ILaguCC5gLuAvjCwsMIgxJDGoMgAyVDJUMjAx/DHIMZQxZDE8MSAxADDoMMgwoDBoMCwz9C/IL6gvlC+AL2wvYC9UL0AvFC7cLqAufC4kLgQt7C3wLfwuDC4ILhAuRC7MLygu8C4gLKQsGC/AK4grVCs0KxQq9CrIKmAp8CmMKQgoqChUKAwryCdwJ0QnDCb8JvAmsCZcJjgmACXQJbAlOCS8JDQn9COYIxgiqCIkIZghICDAIJAggCCEIJgg2CEoIUghbCFoIUAhACMcJuQmoCZ0JdglsCVgJVAlHCUQJRwlNCUwJVQliCW8JdgmCCY4JmgmkCa8Jtgm9CcUJ0gnXCdoJ5AnxCfwJBgoPCh0KMQpBCkMKSgpSClYKYApsCnoKhAqLCpYKnwqrCrwKygrXCuIK8goACw0LIgs4C0wLZguKC7AL0AvsCw0MRwxaDGwMfQyRDKQMtgy7DJUMhQx4DGoMXAxODEQMPAwxDCYMGgwPDAQM+wv1C+8L6gvjC9sLygu5C6gLnQuSC4QLawtXC04LTAtSC1ULVwtYC14LbwuNC6cLgAteCxYL9ArjCs4KywrFCrwKogqKCm0KVwpBCicKDQr0CdsJzQnBCbUJqgmaCYQJdwlqCVoJSglCCToJMQkwCRIJ7AjaCLkImgh8CFwIQAghCBIIEggTCBwIIwgyCDQINggqCBsIhwllCWEJQwkYCQ4JEQkRCQ8JGQkjCS0JMQk8CUgJVAlZCWcJcwl5CYkJoAmqCa0Jugm/CckJ3QnzCf0JCAoQCiAKJgosCjcKUwpfCmcKZwpwCnoKhgqQCp0KpwqwCr4KzArZCugK9Ar/ChILJAs4C1QLewutC98LAQwVDDAMTAxhDHUMngzHDNgM5Az2DAoNBA3GDKEMkQyDDHgMbAxdDEwMOQwmDBUMBwz9C/UL7wvrC88L5gvUC5YLhQt7C3ALYgtRC0ALMQsvCzQLRgtBCz8LPQtCC14LfAtxC1ILGgv2CugK2ArJCrsKogqLCnIKUgo8CiUKEQr8CeYJzwmxCaAJjgl9CWgJVwlJCTwJMgktCSoJJQkYCQ4JCAn6COIIyQizCJcIcghWCDkIFwgCCO8H8wfyB/sH/wf+B/QH6AcnCRQJ9QjYCNkI0wjWCN4I6QjzCPoIAQkOCR0JIwkuCT4JRglOCVwJawl+CYgJiwmVCakJwAnVCegJ+QkMChsKJAoxCjwKTApWCl8KcgqMCowKjAqWCqEKswq4CrgKxArQCtkK6woNC0QLXwtyC4ULlguqC7wL5Qv2Cw0MLAxJDGwMpAzFDN0M8gwFDRQNNA1uDT8NEw3pDMMMqwyhDJIMdQxjDFQMQgwtDBcMCAz9C+sL1AuyC5sLewtfC04LQws8CzYLLwskCxkLHgsmCy0LMAsqCzALMwtMC1ULVwsZC/UKywqyCp0KiQp3CmUKVAo/Ci0KDgr9CecJ1gnACakJlAlzCVAJPQkvCR4JAgnuCO8I8gjyCOwI7QjoCNkIzwinCI0IhAiDCG4ISAgeCP0H4QfKB8MHwwfHB8gHyAe/B6QImgigCKAIoAiiCKcItAi+CM4I3wjoCPEI9wgBCQ0JHQkwCTsJRglYCWQJcQmHCYsJlQmpCcgJ3wnwCf8JEAogCjUKRwpWCl8KbQp7CpMKnAqgCp0KpgqyCrwKwQrMCuQK9woKCxULJQs0C0sLYQt3C5MLsAvJC+IL/wsZDDAMUAx3DJ0M3AwRDTENWQ2EDWkNPQ01DSkNHA0NDQEN6AzPDLkMnwyGDFwMIAz9C+YL0Qu6C6ULiwtxC00LJQsbCxsLGwsYCxELCAsMCwkLDgsUCxULFgsPCwsLEAsnCxwLAAvbCsYKqgp5ClYKUgoyCiIKFAr5CekJ2AnBCaoJkAl5CWkJUQklCfQI4AjSCLwIsgi6CL8IwwisCKgIpgiPCHIIXghOCEUISwhTCDoIEQjtB88HvgejB4wHjQeTB5YHZghlCGcIbwh0CIEIjAiYCKYItQjBCM4I3AjnCPEIAAkLCRYJIwkyCUIJVQlvCX8JiQmXCaMJtgnKCdwJ7An6CQ4KJApHCl8KcQp8CogKlgqyCqkKnAqkCqkKwArYCuQK7Qr1CgQLFQslCzoLVQtpC30LnQu3C88L6Av6CxIMLwxRDHIMogzQDAINQw1zDTQN8AzHDJEMhwykDMQMygzKDMEMsQyVDGYMKAwLDOoL0wvBC6gLkQt7C2YLLQsQCwgLBgsDC/8K+QrxCuUK5QrlCt0K4QrYCtYK2QrcCukKBwv2CtsKwgqTCnUKWAo+Ci8KHgoKCvEJzgm9CasJlAl4CVwJQwkpCRIJ+AjTCKsInAiQCIYIggh+CHIIZQhWCFIITwgvCB0IHAgbCBMIBwgDCAQI9AfUB6QHigdtB1MHVQcwCDoIQghNCFgIZAh1CIEIiwidCLEIuQjDCNAI2wjqCPgIBwkTCSQJMglFCVkJawl9CYsJnQmuCb8JzQndCe4JCAorCj8KZwpyCncKhQqLCo0KjwqdCqgKrAq0CsMK1QroCv4KEAskC0ALWQtoC3ILfguaC7QLygvgC/YLHgxNDGoMfgyUDK0M9QxCDTIN2wyQDF0MVQxODEUMQAxkDHQMkQygDH0MWQw2DAQM+wvKC7QLowuJC24LVAseCwcL/Qr3CvIK7ArmCuYK3QrRCtEK1grTCs8KzArFCr0Ktgq4Cs4KzAq5CqoKigpdCjwKGAoHCgIK4QnMCasJigl7CWUJSwksCRIJ7gjGCKoIigh6CHIIbghtCGoIXAhPCDkIHggPCAII/Qf8B/gH9Af1B+kHygfAB64Hlgd4B18HPwcoBxQIIAgrCDMIPghJCE8IWwhtCHgIiQiWCKIIrwjACM8I3QjtCP0IDgklCTYJSgldCXUJiAmaCacJuQnKCd0J7Qn5CQwKHwo8ClgKWQpbCl0KdApyCnoKkQqXCqUKwQrYCu4KCgseCzQLTgtiC3YLhwuZC7MLyQvgC/kLDwwgDDcMVQyODL4MAw05DTQN+gzCDF4MMwwtDCoMHgwPDAsMEAw9DDkMMwwwDCEMAwzWC8QLqAuNC3QLWQtPCxgLBAv2Cu0K5wrfCtgK0wrTCtMK0QrOCs0K0QrVCsYKsgqZCp0KmwqkCqQKkgp3CmwKPAofCgUK6QnTCcIJoQmNCXgJUwk4CSkJEAnpCL0IlwiBCGoIYAhdCFsIXAhcCFkIOAgMCPUH6gfiB+QH5wfuB+8H5AfMB5cHYQdbB0UHLwceB/QG9Qf6BwkIEQgbCCEILAg4CEcIUwhjCHQIhgiWCKQIrwjFCNgI6Aj5CAwJIAk8CVUJdAmICZcJqQm5CcsJ2QnoCfMJCAokCjgKKwoqCkIKUgpVClsKbAqLCp4KqgrICtsK5gr6Cg8LLgtPC2cLgQucC68LwgvXC+gL+gslDGAMmwzYDAMNBg3cDLcMkQyTDI4MKAwMDAgM+gvwC98Lvgu4C7MLtgu7C84L5QviC7kLqAuYC4MLYgtMC0ELLAsOCwML/Ar2CvEK5wrWCtQK1QrUCtQK0grLCsQKrwqaCoAKeQp9CoEKjgpzCl0KVwpWChkK+gneCc8JvgmmCY4JbglkCUUJJAkICeAIvQicCIQIcghgCFIITQhICDUILAgjCBQI/AfgB9YH1wfbB9kHzwfDB68HlgdsBzsHFQfhBrwGnwbaB+QH6wf0B/0HBwgUCBwILQg8CEoIXAhpCHcIgAiRCJ8IsQi+CNoI+AgrCT8JVAloCXsJkwmrCbwJyQnQCdsJ8An4CQQKEgoZCiQKMApGCk8KTgpUCmYKiQqcCrMKyArfCvEKCwsxC3ULswvSC+EL+AsQDCgMRQx0DKMMyAzBDKcMeQydDIIMTwwYDAoMBwzjC+QL3wvJC7sLnwuDC3sLegt+C34LiAuhC6oLqwuRC4gLeQteC0sLNwsrCyALGQsUCwAL7grhCtgK0wrHCsQKwgq+CrgKoQqRCoUKfAprCmQKaQpxClgKQgolCh0KDgoECtIJuQmwCZAJfgl3CWMJQwksCRIJ7gjMCLcIqwiYCIQIZwhFCDgIGwgKCPoH8QfrB9wHvQe/B7gHqgefB5UHbQdVBzIHEwf8BswGoAaBBroHvQe2B8sH5gfzBwIIDwgcCCoINQhCCFEIXghsCH4IiQiVCKsIzwjoCP4IHAk8CVsJdgmOCaEJrwmzCboJxQnMCd0J9gkNCiAKLgozCjMKMwo7CkkKVgpuCosKpQrICvQKGQtnC6YL3AsVDFIMhQyxDLkMyQzrDOYMogxoDFMMRAw7DDAMFAz0C9oLzAu7C6oLnAuSC4YLcwteC1ALTgtUC00LVAtVC1sLbAuJC4gLeAtiC1ELOwsfCxgLEQsEC/MK4QrMCrgKrgqeCqMKowqdCpYKjQqACnYKYwpfCmIKUwpTCk0KRwosChUK9QnYCcUJtQmgCZMJhwl7CXQJaglNCTcJGQkDCfQI7AjZCLoIpQiJCFwIPwgoCBAI+wfmB9AHsAePB40HigeGB38HcwdABx8H/QbfBrYGkgZzBlUGfAdtB3cHkgeoB8kH2gfwBwQIEggkCDMIQAhQCGMIcQiACJIIqQjDCN4I+QgTCTQJTwltCX4JgQmSCZYJlgmrCcIJ2QnwCQAKFgoZCh0KHQouCj0KVgpsCokKzAoPCzsLbwugC88L+QsuDFsMkQzHDPsMKA0ODdgMpAx8DEYMMgwoDBwMDAz4C98LvQujC5ELfwtqC1MLOQstCyULIwslCyALIgsqCzILNAs6C1cLcwtqC0sLPwstCw0L+QrxCuoK3QrMCroKpAqZCoUKggqCCnwKegpuCl8KXgpOCkYKQwo1CiwKJAogCgkK9wnlCdEJuQmrCY4Jhwl4CWQJVQlICT4JJgn+COIIzQjOCNEIywi2CJQIbghSCDcIEAj4B+gHzgerB4YHcgdhB1QHSwc/Bx0H/QbaBpUGdwZgBkkGNwZAB1QHXgdoB3sHjQeqB8UH7wcJCBQIJAg2CEkIWghrCH4IkwipCMII3Qj5CBUJMglMCVYJXglkCX0JgQmHCZcJrQnDCd0J9wkOCgwKDwoaCi4KRgpgCsoKDgtBC2ILiwvLC/8LKAxVDIIMkQyiDLMMuQzODPsMxQyhDHEMHwwKDPkL6wveC9ALvQubC40LcAtYCz0LHgsOCwsLCQsQCwULFAsKCwgLBgsDCw8LGwtFC0cLMQsdCxAL9ArtCtwK1grKCr0KogqMCn0KawpoCmQKXwphCmAKYApUCkEKMwoiChsKDQoBCvcJ5QnTCcUJtgmlCZQJfglrCVwJRQk2CRkJDAn0CNgIwAiqCJ4IowipCJgIeghVCDsIBQjmB80HswehB5AHfAdbB0oHQQcfB+0Gzga7BpQGdwZaBkYGLAYpBhQHHQcVBzUHTwdlB5QHxQffB/kHCggfCDUISQhfCHEIgQiWCK4IxgjgCPsIFwknCSIJPAlGCUkJWgluCXMJlgmmCbcJzwnpCf8JEgoiCigKLwp8CsQKMQs2C0MLdwuAC5QLsAvYCwQMHgwwDD4MVgyBDJgMzgyxDHwMVQzzC+AL1wvKC7gLoguEC3MLZgtaCzoLAgv2Cu4K7AreCtsK5wryCvoKAQv5CvkK+QoECzMLTgsuCwQL8QrmCtwKvQq1Cq0KngqFCmsKXgpSCkQKQgo7CjcKNgo6CjkKMAoeChYKDwoCCu8J5wnNCbsJrwmlCZsJkQmBCWYJRwktCRIJ6AjWCNEIwAikCJYIiQh+CHYIYQg7CCYIAAjgB8AHqAeYB40HdgdaB0YHOAcpBw4H/QbdBq0GgAZYBj0GLwZEBlkG0gblBgUHIgc4B1gHfgetB9MH6gf/BxoINghGCFcIawiACJsIswjICOEI7gjyCBYJHAkpCTcJPwlLCWcJgAmTCZQJnwmuCcUJ2wnuCQAKNAqNCsMKygrRCs8K2goVCz4LRgtcC3ELjguVC7YL1wsJDCgMTQyIDKIMYgwlDNgLwQuyC6ILigt1C1wLSgsxCxsLDwvjCtYK1wrQCtIKzwrKCs8K2ArmCu4K5grjCusKDAsxCy8LDgvzCt0KxwqxCp0KmQqKCnkKWApHCkUKMQoiCiAKHgodCiAKIQodChEK/gnsCd4JzgnBCa4JoQmVCYwJhwl/CW4JVgk1CREJ4QjFCKgIiQiLCHgIbwhwCGcIVQg+CB8I+AfYB8EHqAeMB3AHWwdQB0cHNAciBxEHAQfnBrkGiwZtBk8GNAZMBm0GoAbHBs4G3wb9BhsHOgdZB4QHrQfFB9UH7AcKCDIIUQh2CIgInQitCKkIzAjsCAQJEgkXCRwJLwlGCVoJZwlzCYUJjgmUCZoJpgnECfEJSApQClYKXQplCnoKjQqYCq0KwQraCvYKEQsrC0sLZwuKC7EL2wv+CyMMSgxKDAsMtguXC4ULeAtlC00LOQsoCxAL9AreCsYKsAqoCpwKkwqSCp8KoQquCskKxQrMCsYK1ArdCh4LEgsQC/8K4ArPCrsKnQqGCncKZwpKCjYKKwogCg4KBAoBCv8JAQr7CfQJ7gneCcsJsQmcCZwJlAmGCXwJdgltCWkJUwk3CSMJDQnuCMcImwh7CF8IUAhGCDIIJggYCP8H5wfPB7IHlAd/B3AHXwdMBzsHLAcRB/8G6gbTBroGngZ+BlwGQgZQBnQGmAbIBtQG2gbiBu4GAQchBzsHVQdvB48HwAfaBwMIGwgzCEoIYQh4CJQIuQjLCOEI8ggKCR8JKAkzCUMJVQllCXEJfAmACYkJlQmiCbYJ1AntCf8JEQolCjgKTAphCncKjgqkCrsK1wrvCvUKBwseCzcLWAuEC7YL7wsvDC0M4wuFC2kLWgtFCz0LJwscCwwL8QrXCrwKsAqhCoAKagpkCmUKbAp3CpUKlgqSCqcKpAqfCroK0goaCxML+ArkCtAKvAqeCoYKagpRCkIKMgomChwKFgr7CfgJ8gnsCeYJ4AnQCbsJlgl+CW4JawltCWwJaQliCVoJSgk4CSUJCAn9COYIyAirCHoIWwhGCCwIDwj2B94H1QfLB70HpweKB3IHXwdCByoHFAf9BuYG0Aa9BqYGlQZuBlcGRwZUBnEGlAa+BuYG4wbqBvEG+gYDBw4HHQc3B1EHcgesB8cH2wfZB+sHKghgCJEIjgijCMMI2gj0CP0ICwkaCSsJOQlJCVQJZAltCXgJhAmSCZ8JsgnECdcJ6Qn8CRQKKQpAClwKdgqZCqMKsQrFCtcK4ArtCgMLGgswC3QLvAvyCysMDQzRC2cLQAsqCxMLEQsFC/sK4grVCrsKqQqiCpAKcwpaClEKTwpSClwKdgp1CncKdwp2Cn8KlAqzCuYK/Qr7CukK2QrGCrIKhwpkCkQKLwoiChUKDQoGCv8J/An1CecJ2AnGCaAJjAl1CWMJWwlUCVIJUAlLCUYJQAkyCSYJCwn9CPEI2wjACJwIdghRCEAIIAgMCAAI8AfHB6EHfgdsB1oHQAcvBx4HCAfxBuMGyga6BqcGgwZtBlMGUAZiBoUGqAbNBvcGLAf2Bv0GAwcMBxQHHgcmBzQHPgdSB2AHmwe5B9kH/AcaCEMIMQhhCJIIwwjfCO4I9QgFCQ8JJQk9CUcJUQlbCWgJdAmBCY8JnAmrCbwJ0QnlCfYJDwooCkoKYwp3CoMKlQqmCrYKwwrOCu0KDgswC0oLeguyC+cLFgzhC6kLSwshCxELAAvqCt8K0ArACrsKtwqhCosKcgpbCkcKNwowCjQKOwpJCksKTgpUCloKYwp1CpQKsQrdCgoL8QrSCrsKuAqmCo4KWgpCCjIKHAoICv8J+Qn1Cd4Jygm8CaIJhglxCWMJVglECT8JNQkqCSIJHQkSCRAJDwkFCfcI4gjLCK8IlAiRCHcIYQhfCEEIFQjyB9cHuQeTB28HUAc9Bx8HDQf1Bt8GxwatBqMGiQZ0BmYGWAZ3BpcGwQbcBgIHLgdSBwcHDQcYBx8HKQcyBzwHRgdTB18HbgeBB5cHsgfTB/YHGAg6CF8IoAjCCNYI4QjmCO8IAgkaCTAJQQlMCVoJYglsCXoJmAmqCbsJ3QnsCfMJAwoXCiwKRgpXCmoKfAqKCpcKoQqzCs0K8AoVC0oLgAu9C9ULCAwUDMsLkwsoCwUL7wrfCsoKvAq1CqQKmQqdCooKbwpaCkMKIwoLCgIKAAoJChwKIwopCjEKNQo7ClEKaQqBCscK+goUC/MKyAq7CrEKmgppClcKQwouChgK+AnoCdkJwgmuCaQJjQlyCV4JSgk3CSkJIwkXCQgJ/wj+CAIJ/ggECfUI7QjjCMsIsgiaCIwIgAhsCFQIOAgTCPgHzQeWB2wHRQcuBxUHBwf4BuYG1ga7BqoGmQaCBm8GZAZwBpkGxAbmBgIHKwdOB3AHMwcjByYHMwc+B0YHUgddB2gHdQeEB5MHoQfEB+MHDwgrCE0IbAiQCKYIsQi6CM4I3gj1CBAJLQk/CUQJTglbCWIJigmiCa8JvwnjCfYJAQoQCiAKKgo5Ck8KXApjCnEKgwqVCrIK3goMC0MLcwusC+QL6wvyC9cLswuNCy8L5wrOCr0KrwqkCpkKjAqCCnYKZwpMCjYKJAoDCukJ0QnWCdQJ3Qn0CQkKGAofCiUKMwpPCm4KsQrcCvIKDAveCsIKsgqUCncKVAo+CikKEwr6CeUJ0Am9Ca0JmAmBCW0JTgk2CSMJDwn0COcI5QjoCOkI5AjgCNkI3wjbCMcIsAicCIUIaQhKCDgIJggHCOkHvQeVB28HTQcuBxIH/Ab1BusG6wbTBrkGrAaXBnsGbgaABpcGxAbgBgEHJAdGB2kHjAdmB18HVgdOB0sHVgdoB3UHggePB6EHsQfDB9QH5AcECCgITQhkCIAInAisCMUI0wjtCAUJFQkjCTQJSwlRCVUJcwmBCZQJsAnSCeMJ7gn8CQQKEQooCjkKRApTCmQKdwqHCpgKtgrUCgALRwt0C3kLhQuYC64LhgtuC1sLPAv9CsYKsAqeCowKfQp0CmEKUQo8CiUKEQr3CdwJxwm3CaMJqAmtCbIJzQnuCf4JDgodCioKQgp4CqUKvwruCscKpAqNCncKYgpHCjQKJQoUCgAK6wnWCcMJrQmdCYQJaAlSCTYJGwn3COsI2wjKCLgIqQigCJYInAifCKgIogiTCHwIZghPCDQIDgjtB8UHnQeEB2UHQgciBwMH9wbrBusG6wbrBusG6QaiBooGgAaHBp0GswbLBuwGDgcpB1YHfQebB6YHmgeJB3sHcgd2B3sHhgeOB5kHswfMB+MH/QcYCCcINwhRCGgIfAiaCKgIuQjQCOkIBgkUCRwJKQk9CUkJUAlvCX8Jmwm5CcQJ2gnnCfYJDwoeCi4KQQpRCmAKegqJCp4KuArICtcK8Qr6Cg4LKgtQC38LggtfCzkLIwsNC/wK6wqkCo0KewppClkKPwogCgYK+wnxCcYJpwmZCZIJhwl/CYAJfAmOCZwJugnXCQAKFgosCj8KXQqGCsgKrwqNCnMKYgpWCk8KSgo6CicKBArnCdUJwAmjCZgJgQlvCVkJOwkdCf0I4wjJCLAIjgh6CGgIYghkCGEIYghlCGYIWwhCCCcIBwjnB8UHpweGB2IHQgckBwQH8QbrBusG6wbrBusG6wbrBusG6gbtBu4G7AbqBusG7AYLBzAHXgeFB60H2wfDB68HpgejB5kHnQejB60HvgfMB80H6gcRCCkIQghfCHYIkAijCKwIqgixCMkI7wgFCRMJJgkvCTsJRwllCXEJfgmMCaAJtwnKCd8J+QkQCiIKOgpHCk0KXApzCoAKngqsCrkKywrgCvYKEAsuC2gLpQu/C2ULLAsJC+oKzwq/CqwKagpVCk4KPwopCgoK8QnKCbEJowlrCWQJZQloCVwJXglUCVcJbQmJCbYJ0AnrCQgKHgpZCooKpgq2CpMKdQpeCkkKRQo6Ci4KIQoYCgkK2QnACa8JoQmMCXMJUgk2CRoJAQnoCMwItQidCIMIYwhMCDUIJgghCB4IGwgPCAAI8gffB8cHqweMB2cHRgckBwUH7QbrBusG6wbrBusG6wbrBusG6wbrBusG6wbrBusG6wbuBhgHQAdnB5AHsAdDCCUIEwgZCA0ILAgOCNgH1QfZB/EHCQghCC8IPghhCIEIkgigCKwIvgjJCMoIxAjbCAEJIAkxCTYJPglHCV0JeAmHCZwJrgnECdkJ8wkMCiYKMQo/CkwKUwpkCnEKfAqKCqAKtQrLCuMK/wowC3QLpgvjC8gLcgtoCw8L0gq3CpkKewpjCkMKLAofCgsK6gnOCZEJbAlTCUcJPgk8CToJOwk9CTUJNwlQCXMJpAm+Cd8J/AkVCjIKVAp6CpkKugqYCnEKUwo6CicKFAoICvsJ9AnnCdoJygmrCZAJcwlXCUYJMQkdCQMJ6wjNCLQImgiBCG0IQQghCAcI7AfaB8oHtwemB5gHmgeKB2kHSQcnBw0H9gbqBusG6wbrBusG6wbrBusG6wbrBusG6wbrBusG6wbrBuwGFQdDB3YHngfDB8QIjAiACFoITQhUCDQITAgpCE4ILAg4CDwIRghqCHYIiwijCKoIuAjCCMsI2QjfCOMI+QgdCTAJNQk+CUwJYQl3CY4JoQm2Cc0J6QkHCiEKKwovCjkKQwpMCl8Kcgp9Co4Kpwq9CtYK9wonC2ILlAvNC9ILpgt6C0QL8QqzCpIKdgphCksKNQocCuYJ0wnICagJZQlHCS0JKQknCSIJHAkfCR8JHgkZCS0JTAlqCYcJzwnjCfgJBQocCjYKSgprCoUKlwp5ClIKKgoUCgMK8AngCdIJwwm1CawJpAmeCYUJZwlTCTkJIQkPCfoI3Qi7CKMIjghbCDgIGgj/B+sH2Qe/B6sHlQd4B1oHMwcaBxAH+wbtBusG6wbrBusG6wbrBusG6wbrBusG6wbrBusG6wbrBusG8gYcB1AHhQewB9oHDAkPCfwI7QjpCM0IrQiPCIgIggh3CJMIiQiGCH4IlgilCLsIxwjSCOcI7gjvCPMIBgkRCR8JMQlGCVoJbwmACYwJogmxCcgJ4wn/CR0KHAohCikKNApBClAKYgp0CooKngq2CtEK8AoxC2MLpAvdC9YLswuICzkL/wrbCrcKdApUCkEKLgoeChQKAArtCcEJlAleCT0JJwkXCREJDQkKCQkJBwkFCQUJFQkiCTYJTQlqCZsJswneCfgJCQoTCiYKUQpvCmkKKQoACvAJ3wnQCbgJpgmeCY4Jfwl8CXcJcwlpCVkJSAk1CR4JBgnsCMwIsQiTCGoIUAgyCBAI8QfTB7kHnwd+B2YHSwcwBxoHAgftBusG6wbrBusG6wbrBusG6wbrBusG6wbrBusG6wbrBusG6gb+Bh0HPQdlB6EH3AdzCW0JWAk1CUEJJwkOCRUJAQnOCMoI0gjXCN0I3AjUCMwI4QjlCOkI9QgCCQUJ/wgMCS8JSglcCWsJfAmTCa4JvQnECc8J1wnjCeUJ6gnwCQYKGwo4ClAKXwpzCosKowq3CtMK/wowC2YLpAvbCwQM1gugC3QLRQv/CuAKxgqvCoYKUAoGCuYJzgm8Ca4JhQlTCS8JFQkICf0I+Qj6CPcI9wj2CPMI8gjuCPcIEgkxCU0JbQmWCbcJ0AniCewJ8QkKCiQKMQoPCuAJygm7Ca8JpAmECXMJaglgCVQJTglKCUEJNAkgCQMJ6AjUCLwIoQiFCHEIUQgzCBUI9gfXB7kHnAeAB2cHTwc3Bx8HBAfsBusG6wbrBusG6wbrBusG6wbrBusG6wbrBusG6wbrBusG6wbvBhUHPQdoB6IH1gf+B/oJ5wnACZkJiwmQCZ0JoglfCS0JEgkMCRUJFgkWCRQJDwkMCQ8J/Qj+CAwJEQkVCRwJLAlDCVsJZglrCXMJewmNCZ4Jqwm4CccJ0gndCfIJDQooCj8KVAprCoQKnwq5CtwKAgtNC4YLvAvlCwsM+gvXC6MLbgtGCx0L7QqiCn8KXwpGCikKEwr7CeIJiQlXCUAJJwkPCfoI7QjsCOsI6wjrCOkI5wjlCOMI7Aj8CA0JKwlMCW8JhQmLCZsJugnACdAJ2gnhCdgJwgm0CaQJlQl9CWUJTgk0CScJHwkaCRIJBQn3COQI0gi7CKIIhwhvCFgIRAgqCAwI8QfQB7kHnQeFB2YHRwcvBxcHAgf2BusG6wbrBusG6wbrBusG6wbrBusG6wbrBusG6wbrBusG6wbrBvEGFAdDB3IHrAfaBwMIcgqWCksKBgoQCgcKDQr6CdkJkgl1CXAJVglVCVIJSQlICUAJQAkjCRQJFQkVCRsJJAkyCUEJUQllCXoJgwmLCY0JlQmjCbMJxgnYCe8JCQonCjkKUApoCoAKnQrDCukKCQssC2ELygvtCxEMKQwCDNsLowthCxQL2QqxCpcKgApjCkYKKgoXCgsK8gm/CYwJLgkYCQkJ+gjxCOwI6QjlCOMI4AjeCN0I3AjbCOUI9AgGCREJGwkxCUcJWwl6CYsJmQmfCacJpQmdCYwJgwlmCUcJLQkYCQgJ+wjwCOoI4QjXCMIIowiICHMIYQhMCDcIJAgWCPwH5wfSB7YHmgd5B10HRwcvBxgHBQf3BusG6wbqBusG6wbrBusG6wbrBusG6wbrBusG6wbrBusG6wbrBusG7wYOB0EHeAemB9kHDQhdCokKkgplCngKkQqUCmUKEgraCdQJuQmqCZgJjAmDCYMJfQl0CVcJQQksCS4JNAk2CTwJRglVCWIJcQl8CYwJkwmhCbIJxgndCfkJEwoqCkEKVgprCoQKrQr4ChoLPAtcC30LugsPDDQMWAxdDCYM7wu1C4ILQgvjCrIKlAp3Cl8KSgotChkK6wnYCc4JfAk+CRsJEAkGCfwI8wjqCOQI4AjfCOII6AjpCNcIuwi0CMMI1wjmCPYIDwkiCTQJUwljCWgJbwlyCXEJaAlcCUkJJgkLCfgI5AjYCMwIwQiqCJkIiAhwCFQIOggpCBgIBgj0B+YHzQe5B6IHhAdqB1MHPwcwBxYH/wb1BvoG/wb+BgAHAQf9BuwG6wbrBusG6wbrBusG6wbrBusG6wbrBusG6wbrBgUHOgduB50HvwfoBxUKRAptCqAKwAryCuIKsQp5CpcKbQpaCj0KGwrzCckJwQm8CaoJmAmFCWcJaAlnCV0JWAlcCWgJdgmHCZgJrwnGCeYJ+QkEChQKLQpCClYKbwqICqgK2wotC0gLcwu9C+4LHgxODHEMeAw5DBAM7AvdC7wLiAtVCxkL1gp8Cl0KRAotChEK+AnVCbsJlwl4CVQJOQkpCRcJBQn2CO4I6QjsCO0I8AjvCOwIzQivCJ4InwioCLIIxQjWCOgIAAkUCSgJMwk0CTcJNAkuCSoJGgkKCQAJ4wjOCLwIqQiPCH4IawhRCDsIIwgQCP4H5wfWB7wHrAeWB4AHZgdRBz0HIwcOB/8G+gb4BvsGAwcOBxoHHgckByEHBwf1BusG6wbrBusG6wbrBusG6wbrBusG6wbrBusG7wYbB1gHkAe4B9MH+wkqClMKhQqtCtoKBAsiC/sK8grvCs0KrwqECk8KJgokCh4KIwozCgYK5AnwCckJogmXCZcJmgmpCcAJ2Qn5CQ4KJgpGCmcKjgqtCqUKvArZCgILMwtxC58L2AsaDEgMjgysDNoMnQxaDBwM2wu6C6ELhQtuC0kLGgvuCsEKYwotChIK+gnkCcUJqgmNCXsJawlbCUQJIgkLCfUI8AjxCPII8AjxCPUI9wjCCJsIhgh7CHsIfgiHCJYIpAi6CMwI3QjsCPQI+wj+CPYI8AjtCN4I0Qi7CKIIighwCF4ISQg1CBoIAAjpB9EHwQepB5kHggdyB10HTAcyByIHEAcDB/wG+wb8BgMHGQcpBzkHSQdRB1EHQwcmBw4H9AbrBusG6wbrBusG6wbrBusG6wbrBusG6wbrBv8GMwdrB50HywcACicKZQqTCr8K9AoECwQLGQs7C2YLKwv+CsMKqQqhCp8KkAqkCq4KrAqcCnIKbwqFCooKkQpbCiIKGwouCk0KhAqqCsUK4QoOCy4LXQuBC6cLzQveCwcMNQxbDIEM4QzvDBMN+Ay5DGwMNAwNDNcLggtUCywLDwv3CsUKogp3CkIKFwoACvAJ2wnICb0JtQmoCZIJYAk9CSEJCQn3CPAI8gjxCPUI+gj0CLwImgh3CGYIZQhjCGMIaQhuCHsIhQiVCJ8IqAiyCLwIvQi5CK8IoQiQCIIIaQhTCD8IKggSCPgH5AfQB74HoweJB3MHYQdNB0EHKAccBw4HCAcEB/0GAQcIBxcHIwdBB1sHbgeCB4gHgQdhB0MHJgcKB+8G6wbrBusG6wbrBusG6wbrBusG6wbrBusG8AYYB0YHhgelBz0KVwpQCkcKhAqFCpUKpgq8CuQKCQslC0sLOgs0CzALKAsZCwsLGwsyCwILxwrpCvYKCgsECzMLTgszC+wKqQrBCukKCgsqC2ILjgvmCx8MSAxoDJYMzgwBDS4NSA1ADRoN6gy+DJIMcgxFDAwM1AuWCzMLCAvrCsQKpQqGCmYKUwo+CiwKFwoJCvYJ3wnKCbcJowmDCWkJUQk/CS4JJAkYCRAJDAkHCfEIzgixCJQIeAhkCFsIVwhVCFQIWAheCGEIZQhoCGgIawhvCHQIdQhuCF8ITQg0CCEICwj5B98HxQeuB5EHeQdnB1AHPQc3ByYHHgcVBxMHAgcDBw4HBwcVByUHPwdZB2wHjQeuB8QHvwelB4YHZwdCBxwH9AbrBusG6wbrBusG6wbrBusG6wbrBusG6wbrBvwGFwdHB3UHxQniCfUJ9wkKCh4KMgpECmEKfgqmCtQK9AoWCz8LdwuoC5sLkguNC54LdAs0C3MLYguQC5ALkgvGCwUMIQwCDM4L/AsbDD4MVgx4DJ8MzQzdDOIM7QzsDNsM6Az7DOgMzwyNDGUMVww2DCgM/gvYC6MLaQsNC90KwgqqCpMKfwpwCmEKTAo9Ci0KGgoECusJzwm/CakJmQmGCXUJaQldCU8JQgkuCRcJAwnvCNUIuAidCIYIdwhpCF0IVghRCFEITwhNCEsIRAg9CDcINAg0CC8IJwgWCAII7gfTB74HoQeCB2MHUgc/BzMHJAcaBxYHFQcLBwoHCwcTBx0HKAdBB1gHdAeDB5UHtwfXB+4HAAjwB9IHpgeHB2QHMAcPB/EG6wbrBusG6wbrBusG6wbrBusG6wbrBusG6wbrBgoHNQebCa4JuQnJCd0J8AkDChsKNgpQCm8KpwrSCgALKAtMC24Lkwu+C/QL+gu4C6sLBwxWDFQMYgxcDEgMPQw0DDEMQAxDDEcMQAxUDE8MUQxgDGMMZwxqDHEMfwyMDLUMzQx+DDkMGgwFDOsL2wvLC68Llgt3C0ELGgvwCsoKuQqvCqcKmwp4CmIKTQowChcKAgrtCd0JzAm8CaoJmwmMCXoJaQlWCUUJPAkzCRoJAwnpCNMIwQivCKAIkQh8CGkIVwhECD4IMQglCB8IFwgNCAEI9wfrB+EHzAezB5kHhwdwB1wHRQc1ByMHHwcYBxAHDwcYByAHKQcsBzMHSAdmB3kHjgenB8cH4gcCCCIIMwg3CBsI/AfTB6sHjQddBzUHFgfyBusG6wbrBusG6wbrBusG6wbrBusG6wbrBusG6wb6BoIJmAmyCcIJzwnfCfIJBwobCjEKVQp7Cr8K7AoXC0ELUAuNC6cLqgu1CxcMWwxgDIIMZgxLDCgM/gvqC+kL8Av8CwcMDAwPDBcMIgwsDDEMPAxHDEwMUgxfDGoMfAyeDFAMBQzsC9cLwguvC54LlQuDC2gLRgsrCxkLAgv1CuIK0wrBCqwKlwqHCnkKawouCgkK7wnZCcUJtgmmCZkJjQmFCXYJaQlaCVIJRQk8CSkJGQkGCeoI0gi5CKMIkgh+CGAISQg2CCQIFAgGCPQH3gfNB8EHrgeeB4sHeAdiB0cHNAcnByEHHAcXBxgHHAclBzAHPQdUB2AHdgeIB5gHsAfNB/QHEggqCEMIWQhqCGwITQgtCAIIzAepB4gHZQc+BxoH+wbrBusG6wbrBusG6wbrBusG6wbrBusG6wbrBusGeQmSCacJtwnDCdQJ6Qn1CQcKHwo/CmkKrgrjCu8K6wobCyYLSAtPC6QL5QsCDCEMbQxiDD4MCgzhC9QL1gveC+YL7AvyC/gLAQwMDBYMHwwoDC0MMAw1DD8MSwxaDGwMIAzoC8oLtAuiC40LeAteC0gLMgsaCwgL9QrzCugK0Qq/CqoKmAp6CmYKSwo6CikKHAoTCgMK5QnYCckJvQm7CbUJrQm2Ca8JlwmECXQJZAlOCTEJFAn4CN4IyQi5CKUIjAhvCE0IMwgYCPcH3QfEB6wHlQd+B24HWwdFBzMHLwcoByIHIAckBygHLwc6B0kHYAdxB4kHmweuB78H2Qf1BxEIMQhPCGUIfAiTCJoIiwhaCDoIIggICNwHtweXB28HRgcdB/sG6wbrBusG6wbrBusG6wbrBusG6wbrBusG6wZxCYgJnQmzCcEJ0gnhCfYJEQotClcKmgqcCpoKoAquCsUK3wr5Ci8LdgulC9gLCwxQDGQMNQwIDOALzQvNC9EL1AvYC9oL3AviC+sL9wsHDBEMEAwXDB0MIwwpDDYMOQz8C+ELxwuqC5QLiAtuC00LNQscCwoL+AreCssKwgqvCqUKigptClYKRAoxCiQKGQoKCv8J8AnlCdoJzwnHCcMJvQm1Ca8JqAmfCZQJhAl3CWkJUgk7CSEJCQntCNMIwQiwCJUIXwg5CBUI9wfbB8AHpgeOB3AHVQc/BzkHLwclByUHKgczBzwHSwdhB3QHhAeaB6gHvQfbB+8HBggdCDMIUQhtCIoIpwi5CMMIvgi0CJoIdghaCD4IBwjqB9gHqAd/B08HHwcHB+8G6wbrBusG6wbrBusG6wbrBusG6wbrBnoJlQmmCbIJwAnWCfAJBwolCkIKWwpgCmkKeAqJCpwKsArKCu8KQgt/C7sL6gsTDEwMWQwdDPkL3QvLC8ULxgvIC8kLygvLC8wLzgvRC9gL6Av0C/wLAgwHDAcMCwwsDAcM5wvFC6ILgQtnC1gLPwsfCwYL8wrgCssKuQqmCo8KeQplCmQKWgo8CiEKEQoECvQJ4gnVCcsJxQm9CbYJrQmiCZgJjgmFCXMJYglbCVUJRwkvCQ8J9wjZCMcIwQi5CKoIhwhbCDAICgjnB8wHsAeVB4AHbwdYB0QHNAcsBy4HNwdBB1IHZgd+B5MHqAfCB9kH7AcDCBgIMAhQCGUIegiRCKoIwwjcCPQICQkCCekI4AiwCI4IawhSCCgIFQjxB5oHbwdWBy8HDQfsBusG6wbrBusG6wbrBusG6wbrBusGfAmNCaUJvAnUCeMJ/QkdCjgKPAo9CkwKWwptCoAKkAqmCskKGgtpC6AL1wsYDEsMeQxPDCwMBAzjC80LwQu8C7wLvQu+C74LvQu8C7wLvQvAC8UL0QvhC/AL+gsBDAsMFQwBDOILxgusC0oLMQscCwUL8QrXCrsKqwqfCpIKfQphCkcKOAooCiMKFQoBCu8J3wnRCcAJtgmxCagJnQmRCYIJdglpCVsJSgk/CS8JIQkTCQAJ4gjOCLsIqwihCJYIiQhtCEgIHgj6B9YHvAegB4wHegdhB0oHPwc5Bz0HSAdXB24HgAeXB7UHzwfoB/8HGQguCEsIXQh5CJIIoQivCNUI7QgCCRUJJgk+CTgJHgkECesIxwiYCFMIEQj3B+MH0Qe1B5kHZgdABx0H+wbxBu4G6wbrBusG6wbrBusG6wZ2CZIJqgm8Cc4J5wkDCiAKIgooCjoKUQppCngKiwqdCrsKAwtNC4YLvwvxCykMYAyQDGgMRAwWDO4L0wvCC7gLswuzC7ILsQuvC64LrQutC64Lsgu4C8ML0wvjC+8L+QsgDDYMCwznC6YLdAs1CwIL6ArZCsIKrAqOCoIKeAptCloKPAomCgkK/Qn6CfYJ6AnbCcoJvgmwCZwJjQl8CW0JYAlPCUAJNAkjCRAJ/QjrCNkIzAi7CK8ImAiACHUIZghWCEMIKQgNCPEH0AesB4wHbQdSB0kHRAc/B0UHTwdmB4EHmAe0B9IH7QcLCCQIPghcCHIIjAigCLgI0wjsCAAJFAkjCSkJPAlXCYAJWQk0CRIJ7AiuCHgIdwhsCE8IKwgaCAoI6geeB3kHVgcxByMHFgcFB/MG6wbrBusG6wbrBnkJkwmqCcAJ0QnhCf0JHQoxCkMKTQpfCnkKlwq3CssK5AoNC0ULbwucC8UL9As1DIQMcgxhDDgMCwzgC8kLuQuvC6kLpQujC6ILoAufC54LnQufC6MLqwu3C8UL1AvjC/YLIAzrC7QLmQuEC3gLTwv2CsIKsAqbCoUKdgpoClwKQQooChYKAwrzCe0J6QneCc8JvQmsCZkJhwl1CWUJVQlCCSwJGgkMCfkI4QjJCLoIqgiZCIIIbghfCFIIRAg2CCsIHQgQCPYH2AezB44HcAdVB0oHRgdFB0oHVwdyB5AHqwfKB+8HCAglCD8IXQh2CI4IogjACNwI7QgDCR8JNQk7CUUJVAlwCZQJaAlFCSIJ/AjgCNsIzgi9CLgIpAhxCFsIRggcCN0HnAdxB2AHQQcnBxIH/gbrBusG6wbrBusGkgmyCdIJ7QnyCfAJ/gkTCjIKUwpoCnsKqwrdCuAK6woCCyALQAtgC5kL4AsTDEQMegyBDHAMUAweDPcL2QvFC7ILpAucC5gLlwuWC5ULlAuSC5ELkQuUC5sLpQuzC8ML1QvoC/wLmQtpC1ELQQsUC+0KwwqjCo4KfgpzCmkKVwpCCiwKKwonCh0KDQr3CdsJxAm0CakJmgmGCW8JXQlICTIJFwn/COwI3gjJCKwIlAiACF4ITQg9CDEIJQgaCBAIAAjzB+EHzQeoB4QHagdYB1AHTAdQB1YHZAd9B5oHuQfgBwMIIAg9CFYIcAiJCJwIsQjICOsIBQkcCS8JQwlSCWIJfwmjCcQJmAlvCVgJPAknCQ4J+wj3CPcI5AjaCKgIOggJCNUH2AfVB7kHhgdtB1MHOAceBwQH7AbrBusG6waiCb4J3wn6CQQKDQogCjkKUQpcCnkKjgqYCqAKsQrECt8K/QogC0sLogvmCx0MTwx0DIcMjgx7DF8MIgz6C+IL0AuuC5ILiguJC4kLiAuHC4YLhAuCC4MLhQuLC5ULowu2C8oL8gvaC4YLOQsbC/4K3QrCCqsKlgqFCncKaApWCj0KJAoOCv8J9QntCeQJ0AnCCbEJpAmZCYQJdAljCVQJOQkbCf0I5wjSCLsIpgiSCHsIXghDCDYILAgfCBIIBgjyB+IHvgeeB38HdQdsB2UHXQdeB2QHcAeHB6IHwwfuBxMILghGCF0IdAiQCKQIuQjUCO0IDQknCUEJUglfCW8JhwmzCdUJ8AnBCbwJsgmRCVsJWAlHCSMJBQnXCJ4IYAgwCDYIRwgsCBMI6ge/B6IHjwdzB1kHNgcZBwUH7gbrBqAJsQnBCdYJ6gn5CQcKFworCj4KUwpgCm8KhAqbCrQK0ArxCh8LXguyC+MLFQxQDIMMpQyZDJcMhAxhDDQMEgz2C8ILiQt/C3oLeAt3C3YLdQt0C3QLdQt3C3sLgguNC50LswvMC/MLwwt9Cx8L+wrmCswKsgqjCpIKewpnClcKQwowCiYKIQoWCgkK9gnhCc8JwAmsCZYJgwlwCV4JSAk2CSAJDgn7COIIwwirCI0IcAhbCFEITwg9CDYIGwgDCO8H2AfCB6QHhwdxB2wHZwdkB2MHbAeBB6EHxAfpBxEIMQhICGIIeQiQCKUIugjNCOgIAQkkCUkJXgljCXEJiQmnCdAJ+gkmCiUKEArXCZsJcQldCUQJHgn5CL8IogirCJ4IkwiHCHoITwgrCB8I5Ae7B6EHiwdyB1YHNAcdBwMHyAnPCdkJ7Qn4CQUKFwohCi8KSApSClwKcAqHCp4KuQrkCg0LQAuSC9ULEgxLDIUMvAy8DI4MagxQDDsMGgz5C9ELqwuKC3YLbQtqC2kLaAtoC2gLaQtqC2sLbQtwC3gLiQurC8kLzgvQC7sLiwstCwEL6QraCskKxgrSCs0KtQpxCmMKSgosChMKCgr5CecJ1gnICboJpwmRCYEJcwlfCVEJQAktCRoJ+QjgCNQIsgifCJgIlwiVCH8IeAheCDcIIAj0B88HpAeAB2oHZgdlB2UHZwd8B5oHvQfoBwwIKghDCFoIcAiHCJ4ItgjLCN8I9QgMCS8JTwloCYIJlQmxCdQJCQo4ClwKVwoVCsIJogmBCWUJSAklCQwJ8wjvCO8I/QjtCNkIvAisCI4IZgg9CAcI5QfNB9UHuAd6B1EHNQfHCdwJ7Qn6CRgKOApECkUKUgpdCmoKewqLCp8Ktwr7Cj0LZguhC9kLGgxADHAMpwylDH8MWQwlDA0M9QveC8sLsgugC34LZgtgC10LXQteC18LYAtgC18LXQtaC1gLXQtkC2ULYgtwC30LjAujC5ELYgtNCzoLGgsDC/AKwwqjCowKdApcCkcKOAotCiAKDwoCCukJyQm2CaQJlgmFCXkJbQliCVAJQAkhCRUJCAn/COYIzwi1CK4IpAiRCGgIPggTCO0HwwecB3kHaAdnB2cHaQd5B5cHtQfaBwUIIAg0CEsIXghyCIkIoAi3CM8I4wj/CB0JTQliCXkJmAm1CdwJDQo8CmIKfgpGCi4KHQrQCaQJiwmGCWAJTAlJCUoJQwk4CTMJHQkACeoI0gi0CG0IQAgpCBEIFwj5B+UHrgd1BxgKSApCCn4KrAqkCr8K3Aq6Cp8Kpwq2Cs0K/wopC1wLjwvCC/ELKQxcDH4Mrwy9DIUMZwxHDBoM+wvlC88LuguhC4wLawtcC1YLVAtVC1cLWQtZC1gLVQtQC0gLPws3CzALKAsgCyELLwtMC2QLgguNC3MLXgtBCxAL8grXCskKzAq8CrEKlAppClIKQAouCiMK/QnkCdIJxwm6CawJnwmUCYkJfQlqCV8JVwlCCS0JGgn5CNkIvQicCHQITwgkCP0H1AeuB44HcgdqB2oHagd3B4wHqQfKB+8HDQglCDoITwhiCHUIjAimCLoI0wj4CB0JPglWCXQJggmZCbQJ1Qn3CSgKUwp/CqgKmQpiCgUK9gn7CQAKzwmtCb4JsAmtCa4JqQmRCVYJLAkVCfAIygiLCHQIXghGCDwILAgRCOQHVgp8CqQK4woeC0QLAQsXCygLGgsTCxgLKgtLC3kLpQvQC/oLJwxRDGoMlwy+DKsMfAxWDC8MEgz8C+YLyQuuC5oLeQthC1QLTwtNC04LUAtRC1ELTwtKC0ELOAslCxoLEQv+CuoK6ArvCgMLHws0C1YLcQtdCx0L/grgCsYKrAqVCn8KbgpfCk8KRAo5CjEKKAojCigKKQokChkKDgr3CdwJwwmqCZQJfQlpCVMJNwkaCe8IyAilCH8IWwgyCAgI4we/B6IHiwd2B24HbgdwB4AHmwe6B+EH/gcVCCsIQAhYCGsIgAiPCKQIvAjUCPQIGwk2CUgJXAl2CZYJsgnSCfoJLgpWCn0KpArACm0KbwpvCmAKYQo5ChwKGgonCh4KCQr4CeYJtQl/CUEJJAn8CNgIrgifCI8IXQgRCOQHvgc="};

export const META = {
  "id": "hintertux",
  "name": "Hintertux Glacier",
  "region": "Zillertal, Tyrol",
  "country": "Austria",
  "available": true,
  "center": [
    11.66329,
    47.08189
  ],
  "zoom": 12.8,
  "pitch": 62,
  "bearing": 176,
  "bbox": [
    11.59,
    47,
    11.74,
    47.12
  ],
  "bases": [
    "talstation8ersommerber"
  ],
  "defaultBase": "talstation8ersommerber",
  "firstLift": 495,
  "lastDown": 1005,
  "stats": {
    "lifts": 20,
    "runs": 229,
    "km": 97,
    "top": 3242,
    "bottom": 1499,
    "valleys": 1
  },
  "blurb": "Austria's only year-round glacier. One road, one valley station, and three funitels stacked up the Tuxer Ferner to 3,250 m.",
  "published": {
    "lifts": 21,
    "top": 3250,
    "bottom": 1500
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
