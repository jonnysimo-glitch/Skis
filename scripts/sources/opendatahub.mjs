/**
 * Car parks from the Open Data Hub South Tyrol.
 *
 * The second source, and the reason there is a source layer at all.
 *
 * OpenStreetMap knows where almost every car park in the Alps is and very
 * often nothing else about it — roughly a third carry a name and fewer carry a
 * capacity, because a mapper tracing an aerial photograph can see the outline
 * and not the sign. The province of South Tyrol publishes the signs: an
 * official, openly licensed mobility API with the capacity of each facility
 * and, for the ones wired up through SKIDATA, how many spaces are free right
 * now. Two of the four resorts — Kronplatz and Latemar — are inside it.
 *
 * Only the static half is used here. Live occupancy is a real thing this API
 * offers and the wrong thing to bake into a resort file: the app is offline
 * first, a committed graph is read on a lift with no signal, and a number that
 * was true at build time is worse than no number. It belongs to a runtime
 * fetch, later, that degrades to silence.
 *
 * API: https://mobility.api.opendatahub.com/v2/ (Time Series API v2)
 * Licence: CC0 for the mobility datasets. Attribution is not required and is
 * given anyway, in the resort file's header and in Settings, because a person
 * looking at a capacity should be able to see who counted.
 *
 * Not reachable from the machine this was written on — the egress policy
 * refuses it, the same way it refuses Overpass — so this runs where the OSM
 * fetch runs, in .github/workflows/resort-data.yml, and caches its answer
 * beside the OSM export.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";

export const id = "opendatahub";
export const label = "Open Data Hub South Tyrol";
export const attribution = "Open Data Hub South Tyrol (CC0)";

const BASE = "https://mobility.api.opendatahub.com/v2";

/**
 * Which resorts this source can answer for.
 *
 * A bounding box rather than a list of ids, so a South Tyrolean resort added
 * later picks the source up without anyone remembering to.
 *
 * Tested against the resort's centre, not its overlap. Overlap was the first
 * try and it claimed Paganella, whose box reaches 46.24 N and so grazes the
 * bottom of the province by two kilometres of empty valley — while Andalo,
 * Molveno and the whole ski area sit in Trentino, which this API does not
 * cover and which has an open data portal of its own. A resort is in one
 * province. Its centre says which.
 *
 * The province, from its own boundary: 10.38–12.48 E, 46.22–47.10 N.
 */
const PROVINCE = [10.38, 46.22, 12.48, 47.1];
export function covers(bbox) {
  if (!Array.isArray(bbox) || bbox.length !== 4) return false;
  const lon = (bbox[0] + bbox[2]) / 2;
  const lat = (bbox[1] + bbox[3]) / 2;
  return lon >= PROVINCE[0] && lon <= PROVINCE[2] && lat >= PROVINCE[1] && lat <= PROVINCE[3];
}

const cachePath = (resortId) =>
  new URL(`../../data/sources/${resortId}-${id}.json`, import.meta.url).pathname;

/**
 * The query.
 *
 * `bbi` is the API's own bounding-box filter and takes the box in the order
 * this project already stores it, west, south, east, north, plus the SRID.
 * `limit=-1` is how the API says "all of them"; a resort box returns tens of
 * records, not thousands.
 */
export const url = (bbox) =>
  `${BASE}/flat/ParkingStation?limit=-1&distinct=true` +
  `&select=scode,sname,scoordinate,smetadata,sorigin` +
  `&where=scoordinate.bbi.(${bbox.join(",")},4326)`;

/**
 * One record, as this project's place shape.
 *
 * `smetadata` is free-form per origin, so every field here is looked for in
 * more than one place and allowed to be absent. A station with no coordinate
 * is dropped rather than guessed at.
 */
export function toPlace(rec) {
  const lat = rec?.scoordinate?.y;
  const lon = rec?.scoordinate?.x;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const m = rec.smetadata ?? {};
  const capacity = Number.parseInt(m.capacity ?? m.totalPlaces ?? m.slots, 10);
  const fee = m.free === true ? "no" : m.free === false ? "yes" : null;
  return {
    name: rec.sname || null,
    kind: "parking",
    lat,
    lon,
    spaces: Number.isFinite(capacity) && capacity > 0 ? capacity : null,
    fee,
    covered: m.covered === true || /parkhaus|garage|multi.?storey|interrat/i.test(rec.sname ?? "")
      ? true
      : null,
    // A record somebody publishes is evidence in itself: nobody registers a
    // passing place with the province.
    drawn: true,
    source: id,
    origin: rec.sorigin ?? null,
  };
}

/**
 * Fetch, or read what was fetched last time.
 *
 * Fails soft on purpose. A source that is down, rate limited or has changed
 * shape must not cost the resort its OpenStreetMap graph — the whole point of
 * a second source is that it adds to the first. The reason comes back with the
 * result so the run log can say what was and was not asked.
 */
export async function fetchPlaces(config, { offline = false, force = false } = {}) {
  const path = cachePath(config.id);
  if (!covers(config.bbox)) {
    return { places: [], skipped: "outside South Tyrol" };
  }
  if (!force) {
    try {
      const raw = JSON.parse(await readFile(path, "utf8"));
      if (Array.isArray(raw.data) && raw.asked === url(config.bbox)) {
        return { places: raw.data.map(toPlace).filter(Boolean), from: "cache" };
      }
    } catch { /* no cache, or a cache for a different box */ }
  }
  if (offline) return { places: [], skipped: "offline, and nothing cached for this box" };

  try {
    const res = await fetch(url(config.bbox), {
      headers: { accept: "application/json", "user-agent": "slalom-route-planner/1.0" },
    });
    if (!res.ok) return { places: [], skipped: `HTTP ${res.status}` };
    const body = await res.json();
    const data = body?.data ?? [];
    await mkdir(new URL("../../data/sources/", import.meta.url).pathname, { recursive: true });
    await writeFile(path, `${JSON.stringify({
      asked: url(config.bbox),
      fetchedAt: new Date().toISOString(),
      data,
    }, null, 1)}\n`);
    return { places: data.map(toPlace).filter(Boolean), from: "network" };
  } catch (err) {
    return { places: [], skipped: err.message };
  }
}
