/**
 * Solving.
 *
 * The solver takes 50-300ms depending on the device. That is too fast to
 * explain itself and too slow to feel instant, so this holds for a beat and
 * says what is actually being checked. It is not a fake progress bar.
 */
import { useEffect, useState } from "react";
import { SheetHead, SheetBody } from "../ui/Sheet.jsx";

const STEPS = [
  "Reading the lift graph",
  "Checking last lifts and closures",
  "Sampling routes that get you home",
  "Ranking by character",
];

export default function SolvingScreen() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 260);
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      <SheetHead>
        <div className="eyebrow">Working</div>
      </SheetHead>
      <SheetBody>
        <div className="solving">
          <svg width="190" height="70" viewBox="0 0 190 70" aria-hidden="true">
            <polyline
              className="solving__line"
              points="6,62 34,20 62,56 92,14 120,50 150,26 184,44"
              fill="none"
              stroke="#e35205"
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
          <div className="solving__t" aria-live="polite">
            {STEPS[step]}
          </div>
        </div>
      </SheetBody>
    </>
  );
}
