/**
 * Home. Where you are skiing, and what you have been doing.
 *
 * No map behind it, on purpose. Choosing a resort while already looking at
 * that resort's terrain is backwards — the map should be a consequence of the
 * choice, not the backdrop to it. The mountain arrives when you go skiing.
 */
import { RESORTS } from "../resorts/index.js";
import { listDays, totals, dayLabel } from "../lib/history.js";
import { Arrow, Check, Gear, Mountain } from "../ui/Icons.jsx";
import Ridge from "../ui/Ridge.jsx";
import { hours } from "../ui/RouteBits.jsx";
import FriendsSection from "./FriendsSection.jsx";

export default function HomeScreen({ selected, onSelect, onGoSkiing, onSettings, friends }) {
  const live = RESORTS.filter((r) => r.available);
  const soon = RESORTS.filter((r) => !r.available);
  const days = listDays();
  const t = totals(days);
  const resort = live.find((r) => r.id === selected);

  return (
    <div className="page">
      <header className="page__bar">
        <span className="wordmark wordmark--dark">
          <i className="wordmark__dot" /> Skis
        </span>
        <button className="iconbtn iconbtn--flat" onClick={onSettings} aria-label="Settings">
          <Gear />
        </button>
      </header>

      <div className="page__body">
        <h1 className="title">Where are you skiing?</h1>

        {live.map((r) => (
          <button
            key={r.id}
            className="hero"
            data-resort={r.id}
            aria-pressed={selected === r.id}
            onClick={() => onSelect(r.id)}
          >
            <Ridge resort={r} hero />
            <span className="hero__scrim" />
            {selected === r.id && (
              <span className="hero__tick">
                <Check width="17" height="17" />
              </span>
            )}
            <span className="hero__body">
              <span className="hero__nm">{r.name}</span>
              <span className="hero__loc">{r.region}, {r.country}</span>
              <span className="hero__meta">
                <span className="hero__stat"><b>{r.stats.lifts}</b><span>lifts</span></span>
                {/* Kilometres, not the run count: the count is however many
                    pieces the pistes happen to be mapped in, which is not a
                    number a skier can check against anything. */}
                <span className="hero__stat"><b>{r.stats.km ?? r.stats.runs}</b><span>{r.stats.km ? "km piste" : "runs"}</span></span>
                <span className="hero__stat"><b>{(r.stats.top / 1000).toFixed(1)}k</b><span>m top</span></span>
                <span className="hero__stat"><b>{r.stats.valleys}</b><span>{r.stats.valleys === 1 ? "valley" : "valleys"}</span></span>
              </span>
            </span>
          </button>
        ))}

        {resort && <p className="note" style={{ margin: "0 2px" }}>{resort.blurb}</p>}

        {days.length > 0 && (
          <div className="sectionrule">
            <div className="eyebrow" style={{ marginBottom: "var(--s-3)" }}>This season</div>
            <div className="stats stats--lg">
              <div className="stat">
                <span className="stat__v">{t.days}</span>
                <span className="stat__k">{t.days === 1 ? "day" : "days"}</span>
              </div>
              <div className="stat">
                <span className="stat__v">{t.vertical.toLocaleString()}<span className="stat__u"> m</span></span>
                <span className="stat__k">descended</span>
              </div>
              <div className="stat">
                <span className="stat__v">{Math.round(t.km)}<span className="stat__u"> km</span></span>
                <span className="stat__k">skied</span>
              </div>
            </div>

            <ul className="daylist" style={{ marginTop: "var(--s-5)" }}>
              {days.slice(0, 3).map((d) => (
                <li key={d.id} className="day">
                  <span className="day__when">{dayLabel(d.at)}</span>
                  <span className="day__title">{d.title}</span>
                  <span className="day__nums">
                    {d.vertical.toLocaleString()} m · {d.km} km · {hours(d.minutes)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <FriendsSection {...friends} />

        <div className="sectionrule">
          <div className="eyebrow" style={{ marginBottom: "var(--s-3)" }}>Next up</div>
          {soon.map((r) => (
            <div key={r.id} className="resortcard">
              <Ridge resort={r} />
              <span>
                <span className="resortcard__nm">{r.name}</span>
                <span className="resortcard__loc">{r.region}, {r.country}</span>
              </span>
              <span className="resortcard__soon">Soon</span>
            </div>
          ))}
        </div>
      </div>

      <div className="page__foot">
        <button className="btn" disabled={!selected} onClick={onGoSkiing}>
          {selected ? (
            <>
              <Mountain width="18" height="18" /> Go skiing
            </>
          ) : (
            "Choose a resort"
          )}
        </button>
      </div>
    </div>
  );
}
