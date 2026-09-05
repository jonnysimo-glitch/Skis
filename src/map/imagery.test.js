/**
 * The tile arithmetic behind the satellite drape.
 *
 * Pure maths, so it is checkable without a network — which matters more than
 * usual here, because the machine this is developed on cannot reach
 * api.maptiler.com at all. Everything that can be wrong with a drape and still
 * look plausible is wrong in this file: a zoom that asks for a hundred tiles,
 * a y axis upside down, a sample that lands in the wrong tile.
 */
import { lonToTileX, latToTileY, zoomFor, tilesFor, templateTile } from "./imagery.js";

let failures = 0;
let ran = 0;
const check = (name, pass, detail = "") => {
  ran++;
  if (!pass) failures++;
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
};

console.log("\nWEB MERCATOR, THE TILE NUMBERING HALF");

check("the antimeridian is tile zero", lonToTileX(-180, 5) === 0, `${lonToTileX(-180, 5)}`);
check("and the far side is the last tile", Math.floor(lonToTileX(179.99, 5)) === 31,
  `${Math.floor(lonToTileX(179.99, 5))} of 0..31`);
check("Greenwich is halfway across", lonToTileX(0, 5) === 16, `${lonToTileX(0, 5)}`);
// The one that is easy to get upside down, and looks like a plausible map when
// it is: the tile grid counts down the screen, so north is a SMALLER y.
check("north is a smaller tile y than south", latToTileY(47, 10) < latToTileY(45, 10),
  `${latToTileY(47, 10).toFixed(2)} against ${latToTileY(45, 10).toFixed(2)}`);
check("the equator is halfway down", Math.abs(latToTileY(0, 5) - 16) < 1e-9, `${latToTileY(0, 5)}`);

console.log("\nHOW MUCH OF THE WORLD TO ASK FOR");

// Monterosa, which is the big one: about 19km across and 16km down.
const MONTEROSA = { west: 7.77, east: 8.02, south: 45.82, north: 45.95 };
// Andalo, which is small.
const PAGANELLA = { west: 10.99, east: 11.06, south: 46.11, north: 46.19 };

for (const [name, b] of [["monterosa", MONTEROSA], ["paganella", PAGANELLA]]) {
  const z = zoomFor(b, 4);
  const t = tilesFor(b, z);
  const across = t.x1 - t.x0 + 1;
  const down = t.y1 - t.y0 + 1;
  check(`${name}: the zoom keeps it under the tile ceiling`, across <= 4 && down <= 4,
    `${across} by ${down} at z${z}`);
  // A resort that fits in one tile has been zoomed too far out to be worth
  // fetching: the whole mountain would be a dozen pixels of the picture.
  check(`${name}: and not so far out that the resort is a smudge`, across * down >= 2,
    `${across * down} tiles at z${z}`);
  check(`${name}: the box is inside the tiles fetched for it`,
    Math.floor(lonToTileX(b.west, z)) >= t.x0 && Math.floor(lonToTileX(b.east, z)) <= t.x1 &&
    Math.floor(latToTileY(b.north, z)) >= t.y0 && Math.floor(latToTileY(b.south, z)) <= t.y1,
    `x ${t.x0}..${t.x1}, y ${t.y0}..${t.y1}`);
}

// A small resort should be photographed closer than a big one, or the ceiling
// is being applied as a fixed zoom and half the point is lost.
check("a smaller resort gets a closer zoom", zoomFor(PAGANELLA, 4) >= zoomFor(MONTEROSA, 4),
  `paganella z${zoomFor(PAGANELLA, 4)}, monterosa z${zoomFor(MONTEROSA, 4)}`);

// Ground resolution has to beat the mesh, or the drape cannot show anything
// the drawn terrain does not already.
{
  const z = zoomFor(MONTEROSA, 4);
  const mPerPx = (40075017 * Math.cos((45.88 * Math.PI) / 180)) / (2 ** z * 512);
  check("and one texture pixel is finer than one terrain quad", mPerPx < 167,
    `${mPerPx.toFixed(0)}m a pixel against a 167m quad`);
}

console.log("\nTHE URL");
{
  const TEMPLATE = "https://api.maptiler.com/tiles/satellite-v2/{z}/{x}/{y}.jpg?key={key}";
  const url = templateTile(TEMPLATE, "KEY123")(12, 2145, 1471);
  check("names the tile it wants", /\/12\/2145\/1471\.jpg/.test(url), url.split("?")[0]);
  check("and carries the key as a query parameter", /[?&]key=KEY123$/.test(url),
    url.replace("KEY123", "…"));
  // A template is a configuration knob, so it has to work for a provider that
  // wants its parts in another order and no key at all. Esri's World Imagery
  // is y before x, which a substitution written as a fixed URL would silently
  // transpose into imagery of somewhere else entirely.
  const esri = templateTile(
    "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
  )(12, 2145, 1471);
  check("and a provider that orders them the other way still gets what it asked for",
    esri.endsWith("/12/1471/2145"), esri.slice(-20));
  check("with no key left dangling when there is none", !/\{key\}|undefined|null/.test(esri),
    esri.slice(-30));
}

console.log(failures ? `\n  ${failures} FAILING of ${ran} checks\n` : `\n  the tiles add up, all ${ran} checks\n`);
process.exit(failures ? 1 : 0);
