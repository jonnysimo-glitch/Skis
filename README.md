# Skis

A route planner for a day's skiing. You tell it where you are, when you need to
be down, and what you're comfortable on. It gives you routes with different
characters, lets you push them around with one-tap refinements, and then
navigates you.

Currently one resort: **Monterosa Ski**, Valle d'Aosta.

---

## The problem it solves

This is not point-A-to-B routing. It is closer to the orienteering problem:
given a time budget, find a closed walk that maximises something while getting
home before the lifts shut.

Nobody skiing wants the shortest path down. They want a good day that ends on
time. The moment this app exists for: **it's 2pm, you have 90 minutes, you're on
the wrong side of the mountain, and your car is at Champoluc.**

---

## Running it

```bash
npm install
npm run dev        # http://localhost:5173
```

```bash
npm test           # solver, geometry and map-layer checks — no browser needed
npm run e2e        # 162 end-to-end checks in a real browser, including GPS
npm run bench      # solve() timings, the measurement behind the worker decision
npm run build      # production build to dist/
npm run preview    # serve the production build
```

Narrower targets when you are working on one thing:

```bash
npm run test:solver   # the 27 behavioural solver checks
npm run test:map      # map layer paint expressions (see below)
npm run e2e:only -- --only=gps      # one e2e section
npm run e2e:only -- --headed        # watch it drive the browser
```

### What the tests actually cover

`npm test` runs in Node in a couple of seconds:

- **`src/solver.test.js`** — 27 behavioural checks on the solver. Unchanged from
  the handoff.
- **`src/lib/geo.test.js`** — distance and snapping. The important one checks
  every point on a grid across the resort against a brute-force search, because
  snapping a GPS fix to the wrong node sends someone down the wrong side of the
  mountain and the mistake is invisible until they are standing in the wrong
  valley.
- **`scripts/validate-layers.mjs`** — map layer paint expressions.

`npm run e2e` builds, serves `dist/` and drives it in Chromium. It tests what
would actually ship, not the dev server. Sections: resort selection, the three
entry contexts, **GPS**, solving, refine, detail and commit, navigate, the empty
states, airplane mode, the sheet, labels and keyboard, thin-terrain honesty,
persistence, lunch, and running out of day.

The GPS section simulates fixes at every base, mid-mountain, 107 km away, and
with permission refused. It checks the three things that must agree: what the
button says, what the picker displays, and where the solved route actually
starts.

### The map key

The 3D map uses **MapLibre GL JS** over **MapTiler** terrain and its winter
basemap (pistes and lifts are already in it).

```bash
cp .env.example .env
# add your key from maptiler.com — the free tier is enough
```

**The app runs without a key**, and still shows real terrain. There are three
rungs, best first:

1. **With a key** — MapTiler's winter basemap, which brings its own pistes,
   lifts and lift names, over MapTiler terrain.
