/**
 * Route detail, and the commit.
 *
 * Committing must cache tiles, graph and route for full airplane mode. Alpine
 * signal is unreliable and this is a hard requirement.
 *
 * The route and graph are written synchronously, so the day is skiable with no
 * signal the instant the button is tapped. Terrain tiles keep downloading
 * behind the navigate screen: they are the enhancement, and a progress bar
 * between a skier and the first lift is the wrong trade.
 */
import { SheetHead, SheetFoot } from "../ui/Sheet.jsx";
import { detailStats, hours } from "../ui/RouteBits.jsx";
import { backAt } from "../lib/plan.js";
import { minutesToClock, legsOf } from "../solver.js";
import { NODES } from "../active-resort.js";
import { commitRoute } from "../lib/offline.js";
import { Back, Download, Arrow } from "../ui/Icons.jsx";

export default function DetailScreen({ route, opts, plan, resortId, onStart, onBack, onLegs }) {
  const back = backAt(route, opts);
  const finishName = NODES[route.segments[route.segments.length - 1].to].name;

  // The route and graph are written synchronously, so the day is already
  // skiable offline by the time this returns. Terrain keeps downloading behind
  // the navigate screen; making someone watch a progress bar for tiles they do
  // not need yet is the wrong trade on a mountain.
  const save = () => {
    commitRoute({ route, opts, resortId });
    onStart();
  };

  const stats = detailStats(route);

  return (
    <>
      {/*
        A bar, and as little of one as the job allows.

        It carries what decides a day — what it is, how much of it there is,
        and when you are back — and the two things you can do. The four large
        figures, the profile, the difficulty mix and sixty-odd legs are one tap
        away on a page of their own, because the map underneath is the thing
        the skier just asked to see and every row here is a row of it covered.
      */}
      <SheetHead>
        <div className="detail__top">
          <div className="eyebrow eyebrow--accent">{route.label}</div>
          <button className="detail__legs" onClick={onLegs}>
            {legsOf(route).length} legs <Arrow width="14" height="14" />
          </button>
        </div>
        <h1 className="title title--sm">{route.title}</h1>
        <div className="detail__glance">
          {stats.slice(0, 3).map((item) => (
            <span key={item.k} className="detail__stat">
              <b>{item.v}</b>
              <span>{item.k}</span>
            </span>
          ))}
          <span className="detail__stat detail__stat--back">
            <b>{minutesToClock(back)}</b>
            <span>back at {finishName}</span>
          </span>
        </div>
      </SheetHead>

      <SheetFoot>
        <div className="actionrow">
          <button className="btn btn--quiet" onClick={onBack}>
            <Back width="16" height="16" /> Back
          </button>
          {/* Not "Save offline and start": sharing the row with Back it wrapped
              to two lines, and the note directly below already promises the
              offline part in more words than the button could. */}
          {/* The download mark is the promise the removed line of small print
              used to make: this day is going on the phone, and it will work
              with no signal. A row of type under the button was a row of
              mountain covered. */}
          <button className="btn" onClick={save}>
            <Download width="18" height="18" />
            Save and start
          </button>
        </div>
      </SheetFoot>
    </>
  );
}
