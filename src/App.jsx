/**
 * Skis.
 *
 * Resort → Plan → Solving → Choose → Detail → Navigate → Summary, plus a
 * genuine empty state when the clocks do not allow a route.
 *
 * The map is mounted once and never unmounts. Screens are sheet contents over
 * it, and each one asks the camera to look at something. That is the whole
 * navigation model — there is no page transition, because the mountain is the
 * thing you are always looking at.
 */
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";

import Sheet from "./ui/Sheet.jsx";
import FallbackTerrain from "./map/FallbackTerrain.jsx";
import { hasMapKey, MAPTILER_KEY, SATELLITE_URL } from "./map/config.js";
import { FIELD_PAD } from "./map/field.js";

// MapLibre is ~800KB and not needed until the map is on screen, so it is split
// out. If the chunk cannot be fetched at all — offline before it was ever
// cached, or a failed deploy — resolve to nothing rather than throwing: the
// schematic terrain is already on screen and simply stays there.
const MapCanvas = lazy(() =>
  import("./map/MapCanvas.jsx").catch(() => ({ default: () => null }))
);

import HomeScreen from "./screens/HomeScreen.jsx";
import StatsScreen from "./screens/StatsScreen.jsx";
import SettingsSheet from "./screens/SettingsSheet.jsx";
import AddFriend from "./screens/AddFriend.jsx";
import { getProfile, listFriends, addFriend, removeFriend, setSharing } from "./lib/friends.js";
import ResortStatus from "./screens/ResortStatus.jsx";
import TabBar from "./ui/TabBar.jsx";
import PlanScreen from "./screens/PlanScreen.jsx";
import SolvingScreen from "./screens/SolvingScreen.jsx";
import ChooseScreen from "./screens/ChooseScreen.jsx";
import DetailScreen from "./screens/DetailScreen.jsx";
import LegsScreen from "./screens/LegsScreen.jsx";
import NavigateScreen from "./screens/NavigateScreen.jsx";
import SummaryScreen from "./screens/SummaryScreen.jsx";
import EmptyScreen from "./screens/EmptyScreen.jsx";
import PlanButton from "./ui/PlanButton.jsx";

import { getResort, defaultResort } from "./resorts/index.js";
import { recordDay } from "./lib/history.js";
import { NODES, buildEdges, activeGraph, setActiveResort, ensureActive } from "./active-resort.js";
import { graphFor } from "./resorts/graphs.js";
import { useSolver } from "./lib/useSolver.js";
import { legsOf } from "./solver.js";
import { directRoute } from "./lib/direct.js";
import { load, save } from "./lib/persist.js";
import {
  detectContext,
  defaultPlan,
  toSolverOpts,
  toggleRefinement,
  diagnose,
  LUNCH_MINUTES,
} from "./lib/plan.js";
import {
  graphToGeoJSON,
  routeToGeoJSON,
  nodesToGeoJSON,
  routeBounds,
  nearestNode,
} from "./lib/geo.js";
import { Compass, Locate, Plus, Minus, Close, Info, Back, Mountain, Layers } from "./ui/Icons.jsx";

const EMPTY_FC = { type: "FeatureCollection", features: [] };

/**
 * How far a GPS fix may be from a lift station and still be treated as "you
 * are here". Nodes are stations and junctions rather than a dense trace of the
 * piste, so halfway down a long run the nearest station can be a couple of
 * kilometres off. Six is loose enough for that and tight enough to reject
 * another resort.
 */
const MAX_SNAP_METRES = 6000;

/** How tall the sheet opens for each screen. */

/**
 * The three maps, and what each one is for.
 *
 * The drawn mountain first, because it is the one that needs nothing: no key,
 * no network, and it is what a committed route falls back to on a chairlift
 * with no signal. The photograph and the winter basemap are MapTiler's and
 * need a key, so without one they are shown and disabled with the reason
 * rather than hidden — a feature you cannot find is worse than one you cannot
 * yet use.
 */
const MAP_CHOICES = [
  { id: "cutout", name: "Terrain" },
  { id: "satellite", name: "Satellite", needsKey: true },
  { id: "world", name: "Winter map", needsKey: true },
];

/** What the layer control calls a map, for anything else that has to say it. */
const mapChoiceName = (id) => MAP_CHOICES.find((c) => c.id === id)?.name ?? "The map";

/** Tab bar height in CSS pixels; keep in step with --tabbar. */
const TABBAR_H = 56;

/**
 * How much of the screen the fixed navigation panels take, so the map can
 * frame the current leg in the strip that is actually visible rather than
 * behind the instruction.
 */
const NAV_HEAD_H = 210;
const NAV_FOOT_H = 96;

/** Plan's height; the map controls stack above it rather than behind it. */
const PLAN_BUTTON_H = 52;

/**
 * How far the map note sits above the bottom of the map chrome.
 *
 * The scale bar is anchored to the same line, and both were sitting on it: the
 * note is a filled pill and it covered "2 km" completely. Seven pixels of bar,
 * the label stacked above it, and a gap — measured off .mapscale in the
 * stylesheet rather than guessed, so the two move together if either changes.
 */
const SCALE_CLEARANCE = 32;



/**
 * Why a straight transfer will not work. Different failures from a day plan:
 * there may be no legal path at all, or one that exists but arrives late.
 */
function diagnoseDirect(plan, opts, route) {
  const from = NODES[plan.start].name;
  const to = NODES[plan.finish].name;
  if (plan.start === plan.finish) {
    return {
      headline: "You are already there.",
      body: `Pick somewhere other than ${from} to head for.`,
      fixes: [],
    };
  }
  if (!route) {
    return {
      headline: `No way from ${from} to ${to} today.`,
      body:
        `Every link is either above your grade or behind a lift that has already shut ` +
        `for the day.`,
      fixes: ["laterFinish", ...(opts.ability !== "black" ? ["harder"] : [])],
    };
  }
  return {
    headline: `${to} is further than that.`,
    body: `The quickest way there takes ${route.minutes} minutes, which is more time than you have given yourself.`,
    fixes: ["laterFinish"],
  };
}

const nowMinutes = () => {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
};

