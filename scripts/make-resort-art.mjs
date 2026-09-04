/**
 * The picture on a resort's card. Run: npm run resort:art
 *
 * These are photographs of the actual resorts, supplied by the project owner
 * and kept in assets/resort-photos/. That matters twice over: an App Store
 * listing needs images somebody has the right to publish, and this machine
 * cannot reach an image host anyway — Unsplash, Pixabay, Flickr and Wikimedia
 * are all refused by its network policy.
 *
 * Two renderers were written before the photographs arrived and are worth
 * remembering rather than repeating. Shaded relief from directly overhead was
 * accurate and read as a map, which is not what a card wants. An oblique
 * ray-march of the same terrain never framed the mountain: a hand-derived
 * pinhole camera is a lot of arithmetic to get wrong. Real photographs are
 * better than either, and they are what a skier recognises.
 *
 * All this does is normalise them: crop to the card's aspect, scale to the
 * size a phone actually shows at 2x, and re-encode. The app precaches
 * everything for airplane mode, so a hero image is not free.
 *
 * Deliberately not part of `npm run build`, because it needs a browser.
 */
import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { launch, newPage } from "./harness.mjs";

const SRC_DIR = new URL("../assets/resort-photos/", import.meta.url).pathname;
const OUT_DIR = new URL("../public/resorts/", import.meta.url).pathname;

/** The card at 2x on a phone, and no larger. */
const W = 860;
const H = 520;
/** Enough for a photograph behind type; past this the file grows for nothing. */
const QUALITY = 0.82;

const MIME = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };

/**
 * Where to take the crop from, per photograph.
 *
 * 0 is the top of the frame, 1 the bottom. The default leans upward because
 * the interesting half of most mountain photographs is the top and the card's
 * scrim darkens the bottom for the title anyway.
 *
 * Kronplatz is the exception and had to be moved: it is a square photograph of
 * a summit plateau, and taking a wide band from near the top gave sky and
 * distant Dolomites with barely any piste in it. Lower down there is groomed
 * snow, the lift buildings and the tracks, which is what the picture is for.
 */
const CROP = { kronplatz: 0.62 };
const DEFAULT_CROP = 0.35;

const browser = await launch();
await mkdir(OUT_DIR, { recursive: true });

try {
  const files = (await readdir(SRC_DIR)).filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
  if (!files.length) {
    console.log(`  no photographs in assets/resort-photos/`);
  }
  const page = await newPage(browser, { viewport: { width: 100, height: 100 } });

  for (const file of files) {
    const id = file.replace(/\.[^.]+$/, "");
    const ext = file.split(".").pop().toLowerCase();
    const bytes = await readFile(`${SRC_DIR}${file}`);
    const dataUrl = `data:${MIME[ext]};base64,${bytes.toString("base64")}`;

    const out = await page.evaluate(
      async ({ src, w, h, quality, bias }) => {
        const img = new Image();
        img.src = src;
        await img.decode();
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        // Cover, centred horizontally, and vertically wherever CROP says.
        const scale = Math.max(w / img.width, h / img.height);
        const dw = img.width * scale;
        const dh = img.height * scale;
        ctx.drawImage(img, (w - dw) / 2, (h - dh) * bias, dw, dh);
        const url = canvas.toDataURL("image/jpeg", quality);
        return { data: url.split(",")[1], from: `${img.width}x${img.height}` };
      },
      { src: dataUrl, w: W, h: H, quality: QUALITY, bias: CROP[id] ?? DEFAULT_CROP }
    );

    const buffer = Buffer.from(out.data, "base64");
    await writeFile(`${OUT_DIR}${id}.jpg`, buffer);
    console.log(`  ${id}: ${out.from} -> ${W}x${H}, ` +
      `${(bytes.length / 1024).toFixed(0)} kB -> ${(buffer.length / 1024).toFixed(0)} kB`);
  }
  await page.context_.close();
} finally {
  await browser.close();
}
