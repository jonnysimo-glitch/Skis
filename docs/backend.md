# The back end: collecting traces, sharing position, and what it buys

Two asks that share one piece of infrastructure and almost nothing else:

- **Live location sharing.** `src/lib/friends.js` models it and says at the top
  of the file that nothing leaves the phone. The list, the model and the
  per-friend switch are real; the transport is not built.
- **Collecting GPS traces to improve the mountain.** Correct the piste
  geometry, measure how fast people actually ski each run, and — the one that
  matters most — measure queues.

They pull in opposite directions technically. Sharing wants low latency, tiny
payloads and nothing kept. Traces want everything kept, forever, and do not
care about latency at all. Building them as one system is the mistake to avoid;
they should share consent, identity and the client's location plumbing, and
nothing else.

---

## 1. Why the traces are worth more than they look

The brief says queue times and last-lift times "need a data agreement with each
resort, which is also the B2B business model". That is true of *published*
data. It is not true of measured data.

A GPS trace of somebody riding a lift contains the queue: the gap between
arriving at the bottom station and beginning to gain altitude. Nothing else in
the app can know that number, and it is the number the whole product turns on —
`solve()` is a time budget, and a wrong queue estimate is a plan that strands
somebody. **Fifty traces of one lift on one morning gives you its queue
distribution better than a resort's own published figure**, which is an
average over a season if it exists at all.

The same traces give:

- **Real descent times per piste, per ability.** `src/lib/pace.js` models these
  from length and gradient. Measured p50 and p90 replace a model with data, and
  the p90 is what a plan should actually budget — half the skiers being late is
  not a plan.
- **Corrected centrelines.** OSM's piste geometry is directionally right and
  laterally off by 10–40 m in places, which is what was noticed.
- **Piste widths**, which OSM almost never has and which the renderer wants.
- **Which runs people actually ski**, which is the honest input to "most
  variety" and "cruisiest".

So the order of value is: **queues first**, then times, then geometry. That is
the opposite of the order they are easiest to build in, and worth resisting.

---

## 2. The shape of it

```
  phone                          edge                    warehouse
  ─────                          ────                    ─────────
  trace recorder ──chunks──▶  ingest worker  ──▶  object storage (raw, immutable)
                                                        │
  telemetry queue ─events──▶  ingest worker  ──▶  Postgres + PostGIS
                                                        │
                                              scheduled pipeline
                                              filter → segment → match
                                              → aggregate → publish
                                                        │
                                              corrections artefact
                                                        │
                                            npm run resort  ──▶ src/resorts/
  live channel   ◀──push───▶  realtime channel (ephemeral, never stored)
```

Two rules hold the whole thing together:

**Raw is immutable and kept separately from derived.** Every algorithm here
will be rewritten — the map matcher twice, probably — and you cannot re-run it
on data you threw away. Raw chunks land in object storage and are never
mutated. Postgres holds only what has been derived from them, and can be
rebuilt from scratch.

**The corrections are an artefact the build consumes, not a live query.** The
app stays offline-first: `src/resorts/<id>.js` is generated at build time. A
correction pass produces a second generated file the resort build applies over
OSM. The phone never asks a server where a piste is.

---

## 3. What to run it on

**Recommendation: Supabase (Frankfurt) for the database and the realtime
channel, Cloudflare R2 for raw traces.**

| | why |
|---|---|
| Postgres + PostGIS | The whole pipeline is nearest-line, buffer and aggregate queries. PostGIS does them in SQL you can read, and the alternative is writing geometry code. |
| Supabase Realtime | Broadcast channels give live sharing without running a socket server. 500 concurrent connections on Pro, which is a lot of ski groups. |
| Supabase Auth | Phone OTP is built in, and the phone number is already the identity in `friends.js`. |
| R2 for raw | $0.015/GB-month and **no egress fee**, which matters because reprocessing means reading all of it back repeatedly. |
| EU region | Non-negotiable: this is Italian users' precise location. Frankfurt is one click. |

Alternatives considered. **Cloudflare end to end** (Workers + D1 + Durable
Objects) is cheaper and the DO-per-group model is a beautiful fit for live
sharing, but D1 has no PostGIS and the pipeline would become hand-written
geometry — the wrong trade when the geometry *is* the product. **Roll your own
on Hetzner** is cheapest at scale and costs a person to operate; not yet.

### Costs, order of magnitude

At **1,000 active skiers**, 20 ski days each, ~4 h recording a day at 1 Hz:

