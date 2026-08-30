import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";


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
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "icons/*.png"],
      manifest: {
        name: "Skis — route planner",
        short_name: "Skis",
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
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        // MapLibre is precached whether or not there is a key: without one it
        // still renders real terrain from open elevation data, and a lazy
        // chunk that is missing offline fails the import rather than merely
        // degrading. The 3D map is the reason the chunk exists.
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
