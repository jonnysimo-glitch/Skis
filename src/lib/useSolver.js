/**
 * Solve in a worker, with the main thread as a fallback.
 *
 * Two things this guarantees, both of which matter for refine:
 *   - only the newest request can resolve, so fast chip taps never let a stale
 *     answer land after a fresh one;
 *   - the solving state is not shown at all for a re-solve that returns
 *     quickly, so refining feels like the list changing rather than a
 *     round trip through a spinner.
 */
import { useCallback, useEffect, useRef, useState } from "react";

let nextId = 1;

export function useSolver() {
  const workerRef = useRef(null);
  const pending = useRef(new Map());
  const latest = useRef(0);
  const [solving, setSolving] = useState(false);

  useEffect(() => {
    let worker = null;
    try {
      worker = new Worker(new URL("../solver.worker.js", import.meta.url), {
        type: "module",
      });
      worker.onmessage = (event) => {
        const { id, routes, error, ms } = event.data;
        const entry = pending.current.get(id);
        pending.current.delete(id);
        if (!entry) return;
        if (error) entry.reject(new Error(error));
        else entry.resolve({ routes, ms });
      };
      worker.onerror = () => {
        // Fall back to the main thread rather than leaving the app dead.
        workerRef.current = null;
      };
      workerRef.current = worker;
    } catch {
      workerRef.current = null;
    }
    return () => {
      worker?.terminate();
      workerRef.current = null;
      pending.current.clear();
    };
  }, []);

  const run = useCallback(async (opts) => {
    const id = nextId++;
    latest.current = id;
    setSolving(true);

    let result;
    if (workerRef.current) {
      result = await new Promise((resolve, reject) => {
        pending.current.set(id, { resolve, reject });
        workerRef.current.postMessage({ id, opts });
      });
    } else {
      const { solve } = await import("../solver.js");
      const started = performance.now();
      const routes = solve(opts);
      result = { routes, ms: Math.round(performance.now() - started) };
    }

    if (latest.current !== id) return null; // superseded by a newer tap
    setSolving(false);
    return result;
  }, []);

  return { solve: run, solving };
}
