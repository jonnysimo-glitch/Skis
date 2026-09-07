import { execSync } from "node:child_process";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

/**
 * Which build this is, baked in and shown in Settings.
 *
 * Because "is my change live?" was not answerable. The app is offline-first,
 * so a returning phone runs the cached shell until the service worker has
 * swapped it — which means a screenshot of the old behaviour and a screenshot
 * of a stale cache look identical. The only way that got settled was spotting
 * that the leg counter still said the word "leg", which had been dropped four
 * commits earlier. Seven characters in Settings answers it instead.
 *
 * GITHUB_SHA on the Pages runner, git locally, "dev" if neither is there —
 * a build must never fail for want of a version string.
 */
const BUILD = (() => {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 7);
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "dev";
  }
})();

/**
 * Committing to a route must work in full airplane mode — alpine signal is
 * unreliable and this is a hard requirement. The service worker precaches the
 * shell; map tiles are cached at runtime as they are fetched, and warmed
 * deliberately when the user commits (see src/lib/offline.js).
 */
/**
 * Served from a subpath on GitHub Pages, from the root everywhere else.
 * The service worker scope follows the same base, so offline works either way.
 */
const BASE = process.env.VITE_BASE || "/";

export default defineConfig(() => {
  return {
  base: BASE,
  define: { __BUILD__: JSON.stringify(BUILD) },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "icons/*.png"],
      manifest: {
        name: "Slalom, route planner",
        short_name: "Slalom",
        description:
          "Plan a day's skiing around the time you have, not the shortest way down.",
        theme_color: "#0B1A24",
        background_color: "#0B1A24",
        display: "standalone",
        orientation: "portrait",
        start_url: BASE,
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "icons/icon-512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,mjs,css,html,svg,png,woff2}"],
        // Half a megabyte smaller than it was: MapLibre is gone with the
        // separate world map it drew, and the terrain the app orbits is its
        // own, built from baked elevation.
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        runtimeCaching: [
          {
            // Terrain and basemap tiles. CacheFirst so a committed route keeps
            // rendering with no signal at all.
            urlPattern: /^https:\/\/api\.maptiler\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "maptiler-tiles",
              expiration: { maxEntries: 4000, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Open elevation tiles, which is what the map runs on with no key.
            // Without this rule committing a route caches the route and the
            // shell but not the mountain, and the map drops to the schematic
            // the moment the signal goes.
            urlPattern: /elevation-tiles-prod|terrarium/i,
            handler: "CacheFirst",
            options: {
              cacheName: "terrain-tiles",
              expiration: { maxEntries: 2000, maxAgeSeconds: 60 * 60 * 24 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  worker: { format: "es" },
  build: { target: "es2020" },
  };
});
