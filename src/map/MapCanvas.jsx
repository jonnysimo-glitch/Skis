/**
 * The 3D map. Full-bleed, always mounted, never boxed into a card.
 *
 * MapLibre GL JS over MapTiler terrain-RGB. Terrain exaggeration sits at 1.5
 * because real alpine relief looks flat at 1.0 on a phone. Pitch starts at 60
 * and the user can orbit and pitch freely from there.
 */
import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  STYLE_CHAIN,
  styleUrl,
  terrainSource,
  TERRAIN_EXAGGERATION,
} from "./config.js";
import { addRouteLayers, setData, markProgress } from "./layers.js";

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

  // ---- create once -------------------------------------------------------
  useEffect(() => {
    if (!holder.current || mapRef.current) return;
    let cancelled = false;
    let styleIndex = 0;

    const map = new maplibregl.Map({
      container: holder.current,
      style: styleUrl(STYLE_CHAIN[0]),
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
      // A style that has moved is recoverable — walk the chain before giving up.
      const failedStyle = event?.error?.status === 403 || event?.error?.status === 404;
      if (failedStyle && styleIndex < STYLE_CHAIN.length - 1 && !readyRef.current) {
        styleIndex += 1;
        map.setStyle(styleUrl(STYLE_CHAIN[styleIndex]));
        return;
      }
      if (!readyRef.current && failedStyle) onFail?.(event?.error);
    });

    map.on("style.load", () => {
      if (cancelled) return;
      try {
        if (!map.getSource("terrain")) {
          map.addSource("terrain", terrainSource);
        }
        map.setTerrain({ source: "terrain", exaggeration: TERRAIN_EXAGGERATION });
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
        /* Terrain unavailable — the 2D basemap still beats nothing. */
      }
      addRouteLayers(map, { graph, route, pins });
      readyRef.current = true;
      onReady?.(map);
    });

    // Two-finger drag pitches, one finger rotates: orbiting the mountain is
    // the whole point of the 3D view.
    map.touchZoomRotate.enable({ around: "center" });
    map.dragRotate.enable();

    return () => {
      cancelled = true;
      readyRef.current = false;
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
