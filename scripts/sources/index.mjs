/**
 * Where a place can come from, and what happens when two sources know it.
 *
 * OpenStreetMap is the base and will stay the base: it is the only source that
 * covers every resort in the Alps, and it is the one that has the geometry. It
 * is also, for car parks, mostly an outline with no facts attached — a mapper
 * tracing an aerial photograph can see the shape of the tarmac and not the
 * sign beside it. Someone has to have counted the spaces, and the people who
 * counted are the province and the resort, not the map.
 *
 * So: OSM says where, other sources say what, and this file is the rule for
 * when they disagree.
 *
 * The rule is field by field rather than record by record. A merged car park
 * keeps OSM's position, because OSM's position is a traced polygon's centroid
 * and the other source's is wherever the operator dropped their pin, and takes
 * the other source's capacity, because OSM does not have one. Neither source
 * wins outright, and each fact remembers who supplied it.
 *
 * Licensing, since mixing sources is where that stops being abstract. OSM is
 * ODbL, which is share-alike on a derived database; the Open Data Hub mobility
 * data is CC0, which imposes nothing. Taking a CC0 capacity into an ODbL-
 * derived graph leaves the result under ODbL, which is what this project
 * already publishes it as. A source under a licence that forbids that — most
 * commercial parking APIs, and Google Places, whose terms forbid caching what
 * this pipeline exists to cache — cannot be added here whatever its coverage.
 */
import * as opendatahub from "./opendatahub.mjs";

/** Every source that is not OpenStreetMap. Order is precedence, best first. */
export const SOURCES = [opendatahub];

const R = 6371000;
const rad = (d) => (d * Math.PI) / 180;
const metres = (a, b) => {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon) * Math.cos(rad((a.lat + b.lat) / 2));
  return Math.hypot(dLat, dLon) * R;
};

/**
 * How near two records have to be to be the same car park.
 *
 * A hundred and twenty metres. A car park is not a point: OSM gives the
 * centroid of a traced polygon and an operator gives the entrance or the
 * ticket machine, and at a resort those are routinely eighty metres apart at
 * opposite ends of the same tarmac. Tighter and the same car park arrives
 * twice, which is worse than either error — two pins a stone's throw apart,
 * one of them with a capacity, and no way for a driver to tell they are one
 * place. Wider and two genuinely separate car parks at the same base merge.
 */
export const MATCH_M = 120;

/**
 * Fold a source's places into OSM's, in place of nothing and beside everything.
 *
 * Returns the merged list and a report of what happened, because "the source
 * answered and added nothing" and "the source did not answer" look identical
 * in the output and are completely different facts about the run.
 */
export function merge(base, incoming, { sourceId, matchM = MATCH_M } = {}) {
  const out = base.map((p) => ({ ...p }));
  const report = { added: 0, enriched: 0, ignored: 0 };

  for (const extra of incoming) {
    // Only against places of the same kind: a restaurant fifty metres from a
    // car park is not that car park.
    let best = null;
    let near = matchM;
    for (const p of out) {
      if (p.kind !== extra.kind) continue;
      const d = metres(p, extra);
      if (d < near) { near = d; best = p; }
    }
    if (!best) {
      out.push({ ...extra });
      report.added++;
      continue;
    }
    /*
     * Fill the gaps, do not overwrite.
     *
     * The other source is better informed about capacity and price and worse
     * informed about where the tarmac is, and there is no case where throwing
     * away a fact OSM has in favour of the same fact from elsewhere is worth
     * the risk of the match being wrong. So a field is taken only where the
     * base has none, and the record says which fields came from where.
     */
    let took = false;
    for (const key of ["spaces", "fee", "covered", "name"]) {
      if ((best[key] === null || best[key] === undefined) &&
          extra[key] !== null && extra[key] !== undefined) {
        best[key] = extra[key];
        (best.from ||= {})[key] = sourceId;
        took = true;
      }
    }
    if (took) report.enriched++;
    else report.ignored++;
  }
  return { places: out, report };
}

/**
 * Ask every source that covers this resort, and merge what comes back.
 *
 * One line per source in the run log, always — including the ones that had
 * nothing, because "Open Data Hub: nothing within the box" is the answer to
 * whether it was worth adding, and it can only be read if it is printed.
 */
export async function enrich(places, config, { offline = false, force = false } = {}) {
  let merged = places;
  const lines = [];
  for (const source of SOURCES) {
    if (!source.covers(config.bbox)) continue;
    const { places: found, skipped, from } = await source.fetchPlaces(config, { offline, force });
    if (skipped) {
      lines.push(`  ${source.id.padEnd(12)}${skipped}`);
      continue;
    }
    const { places: next, report } = merge(merged, found, { sourceId: source.id });
    merged = next;
    lines.push(`  ${source.id.padEnd(12)}${found.length} from ${from}, ` +
      `${report.added} new, ${report.enriched} filled in, ${report.ignored} already known`);
  }
  return { places: merged, lines };
}
