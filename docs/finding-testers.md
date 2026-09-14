# Finding people to try Slalom, and tailoring it with them

Written 14 September 2026, which turns out to matter more than anything else
in this document. See "The window" below.

One caveat before any of it: **reddit.com is blocked from the build
environment**, along with Overpass and every resort's own site. So the
subreddit names and sizes below are from general knowledge and from search
results about them, not from reading their sidebars. Every one of them needs
its rules checked on the live page before you post — several ski subreddits
ban link posts from accounts under a certain age, and a first post that gets
removed costs you the community, not just the post.

---

## The thing to get right before choosing a channel

Slalom covers **six mountains**: Monterosa, Kronplatz, Paganella, Latemar,
Sölden and Hintertux. That is the whole product surface, and it changes the
recruitment problem completely.

r/skiing has something like half a million subscribers. Almost none of them
are going to be standing on one of those six mountains this season. A post
there gets you upvotes, a hundred people who open the link, look at a resort
list that does not contain their resort, and close it. That is not a tester.
It is a bounce, and it teaches you nothing except that the landing page works.

The people worth finding are the ones who can answer the question the app is
actually built to answer — *it's 2pm, you have 90 minutes, your car is at
Champoluc* — which means they have to be at Champoluc. **Ten skiers who ski
Kronplatz every weekend are worth more than a thousand upvotes.** Optimise for
the mountain, not the audience size.

That reverses the usual ordering. The German- and Italian-language channels
are more valuable than the English-language ones here, because five of the six
resorts are in South Tyrol, Trentino, Aosta and Tyrol, and the locals who ski
them weekly post in German and Italian.

---

## The window

Today is 14 September. In the northern Alps that normally means there is
nothing to test on for three months — and that is exactly what the two
Austrian resorts just changed.

- **Hintertux is open now.** It is Austria's only 365-day glacier. Somebody
  could use Slalom on it this weekend.
- **Sölden's glacier opens around 1 October**, ahead of the main area in
  November.
- **The Alpine World Cup opener is at Sölden on 24–25 October.** That is tens
  of thousands of skiers on one mountain that the app now covers, six weeks
  out, and the single densest concentration of the exact right user that will
  exist before Christmas.

So the sequencing writes itself, and it is the opposite of what it would have
been a week ago:

1. **Now to end of September** — Hintertux. Small numbers, but real ones, and
   it is the only place on earth where you can watch somebody use this on snow
   right now. Recruiting five people here beats fifty in December.
2. **October** — Sölden. Glacier opening, then the World Cup week.
3. **December onwards** — the four Italian resorts as they open, which is when
   the mid-day reset case gets its real workout, because that is when people
   are skiing full days with a car parked somewhere.

The Italian resorts are the ones the app knows best and they are the ones you
cannot test for three months. Do not wait for them.

---

## Where to look, roughly in order of expected value

### Tier 1: the mountains themselves

Not a channel, and the best one. Hintertux and Sölden are operating now. A day
on the glacier with the app open, asking two people in the lift queue to try
it, will produce more usable feedback than every forum post below combined.
The failure modes this app has — a route that strands you, a badge that reads
as broken, a time that is forty minutes optimistic — are the kind that only
show up with cold hands and a real lift queue.

If you can only do one thing on this list, do this one.

### Tier 2: resort-specific communities

These are small, unglamorous and exactly on target. For each of the six:

- **Facebook groups** named after the resort or its valley. These are where
  season-pass holders actually are — condition reports, lift status, lost
  gloves. Usually in the local language. Ötztal, Zillertal, Val d'Ayas /
  Gressoney, Pustertal / Val Pusteria, Andalo, Val di Fiemme.
- **The local ski school and rental shops.** The app knows where they are —
  `PLACES` in each resort file lists them with coordinates. A rental shop
  counter is the single highest-traffic point of contact with exactly your
  user, and shop staff are asked "where should we ski today" fifteen times a
  morning. That is the product, being asked out loud.
- **Season-pass holder mailing lists** where the resort runs one.

The B2B angle in CLAUDE.md is relevant here. You need a data agreement with
each resort for queue and last-lift times anyway. A conversation that starts
"I built this for your mountain, would you try it" is the same conversation,
started warmer.

