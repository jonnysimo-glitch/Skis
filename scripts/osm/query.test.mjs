/**
 * The Overpass query, checked without asking Overpass.
 *
 * This exists because a syntax error in overpass.mjs reached a commit. Nothing
 * in `npm test` imported the module — the graph tests take an export as input
 * and never build a query — so `node -c` was the only thing that would have
 * caught it and nothing ran `node -c`. The build did, eventually, which is the
 * wrong place to find out.
 *
 * The fault itself is worth naming, because the file warns about it in a
 * comment three lines above where it happened: the query is one long template
 * literal, so a backtick anywhere inside it, including inside a comment,
 * closes the string. Importing the module at all would have caught that. The
 * rest of this asks whether the query still requests what the pipeline reads.
 */
import { readdirSync, readFileSync } from "node:fs";
import { query, asked } from "./overpass.mjs";

let ran = 0;
let bad = 0;
const check = (name, ok, detail = "") => {
  ran++;
  if (!ok) bad++;
  console.log(`  ${ok ? "ok  " : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
};

const dir = new URL("../resorts/", import.meta.url).pathname;
const configs = readdirSync(dir)
  .filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(readFileSync(dir + f, "utf8")));

check("there are resort configs to build a query for", configs.length > 0, `${configs.length}`);

for (const config of configs) {
  const q = query(config.bbox);
  const box = config.bbox.join(",");
  // Overpass wants the box south, west, north, east — the opposite order to
  // the way this project stores it, which is exactly the sort of thing that
  // silently returns an empty set rather than an error.
  const [w, s, e, n] = config.bbox;
  check(`${config.id}: the box is written the way Overpass reads it`,
    q.includes(`${s},${w},${n},${e}`), `config has ${box}`);
  check(`${config.id}: brackets balance`,
    (q.match(/\(/g) ?? []).length === (q.match(/\)/g) ?? []).length &&
    (q.match(/\[/g) ?? []).length === (q.match(/\]/g) ?? []).length,
    `${(q.match(/\(/g) ?? []).length} ( and ${(q.match(/\)/g) ?? []).length} )`);
  /*
   * Every statement ends in an out line, or the data never comes back.
   *
   * Counted rather than matched: a query with four groups and three outs
   * returns three of them and no error at all, which is how a resort ends up
   * with no ski hire and nobody able to say why.
   */
  const groups = (q.match(/^\($/gm) ?? []).length;
  const outs = (q.match(/^out /gm) ?? []).length;
  check(`${config.id}: every group is followed by an out`, outs >= groups,
    `${groups} groups, ${outs} outs`);

  // And what it asks for, one line per thing the pipeline downstream reads.
  for (const [what, needle] of [
    ["downhill pistes", '["piste:type"="downhill"]'],
    // Named, not bare: the query lists the aerialway values it will accept, so
    // that a via ferrata or a goods line does not become a way up the hill.
    ["lifts", '["aerialway"~"^(cable_car|gondola|'],
    ["places to eat", '["amenity"="restaurant"]'],
    ["ski hire", '["shop"="ski"]'],
    ["car parks", '["amenity"="parking"]'],
  ]) {
    check(`${config.id}: asks for ${what}`, q.includes(needle), needle);
  }
  // Node references, without which the graph builder cannot find a junction.
  check(`${config.id}: asks for node references, not just geometry`,
    /out geom .*qt|out body/.test(q) && !/^out geom tags$/m.test(q),
    q.split("\n").filter((l) => l.startsWith("out ")).join(" / "));
}

/*
 * And the fingerprint, which is what makes a widened query re-fetch rather
 * than read a cache that cannot answer it.
 */
{
  const a = asked(configs[0]);
  check("the fingerprint lists the tags asked for", Boolean(a) && a.includes('["amenity"="parking"]'), a);
  check("and is the same for the same question", asked(configs[0]) === a);
  check("and does not change when only the box moves",
    asked({ ...configs[0], bbox: configs[0].bbox.map((v) => v + 0.01) }) === a);
}

console.log(bad ? `\n  ${bad} FAILING of ${ran} query checks\n` : `\n  all ${ran} query checks passed\n`);
process.exit(bad ? 1 : 0);
