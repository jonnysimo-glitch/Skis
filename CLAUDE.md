# Skis — build brief

A route planner for a day's skiing. You tell it where you are, when you need to
be down, and what you're comfortable on. It gives you three routes with
different characters, lets you push them around, and then navigates you.

Positioned internally as "google maps for skiing", but that framing is
misleading in one important way — see *The actual problem* below.

Original build (2023-24) was a mobile app with a 3D map and a piste graph;
a co-founder left with the codebase. This is a solo rebuild from scratch.
Nothing here needs to match the old stack.

---

## The actual problem

This is **not** point-A-to-B routing. It's closer to the **orienteering
problem**: given a time budget, find a closed walk that maximises something
while getting home before the lifts shut.

Nobody skiing wants the shortest path down. They want a good day that ends on
time. Every competitor gets this wrong — they show you a map and let you figure
it out. The routing is the product. Pretty 3D terrain is commodity and everyone
has it.

The single most underserved moment: **it's 2pm, you have 90 minutes, you're on
the wrong side of the mountain, and your car is at Champoluc.** Nothing on the
market solves that. It should be the thing this app is known for.

---

## Current state

The app is built and runs. `npm run dev`, or `npm run build && npm run preview`.
See README.md for the file map and the reasoning behind the structure.

Working: resort selection, plan, solve in a worker, choose with live refine,
route detail, offline commit, navigate, summary, and the empty state. The 3D map
works with a MapTiler key and falls back to a terrain view built from the graph's
own altitudes without one.

Not done, in priority order:

1. **Replace `src/resort.js` with real OSM data.** See "Replacing the resort
   data" below. Everything else is downstream of this.
2. Second resort. `src/resorts/index.js` is the registry; the solver still
   imports its graph directly from `resort.js`, and that is the one change
   needed — pass the graph into `solve()`. Deliberately not abstracted before a
   second real dataset exists.
3. iOS wrapper. Capacitor is configured; `npx cap add ios` needs macOS.

## Already built and tested — do not redesign these

`src/solver.js` and `src/resort.js` are working and covered by
`src/solver.test.js` (27 behavioural checks, all passing). Run `npm test`.

They are unchanged from the handoff and should stay that way. The solver runs in
`src/solver.worker.js`; that wrapper is three lines because the solver imports
nothing but its own graph. Keep it that way.

The solver does constrained randomised sampling: Dijkstra from the finish node
gives time-home from everywhere, which lets a random walk take an edge only if
it can still get back. Survivors are scored against several objectives. ~100ms,
deterministic by design so refine chips don't reshuffle options randomly.

**Keep it deterministic.** If you add options, seed them.

One subtlety worth not undoing: the per-run repeat cap **scales with available
terrain**. An expert with the whole mountain open should never be sent down the
same run three times — that means the solver is padding. A blue-only skier with
five runs available has no choice but to lap them, and refusing to plan their
day is worse than repeating a run. A fixed cap breaks one case or the other.

`docs/skis-route-planner-v1.html` is the previous prototype. It is a **flow and
logic reference only — its visual design is explicitly rejected.** Read it for
the interaction model. Do not carry over its look.

---

## Visual direction: Komoot

The reference is **Komoot**, and specifically *not* a clean-neutral AI-assistant
aesthetic. Pull up the real app before you start; what follows is the pattern,
not a substitute for looking at it.

What matters:

- **The map is the hero.** Full-bleed, always visible, never boxed into a card.
  UI floats over terrain.
- **Bottom sheet as the primary surface.** Content lives in a sheet that drags
  up over the map. Peek state shows the essentials, expanded shows detail. The
  map never fully disappears.
- **One saturated brand accent**, used with discipline: the route line, the
  primary button, the active state. Everything else is neutral so the route
  reads instantly against terrain.
- **The route line is a first-class graphic object** — thick, high contrast,
  with a visible casing so it stays legible over both snow and rock.
- **Elevation profile is a recurring motif**, not a one-off chart.
- Clean geometric sans. Generous, confident type. Rounded but restrained
  controls — soft, not bubbly.
- Photography and terrain do the emotional work; the chrome stays quiet.

Do not produce: cream backgrounds with serif display type, hairline-rule
broadsheet layouts, or a near-black canvas with a single acid accent.

---

## 3D map — required

Non-negotiable feature. The user must be able to orbit the mountain and see the
route draped over real terrain.

**Approach: MapLibre GL JS + MapTiler terrain.** MapLibre is the free Mapbox
fork. MapTiler serves terrain-RGB elevation tiles and has a winter basemap with
pistes and lifts already in it, which is a large head start.

- Needs a MapTiler API key. Free tier is fine. Put it in `.env` as
  `VITE_MAPTILER_KEY`, never commit it, add `.env.example`.
- Enable terrain with exaggeration around 1.4–1.6. Real alpine terrain looks
  flat at 1.0 on a phone.
- Draw the route as a line layer using the node coordinates in `resort.js`.
  Lifts and runs need visually distinct treatments — runs solid and coloured by
  difficulty, lifts thinner and dashed.
