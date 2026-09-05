/**
 * Ski Center Latemar — resort graph.
 *
 * GENERATED. Do not edit by hand: run `npm run resort -- latemar` instead.
 *
 * Source:    OpenStreetMap via the Overpass API, 2026-09-05T17:27:45.976Z
 * Elevation: AWS Terrain Tiles (terrarium), zoom 13
 * Licence:   OSM data is ODbL. Attribution is required wherever this is shown.
 *
 * What had to be assumed:
 *   - 1 piste had no piste:difficulty and were taken as red
 *   - 96 runs were unnamed and are described by their endpoints
 *   - 59 nodes, 18 lifts and 67 runs were outside the largest strongly connected component and were dropped
 *   - endpoints within 60 m of each other were treated as the same place
 *
 * NOT from OpenStreetMap, because it is not in there: last-lift times and
 * queue estimates. Those come from the resort and are the numbers behind the
 * app's promise that nothing will strand you, so they are listed separately in
 * scripts/resorts/latemar.json rather than buried in the graph.
 *
 * Node coordinates are [lat, lon]. They exist so the 3D layer can place the
 * graph on real terrain; the solver itself never reads them.
 */

export const NODES = {
  tresca:                 { name: "Tresca",                                          lat: 46.34241, lon: 11.54933, alt: 1865, area: "Latemar" },
  passofeudo:             { name: "Passo Feudo",                                     lat: 46.34676, lon: 11.55893, alt: 2165, area: "Latemar", rifugio: true },
  stalimen:               { name: "Stalimen",                                        lat: 46.32772, lon: 11.60205, alt: 1058, area: "Latemar", base: true },
  gardone:                { name: "Gardonè",                                         lat: 46.34083, lon: 11.57815, alt: 1664, area: "Latemar", rifugio: true },
  gardone2:               { name: "Gardonè",                                         lat: 46.33965, lon: 11.57746, alt: 1648, area: "Latemar", base: true },
  ochsenweide:            { name: "Ochsenweide",                                     lat: 46.38294, lon: 11.52491, alt: 1539, area: "Obereggen" },
  laner:                  { name: "Laner",                                           lat: 46.37200, lon: 11.53303, alt: 1816, area: "Obereggen", rifugio: true },
  obereggen:              { name: "Obereggen",                                       lat: 46.38363, lon: 11.52701, alt: 1553, area: "Obereggen", base: true, rifugio: true },
  oberholz:               { name: "Oberholz",                                        lat: 46.37177, lon: 11.54244, alt: 2055, area: "Obereggen", rifugio: true },
  laner2:                 { name: "Laner",                                           lat: 46.36723, lon: 11.53112, alt: 1738, area: "Obereggen", rifugio: true },
  maierl:                 { name: "Maierl",                                          lat: 46.36347, lon: 11.54837, alt: 2142, area: "Obereggen" },
  palasanta:              { name: "Pala Santa",                                      lat: 46.34966, lon: 11.54253, alt: 1939, area: "Obereggen" },
  obereggenpassodipampea: { name: "Obereggen;Passo di Pampeago - Reiterjoch",        lat: 46.35341, lon: 11.53687, alt: 2018, area: "Obereggen" },
  monteagnello:           { name: "Monte Agnello",                                   lat: 46.34218, lon: 11.54133, alt: 1777, area: "Obereggen", base: true, rifugio: true },
  latemar:                { name: "Latemar",                                         lat: 46.35072, lon: 11.54772, alt: 2010, area: "Latemar", rifugio: true },
  monteagnello2:          { name: "Monte Agnello",                                   lat: 46.33384, lon: 11.54793, alt: 2159, area: "Latemar", rifugio: true },
  tresca2:                { name: "Tresca",                                          lat: 46.33100, lon: 11.55737, alt: 2209, area: "Latemar", rifugio: true },
  palasanta2:             { name: "Pala Santa",                                      lat: 46.34731, lon: 11.52745, alt: 2307, area: "Obereggen" },
  camposcuolalatemar:     { name: "Campo Scuola Latemar",                            lat: 46.34686, lon: 11.54493, alt: 1955, area: "Latemar" },
  camposcuolalatemar2:    { name: "Campo Scuola Latemar",                            lat: 46.34944, lon: 11.54826, alt: 1993, area: "Latemar", rifugio: true },
  camposcuolagardone:     { name: "Campo Scuola Gardonè",                            lat: 46.34184, lon: 11.57413, alt: 1731, area: "Latemar" },
  campanil:               { name: "Campanil",                                        lat: 46.35141, lon: 11.54889, alt: 2042, area: "Latemar" },
  p43:                    { name: "Below Pala Santa",                                lat: 46.34787, lon: 11.53168, alt: 2233, area: "Obereggen", named: false },
  p44:                    { name: "Above Pala Santa",                                lat: 46.34567, lon: 11.52048, alt: 2413, area: "Obereggen", named: false },
  p50:                    { name: "Eben junction",                                   lat: 46.38235, lon: 11.53305, alt: 1657, area: "Obereggen", named: false },
  p52:                    { name: "Above Obereggen",                                 lat: 46.38449, lon: 11.52963, alt: 1591, area: "Obereggen", named: false },
  p53:                    { name: "Above Obereggen",                                 lat: 46.38412, lon: 11.53070, alt: 1601, area: "Obereggen", named: false },
  reiterjoch:             { name: "Reiterjoch",                                      lat: 46.35865, lon: 11.53314, alt: 1858, area: "Obereggen" },
  p57:                    { name: "Below Maierl",                                    lat: 46.36031, lon: 11.54300, alt: 2015, area: "Latemar", named: false },
  p58:                    { name: "Above Reiterjoch",                                lat: 46.35718, lon: 11.53977, alt: 1936, area: "Obereggen", named: false },
  reiterjoch2:            { name: "Reiterjoch",                                      lat: 46.35884, lon: 11.53455, alt: 1863, area: "Obereggen" },
  p60:                    { name: "Below Campo Scuola Latemar",                      lat: 46.34873, lon: 11.54588, alt: 1978, area: "Latemar", rifugio: true, named: false },
  p68:                    { name: "Below Pala Santa",                                lat: 46.34906, lon: 11.53058, alt: 2246, area: "Obereggen", named: false },
  ochsenweide2:           { name: "Ochsenweide",                                     lat: 46.38160, lon: 11.52550, alt: 1576, area: "Obereggen" },
  p71:                    { name: "Below Ochsenweide",                               lat: 46.37489, lon: 11.53218, alt: 1773, area: "Obereggen", named: false },
  p72:                    { name: "Below Maierl",                                    lat: 46.36382, lon: 11.54556, alt: 2093, area: "Obereggen", named: false },
  p73:                    { name: "Above Laner",                                     lat: 46.36637, lon: 11.53333, alt: 1763, area: "Obereggen", named: false },
  p74:                    { name: "Below Monte Agnello",                             lat: 46.33775, lon: 11.54915, alt: 2016, area: "Latemar", rifugio: true, named: false },
  p75:                    { name: "Above Monte Agnello",                             lat: 46.34014, lon: 11.54605, alt: 1891, area: "Latemar", named: false },
  p76:                    { name: "Above Campo Scuola Gardonè",                      lat: 46.34193, lon: 11.56588, alt: 1942, area: "Latemar", named: false },
  p77:                    { name: "Above Campo Scuola Gardonè",                      lat: 46.34324, lon: 11.56907, alt: 1846, area: "Latemar", named: false },
  p78:                    { name: "Above Tresca",                                    lat: 46.33804, lon: 11.55302, alt: 1974, area: "Latemar", named: false },
  p79:                    { name: "Below Campo Scuola Latemar",                      lat: 46.34670, lon: 11.55098, alt: 1963, area: "Latemar", named: false },
  camposcuolagardone2:    { name: "Campo Scuola Gardonè",                            lat: 46.34086, lon: 11.57544, alt: 1687, area: "Latemar" },
  p81:                    { name: "Below Monte Agnello",                             lat: 46.33693, lon: 11.55074, alt: 2010, area: "Latemar", named: false },
  p82:                    { name: "Below Oberholz",                                  lat: 46.37257, lon: 11.53927, alt: 1967, area: "Obereggen", named: false },
  ochsenweide3:           { name: "Ochsenweide",                                     lat: 46.37328, lon: 11.53343, alt: 1817, area: "Obereggen", rifugio: true },
  p84:                    { name: "Above Campo Scuola Gardonè",                      lat: 46.34203, lon: 11.56931, alt: 1853, area: "Latemar", named: false },
  camposcuolagardone3:    { name: "Campo Scuola Gardonè",                            lat: 46.34131, lon: 11.57261, alt: 1750, area: "Latemar" },
  p88:                    { name: "Above Monte Agnello",                             lat: 46.34276, lon: 11.54401, alt: 1806, area: "Latemar", named: false },
  p89:                    { name: "Below Tresca",                                    lat: 46.33268, lon: 11.55612, alt: 2122, area: "Latemar", named: false },
  p90:                    { name: "Above Reiterjoch;Passo di Pampeago - Reiterjoch", lat: 46.34937, lon: 11.53457, alt: 2120, area: "Obereggen", named: false },
  obereggen2:             { name: "Obereggen",                                       lat: 46.35060, lon: 11.54018, alt: 1959, area: "Obereggen" },
  p92:                    { name: "Above Reiterjoch;Passo di Pampeago - Reiterjoch", lat: 46.35105, lon: 11.53558, alt: 2055, area: "Obereggen", named: false },
  p108:                   { name: "Above Tresca",                                    lat: 46.34588, lon: 11.55114, alt: 1944, area: "Latemar", named: false },
  p109:                   { name: "Residenza junction",                              lat: 46.34991, lon: 11.55279, alt: 2072, area: "Latemar", named: false },
  camposcuolalatemar3:    { name: "Campo Scuola Latemar",                            lat: 46.34926, lon: 11.54705, alt: 1990, area: "Latemar", rifugio: true },
  latemar2:               { name: "Latemar",                                         lat: 46.35154, lon: 11.54623, alt: 2010, area: "Latemar", rifugio: true },
  campanil2:              { name: "Campanil",                                        lat: 46.34963, lon: 11.54431, alt: 1966, area: "Latemar" },
  reiterjochpassodipampe: { name: "Reiterjoch;Passo di Pampeago - Reiterjoch",       lat: 46.35334, lon: 11.53550, alt: 2016, area: "Obereggen" },
  latemar3:               { name: "Latemar",                                         lat: 46.35007, lon: 11.54760, alt: 2000, area: "Latemar", rifugio: true },
  p117:                   { name: "Above Tresca",                                    lat: 46.33971, lon: 11.55209, alt: 1932, area: "Latemar", named: false },
  p118:                   { name: "Above Tresca",                                    lat: 46.33951, lon: 11.54861, alt: 1927, area: "Latemar", named: false },
  p119:                   { name: "Above Monte Agnello",                             lat: 46.34272, lon: 11.54490, alt: 1812, area: "Latemar", named: false },
  monteagnello3:          { name: "Monte Agnello",                                   lat: 46.34179, lon: 11.54242, alt: 1794, area: "Obereggen", rifugio: true },
  p125:                   { name: "Torre di Pisa junction",                          lat: 46.34340, lon: 11.57056, alt: 1811, area: "Latemar", named: false },
  p126:                   { name: "Below Tresca",                                    lat: 46.33545, lon: 11.55468, alt: 2049, area: "Latemar", named: false },
  palasanta3:             { name: "Pala Santa",                                      lat: 46.34893, lon: 11.54153, alt: 1928, area: "Obereggen" },
  p128:                   { name: "Oberholz junction",                               lat: 46.37290, lon: 11.53552, alt: 1884, area: "Obereggen", named: false },
  ochsenweide4:           { name: "Ochsenweide",                                     lat: 46.37397, lon: 11.53284, alt: 1792, area: "Obereggen" },
  palasanta4:             { name: "Pala Santa",                                      lat: 46.34813, lon: 11.52789, alt: 2288, area: "Obereggen" },
  passofeudosatteljoch:   { name: "Passo Feudo - Satteljoch",                        lat: 46.34497, lon: 11.55919, alt: 2110, area: "Latemar" },
  p132:                   { name: "Below Passo Feudo - Satteljoch",                  lat: 46.34317, lon: 11.56022, alt: 2074, area: "Latemar", named: false },
  p133:                   { name: "Agnello Alta junction",                           lat: 46.33584, lon: 11.54815, alt: 2090, area: "Latemar", named: false },
  p135:                   { name: "Below Maierl",                                    lat: 46.36142, lon: 11.54333, alt: 2027, area: "Latemar", rifugio: true, named: false },
  p137:                   { name: "Above Campo Scuola Gardonè",                      lat: 46.34450, lon: 11.56977, alt: 1833, area: "Latemar", named: false },
  p139:                   { name: "Above Reiterjoch",                                lat: 46.35861, lon: 11.53899, alt: 1919, area: "Obereggen", named: false },
  ochsenweide5:           { name: "Ochsenweide",                                     lat: 46.37278, lon: 11.53455, alt: 1855, area: "Obereggen", rifugio: true },
  p141:                   { name: "Below Monte Agnello",                             lat: 46.33520, lon: 11.54996, alt: 2067, area: "Latemar", named: false },
  p143:                   { name: "Below Reiterjoch",                                lat: 46.36319, lon: 11.53371, alt: 1810, area: "Obereggen", named: false },
  p145:                   { name: "Below Monte Agnello",                             lat: 46.33671, lon: 11.55204, alt: 2006, area: "Latemar", named: false },
};

