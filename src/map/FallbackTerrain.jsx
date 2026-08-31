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
import { PISTE_COLOUR } from "../lib/geo.js";
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
 * Pitch limits. 0 is straight down, which is as far as the camera goes: there
 * is no under the map. The ceiling matches MapLibre's `maxPitch` so tilting
 * feels the same whichever layer is currently drawing, since they swap
 * underneath the user without warning.
 */
const MIN_PITCH = 0;
const MAX_PITCH = 75;

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
 * Camera slack.
 *
 * Loose on purpose. A camera that stops the moment you push it feels broken
 * even when it is behaving; these leave room to move and still put a wall
 * somewhere. ZOOM_MIN below 1 is what lets the whole cut-out sit in frame with
 * air around it.
 */
const ZOOM_MIN = 0.34;
const ZOOM_MAX = 5.2;
/** How far past the frame the subject may be pushed, as a share of the frame. */
// 0.44 was too loose: a fling could put the whole model off screen, which is
// the wall not holding. The flexibility that was actually missing is in the
// zoom range above, not here.
const OVERSCROLL = 0.28;
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
  const propsRef = useRef({ route, graph, pins, camera, viewportBottom, viewportTop, block });

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

  propsRef.current = { route, graph, pins, camera, viewportBottom, viewportTop, block };
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
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    if (!controlRef) return;
    controlRef.current = {
      orbit: (deg) => { view.current.bearing += deg; dirty.current = true; },
      resetNorth: () => {
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

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      width = rect.width || 430;
      height = rect.height || 900;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dirty.current = true;
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

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

      // Pan is unbounded by nature: it is a screen-space nudge applied after
      // the camera has framed the subject, so nothing stops you flicking the
      // mountain off the edge and being left with an empty sky and no way back.
      //
      // Two things have to hold. You can always bring any part of the subject
      // to the middle of the screen, which needs a limit of half the subject
      // when the subject is larger than the frame. And a good part of it stays
      // in view, which needs a much tighter limit when it is smaller: allowing
      // its centre to reach the frame edge is enough to leave a sliver of
      // mountain at the bottom and a screen full of sky.
      // Based on how much bigger the subject is than the frame, not on its
      // total size: fit() sizes it TO the frame, so "half the subject" is
      // "half the frame" and never binds. The excess is what you need to be
      // able to scroll through when zoomed in, plus a small allowance so the
      // view can be nudged off centre at rest.
      const limitX = Math.max(0, f * spanU - availW) / 2 + availW * OVERSCROLL;
      const limitY = Math.max(0, f * spanV - availH) / 2 + availH * OVERSCROLL;
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

    // ---- terrain ---------------------------------------------------------
    const drawTerrain = (v, cam) => {
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
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.lineTo(c.x, c.y);
        ctx.lineTo(d.x, d.y);
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.strokeStyle = fill; // hides seams between adjacent quads
        ctx.lineWidth = 0.6;
        ctx.stroke();
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
      // Two passes. A single white dash at half opacity disappeared into the
      // snowfields, which is most of the mountain, and the piste network is
      // the whole point of the screen it is drawn on. A dark casing under it
      // makes it read on snow and on forest both.
      for (const feature of propsRef.current.graph.features) {
        const pts = toScreen(feature.geometry.coordinates, v, cam);
        stroke(pts, "rgba(11,26,36,0.30)", 3, [3, 3]);
        stroke(pts, "rgba(255,255,255,0.92)", 1.4, [3, 3]);
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

        ctx.font = "600 12px 'Inter Variable', Inter, system-ui, sans-serif";
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

      // Redraw only when something moved. 3,600 filled quads a frame is not a
      // thing to do at 60Hz on a phone in a pocket on a chairlift.
      if (dirty.current) {
        dirty.current = false;
        const cam = fit(v);

        const sky = ctx.createLinearGradient(0, 0, 0, height);
        sky.addColorStop(0, `rgb(${SKY_TOP.join(",")})`);
        sky.addColorStop(0.55, "rgb(170,203,224)");
        sky.addColorStop(1, `rgb(${SKY_HORIZON.join(",")})`);
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, width, height);

        // Terrain first, then everything on it. The pistes and the route are
        // drawn over the surface rather than into it, so a run on the far side
        // of a ridge stays visible — see section 15 in scripts/features.mjs.
        drawTerrain(v, cam);
        drawGraph(v, cam);
        drawRoute(v, cam);
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
      gesture = {
        x: c.x, y: c.y,
        ...(pointers.size >= 2 ? spread() : {}),
        // Two fingers can mean three different things, so the first bit of
        // movement decides which and the rest of the gesture sticks to it.
        mode: null,
        turned: 0,
        pinched: 1,
        lifted: 0,
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

    const PINCH_START = 0.04;   // 4% change in finger separation
    const TWIST_START = 0.14;   // radians, about 8 degrees
    const TILT_START = 22;      // pixels of parallel vertical travel

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
        const { dist, angle } = spread();
        let turn = angle - gesture.angle;
        // atan2 wraps; without this a gesture crossing the cut spins the map.
        if (turn > Math.PI) turn -= 2 * Math.PI;
        if (turn < -Math.PI) turn += 2 * Math.PI;
        const scale = gesture.dist > 0 ? dist / gesture.dist : 1;

        // Accumulate before committing, so the mode is chosen on what the
        // gesture is actually doing rather than on its first noisy frame.
        gesture.pinched *= scale;
        gesture.turned += turn;
        gesture.lifted += c.y - gesture.y;

        if (!gesture.mode) {
          if (Math.abs(gesture.pinched - 1) > PINCH_START) gesture.mode = "zoom";
          else if (Math.abs(gesture.turned) > TWIST_START) gesture.mode = "rotate";
          else if (Math.abs(gesture.lifted) > TILT_START) gesture.mode = "tilt";
        }

        if (gesture.mode === "tilt") {
          v.pitch = Math.max(MIN_PITCH, Math.min(MAX_PITCH, v.pitch - (c.y - gesture.y) * 0.4));
        } else if (gesture.mode) {
          // Zoom and rotate coexist, the way they do in every map app, but
          // each waits for its own threshold so one cannot smear into the
          // other. The midpoint between the fingers also drags the map, which
          // is what makes a pinch feel anchored rather than applied to it.
          if (Math.abs(gesture.pinched - 1) > PINCH_START) {
            zoomAbout(v, scale, c.x, c.y);
            v.zoom = v.targetZoom; // pinch tracks the fingers, no easing
          }
          if (Math.abs(gesture.turned) > TWIST_START) {
            v.bearing += (turn * 180) / Math.PI;
          }
          v.panX += c.x - gesture.x;
          v.panY += c.y - gesture.y;
        }

        gesture.dist = dist;
        gesture.angle = angle;
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
