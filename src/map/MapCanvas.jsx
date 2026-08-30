/**
 * The 3D map. Full-bleed, always mounted, never boxed into a card.
 *
 * MapLibre GL JS over MapTiler terrain-RGB. Terrain exaggeration sits at 1.5
 * because real alpine relief looks flat at 1.0 on a phone. Pitch starts at 60
 * and the user can orbit and pitch freely from there.
 */
import { useEffect, useRef } from "react";
// MapLibre 6 dropped its default export; the classes are named exports now.
import { Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  STYLE_CHAIN,
  styleUrl,
  hasMapKey,
  maptilerTerrain,
  openTerrainStyle,
  TERRAIN_EXAGGERATION,
} from "./config.js";
import { addRouteLayers, setData, markProgress } from "./layers.js";

/**
 * How long to wait for the map to settle before giving up on it. Generous
 * enough for a slow lift-station connection, short enough that nobody stares
 * at an empty rectangle wondering if the app is broken.
 */
const MAP_RENDER_TIMEOUT_MS = 9000;

export default function MapCanvas({
  resort,
  graph,
  route,
  pins,
  focus,          // 'resort' | 'route' | 'leg'
  legIndex,
  doneThrough,
  onReady,
  onFail,
  controlRef,
}) {
  const holder = useRef(null);
  const mapRef = useRef(null);
  const readyRef = useRef(false);

  /**
   * Does this browser have what MapLibre needs? Cheap to ask, and a blank blue
   * rectangle is the worst possible answer to "where am I on the mountain".
   */
  const canRender = () => {
    try {
      const probe = document.createElement("canvas");
      return !!(probe.getContext("webgl2") || probe.getContext("webgl"));
    } catch {
      return false;
    }
  };

  // ---- create once -------------------------------------------------------
  useEffect(() => {
    if (!holder.current || mapRef.current) return;
    if (!canRender()) {
      onFail?.(new Error("no WebGL"));
      return undefined;
    }
    let cancelled = false;
    let styleIndex = 0;

    const map = new MapLibreMap({
      container: holder.current,
      // With a key, the winter basemap brings its own pistes and lifts. Without
      // one, a style built straight from open elevation data: no basemap, but
      // the real shape of the mountain rather than a schematic of it.
      style: hasMapKey ? styleUrl(STYLE_CHAIN[0]) : openTerrainStyle(),
      center: resort.center,
      zoom: resort.zoom,
      pitch: resort.pitch,
      bearing: resort.bearing,
      maxPitch: 80,
      attributionControl: { compact: true },
      // Terrain queries are expensive; this keeps panning smooth on a phone.
      maxTileCacheSize: 400,
    });
    mapRef.current = map;

    map.on("error", (event) => {
      const failedStyle = event?.error?.status === 403 || event?.error?.status === 404;
      if (!failedStyle || readyRef.current) return;
      // A MapTiler style that has moved is recoverable — walk the chain first,
      // then drop to the keyless terrain style, and only then give up entirely.
      if (hasMapKey && styleIndex < STYLE_CHAIN.length - 1) {
        styleIndex += 1;
        map.setStyle(styleUrl(STYLE_CHAIN[styleIndex]));
        return;
      }
      if (hasMapKey) {
        styleIndex = STYLE_CHAIN.length;
        map.setStyle(openTerrainStyle());
        return;
      }
      onFail?.(event?.error);
    });

    map.on("style.load", () => {
      if (cancelled) return;
      try {
        // The keyless style declares its own terrain source and 3D terrain, so
        // only the MapTiler path needs wiring up here.
        if (!map.getSource("terrain")) {
          map.addSource("terrain", maptilerTerrain);
        }
        if (!map.getTerrain()) {
          map.setTerrain({ source: "terrain", exaggeration: TERRAIN_EXAGGERATION });
        }
        if (!map.getLayer("sky")) {
          map.addLayer({
            id: "sky",
            type: "sky",
            paint: {
              "sky-type": "atmosphere",
              "sky-atmosphere-sun-intensity": 6,
              "sky-atmosphere-color": "#bfd8e8",
              "sky-atmosphere-halo-color": "#ffffff",
            },
          });
        }
      } catch {
        /* Terrain unavailable — a flat basemap still beats nothing. */
      }
      addRouteLayers(map, { graph, route, pins });
      readyRef.current = true;
      // Test hook. The map is the one part of this app that cannot be checked
      // from the DOM — a camera pointing at empty sky and a layer that failed
      // to paint look identical from outside. Opt-in via ?maptest=1 so it is
      // never exposed to an ordinary visitor.
      if (typeof window !== "undefined" && window.location.search.includes("maptest=1")) {
        window.__skisMap = map;
      }
      // Deliberately NOT onReady here. A parsed style is not a painted map —
      // WebGL can be present and still draw nothing. The caller is told only
      // once MapLibre has actually settled a frame, below.
    });

    map.once("idle", () => {
      if (cancelled) return;
      onReady?.(map);
    });

    // Two-finger drag pitches, one finger rotates: orbiting the mountain is
    // the whole point of the 3D view.
    map.touchZoomRotate.enable({ around: "center" });
    map.dragRotate.enable();

    /**
     * Watchdog.
     *
     * WebGL can be present and still not draw — a software renderer that
     * cannot run MapLibre's shaders, a driver blocklist, tiles that never
     * arrive on a bad connection. All of those look identical from outside:
     * an empty rectangle where the mountain should be. If nothing has settled
     * by now, hand over to the schematic view, which needs neither a GPU nor a
     * network.
     */
    const watchdog = setTimeout(() => {
      if (cancelled) return;
      if (!map.loaded()) onFail?.(new Error("map did not finish rendering"));
    }, MAP_RENDER_TIMEOUT_MS);
    map.once("idle", () => clearTimeout(watchdog));

    return () => {
      cancelled = true;
      readyRef.current = false;
      clearTimeout(watchdog);
      map.remove();
      mapRef.current = null;
    };
    // Created once for the life of the resort selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resort.id]);

  // ---- imperative camera controls for the floating buttons ---------------
  useEffect(() => {
    if (!controlRef) return;
    controlRef.current = {
      orbit: (deg) => mapRef.current?.easeTo({ bearing: (mapRef.current.getBearing() + deg), duration: 550 }),
      resetNorth: () => mapRef.current?.easeTo({ bearing: 0, pitch: 60, duration: 650 }),
      flat: () => {
        const map = mapRef.current;
        if (!map) return;
        const flat = map.getPitch() > 12;
        map.easeTo({ pitch: flat ? 0 : 62, duration: 650 });
      },
      zoom: (delta) => mapRef.current?.easeTo({ zoom: mapRef.current.getZoom() + delta, duration: 350 }),
      isFlat: () => (mapRef.current?.getPitch() ?? 0) < 12,
    };
  }, [controlRef]);

  // ---- data ---------------------------------------------------------------
  useEffect(() => {
    if (!mapRef.current || !readyRef.current) return;
    setData(mapRef.current, "graph", graph);
  }, [graph]);

  useEffect(() => {
    if (!mapRef.current || !readyRef.current) return;
    setData(mapRef.current, "route", route);
  }, [route]);

  useEffect(() => {
    if (!mapRef.current || !readyRef.current) return;
    setData(mapRef.current, "pins", pins);
  }, [pins]);

  useEffect(() => {
    if (!mapRef.current || !readyRef.current) return;
    markProgress(mapRef.current, doneThrough ?? -1);
  }, [doneThrough]);

  // ---- camera -------------------------------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current || !focus) return;

    if (focus.kind === "bounds" && focus.bbox) {
      map.fitBounds(
        [
          [focus.bbox[0], focus.bbox[1]],
          [focus.bbox[2], focus.bbox[3]],
        ],
        {
          padding: focus.padding || { top: 90, bottom: 320, left: 44, right: 44 },
          pitch: focus.pitch ?? 58,
          bearing: focus.bearing ?? map.getBearing(),
          duration: 900,
        }
      );
    } else if (focus.kind === "point" && focus.center) {
      map.easeTo({
        center: focus.center,
        zoom: focus.zoom ?? 14,
        pitch: focus.pitch ?? 64,
        bearing: focus.bearing ?? map.getBearing(),
        padding: focus.padding || { top: 60, bottom: 300, left: 24, right: 24 },
        duration: 900,
      });
    }
  }, [focus]);

  return <div ref={holder} className="app__map" aria-label="3D map of the resort" />;
}
