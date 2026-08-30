/**
 * One HTML file you can just open.
 *
 * No server, no hosting, no account: everything — JS, CSS, fonts, icons —
 * inlined into a single document that runs from a file:// URL. Built for
 * getting the app in front of someone quickly, not for shipping.
 *
 * What that costs, and why each is survivable:
 *   - IIFE rather than ES modules, because file:// blocks module loading.
 *   - No web worker: `new Worker` fails on file://, and useSolver already
 *     falls back to the main thread, so solving just runs inline.
 *   - No service worker, so no offline caching. The app itself already works
 *     without a network once loaded.
 *   - Geolocation is unavailable: file:// is not a secure context. The app
 *     says so plainly and you pick a start from the list instead.
 *
 * Build with: npm run build:single
 */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";

/** Fold the single JS and CSS bundle back into index.html. */
function inlineEverything() {
  return {
    name: "inline-everything",
    closeBundle() {
      const out = "dist-single";
      let html = readFileSync(join(out, "index.html"), "utf8");

      // Always replace via a function. A minified bundle is full of `$`, and
      // a string replacement would treat `$&`, `$1` and friends as capture
      // references and silently corrupt the code.
      const swap = (haystack, needle, replacement) =>
        haystack.replace(needle, () => replacement);

      // A literal `</script>` anywhere in the JS — in a string, in a regex —
      // would close the tag early.
      const safeJs = (js) => js.replace(/<\/script/gi, "<\\/script");

      const scriptTag = html.match(/<script[^>]*src="([^"]+)"[^>]*><\/script>/);
      if (scriptTag) {
        const file = join(out, scriptTag[1].replace(/^\.?\//, ""));
        const js = readFileSync(file, "utf8");
        // Vite puts the entry script in <head>, which is fine for a module
        // (deferred) but not for an inline classic script — it would run
        // before #root exists. Move it to the end of <body>.
        html = swap(html, scriptTag[0], "");
        html = swap(
          html,
          "</body>",
          `<script>\n${safeJs(js)}\n</script>\n</body>`
        );
        rmSync(file, { force: true });
      }

      const linkTag = html.match(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/);
      if (linkTag) {
        const file = join(out, linkTag[1].replace(/^\.?\//, ""));
        const css = readFileSync(file, "utf8");
        html = swap(html, linkTag[0], `<style>\n${css}\n</style>`);
        rmSync(file, { force: true });
      }

      if (/<script[^>]*src=|<link[^>]*rel="stylesheet"/.test(html)) {
        throw new Error("single-file build still references an external asset");
      }

      // Nothing external is left to fetch, so drop the icon links rather than
      // leave them 404ing in the console.
      html = html.replace(/<link[^>]*rel="(icon|apple-touch-icon)"[^>]*>/g, "");

      writeFileSync(join(out, "skis.html"), html);
      rmSync(join(out, "index.html"), { force: true });
    },
  };
}

export default defineConfig({
  plugins: [react(), inlineEverything()],
  base: "./",
  build: {
    outDir: "dist-single",
    emptyOutDir: true,
    cssCodeSplit: false,
    assetsInlineLimit: 100 * 1024 * 1024, // inline fonts and images as data URIs
    rollupOptions: {
      output: {
        format: "iife",
        inlineDynamicImports: true, // pull the MapLibre chunk in
        entryFileNames: "app.js",
        assetFileNames: "app.[ext]",
      },
    },
  },
});
