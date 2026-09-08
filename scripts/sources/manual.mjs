/**
 * Places checked by hand, from the resort's own config.
 *
 * A source with no network in it, and the reason it exists is a shop that is
 * not in OpenStreetMap. Rent and Go in Brunico is a real hire shop a hundred
 * metres from the Kronplatz gondola; a deliberately broad sweep of the OSM
 * export — anything tagged ski, sport, rental or outdoor, or named
 * rent-and-go, noleggio or verleih — finds six hire shops at Kronplatz and it
 * is not among them. No widening of the query produces something the map does
 * not contain, and OSM is edited by whoever turns up.
 *
 * So there has to be a way to add one, and it has to be a way that cannot
 * quietly become a way to invent one. Hence:
 *
 *   - every entry needs a `note` saying where it was checked, and the build
 *     refuses the whole resort if one is missing. A curated coordinate with
 *     no provenance is the thing this must never ship;
 *   - it goes through the same merge as any other source, so it cannot
 *     overwrite what OSM knows and cannot land on top of an existing place;
 *   - it is credited in PLACE_SOURCES and marked on the place itself, so
 *     check-places knows not to look for it in the export and a reader can
 *     see which pins are not from the map.
 *
 * CLAUDE.md already says where this ends up: queue times and last-lift times
 * are not in OSM and need resort partnerships, which is the business model.
 * This is the same shape of fact arriving the same way, by hand, until there
 * is somebody to ask.
 */
export const id = "manual";
export const label = "Checked by hand";
export const attribution = "Checked by hand";

const KINDS = new Set(["hut", "restaurant", "cafe", "rental", "parking"]);

/** Only where the config has actually listed something. */
export function covers(bbox, config) {
  return Array.isArray(config?.extraPlaces) && config.extraPlaces.length > 0;
}

/**
 * One entry, validated.
 *
 * Throws rather than skips. A typo in a hand-written coordinate is a person
 * walking to the wrong end of a village in ski boots, and the difference
 * between that and no entry at all is worth stopping a build over.
 */
export function toPlace(entry, where = "extraPlaces") {
  const at = `${where}: ${entry?.name ?? "(unnamed)"}`;
  if (!entry || typeof entry.name !== "string" || !entry.name.trim()) {
    throw new Error(`${at} — every entry needs a name`);
  }
  if (!KINDS.has(entry.kind)) {
    throw new Error(`${at} — kind must be one of ${[...KINDS].join(", ")}, not ${entry.kind}`);
  }
  if (!Number.isFinite(entry.lat) || !Number.isFinite(entry.lon)) {
    throw new Error(`${at} — needs a numeric lat and lon`);
  }
  if (Math.abs(entry.lat) > 90 || Math.abs(entry.lon) > 180) {
    throw new Error(`${at} — lat ${entry.lat}, lon ${entry.lon} is not on Earth`);
  }
  if (typeof entry.note !== "string" || entry.note.trim().length < 8) {
    throw new Error(
      `${at} — needs a note saying where this was checked. A coordinate ` +
      `typed by hand with no provenance is exactly what this must not ship.`
    );
  }
  return {
    name: entry.name.trim(),
    kind: entry.kind,
    lat: entry.lat,
    lon: entry.lon,
    spaces: Number.isFinite(entry.spaces) ? entry.spaces : null,
    fee: entry.fee === "yes" || entry.fee === "no" ? entry.fee : null,
    covered: entry.covered === true ? true : null,
    drawn: false,
    source: id,
    note: entry.note.trim(),
  };
}

/** No fetch, no cache, no offline mode: the answer is in the config. */
export async function fetchPlaces(config) {
  const rows = Array.isArray(config?.extraPlaces) ? config.extraPlaces : [];
  const places = rows.map((entry) => toPlace(entry, `${config?.id ?? "resort"}.extraPlaces`));
  return { places, from: "the resort config" };
}
