/**
 * Talking to OpenStreetMap.
 *
 * One query per resort, bounded by a bounding box, asking for the two things a
 * ski graph is made of: downhill pistes and aerialways. `out geom` returns the
 * full coordinate list inline, which is what the graph builder needs — without
 * it we would have to resolve node references in a second pass.
 *
 * Responses are cached on disk under data/osm/. OSM is a volunteer project
 * running donated hardware, and re-running a build should not re-ask them for
 * data that has not changed. It also means the build is reproducible offline
 * and in CI once the cache is warm.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname } from "node:path";

/**
 * Mirrors, in order. The main instance is rate-limited and often busy; the
 * others are volunteer mirrors running the same software.
 */
export const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.osm.ch/api/interpreter",
];

/**
 * Aerialway values that carry a skier uphill.
 *
 * `goods` and `pylon` are not lifts. `zip_line` is not a lift either, whatever
 * the resort marketing says.
 */
export const LIFT_TYPES = [
  "cable_car", "gondola", "mixed_lift", "chair_lift",
  "drag_lift", "t-bar", "j-bar", "platter", "rope_tow",
  "magic_carpet", "funicular",
];

/**
 * The query.
 *
 * Pistes and lifts as ways, plus aerialway station nodes, which is where the
 * good names live: a gondola way is often named for the lift while its top
 * station is named for the place, and the place is what a skier is told.
 */
export function query(bbox, { timeout = 180 } = {}) {
  const [w, s, e, n] = bbox;
  const box = `${s},${w},${n},${e}`;
  return `[out:json][timeout:${timeout}];
(
  way["piste:type"="downhill"](${box});
  way["aerialway"~"^(${LIFT_TYPES.join("|")})$"](${box});
);
out geom tags;
(
  node["aerialway"~"^(station|pylon)$"](${box});
  node["natural"="peak"](${box});
  node["mountain_pass"="yes"](${box});
);
out body;
// Somewhere to have lunch. The solver can be asked to route past one, so this
// is a feature of the graph rather than decoration.
(
  nwr["tourism"="alpine_hut"](${box});
  nwr["tourism"="wilderness_hut"](${box});
  nwr["amenity"="restaurant"](${box});
  nwr["amenity"="cafe"](${box});
);
out center tags;`;
}

const cachePath = (id) => new URL(`../../data/osm/${id}.json`, import.meta.url).pathname;

/**
 * Fetch a resort's raw OSM data, or read it from the cache.
 *
 * `force` re-fetches. `offline` fails loudly rather than reaching the network,
 * which is what a build in a sandbox or CI wants: a silent fallback to stale
 * data is how you ship a graph that does not match the mountain any more.
 */
export async function fetchResort(resort, { force = false, offline = false, endpoint } = {}) {
  const path = cachePath(resort.id);

  if (!force && existsSync(path)) {
    const raw = JSON.parse(await readFile(path, "utf8"));
    return { ...raw, source: "cache", path };
  }
  if (offline) {
    throw new Error(
      `No cached OSM data for "${resort.id}" and --offline was set.\n` +
        `  Run without --offline, or put an Overpass export at ${path}.\n` +
        `  The query to run is printed by: npm run resort:query -- ${resort.id}`
    );
  }

  const body = query(resort.bbox);
  const tried = [];
  for (const url of endpoint ? [endpoint] : ENDPOINTS) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ data: body }),
      });
      if (!res.ok) { tried.push(`${url} -> HTTP ${res.status}`); continue; }
      const json = await res.json();
      if (!json.elements?.length) { tried.push(`${url} -> empty result`); continue; }
      json.fetchedAt = new Date().toISOString();
      json.bbox = resort.bbox;
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, JSON.stringify(json));
      return { ...json, source: url, path };
    } catch (error) {
      tried.push(`${url} -> ${error.message}`);
    }
  }

  throw new Error(
    `Could not reach any Overpass mirror.\n  ${tried.join("\n  ")}\n\n` +
      `If this environment blocks OSM, run the query in a browser at\n` +
      `https://overpass-turbo.eu, export as GeoJSON->raw JSON, and save it to\n` +
      `${path}. Then re-run with --offline.`
  );
}