### Tier 3: German- and Italian-language forums

- **Bergfex** and **Skiresort.info** — the two big German-language resort
  portals, both with active communities, both used by exactly the Austrian and
  South Tyrolean skiers you want.
- **Snowplaza** and regional German ski forums.
- Italian: **Skiforum.it** and the Dolomiti / Trentino Facebook groups.

These skew toward people who read piste maps for fun, which is precisely the
person who will notice that Slalom's routing is doing something no other app
does.

### Tier 4: English-language general ski communities

Worth doing, worth doing *after* the above, and worth framing carefully.

- **r/skiing** — large, general, mostly North American. Highest reach, lowest
  hit rate. Your ask is not "try my app", it is "does anyone here ski the
  Dolomites or Ötztal".
- **r/europeskiing**, **r/Skiing_Feedback**, **r/backcountry**,
  **r/Tyrol**, **r/Austria**, **r/italy** — smaller, more targeted.
  Non-English-language national subs are often more receptive to a local
  product than the big English ones.
- **snowHeads** and **J2Ski** — British, Alps-focused, older and more
  opinionated than Reddit. A good fit: these are people who plan a week in
  Val Gardena in detail and argue about it.
- **First Tracks Online / Liftlines** has a Europe subforum.
- **Newschoolers**, **SkiTalk**, **TheSkiDiva** — each with a distinct
  audience; TheSkiDiva in particular is a well-moderated community where a
  respectful ask lands well.

### Tier 5: adjacent builders

**r/SideProject**, **r/webdev**, Hacker News's *Show HN*, **Indie Hackers**.
These get you feedback on the build, not on the skiing. Useful for the
offline-mode and 3D-map engineering, useless for whether the route is a good
day out. Do not confuse the two kinds of feedback — this is the trap that makes
products that developers admire and skiers do not use.

---

## How to ask, so that it works

Ski communities are hostile to marketing and fine with builders. The
difference is entirely in the framing.

**Lead with the problem, not the product.** The brief already contains the
best possible post, nearly word for word:

> It's 2pm, you've got 90 minutes, you're on the wrong side of the mountain
> and your car is at Champoluc. What do you actually do?

That is a question people will answer whether or not they ever open the link.
And the answers are research: you will learn how skiers currently solve this,
which is the thing you are competing with.

**Say what it does not do.** Six resorts, no queue data yet, estimated lift
times. Naming the limits up front is what separates a builder from a
marketer, and ski forums can tell the difference instantly.

**Ask for one specific thing.** "Try it and let me know" gets nothing. "Does
the last run it suggests get you down before the lifts shut — and if it's
wrong, by how much?" gets answers, and it is the answer you most need, because
the lift times are estimates and an overstated one strands somebody.

**Never post the same text twice.** Cross-posting identical copy is the single
most reliable way to get filtered as spam across every platform at once.

**Do not lead with the 3D map.** It is the most impressive thing on screen and
the least defensible — CLAUDE.md is right that terrain is commodity. Lead with
the routing, which nobody else does.

---

## Tailoring it with them, which is the part that is actually hard

Getting people to try it is the easy half. The app already has the machinery
for the other half and it is worth pointing at explicitly:

- `scripts/personas.mjs` runs synthetic skiers over every resort. Every real
  complaint should become a persona, so it stays fixed.
- `docs/backend.md` describes collecting GPS traces. The tester cohort is
  where consented trace collection starts, and traces are how you get real
  queue times without waiting for a resort to sign anything — which unblocks
  the top item on the CLAUDE.md priority list.
- The thing to measure is not "did they like it". It is **did the day work** —
  did they get down on time, did the route hold, did they follow it or bail at
  leg three. Bailing at leg three is the signal. Ask about it directly.

A tester group of ten who ski one mountain weekly and answer a two-question
message each Sunday evening is worth more than any launch. Recruit for that,
not for signups.

---

## Sources

Season dates from Maison Sport's and Slushbook's 2026/27 European opening
lists, Tirolergletscher for Hintertux's 365-day operation, and the FIS
calendar for the Sölden opener. Community names from general knowledge and
search; **rules unverified**, because reddit.com and the resort sites are
blocked from the build environment.
