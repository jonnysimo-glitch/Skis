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
 * Statuses worth asking again about.
 *
 * 429 is the one that matters: overpass-api.de gives a client two slots, so
 * three resorts in a row means the second and third arrive while the first is
 * still holding one. The first real run of the workflow fetched Monterosa and
 * came back with nothing at all for Kronplatz and Paganella, which is what
 * that looks like from the outside. 504 is the query timing out server-side,
 * 502 and 503 are the instance being restarted or overloaded — all of them
 * are "later", not "never", unlike a 403 from a network policy.
 */
const RETRYABLE = new Set([429, 502, 503, 504]);
const ATTEMPTS = 4;
const BACKOFF_MS = [5000, 20000, 45000];

/**
 * Overpass etiquette asks for a User-Agent that identifies the client, so an
 * operator can tell who is generating load and get in touch instead of just
 * blocking it.
 */
const USER_AGENT = "skis-route-planner/1.0 (+https://github.com/jonnysimo-glitch/Skis)";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
 *
 * The ways go out as `out geom`, not `out geom tags`. Overpass's `tags` mode
 * prints tags but omits a way's node references, and the node references are
 * what make a junction findable: a piste splits off another where the two
 * share an OSM node, and without refs there is nothing to compare. The first
 * real fetch came back with no refs, so every piste was one unsplittable
 * top-to-bottom edge and the mountain had no junctions at all. `out geom`
 * is body mode, which prints both.
 */
export function query(bbox, { timeout = 180 } = {}) {
  const [w, s, e, n] = bbox;
  const box = `${s},${w},${n},${e}`;
  return `[out:json][timeout:${timeout}];
(
  way["piste:type"="downhill"](${box});
  // Connectors: the skiweg round the back of a station, the traverse between
  // two valleys. Not runs, but very often the only mapped thing joining two
  // halves of a resort, and cheap to ask for while we are here.
  way["piste:type"="connection"](${box});
  way["aerialway"~"^(${LIFT_TYPES.join("|")})$"](${box});
);
out geom;
(
  node["aerialway"~"^(station|pylon)$"](${box});
  node["natural"="peak"](${box});
  node["mountain_pass"="yes"](${box});
);
out body;
// Somewhere to have lunch. The solver can be asked to route past one, so this
// is a feature of the graph rather than decoration.
//
// Four of these eight were missing for a long time, and the omission was
// specific to where this app operates. In Italy and South Tyrol the place you
// stop for a coffee and a panino is a BAR, tagged amenity=bar, and the query
// asked only for restaurant and cafe — so every one of them was invisible.
// Monterosa's own Bar Gabiet is in the graph only because somebody also
// tagged it a restaurant. pub, fast_food and biergarten are here for the same
// reason: the tag a mapper reaches for varies by country and by mood, and a
// skier looking for lunch does not care which one they picked.
(
  nwr["tourism"="alpine_hut"](${box});
  nwr["tourism"="wilderness_hut"](${box});
  nwr["amenity"="restaurant"](${box});
  nwr["amenity"="cafe"](${box});
  nwr["amenity"="bar"](${box});
  nwr["amenity"="pub"](${box});
  nwr["amenity"="fast_food"](${box});
  nwr["amenity"="biergarten"](${box});
);
out center tags;
// Where to hire skis. Not part of the routing, but it is the first thing
// somebody who flew in needs and the last thing they can find on a piste map.
// shop=rental with ski in the offer covers the Italian noleggio; shop=ski and
// a sports shop that hires are the other two ways OSM writes it. No backticks
// in here: these lines are inside the query's own template literal.
(
  nwr["shop"="ski"](${box});
  nwr["shop"="rental"]["rental"~"ski"](${box});
  nwr["shop"="sports"]["service:bicycle:rental"!~"."]["ski"="yes"](${box});
  nwr["amenity"="ski_rental"](${box});
);
out center tags;
// Where to leave the car, which is the other half of the mid-day case the
// whole app is built around: "your car is at Champoluc" only means something
// if the app knows where at Champoluc.
//
// All of them, not only the named ones. The first version asked for a name or
// a capacity on the reasoning that an unnamed six-space layby is noise, and it
// is — but so is the rule, because the car park at the bottom of a lift is
// very often a polygon somebody traced with neither tag on it, and that is the
// single most important one at the whole resort. What separates the two is not
// the tags, it is whether anyone bothered to draw it: a layby is a node, a
// real car park is an area. The out line below returns the element type, so
// the filter downstream can use it, and it still keeps only what is near a
// base. (No backticks in this comment: it is inside the template literal.)
(
  nwr["amenity"="parking"](${box});
);
out center tags;`;
}

const cachePath = (id) => new URL(`../../data/osm/${id}.json`, import.meta.url).pathname;

/**
 * Why a cached export cannot be used, or null if it can.
 *
 * The cache is keyed only by resort id, so it long outlives the query that
 * produced it. This is the one check that matters: without a way's node
 * references the graph builder cannot find a single junction, and it refuses
 * to build at all — so noticing here and re-fetching is the difference between
 * a green run and a person having to work out why.
 */
/**
 * What a query asks OSM for, as a sorted list of the tags it selects on.
 *
 * The whole query is the wrong fingerprint: it carries the bounding box, so it
 * changes when the box nudges and matches nothing when the formatting does.
 * The tag selectors are the question — `["amenity"="parking"]` is a different
 * question from not asking at all, and that is exactly the difference this has
 * to notice.
 */
