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
 * Terrain illustration standing in for photography. Drawn from the resort's own
 * altitude range so a high, steep resort looks different to a low one — a real
 * photo goes here when there is one to use.
 */
function Ridge({ resort, hero }) {
  const top = resort.stats?.top ?? 3000;
  const bottom = resort.stats?.bottom ?? 1200;
  const rel = Math.min(1, Math.max(0.2, (top - bottom) / 2200));
  const peak = 46 - rel * 26;
  return (
    <svg
      className={hero ? "hero__art" : "resortcard__thumb"}
      viewBox="0 0 160 90"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`sky-${resort.id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3d6c8f" />
          <stop offset="100%" stopColor="#9dc2d8" />
        </linearGradient>
      </defs>
      <rect width="160" height="90" fill={`url(#sky-${resort.id})`} />
      <path d={`M0 90 L26 ${58 - rel * 8} L48 ${72 - rel * 6} L74 ${peak + 12} L104 ${64 - rel * 8} L134 ${74 - rel * 6} L160 ${60} L160 90Z`} fill="#5c7f96" opacity="0.55" />
      <path d={`M0 90 L22 ${66 - rel * 6} L44 ${78 - rel * 4} L78 ${peak} L112 ${70 - rel * 8} L160 ${82 - rel * 6} L160 90Z`} fill="#e9f1f6" />
      <path d={`M78 ${peak} L92 ${peak + 20} L64 ${peak + 20} Z`} fill="#ffffff" />
      <path d="M0 90 L34 78 L70 86 L108 76 L160 88 L160 90Z" fill="#415c53" opacity="0.8" />
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
