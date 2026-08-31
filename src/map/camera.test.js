/**
 * The camera stays on the resort.
 *
 * Unconstrained, the real map pans and zooms to the whole globe, and past the
 * world's edge MapLibre draws repeated copies of it — so the start pin shows up
 * three times receding toward the horizon. The schematic view has had a wall
 * since it was written; this is the same promise for the map that replaced it.
 */
import { cameraLimits, CAMERA_SLACK, CAMERA_MAX_ZOOM, ZOOM_OUT_ALLOWANCE } from "./config.js";

let failures = 0;
let ran = 0;
const check = (name, pass, detail = "") => {
  ran++;
  if (!pass) failures++;
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
};

const MONTEROSA = {
  id: "monterosa",
  center: [7.8309, 45.8636],
  zoom: 11.6,
  bbox: [7.7, 45.8, 7.96, 45.92],
};
// Smaller, lower, elsewhere. Limits must follow the resort, not a constant.
const PAGANELLA = { id: "paganella", center: [11.03, 46.17], zoom: 12.4, bbox: [10.95, 46.1, 11.09, 46.24] };

/** Metres per degree at this latitude, near enough for a sanity check. */
const kmX = (deg, lat) => (deg * 111.32 * Math.cos((lat * Math.PI) / 180));
const kmY = (deg) => deg * 111.32;

console.log("\nTHE CAMERA IS WALLED IN");

for (const resort of [MONTEROSA, PAGANELLA]) {
  const { maxBounds, minZoom, maxZoom } = cameraLimits(resort);
  const [[w, s], [e, n]] = maxBounds;
  const [bw, bs, be, bn] = resort.bbox;

  check(`${resort.id}: the whole resort is inside the wall`,
    w < bw && s < bs && e > be && n > bn,
    `resort ${bw}..${be}, wall ${w.toFixed(3)}..${e.toFixed(3)}`);

  const slackKm = kmX(bw - w, bs);
  check(`${resort.id}: there is room to drift past the edge`,
    slackKm > 2 && slackKm < 12, `${slackKm.toFixed(1)}km of slack`);

  check(`${resort.id}: the slack is the stated share of the resort`,
    Math.abs((bw - w) - (be - bw) * CAMERA_SLACK) < 1e-9,
    `${(bw - w).toFixed(4)} degrees`);

  // The wall has to be reachable rather than a formality: a resort you can
  // never push against is a resort with no wall.
  const wallKm = kmY(n - s);
  check(`${resort.id}: and the wall is close enough to hit`,
    wallKm < 60, `${wallKm.toFixed(0)}km tall`);

  check(`${resort.id}: you cannot zoom out to the country`,
    minZoom > 9 && minZoom === resort.zoom - ZOOM_OUT_ALLOWANCE, `minZoom ${minZoom.toFixed(1)}`);
  check(`${resort.id}: nor in past what the terrain can show`,
    maxZoom === CAMERA_MAX_ZOOM && maxZoom < 19, `maxZoom ${maxZoom}`);
  check(`${resort.id}: the resort's own framing is allowed`,
    resort.zoom > minZoom && resort.zoom < maxZoom, `${minZoom.toFixed(1)} < ${resort.zoom} < ${maxZoom}`);
}

console.log("\nTHE LIMITS FOLLOW THE RESORT");
const a = cameraLimits(MONTEROSA);
const b = cameraLimits(PAGANELLA);
check("two resorts get different walls",
  JSON.stringify(a.maxBounds) !== JSON.stringify(b.maxBounds));
check("and different zoom floors", a.minZoom !== b.minZoom,
  `${a.minZoom.toFixed(1)} vs ${b.minZoom.toFixed(1)}`);

console.log("\nAND A RESORT WITHOUT A BBOX STILL GETS ONE");
// Every unavailable resort in the registry is missing bbox and zoom. None of
// them can be selected today, and a crash the day one is turned on is a poor
// trade for the two lines this costs.
const bare = cameraLimits({ id: "courmayeur", center: [6.97, 45.79] });
check("a wall is still derived", bare.maxBounds[0][0] < 6.97 && bare.maxBounds[1][0] > 6.97,
  JSON.stringify(bare.maxBounds.map((p) => p.map((v) => +v.toFixed(2)))));
check("with usable zoom limits", bare.minZoom > 9 && bare.maxZoom === CAMERA_MAX_ZOOM,
  `${bare.minZoom.toFixed(1)}..${bare.maxZoom}`);
check("and no resort at all does not throw", (() => {
  try { return typeof cameraLimits(undefined).minZoom === "number"; } catch { return false; }
})());

console.log(failures ? `\n  ${failures} FAILING of ${ran} checks\n` : `\n  the camera stays home, all ${ran} checks\n`);
process.exit(failures ? 1 : 0);
