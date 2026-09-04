/**
 * Build public/fetch-resort-data.html.
 *
 * The Overpass pipeline is written and tested; what it cannot do is reach
 * overpass-api.de, because this environment's network policy refuses it (403
 * on every mirror, confirmed). A browser on a phone has no such policy.
 *
 * So the query moves to the browser. This page runs exactly the query
 * scripts/osm/overpass.mjs would have run, against exactly the bounding boxes
 * in scripts/resorts/*.json, and hands back a file the pipeline reads without
 * knowing the difference. Generated rather than hand-written so the queries
 * cannot drift from the ones the pipeline expects.
 *
 *   node scripts/make-fetch-page.mjs
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { query } from "./osm/overpass.mjs";

const dir = new URL("./resorts/", import.meta.url).pathname;
const files = (await readdir(dir)).filter((f) => f.endsWith(".json"));
const resorts = [];
for (const f of files) {
  const c = JSON.parse(await readFile(dir + f, "utf8"));
  resorts.push({
    id: c.id,
    name: c.name,
    where: `${c.region}, ${c.country}`,
    note: c.note ?? "",
    bbox: c.bbox,
    query: query(c.bbox),
  });
}
resorts.sort((a, b) => a.name.localeCompare(b.name));

const html = `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Skis: fetch the resort data</title>
<link rel="icon" href="favicon.svg">
<style>
  :root {
    color-scheme: light;
    --ink: #0b1a24; --ink2: #33475a; --ink3: #5c7385;
    --line: #e3ecf2; --bg: #f6f9fb; --accent: #0077a3;
    --ok: #1a7f4b; --bad: #9a5b12;
  }
  * { box-sizing: border-box; }
  body {
    font: 17px/1.5 -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif;
    margin: 0; padding: max(28px, env(safe-area-inset-top)) 20px 60px;
    color: var(--ink); background: var(--bg); -webkit-text-size-adjust: 100%;
  }
  .wrap { max-width: 620px; margin: 0 auto; }
  h1 { font-size: 30px; letter-spacing: -0.02em; margin: 0 0 8px; }
  .lede { color: var(--ink3); margin: 0 0 12px; }
  .why {
    background: #fff; border: 1px solid var(--line); border-radius: 14px;
    padding: 14px 16px; font-size: 15px; color: var(--ink2); margin: 0 0 26px;
  }
  ol { list-style: none; padding: 0; margin: 0; }
  li {
    background: #fff; border: 1px solid var(--line); border-radius: 18px;
    padding: 18px; margin-bottom: 14px;
  }
  h2 { font-size: 21px; margin: 0 0 2px; letter-spacing: -0.01em; }
  h2 small { font-weight: 400; color: var(--ink3); font-size: 15px; display: block; margin-top: 2px; }
  .note { margin: 8px 0 14px; color: var(--ink3); font-size: 15px; }
  button {
    -webkit-appearance: none; appearance: none; border: 0; font: inherit;
    display: flex; align-items: center; justify-content: center; gap: 8px;
    width: 100%; min-height: 52px; padding: 0 18px;
    background: var(--accent); color: #fff; font-weight: 650;
    border-radius: 999px; cursor: pointer;
  }
  button:disabled { opacity: 0.55; cursor: default; }
  button.again { background: #fff; color: var(--accent); border: 1px solid var(--line); }
  .status { margin: 12px 0 0; font-size: 15px; min-height: 1.5em; }
  .status.working { color: var(--ink3); }
  .status.done { color: var(--ok); font-weight: 600; }
  .status.failed { color: var(--bad); }
  .after { margin-top: 30px; padding: 20px; border-radius: 18px; background: #eef4f8; }
  .after h3 { margin: 0 0 10px; font-size: 18px; }
  .after p { margin: 0 0 10px; font-size: 15px; color: var(--ink2); }
  .after p:last-child { margin-bottom: 0; }
  code {
    background: #fff; border: 1px solid var(--line); padding: 2px 7px;
    border-radius: 6px; font-size: 14px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  }
  .spin {
    width: 17px; height: 17px; border: 2px solid rgba(255,255,255,0.45);
    border-top-color: #fff; border-radius: 50%; animation: s 0.7s linear infinite;
  }
  @keyframes s { to { transform: rotate(360deg); } }
</style>
<div class="wrap">
  <h1>Fetch the resort data</h1>
  <p class="lede">One tap each. Nothing to type, nothing to install.</p>
  <p class="why">
    The app currently runs on run names and lift times that were typed from
    memory. These buttons ask OpenStreetMap for the real thing. They run in
    <b>this browser</b> because the machine the app is built on is not allowed
    to reach OpenStreetMap, and your phone is.
  </p>

  <ol>
${resorts.map((r) => `    <li data-id="${r.id}">
      <h2>${r.name}<small>${r.where}</small></h2>
      <p class="note">${r.note}</p>
      <button type="button">Fetch ${r.name}</button>
      <p class="status"></p>
    </li>`).join("\n")}
  </ol>

  <div class="after">
    <h3>Then what</h3>
    <p>Each tap saves a file called <code>&lt;name&gt;.json</code>. It is a
      few megabytes; that is normal.</p>
    <p>Put them in the repository under <code>data/osm/</code>. On an iPad:
      open the repo on GitHub, <b>Add file → Upload files</b>, and type
      <code>data/osm/</code> in the filename box before choosing them.</p>
    <p>Then say so, and the graphs get built from them.</p>
  </div>
</div>
<script>
const RESORTS = ${JSON.stringify(
  Object.fromEntries(resorts.map((r) => [r.id, { name: r.name, query: r.query }])),
  null,
  2
)};

// Two mirrors. The main one refuses new work when it is busy rather than
// queueing, and a 429 or a 504 there is not a reason to give up.
const MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

const save = (name, text) => {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
};

async function fetchOne(li) {
  const id = li.dataset.id;
  const { name, query } = RESORTS[id];
  const button = li.querySelector("button");
  const status = li.querySelector(".status");
  button.disabled = true;
  button.innerHTML = '<span class="spin"></span> Asking OpenStreetMap';
  status.className = "status working";
  status.textContent = "This takes anywhere from ten seconds to a couple of minutes.";

  let lastError = null;
  for (const mirror of MIRRORS) {
    try {
      const res = await fetch(mirror, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
        body: query,
      });
      if (!res.ok) throw new Error("mirror answered " + res.status);
      const text = await res.text();
      // Overpass answers 200 with an HTML error page when a query is rejected,
      // so a successful status is not on its own a successful fetch.
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("that was not data; the mirror sent an error page instead");
      }
      const n = data.elements?.length ?? 0;
      if (n < 50) {
        throw new Error(
          "only " + n + " feature" + (n === 1 ? "" : "s") +
          " came back, which is too few for a resort"
        );
      }

      save(id + ".json", text);
      const mb = (text.length / 1048576).toFixed(1);
      status.className = "status done";
      status.textContent = n.toLocaleString() + " features, " + mb + " MB. Saved as " + id + ".json";
      button.className = "again";
      button.textContent = "Fetch again";
      button.disabled = false;
      return;
    } catch (err) {
      lastError = err;
    }
  }

  status.className = "status failed";
  status.textContent = (lastError?.message ?? "it did not work") +
    ". Both mirrors were tried. They throttle when busy, so waiting a minute and tapping again usually works.";
  button.className = "again";
  button.textContent = "Try " + name + " again";
  button.disabled = false;
}

for (const li of document.querySelectorAll("li[data-id]")) {
  li.querySelector("button").addEventListener("click", () => fetchOne(li));
}
</script>
</html>
`;

await writeFile(new URL("../public/fetch-resort-data.html", import.meta.url).pathname, html);
console.log(`  public/fetch-resort-data.html — ${resorts.length} resorts, ${(html.length / 1024).toFixed(1)} kB`);
