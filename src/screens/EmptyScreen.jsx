/**
 * The genuine empty state.
 *
 * When nothing fits, say so plainly and say what would change it. Never invent
 * a route that strands someone, and never dress a non-answer up as one.
 */
import { SheetHead, SheetBody, SheetFoot } from "../ui/Sheet.jsx";
import { minutesToClock } from "../lib/plan.js";
import { NODES } from "../active-resort.js";
import { Warning, Arrow } from "../ui/Icons.jsx";

/**
 * Each returns null when it would not actually change anything.
 *
 * A fix that cannot help is worse than no fix: at 16:20, with the last lift at
 * 16:30, "give yourself until 16:30" was offered against a plan that already
 * ran to 16:30. Tapping it re-solved the same impossible day and returned here.
 */
const FIXES = {
  laterFinish: (plan, resort) => {
    const later = Math.min(plan.t1 + 45, resort.lastDown);
    if (later <= plan.t1 + 1) return null; // the mountain shuts first
    return {
      title: `Give yourself until ${minutesToClock(later)}`,
      sub: `${later - plan.t1} more minutes is usually the difference.`,
    };
  },
  dropLunch: () => ({
    title: "Ski through lunch",
    sub: "Buys back 45 minutes.",
  }),
  finishHere: (plan) => ({
    title: `Finish at ${NODES[plan.start].name} instead`,
    sub: "Ends where you started, no cross-valley crossing.",
  }),
  /*
   * Named for the grade it would actually add. It said "Include red runs" to
   * everybody, which is right for a blue skier and wrong for the red skier at
   * Paganella who was being offered the black ones.
   */
  harder: (plan, resort, capacity, ability) => {
    const next = { blue: "red", red: "black" }[ability];
    if (!next) return null;
    return {
      title: `Include ${next} runs`,
      sub: next === "red"
        ? "Reds link the valleys, so it opens most of the mountain."
        : "The steep ones, and the places only they reach.",
    };
  },
  /**
   * For a mountain that cannot fill the day asked for. Finishing earlier is
   * the fix, which is the opposite of every other one here — so it says what
   * the new finish would be rather than leaving the reader to work it out.
   */
  shorterDay: (plan, resort, capacity) => {
    if (!capacity?.minutes) return null;
    // The budget that was proved to work, not the length of the route it
    // found. See longestDay() in App.jsx.
    const t1 = plan.t0 + (capacity.budget || capacity.minutes) + (plan.lunch ? 45 : 0);
    if (t1 >= plan.t1 - 5) return null; // not actually shorter
    return {
      title: `Plan to ${minutesToClock(t1)} instead`,
      sub: "As long a day as this mountain supports.",
    };
  },
};

export default function EmptyScreen({ diagnosis, plan, resort, capacity, ability, onFix, onBack }) {
  return (
    <>
      <SheetHead>
        <div className="eyebrow">
          <Warning width="14" height="14" /> {diagnosis.eyebrow || "No route"}
        </div>
        {/* Not every empty state is a clock problem, so the heading is the
            diagnosis's to set when "That won't fit" would be untrue. */}
        <h1 className="title title--sm">{diagnosis.title || "That won't fit"}</h1>
      </SheetHead>

      <SheetBody>
        <div className="empty">
          <p className="empty__big">{diagnosis.headline}</p>
          <p className="empty__p">{diagnosis.body}</p>

          {/* Only what is actually left. When nothing can help, the copy
              above has already said so and a list of dead ends adds nothing. */}
          <ul className="fixlist">
            {(diagnosis.fixes || []).map((id) => {
              const fix = FIXES[id]?.(plan, resort, capacity, ability);
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
          Change the plan
        </button>
      </SheetFoot>
    </>
  );
}
