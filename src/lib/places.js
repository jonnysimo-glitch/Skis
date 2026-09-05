/**
 * Saying what a mountain restaurant is, briefly.
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
  while (changed) {
    changed = false;
    for (const word of CATEGORY) {
      const lead = new RegExp(`^${word}[\\s'’\\-.,]+`, "i");
      const tail = new RegExp(`[\\s'’\\-.,]+${word}$`, "i");
      if (lead.test(out) && out.replace(lead, "").trim()) { out = out.replace(lead, "").trim(); changed = true; }
      else if (tail.test(out) && out.replace(tail, "").trim()) { out = out.replace(tail, "").trim(); changed = true; }
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
  const what = kind === "rental" ? BY_KIND.rental : implied?.[1] ?? BY_KIND[kind] ?? "Mountain restaurant";
  return Number.isFinite(alt) ? `${what}, ${alt.toLocaleString()} m` : what;
}
