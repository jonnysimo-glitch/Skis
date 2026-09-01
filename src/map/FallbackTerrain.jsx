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
import { NODES as MONTEROSA_NODES, projector as monterosaProjector } from "../resort.js";
import {
  buildField, slabFor, toUnit, GRID, VERT_EXAGGERATION,
  SKIRT_LIT, SKIRT_SHADE, BASE_COLOUR,
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
/** How fast a flick bleeds off. 0.92 settles in about half a second at 60fps. */
const GLIDE_DECAY = 0.92;

/**
 * How far to soften the terrain when compositing it, in CSS pixels.
 *
 * Wide enough to dissolve the steps between flat quads completely. It can be
 * this wide because the blurred copy is cut back to the sharp silhouette
 * before it is composited, so only the inside of the mountain is softened.
 */
const TERRAIN_BLUR = 2.6;

/**
 * How much of that blur survives once the camera is close.
 *
 * The blur is in screen pixels, so at the framing the map opens on it dissolves
 * the quads and reads as smooth terrain. Pushed right in — which the zoom
 * ceiling now allows — the same 2.6 pixels are smearing a facet that fills half
 * the screen, and the mountain looks like frosted glass rather than snow. It
 * eases off with the zoom instead, so far is smooth and near is crisp.
 */
const blurFor = (zoom) => TERRAIN_BLUR * Math.max(0.3, Math.min(1, 2.2 / Math.max(zoom, 1)));

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

const SKY_TOP = [104, 158, 196];
const SKY_HORIZON = [216, 234, 244];

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
const BANDS = [
  [0.00, [58, 82, 72]],   // valley forest
  [0.26, [96, 118, 108]], // treeline
  [0.44, [150, 163, 164]], // rock and scree
  [0.60, [196, 210, 216]], // old snow
  [0.78, [232, 240, 245]], // firn
  [1.00, [248, 251, 253]], // snowfield
];

function surfaceColour(alt, lo, hi, shade, haze) {
  const t = Math.max(0, Math.min(1, (alt - lo) / (hi - lo || 1)));
  let k1 = BANDS.length - 1;
  while (k1 > 1 && BANDS[k1 - 1][0] > t) k1--;
  const [t0, c0] = BANDS[k1 - 1];
  const [t1, c1] = BANDS[k1];
  const f = (t - t0) / (t1 - t0 || 1);
  let c = mix(c0, c1, f * f * (3 - 2 * f)); // smoothstep, so the joins vanish
  const k = 0.52 + 0.80 * shade;
  c = [c[0] * k, c[1] * k, c[2] * k];
  // A touch of aerial perspective so far ridges sit back, but only a touch.
  // Washing the surface into the sky is what makes a solid model look like a
  // transparency laid over it, and this one is meant to read as an object.
  c = mix(c, SKY_HORIZON, haze * 0.16);
  return `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
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
  nodes = MONTEROSA_NODES,
  makeProjector = monterosaProjector,
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
  const propsRef = useRef({ route, graph, pins, camera, viewportBottom, viewportTop, block, nodes });
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

  propsRef.current = { route, graph, pins, camera, viewportBottom, viewportTop, block, nodes };
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
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      offCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
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

    // ---- terrain ---------------------------------------------------------
    const drawTerrain = (v, cam, g) => {
      const { heights, at, shades, qAt, minX, maxX, minZ, maxZ, lo, hi } = field;
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
      for (const q of quads) {
        const haze = Math.max(0, Math.min(1, (q.depth - dMin) / dSpan));
        // Flat means exactly that: one tone, no relief shading and no haze.
        // The block is an object the mountain sits in, not more mountain.
        const fill = q.flat
          ? `rgb(${q.flat[0]},${q.flat[1]},${q.flat[2]})`
          : surfaceColour(q.alt, lo, hi, q.shade, haze);
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
      }
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
      for (const feature of propsRef.current.graph.features) {
        const pts = toScreen(feature.geometry.coordinates, v, cam);
        const lift = feature.properties.kind === "lift";
        const colour = lift ? LIFT_TINT : PISTE_TINT[feature.properties.difficulty] ?? LIFT_TINT;
        const dash = lift ? [3, 4] : null;
        ctx.globalAlpha = casing;
        stroke(pts, "rgba(255,255,255,0.95)", lift ? 2.6 : 3.4, dash);
        ctx.globalAlpha = alpha;
        stroke(pts, colour, lift ? 1.2 : 1.9, dash);
        ctx.globalAlpha = 1;
      }
    };

    const drawRoute = (v, cam) => {
      const r = propsRef.current.route;
      if (!r?.features?.length) return;
      const done = propsRef.current.camera?.doneThrough ?? -1;
      // Scale the route line with the framing so it stays a first-class object
      // when zoomed out and does not become a stripe when zoomed in.
      const k = Math.max(0.62, Math.min(1.5, cam.f / (field.span * 0.9)));
      const lines = r.features.map((f) => ({
        props: f.properties,
        pts: toScreen(f.geometry.coordinates, v, cam),
      }));
      // Casing first, as one continuous object: the whole day reads at a glance.
      for (const l of lines) {
        const dim = l.props.i < done;
        stroke(l.pts, dim ? "rgba(11,26,36,0.12)" : "rgba(11,26,36,0.28)", 12 * k);
      }
      for (const l of lines) {
        const dim = l.props.i < done;
        stroke(l.pts, dim ? DIM_ACCENT : ACCENT_LINE, 9.5 * k);
      }
      for (const l of lines) {
        const dim = l.props.i < done;
        stroke(l.pts, dim ? "rgba(255,255,255,0.3)" : "#ffffff", 7 * k);
      }
      for (const l of lines) {
        const dim = l.props.i < done;
        ctx.globalAlpha = dim ? 0.35 : 1;
        if (l.props.kind === "lift") stroke(l.pts, "#22323f", 2.4 * k, [5, 4]);
        else stroke(l.pts, PISTE_COLOUR[l.props.difficulty] || "#7d95a5", 3.4 * k);
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
    const drawPlaces = (v, cam) => {
      const list = Object.entries(propsRef.current.nodes ?? {});
      if (!list.length) return;
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
      const placed = [];
      for (const sel of CHROME) {
        const node = typeof document === "undefined" ? null : document.querySelector(sel);
        if (!node) continue;
        const cs = getComputedStyle(node);
        if (cs.opacity === "0" || cs.visibility === "hidden") continue;
        const r = node.getBoundingClientRect();
        if (r.width && r.height) placed.push({ l: r.left - 4, r: r.right + 4, t: r.top - 4, b: r.bottom + 4 });
      }
      const pinned = new Set(
        (propsRef.current.pins?.features ?? []).map((f) => f.properties?.name)
      );
      const candidates = list
        .filter(([, n]) => !pinned.has(n.name))
        .map(([, n]) => {
          const { x, z } = field.proj.project(n.lat, n.lon);
          return { n, s: project(x, field.sample(x, z), z, v, cam) };
        })
        .filter(({ s }) => s.x > -60 && s.x < width + 60 && s.y > -20 && s.y < height + 20)
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
      if (mapTest) window.__skisLabels = drawn;
    };

    const drawPins = (v, cam) => {
      const p = propsRef.current.pins;
      if (!p?.features?.length) return;
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
        ctx.strokeStyle = "rgba(255,255,255,0.92)";
        ctx.strokeText(feature.properties.name, s.x, s.y + r + 15);
        ctx.fillStyle = "#0b1a24";
        ctx.fillText(feature.properties.name, s.x, s.y + r + 15);
      }
    };

    // Motion carried between a gesture and the render loop. Declared here, above
    // the loop that reads them, rather than relying on the first frame landing
    // after the gesture block has run.
    /** Pixels per frame, smoothed, so one jittery sample cannot fling the map. */
    const velocity = { x: 0, y: 0 };
    /** Remaining momentum after a flick. */
    const glide = { x: 0, y: 0 };

    // ---- loop ------------------------------------------------------------
    let raf = 0;
    let lastBearing = null;
    const frame = () => {
      const v = view.current;
      const gap = v.targetZoom - v.zoom;
      if (Math.abs(gap) > 0.001) {
        v.zoom += gap * 0.14;
        dirty.current = true;
      }

      if (Math.hypot(glide.x, glide.y) > 0.15) {
        // A flick that reaches the edge is resisted rather than killed, so it
        // eases into the wall and springs back instead of stopping dead.
        const lim = v.panLimit;
        v.panX = resist(v.panX, glide.x, lim?.x);
        v.panY = resist(v.panY, glide.y, lim?.y);
        glide.x *= GLIDE_DECAY;
        glide.y *= GLIDE_DECAY;
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
            v[axis] -= Math.sign(v[axis]) * Math.max(0.5, over * 0.22);
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

        const sky = ctx.createLinearGradient(0, 0, 0, height);
        sky.addColorStop(0, `rgb(${SKY_TOP.join(",")})`);
        sky.addColorStop(0.55, "rgb(170,203,224)");
        sky.addColorStop(1, `rgb(${SKY_HORIZON.join(",")})`);
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, width, height);

        // Terrain first, then everything on it. The pistes and the route are
        // drawn over the surface rather than into it, so a run on the far side
        // of a ridge stays visible — see section 15 in scripts/features.mjs.
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
        drawTerrain(v, cam, offCtx);

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
        drawPlaces(v, cam);
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
    const PITCH_RATE = 0.5;         // degrees of pitch per pixel of travel
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
        velocity.x = velocity.x * 0.7 + dx * 0.3;
        velocity.y = velocity.y * 0.7 + dy * 0.3;
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
          v.pitch = Math.max(MIN_PITCH, Math.min(MAX_PITCH, v.pitch - dy * PITCH_RATE));
        } else {
          if (gesture.rotating) {
            // Minus, and it matters. Screen y points down, so atan2 between the
            // two fingers grows as they turn clockwise, while the projection
            // turns the picture anticlockwise as bearing grows: a point to the
            // right of centre rises as bearing increases. Adding one to the
            // other rotated the mountain against the fingers. Pinned by "a
            // clockwise twist turns the mountain clockwise" in features, and by
            // the bearing check in field.test.js that this depends on.
            v.bearing -= (turn * 180) / Math.PI;
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
      if (wasPanning && Math.hypot(velocity.x, velocity.y) > 0.4) {
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

    const wheel = (e) => {
      e.preventDefault();
      const v = view.current;
      // Trackpad pinch arrives as a wheel event with ctrlKey set.
      const factor = e.ctrlKey ? 1 - e.deltaY * 0.01 : e.deltaY > 0 ? 0.92 : 1.08;
      zoomAbout(v, factor, e.clientX, e.clientY);
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