/** [from, to, name, type, rideMinutes, lastUpMinuteOfDay, typicalQueueMinutes] */
export const LIFTS = [
  ["tresca", "passofeudo", "La Residenza - Passo Feudo", "chair", 6, 990, 2],
  ["stalimen", "gardone", "Stalimen - Gardonè", "gondola", 9, 990, 2],
  ["gardone2", "passofeudo", "Gardonè - Passo Feudo", "chair", 12, 990, 2],
  ["ochsenweide", "laner", "Ochsenweide", "gondola", 5, 990, 2],
  ["obereggen", "oberholz", "Obereggen - Oberholz", "chair", 13, 990, 3],
  ["laner2", "laner", "Telemix Laner", "gondola", 3, 990, 2],
  ["laner2", "maierl", "Absam - Maierl", "chair", 11, 990, 2],
  ["palasanta", "obereggenpassodipampea", "Obereggen", "chair", 5, 990, 2],
  ["monteagnello", "latemar", "Latemar", "gondola", 5, 990, 2],
  ["monteagnello", "monteagnello2", "Monte Agnello", "chair", 8, 990, 2],
  ["tresca", "tresca2", "Tresca", "chair", 11, 990, 3],
  ["palasanta", "palasanta2", "Pala di Santa", "chair", 9, 990, 2],
  ["camposcuolalatemar", "camposcuolalatemar2", "Campo Scuola Latemar", "chair", 4, 990, 3],
  ["gardone", "camposcuolagardone", "Campo Scuola Gardonè", "chair", 3, 990, 3],
  ["palasanta", "campanil", "Campanil", "chair", 4, 990, 3],
  ["p43", "p44", "Plateau", "drag", 8, 990, 4],
  ["obereggen", "p50", "Eben", "drag", 5, 990, 4],
  ["p52", "p53", "Kinderteppich", "carpet", 4, 990, 4],
  ["reiterjoch", "obereggenpassodipampea", "Reiterjoch", "chair", 3, 990, 2],
];

