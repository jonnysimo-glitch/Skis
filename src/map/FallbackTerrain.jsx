/**
 * The 3D view when there is no MapTiler key.
 *
 * The brief is explicit that a missing key must not produce a broken grey box.
 * So this builds a terrain surface out of the only elevation data we already
 * have — the altitudes on the resort graph's own nodes — and lets you orbit it
 * with the route draped over the top. You lose real satellite relief, pistes
 * and lift lines from the basemap; you keep the thing that matters, which is
 * seeing the shape of the day on a mountain you can turn around.
 *
 * It is a schematic and the UI says so. It is also, usefully, offline by
 * construction: there is nothing to fetch.
 */
import { useEffect, useRef } from "react";
import { NODES as ACTIVE_NODES, PLACES as ACTIVE_PLACES, activeProjector } from "../active-resort.js";
import { shortName } from "../lib/places.js";
import {
  buildField, slabFor, toUnit, GRID, VERT_EXAGGERATION,
  SKIRT_LIT, SKIRT_SHADE, BASE_COLOUR,
  SKY_TOP, SKY_MID, SKY_HORIZON,
} from "./field.js";
import { PISTE_COLOUR, PISTE_TINT, LIFT_TINT } from "../lib/geo.js";
import { ACCENT, ACCENT_LINE, INK } from "../lib/brand.js";

/** The casing, faded, for legs already skied. */
const DIM_ACCENT = "rgba(42, 196, 238, 0.3)";


/**
 * Pitch limits.
 *
 * Past roughly 80 degrees the camera is level with the slope and then below
 * it, and you end up looking at the underside of the terrain — which is not a
 * view of anything. MapLibre caps its own pitch for the same reason; this is
 * the equivalent for the schematic view.
 */
/**
 * How fast a flick bleeds off, as a time constant in milliseconds.
 *
 * This was 0.92 per frame, which is half a second at 60Hz and a quarter of one
 * on a 120Hz phone — the same flick, a different map, decided by hardware
 * nobody chose for its scrolling. Same curve as before at 60Hz, measured
 * against the clock so it is that curve everywhere.
 */
const GLIDE_MS = 190;

/**
 * The two speeds that bound a fling, both in pixels per millisecond.
 *
 * Written as what they used to be at 60Hz, so the feel is unchanged and the
 * arithmetic is checkable: 0.4 and 0.15 pixels in a 16.7ms frame.
 */
const FLING_MIN = 0.4 / 16.7;   // slower than this on release is not a flick
const GLIDE_STOP = 0.15 / 16.7; // slower than this is a stop

/**
 * How far to soften the terrain when compositing it, in CSS pixels.
 *
 * Wide enough to dissolve the steps between flat quads completely. It can be
 * this wide because the blurred copy is cut back to the sharp silhouette
 * before it is composited, so only the inside of the mountain is softened.
 *
 * Narrower than it was, because the grid is finer than it was. At GRID 60 the
 * steps were 2.6px of blur apart; at 72 they are closer together and the same
 * blur was throwing away the extra resolution it had just paid for, along with
 * the rock and the snow grain that make the surface read as ground.
 */
const TERRAIN_BLUR = 1.9;

/**
 * Depth-buffer resolution, as a fraction of the canvas in CSS pixels.
 *
 * See the block by `depth` in the effect for why it is this coarse. The one
 * artefact it buys is a line ending a pixel or two early where it disappears
 * over a ridge, against a silhouette that is itself soft from the blur.
 */
const DEPTH_SCALE = 1 / 3;

/**
 * How far in front of the ground a line has to be to count as visible, as a
 * fraction of the resort's own extent.
 *
 * Small, because the buffer does the real work: each quad stores the depth of
 * its FURTHEST corner rather than its average, so a line sampled anywhere on
 * that quad is in front of what the quad wrote and cannot hide itself. Getting
 * that wrong is the whole difficulty of a depth test against a coarse mesh —
 * a quad here is 167 metres of ground drawn flat, so on a steep face the
 * surface a line is sampled from sits up to a hundred metres off the plane
 * that represents it, times the 2.4 vertical exaggeration on top. A bias big
 * enough to absorb that is big enough to show runs through a ridge, which is
 * the bug this is fixing. Storing the far corner removes the problem instead
 * of paying for it: the cost is that a ridge under-occludes by at most its own
 * last quad, which nobody can see.
 *
 * What is left for this to cover is the buffer's resolution — three CSS pixels
 * of a surface receding at a grazing angle is a real distance — and it is a
 * fraction rather than a number of metres so that a small resort is not
 * measured with a big resort's ruler.
 */
const DEPTH_BIAS_FRAC = 0.005;

/**
 * How much of that blur survives once the camera is close.
 *
 * The blur is in screen pixels, so at the framing the map opens on it dissolves
 * the quads and reads as smooth terrain. Pushed right in — which the zoom
 * ceiling now allows — the same 2.6 pixels are smearing a facet that fills half
 * the screen, and the mountain looks like frosted glass rather than snow. It
 * eases off with the zoom instead, so far is smooth and near is crisp.
 */
/**
 * How much of a finger twist becomes bearing, by zoom.
 *
 * One to one is right when the whole mountain is in frame, and too much when
 * you are close: the camera re-fits the subject to the viewport on every
 * frame, so as the bearing turns, the focal length and the centring shift too,
 * and at high zoom that refit is multiplied into a big apparent swing. Turning
 * about the point under the fingers takes out more than half of it (measured:
 * 1080px of drift down to 503px at zoom 9), and this absorbs the rest.
 *
 * Never below half, or turning right round becomes four separate gestures.
 */
const rotateRate = (zoom) => Math.max(0.5, Math.min(1, 1 / (1 + 0.08 * (zoom - 1))));

/**
 * And how much of a two finger drag becomes pitch, by zoom.
 *
 * The same argument as the bearing above, for the same reason: the refit
 * multiplies a change of camera attitude, so the pitch that feels right with
 * the whole mountain in frame throws the subject around when you are close.
 *
 * The base rate is lower than the 0.5 degrees per pixel this was using, which
 * came from MapLibre. That number is right for MapLibre's 0 to 60 range; here
 * the range runs to 84 and the terrain is vertically exaggerated on top of it,
 * so the same pixel bought half as much again of a bigger travel. A hundred
 * and fifty pixels — a comfortable two finger drag on a phone — went almost
 * the whole way from flat to nearly ground level, which is the "it overdoes
 * it" everyone means when they say the tilt is twitchy. At 0.35 that drag is
 * half the range, so getting somewhere specific takes a movement rather than a
 * flinch.
 */
const PITCH_RATE = 0.35;
const pitchRate = (zoom) => PITCH_RATE * Math.max(0.45, Math.min(1, 1 / (1 + 0.09 * (zoom - 1))));

/**
 * How fast the zoom eases toward what a scroll or a button asked for, as a
 * time constant in milliseconds rather than a fraction per frame.
 *
 * A fraction per frame is a different speed on every device. `zoom += gap *
 * 0.14` is a 110ms ease at 60Hz and a 55ms one on a 120Hz iPhone, which is
 * most of them now — so the animation this was tuned for is not the animation
 * anyone with a recent phone was getting. Same curve, measured against the
 * clock, so it is the same everywhere.
 */
const ZOOM_EASE_MS = 110;

/*
 * More blur the closer you get, not less.
 *
 * This had it backwards. A quad is a fixed piece of ground, so zooming in
 * makes it bigger on screen, not smaller: at the closest zoom a facet is forty
 * pixels across and the softening was down to one, which is why the mountain
 * broke into visible tiles exactly when a skier was looking at it hardest.
 * Scaling with the zoom keeps the seams dissolved at every distance.
 *
 * The ceiling is the other half of it, and it is low on purpose. Blur cannot
 * add detail that is not there, so past about three pixels the near ground
 * stops looking soft and starts looking out of focus, which is worse than a
 * seam.
 */
const blurFor = (zoom) => TERRAIN_BLUR * Math.max(0.75, Math.min(1.55, Math.max(zoom, 1) / 2.2));

/**
 * Pitch limits. 0 is straight down, which is as far as the camera goes: there
 * is no under the map. The ceiling matches MapLibre's `maxPitch` so tilting
 * feels the same whichever layer is currently drawing, since they swap
 * underneath the user without warning.
 */
const MIN_PITCH = 0;
// Measured from straight down, so a bigger number is a lower camera. 75 stopped
// well short of standing on the slope looking along it, which is the view that
// tells you what a run actually pitches like.
const MAX_PITCH = 84;

/**
 * The view you start on and the view the reset button returns to.
 *
 * One constant for both, because they were different: the map opened at bearing
 * -28 and reset went to bearing 0, so the button took you somewhere worse than
 * where you began and there was no way back to it.
 *
 * Pitch is measured from straight down, so a lower number is more overhead. 46
 * looks down over the mountains rather than across them, which is what makes
 * the cut-out read as an object on a table.
 */
const HOME = { bearing: 152, pitch: 46, zoom: 1 };

/**
 * The bearing that puts north at the top of the screen.
 *
 * 180 rather than 0, because resort.js maps north to -z and the projection
 * looks along +z: at bearing 0 north is behind the camera and sits at the
 * bottom of the frame. Verified rather than reasoned about, in field.test.js.
 *
 * Deliberately not HOME. The opening view is a composition, chosen because
 * Monterosa runs east to west and looks like a model of a mountain from 152;
 * from due north it is edge-on and flat. The compass is a compass, though, and
 * pressing one has exactly one meaning.
 */
const NORTH_UP = 180;

/**
 * Everything the app floats over this canvas. Place names are placed around
 * them rather than under them; see drawPlaces.
 */
const CHROME = [".maptools", ".resortbar", ".planbtn", ".mapnote", ".nav__status", ".nav__foot", ".sheet", ".topbar .iconbtn"];

/**
 * Camera slack.
 *
 * Loose on purpose. A camera that stops the moment you push it feels broken
 * even when it is behaving; these leave room to move and still put a wall
 * somewhere. ZOOM_MIN below 1 is what lets the whole cut-out sit in frame with
 * air around it.
 */
const ZOOM_MIN = 0.34;
// Room to get right in over a single summit. At 5.2 you ran out of zoom while
// the peak was still small, and the pan limit grows with the excess, so this
// also buys the reach to bring that peak to the middle of the screen.
const ZOOM_MAX = 16;
/** How far past the frame the subject may be pushed, as a share of the frame. */
/**
 * How far past the wall a push is allowed, as a share of the frame.
 *
 * Small, because the real reach comes from the rule below rather than from
 * this: you can bring any part of the mountain to the middle of the screen,
 * which is what "let me look at Champoluc" means, and no further, which is
 * what stops the mountain being thrown away. This is only the little bit of
 * give past that.
 */
const OVERSCROLL = 0.06;
/** How much of a frame you may pan beyond the subject's own overflow. */
const PAN_REACH = 0.45;
/**
 * The block.
 *
 * The mountain is given thickness: a rim under the edge of the terrain, and a
 * flat plane closing the bottom, so it reads as an object rather than a cut-out
 * floating in nothing.
 *
 * The rim is a constant thickness following the ground, and that is the whole
 * trick. The obvious construction is a proper box: drop each edge straight down
 * to the floor. It cannot be made to work here. The bounding box cuts through
 * mountainside on every side, so whichever wall faces the camera has its top at
 * around 3,200 m and hangs 2,000 m down the screen in front of the resort. That
 * is not a framing or a bearing problem: it was measured at four bearings and
 * the near edge is high ground at all of them, because the valleys run through
 * the middle of this bbox rather than along its sides.
 *
 * Nor is it a colour problem, which is the trap. In rock brown the wall is
 * obviously a wall. In a blue-white a shade off the snow the same wall is
 * invisible, so it looks fixed while still hiding half the mountain, with the
 * piste lines drawn over the top of it. If a change here makes the model look
 * better, check what it is covering before believing it.
 */
// How far the slab may run past the side edges, and how much of the free
// height it fills. Bleeding the corners is deliberate: a diorama that stops
// short of the frame reads as a small object, not as terrain.
const BLOCK_BLEED = 1.62;
const BLOCK_FILL = 0.72;