export default function App() {
  // ---- resort -------------------------------------------------------------
  const [resortId, setResortId] = useState(() => load("resortId"));
  // Three places: home (where and what you have done), skiing (the mountain),
  // stats (the record). `screen` is the step within skiing.
  const [tab, setTab] = useState(() => (load("resortId") ? "skiing" : "home"));
  const [screen, setScreen] = useState("explore");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyVersion, setHistoryVersion] = useState(0);
  // The longest day the active mountain supports, measured only when a solve
  // came back empty. Read by the empty state to offer a finish that works.
  const [capacity, setCapacity] = useState(null);
  const resort = getResort(resortId) || defaultResort;
  // Keep the graph bindings in step with the registry, on the very first
  // render as well as after a switch. chooseResort swaps them when the user
  // picks a resort, but a reload restores resortId from storage without going
  // through it — and the bindings were then a different mountain from the one
  // the registry reported, which made the first solve look up an OSM node key
  // in the hand-typed graph. Idempotent, so calling it every render is free.
  ensureActive(resort.id);
  // The whole mountain as map geometry. This was a module constant, which was
  // right while there was one mountain and is a trap now: computed at import it
  // would keep the first resort's pistes for the life of the page and draw them
  // over somebody else's valley. Keyed on the resort so it follows the swap.
  const graphGeo = useMemo(() => graphToGeoJSON(buildEdges()), [resort.id]);
  // The graph the solver plans on, as plain data so it survives the trip to
  // the worker. Rebuilt per resort rather than per solve: refine re-solves on
  // every chip tap and this is the only large thing in the request.
  const solverGraph = useMemo(() => activeGraph(), [resort.id]);

  // ---- profile and plan ---------------------------------------------------
  const [ability, setAbilityState] = useState(() => load("profile")?.ability ?? "red");
  const context = useMemo(() => detectContext(nowMinutes(), resort), [resort]);
  const [plan, setPlan] = useState(() =>
    ((r) => defaultPlan(r, detectContext(nowMinutes(), r), nowMinutes()))(
      getResort(load("resortId")) || defaultResort
    )
  );
  // null | {state:'ok', key} | {state:'far', km} | {state:'denied'}
  //      | {state:'insecure'} | {state:'unavailable'} | {state:'locating'}
  const [gps, setGps] = useState(null);

  // ---- solving ------------------------------------------------------------
  const { solve, solving } = useSolver();
  const [refine, setRefine] = useState(() => new Set());

  /**
   * Setting the grade is a statement about the grade, so it clears any
   * easier/harder chip still on from the last plan.
   *
   * Without this they compound silently. Take the empty state's "Include red
   * runs", go back to the form, set the chip to "Blue and red", and the
   * refinement is still on top of it: the app plans a black day and nothing
   * on screen says why.
   */
  const setAbility = (value) => {
    setAbilityState(value);
    save("profile", { ability: value });
    setRefine((current) => {
      if (!current.has("easier") && !current.has("harder")) return current;
      const next = new Set(current);
      next.delete("easier");
      next.delete("harder");
      return next;
    });
  };

  const [routes, setRoutes] = useState([]);
  const [opts, setOpts] = useState(null);
  const [pickIndex, setPickIndex] = useState(0);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [step, setStep] = useState(0);
  const [diagnosis, setDiagnosis] = useState(null);

  // ---- map ----------------------------------------------------------------
  const mapControl = useRef(null);
  const [mapBroken, setMapBroken] = useState(false);
  const [mapLive, setMapLive] = useState(false);
  const [noteOpen, setNoteOpen] = useState(!load("seenMapNote"));
  const [sheetHeight, setSheetHeight] = useState(0);
  /**
   * How far a bar on the map is on the ground, measured by the renderer.
   *
   * A map with no scale on it is a picture. This is the one thing on the
   * mountain that answers "how far is that", and it costs a rule and a number.
   */
  const [mapScale, setMapScale] = useState(null);

  // Two map layers, and the cut-out is the default.
  //
  // The cut-out shows the resort and nothing else: a slab of terrain with an
  // edge and a bottom, so you can see the whole mountain as one object and
  // tell where it stops. A continuous world map cannot do that. It has real
  // imagery, which is prettier, but it also runs to the horizon in every
  // direction, and on a phone that reads as being lost rather than as being
  // somewhere. The resort is the subject; the rest of the Alps is not.
  //
  // The world map has no control on it for now. It is still wired, because it
  // is the better view once you know where you are and the brief asks for real
  // terrain, but a button to swap to it was not earning its place in a column
  // of four. Bringing it back is one button.
  const onMountain = tab === "skiing";
  /**
   * Which map you are looking at.
   *
   * 'cutout' is the drawn mountain, which needs nothing and works offline.
   * 'satellite' is a photograph of the same terrain from MapTiler, and
   * 'world' is their winter basemap; both need a key, so both are offered
   * only when there is one. Remembered, because it is a preference rather
   * than a per-session choice.
   */
  const [mapMode, setMapMode] = useState(() => {
    /*
     * Read under a new name, so the old preference does not outlive the reason
     * for it.
     *
     * Until there was a key, Terrain was the only choice that worked and the
     * other two were greyed out — so "cutout" in storage does not mean anyone
     * preferred it, only that they tapped the one button that did anything.
     * Honouring that would hide satellite from exactly the people who have
     * been using the app longest.
     */
    const saved = load("mapMode2");
    if (saved && (saved === "cutout" || hasMapKey)) return saved;
    // Satellite when there is a key to serve it, because a photograph of the
    // mountain is what a skier already knows how to read. The schematic
    // terrain is honest about the shape of the ground and says nothing about
    // where the trees stop or which bowl is the one you can see from the lift.
    // Without a key it would be an empty grey pane, so then the terrain is not
    // the preference, it is the only thing that works.
    return hasMapKey ? "satellite" : "cutout";
  });
  const [layersOpen, setLayersOpen] = useState(false);
  const chooseMap = (next) => {
    setMapBroken(false);
    setMapMode(next);
    save("mapMode2", next);
    setLayersOpen(false);
  };
  const [statusOpen, setStatusOpen] = useState(false);
  // Measured, not assumed: the navigate footer grows when the overrun banner
  // appears. NAV_FOOT_H is only the starting guess for the first frame.
  const [navFoot, setNavFoot] = useState(NAV_FOOT_H);
  // Friends live in storage; this counter only asks React to render again, so
  // the list is re-read. Mirroring it into state would give two truths, and
  // the one the switch wrote to would not be the one the list rendered from.
  // It must not be a `key` on the screen either: remounting Home on every
  // toggle throws away focus and scroll position, which broke returning focus
  // to whatever opened the settings panel.
  const [friendsAt, setFriendsAt] = useState(0);
  const [addingFriend, setAddingFriend] = useState(false);
  const [friendError, setFriendError] = useState(null);
  const [navExpanded, setNavExpanded] = useState(false);
  /*
   * Satellite is a skin on our own terrain, not somewhere else.
   *
   * It used to be grouped with the winter map as "wantWorld" — both swapped in
   * MapLibre and MapTiler's basemap, which is a different map: its labels, its
   * camera, its idea of where the pistes are, and none of the huts, names or
   * scale bar this app spent its time getting right. Asking for the satellite
   * view is not asking to leave; it is asking to see the same mountain
   * photographed instead of drawn.
   *
   * So only the winter map is somewhere else now. Satellite stays on the
   * terrain renderer and changes the colour of the ground.
   */
  const wantWorld = mapMode === "world";
  const showSchematic = !wantWorld || mapBroken || !mapLive;

  /*
   * The satellite tiles for whichever mountain is on screen.
   *
   * Fetched once per resort and held until the resort changes, because the
   * imagery is a property of the ground rather than of the view — orbiting,
   * zooming and planning a route all leave it alone. Not fetched at all until
   * someone asks for satellite, so the common case pays nothing.
   *
   * A failure resolves to null and the map keeps its drawn surface, with the
   * note explaining which one would not load. There is no state where the user
   * is left looking at nothing: the terrain renderer is a complete map and it
   * is already on screen.
   */
  const [drape, setDrape] = useState(null);
  const [detail, setDetail] = useState(null);
  // The last box asked for, so a settle that lands where the previous one did
  // does not fetch it again. A ref, because changing it must not re-render.
  const askedFor = useRef(null);
  useEffect(() => {
    if (mapMode !== "satellite" || !hasMapKey || !resort) {
      setDrape(null);
      return undefined;
    }
    let live = true;
    setMapBroken(false);
    (async () => {
      const { loadImagery, templateTile, checkerTile } = await import("./map/imagery.js");
      /*
       * A tile source that needs no network, for the checks.
       *
       * The machine this is developed on cannot reach api.maptiler.com — the
       * proxy answers 403 at the CONNECT, the same way it does for Overpass —
       * so the only way to know the drape works is to give it tiles from
       * somewhere else. `?maptest=1&tiles=check` swaps in generated ones,
       * which exercises every step that can be wrong: the zoom, the tile
       * range, the composite, the read back, the sampling, and the shading of
       * the result. The only thing it does not exercise is the HTTP request.
       */
      const params = new URLSearchParams(window.location.search);
      const synthetic = params.get("maptest") === "1" && params.get("tiles");
      // The nodes, not the resort's configured bbox. The bbox is the area the
      // Overpass query was drawn around and is deliberately generous; the
      // terrain mesh is built from the nodes that survived, and imagery for a
      // larger box than the mesh is a coarser zoom spent on ground nobody can
      // see.
      const lats = Object.values(NODES).map((n) => n.lat);
      const lons = Object.values(NODES).map((n) => n.lon);
      const w = Math.min(...lons);
      const e = Math.max(...lons);
      const so = Math.min(...lats);
      const no = Math.max(...lats);
      // The same 18% the terrain mesh pads its bounding box by, in
      // src/map/field.js. Without it the outer ring of quads sits off the edge
      // of the tiles that were fetched and falls back to the drawn surface:
      // a white fringe of painted snow all the way round the photograph, which
      // is the first thing the eye goes to.
      const padX = (e - w) * FIELD_PAD;
      const padY = (no - so) * FIELD_PAD;
      const image = await loadImagery({
        bounds: {
          west: w - padX, east: e + padX,
          south: so - padY, north: no + padY,
        },
        urlFor: synthetic ? checkerTile : templateTile(SATELLITE_URL, MAPTILER_KEY),
      });
      if (!live) return;
      if (image) setDrape(image);
      else setMapBroken(true);
    })();
    return () => { live = false; };
  }, [mapMode, resort]);

  // A new resort or a change of map is a different mountain to photograph.
  useEffect(() => {
    setDetail(null);
    askedFor.current = null;
  }, [mapMode, resort]);

  /*
   * Sharper imagery for whatever is in frame, once the camera stops.
   *
   * The base mosaic covers the whole resort and can only be coarse: a dozen
   * kilometres at the half-metre a building needs is ten thousand tiles. Close
   * up that is blocks, which is the point at which a photograph stops looking
   * like one — and close up is exactly when someone is trying to see what the
   * ground does.
   *
   * Zoomed in, though, the ground in frame is a few hundred metres, and that
   * fits in the same handful of tiles four or five zoom levels finer. So the
   * detail layer is the same fetch against a smaller box, and the sampler
   * below prefers it wherever it reaches.
   */
  const onDetail = useCallback(async (want) => {
    if (!want || mapMode !== "satellite" || !hasMapKey) return;
    const key = [want.west, want.south, want.east, want.north]
      .map((n) => n.toFixed(4)).join(",");
    if (askedFor.current === key) return;
    askedFor.current = key;
    const { loadImagery, templateTile, checkerTile, zoomForResolution } =
      await import("./map/imagery.js");
    const params = new URLSearchParams(window.location.search);
    const synthetic = params.get("maptest") === "1" && params.get("tiles");
    const image = await loadImagery({
      bounds: want,
      urlFor: synthetic ? checkerTile : templateTile(SATELLITE_URL, MAPTILER_KEY),
      // No finer than the screen can show. Asking for more is bytes over a
      // mountain connection for detail that is averaged away on arrival.
      atMost: zoomForResolution((want.north + want.south) / 2, want.metresPerPixel),
    });
    // A failure here is not worth a message. The base mosaic is still on the
    // ground and the only difference is that it stays soft.
    if (image && askedFor.current === key) setDetail(image);
  }, [mapMode]);

  /*
   * The two layers as one thing to sample.
   *
   * Detail first, base behind it, because the detail layer covers only what
   * was in frame when it was asked for — pan away and the edges of the
   * mountain fall back to the coarse mosaic rather than to nothing, and the
   * next settle fetches the new box.
   */
  const skin = useMemo(() => {
    if (!drape) return null;
    if (!detail) return drape;
    return { at: (lat, lon) => detail.at(lat, lon) ?? drape.at(lat, lon) };
  }, [drape, detail]);
  // With the button gone this is the only way into the world map, and it has
  // to stay reachable: the code still ships, so it still has to stay walled in
  // to the resort. Opt-in via ?maptest=1, like the other hooks.
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    if (!window.location.search.includes("maptest=1")) return undefined;
    window.__skisSetMapMode = (next) => {
      setMapBroken(false);
      setMapMode(next);
    };
    return () => { delete window.__skisSetMapMode; };
  }, []);
  // MapLibre spawns its own workers for tile parsing, which cannot be
  // constructed from a file:// page's opaque origin. It would fail four times
  // over and then hit the watchdog, so on file:// go straight to the schematic
  // — which is the whole point of having one.
  const canRunMapLibre =
    typeof location === "undefined" || location.protocol !== "file:";
  const tryMapLibre = onMountain && wantWorld && !mapBroken && canRunMapLibre;

  const chosen = routes[pickIndex] || null;
  const shownRoute =
    screen === "choose" ? routes[previewIndex] || routes[0] || null : chosen;

  const routeGeo = useMemo(() => routeToGeoJSON(shownRoute), [shownRoute]);

  const pins = useMemo(() => {
    if (!shownRoute) {
      // Nothing on the mountain until there is a reason for it. The resort
      // screen is the resort: a marker on your base before you have asked for
      // anything says nothing you did not already know, and it is the only
      // thing on an otherwise clean map. Ends appear once you are choosing
      // them on the plan screen, and the route takes over from there.
      if (screen === "explore") return nodesToGeoJSON([], () => ({}));
      // Start wins when a node is both. Most days are a loop, so start and
      // finish are the same place, and asking "is this the finish" first
      // painted the one pin as a destination.
      return nodesToGeoJSON([plan.start, plan.finish].filter((v, i, a) => a.indexOf(v) === i), (key) => ({
        role: key === plan.start ? "start" : "finish",
      }));
    }
    const startKey = shownRoute.segments[0].from;
    const finishKey = shownRoute.segments[shownRoute.segments.length - 1].to;
    const keys = [startKey, finishKey];
    if (screen === "navigate") {
      const here = legsOf(shownRoute)[step]?.from;
      if (here && !keys.includes(here)) keys.push(here);
    }
    return nodesToGeoJSON(
      [...new Set(keys)],
      (key) => {
        // Where you are gets an arrow, and it points at wherever this leg
        // ends: the top of the lift you are riding, or the junction the run
        // finishes at. Passed as a position rather than a heading because the
        // direction on screen depends on where the camera is.
        if (screen === "navigate" && key === legsOf(shownRoute)[step]?.from) {
          // Along the leg, not at the end of it.
          //
          // Aiming at the far node points through the mountain when a piste
          // snakes: you set off one way and the arrow says another. This walks
          // a fifth of the way down the leg's own geometry, which is the
          // direction you actually leave in.
          const line = routeGeo.features.find((f) => f.properties.i === step);
          const pts = line?.geometry?.coordinates ?? [];
          let aim = null;
          if (pts.length >= 2) {
            const seg = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
            let total = 0;
            for (let i = 1; i < pts.length; i++) total += seg(pts[i - 1], pts[i]);
            let run = 0;
            for (let i = 1; i < pts.length; i++) {
              run += seg(pts[i - 1], pts[i]);
              if (run >= total * 0.2) { aim = pts[i]; break; }
            }
            aim = aim || pts[pts.length - 1];
          } else {
            const to = NODES[legsOf(shownRoute)[step].to];
            if (to) aim = [to.lon, to.lat];
          }
          return { role: "now", ...(aim ? { aim } : {}) };
        }
        return key === startKey ? { role: "start" } : { role: "finish" };
      }
    );
    // resort.id because this reads the node set: it happened to recompute on a
    // switch only because plan.start changes too, which is a coincidence to
    // depend on rather than a reason.
  }, [screen, shownRoute, step, plan.start, plan.finish, resort.id]);

  // Test hook, same opt-in as the map's. The heading arrow is painted on a
  // canvas in the dot's own colour, so a check needs the leg it should be
  // following in order to work out where that is.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.location.search.includes("maptest=1")) return;
    const line = routeGeo.features.find((f) => f.properties.i === step);
    window.__skisNavLeg =
      screen === "navigate" && line ? { coords: line.geometry.coordinates } : null;
  }, [screen, step, routeGeo]);

  const focus = useMemo(() => {
    if (screen === "explore" || screen === "plan" || screen === "empty") {
      return {
        kind: "point",
        center: resort.center,
        zoom: resort.zoom,
        pitch: resort.pitch,
        bearing: resort.bearing,
        doneThrough: -1,
        // Nothing covers the map here, so the resort gets the whole screen
        // apart from the pill and the tab bar.
        padding: screen === "explore"
          ? { top: 110, bottom: 90, left: 24, right: 24 }
          : undefined,
      };
    }
    if (screen === "navigate" && shownRoute) {
      const leg = legsOf(shownRoute)[step];
      const from = NODES[leg.from];
      const to = NODES[leg.to];
      return {
        kind: "point",
        center: [(from.lon + to.lon) / 2, (from.lat + to.lat) / 2],
        zoom: 13.4,
        pitch: 66,
        doneThrough: step,
        // The instruction covers the top and the buttons the bottom, so the
        // leg has to be framed in the strip that is left.
        padding: { top: NAV_HEAD_H, bottom: NAV_FOOT_H, left: 24, right: 24 },
      };
    }
    if (shownRoute) {
      return { kind: "bounds", bbox: routeBounds(shownRoute), pitch: 58, doneThrough: -1 };
    }
    return null;
  }, [screen, shownRoute, step, resort]);

  // Floating map chrome sits just above the sheet. When the sheet is dragged up
  // over most of the map there is nothing left to control, so it gets out of
  // the way rather than stacking on top of the header.
  // Everything that floats over the map sits above the tab bar, except while
  // navigating, when the tab bar is out of the way.
  const navigating = onMountain && screen === "navigate";
  // Two screens are not sheets. Explore is the bare mountain with one button
  // on it, and the plan form takes the whole screen: there is nothing to look
  // at on the map while you are setting times, and a form wants its own scroll.
  const exploring = onMountain && screen === "explore";
  const planning = onMountain && screen === "plan";
  /**
   * Choosing is a page now, not a sheet.
   *
   * Five days' worth of shape, vertical, distance, areas, back-by and the
   * refine chips is more than a peek can hold, so it was a sheet you had to
   * drag and then scroll — reading a list through a letterbox while the map
   * behind it showed a route you had not picked yet. The map earns its place
   * one step later, at the route itself, where there is something to look at.
   */
  const choosing = onMountain && screen === "choose";
  const readingLegs = onMountain && screen === "legs";
  const fullPage = planning || choosing || readingLegs;
  const sheetScreen = onMountain && !navigating && !exploring && !fullPage;
  // The map is only on screen on the skiing tab, and a full page covers it.
  // Chrome for a map you cannot see is dead weight in the tab order.
  const mapShowing = onMountain && !fullPage;
  const tabBarShown = !(onMountain && (screen === "navigate" || screen === "solving"));
  const sheetFloor = tabBarShown ? TABBAR_H : 0;
  const chromeBottom = navigating
    ? navFoot
    : exploring
      ? sheetFloor + PLAN_BUTTON_H + 32
      : Math.max(16, sheetHeight + sheetFloor + 14);
  const viewportH = typeof window === "undefined" ? 900 : window.innerHeight;
  // Navigate has no sheet: its panel is pinned so nothing moves inside a
  // glove. Reading sheetHeight there meant the chrome inherited whatever the
  // detail sheet had last been dragged to, so anyone who pulled the route
  // detail up to read the numbers started the descent with no compass, no
  // recentre and no zoom — for the whole run. What does hide them on this
  // screen is the route list, which covers the map they control.
  const chromeHidden = navigating ? navExpanded : sheetHeight > viewportH * 0.74;

  // ---- actions ------------------------------------------------------------

  /**
   * The longest day this mountain supports, or null if it supports none.
   *
   * Cuts the budget in steps until something comes back, which finds the
   * answer in a few solves rather than scanning. Only ever called after a
   * solve has already returned nothing, so the cost lands on a path that is
   * otherwise a dead end.
   */
  const longestDay = useCallback(async (solverOpts) => {
    const attempt = async (budget) => {
      if (budget < 30) return null;
      const probe = await solve({ ...solverOpts, budget, graph: solverGraph, count: 1 });
      return probe?.routes?.length ? probe.routes[0].minutes : null;
    };

    // The pair has to come from the same probe. Tracked apart, the answer
    // was "the longest day here is about 5h 59m" over a button offering to
    // plan until 16:21 — which is 7h 16m, and is the largest budget that
    // happened to return anything rather than the day it returned.
    let lo = 0, hi = solverOpts.budget, best = null;
    for (const fraction of [0.66, 0.45, 0.3, 0.2]) {
      const budget = Math.round(solverOpts.budget * fraction);
      const minutes = await attempt(budget);
      if (minutes) { lo = budget; best = { minutes, budget }; break; }
      hi = budget;
    }
    // Nothing at a fifth of the day either. Reported as zero rather than as
    // null, because "probed and found nothing" and "never probed" lead to
    // different things to say, and a blue skier at Monterosa is the first.
    if (best === null) return { minutes: 0, budget: 0 };


    // Then close the gap. The coarse steps answered "about 4h 45m" where six
    // hours was on offer, and the fix built from that number offered to plan
    // a day an hour and a quarter shorter than the mountain supports. Four
    // more solves is a fifth of a second on a path that is already a dead end.
    for (let i = 0; i < 4 && hi - lo > 15; i++) {
      const mid = Math.round((lo + hi) / 2);
      const minutes = await attempt(mid);
      // A longer day, or nothing new. The budget kept is the smallest one
      // that reached this length, so the finish time offered sits just past
      // where the route actually ends rather than hours beyond it.
      if (minutes) { lo = mid; if (minutes > best.minutes) best = { minutes, budget: mid }; }
      else hi = mid;
    }
    // `budget` as well as `minutes`, because the fix built from this has to
    // re-solve and get an answer. solve() is deterministic per options, so
    // the same budget reproduces the route that was just found — asking for
    // the route's own length instead is a different question, and at
    // Paganella it came back empty: "Plan to 14:14 instead" offered a day
    // the app could not then plan.
    return best;
  }, [solve, solverGraph]);

  const runSolve = useCallback(
    async (nextPlan, nextAbility, nextRefine, { showSolving = false, fromRefine = false } = {}) => {
      const solverOpts = toSolverOpts({
        plan: nextPlan,
        ability: nextAbility,
        refine: nextRefine,
      });
      setOpts(solverOpts);

      if (showSolving) setScreen("solving");
      const started = performance.now();

      // "Straight there" is a different question: not how to fill a day, but
      // how to get from here to there. One answer, found exactly rather than
      // sampled, so there is nothing to rank.
      if (nextPlan.mode === "direct") {
        const route = directRoute(solverOpts);
        if (showSolving) {
          const held = performance.now() - started;
          if (held < 700) await new Promise((r) => setTimeout(r, 700 - held));
        }
        if (!route || route.minutes > solverOpts.budget) {
          setRoutes([]);
          setDiagnosis(diagnoseDirect(nextPlan, solverOpts, route));
          setScreen("empty");
        } else {
          setRoutes([route]);
          setPickIndex(0);
          setPreviewIndex(0);
          setScreen("detail");
        }
        return;
      }

      const result = await solve({ ...solverOpts, graph: solverGraph });
      if (!result) return; // superseded by a newer request

      // A solving screen that flashes is worse than no solving screen. Hold it
      // for a readable beat, but only on a first solve — refine must feel like
      // the list changing, not a round trip.
      if (showSolving) {
        const held = performance.now() - started;
        if (held < 900) await new Promise((r) => setTimeout(r, 900 - held));
      }

      setRoutes(result.routes);
      setPickIndex(0);
      setPreviewIndex(0);

      if (result.failed) {
        // The planner itself broke. Saying "nothing fits" here would be a lie
        // about the mountain, and leaving the spinner up is worse than both.
        setDiagnosis({
          eyebrow: "Not your plan",
          title: "That didn't work",
          headline: "The planner stopped short.",
          body: "Something went wrong working out your day, so there is nothing to show. Trying again usually clears it.",
          fixes: [],
        });
        setScreen("empty");
      } else if (!result.routes.length && fromRefine) {
        // A chip that empties the list must not throw the user onto a screen
        // whose only way out is the form. The chips are the way back, so stay
        // where they are and say which one did it.
        setScreen("choose");
      } else if (!result.routes.length) {
        // Before blaming the clock, find out whether this mountain can fill
        // any day at all. A small resort and a full-day plan fails for the
        // opposite reason — routes exist, there is just not enough terrain to
        // fill the hours — and saying "everything overruns" there is simply
        // untrue. One extra solve, on a path that already has nothing to show.
        const capacityNow = await longestDay(solverOpts);
        setCapacity(capacityNow);
        // The refined ability is what actually constrained the search.
        setDiagnosis(diagnose(nextPlan, solverOpts.ability, solverOpts, resort, capacityNow));
        setScreen("empty");
      } else {
        setScreen("choose");
      }
    },
    // solverGraph belongs here: without it this callback keeps the graph from
    // the resort that was active when it was created, which is the same freeze
    // as a module-scope constant and just as quiet.
    [solve, solverGraph, resort, longestDay]
  );

  const onSolve = () => runSolve(plan, ability, refine, { showSolving: true });

  const onRefine = (id) => {
    if (plan.mode === "direct") return;
    const next = toggleRefinement(refine, id);
    setRefine(next);
    // Re-solves in place, never back to the form.
    runSolve(plan, ability, next, { fromRefine: true });
  };

  const onFix = (id) => {
    if (id === "laterFinish") {
      const nextPlan = { ...plan, t1: Math.min(plan.t1 + 45, resort.lastDown) };
      setPlan(nextPlan);
      runSolve(nextPlan, ability, refine, { showSolving: true });
    } else if (id === "dropLunch") {
      const nextPlan = { ...plan, lunch: false };
      const next = new Set(refine);
      next.delete("lunch");
      setPlan(nextPlan);
      setRefine(next);
      runSolve(nextPlan, ability, next, { showSolving: true });
    } else if (id === "finishHere") {
      const nextPlan = { ...plan, finish: plan.start };
      setPlan(nextPlan);
      runSolve(nextPlan, ability, refine, { showSolving: true });
    } else if (id === "shorterDay") {
      // Finish when the mountain runs out rather than when you asked to.
      const t1 = plan.t0 + (capacity.budget || capacity.minutes) + (plan.lunch ? LUNCH_MINUTES : 0);
      const nextPlan = { ...plan, t1 };
      setPlan(nextPlan);
      runSolve(nextPlan, ability, refine, { showSolving: true });
    } else if (id === "harder") {
      const next = toggleRefinement(refine, "harder");
      setRefine(next);
      runSolve(plan, ability, next, { showSolving: true });
    }
  };

  /** Behind schedule mid-route: re-solve from where you are, with what is left. */
  const onReplan = (fromNode) => {
    const nextPlan = { ...plan, start: fromNode, t0: nowMinutes() };
    setPlan(nextPlan);
    setStep(0);
    runSolve(nextPlan, ability, refine, { showSolving: true });
  };

  /**
   * Snap the start to wherever the phone says you are.
   *
   * Every outcome has to say something. A tap that quietly does nothing is
   * indistinguishable from a broken button, and the one case where that is
   * most likely — planning tomorrow from a hotel in another valley — is also
   * the case where the user most needs to be told why.
   */
  const onLocate = () => {
    if (!navigator.geolocation) {
      setGps({ state: "unavailable" });
      return;
    }
    // Geolocation only works in a secure context. Over http on a LAN address —
    // which is exactly how you test this on a phone — the browser reports a
    // denied permission, and blaming the permission sends you to settings to
    // toggle something that was never the problem.
    if (typeof window !== "undefined" && window.isSecureContext === false) {
      setGps({ state: "insecure" });
      return;
    }
    setGps({ state: "locating" });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { key, metres } = nearestNode(pos.coords.latitude, pos.coords.longitude);
        // A fix five valleys away is not a start node.
        if (metres > MAX_SNAP_METRES) {
          setGps({ state: "far", km: Math.round(metres / 1000) });
          return;
        }
        setGps({ state: "ok", key });
        setPlan((p) => ({ ...p, start: key }));
      },
      (error) => {
        setGps({ state: error?.code === 1 ? "denied" : "unavailable" });
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  };

  const chooseResort = (id) => {
    // The graph swaps first and synchronously. defaultPlan below reads the
    // node set to choose a start, and everything rendered after this state
    // update reads it too, so a render must never straddle two mountains.
    const graph = graphFor(id);
    if (!graph) return; // no data for it; the picker should not have offered it
    setActiveResort(id, graph);

    setResortId(id);
    save("resortId", id);
    setRoutes([]);
    setRefine(new Set());
    setPickIndex(0);
    setPreviewIndex(0);
    setStep(0);
    // A fix that was near the old resort's lifts says nothing about this one,
    // and its node key does not exist in this graph. Cleared rather than
    // carried: one tap of "use my location" re-derives it against the mountain
    // you are actually looking at, and the distance guard still applies.
    setGps(null);
    const next = getResort(id);
    // Recomputed for the resort being switched to: the context depends on that
    // resort's lift hours, so the one memoised for the old resort can be wrong.
    setPlan(defaultPlan(next, detectContext(nowMinutes(), next), nowMinutes(), null));
    setScreen("explore");
  };

  /** Finishing a day is the only thing that writes to the record. */
  const finishDay = () => {
    if (chosen) recordDay({ route: chosen, resortId: resort.id });
    setHistoryVersion((v) => v + 1);
    setScreen("summary");
  };

  const dismissNote = () => {
    setNoteOpen(false);
    save("seenMapNote", true);
  };

  useEffect(() => {
    if (screen === "navigate") setStep(0);
  }, [chosen]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- render -------------------------------------------------------------

  const MapLayer = (
    <>
      {tryMapLibre && (
        <Suspense fallback={null}>
          <MapCanvas
            resort={resort}
            graph={graphGeo}
            route={routeGeo}
            pins={pins}
            focus={focus}
            imagery={mapMode === "satellite" ? "satellite" : "winter"}
            doneThrough={focus?.doneThrough ?? -1}
            onReady={() => setMapLive(true)}
            onFail={() => {
              setMapBroken(true);
              setMapLive(false);
            }}
            controlRef={mapLive ? mapControl : { current: null }}
          />
        </Suspense>
      )}
      {onMountain && showSchematic && (
        <FallbackTerrain
          route={routeGeo}
          graph={graphGeo}
          pins={pins}
          camera={focus}
          controlRef={mapControl}
          viewportBottom={
            navigating ? navFoot : exploring ? PLAN_BUTTON_H + 28 : sheetHeight
          }
          block
          viewportTop={navigating ? NAV_HEAD_H : 0}
          imagery={skin}
          onDetail={onDetail}
          onScale={setMapScale}
        />
      )}
    </>
  );

  return (
    <main className="app" style={{ "--sheet-floor": `${sheetFloor}px` }}>
      {MapLayer}

      <div className="topbar">
        {onMountain && screen === "explore" && (
          <div className="resortbar">
            <button
              className="resortbar__main"
              onClick={() => setStatusOpen(true)}
              aria-label={`${resort.name}, see what is open`}
            >
              <Mountain width="16" height="16" style={{ flex: "none" }} />
              <span className="resortbar__nm">{resort.name}</span>
              <Info width="15" height="15" className="resortbar__i" />
            </button>
            <span className="resortbar__sep" />
            <button className="resortbar__change" onClick={() => setTab("home")}>
              Change
            </button>
          </div>
        )}
        {!["explore", "plan", "solving", "summary", "navigate"].includes(screen) && (
          <button
            className="iconbtn"
            aria-label="Back"
            onClick={() =>
              setScreen(
                screen === "detail"
                  ? plan.mode === "direct"
                    ? "plan"
                    : "choose"
                  : "plan"
              )
            }
          >
            <Back />
          </button>
        )}
        {screen !== "explore" && <span className="topbar__spacer" />}
      </div>

      {mapShowing && mapScale && (
        <div
          className={`mapscale${chromeHidden ? " mapscale--hidden" : ""}`}
          style={{ bottom: chromeBottom, width: mapScale.px }}
          aria-hidden="true"
        >
          <span>{mapScale.metres >= 1000 ? `${mapScale.metres / 1000} km` : `${mapScale.metres} m`}</span>
        </div>
      )}

      {mapShowing && (
      <div
        className={`maptools${chromeHidden ? " maptools--hidden" : ""}`}
        style={{ bottom: chromeBottom }}
        aria-hidden={chromeHidden}
        // `inert` keeps these out of the tab order while hidden. aria-hidden on
        // its own would leave focusable buttons inside a hidden subtree, which
        // is worse than not hiding them at all.
        {...(chromeHidden ? { inert: "" } : {})}
      >
        {/* What you are looking at, rather than where. Sits at the top of the
            stack because it is the one control you press once and then leave
            alone, and the ones below it are the ones you press repeatedly. */}
        <button
          className={`iconbtn${layersOpen ? " iconbtn--on" : ""}`}
          aria-label="Choose the map"
          aria-expanded={layersOpen}
          onClick={() => setLayersOpen((open) => !open)}
        >
          <Layers />
        </button>
        <button
          className="iconbtn iconbtn--compass"
          aria-label="Face north"
          onClick={() => mapControl.current?.resetNorth()}
        >
          <Compass />
        </button>
        {/* Two controls, two meanings. The compass faces north and leaves your
            framing alone; this puts the whole camera back where it started. */}
        <button
          className="iconbtn"
          aria-label="Recentre the view"
          onClick={() => mapControl.current?.resetView()}
        >
          <Locate />
        </button>
        <button className="iconbtn" aria-label="Zoom in" onClick={() => mapControl.current?.zoom(1)}>
          <Plus />
        </button>
        <button className="iconbtn" aria-label="Zoom out" onClick={() => mapControl.current?.zoom(-1)}>
          <Minus />
        </button>
      </div>
      )}

      {mapShowing && layersOpen && !chromeHidden && (
        <div className="layers" style={{ bottom: chromeBottom }} role="group" aria-label="Map">
          {MAP_CHOICES.map((choice) => {
            const locked = choice.needsKey && !hasMapKey;
            return (
              <button
                key={choice.id}
                className={`layers__opt${mapMode === choice.id ? " layers__opt--on" : ""}`}
                aria-pressed={mapMode === choice.id}
                disabled={locked}
                // The reason is on the disabled ones only. Explaining the
                // choice you can already see is words in the way of it.
                title={locked ? "Needs a MapTiler key" : undefined}
                onClick={() => chooseMap(choice.id)}
              >
                {choice.name}
                {locked && <i>Needs a key</i>}
              </button>
            );
          })}
        </div>
      )}

      {/* Only once the schematic is what you are actually going to be looking
          at. Without a key that is immediate; with one it means MapLibre gave
          up, and gating on that stops the note flashing while it loads. */}
      {/* The mountain has no visible heading, being a map. Screen readers still
          need somewhere to land. */}
      {exploring && <h1 className="visually-hidden">{resort.name}</h1>}

      {/* Plan sits in the thumb zone rather than a top corner. This is a phone
          held in one gloved hand, and it is the one thing on this screen you
          do every single time. */}
      {exploring && <PlanButton onPlan={() => setScreen("plan")} />}

      {noteOpen && mapShowing && !chromeHidden && (
        mapBroken && (wantWorld || mapMode === "satellite") ? (
        <div className="mapnote" style={{ bottom: chromeBottom + (mapScale ? SCALE_CLEARANCE : 0) }}>
          <Info width="16" height="16" style={{ flex: "none" }} />
          {/* Named the way the layer control names them. "The world map"
              and "the cut-out" are what these are called in the source, and
              neither is on the menu the reader just used — one of them is not
              on any menu. It matters more now that Satellite is the default:
              a wrong key, or an origin restriction that does not list this
              site, and this sentence is the first thing anyone sees. */}
          <span className="mapnote__t">
            {mapChoiceName(mapMode)} would not load. Showing Terrain instead.
          </span>
          <button className="mapnote__x" onClick={dismissNote} aria-label="Dismiss">
            <Close width="16" height="16" />
          </button>
        </div>
        ) : screen === "plan" ? (
        <div className="mapnote" style={{ bottom: chromeBottom + (mapScale ? SCALE_CLEARANCE : 0) }}>
          <Info width="16" height="16" style={{ flex: "none" }} />
          <span className="mapnote__t">Drag to orbit the resort. Pinch to zoom.</span>
          <button className="mapnote__x" onClick={dismissNote} aria-label="Dismiss">
            <Close width="16" height="16" />
          </button>
        </div>
        ) : null
      )}

      {tab === "home" && (
        <HomeScreen
          selected={resortId}
          onSelect={chooseResort}
          onGoSkiing={() => setTab("skiing")}
          onSettings={() => setSettingsOpen(true)}
          friends={{
            profile: getProfile(),
            friends: listFriends(),
            error: friendError,
            onAdd: () => setAddingFriend(true),
            onSetUp: () => setSettingsOpen(true),
            onToggle: (f) => {
              const r = setSharing(f.phone, !f.sharing);
              setFriendError(r.ok ? null : r);
              setFriendsAt((n) => n + 1);
            },
            onRemove: (f) => {
              removeFriend(f.phone);
              setFriendError(null);
              setFriendsAt((n) => n + 1);
            },
          }}
        />
      )}

      {tab === "stats" && (
        <StatsScreen
          version={historyVersion}
          onChanged={() => setHistoryVersion((v) => v + 1)}
        />
      )}

      {planning && (
        <PlanScreen
          resort={resort}
          plan={plan}
          setPlan={setPlan}
          ability={ability}
          setAbility={setAbility}
          context={context}
          gps={gps}
          onLocate={onLocate}
          onSolve={onSolve}
          onBack={() => setScreen("explore")}
        />
      )}

      {/* `choosing`, not `screen === "choose"`: this is a full page at the
          same layer as Home and Stats, and without the tab check it stayed
          mounted over them. Tapping Home from the options list left the
          resort list underneath an unrelated page of routes. */}
      {readingLegs && chosen && opts && (
        <LegsScreen
          route={chosen}
          opts={opts}
          plan={plan}
          onBack={() => setScreen("detail")}
        />
      )}

      {choosing && opts && (
        <ChooseScreen
          routes={routes}
          opts={opts}
          plan={plan}
          ability={ability}
          refine={refine}
          solving={solving}
          activeIndex={previewIndex}
          onHover={setPreviewIndex}
          onPreview={setPreviewIndex}
          onRefine={onRefine}
          onPick={(i) => {
            setPickIndex(i);
            setPreviewIndex(i);
            setScreen("detail");
          }}
          onBack={() => setScreen("plan")}
        />
      )}

      {sheetScreen && (
      <Sheet onSnapChange={setSheetHeight}>
        {screen === "solving" && <SolvingScreen />}

        {screen === "empty" && diagnosis && (
          <EmptyScreen
            diagnosis={diagnosis}
            plan={plan}
            resort={resort}
            capacity={capacity}
            ability={opts?.ability ?? ability}
            onFix={onFix}
            onBack={() => setScreen("plan")}
          />
        )}

        {screen === "detail" && chosen && opts && (
          <DetailScreen
            route={chosen}
            opts={opts}
            plan={plan}
            resortId={resort.id}
            onStart={() => {
              setStep(0);
              setScreen("navigate");
            }}
            onBack={() => setScreen(plan.mode === "direct" ? "plan" : "choose")}
            onLegs={() => setScreen("legs")}
          />
        )}

        {screen === "summary" && chosen && opts && (
          <SummaryScreen
            route={chosen}
            opts={opts}
            plan={plan}
            onAgain={() => {
              setRefine(new Set());
              setScreen("explore");
            }}
            onDone={() => setTab("stats")}
          />
        )}
      </Sheet>
      )}

      {/* Navigating is a different interface, not a different sheet. Fixed
          panels, nothing draggable, the map in between. */}
      {navigating && chosen && opts && (
        <NavigateScreen
          route={chosen}
          opts={opts}
          plan={plan}
          step={step}
          onStep={setStep}
          onFinish={finishDay}
          onReplan={onReplan}
          onAbandon={() => setScreen("detail")}
          onFootHeight={setNavFoot}
          onExpand={setNavExpanded}
        />
      )}

      {/* Navigating is full screen: the tab bar is somewhere to go afterwards,
          not while you are looking for the next junction. */}
      <TabBar
        tab={tab}
        onChange={(next) => {
          setTab(next);
          if (next === "skiing" && screen === "summary") setScreen("explore");
        }}
        hidden={!tabBarShown}
      />

      {settingsOpen && (
        <SettingsSheet
          ability={ability}
          setAbility={setAbility}
          onClose={() => setSettingsOpen(false)}
          onProfileChange={() => setFriendsAt((n) => n + 1)}
        />
      )}

      {addingFriend && (
        <AddFriend
          onSave={(fields) => {
            const r = addFriend(fields);
            if (r.ok) {
              setFriendError(null);
              setFriendsAt((n) => n + 1);
            }
            return r;
          }}
          onClose={() => setAddingFriend(false)}
        />
      )}

      {statusOpen && (
        <ResortStatus resort={resort} onClose={() => setStatusOpen(false)} />
      )}
    </main>
  );
}
