/**
 * The elevation profile. A recurring motif rather than a one-off chart — the
 * same object appears full-bleed inside a route card, larger on the detail
 * screen, and as a progress track while navigating.
 *
 * Filled area under the curve, difficulty-coloured line on top, lifts dashed.
 * The x axis is TIME, not distance: a skier's day is a time budget, and a lift
 * that takes eight minutes to climb 500m should occupy eight minutes of the
 * chart.
 */
import { altitudeSeries } from "../solver.js";
import { PISTE_COLOUR, LIFT_COLOUR } from "../lib/geo.js";
import { ACCENT } from "../lib/brand.js";

export default function ElevationProfile({
  route,
  height = 62,
  showScale = false,
  doneThrough = -1,
  markers = false,
  id = "ep",
}) {
  if (!route?.segments?.length) return null;

  const alts = altitudeSeries(route);
  const lo = Math.min(...alts);
  const hi = Math.max(...alts);
  const span = hi - lo || 1;
  const total = route.segments.reduce((sum, e) => sum + e.min, 0) || 1;

  const W = 320;
  const top = markers ? 14 : 5;
  const bottom = 2;
  const y = (alt) => height - bottom - ((alt - lo) / span) * (height - top - bottom);

  // Walk once, collecting both the fill path and the coloured segments.
  const xs = [0];
  let cursor = 0;
  for (const edge of route.segments) {
    cursor += (edge.min / total) * W;
    xs.push(cursor);
  }

  const area =
    `M0,${height} L0,${y(alts[0]).toFixed(1)} ` +
    route.segments.map((_, i) => `L${xs[i + 1].toFixed(1)},${y(alts[i + 1]).toFixed(1)}`).join(" ") +
    ` L${W},${height} Z`;

  const gradientId = `${id}-fill`;

  const lines = route.segments.map((edge, i) => (
    <line
      key={`${edge.id}-${i}`}
      x1={xs[i].toFixed(1)}
      y1={y(alts[i]).toFixed(1)}
      x2={xs[i + 1].toFixed(1)}
      y2={y(alts[i + 1]).toFixed(1)}
      stroke={edge.kind === "lift" ? LIFT_COLOUR : PISTE_COLOUR[edge.difficulty]}
      strokeWidth={edge.kind === "lift" ? 1.7 : 2.8}
      strokeDasharray={edge.kind === "lift" ? "2.5 2.5" : undefined}
      strokeLinecap="round"
      opacity={i < doneThrough ? 0.3 : 1}
    />
  ));

  const peaks = [];
  if (markers) {
    // A day with twenty laps has twenty local maxima. Dot every one, but only
    // label the highest, and only where the label has room — overlapping
    // numbers are worse than no numbers.
    const candidates = [];
    alts.forEach((alt, i) => {
      if (i > 0 && i < alts.length - 1 && alts[i - 1] < alt && alt > alts[i + 1]) {
        candidates.push({ i, alt, x: xs[i] });
      }
    });
    const MIN_GAP = 34; // viewBox units, roughly the width of a five-digit label
    // Spaced on where the label is actually drawn, not on where its peak is.
    // Labels near an edge are clamped inwards to stay in the frame, so two
    // separate peaks in the first few percent both landed on x=14 and printed
    // on top of each other: "2,3502,350".
    const at = (x) => Math.max(14, Math.min(W - 14, x));
    const labelled = [];
    for (const c of [...candidates].sort((a, b) => b.alt - a.alt)) {
      // Not the same number twice. Lapping one summit six times produced six
      // identical labels, which is noise: the altitude is the information and
      // it has already been given.
      const ok = labelled.every(
        (l) => Math.abs(at(l.x) - at(c.x)) >= MIN_GAP && Math.abs(l.alt - c.alt) > 1
      );
      if (ok) labelled.push(c);
    }
    const labelledSet = new Set(labelled.map((l) => l.i));

    for (const c of candidates) {
      const isLabelled = labelledSet.has(c.i);
      peaks.push(
        <g key={`pk${c.i}`}>
          <circle
            cx={c.x.toFixed(1)}
            cy={y(c.alt).toFixed(1)}
            r={isLabelled ? 2.6 : 1.7}
            fill={isLabelled ? "#0b1a24" : "#a8bcc8"}
          />
          {isLabelled && (
            <text
              x={at(c.x).toFixed(1)}
              y={(y(c.alt) - 6).toFixed(1)}
              fontSize="9"
              fontWeight="600"
              fill="#7d95a5"
              textAnchor="middle"
            >
              {c.alt.toLocaleString()}
            </text>
          )}
        </g>
      );
    }
  }

  let nowX = null;
  if (doneThrough > 0) nowX = xs[Math.min(doneThrough, xs.length - 1)];

  return (
    <div className="profile">
      <svg
        className="profile__svg"
        width="100%"
        height={height}
        viewBox={`0 0 ${W} ${height}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`Elevation profile: ${route.vertical} metres of descent, high point ${hi} metres, low point ${lo} metres.`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8fb0c4" stopOpacity="0.5" />
            <stop offset="0%" stopColor="#7ba3bd" stopOpacity="0.62" />
            <stop offset="100%" stopColor="#7ba3bd" stopOpacity="0.06" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${gradientId})`} />
        {lines}
        {peaks}
        {nowX !== null && (
          <>
            <line
              x1={nowX.toFixed(1)}
              y1="0"
              x2={nowX.toFixed(1)}
              y2={height}
              stroke={ACCENT}
              strokeWidth="1.2"
              strokeDasharray="2 2"
              opacity="0.6"
            />
            <circle
              cx={nowX.toFixed(1)}
              cy={y(alts[Math.min(doneThrough, alts.length - 1)]).toFixed(1)}
              r="4.2"
              fill={ACCENT}
              stroke="#fff"
              strokeWidth="2"
            />
          </>
        )}
      </svg>
      {showScale && (
        <div className="profile__scale">
          <span>{lo.toLocaleString()} m</span>
          <span>
            {route.vertical.toLocaleString()} m descended
          </span>
          <span>{hi.toLocaleString()} m</span>
        </div>
      )}
    </div>
  );
}

