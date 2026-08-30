/**
 * The Plan button.
 *
 * The skiing tab is the mountain and nothing else: no card, no statistics, no
 * panel to read. The one thing on that screen that does anything is this, and
 * it floats over the map rather than sitting in a surface, so there is never
 * anything between you and the terrain.
 */
import { Plus } from "./Icons.jsx";

export default function PlanButton({ onPlan, hidden }) {
  return (
    <button
      className={`planbtn${hidden ? " planbtn--hidden" : ""}`}
      onClick={onPlan}
      {...(hidden ? { inert: "" } : {})}
    >
      <Plus width="20" height="20" />
      Plan
    </button>
  );
}
