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
import { buildField, slabFor, GRID } from "./field.js";
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
const VERT_EXAGGERATION = 2.4;
const SUN = normalise([-0.5, 0.66, -0.56]);
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
const SKIRT_LIT = [236, 243, 249];
const SKIRT_SHADE = [214, 227, 238];
const BASE_COLOUR = [199, 216, 230];
// How far the slab may run past the side edges, and how much of the free
// height it fills. Bleeding the corners is deliberate: a diorama that stops
// short of the frame reads as a small object, not as terrain.
const BLOCK_BLEED = 1.34;
const BLOCK_FILL = 0.46;

const SKY_TOP = [104, 158, 196];
const SKY_HORIZON = [216, 234, 244];

function normalise(v) {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}

const mix = (a, b, t) => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

/** Snow above, rock and forest below, shaded by slope and hazed by distance. */
function surfaceColour(alt, lo, hi, shade, haze) {
  const t = Math.max(0, Math.min(1, (alt - lo) / (hi - lo || 1)));
  let c;
  if (t < 0.22) c = [66, 88, 78];        // valley forest
  else if (t < 0.4) c = [112, 132, 122]; // treeline
  else if (t < 0.56) c = [168, 178, 180]; // rock and scree
  else if (t < 0.72) c = [214, 226, 233]; // old snow
  else c = [246, 250, 253];              // snowfield
  const k = 0.62 + 0.56 * shade;
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
    bearing: -28, pitch: 56, zoom: 1, targetZoom: 1, panX: 0, panY: 0,
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
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    if (!controlRef) return;
    controlRef.current = {
      orbit: (deg) => { view.current.bearing += deg; dirty.current = true; },
      resetNorth: () => {
        view.current.bearing = 0;
        view.current.pitch = 56;
        view.current.panX = 0;
        view.current.panY = 0;
        dirty.current = true;
      },
      flat: () => {
        view.current.pitch = view.current.pitch > 12 ? 3 : 56;
        dirty.current = true;
      },
      zoom: (delta) => {
        const v = view.current;
        v.targetZoom = Math.max(0.5, Math.min(3.4, v.targetZoom * (delta > 0 ? 1.32 : 0.76)));
        dirty.current = true;
      },
      isFlat: () => view.current.pitch < 12,
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
    const unit = (x, y, z, v) => {
      const b = (v.bearing * Math.PI) / 180;
      const p = (v.pitch * Math.PI) / 180;
      const px = x - field.cx;
      const py = (y - field.cy) * VERT_EXAGGERATION;
      const pz = z - field.cz;
      const rx = px * Math.cos(b) - pz * Math.sin(b);
      const rz = px * Math.sin(b) + pz * Math.cos(b);
      const sy = rz * Math.cos(p) - py * Math.sin(p);
      const depth = rz * Math.sin(p) + py * Math.cos(p);
      const w = field.span * 1.45 + depth;
      return { u: rx / w, v: sy / w, depth };
    };

    /** The whole mountain, corner to corner. */
    const whole = () => {
      const out = [];
      for (const x of [field.minX, field.maxX]) {
        for (const z of [field.minZ, field.maxZ]) out.push([x, field.sample(x, z), z]);
      }
      out.push([field.cx, field.hi, field.cz]);
      return out;
    };

    /** World points the camera should keep in shot. */
    const targets = () => {
      const { route: r, camera: cam, block: asBlock } = propsRef.current;
      // An object you look at whole. Framed tightly inside it, its sides sit
      // off screen and project across the view instead of bounding it.
      if (asBlock) return whole();
      if (cam?.kind === "point" && cam.center) {
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
      if (r?.features?.length) {
        const out = [];
        for (const f of r.features) {
          for (const [lon, lat] of f.geometry.coordinates) {
            const { x, z } = field.proj.project(lat, lon);
            out.push([x, field.sample(x, z), z]);
          }
        }
        return out;
      }
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
      const padX = 26;
      const padTop = 74 + propsRef.current.viewportTop;
      const padBottom = 24;
      const visibleH = Math.max(180, height - propsRef.current.viewportBottom - propsRef.current.viewportTop);
      const availW = width - padX * 2;
      const availH = visibleH - padTop - padBottom;

      const spanU = Math.max(u1 - u0, 1e-6);
      const spanV = Math.max(v1 - v0, 1e-6);
      // A pitched slab projects wide and shallow, so fitting both axes is
      // always width-bound and leaves a small model adrift in sky. Let the
      // corners bleed off the sides and fill the height instead, which is what
      // makes it read as a diorama you are looking into.
      const f = (propsRef.current.block
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
      const OVERSCROLL = 0.22;
      const limitX = Math.max(0, f * spanU - availW) / 2 + availW * OVERSCROLL;
      const limitY = Math.max(0, f * spanV - availH) / 2 + availH * OVERSCROLL;
      v.panX = Math.max(-limitX, Math.min(limitX, v.panX));
      v.panY = Math.max(-limitY, Math.min(limitY, v.panY));
      v.panLimit = { x: limitX, y: limitY };

      return {
        f,
        ox: padX + availW / 2 - (f * (u0 + u1)) / 2 + v.panX,
        oy: padTop + availH / 2 - (f * (v0 + v1)) / 2 + v.panY,
      };
    };

    const project = (x, y, z, v, cam) => {
      const p = unit(x, y, z, v);
      return { x: cam.ox + p.u * cam.f, y: cam.oy + p.v * cam.f, depth: p.depth };
    };

    // ---- terrain ---------------------------------------------------------
    const drawTerrain = (v, cam) => {
      const { heights, at, minX, maxX, minZ, maxZ, lo, hi } = field;
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

          const nx = (h00 - h10) / dx;
          const nz = (h00 - h01) / dz;
          const n = normalise([nx * VERT_EXAGGERATION, 1, nz * VERT_EXAGGERATION]);
          const shade = Math.max(0, n[0] * SUN[0] + n[1] * SUN[1] + n[2] * SUN[2]);
          const depth = (a.depth + c.depth) / 2;
          dMin = Math.min(dMin, depth);
          dMax = Math.max(dMax, depth);

          quads.push({ depth, pts: [a, b, c, d], alt: (h00 + h11) / 2, shade });
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
              project(xb, Math.max(hb - thickness, base), zb, v, cam),
              project(xa, Math.max(ha - thickness, base), za, v, cam),
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
      for (const feature of propsRef.current.graph.features) {
        stroke(toScreen(feature.geometry.coordinates, v, cam), "rgba(255,255,255,0.5)", 1.3, [3, 3]);
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
        // A flick that reaches the edge stops there. Left running it would keep
        // pushing against the stop for the rest of the glide.
        const lim = v.panLimit;
        if (lim) {
          if (Math.abs(v.panX + glide.x) > lim.x) glide.x = 0;
          if (Math.abs(v.panY + glide.y) > lim.y) glide.y = 0;
        }
        v.panX += glide.x;
        v.panY += glide.y;
        glide.x *= GLIDE_DECAY;
        glide.y *= GLIDE_DECAY;
        dirty.current = true;
      } else if (glide.x || glide.y) {
        glide.x = 0;
        glide.y = 0;
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
      gesture = { x: c.x, y: c.y, ...(pointers.size >= 2 ? spread() : {}) };
    };

    let lastTap = 0;
    const down = (e) => {
      canvas.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      startGesture();
      // A new touch stops a glide, so the map is always grabbable.
      glide.x = 0;
      glide.y = 0;
      velocity.x = 0;
      velocity.y = 0;

      if (pointers.size === 1) {
        const now = performance.now();
        if (now - lastTap < 300) {
          const v = view.current;
          v.targetZoom = Math.min(3.4, v.targetZoom * 1.6);
          dirty.current = true;
        }
        lastTap = now;
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
        v.panX += dx;
        v.panY += dy;
        velocity.x = velocity.x * 0.7 + dx * 0.3;
        velocity.y = velocity.y * 0.7 + dy * 0.3;
      } else if (pointers.size >= 2) {
        const { dist, angle } = spread();
        if (gesture.dist > 0) {
          v.targetZoom = Math.max(0.5, Math.min(3.4, v.targetZoom * (dist / gesture.dist)));
          v.zoom = v.targetZoom; // pinch tracks the fingers, no easing
        }
        v.bearing += ((angle - gesture.angle) * 180) / Math.PI;
        // Both fingers travelling together tilts; the pinch and twist above
        // have already taken their share of the movement.
        v.pitch = Math.max(MIN_PITCH, Math.min(MAX_PITCH, v.pitch - (c.y - gesture.y) * 0.4));
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
        return;
      }
      canvas.style.cursor = "grab";
      // Let go mid-flick and the map should keep going and settle, the way it
      // does in every map app. Without this a drag stops dead under your
      // thumb, which is the single thing that makes a map feel cheap.
      if (wasPanning && Math.hypot(velocity.x, velocity.y) > 0.4) {
        glide.x = velocity.x;
        glide.y = velocity.y;
        dirty.current = true;
      }
    };

    const wheel = (e) => {
      e.preventDefault();
      const v = view.current;
      // Trackpad pinch arrives as a wheel event with ctrlKey set.
      const factor = e.ctrlKey ? 1 - e.deltaY * 0.01 : e.deltaY > 0 ? 0.92 : 1.08;
      v.targetZoom = Math.max(0.5, Math.min(3.4, v.targetZoom * factor));
      dirty.current = true;
    };

    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    canvas.addEventListener("wheel", wheel, { passive: false });

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      canvas.removeEventListener("wheel", wheel);
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
