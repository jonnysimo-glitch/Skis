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
import { hasMapKey } from "./map/config.js";

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
import ResortStatus from "./screens/ResortStatus.jsx";
import TabBar from "./ui/TabBar.jsx";
import PlanScreen from "./screens/PlanScreen.jsx";
import SolvingScreen from "./screens/SolvingScreen.jsx";
import ChooseScreen from "./screens/ChooseScreen.jsx";
import DetailScreen from "./screens/DetailScreen.jsx";
import NavigateScreen from "./screens/NavigateScreen.jsx";
import SummaryScreen from "./screens/SummaryScreen.jsx";
import EmptyScreen from "./screens/EmptyScreen.jsx";
import PlanButton from "./ui/PlanButton.jsx";

import { getResort, defaultResort } from "./resorts/index.js";
import { recordDay } from "./lib/history.js";
import { NODES, buildEdges } from "./resort.js";
import { useSolver } from "./lib/useSolver.js";
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
import { Compass, Layers, Plus, Minus, Close, Info, Back, Mountain } from "./ui/Icons.jsx";

const EDGES = buildEdges();
const GRAPH_GEOJSON = graphToGeoJSON(EDGES);
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
 * Every screen opens on one of the three named stops rather than a fraction of
 * its own. A bespoke target gets added to the snap list, so it used to put two
 * stops a tenth apart and the drag lost its snap.
 */
