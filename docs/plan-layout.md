# The numbered steps, and what the neighbours do instead

Written because the numbers on the route were reported as reading oddly — "the
1, 5, 10, 15 stuff, it's a bit weird" — and the right first move was to find
out whether anybody else does it that way.

> **Since this was written, the thinning has been taken out.** Not the
> proposal below — the stride. The 1, 5, 10, 15 sequence was reported again,
> this time as the numbers *disappearing* as you move the map, and the ask was
> "keep them all there for now, like the old one, two, three, four, five." So
> every leg is a candidate at every zoom now and the only things that drop a
> number are geometric: off the screen, behind the mountain, or no room along
> the leg. Measured on a 59-leg day at Monterosa, the route detail reads 1, 2,
> 3, 4, 5, 7, 10, 13, 14, 15, 16, 17, 21… The crowding this document describes
> in point two below is therefore real and current: nineteen numbers in the
> 480 m navigation frame, eighteen of them from later in the day. Everything
> proposed below still stands, and the case for it is now stronger rather than
> weaker.

Nobody does. Not Strava, not Komoot, not Ride with GPS, not Gaia. That is
worth taking seriously: four planners with a decade of iteration each have all
landed on the same three-part idiom, and none of the three parts is a number
sequence along the line.

## What they actually do

**The route line carries a property of the ground, not a position in the
order.** Strava draws surface: solid for paved, dashed for dirt, white for
unspecified, and gives you the same split as a percentage of the route. Komoot
does the same for way types and surfaces. The line answers "what is it like
underfoot", which is a question you can ask of a point in isolation.

**The elevation profile is the index.** It sits under the map, and touching a
point on it highlights the corresponding stretch on the map. That is the
device that links the overview to the detail — scrubbing, not matching
numbers. Komoot switches the profile between elevation, surface, way type and
weather, so the same strip of screen answers four questions.

**The list is a cue sheet, consulted rather than read.** Strava's is a printed
cue sheet or a device's turn list. Ride with GPS puts waypoints in both the
cue sheet and the profile so you can find "snack stop" in either.

**Markers are for waypoints only** — the handful of places *you* chose. Ride
with GPS deliberately draws those larger so they survive being zoomed out.
Nothing marks every turn.

So the pattern is: **one graphic object for the whole route, one scrubbable
profile to index it, and pins only for the things a person picked.**

## Why the numbers went in here, and what is actually wrong with them

They went in for a real reason. A ski day is a *closed walk* — it comes back
through its own base, often several times — so the line crosses itself and
"which way round does this go" is a question a cycling route never has to
answer. A cyclist's line has two ends and an obvious direction. Ours can look
identical run forwards or backwards.

The numbers answer that. What they cost:

- **They are positions in a list, drawn on a map.** Reading them means
  matching "17" on the mountain to "17" in the legs list, and that is work the
  scrub gesture does for free everywhere else.
- **A day has 60 to 85 of them.** The whole apparatus that grew around that —
  a stride off the zoom, a lookahead window, a separate stride for legs from
  later in the day, a fade so a third of them do not appear between two frames
  — is machinery in service of a label nobody asked for. Four rounds of
  reports were about that machinery, and the fifth removed the strides
  entirely (see the note at the top). What is left is the lookahead, which
  only decides emphasis, and the fade, which is now doing the one job it is
  good at: easing a number out when it leaves the screen.
- **The number is not the interesting thing about a leg.** "17" tells you
  nothing. "Red, 2.3 km, 400 m down" tells you whether you want it.

## The proposal

Keep what the numbers uniquely do, drop the numbers.

**1. Direction on the line itself, not beside it.** The route already draws
lifts dashed and runs solid. Add a repeating chevron along the line, pointing
the way the day runs. That answers "which way round" continuously, at every
zoom, with no collision problem, no stride, no budget and no fade — because a
chevron is part of the line rather than a label competing for a box. This is
how every transit map draws a direction of travel.

**2. The elevation profile becomes the index.** `src/ui/ElevationProfile.jsx`
already exists, already takes a `markers` prop, and is already used on Choose,
Legs and Summary. The one screen it is missing from is the route detail — the
screen with the numbered badges on it. Put it in the detail bar and make it
scrubbable: drag along it and the corresponding leg highlights on the map and
its name and figures appear. That is the Komoot gesture, it is the linking
device the whole industry uses, and it costs one component we already have.

**3. Pins for the things a person chose.** Start, finish, the places to swing
by, and the lunch stop. Those already exist and are already drawn. Nothing
else gets a marker.

**4. Navigation keeps exactly one number.** "Leg 34 of 78" in the panel, which
is progress through the day rather than a label on the ground. The map while
navigating shows you, your cone, and the line ahead — which is what a
navigation screen is.

## What this deletes

`stepBadges` and everything it grew: `NAV_LOOKAHEAD`, `NEAR_SPOTS`, `SPOTS`,
the badge fades and `badgeAt`. (`NAV_FAR_STRIDE` and the stride ladder are
already gone — see the note at the top.) About 200 lines of the map renderer
and three constants, plus the features section that tests them. The chevron
replacement is perhaps 30 lines: walk the line, place a glyph every N pixels,
rotate to the local tangent.

## The honest counter-argument

The numbers do one thing a chevron does not: they let you say "meet me at 12"
out loud. Nobody does that on skis — you say "meet me at Gabiet" — and the
junction names are already on the map, so I do not think it survives contact.

The other risk is that the chevrons crowd where the route doubles back on
itself, which is the case the numbers were for. Worth measuring before
committing: draw both, count overlapping glyphs at each zoom on an 85-leg day
at Kronplatz, and look at it.

## Recommended order

1. Add the scrubbable profile to the detail screen. Independently useful, and
   it is the thing that makes the numbers redundant rather than merely
   unpopular.
2. Add chevrons to the route line, behind a flag, and measure the crowding.
3. If the chevrons hold up, delete `stepBadges` and its three constants.
4. Keep the legs list exactly as it is. It is a good cue sheet and the numbers
   in a *list* are unobjectionable — they are positions in a list, which is
   what a list is.

## Sources

- [Creating Routes on Mobile — Strava](https://support.strava.com/en-us/articles/15401660-creating-routes-on-mobile)
- [Routes on Web — Strava](https://support.strava.com/en-us/articles/15401971-routes-on-web)
- [Following a Route — Strava](https://support.strava.com/hc/en-us/articles/360044071592-Following-a-Route)
- [Elevation — Strava](https://support.strava.com/hc/en-us/articles/216919447-Elevation)
- [Plan routes in the app — Komoot](https://support.komoot.com/hc/en-us/articles/10206792140826-Plan-routes-in-the-app)
- [Komoot features](https://www.komoot.com/features)
- [Waypoints — Ride with GPS](https://support.ridewithgps.com/hc/en-us/articles/36795897776411-Waypoints)
- [Highlights, Points of Interest, and Waypoints — Ride with GPS](https://support.ridewithgps.com/hc/en-us/articles/36570435135131-Highlights-Points-of-Interest-and-Waypoints)
- [Guide to using Komoot — BikeRadar](https://www.bikeradar.com/advice/buyers-guides/guide-to-using-komoot)
- [New Strava Route Builder — Mountain Road](https://mountain-road.com/blog/strava-route-builder)