const clampZoom = (z) => Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z));

const mix = (a, b, t) => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

/**
 * Snow above, rock and forest below, shaded by slope and hazed by distance.
 *
 * A continuous ramp rather than five altitude bands. The bands drew a hard
 * edge wherever the terrain crossed one, and because the surface is filled as
 * flat quads that edge landed on cell boundaries and read as blockiness. The
 * mountain has no such lines on it.
 */
/**
 * What the ground is made of, by height.
 *
 * A starting point only. Steepness overrides it below, because a wall is rock
 * at any altitude and a shelf holds snow well down the mountain, and that is
 * the difference between terrain that reads as ground and terrain that reads
 * as a painted contour map.
 */
const BANDS = [
  // Winter, not summer. Even the valley floor is under snow with stands of
  // spruce through it, so the low band is a snowy forest rather than a green
  // one: this is a ski map and a green valley reads as the wrong season.
  [0.00, [116, 134, 130]], // snowy forest
  [0.26, [156, 172, 174]], // thinning trees
  [0.44, [196, 208, 213]], // treeline and scree
  [0.60, [222, 232, 238]], // old snow
  [0.78, [238, 244, 249]], // firn
  [1.00, [250, 252, 254]], // snowfield
];

/**
 * Bare rock, for a face too steep to hold snow.
 *
 * Lighter than rock actually is. From a distance an alpine face is dusted and
 * half lit, and a true rock grey turned every ridge into a black scar.
 */
const ROCK = [148, 142, 138];
/**
 * Where the snow gives out. Above ROCK_TO the face is bare.
 *
 * These are steepness after the vertical exaggeration, which is the right
 * reference: what should look like rock is what looks steep on screen. Set at
 * 0.42 the mountain came out mostly rock and read as a summer photograph.
 */
const ROCK_FROM = 0.62;
const ROCK_TO = 0.88;

/**
 * Low sun on snow is warm where it lands and blue where it does not.
 *
 * The shading used to be a flat grey multiply, which is what a clay model
 * looks like: a snowfield in shadow is not a darker white, it is blue. These
 * are multipliers per channel at full light and in full shade.
 */
const SUNLIT = [1.05, 1.02, 0.96];
const SHADOW = [0.78, 0.87, 1.06];

function surfaceColour(alt, lo, hi, shade, haze, steep = 0, grain = 0) {
  const t = Math.max(0, Math.min(1, (alt - lo) / (hi - lo || 1)));
  let k1 = BANDS.length - 1;
  while (k1 > 1 && BANDS[k1 - 1][0] > t) k1--;
  const [t0, c0] = BANDS[k1 - 1];
  const [t1, c1] = BANDS[k1];
  const f = (t - t0) / (t1 - t0 || 1);
  let c = mix(c0, c1, f * f * (3 - 2 * f)); // smoothstep, so the joins vanish

  // Steep ground is rock. The grain moves the threshold about, so the snow
  // line is ragged rather than a contour, which is what it looks like from a
  // helicopter and never looks like on a map.
  const edge = Math.max(0, Math.min(1,
    (steep - (ROCK_FROM + grain * 0.16)) / (ROCK_TO - ROCK_FROM)));
  c = mix(c, ROCK, edge * edge * (3 - 2 * edge));

  // Warm in the light, blue in the shade, rather than one grey multiplier.
  const k = 0.52 + 0.80 * shade;
  const tint = mix(SHADOW, SUNLIT, Math.max(0, Math.min(1, shade * 1.15)));
  c = [c[0] * k * tint[0], c[1] * k * tint[1], c[2] * k * tint[2]];

  // And a little brightness grain on top: wind on the snowfields, mottle on
  // the rock. Small enough to be texture rather than noise.
  const lift = 1 + grain * 0.09;
  c = [c[0] * lift, c[1] * lift, c[2] * lift];

  // A touch of aerial perspective so far ridges sit back, but only a touch.
  // Washing the surface into the sky is what makes a solid model look like a
  // transparency laid over it, and this one is meant to read as an object.
  c = mix(c, SKY_HORIZON, haze * 0.16);
  return `rgb(${Math.max(0, Math.min(255, c[0])) | 0},` +
    `${Math.max(0, Math.min(255, c[1])) | 0},` +
    `${Math.max(0, Math.min(255, c[2])) | 0})`;
}