/**
 * The mix of the day as one bar, proportional to time on each kind of terrain.
 * Reads faster than "9 blue, 11 red" and puts the lift share where a skier
 * can see it — riding up is time you are not skiing.
 */
export function DifficultyBar({ route, labels = false }) {
  const buckets = { blue: 0, red: 0, black: 0, lift: 0 };
  for (const edge of route.segments) {
    if (edge.kind === "lift") buckets.lift += edge.min;
    else buckets[edge.difficulty] += edge.min;
  }
  const total = Object.values(buckets).reduce((a, b) => a + b, 0) || 1;
  const parts = [
    ["blue", PISTE_COLOUR.blue, "Blue"],
    ["red", PISTE_COLOUR.red, "Red"],
    ["black", PISTE_COLOUR.black, "Black"],
    ["lift", LIFT_COLOUR, "Lifts"],
  ].filter(([key]) => buckets[key] > 0);

  return (
    <>
      <div className="mixbar" role="img" aria-label={parts.map(([k, , l]) => `${l} ${Math.round((buckets[k] / total) * 100)}%`).join(", ")}>
        {parts.map(([key, colour]) => (
          <span
            key={key}
            style={{ background: colour, width: `${(buckets[key] / total) * 100}%` }}
          />
        ))}
      </div>
      {labels && (
        <div className="mixbar__key">
          {parts.map(([key, colour, label]) => (
            <span key={key}>
              <i style={{ background: colour }} />
              {label} {Math.round((buckets[key] / total) * 100)}%
            </span>
          ))}
        </div>
      )}
    </>
  );
}