const SNAP_FOR = {
  solving: "peek",
  choose: "half",
  detail: "half",
  summary: "half",
  empty: "half",
};

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
  const resort = getResort(resortId) || defaultResort;

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

  const setAbility = (value) => {
    setAbilityState(value);
    save("profile", { ability: value });
  };

  // ---- solving ------------------------------------------------------------
  const { solve, solving } = useSolver();
  const [refine, setRefine] = useState(() => new Set());
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

  // Two map layers, and the cut-out is the default.
  //
  // The cut-out shows the resort and nothing else: a slab of terrain with an
  // edge and a bottom, so you can see the whole mountain as one object and
  // tell where it stops. A continuous world map cannot do that. It has real
  // imagery, which is prettier, but it also runs to the horizon in every
  // direction, and on a phone that reads as being lost rather than as being
  // somewhere. The resort is the subject; the rest of the Alps is not.
  //
  // The world map stays one tap away rather than being deleted, because it is
  // the better view once you know where you are, and because the brief asks
  // for real terrain.
  const onMountain = tab === "skiing";
  const [mapMode, setMapMode] = useState("cutout"); // 'cutout' | 'world'
  const [statusOpen, setStatusOpen] = useState(false);
  const wantWorld = mapMode === "world";
  const showSchematic = !wantWorld || mapBroken || !mapLive;
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
      return nodesToGeoJSON([plan.start, plan.finish].filter((v, i, a) => a.indexOf(v) === i), (key) => ({
        role: key === plan.finish ? "finish" : "start",
      }));
    }
    const startKey = shownRoute.segments[0].from;
    const finishKey = shownRoute.segments[shownRoute.segments.length - 1].to;
    const keys = [startKey, finishKey];
    if (screen === "navigate") {
      const here = shownRoute.segments[step]?.from;
      if (here && !keys.includes(here)) keys.push(here);
    }
    return nodesToGeoJSON(
      [...new Set(keys)],
      (key) =>
        screen === "navigate" && key === shownRoute.segments[step]?.from
          ? { role: "now" }
          : key === finishKey
            ? { role: "finish" }
            : { role: "start" }
    );
  }, [screen, shownRoute, step, plan.start, plan.finish]);

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
      const leg = shownRoute.segments[step];
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
  const sheetScreen = onMountain && !navigating && !exploring && !planning;
  // The map is only on screen on the skiing tab, and the plan form covers it.
  // Chrome for a map you cannot see is dead weight in the tab order.
  const mapShowing = onMountain && !planning;
  const tabBarShown = !(onMountain && (screen === "navigate" || screen === "solving"));
  const sheetFloor = tabBarShown ? TABBAR_H : 0;
  const chromeBottom = navigating
    ? NAV_FOOT_H
    : exploring
      ? sheetFloor + PLAN_BUTTON_H + 32
      : Math.max(16, sheetHeight + sheetFloor + 14);
  const viewportH = typeof window === "undefined" ? 900 : window.innerHeight;
  const chromeHidden = sheetHeight > viewportH * 0.74;

  // ---- actions ------------------------------------------------------------

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

      const result = await solve(solverOpts);
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
        // The refined ability is what actually constrained the search.
        setDiagnosis(diagnose(nextPlan, solverOpts.ability, solverOpts));
        setScreen("empty");
      } else {
        setScreen("choose");
      }
    },
    [solve]
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
    setResortId(id);
    save("resortId", id);
    setRoutes([]);
    setRefine(new Set());
    setPickIndex(0);
    setPreviewIndex(0);
    setStep(0);
    const next = getResort(id);
    // Recomputed for the resort being switched to: the context depends on that
    // resort's lift hours, so the one memoised for the old resort can be wrong.
    setPlan(defaultPlan(
      next,
      detectContext(nowMinutes(), next),
      nowMinutes(),
      gps?.state === "ok" ? gps.key : null
    ));
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
            graph={GRAPH_GEOJSON}
            route={routeGeo}
            pins={pins}
            focus={focus}
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
          graph={GRAPH_GEOJSON}
          pins={pins}
          camera={focus}
          controlRef={mapControl}
          viewportBottom={
            navigating ? NAV_FOOT_H : exploring ? PLAN_BUTTON_H + 28 : sheetHeight
          }
          block={!navigating}
          viewportTop={navigating ? NAV_HEAD_H : 0}
        />
      )}
    </>
  );

  return (
    <main className="app" style={{ "--sheet-floor": `${sheetFloor}px` }}>
      {MapLayer}

      <div className="topbar">
        {onMountain && screen === "explore" && (
          <>
            <button className="resortpill" onClick={() => setTab("home")}>
              <Mountain width="16" height="16" />
              <span className="resortpill__nm">{resort.name}</span>
              <span className="resortpill__x">Change</span>
            </button>
            {/* Beside the resort name rather than in a card over the terrain.
                What is open is a fact about the resort, and this screen is
                deliberately the mountain and one button. */}
            <button className="openbtn" onClick={() => setStatusOpen(true)}>
              <Info width="15" height="15" />
              Open
            </button>
          </>
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
        <button
          className="iconbtn"
          aria-label="Face north and tilt"
          onClick={() => mapControl.current?.resetNorth()}
        >
          <Compass />
        </button>
        <button
          className={`iconbtn${wantWorld ? " iconbtn--on" : ""}`}
          aria-label={wantWorld ? "Show the resort cut-out" : "Show the world map"}
          aria-pressed={wantWorld}
          onClick={() => {
            setMapMode(wantWorld ? "cutout" : "world");
            // A previous failure should not stop the user asking again.
            if (!wantWorld) setMapBroken(false);
          }}
        >
          <Layers />
        </button>
        <button className="iconbtn" aria-label="Zoom in" onClick={() => mapControl.current?.zoom(1)}>
          <Plus />
        </button>
        <button className="iconbtn" aria-label="Zoom out" onClick={() => mapControl.current?.zoom(-1)}>
          <Minus />
        </button>
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
        mapBroken && wantWorld ? (
        <div className="mapnote" style={{ bottom: chromeBottom }}>
          <Info width="16" height="16" style={{ flex: "none" }} />
          <span className="mapnote__t">The world map would not load. Showing the cut-out.</span>
          <button className="mapnote__x" onClick={dismissNote} aria-label="Dismiss">
            <Close width="16" height="16" />
          </button>
        </div>
        ) : screen === "plan" ? (
        <div className="mapnote" style={{ bottom: chromeBottom }}>
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

      {sheetScreen && (
      <Sheet snap={SNAP_FOR[screen]} onSnapChange={setSheetHeight}>
        {screen === "solving" && <SolvingScreen />}

        {screen === "choose" && opts && (
          <ChooseScreen
            routes={routes}
            opts={opts}
            plan={plan}
            ability={ability}
            refine={refine}
            solving={solving}
            activeIndex={previewIndex}
            onHover={setPreviewIndex}
            onRefine={onRefine}
            onPick={(i) => {
              setPickIndex(i);
              setPreviewIndex(i);
              setScreen("detail");
            }}
            onBack={() => setScreen("plan")}
          />
        )}

        {screen === "empty" && diagnosis && (
          <EmptyScreen
            diagnosis={diagnosis}
            plan={plan}
            resort={resort}
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
        />
      )}

      {statusOpen && (
        <ResortStatus resort={resort} onClose={() => setStatusOpen(false)} />
      )}
    </main>
  );
}