- Pitch around 60°, and let the user orbit and pitch freely.
- **Fallback matters.** If the key is missing, don't show a broken grey box.
  Render the flow with a static profile view and a clear message about the key.

Difficulty colours follow European piste convention — blue, red, black. These
are domain signals, not decoration; don't restyle them.

---

## Interaction decisions — already made, keep them

**Ask for an end time, not a duration.** Skiers think "down by four", never
"four hours thirty". Duration is derived. This also makes the last-lift
constraint fall out naturally.

**Three entry contexts change defaults, not screens.** Night-before (pick
resort and start time), first lift (GPS knows the base), mid-day reset (start
is current position, finish is the car park).

**Ability is set once in the profile** and shown as an overridable chip. Don't
ask every session.

**Hard constraints are filtered before ranking, not warned about after.** Lift
hours and closures remove options rather than generating alerts. When nothing
fits, say so plainly and say what would change it. Never invent a route that
strands someone.

**Label routes by character, not statistics.** "Most vertical", "Most variety",
"Cruisiest", "Least queuing", "Longest descent", "Highest point". A skier can't
state their objective function but can tell you they want a cruisy day. Show
the numbers as support.

**How many routes to offer is a UI decision, not a solver one.** `solve()`
takes a `count` and defaults to three. More than three is fine — the constraint
that matters is that they're genuinely different days, not that there are
exactly three. The solver enforces this with an overlap check on the set of
runs skied, so a fourth or fifth option is only offered when the terrain
actually supports one.

Two behaviours to surface in the UI rather than hide:

- The solver returns **fewer routes than asked** when the mountain can't
  support more. Don't pad the list.
- Routes carry a `similar: true` flag when they cover the same terrain with a
  different emphasis. This happens to blue-only skiers at resorts with little
  easy terrain. Say so plainly — "there isn't much blue here, these are
  variations on the same runs" — rather than presenting them as real variety.

Above roughly six options, a list stops being a choice and becomes homework.
If you go wide, consider showing three by default with the rest behind a
"more options" affordance.

**Refine is make-or-break.** One-tap chips that re-solve in place: shorter,
longer, easier, harder, more vertical, no drags, lunch. The user must never be
sent back to the form. If this feels slow or surprising, the product fails.

**"To next junction", not "to next turn".** Pistes have decision points where
runs split. They don't have turns.

**Committing to a route must cache tiles, graph and route for full airplane
mode.** Alpine signal is unreliable and this is a hard requirement, not a
nice-to-have. It's also the reason to keep the graph small and local.

**Waypoints are optional.** Don't copy Komoot's pin-dropping as a required step.

---

## Screens

Resort → Plan → Solving → Choose → Route detail → Navigate → Summary

Plus a genuine empty state when the clocks don't allow a route.

---

## Stack

- Vite + React
- MapLibre GL JS, MapTiler tiles
- Solver stays plain JS with no dependencies — it must be portable to a worker
  or a server later
- Deploy to Vercel

Run the solver in a web worker if it blocks the UI on a phone. Measure first.

Measured — `npm run bench` gives 89ms p95 for a full day on a laptop, so
200-300ms on a phone. Refinements re-solve on every tap, so it runs in a worker.
Re-run the benchmark if the sampling constants change.

---

## One decision made during the build

The brand accent is a **glacier blue**, not Komoot's green. Green is the
beginner grade in France, which this expands into, so it cannot carry the
brand.

Blue was chosen after an orange was tried and rejected: it reads as ice and
meltwater against snow and it is what the app should feel like. That needs
care, because blue is also a piste grade, and an accent a skier could read as
"blue run" is a safety problem rather than a taste one. So the accent sits
deliberately on the cyan side while piste blue stays navy-leaning, and on the
map a wide white halo separates the brand casing from the difficulty-coloured
core. `npm run test:palette` asserts the separation rather than leaving it to
the eye.

Everything else about the Komoot direction above stands as written.

## Replacing the resort data

`src/resort.js` is **hand-typed from memory and is not accurate.** Run names,
times and queue estimates are plausible fiction. Replacing it is the highest
priority after the app works.

Real source: OpenStreetMap via the Overpass API. Alpine resorts are tagged with
`piste:type` and `piste:difficulty`, and `aerialway` covers lifts. Coverage
across the European Alps is good.

Build:
- nodes at intersections and lift stations
- edges for piste segments and lifts
- edge weights from length and gradient for runs, published ride times for
  lifts, plus a queue estimate

Expect the data to be messy: unconnected piste segments, missing difficulty
tags, lifts that don't quite touch the pistes they serve. Budget real time for
a cleaning and graph-stitching step, and validate that the graph is strongly
connected before trusting it.

Queue times and last-lift times aren't in OSM. They need resort partnerships,
which is also the B2B business model — resorts pay for the service.

---

## Working agreements

- Commit early and often. This codebase was lost once already.
- `npm test` must pass before any commit that touches the solver.
- Don't add a state management library until something actually hurts.
- Keep the solver free of React imports.