2. **Without one** — real elevation anyway. [AWS Terrain
   Tiles](https://registry.opendata.aws/terrain-tiles/) publish global DEM as
   terrarium-encoded PNGs with no key and no signup (EU-DEM over the Alps), and
   MapLibre can both extrude and colour a DEM directly. You get the real shape
   of Monte Rosa with an elevation colour ramp and hillshading. What you lose is
   a basemap underneath, so the pistes on screen are the ones from our own
   graph.
3. **If MapLibre cannot run at all** — no WebGL, shaders that will not compile,
   tiles that never arrive — a schematic built from the graph's own node
   altitudes, which needs neither a GPU nor a network.

The schematic paints first because it is instant, and MapLibre takes over only
once it has actually settled a frame. A nine-second watchdog hands back if it
never does. There is no path to an empty rectangle where the mountain should be.

MapLibre is code-split, so a visitor without a key never downloads the 800KB
they cannot use.

Because the keyed path is the one least likely to be exercised in development,
`npm run test:map` checks the route layer paint expressions without a browser —
it parses them *and* evaluates them against representative features. Parsing
alone is not enough: an expression like `["case", ["get", "done"], …]` parses
cleanly, then throws a type error on every feature, which MapLibre catches and
replaces with the property default. The route still draws, so nothing looks
broken; the dimming of already-skied segments just silently stops working. The
check uses `evaluateWithoutErrorHandling` precisely to see what MapLibre would
swallow.

---

## How it fits together

```
src/
  solver.js            the route solver — plain JS, no dependencies, no React
  resort.js            the Monterosa graph (nodes, lifts, runs)
  solver.test.js       27 behavioural checks
  solver.worker.js     the solver, off the main thread

  resorts/index.js     resort registry — what is live, what is coming

  lib/plan.js          human intent → solver options (end times, refinements)
  lib/geo.js           route → GeoJSON, node snapping, bounds
  lib/offline.js       committing a route: tiles, graph and route cached
  lib/persist.js       profile, last plan, committed route
  lib/useSolver.js     worker hook — only the newest request can resolve

  map/MapCanvas.jsx      MapLibre + MapTiler terrain
  map/FallbackTerrain.jsx  the no-key terrain view
  map/layers.js          route casing, difficulty-coloured runs, dashed lifts

  ui/Sheet.jsx           the bottom sheet, the primary surface
  ui/ElevationProfile.jsx  filled profile + difficulty mix bar
  screens/               Resort, Plan, Solving, Choose, Detail, Navigate, Summary, Empty
```

### The solver

Untouched from the handoff and deliberately so. It does constrained randomised
sampling: Dijkstra from the finish node gives time-home from everywhere, which
lets a random walk take an edge only if it can still get back. Survivors are
scored against several objectives. Deterministic by design, so refinements do
not reshuffle options randomly.

It is free of React imports and has no dependencies, so it ports to a worker or
a server unchanged. It already runs in a worker here.

**Why a worker.** Measured, not assumed — `npm run bench`:

| case | p50 | p95 |
|---|---|---|
| full day, red | 59ms | 89ms |
| blue only | 46ms | 50ms |
| 2pm, 90 min, cross-valley | 15ms | 24ms |

A phone is 2-4x slower, so a full-day solve is 200-300ms. Refinements re-solve
on every tap, and refine is make-or-break — a quarter-second of dropped frames
per tap is exactly the failure mode to avoid.

### Offline

Committing to a route caches everything needed to ski it with no signal:

- **route and graph** → `localStorage`, a few KB
- **app shell** → service worker precache
- **map tiles** → warmed over the route's bounding box at z11–z15, then served
  `CacheFirst`

Alpine coverage is unreliable; this is a hard requirement, and it is also why
the graph is kept small and local.

---

## Design

The reference is **Komoot**, and specifically not a clean-neutral
AI-assistant aesthetic.

- The map is the hero — full-bleed, always mounted, never boxed into a card.
- The bottom sheet is the primary surface. It drags up over the map and the map
  never fully disappears.
- One saturated accent (a rescue orange) carries the route casing, the primary
  button and active states. Everything else is a cool neutral.
- The elevation profile is a recurring motif: filled area, difficulty-coloured
  line, lifts dashed, x axis in **time** rather than distance.

**Why orange and not Komoot's green.** Blue, red and black are reserved — they
are European piste difficulty signals and are not ours to spend on branding.
Green is out too: it is the beginner grade in France, and this app expands into
France. A rescue orange is the strongest read left over both snow and rock.

---

## Decisions that are already made

These came from the brief and are not up for casual revision.

- **Ask for an end time, not a duration.** Skiers think "down by four". Duration
  is derived, and the last-lift constraint falls out naturally.
- **Three entry contexts change defaults, not screens.** Night-before, first
  lift, mid-day reset.
- **Ability is set once in the profile** and shown as an overridable chip.
- **Hard constraints are filtered before ranking, not warned about after.** Lift
  hours remove options rather than generating alerts. When nothing fits, the app
  says so plainly and says what would change it.
- **Routes are labelled by character**, not statistics. Numbers are support.
- **"To next junction", not "to next turn".** Pistes have decision points where
  runs split; they do not have turns.
- **Waypoints are optional.** No required pin-dropping step.

**GPS never fails silently.** Tapping "use my position" always says what
happened: which station it snapped to, or that you are 107 km away, or that
location permission is off — each with what to do instead. A tap that quietly
does nothing is indistinguishable from a broken button.

Nodes are lift stations and junctions, not a dense trace of the piste, so
halfway down a long run the nearest *station* can belong to a different run.
A fix is accepted within 6 km of a node and the picker always lists whatever
the plan is currently using, so what the solver routes from is always what the
user can see.

Two solver behaviours are surfaced rather than hidden: it returns **fewer routes
than asked** when the mountain cannot support more (the list is not padded), and
routes carry a **`similar`** flag when they cover the same terrain with a
different emphasis, which the UI states plainly.

---

## Trying it

**One file, no setup.** `npm run build:single` produces
`dist-single/skis.html` — everything inlined, openable straight from disk with
no server and no hosting. Good for putting the app in front of someone quickly.

What that costs: no web worker (solving runs on the main thread), no service
worker, and no MapLibre — a `file://` page has an opaque origin, so its tile
workers cannot start. The schematic terrain and everything else works. GPS is
unavailable for the same reason and the app says so.

**GitHub Pages.** Note that Pages on a **private** repo needs a paid GitHub
plan; on the free plan the Source setting is replaced by an upgrade prompt.
Make the repo public, or use Vercel/Netlify, whose free tiers deploy private
repos.

The `gh-pages` branch carries a prebuilt copy of the site, so there is no CI in
the way. Once Pages is available, turn it on:

**Settings → Pages → Source: Deploy from a branch → `gh-pages` / `(root)`**

Then it is live at

    https://jonnysimo-glitch.github.io/Skis/

To publish a new build:

```bash
VITE_BASE=/Skis/ npm run build
# copy dist/ onto the gh-pages branch, keeping .nojekyll and 404.html
```

`.github/workflows/pages.yml` does the same thing through Actions and is set to
manual-only. Use it instead if you switch the Pages source to "GitHub Actions" —
running both would have them fight over the deployment.

**Locally**, which is the certain path:

```bash
npm install
npm run dev           # http://localhost:5173
```

**On a phone.** This is a mobile product and the sheet, the map orbit and GPS
all behave differently under a thumb:

```bash
npm run dev:host      # prints a http://192.168.x.x address for your wifi
```

One thing to know: geolocation and service workers need a secure context.
`localhost` counts as secure; `http://192.168.x.x` does not, so over wifi the
locate button will tell you it needs https and offline mode will not register.
For the full thing on a phone, use the Pages URL or a deploy of your own.

**Faking a location** so you can test the mid-day flow without being at
Monterosa — Chrome DevTools → ⋮ → More tools → Sensors → Location → Other, then:

| where | lat | lon |
|---|---|---|
| Staffal (Gressoney base) | 45.8790 | 7.8180 |
| Passo dei Salati (high, mid-mountain) | 45.8890 | 7.8730 |
| Champoluc (Ayas base) | 45.8180 | 7.7270 |
| Alagna (far side) | 45.8530 | 7.9370 |

Set the clock to an afternoon time and the app opens in its mid-day context:
start is where you are, finish is where the car is.

**Other hosts.** Vercel is zero-config — `vercel.json` is in the repo:

```bash
npx vercel --prod
```

Set `VITE_MAPTILER_KEY` in the project's environment variables if you have one.
`VITE_BASE` defaults to `/`; only GitHub Pages needs it set, and the workflow
does that itself.

---

## Getting to the App Store

The web build is step 1. The app is already a standalone-display PWA with
safe-area handling and offline caching, so it installs to a home screen today.

For a real App Store listing it wraps in **Capacitor**, which is configured
here (`capacitor.config.json`). The native project has to be generated and built
on macOS with Xcode:

```bash
npm run build
npx cap add ios          # macOS + Xcode only, once
npm run ios              # sync the web build and open Xcode
```

Then in Xcode: set the bundle identifier and signing team, and archive.

Still needed before submitting, none of which is code in this repo:

- an Apple Developer Program account
- a privacy manifest and App Store privacy answers — the app requests location
  (to snap your start to the nearest lift station) and stores nothing off-device
- screenshots at the required device sizes
- **real resort data**, see below

`@capacitor/status-bar` is installed so the status bar can be set to overlay the
map, which is the point of the full-bleed layout.

---

## The thing to fix first

`src/resort.js` is **hand-typed from memory and is not accurate.** Run names,
times and queue estimates are plausible fiction. It is scaffolding, not data.

Replacing it is the highest priority now that the app works. The source is
OpenStreetMap via the Overpass API: alpine resorts are tagged with `piste:type`
and `piste:difficulty`, and `aerialway` covers lifts. Build nodes at
intersections and lift stations, edges for piste segments and lifts, and weights
from length and gradient for runs plus published ride times for lifts.

Expect mess: unconnected piste segments, missing difficulty tags, lifts that do
not quite touch the pistes they serve. Budget real time for cleaning and
graph-stitching, and validate that the graph is strongly connected before
trusting it.

Queue times and last-lift times are not in OSM. They need resort partnerships,
which is also the B2B model — resorts pay for the service.

A resort only goes live in `src/resorts/index.js` once its graph has been
extracted, cleaned and checked. Routing on a graph that is nearly right is worse
than no routing at all.