export default function FallbackTerrain({
  route,
  graph,
  pins,
  camera,
  controlRef,
  viewportBottom = 0,
  viewportTop = 0,
  block = false,
  // Defaults follow whichever resort is active, so a caller that does not care
  // which mountain it is drawing still draws the right one.
  nodes = ACTIVE_NODES,
  places = ACTIVE_PLACES,
  makeProjector = activeProjector,
  onScale,
}) {
  const canvasRef = useRef(null);
  const fieldRef = useRef(null);
  // panX/panY are a screen-space offset applied after the camera has framed
  // its target, so dragging moves the mountain rather than re-aiming at it.
  const view = useRef({
    ...HOME, targetZoom: HOME.zoom, panX: 0, panY: 0,
  });
  const dirty = useRef(true);
  const lastCam = useRef(null);
  const projectRef = useRef(null);
  const propsRef = useRef({ route, graph, pins, camera, viewportBottom, viewportTop, block, nodes, places, onScale });
  const mapTest =
    typeof window !== "undefined" && window.location.search.includes("maptest=1");

  // Rebuilt when the mountain changes, or a new resort would be drawn with the
  // previous one's terrain and slab.
  const builtFor = useRef(null);
  if (!fieldRef.current || builtFor.current !== nodes) {
    builtFor.current = nodes;
    fieldRef.current = buildField(nodes, makeProjector);
  }

  // A screen change re-frames the camera on something new, so any pan the user
  // had applied to the previous view is meaningless — keep it and the new
  // subject arrives off screen.
  const framedOn = useRef(null);
  const frameKey = `${camera?.kind}:${camera?.center?.join(",") ?? camera?.bbox?.join(",") ?? ""}`;
  if (framedOn.current !== frameKey) {
    framedOn.current = frameKey;
    view.current.panX = 0;
    view.current.panY = 0;
  }

  propsRef.current = { route, graph, pins, camera, viewportBottom, viewportTop, block, nodes, places, onScale };
  dirty.current = true;

  // Test hook. Camera state lives in a ref and never reaches the DOM, so a
  // gesture test has no other way to tell panning from rotating. Opt-in via
  // ?maptest=1 so it is never exposed to an ordinary visitor.
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    if (!window.location.search.includes("maptest=1")) return undefined;
    const tick = setInterval(() => {
      window.__skisView = { ...view.current };
    }, 60);
    window.__skisSetPitch = (deg) => {
      view.current.pitch = Math.max(MIN_PITCH, Math.min(MAX_PITCH, deg));
      dirty.current = true;
    };
    // Orbiting is a two finger gesture, so a test driving one mouse cannot
    // reach it. Setting bearing directly is the only way to check what the
    // renderer does from the far side.
    window.__skisSetBearing = (deg) => {
      view.current.bearing = deg;
      dirty.current = true;
    };
    // Where a lat/lon lands on the canvas right now. The heading arrow is
    // painted on a canvas in the same colour as the dot it sits under, so the
    // only way to check it points where it should is to work out where that
    // is and compare.
    window.__skisProject = (lon, lat) => {
      const f = fieldRef.current;
      if (!f || !lastCam.current) return null;
      const { x, z } = f.proj.project(lat, lon);
      const s2 = projectRef.current(x, f.sample(x, z), z, view.current, lastCam.current);
      return { x: s2.x, y: s2.y };
    };
    // The mountain's own nodes, so a test can pick whatever is under a finger
    // and follow it through a gesture.
    window.__skisNodes = propsRef.current.nodes ?? nodes;
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    if (!controlRef) return;
    controlRef.current = {
      orbit: (deg) => { view.current.bearing += deg; dirty.current = true; },
      // Two controls, two meanings, the way a map app has them. The compass
      // faces north and does nothing else to the framing you have chosen; the
      // recentre goes back to the opening composition, bearing and all.
      resetNorth: () => {
        view.current.bearing = NORTH_UP;
        dirty.current = true;
      },
      resetView: () => {
        Object.assign(view.current, HOME, { targetZoom: HOME.zoom, panX: 0, panY: 0 });
        dirty.current = true;
      },
      zoom: (delta) => {
        const v = view.current;
        v.targetZoom = clampZoom(v.targetZoom * (delta > 0 ? 1.32 : 0.76));
        dirty.current = true;
      },
    };
  }, [controlRef]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const field = fieldRef.current;
    const ctx = canvas.getContext("2d");
    let width = 0;
    let height = 0;

    const off = document.createElement("canvas");
    const offCtx = off.getContext("2d");
    const blur = document.createElement("canvas");
    const blurCtx = blur.getContext("2d");
    /*
     * A depth buffer, so the mountain is solid.
     *
     * The pistes used to be painted over the finished terrain with no depth
     * test at all, which drew every run on the far side of the ridge straight
     * through it. On a resort the size of Kronplatz that is most of the
     * network: an x-ray of the mountain rather than a view of it, and no way
     * to tell which of two crossing lines is the one under your skis.
     *
     * The terrain is already sorted back to front for the painter's algorithm,
     * so the same pass fills each quad into this canvas with its depth as the
     * colour. Nearer quads are drawn later and overwrite, which leaves the
     * depth of the closest surface at every pixel — exactly what a line has to
     * beat to be visible.
     *
     * Sixteen bits, split across red and green. Eight is 256 steps over ten
     * kilometres of scene, or forty metres a step, and a line lies *on* the
     * surface it is being tested against — at that quantisation the bias
     * needed to stop it z-fighting with its own ground is wide enough to show
     * runs through a ridge again.
     */
    const depth = document.createElement("canvas");
    const depthCtx = depth.getContext("2d", { willReadFrequently: true });
    let depthData = null;
    let depthNear = 0;
    let depthSpan = 1;
    const depthBias = (fieldRef.current?.span ?? 0) * DEPTH_BIAS_FRAC;
    let dpr = 1;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      width = rect.width || 430;
      height = rect.height || 900;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      off.width = canvas.width;
      off.height = canvas.height;
      blur.width = canvas.width;
      blur.height = canvas.height;
      // Deliberately coarse, and never scaled by the device pixel ratio.
      // Rasterising the terrain a second time is the cost of the depth test,
      // and area is what that costs: at a third of the linear size it is a
      // ninth of the fill. An occlusion test does not need better — a ridge
      // that hides a run is tens of pixels across, not one — and the readback
      // afterwards is a ninth of the bytes too, which is the part that would
      // otherwise stutter a drag.
      depth.width = Math.max(1, Math.round(width * DEPTH_SCALE));
      depth.height = Math.max(1, Math.round(height * DEPTH_SCALE));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      offCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      depthCtx.setTransform(DEPTH_SCALE, 0, 0, DEPTH_SCALE, 0, 0);
      depthData = null;
      dirty.current = true;
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    // Place names are laid out around the chrome that floats over this canvas,
    // and the chrome slides into position on a CSS transition. React has the
    // final value before the element has moved, so a redraw triggered by the
    // prop change measures the control stack four hundred pixels from where it
    // ends up — and "Colle Bettaforca" was laid out into a gap that the zoom
    // buttons then slid over. Nothing redraws after a transition on its own,
    // so this does: the chrome has stopped moving, look again.
    const onSettled = (e) => {
      if (e.target instanceof Element && e.target.closest(CHROME.join(","))) {
        dirty.current = true;
      }
    };
    window.addEventListener("transitionend", onSettled, true);

    // ---- camera ----------------------------------------------------------
    // Screen position is linear in the focal length once the perspective
    // divide is done, so the framing can be solved in one pass: project the
    // points we want in shot into "unit" space, then pick the focal length and
    // offsets that fit their bbox into the part of the canvas the sheet is not
    // covering.
    const unit = (x, y, z, v) => toUnit(field, x, y, z, v);

    /** The whole mountain, corner to corner. */
    const whole = () => {
      const out = [];
      for (const x of [field.minX, field.maxX]) {
        for (const z of [field.minZ, field.maxZ]) out.push([x, field.sample(x, z), z]);
      }
      out.push([field.cx, field.hi, field.cz]);
      return out;
    };

    /** Every point the route passes through. */
    const routeTargets = (r) => {
      const out = [];
      for (const f of r.features) {
        for (const [lon, lat] of f.geometry.coordinates) {
          const { x, z } = field.proj.project(lat, lon);
          out.push([x, field.sample(x, z), z]);
        }
      }
      return out;
    };

    /** World points the camera should keep in shot. */
    const targets = () => {
      const { route: r, camera: cam } = propsRef.current;
      // What the camera is pointed at, which is a separate question from
      // whether the slab is drawn. Order matters and all three cases are live.
      //
      // Navigating asks for a point and has a route, so it frames the leg.
      // Explore asks for a point too, at the resort centre, but has no route:
      // framing tightly there would put the cut-out's own sides off screen,
      // where they project across the view instead of bounding it, so it falls
      // through to the whole mountain.
      //
      // A route is the subject wherever else there is one. Letting the slab
      // force the whole mountain into shot made choose a postage stamp, since
      // the sheet takes most of the height.
      if (cam?.kind === "point" && cam.center && r?.features?.length) {
        // Navigating a leg: frame tightly around that leg.
        const [lon, lat] = cam.center;
        const { x, z } = field.proj.project(lat, lon);
        const reach = field.span * 0.13;
        return [
          [x - reach, field.sample(x - reach, z), z - reach],
          [x + reach, field.sample(x + reach, z), z + reach],
          [x - reach, field.sample(x - reach, z + reach), z + reach],
          [x + reach, field.sample(x + reach, z - reach), z - reach],
        ];
      }
      if (r?.features?.length) return routeTargets(r);
      return whole();
    };

    /** Solve focal length and offset so the targets fill the visible area. */
    const fit = (v) => {
      const pts = targets().map(([x, y, z]) => unit(x, y, z, v));
      let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
      for (const p of pts) {
        u0 = Math.min(u0, p.u); u1 = Math.max(u1, p.u);
        v0 = Math.min(v0, p.v); v1 = Math.max(v1, p.v);
      }
      // Chrome covers the bottom, and while navigating the top too. Frame the
      // subject in what is left, but keep the terrain drawing full-bleed
      // behind it: a letterboxed mountain looks broken.
      // The chrome insets are taken out once, in visibleH. padTop used to add
      // viewportTop on top of that, counting it twice: while navigating, where
      // the instruction panel is 210px tall, the subject was squeezed into a
      // 238px band instead of 448px and centred 80px too high. That is why the
      // map was a small model floating in sky there and looked right on
      // explore, which has no top inset at all.
      const padX = 26;
      const padTop = 74;
      const padBottom = 24;
      const top = propsRef.current.viewportTop;
      const visibleH = Math.max(180, height - propsRef.current.viewportBottom - top);
      const availW = width - padX * 2;
      const availH = visibleH - padTop - padBottom;

      const spanU = Math.max(u1 - u0, 1e-6);
      const spanV = Math.max(v1 - v0, 1e-6);
      // A pitched slab projects wide and shallow, so fitting both axes is
      // always width-bound and leaves a small model adrift in sky. Let the
      // corners bleed off the sides and fill the height instead, which is what
      // makes it read as a diorama you are looking into.
      const wholeCutout =
        propsRef.current.block && !propsRef.current.route?.features?.length;
      const f = (wholeCutout
        ? Math.min((availW / spanU) * BLOCK_BLEED, (availH * BLOCK_FILL) / spanV)
        : Math.min(availW / spanU, availH / spanV)) * v.zoom;

      // Half the subject, plus a little.
      //
      // Pan is a screen-space nudge applied after the camera has framed the
      // subject, so nothing bounds it by nature and you could flick the
      // mountain away and be left with sky. But the bound was the wrong shape:
      // it allowed half the OVERFLOW, which only brings the far edge of the
      // mountain to the edge of the screen. At rest there is no overflow at
      // all, so all you had was the small overscroll and the far end of the
      // resort could not be brought anywhere near the middle.
      //
      // Half the subject is the honest rule. It lets you put any point of the
      // mountain in the centre of the screen, which is the whole ask, and it
      // is self-limiting: at that extreme the mountain's edge is at the centre
      // and half of it is still on screen. It also grows with the zoom for
      // free, because f does.
      // Whichever is smaller: half the subject, or enough to scroll through
      // the overflow plus most of a frame.
      //
      // Half the subject alone is the right idea at rest, where it lets you
      // put the far end of the resort near the middle of the screen. Zoomed
      // in it is far too much: the subject is several frames wide, so half of
      // it pans past everything and leaves sky. The second term is the
      // traversal rule, which already handled zoom correctly, opened up from
      // the tenth of a frame it used to allow to nearly half of one.
      const reach = (span, avail) =>
        Math.min((f * span) / 2, Math.max(0, f * span - avail) / 2 + avail * PAN_REACH) +
        avail * OVERSCROLL;
      const limitX = reach(spanU, availW);
      const limitY = reach(spanV, availH);
      // Only hard clamped when the finger is off the glass. While dragging the
      // pan is allowed past the limit under resistance and springs back on
      // release, because a dead stop under your thumb is what reads as broken.
      // Google Earth has no wall at all; this is the smallest wall that still
      // stops you throwing the mountain away.
      // Anything still past the wall belongs to the spring in the frame loop.
      // Clamping it here instead snapped it back in one frame, which is the
      // dead stop this was meant to replace.
      const settle = (x, lim) =>
        Math.abs(x) > lim + 0.5 ? x : Math.max(-lim, Math.min(lim, x));
      if (!v.dragging) {
        v.panX = settle(v.panX, limitX);
        v.panY = settle(v.panY, limitY);
      }
      v.panLimit = { x: limitX, y: limitY };

      // Where the frame's centre sits before pan. zoomAbout needs it to work
      // out how far to shift the pan so the point under your fingers stays
      // under your fingers.
      v.frame = { ax: padX + availW / 2, ay: top + padTop + availH / 2 };

      return {
        f,
        ox: padX + availW / 2 - (f * (u0 + u1)) / 2 + v.panX,
        oy: top + padTop + availH / 2 - (f * (v0 + v1)) / 2 + v.panY,
      };
    };

    const project = (x, y, z, v, cam) => {
      const p = unit(x, y, z, v);
      return { x: cam.ox + p.u * cam.f, y: cam.oy + p.v * cam.f, depth: p.depth };
    };
    projectRef.current = project;

    /**
     * How far a bar on screen is on the ground.
     *
     * Measured rather than derived from the zoom: the camera is a perspective
     * one over an exaggerated height field, so there is no single scale for
     * the whole frame. Two points a kilometre apart at the middle of the
     * resort, at ground level, is the same thing a map app means by its scale
     * bar — the distance at the centre of what you are looking at.
     *
     * The bar then takes a round number whose length lands between 56 and 150
     * pixels, which is why 250 m and 2 km are in the list: without them a
     * mountain sits at a zoom where 100 m is 20 pixels and 500 m is off the
     * side.
     */
    const ROUND_METRES = [50, 100, 200, 250, 500, 1000, 2000, 5000, 10000, 20000];
    let lastScale = null;
    const publishScale = (v, cam) => {
      const fn = propsRef.current.onScale;
      if (!fn) return;
      const y = field.sample(field.cx, field.cz);
      const a = project(field.cx - 500, y, field.cz, v, cam);
      const b = project(field.cx + 500, y, field.cz, v, cam);
      const perKm = Math.hypot(b.x - a.x, b.y - a.y);
      if (!Number.isFinite(perKm) || perKm <= 0) return;
      const perMetre = perKm / 1000;
      let best = ROUND_METRES[0];
      for (const m of ROUND_METRES) {
        best = m;
        if (m * perMetre >= 56) break;
      }
      const px = Math.round(best * perMetre);
      if (lastScale && lastScale.metres === best && Math.abs(lastScale.px - px) < 2) return;
      lastScale = { metres: best, px };
      fn(lastScale);
    };

    // ---- terrain ---------------------------------------------------------
    const drawTerrain = (v, cam, g, dep) => {
      const { heights, at, shades, steeps, grains, qAt, minX, maxX, minZ, maxZ, lo, hi } = field;
      const dx = (maxX - minX) / GRID;
      const dz = (maxZ - minZ) / GRID;
      const quads = [];
      let dMin = Infinity;
      let dMax = -Infinity;

      for (let i = 0; i < GRID; i++) {
        for (let j = 0; j < GRID; j++) {
          const x0 = minX + dx * i;
          const z0 = minZ + dz * j;
          const h00 = heights[at(i, j)];
          const h10 = heights[at(i + 1, j)];
          const h01 = heights[at(i, j + 1)];
          const h11 = heights[at(i + 1, j + 1)];

          const a = project(x0, h00, z0, v, cam);
          const b = project(x0 + dx, h10, z0, v, cam);
          const c = project(x0 + dx, h11, z0 + dz, v, cam);
          const d = project(x0, h01, z0 + dz, v, cam);

          const depth = (a.depth + c.depth) / 2;
          dMin = Math.min(dMin, depth);
          dMax = Math.max(dMax, depth);

          quads.push({
            depth,
            pts: [a, b, c, d],
            // All four corners, not two: the diagonal average jumped between
            // neighbours that share three of them.
            alt: (h00 + h10 + h01 + h11) / 4,
            shade: shades[qAt(i, j)],
            steep: steeps[qAt(i, j)],
            grain: grains[qAt(i, j)],
          });
        }
      }

      // ---- the block -------------------------------------------------------
      // Pushed onto the same list so the painter's sort puts near faces in
      // front of the terrain and far ones behind, with no second pass.
      if (propsRef.current.block) {
        const { thickness, base } = slabFor(field);

        /**
         * One strip of the rim.
         *
         * `out` is the direction the face looks, which decides whether it is
         * drawn at all. Without that test both sides of every face are painted,
         * the inner face of the far side shows over the terrain, and the model
         * reads as an open tray.
         */
        const side = (xa, za, ha, xb, zb, hb, out) => {
          const step = Math.max(dx, dz);
          const mx = (xa + xb) / 2;
          const mz = (za + zb) / 2;
          if (project(mx + out[0] * step, base, mz + out[1] * step, v, cam).depth >=
              project(mx, base, mz, v, cam).depth) return; // facing away

          const p1 = project(xa, ha, za, v, cam);
          const p2 = project(xb, hb, zb, v, cam);
          quads.push({
            // Depth from the top corners only. Averaging a top and a bottom
            // describes a point halfway down and sorts a near face behind
            // terrain it stands in front of.
            depth: (p1.depth + p2.depth) / 2,
            pts: [
              p1,
              p2,
              project(xb, base, zb, v, cam),
              project(xa, base, za, v, cam),
            ],
            flat: out[0] !== 0 ? SKIRT_SHADE : SKIRT_LIT,
          });
        };

        const edge = (i, j, di, dj, out) =>
          side(
            minX + dx * i, minZ + dz * j, heights[at(i, j)],
            minX + dx * (i + di), minZ + dz * (j + dj), heights[at(i + di, j + dj)],
            out
          );

        for (let i = 0; i < GRID; i++) {
          edge(i, 0, 1, 0, [0, -1]);
          edge(i, GRID, 1, 0, [0, 1]);
        }
        for (let j = 0; j < GRID; j++) {
          edge(0, j, 0, 1, [-1, 0]);
          edge(GRID, j, 0, 1, [1, 0]);
        }

        // The underside, one flat tone, so it is a box and not a shell.
        quads.push({
          depth: Infinity, // behind everything; only seen from below
          pts: [
            project(minX, base, minZ, v, cam),
            project(maxX, base, minZ, v, cam),
            project(maxX, base, maxZ, v, cam),
            project(minX, base, maxZ, v, cam),
          ],
          flat: BASE_COLOUR,
        });
      }

      quads.sort((p, q) => q.depth - p.depth); // painter's algorithm
      const dSpan = dMax - dMin || 1;
      /*
       * The far corner of every quad, and the range they span.
       *
       * A second pass rather than a field on each quad: it is a max over four
       * numbers and the slab's faces get it for free, where storing it at
       * construction would mean computing it in three places. The underside is
       * pushed with a depth of Infinity to force it to the back of the sort,
       * and its corners are real, so taking it from the corners also keeps the
       * range finite.
       */
      let dFar = dMin;
      for (const q of quads) {
        let far = -Infinity;
        for (const pt of q.pts) if (pt.depth > far) far = pt.depth;
        q.far = far;
        if (far > dFar) dFar = far;
      }
      // What the visibility test decodes back with. Published before the loop
      // so a frame that draws nothing still leaves a usable scale.
      depthNear = dMin;
      depthSpan = dFar - dMin || 1;
      for (const q of quads) {
        const haze = Math.max(0, Math.min(1, (q.depth - dMin) / dSpan));
        // Flat means exactly that: one tone, no relief shading and no haze.
        // The block is an object the mountain sits in, not more mountain.
        const fill = q.flat
          ? `rgb(${q.flat[0]},${q.flat[1]},${q.flat[2]})`
          : surfaceColour(q.alt, lo, hi, q.shade, haze, q.steep, q.grain);
        const [a, b, c, d] = q.pts;
        g.beginPath();
        g.moveTo(a.x, a.y);
        g.lineTo(b.x, b.y);
        g.lineTo(c.x, c.y);
        g.lineTo(d.x, d.y);
        g.closePath();
        g.fillStyle = fill;
        g.fill();
        g.strokeStyle = fill; // hides seams between adjacent quads
        g.lineWidth = 0.6;
        g.stroke();

        if (dep) {
          // The same shape, in the same order, coloured by how far away it is.
          // Sixteen bits big-endian across red and green; blue is left at zero
          // and alpha at full, so "has any terrain been drawn here at all" is
          // a test on alpha and open sky never occludes anything.
          const t = Math.max(0, Math.min(1, (q.far - dMin) / depthSpan));
          const n = Math.round(t * 65535);
          dep.beginPath();
          dep.moveTo(a.x, a.y);
          dep.lineTo(b.x, b.y);
          dep.lineTo(c.x, c.y);
          dep.lineTo(d.x, d.y);
          dep.closePath();
          dep.fillStyle = `rgb(${n >> 8},${n & 255},0)`;
          dep.fill();
          // Same reason as the stroke above: without it the seams between
          // quads read as sky, and a run crossing one flickers into view.
          dep.strokeStyle = dep.fillStyle;
          dep.lineWidth = 1.2;
          dep.stroke();
        }
      }
    };

    /**
     * Is a projected point in front of the ground, or behind it?
     *
     * The whole test is one lookup: the buffer holds the depth of the nearest
     * surface at every pixel, so anything further away than that is inside the
     * mountain. Pixels no terrain reached are sky, and sky hides nothing.
     */
    const visible = (p) => {
      if (!depthData) return true;
      const px = Math.round(p.x * DEPTH_SCALE);
      const py = Math.round(p.y * DEPTH_SCALE);
      if (px < 0 || py < 0 || px >= depthData.width || py >= depthData.height) return true;
      const i = (py * depthData.width + px) * 4;
      if (depthData.data[i + 3] === 0) return true; // sky
      const ground = depthNear +
        ((depthData.data[i] << 8) | depthData.data[i + 1]) / 65535 * depthSpan;
      return p.depth - depthBias <= ground;
    };

    /**
     * Split a projected line at the points where it goes behind the mountain.
     *
     * Returned as runs of consecutive visible points rather than as a mask,
     * because a stroke is drawn per run: joining across a hidden stretch would
     * put a straight line over the ridge that hid it, which is the artefact
     * this whole thing exists to remove.
     *
     * The endpoints of each run are nudged onto the midpoint of the link that
     * crosses the silhouette. Without it a line stops at whichever sample
     * happened to be last, which at OSM's spacing is up to thirty pixels short
     * of the ridge and reads as a gap rather than as terrain in the way.
     */
    const visibleRuns = (pts) => {
      const runs = [];
      let run = null;
      const mid = (p, q) => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 });
      for (let i = 0; i < pts.length; i++) {
        if (visible(pts[i])) {
          if (!run) {
            run = [];
            if (i > 0) run.push(mid(pts[i - 1], pts[i]));
            runs.push(run);
          }
          run.push(pts[i]);
        } else if (run) {
          run.push(mid(pts[i - 1], pts[i]));
          run = null;
        }
      }
      return runs.filter((r) => r.length > 1);
    };

    // ---- lines on the surface -------------------------------------------
    const toScreen = (coords, v, cam) =>
      coords.map(([lon, lat]) => {
        const { x, z } = field.proj.project(lat, lon);
        return project(x, field.sample(x, z), z, v, cam);
      });

    const stroke = (pts, colour, lw, dash) => {
      if (pts.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.setLineDash(dash || []);
      ctx.strokeStyle = colour;
      ctx.lineWidth = lw;
      ctx.lineJoin = "round";
      ctx.lineCap = dash ? "butt" : "round";
      ctx.stroke();
      ctx.setLineDash([]);
    };

    const drawGraph = (v, cam) => {
      // The whole network, in the grade colours, on every screen that has a
      // map. Before this it was white dashes for everything, so an unplanned
      // mountain told you where the pistes were but not which of them you
      // could ski — and that is the first thing anyone wants off a ski map.
      //
      // Washed out on purpose. When a route is drawn over the top it has to be
      // unmistakably the route, so the network steps back further again rather
      // than competing with it. Two passes either way: a single pale line
      // disappears into the snowfields, which are most of the mountain, so a
      // white casing carries it over snow and rock both.
      const hasRoute = Boolean(propsRef.current.route?.features?.length);
      // Faded enough to sit behind the route, solid enough to still be read.
      // At 0.45 the network had effectively vanished on the navigate screen,
      // which is the one place a skier most wants to see what else is around.
      const alpha = hasRoute ? 0.62 : 1;
      const casing = hasRoute ? 0.6 : 0.9;
      let seen = 0;
      let hidden = 0;
      let clipped = 0;
      for (const feature of propsRef.current.graph.features) {
        const pts = toScreen(feature.geometry.coordinates, v, cam);
        const lift = feature.properties.kind === "lift";
        const colour = lift ? LIFT_TINT : PISTE_TINT[feature.properties.difficulty] ?? LIFT_TINT;
        const dash = lift ? [3, 4] : null;
        // Per visible run, not per feature. A piste that crosses a ridge is
        // two strokes with the ridge between them, and the casing has to be
        // split the same way or it draws the missing stretch in white.
        const runs = visibleRuns(pts);
        if (mapTest) {
          seen++;
          if (!runs.length) hidden++;
          else if (runs.length > 1 || runs[0].length < pts.length) clipped++;
        }
        for (const seg of runs) {
          ctx.globalAlpha = casing;
          stroke(seg, "rgba(255,255,255,0.95)", lift ? 2.6 : 3.4, dash);
          ctx.globalAlpha = alpha;
          stroke(seg, colour, lift ? 1.2 : 1.9, dash);
          ctx.globalAlpha = 1;
        }
      }
      // How much of the network the mountain is standing in front of. A count
      // rather than a pixel sample, so the check for it can say what it means:
      // looking straight down at a height field nothing can be hidden, and at
      // any real pitch a great deal is.
      if (mapTest) window.__skisOcclusion = { seen, hidden, clipped };
    };

    /**
     * The name of a run, written along the run.
     *
     * A piste map names its pistes on the pistes. Ours named the junctions at
     * either end and left the thing in between anonymous, so a skier looking
     * at the mountain could see there was a red there and not that it was the
     * Bettaforca.
     *
     * Only close in, and only where the line is long enough on screen to carry
     * the word: zoomed out the whole network is thirty overlapping names and
     * the mountain disappears under them. The text is laid along the segment
     * of the line that runs most nearly horizontally, and flipped where that
     * segment points left, because a name written upside down is worse than no
     * name.
     */
    const drawRunNames = (v, cam, placed) => {
      const g = propsRef.current.graph;
      if (!g?.features?.length || v.zoom < 1.5) return placed;
      const hasRoute = Boolean(propsRef.current.route?.features?.length);
      ctx.font = "600 10px -apple-system, BlinkMacSystemFont, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const hits = (box) =>
        placed.some((o) => box.l < o.r && box.r > o.l && box.t < o.b && box.b > o.t);
      const drawnNames = [];

      /*
       * One label per piste, on the best piece of it.
       *
       * A run is a dozen edges and every one of them carries the same name, so
       * this groups them. Taking the first edge and giving up when the word did
       * not fit on it was the first attempt, and it drew nothing: the first
       * fragment of a piste is usually a fifty metre stub off a junction.
       */
      const byName = new Map();
      for (const f of g.features) {
        if (f.properties.kind !== "run" || !f.properties.name) continue;
        const list = byName.get(f.properties.name) ?? [];
        list.push(f);
        byName.set(f.properties.name, list);
      }

      for (const [name, features] of byName) {
        const w = ctx.measureText(name).width;
        /*
         * A whole piste fragment, not a link of it.
         *
         * OSM geometry is densely sampled: the longest single link between two
         * consecutive vertices at full zoom is twenty-eight pixels, so looking
         * for a link the word fits on found nothing at any zoom. What the word
         * sits on is the chord of a fragment, and a fragment is a piece of
         * piste between two junctions, which is exactly the unit a name
         * belongs to.
         *
         * A fragment that doubles back has a short chord and a long path, and
         * a word laid across its middle would sit off the snow, so the two
         * lengths have to agree.
         */
        let best = null;
        for (const feature of features) {
          const pts = toScreen(feature.geometry.coordinates, v, cam);
          if (pts.length < 2) continue;
          const a = pts[0];
          const b = pts[pts.length - 1];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const chord = Math.hypot(dx, dy);
          if (chord < w + 12) continue;
          let path = 0;
          for (let i = 1; i < pts.length; i++) path += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
          if (path > chord * 1.35) continue; // a horseshoe, not a stretch
          const flat = Math.abs(dy / (chord || 1));
          const score = chord * (1.35 - flat);
          // A fragment hidden behind a ridge is not a place to write its name:
          // the word would float on bare snow with no line under it.
          if (!visible(pts[Math.floor(pts.length / 2)])) continue;
          if (!best || score > best.score) best = { pts, a, b, dx, dy, chord, score };
        }
        if (!best) continue;
        // On the line, at its middle vertex, rather than at the chord's
        // midpoint: on a piste that bends, the chord's middle is off the snow.
        const pts = best.pts;
        const mid = pts[Math.floor(pts.length / 2)];
        const mx = mid.x;
        const my = mid.y;
        let angle = Math.atan2(best.dy, best.dx);
        if (angle > Math.PI / 2 || angle < -Math.PI / 2) angle += Math.PI;

        // A rough box, axis aligned, which is enough for the declutterer: an
        // exact rotated hull would reject less and cost more than it saves.
        const half = Math.max(Math.abs(Math.cos(angle)) * w, 14) / 2;
        const box = { l: mx - half, r: mx + half, t: my - 8, b: my + 8 };
        if (hits(box)) continue;
        placed.push(box);

        ctx.save();
        ctx.translate(mx, my);
        ctx.rotate(angle);
        ctx.lineWidth = 3;
        ctx.lineJoin = "round";
        ctx.strokeStyle = `rgba(255,255,255,${hasRoute ? 0.8 : 0.94})`;
        ctx.strokeText(name, 0, 0);
        ctx.fillStyle = hasRoute ? "rgba(11,26,36,0.6)" : "rgba(11,26,36,0.82)";
        ctx.fillText(name, 0, 0);
        ctx.restore();
        drawnNames.push(name);
      }
      ctx.textBaseline = "alphabetic";
      if (mapTest) window.__skisRunNames = drawnNames;
      return placed;
    };

    const drawRoute = (v, cam) => {
      const r = propsRef.current.route;
      if (!r?.features?.length) return;
      const done = propsRef.current.camera?.doneThrough ?? -1;
      // Scale the route line with the framing so it stays a first-class object
      // when zoomed out and does not become a stripe when zoomed in.
      const k = Math.max(0.62, Math.min(1.5, cam.f / (field.span * 0.9)));
      // Split once, drawn four times. The route is four concentric strokes and
      // every one of them has to break at the same place, or the casing draws
      // the stretch the ridge is hiding.
      const lines = r.features.map((f) => ({
        props: f.properties,
        runs: visibleRuns(toScreen(f.geometry.coordinates, v, cam)),
      }));
      const pass = (colour, lw, dash) => {
        for (const l of lines) for (const seg of l.runs) stroke(seg, colour(l), lw, dash);
      };
      const dimmed = (l) => l.props.i < done;
      // Casing first, as one continuous object: the whole day reads at a glance.
      pass((l) => (dimmed(l) ? "rgba(11,26,36,0.12)" : "rgba(11,26,36,0.28)"), 12 * k);
      pass((l) => (dimmed(l) ? DIM_ACCENT : ACCENT_LINE), 9.5 * k);
      pass((l) => (dimmed(l) ? "rgba(255,255,255,0.3)" : "#ffffff"), 7 * k);
      for (const l of lines) {
        ctx.globalAlpha = dimmed(l) ? 0.35 : 1;
        const lift = l.props.kind === "lift";
        const colour = lift ? "#22323f" : PISTE_COLOUR[l.props.difficulty] || "#7d95a5";
        for (const seg of l.runs) stroke(seg, colour, (lift ? 2.4 : 3.4) * k, lift ? [5, 4] : null);
        ctx.globalAlpha = 1;
      }
    };

    /**
     * The names of the places on the mountain, always on.
     *
     * A route that says "Champoluc" means nothing against an unlabelled ridge,
     * and the whole point of the mid-day case is knowing which side of the
     * mountain you are looking at.
     *
     * Always on, but not all at once: thirteen labels on a phone at rest
     * overlap into a grey smear, which shows fewer names than showing some of
     * them. So they are placed in order of how much they matter — the valley
     * bases you drive to first, then the mountain huts, then junctions — and
     * one that would collide with a name already down is dropped rather than
     * drawn over. Zoom in and the ones that lost the room come back.
     */
    /**
     * The chrome is DOM drawn over this canvas, so anything the declutterer
     * does not know about wins the pixels: "Champoluc" rendered half under the
     * zoom buttons. Measured rather than guessed at — the first attempt
     * reserved a box where the controls were assumed to be and the compass sat
     * forty pixels above it. The canvas fills the viewport, so client rects are
     * already in the coordinates used here.
     */
    const chromeBoxes = () => {
      const boxes = [];
      for (const sel of CHROME) {
        const node = typeof document === "undefined" ? null : document.querySelector(sel);
        if (!node) continue;
        const cs = getComputedStyle(node);
        if (cs.opacity === "0" || cs.visibility === "hidden") continue;
        const r = node.getBoundingClientRect();
        if (r.width && r.height) boxes.push({ l: r.left - 4, r: r.right + 4, t: r.top - 4, b: r.bottom + 4 });
      }
      return boxes;
    };

    const drawPlaces = (v, cam, placed, { only = null } = {}) => {
      const list = Object.entries(propsRef.current.nodes ?? {})
        .filter(([, n]) => (only === "bases" ? n.base : only === "rest" ? !n.base : true));
      if (!list.length) return placed;
      ctx.font = "600 11px -apple-system, BlinkMacSystemFont, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";

      // A base is where a car or a bus is, which is what a lost skier needs
      // first. A rifugio is somewhere you can stand still. Everything else is
      // a junction, useful but not urgent.
      const rank = (n) => (n.base ? 0 : n.rifugio ? 1 : 2);

      // The chrome is DOM drawn over this canvas, so anything the declutterer
      // does not know about wins the pixels: "Champoluc" rendered half under
      // the zoom buttons. Measured rather than guessed at — the first attempt
      // reserved a box where the controls were assumed to be and the compass
      // sat forty pixels above it. The canvas fills the viewport, so client
      // rects are already in the coordinates used here.

      const pinned = new Set(
        (propsRef.current.pins?.features ?? []).map((f) => f.properties?.name)
      );
      /**
       * Two kinds of label real data produced that should never be drawn.
       *
       * A generated name. The graph gives an unnamed junction "Point 74", and
       * a mountain labelled Point 37, Point 53, Point 74, Point 75 tells a
       * skier nothing while burying the names that mean something. If OSM has
       * no name for a place, this has nothing to say about it.
       *
       * A repeat. One place is often several nodes — a lift station, the top
       * of the piste beside it, a junction ten metres on — so "Passo dei
       * Salati" and "Gabiet" each came out twice, side by side, which reads as
       * a bug rather than as detail. The best-ranked one keeps the name.
       */
      // Labels come from the graph's own `named` flag rather than from
      // guessing at the text: an unnamed junction now carries a readable
      // description ("Above Gabiet", "Olen junction") so the plan form can
      // offer it, and none of those belong on the mountain as a label.
      const spoken = new Set();

      const candidates = list
        .filter(([, n]) => !pinned.has(n.name) && n.named !== false)
        .sort((a, b) => rank(a[1]) - rank(b[1]))
        .filter(([, n]) => {
          if (spoken.has(n.name)) return false;
          spoken.add(n.name);
          return true;
        })
        .map(([, n]) => {
          const { x, z } = field.proj.project(n.lat, n.lon);
          return { n, s: project(x, field.sample(x, z), z, v, cam) };
        })
        .filter(({ s }) => s.x > -60 && s.x < width + 60 && s.y > -20 && s.y < height + 20)
        /*
         * Same rule as the pistes, with one exception.
         *
         * A junction name floating over a ridge it is not on is the most
         * misleading thing on the map: it reads as a place up there. So a
         * junction behind the mountain is behind the mountain.
         *
         * A base is not. Stafal, Champoluc and Alagna sit in deep valleys at
         * the edges of the massif, so at any real pitch at least one of them
         * is behind it — and the first version of this rule took all three
         * off the map at once. "Your car is at Champoluc" is the problem this
         * app exists to solve, and it cannot be solved by a map that will not
         * say where Champoluc is. Physical honesty is worth a lot here and it
         * is not worth that.
         */
        .filter(({ n, s }) => n.base || visible(s))
        .sort((a, b) => rank(a.n) - rank(b.n) || a.n.name.localeCompare(b.n.name));

      const hits = (box) =>
        placed.some((o) => box.l < o.r && box.r > o.l && box.t < o.b && box.b > o.t);

      const drawn = [];
      for (const { n, s } of candidates) {
        const w = ctx.measureText(n.name).width;
        // Four places to put it, in order of preference. Dropping a name on the
        // first collision cost Champoluc every time, because the zoom buttons
        // sit exactly over it in the default view — and a base you might be
        // walking to is the last name that should go. Under, over, then out to
        // either side; only a point boxed in on all four sides loses its label.
        const spots = [
          { x: s.x, y: s.y + 15 },
          { x: s.x, y: s.y - 9 },
          { x: s.x - w / 2 - 10, y: s.y + 4 },
          { x: s.x + w / 2 + 10, y: s.y + 4 },
        ];
        let box = null;
        let tx = 0;
        let y = 0;
        for (const spot of spots) {
          // Pulled inside the frame rather than allowed to run off it. A name
          // sliced by the screen edge is not a name.
          const cx = Math.max(w / 2 + 6, Math.min(width - w / 2 - 6, spot.x));
          const candidate = { l: cx - w / 2 - 3, r: cx + w / 2 + 3, t: spot.y - 12, b: spot.y + 4 };
          if (hits(candidate)) continue;
          box = candidate;
          tx = cx;
          y = spot.y;
          break;
        }
        if (!box) continue;
        placed.push(box);

        ctx.beginPath();
        ctx.arc(s.x, s.y, 3.4, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.lineWidth = 1.6;
        ctx.strokeStyle = "rgba(11,26,36,0.55)";
        ctx.stroke();

        ctx.lineWidth = 3;
        ctx.lineJoin = "round";
        ctx.strokeStyle = "rgba(255,255,255,0.92)";
        ctx.strokeText(n.name, tx, y);
        ctx.fillStyle = n.base ? "#0b1a24" : "rgba(11,26,36,0.7)";
        ctx.fillText(n.name, tx, y);
        drawn.push({ name: n.name, ...box });
      }
      // Canvas text leaves no DOM to assert against, so the placement is
      // published for the feature suite. Same gate as the camera hooks.
      if (mapTest) {
        // Two passes now, so this accumulates rather than replaces: the bases
        // are drawn before the hut markers and everything else after them.
        window.__skisLabels = only === "rest" ? [...(window.__skisLabels ?? []), ...drawn] : drawn;
      }
      return placed;
    };

    /**
     * Where to eat, and where to hire skis.
     *
     * Most of what a skier reads off a piste map is not junctions: it is the
     * huts. This app had every lift and every run and not one restaurant. They
     * are drawn after the place names and share the same collision list, so a
     * hut never sits on top of a station, and the marker is a rounded square
     * rather than the circle a place uses — at eleven pixels a glyph is a
     * smudge, but a different shape reads at a glance.
     *
     * Names only when there is room and the camera is close enough for the
     * mountain to have any: at rest a resort has twenty-odd of these and
     * twenty-odd labels is a grey smear over the terrain.
     */
    /**
     * A map pin with a glyph in it, rather than a coloured blob.
     *
     * A square meant food and a circle meant hire, which is a legend nobody
     * has. These are the shapes every map uses for the same things: cutlery
     * for somewhere to eat, a cup for a bar, a roof for a hut, a pair of skis
     * for hire. Thirteen pixels across with a white disc behind them, because
     * a glyph drawn straight onto snow disappears into it.
     */
    const pin = (x, y, r, kind) => {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.96)";
      ctx.fill();
      ctx.lineWidth = 1.7;
      ctx.strokeStyle = kind === "rental" ? "#2c8fb5" : "#c07a1e";
      ctx.stroke();

      ctx.save();
      ctx.translate(x, y);
      ctx.lineWidth = 1.25;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = kind === "rental" ? "#1d6f8f" : "#8a5510";
      ctx.beginPath();
      if (kind === "rental") {
        // Two skis, tips up.
        ctx.moveTo(-2.1, 2.6); ctx.lineTo(-1.1, -2.8);
        ctx.moveTo(1.1, 2.6); ctx.lineTo(2.1, -2.8);
        ctx.moveTo(-2.9, 2.6); ctx.lineTo(2.9, 2.6);
      } else if (kind === "hut") {
        // A roof and a wall: the shape of every mountain hut sign there is.
        ctx.moveTo(-2.9, 0.2); ctx.lineTo(0, -2.9); ctx.lineTo(2.9, 0.2);
        ctx.moveTo(-2.1, 0.2); ctx.lineTo(-2.1, 2.8);
        ctx.lineTo(2.1, 2.8); ctx.lineTo(2.1, 0.2);
      } else if (kind === "cafe") {
        // A cup with a handle.
        ctx.moveTo(-2.2, -1.8); ctx.lineTo(-2.2, 1.1);
        ctx.quadraticCurveTo(-2.2, 2.7, -0.6, 2.7);
        ctx.quadraticCurveTo(1.0, 2.7, 1.0, 1.1);
        ctx.lineTo(1.0, -1.8);
        ctx.moveTo(1.0, -0.9);
        ctx.quadraticCurveTo(2.9, -0.9, 2.9, 0.3);
        ctx.quadraticCurveTo(2.9, 1.5, 1.0, 1.5);
      } else {
        // Fork and knife.
        ctx.moveTo(-1.9, -2.9); ctx.lineTo(-1.9, -0.6);
        ctx.moveTo(-0.6, -2.9); ctx.lineTo(-0.6, -0.6);
        ctx.moveTo(-1.25, -0.6); ctx.lineTo(-1.25, 2.9);
        ctx.moveTo(1.7, 2.9); ctx.lineTo(1.7, -0.4);
        ctx.quadraticCurveTo(1.7, -2.9, 0.7, -2.9);
        ctx.quadraticCurveTo(0.7, -0.4, 1.7, -0.4);
      }
      ctx.stroke();
      ctx.restore();
    };

    const drawHuts = (v, cam, placed, { markersOnly = false, labelsOnly = false } = {}) => {
      const list = propsRef.current.places ?? [];
      if (!list.length) return placed;
      /*
       * Named at every zoom, not only close up.
       *
       * These were markers with no words under them until 1.25, which is past
       * the view the app opens on — so the mountain showed a dozen identical
       * orange discs and no way to tell a restaurant you want from one you
       * do not. A pin whose name you cannot read is a pin that does not answer
       * the question you tapped it for.
       *
       * What stopped it being soup is not the zoom gate, it is the
       * declutterer: a name that will not fit without hitting one already
       * down is dropped, so the far view names the few with room and zooming
       * in brings back the rest. That is the same rule the place names use,
       * and it is the rule that should have been carrying this all along.
       */
      ctx.font = "600 10.5px -apple-system, BlinkMacSystemFont, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";

      const hits = (box) =>
        placed.some((o) => box.l < o.r && box.r > o.l && box.t < o.b && box.b > o.t);

      const drawn = [];
      for (const [full, kind, lat, lon] of list) {
        const name = shortName(full);
        const { x, z } = field.proj.project(lat, lon);
        const s = project(x, field.sample(x, z), z, v, cam);
        if (s.x < -20 || s.x > width + 20 || s.y < -20 || s.y > height + 20) continue;
        // A restaurant on the far side of the mountain is behind the mountain.
        if (!visible(s)) continue;

        const r = 6.4;
        const box = { l: s.x - r - 3, r: s.x + r + 3, t: s.y - r - 3, b: s.y + r + 3 };
        if (labelsOnly) {
          // The marker went down in the earlier pass; this one only has to
          // find room for the words.
          const w = ctx.measureText(name).width;
          const tx = Math.max(w / 2 + 6, Math.min(width - w / 2 - 6, s.x));
          const ty = s.y + r + 12;
          const label = { l: tx - w / 2 - 3, r: tx + w / 2 + 3, t: ty - 10, b: ty + 3 };
          if (hits(label)) continue;
          placed.push(label);
          ctx.lineWidth = 3;
          ctx.lineJoin = "round";
          ctx.strokeStyle = "rgba(255,255,255,0.92)";
          ctx.strokeText(name, tx, ty);
          ctx.fillStyle = "rgba(11,26,36,0.78)";
          ctx.fillText(name, tx, ty);
          continue;
        }
        if (hits(box)) continue;
        placed.push(box);
        pin(s.x, s.y, r, kind);

        drawn.push({ name, kind, ...box });
      }
      if (mapTest && !labelsOnly) window.__skisPlaces = drawn;
      return placed;
    };

    /**
     * Start, finish, and where you are.
     *
     * Deliberately not depth tested, unlike everything else on the mountain.
     * These are three markers, not a network, so they cannot make the map an
     * x-ray — and they are the answers to "where am I" and "where is the car",
     * which are the two questions worth not being able to lose. A position
     * marker that vanishes because the ridge you just came over is between you
     * and the camera is a worse map than one that admits the pin is behind
     * something.
     */
    const drawPins = (v, cam) => {
      const p = propsRef.current.pins;
      if (!p?.features?.length) return;
      const drawn = [];
      for (const feature of p.features) {
        const [lon, lat] = feature.geometry.coordinates;
        const { x, z } = field.proj.project(lat, lon);
        const s = project(x, field.sample(x, z), z, v, cam);
        const role = feature.properties.role;
        const r = role === "now" ? 8 : 6;

        ctx.beginPath();
        ctx.arc(s.x, s.y, r + 2, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(11,26,36,0.22)";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
        ctx.fillStyle = role === "now" ? ACCENT : role === "finish" ? INK : "#ffffff";
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = role === "start" ? "#0b1a24" : "#ffffff";
        ctx.stroke();

        // Which way to go next. It points at the end of the current leg: the
        // top station of the lift you are riding, or the junction the run
        // finishes at. Aimed from the target's projected position rather than
        // a stored heading, so it stays right while the map turns.
        //
        // Clear of the dot rather than tucked under it: underneath, its white
        // casing merged with the casing on the route running through the same
        // pixels and it read as a smudge.
        if (role === "now" && feature.properties.aim) {
          const [alon, alat] = feature.properties.aim;
          const t = field.proj.project(alat, alon);
          const target = project(t.x, field.sample(t.x, t.z), t.z, v, cam);
          const ang = Math.atan2(target.y - s.y, target.x - s.x);
          const at = (rad, d) => [s.x + Math.cos(rad) * d, s.y + Math.sin(rad) * d];
          const tip = at(ang, r + 15);
          const left = at(ang + 0.62, r + 6);
          const right = at(ang - 0.62, r + 6);
          ctx.beginPath();
          ctx.moveTo(tip[0], tip[1]);
          ctx.lineTo(left[0], left[1]);
          ctx.lineTo(right[0], right[1]);
          ctx.closePath();
          ctx.lineJoin = "round";
          ctx.lineWidth = 4;
          ctx.strokeStyle = "#ffffff";
          ctx.stroke();
          ctx.fillStyle = ACCENT;
          ctx.fill();
        }

        ctx.font = "600 12px -apple-system, BlinkMacSystemFont, system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.lineWidth = 3.5;
        ctx.lineJoin = "round";
        // Pulled inside the frame, the same as a place name. A pin sits where
        // the route starts and finishes, which at Kronplatz is a node near the
        // left edge called "Olang I - Valdaora I": the label ran off and the
        // map said "I - Valdaora I". The dot stays where the place is; only
        // the words move.
        const name = feature.properties.name;
        const w = ctx.measureText(name).width;
        const tx = Math.max(w / 2 + 6, Math.min(width - w / 2 - 6, s.x));
        const ty = s.y + r + 15;
        ctx.strokeStyle = "rgba(255,255,255,0.92)";
        ctx.strokeText(name, tx, ty);
        ctx.fillStyle = "#0b1a24";
        ctx.fillText(name, tx, ty);
        drawn.push({ name, l: tx - w / 2 - 3, r: tx + w / 2 + 3, t: ty - 12, b: ty + 4 });
      }
      // Same gate as the place names: canvas text leaves nothing to assert
      // against, so where it landed is published for the feature suite.
      if (mapTest) window.__skisPinLabels = drawn;
    };

    // Motion carried between a gesture and the render loop. Declared here, above
    // the loop that reads them, rather than relying on the first frame landing
    // after the gesture block has run.
    /** Pixels per frame, smoothed, so one jittery sample cannot fling the map. */
    /*
     * How fast the thumb is moving, in pixels per MILLISECOND.
     *
     * Per millisecond and not per pointermove event, which is what this was.
     * Per event happened to work, by a coincidence worth writing down: a
     * pointermove carries less travel the more often it fires, so "pixels per
     * event" times "events per second" came out at the right speed whatever
     * the device — as long as the browser fired exactly one move per frame,
     * which it does not have to and does not always do. Safari coalesces, and
     * a phone under load skips. Then the two stop cancelling and a flick goes
     * however far the hardware felt like.
     *
     * A speed and a frame time multiply to a distance on any device, which is
     * the whole of it.
     */
    const velocity = { x: 0, y: 0 };
    let movedAt = 0;
    /** Remaining momentum after a flick. */
    const glide = { x: 0, y: 0 };

    // ---- loop ------------------------------------------------------------
    // Scroll arrives faster than frames do; see the note on `wheel`.
    let wheelDelta = 0;
    let wheelPinch = false;
    let wheelAt = null;
    let lastFrameAt = 0;
    let raf = 0;
    let lastBearing = null;
    const frame = () => {
      const v = view.current;

      // One zoom per frame, from everything that has scrolled since the last
      // one. targetZoom rather than zoom, so the easing below carries it.
      if (wheelDelta && wheelAt) {
        const rate = wheelPinch ? PINCH_RATE : WHEEL_RATE;
        let scale = 2 / (1 + Math.exp(-Math.abs(wheelDelta * rate)));
        if (wheelDelta > 0) scale = 1 / scale; // scrolling down zooms out
        zoomAbout(v, scale, wheelAt.x, wheelAt.y);
        wheelDelta = 0;
        dirty.current = true;
      }

      const now = performance.now();
      // Capped, so a frame dropped to a background tab does not resolve the
      // whole ease in one step and jump.
      const dt = Math.min(64, lastFrameAt ? now - lastFrameAt : 16.7);
      lastFrameAt = now;

      const gap = v.targetZoom - v.zoom;
      if (Math.abs(gap) > 0.001) {
        v.zoom += gap * (1 - Math.exp(-dt / ZOOM_EASE_MS));
        dirty.current = true;
      }

      if (Math.hypot(glide.x, glide.y) > GLIDE_STOP) {
        // A flick that reaches the edge is resisted rather than killed, so it
        // eases into the wall and springs back instead of stopping dead.
        //
        // Scaled by the frame time, because `glide` is a speed and this is the
        // distance it covers. Applied raw it was a distance PER FRAME, so the
        // same flick of the same thumb threw the map twice as far on a 120Hz
        // phone as on a 60Hz one — and twice as far as anyone tuned it to go.
        // Of everything here that overshoots, this is the one a person can
        // feel, because it is the gesture they make most.
        const lim = v.panLimit;
        v.panX = resist(v.panX, glide.x * dt, lim?.x);
        v.panY = resist(v.panY, glide.y * dt, lim?.y);
        const bleed = Math.exp(-dt / GLIDE_MS);
        glide.x *= bleed;
        glide.y *= bleed;
        dirty.current = true;
      } else if (glide.x || glide.y) {
        glide.x = 0;
        glide.y = 0;
      }

      // Spring back to the wall once nothing is pushing against it.
      const lim = v.panLimit;
      if (lim && !v.dragging) {
        for (const axis of ["panX", "panY"]) {
          const cap = axis === "panX" ? lim.x : lim.y;
          const over = Math.abs(v[axis]) - cap;
          if (over > 0.3) {
            // Same reason as the glide: a fraction of the overshoot per frame
            // is a different spring on a different display.
            const back = Math.max(0.5, over * 0.22) * Math.min(2, dt / 16.7);
            v[axis] -= Math.sign(v[axis]) * Math.min(over, back);
            dirty.current = true;
          }
        }
      }

      // Publish where north actually is, for the compass to point at. A CSS
      // variable rather than React state: this changes every frame of a turn,
      // and re-rendering the app for it would stutter the very gesture that is
      // producing it.
      //
      // The angle, not the bearing. Rotating a needle by the bearing alone is
      // what MapLibre's compass does and it is only right at the cardinals:
      // the vertical axis is foreshortened by the pitch, so at bearing 152 and
      // pitch 46 north sits 37 degrees round, not 28.
      const br = (v.bearing * Math.PI) / 180;
      const pt = (v.pitch * Math.PI) / 180;
      const north = Math.round(
        ((Math.atan2(Math.sin(br), -Math.cos(br) * Math.cos(pt)) * 180) / Math.PI + 360) % 360
      );
      if (north !== lastBearing) {
        lastBearing = north;
        // On the root, because the compass is a sibling of the canvas and a
        // custom property only inherits downwards.
        document.documentElement.style.setProperty("--map-north", String(north));
      }

      // Redraw only when something moved. 3,600 filled quads a frame is not a
      // thing to do at 60Hz on a phone in a pocket on a chairlift.
      if (dirty.current) {
        dirty.current = false;
        const cam = fit(v);
        lastCam.current = cam;
        publishScale(v, cam);

        const sky = ctx.createLinearGradient(0, 0, 0, height);
        sky.addColorStop(0, `rgb(${SKY_TOP.join(",")})`);
        sky.addColorStop(0.55, `rgb(${SKY_MID.join(",")})`);
        sky.addColorStop(1, `rgb(${SKY_HORIZON.join(",")})`);
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, width, height);

        // Terrain first, then everything on it — and depth-tested against it,
        // so a run on the far side of a ridge is hidden by the ridge. Drawing
        // the network over the finished surface made the mountain an x-ray of
        // itself: at Kronplatz most of the network is behind something, and
        // two lines crossing on screen gave no clue which one you were on.
        // The terrain is drawn as flat filled quads, so every one of the 3,600
        // is a single tone with a hard step to its neighbour, and close up it
        // reads as tiling rather than as ground. More quads is the obvious
        // answer and does not fit: GRID 90 is 52fps on a laptop, so a third of
        // that on a phone.
        //
        // So it is painted once into an offscreen surface and composited back
        // through a small blur, which costs one drawImage and dissolves the
        // steps. The route and the pistes go on afterwards, on the real
        // canvas, and stay sharp.
        offCtx.setTransform(1, 0, 0, 1, 0, 0);
        offCtx.clearRect(0, 0, off.width, off.height);
        offCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        depthCtx.setTransform(1, 0, 0, 1, 0, 0);
        depthCtx.clearRect(0, 0, depth.width, depth.height);
        depthCtx.setTransform(DEPTH_SCALE, 0, 0, DEPTH_SCALE, 0, 0);
        drawTerrain(v, cam, offCtx, depthCtx);
        // One readback for the frame. Per-point getImageData is the obvious
        // way to write this and is orders of magnitude slower: every call
        // synchronises with the compositor, and there are thousands of points.
        depthData = depth.width && depth.height
          ? depthCtx.getImageData(0, 0, depth.width, depth.height)
          : null;

        // Blur it, then cut the blur back to the sharp shape.
        //
        // Blurring straight onto the canvas softens the outline as much as the
        // interior, and past about a pixel the mountain starts to look out of
        // focus rather than smooth. Compositing the blurred copy through the
        // sharp one with destination-in keeps only the pixels the sharp
        // terrain covers, so the silhouette and the slab's edges stay crisp
        // while the facets inside them dissolve. That buys a blur wide enough
        // to actually work.
        blurCtx.setTransform(1, 0, 0, 1, 0, 0);
        blurCtx.clearRect(0, 0, blur.width, blur.height);
        blurCtx.filter = `blur(${blurFor(v.zoom) * dpr}px)`;
        blurCtx.drawImage(off, 0, 0);
        blurCtx.filter = "none";
        blurCtx.globalCompositeOperation = "destination-in";
        blurCtx.drawImage(off, 0, 0);
        blurCtx.globalCompositeOperation = "source-over";

        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(blur, 0, 0);
        ctx.restore();
        drawGraph(v, cam);
        drawRoute(v, cam);
        /*
         * In the order a lost skier needs them: the valley bases, then the
         * huts as markers, then the huts' own names, then the junctions.
         *
         * A name reserves a box six times the width of a marker, so this
         * ordering is what actually decides which names exist. The bases go
         * first and always did — those are the names you read when you are
         * working out where you are, and they are where the car is.
         *
         * The huts used to go last, behind the junctions, and the junctions
         * took the mountain: what was left was a dozen identical orange discs
         * with no words under them. A junction name is a label on a place you
         * pass through; a restaurant name is a place you decide to go to, and
         * you cannot decide between two markers that look the same. So the
         * huts are named before the junctions now, and it is the junctions
         * that come back as you zoom in.
         */
        const boxes = drawPlaces(v, cam, chromeBoxes(), { only: "bases" });
        drawHuts(v, cam, boxes, { markersOnly: true });
        drawHuts(v, cam, boxes, { labelsOnly: true });
        drawPlaces(v, cam, boxes, { only: "rest" });
        // Last, because a place is a better thing to know than a piste name,
        // and there are far more piste names than there is room for.
        drawRunNames(v, cam, boxes);
        drawPins(v, cam);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    // ---- gestures --------------------------------------------------------
    // The conventions every map app shares, and the ones MapLibre implements
    // for the real map, so the two views behave identically:
    //
    //   one finger drag    pan
    //   two finger pinch   zoom
    //   two finger twist   rotate
    //   two finger drag    tilt
    //   double tap         zoom in
    //
    // The previous version put rotate and tilt on a one-finger drag, which is
    // what made it feel wrong: dragging re-aimed the camera instead of moving
    // the map under your thumb.
    const pointers = new Map();
    let gesture = null;

    const centroid = () => {
      const pts = [...pointers.values()];
      return {
        x: pts.reduce((a, p) => a + p.x, 0) / pts.length,
        y: pts.reduce((a, p) => a + p.y, 0) / pts.length,
      };
    };
    const spread = () => {
      const [a, b] = [...pointers.values()];
      return { dist: Math.hypot(b.x - a.x, b.y - a.y), angle: Math.atan2(b.y - a.y, b.x - a.x) };
    };

    /**
     * The terrain point under a screen position, found with the app's own
     * forward projection rather than an inverse of it.
     *
     * The closed-form inverse this replaces solved for the GROUND plane, and
     * the thing under your fingers is not on the ground plane — it is on the
     * mountain, at whatever altitude that is, times the vertical exaggeration.
     * At a distance that error is nothing; zoomed in and pitched over it put
     * the anchor hundreds of metres from where the finger actually was.
     *
     * Coarse sweep of the height field then two refinements. It runs once when
     * a two finger gesture begins, not per frame, so a few thousand
     * projections cost nothing anyone can feel.
     */
    const groundUnder = (v, sx, sy) => {
      const f = fieldRef.current;
      const cam = lastCam.current;
      const proj = projectRef.current;
      if (!f || !cam || !proj) return null;
      let lo = { x: f.minX, z: f.minZ };
      let hi = { x: f.maxX, z: f.maxZ };
      let best = null;
      for (let pass = 0; pass < 3; pass++) {
        const N = pass === 0 ? 28 : 12;
        for (let i = 0; i <= N; i++) {
          for (let j = 0; j <= N; j++) {
            const x = lo.x + ((hi.x - lo.x) * i) / N;
            const z = lo.z + ((hi.z - lo.z) * j) / N;
            const y = f.sample(x, z);
            const p = proj(x, y, z, v, cam);
            const d = Math.hypot(p.x - sx, p.y - sy);
            if (!best || d < best.d) best = { x, y, z, d };
          }
        }
        const rx = (hi.x - lo.x) / 10;
        const rz = (hi.z - lo.z) / 10;
        lo = { x: best.x - rx, z: best.z - rz };
        hi = { x: best.x + rx, z: best.z + rz };
      }
      return best;
    };

    const startGesture = () => {
      const c = centroid();
      const sp = pointers.size >= 2 ? spread() : {};
      const pts = [...pointers.values()];
      gesture = {
        x: c.x, y: c.y,
        ...sp,
        // Two fingers can mean three things. Tilt excludes the other two and
        // is latched once; zoom and rotate each latch on their own threshold
        // and then run together, so a pinch can become a twist without
        // lifting a finger.
        x0: c.x, y0: c.y, dist0: sp.dist ?? 0, angle0: sp.angle ?? 0,
        // The narrowest the fingers have been. Rotation is gated on arc
        // travel, and using the smallest separation keeps the gate honest
        // while a pinch is closing.
        minDist: sp.dist ?? 0,
        last: pts.map((q) => ({ ...q })),
        // Where the fingers were when the pair was complete. The tilt test
        // measures against this rather than against the previous frame.
        ref: pts.map((q) => ({ ...q })),
        // undefined until the first real movement decides, then latched, the
        // way MapLibre latches it. Fingers stacked one above the other are
        // ambiguous with a pinch, so tilt is off from the start there.
        canTilt: pts.length >= 2 && isVertical(pts[1].x - pts[0].x, pts[1].y - pts[0].y)
          ? false
          : undefined,
        tilting: false,
        zooming: false,
        rotating: false,
        // What the fingers are resting on. Found once here rather than every
        // frame, so rotation can pivot on it.
        anchor: pointers.size >= 2 ? groundUnder(view.current, c.x, c.y) : null,
      };
    };

    /**
     * Zoom about a point on the screen rather than about the middle of it.
     *
     * Pinching used to scale around the frame centre, so whatever you had
     * between your fingers slid away from them. Screen position is
     *   s = ax + f (u - M) + pan
     * and f scales by k, so holding s fixed needs
     *   pan' = pan + (1 - k)(s - ax - pan)
     * which is all this is.
     */
    const zoomAbout = (v, k, sx, sy) => {
      const before = v.targetZoom;
      v.targetZoom = clampZoom(v.targetZoom * k);
      const actual = v.targetZoom / before; // k, unless the clamp took a bite
      const f = v.frame;
      if (!f || actual === 1) return;
      v.panX += (1 - actual) * (sx - f.ax - v.panX);
      v.panY += (1 - actual) * (sy - f.ay - v.panY);
    };

    /**
     * Turn the map about a point on the screen, not about the camera's target.
     *
     * This is why rotating felt violent once you were zoomed in. Pinching
     * already pivots on your fingers, but bearing did not: it pivoted on the
     * middle of the resort. Zoomed out those are nearly the same point and a
     * thirty degree twist reads as thirty degrees. Zoomed in and panned across
     * the valley, the pivot is somewhere off the side of the screen and the
     * same twist swings whatever you were looking at right out of frame.
     * MapLibre rotates about `pinchAround` for exactly this reason.
     *
     * Done by projecting the anchor before and after and putting the
     * difference into the pan, which is added in screen space at the very end.
     * Both projections use the same camera, so the pan already in it cancels
     * and only the turn is left.
     */
    const rotateAbout = (v, dDeg) => {
      const anchor = gesture?.anchor;
      const cam = lastCam.current;
      const proj = projectRef.current;
      if (!anchor || !cam || !proj || !dDeg) {
        v.bearing += dDeg;
        return;
      }
      const before = proj(anchor.x, anchor.y, anchor.z, v, cam);
      v.bearing += dDeg;
      const after = proj(anchor.x, anchor.y, anchor.z, v, cam);
      if (!Number.isFinite(after.x) || !Number.isFinite(after.y)) return;
      v.panX += before.x - after.x;
      v.panY += before.y - after.y;
    };

    // How far a two finger gesture has to go before it commits to being one
    // thing. Without these every pinch also rotated and tilted a little,
    // because two fingers never move perfectly symmetrically, and the map
    // wobbled the whole way through the zoom.
    /**
     * Movement past the wall, with the give of a rubber band.
     *
     * Beyond the limit each pixel of finger travel buys a third of a pixel,
     * and the spring in the frame loop pulls it back when you let go. The
     * clamp this replaces stopped dead mid-drag, which feels like the app has
     * stopped listening rather than like the map has an edge.
     */
    const OVERSHOOT = 0.34;
    const resist = (cur, d, lim) => {
      const next = cur + d;
      if (lim == null || Math.abs(next) <= lim) return next;
      const wasOver = Math.max(0, Math.abs(cur) - lim);
      const nowOver = Math.abs(next) - lim;
      // Only the part of the move that is past the wall is resisted.
      return Math.sign(next) * (lim + wasOver + (nowOver - wasOver) * OVERSHOOT);
    };

    /**
     * Thresholds, taken from MapLibre's own touch handlers rather than guessed.
     *
     * Two of mine were wrong in ways that caused exactly the cross-talk that
     * kept being reported.
     *
     * Zoom is measured in zoom levels, log2 of the change in separation, not
     * as a percentage. Rotation is measured as ARC TRAVEL — how far the
     * fingertips actually moved along the circle — and only then converted to
     * an angle using the current separation. That is the part I had missed. A
     * fixed 8 degree gate is trivially tripped by fingers 160px apart, where
     * 8 degrees is 11px of travel; the same 25px of arc asks for 18 degrees
     * there and 36 degrees when the fingers are close. It scales because what
     * your hand actually does is move a distance, not sweep an angle.
     */
    const ZOOM_START = 0.1;         // zoom levels, |log2(d / d0)|
    const ROTATE_ARC = 25;          // pixels of fingertip travel along the arc
    const PITCH_MIN_MOVE = 2;       // pixels before a finger counts as moving
    const SINGLE_TOUCH_GRACE = 100; // ms to wait for the second finger to move
    const isVertical = (dx, dy) => Math.abs(dy) > Math.abs(dx);

    /**
     * Double tap to zoom, and only a tap counts.
     *
     * This used to fire on any second pointerdown within 300ms, whatever
     * happened in between, so two quick drags in a row zoomed the map. Four in
     * a row put it at the ceiling. A tap has to be short and stay put, so both
     * are now tracked and a press that moved is not a tap.
     */
    const TAP_MS = 260;
    const TAP_SLOP = 12;
    let lastTap = 0;
    let press = null;
    const down = (e) => {
      // Capture is an optimisation, not a requirement, and it throws for a
      // pointer the browser does not consider active. Unguarded, that throw
      // aborted the rest of this handler and the gesture never started at all.
      try { canvas.setPointerCapture(e.pointerId); } catch { /* not capturable */ }
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      startGesture();
      view.current.dragging = true;
      // A new touch stops a glide, so the map is always grabbable.
      glide.x = 0;
      glide.y = 0;
      velocity.x = 0;
      velocity.y = 0;
      movedAt = 0;

      if (pointers.size === 1) {
        const now = performance.now();
        press = { t: now, x: e.clientX, y: e.clientY };
        if (now - lastTap < 300) {
          zoomAbout(view.current, 1.6, e.clientX, e.clientY);
          dirty.current = true;
          lastTap = 0; // a zoom consumes the pair, so a third tap starts over
        }
      } else {
        press = null; // a second finger is a pinch, never a tap
      }
      canvas.style.cursor = "grabbing";
    };

    const move = (e) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const v = view.current;
      const c = centroid();

      if (pointers.size === 1) {
        const dx = c.x - gesture.x;
        const dy = c.y - gesture.y;
        v.panX = resist(v.panX, dx, v.panLimit?.x);
        v.panY = resist(v.panY, dy, v.panLimit?.y);
        // Clamped below at half a millisecond: coalesced moves can arrive with
        // the same timestamp, and dividing by zero puts an infinity into the
        // average that never washes out.
        const now = performance.now();
        const span = Math.max(0.5, movedAt ? now - movedAt : 16.7);
        movedAt = now;
        velocity.x = velocity.x * 0.7 + (dx / span) * 0.3;
        velocity.y = velocity.y * 0.7 + (dy / span) * 0.3;
      } else if (pointers.size >= 2) {
        const pts = [...pointers.values()];
        const { dist, angle } = spread();
        let turn = angle - gesture.angle;
        // atan2 wraps; without this a gesture crossing the cut spins the map.
        if (turn > Math.PI) turn -= 2 * Math.PI;
        if (turn < -Math.PI) turn += 2 * Math.PI;
        gesture.minDist = Math.min(gesture.minDist || dist, dist);

        // ---- tilt ----------------------------------------------------------
        // Decided per finger, not from the midpoint: both have to have moved,
        // both have to be travelling mostly vertically, and both the same way.
        // Latched on the first real movement and never revisited, so a pinch
        // that develops later cannot steal a tilt already under way, and a
        // tilt cannot appear part way through a pinch.
        if (gesture.canTilt === undefined && gesture.ref.length >= 2) {
          // Measured from where the fingers were when the second one landed,
          // not from the previous frame. The browser fires one pointermove per
          // finger, so in any single call only one of them is new: comparing
          // both against the last frame meant "both moved" was never true on
          // the same tick and nothing was ever decided. MapLibre reads the
          // whole touch list at once and does not hit this.
          const a = { x: pts[0].x - gesture.ref[0].x, y: pts[0].y - gesture.ref[0].y };
          const b = { x: pts[1].x - gesture.ref[1].x, y: pts[1].y - gesture.ref[1].y };
          const movedA = Math.hypot(a.x, a.y) >= PITCH_MIN_MOVE;
          const movedB = Math.hypot(b.x, b.y) >= PITCH_MIN_MOVE;
          if (movedA && movedB) {
            gesture.canTilt =
              isVertical(a.x, a.y) && isVertical(b.x, b.y) && a.y > 0 === b.y > 0;
          } else if (movedA || movedB) {
            // One finger alone says nothing yet. Give the other a moment to
            // catch up, then take the silence as a no.
            gesture.firstMove ??= performance.now();
            if (performance.now() - gesture.firstMove > SINGLE_TOUCH_GRACE) {
              gesture.canTilt = false;
            }
          }
        }

        if (gesture.canTilt) gesture.tilting = true;

        // ---- zoom and rotate ------------------------------------------------
        //
        // Independent, and both allowed at once. This was one exclusive latch,
        // so whichever crossed its threshold first owned the whole gesture:
        // pinch to zoom and then twist, without lifting your fingers, and
        // nothing rotated. MapLibre registers these as separate handlers that
        // name each other as allowed —
        //
        //   _add("touchRotate", touchRotate, ["touchPan", "touchZoom"]);
        //   _add("touchZoom",   touchZoom,   ["touchPan", "touchRotate"]);
        //   _add("touchPitch",  touchPitch);
        //
        // so zoom, rotate and pan run together while pitch, with no allow-list
        // of its own, is the one that excludes everything else. That is why the
        // tilt latch above stays exclusive and these two do not.
        //
        // Each still has to cross its own threshold, measured from the start of
        // the gesture, which is what stops a slight unintended twist during a
        // pinch from spinning the mountain. Once engaged each applies only the
        // CURRENT frame's delta, so joining half way through a gesture does not
        // jump by everything that accumulated before it.
        if (!gesture.tilting && gesture.canTilt === false) {
          const zoomed = Math.abs(Math.log2(dist / (gesture.dist0 || dist)));
          // Arc travel, converted to an angle by the separation. See the note
          // on ROTATE_ARC: this is why a fixed angle gate cross-talks.
          const gate = (2 * ROTATE_ARC) / Math.max(gesture.minDist, 1);
          let swept = angle - gesture.angle0;
          if (swept > Math.PI) swept -= 2 * Math.PI;
          if (swept < -Math.PI) swept += 2 * Math.PI;
          if (zoomed >= ZOOM_START) gesture.zooming = true;
          if (Math.abs(swept) >= gate) gesture.rotating = true;
        }

        if (gesture.tilting) {
          const dy =
            ((pts[0].y - gesture.last[0].y) + (pts[1].y - gesture.last[1].y)) / 2;
          v.pitch = Math.max(MIN_PITCH, Math.min(MAX_PITCH, v.pitch - dy * pitchRate(v.zoom)));
        } else {
          if (gesture.rotating) {
            // Minus, and it matters. Screen y points down, so atan2 between the
            // two fingers grows as they turn clockwise, while the projection
            // turns the picture anticlockwise as bearing grows: a point to the
            // right of centre rises as bearing increases. Adding one to the
            // other rotated the mountain against the fingers. Pinned by "a
            // clockwise twist turns the mountain clockwise" in features, and by
            // the bearing check in field.test.js that this depends on.
            rotateAbout(v, (-(turn * 180) / Math.PI) * rotateRate(v.zoom));
          }
          if (gesture.zooming) {
            zoomAbout(v, dist / (gesture.dist || dist), c.x, c.y);
            v.zoom = v.targetZoom; // pinch tracks the fingers, no easing
          }
        }

        gesture.dist = dist;
        gesture.angle = angle;
        gesture.last = pts.map((q) => ({ ...q }));
      }

      gesture.x = c.x;
      gesture.y = c.y;
      dirty.current = true;
    };

    const up = (e) => {
      const wasPanning = pointers.size === 1;
      pointers.delete(e.pointerId);
      try { canvas.releasePointerCapture(e.pointerId); } catch { /* already gone */ }
      if (pointers.size) {
        startGesture();
        // Velocity is only tracked for one finger. Coming out of a pinch with
        // a stale value from before it flicked the map on release.
        velocity.x = 0;
        velocity.y = 0;
        movedAt = 0;
        return;
      }
      view.current.dragging = false;
      dirty.current = true; // let the spring run even if nothing else changed
      canvas.style.cursor = "grab";
      // Only now is it known whether that press was a tap or a drag.
      if (press) {
        const still = Math.hypot(e.clientX - press.x, e.clientY - press.y) < TAP_SLOP;
        lastTap = still && performance.now() - press.t < TAP_MS ? performance.now() : 0;
        press = null;
      }
      // Let go mid-flick and the map should keep going and settle, the way it
      // does in every map app. Without this a drag stops dead under your
      // thumb, which is the single thing that makes a map feel cheap.
      if (wasPanning && Math.hypot(velocity.x, velocity.y) > FLING_MIN) {
        glide.x = velocity.x;
        glide.y = velocity.y;
        dirty.current = true;
      }
    };

    /**
     * Safari's own pinch, which touch-action does not cover.
     *
     * WebKit fires these non-standard gesture events for a two finger pinch
     * alongside the pointer events, and acts on them itself. `touch-action:
     * none` stops the scroll and the double tap zoom but not this, so on an
     * iPhone a pinch on the map could zoom Safari's page underneath the
     * gesture the map was already handling. Chromium does not implement them,
     * which is why no test here could have caught it.
     *
     * Scoped to the canvas on purpose: swallowing these document wide would
     * take Safari's accessibility zoom away from the whole app.
     */
    const SAFARI_GESTURES = ["gesturestart", "gesturechange", "gestureend"];
    const swallow = (e) => e.preventDefault();

    /**
     * Scroll to zoom, taken from MapLibre's scroll handler rather than guessed.
     *
     * What was here applied a flat 8% per event and ignored `deltaY` entirely,
     * which is wrong in three separate ways and they compound:
     *
     * A mouse notch is one event, so a notch moved 8% — barely anything. A
     * trackpad flick is a stream of thirty or forty small events, and each one
     * took its own full 8%: half a second of two-finger scroll is 1.08^40,
     * about seventeen times, straight into the clamp. Same code, same
     * gesture, and it was an order of magnitude too slow on one device and
     * two too fast on the other.
     *
     * `deltaMode` was ignored, so Firefox — which reports lines, about 3 per
     * notch, where Chrome reports 100 pixels — behaved differently again.
     *
     * And the trackpad-pinch branch, `1 - deltaY * 0.01`, goes to zero at a
     * delta of 100 and negative past it. A firm pinch multiplied the zoom by a
     * negative number and the map snapped to the far stop.
     *
     * So: normalise the delta to pixels, accumulate it, and apply it once per
     * rendered frame. Frequency stops mattering, which is the whole fix — what
     * you get depends on how far you scrolled, not on how many events your
     * hardware decided to send. The sigmoid is MapLibre's: smooth from no
     * movement, and a single frame can never do more than double or halve.
     */
    const WHEEL_LINE = 40;      // pixels per line, MapLibre's own constant
    const WHEEL_PAGE = 400;
    const WHEEL_RATE = 1 / 450; // a mouse notch, which is a coarse instrument
    const PINCH_RATE = 1 / 100; // a trackpad pinch, which is a deliberate size
    const wheel = (e) => {
      e.preventDefault();
      let d = e.deltaY;
      if (e.deltaMode === 1) d *= WHEEL_LINE;
      else if (e.deltaMode === 2) d *= WHEEL_PAGE;
      wheelDelta += d;
      // Trackpad pinch arrives as a wheel event with ctrlKey set.
      wheelPinch = e.ctrlKey;
      wheelAt = { x: e.clientX, y: e.clientY };
      dirty.current = true;
    };

    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    canvas.addEventListener("wheel", wheel, { passive: false });
    for (const t of SAFARI_GESTURES) canvas.addEventListener(t, swallow, { passive: false });

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("transitionend", onSettled, true);
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      canvas.removeEventListener("wheel", wheel);
      for (const t of SAFARI_GESTURES) canvas.removeEventListener(t, swallow);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="app__map"
      style={{ touchAction: "none", cursor: "grab" }}
      aria-label="Terrain view of the resort, built from the route graph. Drag to orbit."
    />
  );
}