/** [from, to, name, difficulty, km, minutes] */
export const RUNS = [
  ["oberholz", "p82", "Oberholz", "red", 0.4, 2],
  ["p82", "p128", "Oberholz", "red", 0.3, 2],
  ["p128", "laner", "Oberholz", "red", 0.2, 2],
  ["maierl", "p72", "Variante Absam", "red", 0.3, 2],
  ["p72", "p57", "Variante Absam", "red", 0.5, 2],
  ["p58", "p139", "Collegamento Reiteralpe", "blue", 0.2, 2],
  ["p139", "reiterjoch2", "Collegamento Reiteralpe", "blue", 0.4, 2],
  ["obereggenpassodipampea", "obereggen2", "Pampeago", "blue", 0.4, 2],
  ["obereggen2", "palasanta", "Pampeago", "blue", 0.1, 2],
  ["p60", "palasanta", "Val Todesca", "red", 0.3, 2],
  ["palasanta", "palasanta3", "Val Todesca", "red", 0.1, 2],
  ["palasanta3", "monteagnello", "Val Todesca", "red", 0.8, 3],
  ["ochsenweide2", "obereggen", "Ochsenweide", "red", 0.2, 2],
  ["laner", "laner2", "Laner", "blue", 0.5, 2],
  ["laner", "ochsenweide4", "Obereggen", "red", 0.2, 2],
  ["ochsenweide4", "p71", "Obereggen", "red", 0.1, 2],
  ["p71", "obereggen", "Obereggen", "red", 1.1, 4],
  ["obereggen", "ochsenweide", "Obereggen", "red", 0.2, 2],
  ["p71", "ochsenweide2", "Ochsenweide", "red", 1, 3],
  ["ochsenweide2", "ochsenweide", "Ochsenweide", "red", 0.2, 2],
  ["p72", "p73", "Maierl", "red", 1.1, 4],
  ["reiterjoch2", "p143", "7 Skiweg Reiterjoch", "blue", 0.1, 2],
  ["p143", "p73", "7 Skiweg Reiterjoch", "blue", 0.1, 2],
  ["maierl", "p57", "Absam", "red", 0.6, 2],
  ["p57", "p139", "Absam", "red", 0.4, 2],
  ["p139", "p73", "Absam", "red", 0.9, 3],
  ["p73", "laner2", "Absam", "red", 0.1, 2],
  ["obereggenpassodipampea", "p58", "Toler", "blue", 0.6, 2],
  ["p58", "reiterjoch2", "Toler", "blue", 0.4, 2],
  ["reiterjoch2", "reiterjoch", "Toler", "blue", 0.1, 2],
  ["p44", "palasanta4", "Pala di Santa", "red", 0.6, 2],
  ["palasanta4", "p68", "Pala di Santa", "red", 0.2, 2],
  ["camposcuolalatemar2", "camposcuolalatemar3", "Campo Scuola Latemar", "blue", 0.1, 2],
  ["camposcuolalatemar3", "p60", "Campo Scuola Latemar", "blue", 0.1, 2],
  ["p60", "camposcuolalatemar", "Campo Scuola Latemar", "blue", 0.2, 2],
  ["p74", "p118", "Agnello Cengia", "red", 0.4, 2],
  ["p118", "p75", "Agnello Cengia", "red", 0.2, 2],
  ["p76", "p77", "Variante Cinque Nazioni", "red", 0.3, 2],
  ["p78", "tresca", "Down to Tresca", "red", 0.5, 2],
  ["p78", "tresca", "Down to Tresca", "red", 0.5, 2],
  ["camposcuolalatemar2", "p79", "Panoramica", "blue", 0.4, 2],
  ["tresca2", "p89", "Tresca", "red", 0.5, 2],
  ["p89", "p126", "Tresca", "red", 0.2, 2],
  ["p126", "p78", "Tresca", "red", 0.2, 2],
  ["p78", "p117", "Tresca", "red", 0.2, 2],
  ["p117", "tresca", "Tresca", "red", 0.4, 2],
  ["tresca", "p119", "Tresca", "red", 0.3, 2],
  ["p119", "p88", "Tresca", "red", 0.1, 2],
  ["p88", "monteagnello", "Tresca", "red", 0.1, 2],
  ["passofeudo", "passofeudosatteljoch", "Cinque Nazioni", "red", 0.2, 2],
  ["passofeudosatteljoch", "p76", "Cinque Nazioni", "red", 0.7, 2],
  ["p76", "p84", "Cinque Nazioni", "red", 0.2, 2],
  ["p84", "p77", "Cinque Nazioni", "red", 0.1, 2],
  ["p77", "camposcuolagardone3", "Cinque Nazioni", "red", 0.4, 2],
  ["camposcuolagardone3", "camposcuolagardone2", "Cinque Nazioni", "red", 0.2, 2],
  ["camposcuolagardone2", "gardone2", "Cinque Nazioni", "red", 0.1, 2],
  ["p74", "p75", "Agnello Muro", "black", 0.4, 2],
  ["passofeudo", "p125", "Torre di Pisa", "black", 1, 4],
  ["p125", "camposcuolagardone", "Torre di Pisa", "black", 0.3, 2],
  ["camposcuolagardone", "camposcuolagardone2", "Torre di Pisa", "black", 0.1, 2],
  ["monteagnello2", "p141", "Naturale Agnello", "red", 0.3, 2],
  ["p141", "p81", "Naturale Agnello", "red", 0.3, 2],
  ["p82", "ochsenweide3", "Variante Oberholz", "red", 0.8, 3],
  ["p84", "camposcuolagardone3", "Variante Slalom", "black", 0.2, 2],
  ["camposcuolalatemar", "p88", "Prà Erto", "black", 0.6, 2],
  ["obereggenpassodipampea", "reiterjochpassodipampe", "Zanggen 1", "red", 0.1, 2],
  ["reiterjochpassodipampe", "reiterjoch2", "Zanggen 1", "red", 0.7, 2],
  ["tresca2", "p89", "Variante Dossi", "black", 0.3, 2],
  ["p90", "obereggen2", "Variante Bosco", "black", 0.4, 2],
  ["p68", "p92", "Muro Pala di Santa", "black", 0.4, 2],
  ["p108", "tresca", "Panoramica", "blue", 0.8, 3],
  ["p50", "p53", "Eben", "blue", 0.3, 2],
  ["p53", "p52", "Eben", "blue", 0.1, 2],
  ["p52", "obereggen", "Eben", "blue", 0.2, 2],
  ["p53", "p52", "Kinderpiste-Eben", "blue", 0.1, 2],
  ["campanil", "latemar", "Campanil 1", "blue", 0.1, 2],
  ["latemar", "campanil2", "Campanil 1", "blue", 0.3, 2],
  ["campanil2", "palasanta", "Campanil 1", "blue", 0.1, 2],
  ["campanil", "latemar", "Campanil", "blue", 0.1, 2],
  ["latemar", "latemar3", "Campanil", "blue", 0.1, 2],
  ["latemar3", "camposcuolalatemar3", "Campanil", "blue", 0.1, 2],
  ["latemar", "camposcuolalatemar2", "27 Panoramica", "blue", 0.1, 2],
  ["latemar2", "campanil2", "Selftime Campanil", "red", 0.2, 2],
  ["p109", "p79", "Residenza", "red", 0.4, 2],
  ["p79", "p108", "Residenza", "red", 0.1, 2],
  ["p108", "tresca", "Residenza", "red", 0.4, 2],
  ["p68", "p43", "Pala di Santa", "red", 0.2, 2],
  ["p92", "reiterjochpassodipampe", "Collegamento Zanggen", "red", 0.2, 2],
  ["latemar", "latemar3", "Latemar link", "blue", 0.1, 2],
  ["p117", "tresca", "Variante Val della Pigna", "red", 0.4, 2],
  ["p118", "p119", "Agnello Malga", "red", 0.5, 2],
  ["camposcuolagardone", "gardone", "Campo Scuola Gardonè", "blue", 0.3, 2],
  ["p90", "p92", "Pala di Santa", "red", 0.2, 2],
  ["p77", "p125", "Above Campo Scuola Gardonè to Torre di Pisa", "red", 0.2, 2],
  ["camposcuolagardone2", "gardone", "Campo Scuola Gardonè to Gardonè", "blue", 0.1, 2],
  ["p126", "p78", "Variante Muro Tresca", "black", 0.2, 2],
  ["monteagnello2", "p133", "Agnello Alta", "red", 0.3, 2],
  ["p133", "p74", "Agnello Alta", "red", 0.2, 2],
  ["p74", "p81", "Agnello Alta", "red", 0.1, 2],
  ["p81", "p78", "Agnello Alta", "red", 0.1, 2],
  ["p92", "obereggen2", "Pala di Santa", "red", 0.3, 2],
  ["obereggen2", "palasanta3", "Pala di Santa", "red", 0.2, 2],
  ["p128", "ochsenweide3", "Oberholz", "red", 0.2, 2],
  ["ochsenweide3", "ochsenweide4", "Oberholz", "red", 0.1, 2],
  ["p126", "p78", "Selftime Tresca", "red", 0.4, 2],
  ["p75", "monteagnello3", "Agnello Canalone", "red", 0.3, 2],
  ["monteagnello3", "monteagnello", "Agnello Canalone", "red", 0.1, 2],
  ["palasanta2", "palasanta4", "Pala di Santa", "red", 0.1, 2],
  ["passofeudo", "passofeudosatteljoch", "Cinque Nazioni", "red", 0.2, 2],
  ["p132", "p77", "Below Passo Feudo - Satteljoch to Above Campo Scuola Gardonè", "red", 0.8, 3],
  ["p84", "p77", "Above Campo Scuola Gardonè link", "red", 0.1, 2],
  ["p132", "p84", "Below Passo Feudo - Satteljoch to Above Campo Scuola Gardonè", "red", 0.8, 2],
  ["camposcuolagardone", "camposcuolagardone2", "Campo Scuola Gardonè link", "blue", 0.2, 2],
  ["camposcuolagardone", "camposcuolagardone2", "Campo Scuola Gardonè link", "blue", 0.7, 2],
  ["p133", "p141", "Agnello Alta to Below Monte Agnello", "red", 0.1, 2],
  ["p141", "p145", "Below Monte Agnello link", "red", 0.2, 2],
  ["p145", "p78", "Below Monte Agnello to Above Tresca", "red", 0.1, 2],
  ["p81", "p78", "Below Monte Agnello to Above Tresca", "red", 0.1, 2],
  ["p133", "p81", "Agnello Alta to Below Monte Agnello", "red", 0.2, 2],
  ["monteagnello2", "p133", "Monte Agnello to Agnello Alta", "red", 0.6, 2],
  ["monteagnello2", "p133", "Monte Agnello to Agnello Alta", "red", 0.1, 2],
  ["obereggenpassodipampea", "obereggen2", "Obereggen;Passo di Pampeago - Reiterjoch to Obereggen", "blue", 0.7, 2],
  ["obereggenpassodipampea", "obereggen2", "Obereggen;Passo di Pampeago - Reiterjoch to Obereggen", "blue", 0.4, 2],
  ["p74", "p81", "Below Monte Agnello link", "red", 0.2, 2],
  ["p133", "p74", "Agnello Alta to Below Monte Agnello", "red", 0.2, 2],
  ["p133", "p81", "Agnello Alta to Below Monte Agnello", "red", 0.4, 2],
  ["tresca", "monteagnello", "Tresca to Monte Agnello", "red", 0.8, 3],
  ["tresca", "monteagnello", "Tresca to Monte Agnello", "red", 0.6, 2],
  ["p89", "p126", "Below Tresca link", "red", 0.2, 2],
  ["p109", "p108", "Residenza to Above Tresca", "red", 0.5, 2],
  ["p109", "p108", "Residenza to Above Tresca", "red", 0.6, 2],
  ["passofeudo", "p137", "Passo Feudo to Above Campo Scuola Gardonè", "black", 0.9, 3],
  ["passofeudo", "p137", "Passo Feudo to Above Campo Scuola Gardonè", "black", 0.9, 3],
  ["camposcuolagardone3", "camposcuolagardone2", "Campo Scuola Gardonè link", "red", 0.1, 2],
  ["camposcuolagardone3", "camposcuolagardone2", "Campo Scuola Gardonè link", "red", 0.6, 2],
  ["passofeudo", "p132", "Passo Feudo to Below Passo Feudo - Satteljoch", "red", 0.8, 3],
  ["passofeudo", "p132", "Passo Feudo to Below Passo Feudo - Satteljoch", "red", 0.4, 2],
  ["p135", "p139", "Below Maierl to Above Reiterjoch", "red", 0.5, 2],
  ["maierl", "p139", "Maierl to Above Reiterjoch", "red", 0.9, 3],
  ["maierl", "p135", "Down from Maierl", "red", 0.5, 2],
  ["p139", "reiterjoch2", "Down to Reiterjoch", "blue", 0.4, 2],
  ["p139", "reiterjoch2", "Down to Reiterjoch", "blue", 0.3, 2],
  ["p72", "p73", "Below Maierl to Above Laner", "red", 1, 3],
  ["p72", "p73", "Below Maierl to Above Laner", "red", 1.1, 4],
  ["maierl", "p72", "Down from Maierl", "red", 0.3, 2],
  ["maierl", "p72", "Down from Maierl", "red", 0.3, 2],
  ["gardone", "gardone2", "Gardonè link", "red", 0.1, 2],
  ["p126", "p78", "Below Tresca to Above Tresca", "red", 0.2, 2],
  ["p145", "p78", "Below Monte Agnello to Above Tresca", "red", 0.1, 2],
  ["p126", "p145", "Below Tresca to Below Monte Agnello", "red", 0.3, 2],
  ["campanil2", "camposcuolalatemar", "Campanil to Campo Scuola Latemar", "blue", 1.2, 4],
  ["campanil2", "palasanta", "Campanil to Pala Santa", "blue", 0.1, 2],
  ["p60", "palasanta", "Below Campo Scuola Latemar to Pala Santa", "blue", 0.6, 2],
  ["p60", "camposcuolalatemar", "Down to Campo Scuola Latemar", "blue", 0.2, 2],
  ["p68", "p92", "Below Pala Santa to Above Reiterjoch;Passo di Pampeago - Reiterjoch", "black", 0.6, 2],
  ["p68", "p92", "Below Pala Santa to Above Reiterjoch;Passo di Pampeago - Reiterjoch", "black", 0.4, 2],
  ["p92", "obereggen2", "Above Reiterjoch;Passo di Pampeago - Reiterjoch to Obereggen", "red", 0.3, 2],
  ["obereggen2", "palasanta3", "Obereggen to Pala Santa", "red", 0.1, 2],
  ["p92", "palasanta3", "Above Reiterjoch;Passo di Pampeago - Reiterjoch to Pala Santa", "red", 0.6, 2],
  ["oberholz", "ochsenweide4", "Oberholz to Ochsenweide", "red", 0.9, 3],
  ["ochsenweide3", "ochsenweide4", "Ochsenweide link", "red", 0.1, 2],
  ["ochsenweide5", "ochsenweide3", "Ochsenweide link", "red", 0.1, 2],
  ["p128", "ochsenweide5", "Oberholz to Ochsenweide", "red", 0.1, 2],
  ["oberholz", "p128", "Oberholz link", "red", 0.5, 2],
  ["ochsenweide3", "ochsenweide4", "Ochsenweide link", "red", 0.1, 2],
  ["ochsenweide3", "laner", "Ochsenweide to Laner", "red", 0.1, 2],
  ["p77", "camposcuolagardone3", "Down to Campo Scuola Gardonè", "red", 0.3, 2],
  ["p77", "camposcuolagardone3", "Down to Campo Scuola Gardonè", "red", 0.4, 2],
  ["p84", "camposcuolagardone3", "Down to Campo Scuola Gardonè", "black", 0.2, 2],
  ["p84", "camposcuolagardone3", "Down to Campo Scuola Gardonè", "black", 0.3, 2],
  ["p137", "camposcuolagardone", "Down to Campo Scuola Gardonè", "black", 0.5, 2],
  ["camposcuolagardone", "camposcuolagardone2", "Campo Scuola Gardonè link", "black", 0.1, 2],
  ["p137", "camposcuolagardone2", "Down to Campo Scuola Gardonè", "black", 0.6, 2],
  ["p60", "palasanta3", "Below Campo Scuola Latemar to Pala Santa", "red", 0.3, 2],
  ["palasanta", "palasanta3", "Pala Santa link", "red", 0.1, 2],
  ["p60", "palasanta", "Below Campo Scuola Latemar to Pala Santa", "red", 0.2, 2],
  ["p126", "p78", "Below Tresca to Above Tresca", "black", 0.3, 2],
  ["p126", "p78", "Below Tresca to Above Tresca", "black", 0.2, 2],
  ["tresca2", "p89", "Down from Tresca", "black", 0.1, 2],
  ["tresca2", "p89", "Down from Tresca", "black", 0.3, 2],
  ["p75", "monteagnello", "Down to Monte Agnello", "red", 0.6, 2],
  ["p75", "monteagnello", "Down to Monte Agnello", "red", 0.4, 2],
  ["p74", "p75", "Below Monte Agnello to Above Monte Agnello", "black", 0.3, 2],
  ["p74", "p75", "Below Monte Agnello to Above Monte Agnello", "black", 0.3, 2],
  ["p72", "p135", "Below Maierl link", "red", 0.3, 2],
  ["p72", "p135", "Below Maierl link", "red", 0.3, 2],
  ["p139", "laner2", "Above Reiterjoch to Laner", "red", 1.2, 4],
  ["p73", "laner2", "Down to Laner", "red", 0.1, 2],
  ["p139", "p73", "Above Reiterjoch to Above Laner", "red", 0.9, 3],
  ["laner", "laner2", "Laner link", "blue", 0.6, 2],
  ["laner", "laner2", "Laner link", "blue", 0.5, 2],
  ["ochsenweide5", "laner", "Ochsenweide to Laner", "red", 0.1, 2],
  ["p128", "laner", "Oberholz to Laner", "red", 0.2, 2],
  ["p128", "ochsenweide5", "Oberholz to Ochsenweide", "red", 0.1, 2],
  ["obereggenpassodipampea", "p139", "Obereggen;Passo di Pampeago - Reiterjoch to Above Reiterjoch", "blue", 0.6, 2],
  ["obereggenpassodipampea", "p139", "Obereggen;Passo di Pampeago - Reiterjoch to Above Reiterjoch", "blue", 0.7, 2],
  ["campanil", "latemar2", "Campanil 2", "blue", 0.2, 2],
  ["latemar2", "palasanta", "Campanil 2", "blue", 0.4, 2],
  ["reiterjochpassodipampe", "reiterjoch", "Zanggen 2", "red", 0.7, 2],
  ["p141", "p78", "Naturale Allenamento", "red", 0.3, 2],
  ["reiterjoch2", "p143", "Skiweg Reiterjoch", "blue", 0.1, 2],
  ["p143", "p73", "Skiweg Reiterjoch", "blue", 0.1, 2],
  ["monteagnello2", "p141", "Naturale Allenamento", "black", 0.2, 2],
  ["monteagnello2", "p141", "Down from Monte Agnello", "black", 0.2, 2],
  ["monteagnello2", "p141", "Down from Monte Agnello", "black", 0.2, 2],
  ["passofeudo", "p109", "Residenza", "red", 0.6, 4],
  ["p68", "p90", "20 Pala di Santa", "red", 0.7, 4],
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
  ["Absam Restaurant", "restaurant", 46.36685, 11.5306, 1732],
  ["Baita della Scofa", "restaurant", 46.3501, 11.54733, 2000],
  ["Baita Ganis Gardoné The Mountain Riviera", "restaurant", 46.34045, 11.57928, 1650],
  ["Baita Passo Feudo Hütte", "restaurant", 46.34718, 11.55948, 2168],
  ["Chalet Caserina", "restaurant", 46.33785, 11.54988, 2007],
  ["Epircher Laner Alm - Malga Epircher Laner", "restaurant", 46.37251, 11.53352, 1827],
  ["Ganischger Alm", "restaurant", 46.35122, 11.54642, 2004],
  ["Gasthof Specker", "restaurant", 46.38432, 11.52515, 1546],
  ["In.Treska", "restaurant", 46.33151, 11.55807, 2191],
  ["Latemar Hütte", "restaurant", 46.34822, 11.54515, 1971],
  ["Mayrl Alm", "restaurant", 46.36172, 11.54371, 2037],
  ["Oberholz Hütte", "restaurant", 46.37164, 11.54258, 2060],
  ["Platzl Mountain Lounge", "restaurant", 46.38365, 11.52644, 1549],
  ["Rifugio Monte Agnello", "hut", 46.33367, 11.54779, 2165],
  ["Ski Bar", "cafe", 46.34154, 11.54098, 1773],
  ["Sport Alm Ristorante & Bistrò", "restaurant", 46.38421, 11.52648, 1555],
  ["Weigler Schupf", "restaurant", 46.35819, 11.54071, 1949],
  ["Zischgalm", "restaurant", 46.34972, 11.54802, 1996],
];

export const DIFFICULTY_RANK = { blue: 1, red: 2, black: 3 };

export const SHORT_NAMES = {};

/**
 * How the app lists and frames this resort. Derived from the graph above and
 * scripts/resorts/latemar.json at build time, so adding a resort does not mean
 * hand-typing a camera position.
 */
export const META = {
  "id": "latemar",
  "name": "Ski Center Latemar",
  "region": "Trentino / South Tyrol",
  "country": "Italy",
  "available": true,
  "center": [
    11.56126,
    46.35611
  ],
  "zoom": 13,
  "pitch": 62,
  "bearing": -72,
  "bbox": [
    11.4,
    46.27,
    11.65,
    46.42
  ],
  "bases": [
    "stalimen",
    "gardone2",
    "obereggen",
    "monteagnello"
  ],
  "defaultBase": "obereggen",
  "firstLift": 510,
  "lastDown": 1020,
  "stats": {
    "lifts": 19,
    "runs": 207,
    "km": 73,
    "top": 2413,
    "bottom": 1058,
    "valleys": 2
  },
  "blurb": "Obereggen, Pampeago and Predazzo, three villages linked around the Latemar.",
  "published": {
    "lifts": 18,
    "runs": 48,
    "top": 2400,
    "bottom": 1000
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
