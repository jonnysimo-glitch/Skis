/**
 * The genuine empty state.
 *
 * When nothing fits, say so plainly and say what would change it. Never invent
 * a route that strands someone, and never dress a non-answer up as one.
 */
import { SheetHead, SheetBody, SheetFoot } from "../ui/Sheet.jsx";
import { minutesToClock } from "../lib/plan.js";
import { NODES } from "../resort.js";
import { Warning, Arrow } from "../ui/Icons.jsx";

const FIXES = {
  laterFinish: (plan, resort) => ({
    title: `Give yourself until ${minutesToClock(Math.min(plan.t1 + 45, resort.lastDown))}`,
    sub: "45 more minutes is usually the difference.",
  }),
  dropLunch: () => ({
    title: "Ski through lunch",
    sub: "Buys back 45 minutes.",
  }),
  finishHere: (plan) => ({
    title: `Finish at ${NODES[plan.start].name} instead`,
    sub: "Ends where you started, no cross-valley crossing.",
  }),
  harder: () => ({
    title: "Include red runs",
    sub: "Opens the links between the valleys.",
  }),
};

export default function EmptyScreen({ diagnosis, plan, resort, onFix, onBack }) {
  return (
    <>
      <SheetHead>
        <div className="eyebrow">
          <Warning width="14" height="14" /> No route
        </div>
        <h1 className="title title--sm">That won't fit</h1>
      </SheetHead>

      <SheetBody>
        <div className="empty">
          <p className="empty__big">{diagnosis.headline}</p>
          <p className="empty__p">{diagnosis.body}</p>

          <ul className="fixlist">
            {diagnosis.fixes.map((id) => {
              const fix = FIXES[id]?.(plan, resort);
              if (!fix) return null;
              return (
                <li key={id}>
                  <button onClick={() => onFix(id)}>
                    <span>
                      <b>{fix.title}</b>
                      <br />
                      <span>{fix.sub}</span>
                    </span>
                    <Arrow width="18" height="18" style={{ marginLeft: "auto", flex: "none" }} />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </SheetBody>

      <SheetFoot>
        <button className="btn btn--ghost" onClick={onBack}>
          Change the basics
        </button>
      </SheetFoot>
    </>
  );
}
