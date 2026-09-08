/**
 * Home. Where you are skiing, and what you have been doing.
 *
 * No map behind it, on purpose. Choosing a resort while already looking at
 * that resort's terrain is backwards — the map should be a consequence of the
 * choice, not the backdrop to it. The mountain arrives when you go skiing.
 */
import { useMemo, useState } from "react";
import { RESORTS } from "../resorts/index.js";
import { listDays, totals, dayLabel } from "../lib/history.js";
import { Arrow, Brand, Check, Gear, Mountain, Search, Close, Info } from "../ui/Icons.jsx";
import Ridge from "../ui/Ridge.jsx";
import { hours } from "../ui/RouteBits.jsx";
import FriendsSection from "./FriendsSection.jsx";
import ResortGuide from "./ResortGuide.jsx";

/**
 * Does this resort answer what was typed?
 *
 * Name, region and country, because a skier looking for Kronplatz might type
 * "kronplatz", "south tyrol" or "italy" and all three are reasonable. Folded
 * for accents so "valle d'aosta" finds "Valle d'Aosta" and "gressoney" finds
 * "Gressoney-La-Trinité".
 */
const fold = (text) =>
  String(text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const matches = (resort, query) => {
  if (!query) return true;
  const haystack = fold(`${resort.name} ${resort.region ?? ""} ${resort.country ?? ""}`);
  // Every word has to appear somewhere, so "italy kron" works and the order
  // does not matter.
  return fold(query).split(/\s+/).filter(Boolean).every((word) => haystack.includes(word));
};

export default function HomeScreen({ selected, onSelect, onGoSkiing, onSettings, friends }) {
  const allLive = RESORTS.filter((r) => r.available);
  const allSoon = RESORTS.filter((r) => !r.available);

  /**
   * The search field appears once there is enough to search.
   *
   * With three resorts a field is furniture; the list is shorter than the
   * search box. It earns its place when the list stops being scannable, and
   * the threshold is deliberately low because the whole point of the OSM
   * pipeline is that this list grows.
   */
  const [query, setQuery] = useState("");
  /*
   * Which resort's guide is open, by id rather than a boolean.
   *
   * The card the info button sits on is the whole card, and it selects the
   * resort — so the button has to stop the tap reaching it. Reading about a
   * mountain and choosing it are two different intentions, and the guide has
   * its own "Ski this one" at the bottom for when they turn out to be the
   * same one.
   */
  const [guideId, setGuideId] = useState(null);
  const searchable = RESORTS.length >= 6;
  const live = useMemo(() => allLive.filter((r) => matches(r, query)), [allLive, query]);
  const soon = useMemo(() => allSoon.filter((r) => matches(r, query)), [allSoon, query]);
  const nothing = query && !live.length && !soon.length;

  const days = listDays();
  const t = totals(days);
  const resort = allLive.find((r) => r.id === selected);

  return (
    <div className="page">
      <header className="page__bar">
        <span className="wordmark wordmark--dark">
          <Brand className="wordmark__mark" /> Slalom
        </span>
        <button className="iconbtn iconbtn--flat" onClick={onSettings} aria-label="Settings">
          <Gear />
        </button>
      </header>

      <div className="page__body">
        <h1 className="title">Where are you skiing?</h1>

        {searchable && (
          <div className="search">
            <Search className="search__icon" width="18" height="18" />
            <input
              className="search__input"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search resorts"
              aria-label="Search resorts"
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
              enterKeyHint="search"
            />
            {query && (
              <button
                className="search__clear"
                onClick={() => setQuery("")}
                aria-label="Clear search"
              >
                <Close width="16" height="16" />
              </button>
            )}
          </div>
        )}

        {nothing && (
          <p className="note" style={{ margin: "var(--s-4) 2px" }}>
            Nothing here matches "{query}". Only resorts with mapped terrain can
            be planned on, and the list below is everything there is so far.
          </p>
        )}

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
            {/*
              * What this mountain is, without choosing it.
              *
              * Top right, away from the tick that says which one is selected,
              * and it stops the tap: the card underneath selects the resort,
              * and somebody reaching for information has not decided yet. A
              * span rather than a button, because a button inside a button is
              * not valid HTML and browsers resolve it by dropping one of them
              * — so this is a span with a role, which is what the platform
              * gives you for a control inside a control.
              */}
            <span
              className="hero__info"
              role="button"
              tabIndex={0}
              aria-label={`About ${r.name}`}
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); setGuideId(r.id); }}
              onKeyDown={(e) => {
                if (e.key !== "Enter" && e.key !== " ") return;
                e.stopPropagation();
                e.preventDefault();
                setGuideId(r.id);
              }}
            >
              <Info width="19" height="19" />
            </span>
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
                {/* The metres, not a rounded thousand.
                    "3.0k m top" is what Monterosa's 2,994 m came out as: six
                    metres of rounding across the one line on a piste map that
                    anybody quotes, and it crosses it in the flattering
                    direction. Every other number on this card is the number,
                    and the whole claim of the app is that its figures are
                    checkable against the mountain.

                    `?? NaN` keeps the property the e2e check relies on: a
                    resort promoted to live with an incomplete META has to
                    render something a check can see, and "NaN" is that.
                    Calling toLocaleString on undefined would throw and take
                    the whole home screen down instead. */}
                <span className="hero__stat"><b>{(r.stats.top ?? NaN).toLocaleString()}</b><span>m top</span></span>
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
              {/* A real button here: this row is not itself a control, so
                  there is nothing to nest inside. */}
              <button
                className="iconbtn iconbtn--flat"
                aria-label={`About ${r.name}`}
                onClick={() => setGuideId(r.id)}
              >
                <Info width="18" height="18" />
              </button>
              <span className="resortcard__soon">Soon</span>
            </div>
          ))}
        </div>
      </div>

      {/*
        * Outside the scrolling body, and after the footer.
        *
        * Inside `.page__body` it was a modal whose stacking context is that
        * body, so `.page__foot` — a later sibling — painted its disabled
        * "Choose a resort" straight over the guide's own footer, z-index 30 or
        * not. Same place the other two modals live, for the same reason.
        */}
      {guideId && (
        <ResortGuide
          resort={RESORTS.find((r) => r.id === guideId)}
          onClose={() => setGuideId(null)}
          // Only offered for a resort you can actually ski. The ones still on
          // the way have a guide worth reading and nothing to plan on.
          onChoose={RESORTS.find((r) => r.id === guideId)?.available ? onSelect : null}
        />
      )}

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
