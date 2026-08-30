/**
 * The record. Every day you have finished, and what they add up to.
 *
 * Entirely local: nothing here has ever left the phone, which is worth saying
 * plainly at the bottom rather than leaving people to wonder.
 */
import { useState } from "react";
import { listDays, totals, dayLabel, clearHistory } from "../lib/history.js";
import { getResort } from "../resorts/index.js";
import { hours } from "../ui/RouteBits.jsx";
import { Chart, Trash } from "../ui/Icons.jsx";

const ORDER = ["blue", "red", "black"];

export default function StatsScreen({ version, onChanged }) {
  const [confirming, setConfirming] = useState(false);
  const days = listDays();
  const t = totals(days);

  if (!days.length) {
    return (
      <div className="page">
        <div className="page__body">
          <h1 className="title">Your season</h1>
          <div className="blank">
            <Chart width="36" height="36" className="blank__icon" />
            <p className="blank__t">No days yet</p>
            <p className="blank__s">
              Finish a route and it lands here.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page__body">
        <h1 className="title">Your season</h1>

        <div className="spacer" />
        <div className="stats stats--lg">
          <div className="stat">
            <span className="stat__v">{t.days}</span>
            <span className="stat__k">{t.days === 1 ? "day" : "days"}</span>
          </div>
          <div className="stat">
            <span className="stat__v">
              {(t.vertical / 1000).toFixed(1)}<span className="stat__u">k m</span>
            </span>
            <span className="stat__k">descended</span>
          </div>
          <div className="stat">
            <span className="stat__v">
              {Math.round(t.km)}<span className="stat__u"> km</span>
            </span>
            <span className="stat__k">skied</span>
          </div>
        </div>

        <div className="spacer" />
        <div className="metrics">
          <div className="metric">
            <div className="metric__v">{hours(t.minutes)}</div>
            <div className="metric__k">on the hill</div>
          </div>
          <div className="metric">
            <div className="metric__v">{t.highest.toLocaleString()}<span> m</span></div>
            <div className="metric__k">highest point</div>
          </div>
          <div className="metric">
            <div className="metric__v">{t.best.toLocaleString()}<span> m</span></div>
            <div className="metric__k">biggest day</div>
          </div>
          <div className="metric">
            <div className="metric__v">{t.lifts}</div>
            <div className="metric__k">lifts ridden</div>
          </div>
        </div>

        <div className="sectionrule">
          <div className="eyebrow" style={{ marginBottom: "var(--s-3)" }}>
            {days.length} {days.length === 1 ? "day" : "days"}
          </div>
          <ul className="daylist">
            {days.map((d) => {
              const resort = getResort(d.resortId);
              const mix = ORDER.filter((g) => d.counts?.[g]);
              return (
                <li key={d.id} className="day day--full">
                  <span className="day__when">
                    {dayLabel(d.at)}
                    {resort ? ` · ${resort.name}` : ""}
                  </span>
                  <span className="day__title">{d.title}</span>
                  <span className="day__nums">
                    {d.vertical.toLocaleString()} m · {d.km} km · {hours(d.minutes)} ·{" "}
                    {d.distinctRuns} runs
                  </span>
                  {mix.length > 0 && (
                    <span className="day__mix">
                      {mix.map((g) => (
                        <span key={g}>
                          <i className={`pipdot pipdot--${g}`} />
                          {d.counts[g]}
                        </span>
                      ))}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        <div className="sectionrule">
          {confirming ? (
            <div className="warn">
              <Trash className="warn__icon" width="18" height="18" />
              <span>
                <span className="warn__t">Delete everything?</span>
                <span className="warn__p">
                  All {days.length} days, permanently. There is no copy anywhere else.
                </span>
                <span className="warn__acts">
                  <button
                    className="btn btn--ghost btn--sm"
                    onClick={() => setConfirming(false)}
                  >
                    Keep
                  </button>
                  <button
                    className="btn btn--sm"
                    onClick={() => {
                      clearHistory();
                      setConfirming(false);
                      onChanged?.();
                    }}
                  >
                    Delete
                  </button>
                </span>
              </span>
            </div>
          ) : (
            <button className="btn btn--quiet" onClick={() => setConfirming(true)}>
              <Trash width="16" height="16" /> Clear history
            </button>
          )}
          <p className="note" style={{ marginTop: "var(--s-3)" }}>
            Stored on this phone only. Nothing is uploaded anywhere.
          </p>
        </div>
      </div>
    </div>
  );
}
