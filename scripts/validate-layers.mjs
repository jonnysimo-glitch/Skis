/**
 * Check the route layer paint expressions.
 *
 * These layers only run when a MapTiler key is present, which is exactly the
 * path least likely to be exercised in development. Parsing is not enough:
 * `["case", ["get", "done"], ...]` parses cleanly, then throws a type error on
 * every feature it touches. MapLibre catches that, warns once, and silently
 * substitutes the property's default — so the layer is added, the route draws
 * at full opacity, and the dimming of already-skied segments quietly does
 * nothing. Hence `evaluateWithoutErrorHandling` below: the whole point is to
 * see the error MapLibre would swallow.
 *
 * Run with: node scripts/validate-layers.mjs
 */
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { validateStyleMin, latest, createExpression, isExpression } =
  require("@maplibre/maplibre-gl-style-spec");

// Import the real module. It was previously read and re-imported as a data:
// URL, which cannot resolve the module's own relative imports.
const mod = await import(new URL("../src/map/layers.js", import.meta.url).href);

// A stub map that records what it was asked to add.
const added = [];
const sources = {};
const stub = {
  getSource: (id) => sources[id],
  addSource: (id, def) => { sources[id] = def; },
  getLayer: () => undefined,
  addLayer: (layer) => added.push(layer),
  setPaintProperty: (id, prop, value) => {
    const layer = added.find((l) => l.id === id);
    if (layer) layer.paint = { ...layer.paint, [prop]: value };
  },
};

const empty = { type: "FeatureCollection", features: [] };
mod.addRouteLayers(stub, { graph: empty, route: empty, pins: empty });

/** Features shaped like the ones the app actually feeds these layers. */
const SAMPLES = [
  { layer: /^route-/, properties: { i: 0, kind: "run", difficulty: "blue", colour: "#1d6fcc" } },
  { layer: /^route-/, properties: { i: 9, kind: "lift", difficulty: null, colour: "#7d95a5" } },
  { layer: /^graph-/, properties: { kind: "run", difficulty: "red" } },
  { layer: /^graph-/, properties: { kind: "lift", difficulty: null } },
  { layer: /^pin-/, properties: { key: "staffal", name: "Staffal", alt: 1830, role: "start" } },
  { layer: /^pin-/, properties: { key: "salati", name: "Salati", alt: 2971, role: "now" } },
  { layer: /^pin-/, properties: { key: "champoluc", name: "Champoluc", alt: 1570, role: "finish" } },
];

let problems = 0;

function checkPaint(label) {
  const style = {
    version: 8,
    name: "test",
    sources: Object.fromEntries(
      Object.entries(sources).map(([id, s]) => [id, { ...s, data: empty }])
    ),
    layers: added,
  };
  const parseErrors = validateStyleMin(style, latest).filter(
    (e) => !/glyphs/.test(e.message) // supplied by the real basemap style
  );
  for (const e of parseErrors) {
    problems++;
    console.log(`    ✗ parse  ${e.message}`);
  }

  for (const layer of added) {
    for (const [prop, value] of Object.entries(layer.paint || {})) {
      if (!isExpression(value)) continue;
      const compiled = createExpression(value, latest[`paint_${layer.type}`]?.[prop]);
      if (compiled.result === "error") {
        problems++;
        console.log(`    ✗ parse  ${layer.id}.${prop}: ${compiled.value.map((e) => e.message).join("; ")}`);
        continue;
      }
      for (const sample of SAMPLES) {
        if (!sample.layer.test(layer.id)) continue;
        for (const zoom of [10, 13, 16]) {
          let out;
          try {
            // Not `evaluate` — that catches the error and hands back the
            // property default, which is exactly the failure being hunted.
            out = compiled.value.evaluateWithoutErrorHandling(
              { zoom },
              { properties: sample.properties }
            );
          } catch (error) {
            problems++;
            console.log(
              `    ✗ ${layer.id}.${prop} @z${zoom} on ${JSON.stringify(sample.properties)}\n` +
              `        ${error.message}\n` +
              `        MapLibre would swallow this and paint the default instead.`
            );
            continue;
          }
          if (out === null || out === undefined) {
            problems++;
            console.log(
              `    ✗ null   ${layer.id}.${prop} @z${zoom} on ${JSON.stringify(sample.properties)}` +
              ` — expression is well-formed but produces no value, so the paint property silently falls back to its default`
            );
          }
        }
      }
    }
  }
  console.log(`  ${label}: ${added.length} layers checked`);
}

checkPaint("initial paint");
mod.markProgress(stub, 7);
checkPaint("after markProgress(7)");

console.log(problems ? `\n  ${problems} PROBLEM(S)` : "\n  all layer expressions parse and evaluate");
process.exit(problems ? 1 : 0);
