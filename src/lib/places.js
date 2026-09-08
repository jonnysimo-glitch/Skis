/**
 * Saying what a place on the mountain is, briefly.
 *
 * OSM names carry their own category: "Bar Ristorante Ostafa", "Gipfel
 * Restaurant Cima", "Baita Rifugio Belvedere". On a marker beside a piste that
 * is three words of noise around the one word a skier is looking for, and it
 * is the same three words on every marker. So the category comes off the name
 * and becomes the description, where it is useful once rather than repeated
 * twenty times.
 */

/**
 * The words that are a category rather than a name, in the four languages
 * these mountains are mapped in. Longest first, so "Tavola Calda" is taken
 * before "Bar".
 */
const CATEGORY = [
  "gipfel restaurant", "tavola calda", "bar ristorante", "ristorante bar",
  "restaurant", "ristorante", "ristoro", "rifugio", "berghütte", "berghutte",
  "hütte", "hutte", "baita", "malga", "chalet", "gasthof", "gasthaus",
  "alm", "stube", "café", "cafe", "caffè", "caffe", "bar", "kiosk", "imbiss",
  "skihütte", "skibar", "apres ski", "après ski",
  /*
   * And the car park words, which arrived with the parking layer and read far
   * worse than the restaurant ones, because a car park is named after the
   * thing beside it and OSM writes the whole sign: "Parcheggio Riservato
   * Klein Finnland" is thirty-five characters of which fourteen are the name.
   * Over a mountain at navigation zoom that is a sentence lying across three
   * pistes.
   *
   * The access qualifier goes with the category word rather than staying on
   * the name — "riservato", "privato", "pubblico", "coperto". Whether you may
   * park there and what it costs is a fact about the car park, and the
   * decision on this app is that those facts are not carried in the label at
   * all: the marker gives you the place and a Maps link, and Maps knows the
   * rest. A four-word label that is three words of small print is the version
   * of that decision nobody made on purpose.
   */
  "parcheggio riservato", "parcheggio pubblico", "parcheggio privato",
  "parcheggio coperto", "parcheggio multipiano", "park and ride", "park & ride",
  "parcheggio", "parkplatz", "parkhaus", "tiefgarage", "autosilo",
  "car park", "parking", "garage", "p+r",
];

/** What the category words said, so the description can say it instead. */
const IMPLIED = [
  [/rifugio|baita|h[üu]tte|berg|alm|malga/i, "Mountain hut"],
  [/gipfel/i, "Summit restaurant"],
  [/ristorante|restaurant|tavola calda/i, "Restaurant"],
  [/bar|caff|caf[eé]|apr|kiosk|imbiss/i, "Bar"],
];

const BY_KIND = {
  hut: "Mountain hut",
  restaurant: "Mountain restaurant",
  cafe: "Bar",
  rental: "Ski hire",
  parking: "Parking",
};

/**
 * The name with its category words taken off the front and back.
 *
 * Never returns nothing: a place actually called "Rifugio" keeps its name,
 * because a blank marker is worse than a repeated word.
 */
export function shortName(name) {
  let out = String(name || "").trim();
  let stripped = false;
  let changed = true;
  /*
   * What is left has to be a name, not a leftover.
   *
   * "Parking 1" is four car parks at Latemar and the category word is most of
   * it; taking it off leaves "1", which is not a shorter name for anything.
   * It is also, since the route gained numbered step badges, a label that
   * reads as step one of the day sitting in a village car park. A remainder
   * with no letter in it is not a name, so the word stays.
   */
  const keeps = (s) => /\p{L}/u.test(s);
  while (changed) {
    changed = false;
    for (const word of CATEGORY) {
      const lead = new RegExp(`^${word}[\\s'’\\-.,]+`, "i");
      const tail = new RegExp(`[\\s'’\\-.,]+${word}$`, "i");
      if (lead.test(out) && keeps(out.replace(lead, "").trim())) { out = out.replace(lead, "").trim(); changed = true; }
      else if (tail.test(out) && keeps(out.replace(tail, "").trim())) { out = out.replace(tail, "").trim(); changed = true; }
      if (changed) { stripped = true; break; }
    }
  }
  // The article the category word was carrying. "Bar Tavola Calda Del Crest"
  // leaves "Del Crest", and the run is called Crest.
  //
  // Only when a category word actually came off. "Le Sapin" and "La Mandria"
  // are the names of the places, not articles in front of them, and stripping
  // unconditionally turned them into Sapin and Mandria.
  if (stripped) {
    const shorter = out.replace(/^(del(la|lo|le|l')?|dei|degli|di|du|de|des|la|le|il|lo|zum|zur|am)\s+/i, "").trim();
    if (shorter) out = shorter;
  }
  // Quotes around a name are how OSM writes a sign, and they are not part of
  // the name: Bar "Passo da Mania'" is Passo da Mania'.
  out = out.replace(/^["“”'`]+|["“”'`]+$/g, "").trim();
  /*
   * A capital where the category word used to be.
   *
   * "Parcheggio inferiore funivia" is a real name and taking the first word
   * off it leaves "inferiore funivia", which on a marker looks like a bug
   * rather than a place. The first letter was mid-sentence and now starts
   * one, so it gets the case that goes with the position.
   *
   * Only when something actually came off, and only the first character:
   * anything cleverer would retitle "Klein Finnland" or "d'Otro", which are
   * spelled the way they are spelled.
   */
  if (stripped && /^[a-zà-ÿ]/.test(out)) out = out[0].toUpperCase() + out.slice(1);
  return out || String(name || "").trim();
}

/**
 * One line under the name: what kind of place it is, and how high.
 *
 * The height is the point of it on a mountain. "Rifugio" tells you what it is;
 * "Rifugio, 2,275 m" tells you whether it is on your way down.
 */
export function describe(name, kind, alt) {
  const stripped = String(name || "").slice(0, String(name || "").length - shortName(name).length);
  const implied = IMPLIED.find(([re]) => re.test(stripped) || re.test(String(name || "")));
  // A rental or a car park is what its kind says. Everything else can be read
  // off its own name — "Rifugio Gabiet" is a hut whatever OSM tagged it.
  const what = kind === "rental" || kind === "parking"
    ? BY_KIND[kind]
    : implied?.[1] ?? BY_KIND[kind] ?? "Mountain restaurant";
  return Number.isFinite(alt) ? `${what}, ${alt.toLocaleString()} m` : what;
}
