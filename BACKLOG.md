# Deferred

Things worth doing that are deliberately not being done yet. Core function
first: real resort data, then whatever the sharing decision turns out to be.

Anything here is a judgement call someone has already made once. If you
disagree, say so and change it — the point of writing them down is that they
get decided rather than forgotten.

## Visual, from testing

Nothing here is broken. Each is a small thing that looked slightly off during
a quality pass and was left alone rather than churned.

- **Navigate truncates the metric label.** "TO PUNTA JOLAN…" in a three-across
  row of about 115px per column. Nothing is lost, because the instruction
  directly above says "Ride Punta Jolanda"; it just reads untidily. Dropping
  the "TO" might fit but reads oddly beside "UP" and "DUE BACK".
- **The empty state leaves white space** when the clocks allow no fix worth
  offering. Centring it in the sheet was tried and is worse — the heading
  lives in the sheet's head, so the copy floats away from its own title and
  the gap moves rather than closes. See the comment on `.empty`. A sheet that
  sizes to its content would fix it properly.
- **Terrain facets show at maximum zoom.** The height field is 60x60, so
  pushed right in you are looking at a handful of large quads. The blur that
  hides this further out is eased off deliberately, because at that range it
  smears rather than smooths. A denser grid costs frames; worth measuring
  before assuming it is affordable.
- **The friends banner is three lines** on a first-run home screen, which is a
  lot of warning above an empty list. It shrinks to nothing the moment
  sharing is connected, so it may not be worth solving twice.

## Waiting on someone

- **Real resort data.** `src/resort.js` is invented. The pipeline is built and
  tested and needs network access to overpass-api.de, or the three JSON files
  exported by hand through `pull-resort-data.html`.
- **A contact address** for privacy.html and support.html. Two blocking
  preflight items, one line each.
- **Apple Developer enrolment**, for the iOS wrapper.
- **Whether location sharing gets a backend.** Everything works locally and
  nobody can actually see anybody. A server means phone verification, push and
  a consent model, and turns this from an app into a service.

## Built but not connected

- **Slope closures.** Not in OpenStreetMap and there is no public feed; they
  need an agreement with the resort, which is also the business model. The
  model and the UI could be built against a stub so that landing a feed is
  plumbing rather than a build.

---

# What the neighbours do

Written after measuring every control in this app and reading up on Slopes,
Komoot, Strava and FATMAP. Nothing here has been acted on. It is here so the
next design decision is made against something rather than from taste.

## What we measure at

| | Skis |
|---|---|
| Primary button | 52px tall, full-width, pill, 17px/700 |
| Secondary | 46-48px, pill |
| Chips and icon buttons | exactly 44x44 |
| Tab bar | 56px, 10px labels |
| Corner radii in use | 999 pill, 28 sheet, 18 card, 14 control, 11 segmented |
| Gutter | 16px |
| Sheet stops | 24% / 58% / 92% |

## Where they agree with us

- **3D terrain rather than top-down.** Slopes rebuilt around it deliberately,
  on the grounds that it matches how skiers think about a mountain. Same
  conclusion as the cut-out, arrived at separately.
- **Map and live stats on one screen.** Strava's redesigned Record exists to
  stop people switching between a map and their numbers mid-activity. The
  navigate screen already works this way.
- **Content over the map, never beside it.** Komoot's route stats live in a
  bottom panel that updates as the route changes. Same shape as the sheet.

## Where they differ, and it is worth knowing

- **Tap targets: ours sit exactly on the floor, not above it.** 44pt is
  Apple's minimum and 48dp is Google's; the accessibility guidance is explicit
  that context can demand more, and Google's own driving guidance goes to
  76dp. Every chip, map control, compass and dismiss X here is 44 on the nose.
  A gloved thumb on a chairlift is at least as constrained as a driver.
- **Slopes solved gloves by not solving them on the phone.** It pushes
  on-mountain interaction to the Watch and treats the phone as the fallback,
  and it auto-locks so a glove bump or moisture cannot wake the screen. We
  have no watch app and no equivalent protection.
- **Strava's big record button gets pressed by accident**, in pockets and
  under the fingerprint reader, and users say so loudly. "Reached X" is a
  full-width 52px button at the bottom of our navigate screen with nothing
  guarding it. A phone in a pocket can currently advance a leg. That one is
  functional rather than visual and probably should not wait.
- **Komoot's bottom bar is three verbs** — Discover, Plan, Record — dark
  against a light canvas, always visible. Ours is three nouns: Home, Skiing,
  Stats. Theirs says what you can do; ours says where you are.
- **Komoot's own critics say it hides too much** and does not prioritise the
  task in hand. Worth staying on the other side of that line: the refine chips
  are deliberately always on screen for exactly this reason.
- **Five corner radii is more than most of them use.** Not wrong, but it is
  the kind of thing that drifts.

## The gap worth aiming at

Strava bought FATMAP and shut it down in October 2024. The features that did
not survive the move are offline map downloads, waypoints, and live piste
information — which is close to a list of what a skier actually needs on a
mountain with no signal. Offline commit is a hard requirement here and is
already built. Piste information is the resort-partnership side of the
business model. Whatever else changes, that is the ground worth holding.
