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
