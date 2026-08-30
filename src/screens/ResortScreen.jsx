/**
 * Resort selection.
 *
 * One resort is live. The rest are listed and plainly marked as not ready —
 * the panel exists so the shape of the product is honest from the first
 * screen, not so it can imply coverage it does not have.
 */
import { SheetHead, SheetBody, SheetFoot } from "../ui/Sheet.jsx";
import { RESORTS } from "../resorts/index.js";
import { Mountain, Arrow, Check } from "../ui/Icons.jsx";

/**
 * Terrain illustration standing in for photography. Layered ridgelines with
 * atmospheric recession, scaled by the resort's own vertical range so a high,
 * steep resort looks different to a low one. A real photograph goes here when
 * there is one to use.
 */
function Ridge({ resort, hero }) {
  const top = resort.stats?.top ?? 3000;
  const bottom = resort.stats?.bottom ?? 1200;
  // 0 = gentle and low, 1 = high and steep.
  const rel = Math.min(1, Math.max(0.15, (top - bottom) / 2200));
  const id = resort.id;
  const h = (base, drop) => base - rel * drop;

  return (
    <svg
      className={hero ? "hero__art" : "resortcard__thumb"}
      viewBox="0 0 160 90"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`sky-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2f5f83" />
          <stop offset="62%" stopColor="#7ba7c4" />
          <stop offset="100%" stopColor="#c3dae7" />
        </linearGradient>
        <linearGradient id={`near-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#c9dae4" />
        </linearGradient>
      </defs>

      <rect width="160" height="90" fill={`url(#sky-${id})`} />

      {/* Far range, hazed back into the sky. */}
      <path
        d={`M0 90 L14 ${h(60, 10)} L34 ${h(70, 6)} L52 ${h(50, 16)} L70 ${h(66, 8)}
            L92 ${h(44, 20)} L112 ${h(62, 10)} L134 ${h(52, 14)} L160 ${h(64, 8)} L160 90Z`}
        fill="#8fb1c7"
        opacity="0.62"
      />

      {/* Main massif — the summit sits off centre, ridges fall away unevenly. */}
      <path
        d={`M0 90 L18 ${h(74, 8)} L38 ${h(80, 4)} L56 ${h(62, 14)} L74 ${h(70, 8)}
            L96 ${h(38, 24)} L106 ${h(50, 16)} L124 ${h(44, 20)} L142 ${h(68, 10)}
            L160 ${h(60, 12)} L160 90Z`}
        fill={`url(#near-${id})`}
      />

      {/* Rock showing through on the shaded flank of the summit. */}
      <path
        d={`M96 ${h(38, 24)} L106 ${h(50, 16)} L100 ${h(56, 13)} L92 ${h(48, 18)}Z`}
        fill="#93a7b4"
        opacity="0.5"
      />

      {/* Treeline and valley floor. */}
      <path
        d="M0 90 L22 79 L46 85 L72 77 L100 84 L128 76 L160 86 L160 90Z"
        fill="#37524a"
        opacity="0.88"
      />
    </svg>
  );
}

export default function ResortScreen({ selected, onSelect, onContinue }) {
  const live = RESORTS.filter((r) => r.available);
  const soon = RESORTS.filter((r) => !r.available);

  return (
    <>
      <SheetHead>
        <div className="eyebrow">
          <Mountain width="14" height="14" /> Where are you skiing
        </div>
        <h1 className="title">Pick a mountain</h1>
      </SheetHead>

      <SheetBody>
        {live.map((resort) => (
          <button
            key={resort.id}
            className="hero"
            aria-pressed={selected === resort.id}
            onClick={() => onSelect(resort.id)}
          >
            <Ridge resort={resort} hero />
            <span className="hero__scrim" />
            {selected === resort.id && (
              <span className="hero__tick">
                <Check width="17" height="17" />
              </span>
            )}
            <span className="hero__body">
              <span className="hero__nm">{resort.name}</span>
              <span className="hero__loc">
                {resort.region}, {resort.country}
              </span>
              <span className="hero__meta">
                <span>
                  <b>{resort.stats.lifts}</b> lifts
                </span>
                <span>
                  <b>{resort.stats.runs}</b> runs
                </span>
                <span>
                  <b>{resort.stats.top.toLocaleString()}</b> m top
                </span>
                <span>
                  <b>{resort.stats.valleys}</b> valleys
                </span>
              </span>
            </span>
          </button>
        ))}

        <p className="note" style={{ margin: "6px 2px 18px" }}>
          {live[0]?.blurb}
        </p>

        <div className="sectionrule">
          <div className="eyebrow" style={{ marginBottom: 10 }}>
            Next up
          </div>
          {soon.map((resort) => (
            <div key={resort.id} className="resortcard resortcard--soon">
              <Ridge resort={resort} />
              <span>
                <span className="resortcard__nm">{resort.name}</span>
                <span className="resortcard__loc">
                  {resort.region}, {resort.country}
                </span>
              </span>
              <span className="resortcard__soon">Soon</span>
            </div>
          ))}
          <p className="note" style={{ marginTop: 12 }}>
            A resort goes live when its piste graph has been extracted, cleaned and
            checked against real lift times — not before. Routing on a graph that
            is nearly right is worse than no routing at all.
          </p>
        </div>
      </SheetBody>

      <SheetFoot>
        <button className="btn" disabled={!selected} onClick={onContinue}>
          {selected ? (
            <>
              Plan a day <Arrow width="18" height="18" />
            </>
          ) : (
            "Choose a resort"
          )}
        </button>
      </SheetFoot>
    </>
  );
}
