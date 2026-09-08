/**
 * Nothing in here may point at one particular computer.
 * Run with: npm run test:portable
 *
 * This exists because of a single day lost to four characters.
 *
 * `scripts/check-mapping.mjs` imported its dependencies by absolute path —
 * /home/user/Skis/scripts/osm/graph.mjs — which resolves on the machine it was
 * written on and on no other. It ran there, its tests passed there, and it was
 * added to `npm test`. `npm test` is the gate in the Pages workflow, so from
 * that moment every deploy died before it built anything, and GitHub Pages
 * went on serving the last artifact that had made it through. That artifact
 * had a map key and real satellite imagery, so the live site looked healthy
 * and merely old, which is indistinguishable from a phone holding a cached
 * copy. Three people checked three devices over an evening. Nothing was wrong
 * with any of them.
 *
 * A path is portable if it is relative to the file that uses it, to the
 * package root, or built from import.meta.url. Anything rooted in somebody's
 * home directory is a note about where the author happened to be sitting.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;

/** Somebody's home, on the three systems this could be written on. */
const PERSONAL = /(?:^|[\s"'`(=])(\/home\/[a-z][\w.-]*|\/Users\/[A-Za-z][\w.-]*|\/root)\//g;

/** Where committed code lives. dist and node_modules are outputs, not source. */
const LOOK_IN = ["scripts", "src", ".github"];
const SKIP = new Set(["node_modules", "dist", "dist-single", "dist-ssr", ".git"]);
const CODE = /\.(mjs|js|jsx|ts|tsx|json|yml|yaml|css|html)$/;

const files = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full);
    else if (CODE.test(name)) files.push(full);
  }
};
for (const dir of LOOK_IN) {
  try { walk(join(ROOT, dir)); } catch { /* not every tree has all of them */ }
}

const found = [];
for (const file of files) {
  // This file names the pattern it is looking for, and would otherwise be its
  // own only finding.
  if (file.endsWith("check-portable.mjs")) continue;
  const text = readFileSync(file, "utf8");
  text.split("\n").forEach((line, i) => {
    PERSONAL.lastIndex = 0;
    const hit = PERSONAL.exec(line);
    if (hit) found.push(`${relative(ROOT, file)}:${i + 1}  ${hit[1]}/…`);
  });
}

console.log(`  ${found.length ? "FAIL" : "ok  "}  ${files.length} files carry no path to one particular computer`);
for (const f of found.slice(0, 12)) console.log(`        ${f}`);
if (found.length > 12) console.log(`        ...and ${found.length - 12} more`);
if (found.length) {
  console.log("\n  A path under someone's home directory resolves on their machine and");
  console.log("  nowhere else. Use a path relative to the file, or import.meta.url.\n");
}
process.exit(found.length ? 1 : 0);