export function asked(resort) {
  if (!resort?.bbox) return null;
  return [...new Set(
    (query(resort.bbox).match(/\[[^\]]*"[^\]]*\]/g) ?? []).map((t) => t.trim())
  )].sort().join(" ");
}

export function staleReason(raw, resort = null) {
  if (!raw?.elements?.length) return "no elements";
  // A widened bounding box makes the cache the wrong shape, not just old.
  // Kronplatz held 19 of its 32 published lifts because the box stopped short
  // of St Vigil, and without this the next run would have rebuilt the same
  // truncated mountain from disk and never asked Overpass for the rest.
  if (resort?.bbox && Array.isArray(raw.bbox) && raw.bbox.length === 4) {
    const moved = resort.bbox.some((v, i) => Math.abs(v - raw.bbox[i]) > 1e-6);
    if (moved) {
      return `fetched for a different bounding box (${raw.bbox.join(", ")})`;
    }
  }
  /*
   * A cache answers the question it was asked, and only that one.
   *
   * Adding `amenity=parking` to the query changed nothing for a long time and
   * would have gone on changing nothing: the cache is keyed by resort id, the
   * staleness check only looked at shape and bounding box, so every later run
   * — including the monthly one on CI, which has the network this sandbox does
   * not — would have read a file fetched before parking was ever asked for and
   * emitted no car parks at all, with no error anywhere. A cache from an older
   * question is not old data, it is the wrong data.
   *
   * An export from before this field existed counts as a different question
   * too, and the first version of this check exempted it — which meant the
   * check could not fire at all. Every export on disk predated the field, so
   * every one of them took the exemption, and the CI run that was supposed to
   * pick up the car parks read all four from cache and pushed nothing. The
   * cost of not exempting them is one re-fetch per resort, once, on the runner
   * that has the network; the cost of exempting them is that the parking query
   * never runs.
   */
  if (resort?.bbox && raw.asked !== asked(resort)) {
    return raw.asked
      ? "fetched for a different query, so it cannot answer this one"
      : "fetched before the query was recorded, so it cannot be shown to answer this one";
  }
  const ways = raw.elements.filter((el) => el.type === "way" && el.geometry);
  if (!ways.length) return "no ways with geometry";
  if (!ways.some((el) => Array.isArray(el.nodes) && el.nodes.length)) {
    return "fetched with `out geom tags`, so it carries no node references";
  }
  return null;
}

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
    const stale = staleReason(raw, resort);
    if (!stale) return { ...raw, source: "cache", path };
    // A cache written by an older query is worse than no cache: it looks like
    // data and builds a graph that is quietly wrong. Monterosa's first export
    // was fetched with `out geom tags` and had no node references at all, so a
    // re-run would have rebuilt the same junctionless mountain from disk and
    // never asked Overpass again.
    if (offline) {
      // A bounding box that has moved is a reason to refetch, not a reason to
      // refuse: the cached export is still real data, just covering less than
      // the config now asks for. A widened query is the same shape of problem
      // — the cache answers a narrower question than the one being asked, and
      // narrower is not wrong. Both say so loudly and carry `narrow` so the
      // caller knows what it is holding. Anything else — an export with no
      // node references, say — cannot build at all and still stops here.
      if (/bounding box|different query|before the query was recorded/.test(stale)) {
        console.log(`  cache       ${stale}; building from what is cached`);
        return { ...raw, source: "cache", path, narrow: true };
      }
      throw new Error(
        `The cached OSM data for "${resort.id}" is stale: ${stale}\n` +
          `  Re-fetch it with:  npm run resort -- ${resort.id} --force\n` +
          `  Or delete ${path} and run the Resort data workflow.`
      );
    }
    console.log(`  cache       stale (${stale}), re-fetching`);
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
    for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
      if (attempt) {
        const pause = BACKOFF_MS[attempt - 1];
        console.log(`  waiting     ${pause / 1000}s before retrying ${new URL(url).host}`);
        await wait(pause);
      }
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": USER_AGENT,
          },
          body: new URLSearchParams({ data: body }),
        });
        if (!res.ok) {
          tried.push(`${url} -> HTTP ${res.status}`);
          if (RETRYABLE.has(res.status)) continue;
          break; // a 403 or a 400 will say the same thing however long we wait
        }
        // Overpass reports some failures as an HTML page with a 200, so the
        // status alone is not enough to know the body is a result.
        const text = await res.text();
        let json;
        try {
          json = JSON.parse(text);
        } catch {
          const snippet = text.trim().slice(0, 120).replace(/\s+/g, " ");
          tried.push(`${url} -> 200 but not JSON: ${snippet}`);
          continue;
        }
        if (!json.elements?.length) { tried.push(`${url} -> empty result`); continue; }
        json.fetchedAt = new Date().toISOString();
        json.bbox = resort.bbox;
        // What was asked for, so a later run can tell whether the question
        // has changed. See `asked` in staleReason.
        json.asked = asked(resort);
        await mkdir(dirname(path), { recursive: true });
        await writeFile(path, JSON.stringify(json));
        return { ...json, source: url, path };
      } catch (error) {
        tried.push(`${url} -> ${error.message}`);
      }
    }
  }

  throw new Error(
    `Could not reach any Overpass mirror.\n  ${tried.join("\n  ")}\n\n` +
      `A 403 on every mirror is a network policy, not an outage, and no amount\n` +
      `of retrying gets round it. Two ways out:\n\n` +
      `  1. Run it where the internet is open. The Resort data workflow in\n` +
      `     .github/workflows/resort-data.yml does exactly this on a GitHub\n` +
      `     runner and commits the result back. Actions tab, Run workflow.\n\n` +
      `  2. Fetch it from a phone: open fetch-resort-data.html on the\n` +
      `     deployed site, tap the resort, and save the file to\n` +
      `     ${path}. Then re-run with --offline.`
  );
}