| | |
|---|---|
| Supabase Pro | $25/mo, includes 8 GB database, Realtime, Auth ([pricing](https://uibakery.io/blog/supabase-pricing)) |
| Database overage | $0.125/GB-month beyond 8 GB — derived data only, so small |
| R2 raw traces | ~14 k fixes/day/user gzipped ≈ 150 KB; 1k × 20 days ≈ **3 GB ≈ $0.05/mo** |
| SMS OTP | ~$0.05 per verification, once per user ≈ $50 one-off per 1,000 |
| MapTiler | already in use; a paid tier when the free tile quota goes |

**≈ $30–80/month at a thousand users**, dominated by the database plan. The
figure that matters is not the hosting bill; it is that phase 1 below is a week
of work and phase 3 is a month.

Check these numbers before committing — I could not reach the vendors' own
pricing pages from this environment and the figures above come from secondary
sources.

---

## 4. Consent, and why it goes first

This is Italian users' precise location with timestamps, which is personal
data and is trivially re-identifiable — a trace that starts at the same house
every morning identifies a household. Under GDPR consent must be freely given,
specific, informed and as easy to withdraw as to give. Practically:

**Two separate switches, both default off, neither a condition of using the
planner:**

1. *Share my position with my group today.*
2. *Contribute my ski traces to improve the maps.*

Wording for the second one has to say what it is for and what is kept, in one
sentence a person reads: "Your track helps fix where the pistes really are and
how long they take. It is not linked to your name or number, and the raw track
is deleted after 90 days."

**Identity, deliberately split.** Traces carry a random device id and nothing
else — no phone number, no name. Sharing carries the phone number, because it
has to. A trace must never be joinable to a person, and keeping them in
separate tables with no foreign key between them is what makes that true rather
than promised.

**Retention, stated and enforced.** Raw traces 90 days; after that only the
aggregates, which are not personal data. A scheduled delete, and a test that
the delete actually runs.

**Rights that exist rather than being planned.** `GET /v1/me` exports
everything for a device id; `DELETE /v1/me` erases it, raw chunks included.
Two endpoints, written in phase 1, not later.

**App Store consequences.** App Privacy stops being "Data Not Collected". It
becomes Precise Location → *App Functionality* and *Analytics*, and Phone
Number → *App Functionality*. It must **not** be "Used for Tracking", which
means no third-party advertising SDK and no linking to data brokers; get that
wrong and App Tracking Transparency applies and the feature dies at the
prompt. `ios-setup/Info.plist.additions` already carries the location purpose
string; it will need rewording to mention sharing and contribution.

**Background location is the review risk.** `UIBackgroundModes: location` plus
"Always" permission gets scrutinised, and "we improve our maps" is not a strong
answer on its own. The strong answer is the one that is also true: the app is
navigating you down a mountain and shares your position with the group you are
skiing with. Recommendation for v1: record and share only while a navigation
session is running, which is already visibly a navigation session.

---

## 5. The pipeline, step by step

**1. Sample.** 1 Hz while moving; back off to 0.2 Hz when speed < 0.5 m/s for
30 s. Alpine GPS at 1 Hz is about 40 bytes a fix; a day is ~150 KB gzipped.
Battery is the constraint, not bandwidth.

**2. Filter.** Drop fixes with horizontal accuracy > 20 m, speed > 40 m/s, or
an implied speed between consecutive fixes above that. Cliffs and lift pylons
produce multipath and the raw stream has 30 m lateral spikes in it. Keep the
dropped ones in the raw chunk — filtering is a pipeline decision, not an
ingest one.

**3. Segment into lift and descent.** A lift is monotonic altitude gain at
near-constant speed with low heading variance. A descent loses altitude with
high heading variance. This is a threshold classifier and it is worth building
first because it needs no map matching and delivers item 4 on its own.

**4. Queues and ride times.** For each lift ride: the gap between first being
within N metres of the bottom station and beginning sustained altitude gain is
the queue; the gain itself is the ride. Aggregate by lift, by day of week, by
hour. **This replaces an estimate with a measurement and is the commercial
argument**: a resort that will not share its data is one you no longer need to
ask.

**5. Map-match each descent to the graph.** The standard approach is the
Newson–Krumm hidden Markov model: candidate edges per fix from a PostGIS
nearest-neighbour query, emission probability from the perpendicular distance,
transition probability from how plausible the graph path between consecutive
candidates is. It handles the parallel-piste case, which nearest-edge snapping
does not, and parallel pistes are exactly what a ski resort is.

**6. Aggregate a corrected centreline.** For each piste, cut every matched
trace at fixed intervals along the OSM line, take the **median** lateral
offset per station, and shift the line. Median rather than mean, so one bad
trace cannot move a piste. Below ~30 traces, do not publish a correction:
report the disagreement and wait.

**7. Widths.** The interquartile range of those lateral offsets is the skied
width. New information, not in OSM.

**8. Times per ability.** Ability is not in a trace, so infer a band from the
distribution of the skier's own descents (top speed and time on black runs) and
aggregate p50 and p90 per piste per band. Feed p90 to the solver's budget.

**9. Publish.** A generated `src/resorts/<id>.corrections.js` with per-piste
geometry offsets, widths, and per-lift queue and ride distributions, applied by
`npm run resort` on top of OSM. And — good citizenship, and arguably an ODbL
obligation for derived geometry — feed the geometry fixes back to
OpenStreetMap rather than hoarding them.

---

## 6. What code needs writing

**Client**

1. `src/lib/consent.js` — the two switches, persisted, with a version so a
   changed purpose re-asks.
2. `src/lib/telemetry.js` — event queue, local persistence, back-off upload.
   **A no-op returning immediately when consent is off.**
3. `src/lib/trace.js` — the recorder: sampling policy, chunking, handing
   chunks to the uploader. Offline-first, because alpine signal is the normal
   case: chunks queue on the device and go up on wifi.
4. `src/lib/live.js` — publish/subscribe on the group channel, presence, TTL.
5. Consent UI in `SettingsSheet.jsx`, and a first-run explanation that is not
   a wall of text.
6. Friends' positions on the map — a marker tier, which the renderer already
   has the machinery for.
7. Capacitor background-location configuration for both platforms.

**Server**

8. `POST /v1/chunks` — returns a signed URL; the client uploads straight to
   object storage. Keeps the worker out of the data path.
9. `POST /v1/events` — batched analytics.
10. Realtime channel authorisation: only members of a group may subscribe to
    it. This is the one that must not be wrong.
11. `GET /v1/me`, `DELETE /v1/me`.
12. The pipeline as scheduled jobs, each idempotent and re-runnable over the
    raw archive.
13. The retention job, and an alert if it does not run.

**Tests**

14. **Synthetic-trace recovery.** Take a known piste, perturb it with
    realistic GPS noise, run the pipeline, assert it recovers the original
    within a stated tolerance. This is the honest test of the matcher, and it
    can run in CI with no data.
15. **Hold-out.** Fit the centreline on 80% of real traces, measure against
    the other 20%.
16. **Consent off means silence.** With both switches off, assert the queue
    stays empty and no request is made. This is the test that protects the
    company.
17. **Channel authorisation.** A device outside a group cannot subscribe to it.
18. **The graph still works.** A corrected graph must pass `check-resorts` —
    every base, every ability, a day exists — and be strongly connected. A
    correction that breaks routing is worse than no correction.
19. **Retention.** Insert a chunk with a backdated timestamp, run the job,
    assert it is gone.

---

## 7. Live sharing, specifically

Deliberately not built on any of the above except consent and the location
plumbing.

- **Transport:** a Supabase Realtime broadcast channel per group. Each member
  publishes `{lat, lon, alt, t}` every 10 s while sharing is on; subscribers
  get it pushed.
- **Nothing persisted.** Positions live in the channel and expire. This is
  cheaper, simpler, and removes almost the whole GDPR surface for the feature —
  there is no location history to export or erase because none is kept.
- **The group is a day, not a social graph.** A short code or a link, expiring
  in the evening. That is how people actually ski together, and it avoids
  building friend requests, blocking and the rest of it.
- **Identity needs verifying.** `normalisePhone` already makes the number a
  comparable key; without an OTP anybody can claim anybody's number. Supabase
  Auth phone OTP, once per device.
- **Say what it does not do.** While the app is closed, sharing stops. The
  screens already tell the truth about this feature and should carry on doing
  so — the file's own comment has it right: somebody who believes their group
  can see them and is wrong is in more trouble than somebody who knows they
  are alone.

---

## 8. Order of work

| phase | what | why here |
|---|---|---|
| **1** | Consent, telemetry, trace recording, raw upload, export and erase | You cannot collect retroactively. Nothing is derived yet and that is fine — the archive starts filling. |
| **2** | Lift/descent segmentation → **queue and ride times** | No map matching needed. Replaces the app's weakest numbers with measurements and undercuts the need for a resort data deal. |
| **3** | Live sharing | Self-contained, high perceived value, no dependency on the archive. |
| **4** | Map matching → corrected centrelines and widths | The month of work. Wants phase 1 to have been running for a season. |
| **5** | Measured times per ability into the solver | Wants phase 4's matching. The biggest quality win, last because it depends on everything. |

Phase 2 before phase 3 is the one call worth arguing about. Sharing is more
visible; queues are the business.
