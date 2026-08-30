/**
 * Days you have skied.
 *
 * Small enough to live in localStorage alongside everything else: a full
 * season at one resort is a few dozen entries of a few hundred bytes. If that
 * ever stops being true the shape here is already a flat list of records, so
 * moving it to IndexedDB is a change of storage rather than of model.
 */
import { load, save } from "./persist.js";

const MAX_ENTRIES = 400;

/**
 * @typedef {object} Day
 * @property {string} id
 * @property {number} at          finished at, epoch ms
 * @property {string} resortId
 * @property {string} title       the route's character title
 * @property {string} label       "Most vertical", etc.
 * @property {number} minutes
 * @property {number} km
 * @property {number} vertical
 * @property {number} distinctRuns
 * @property {number} lifts
 * @property {number} areas
 * @property {number} highestAlt
 * @property {number} longestDescent
 * @property {{blue:number, red:number, black:number}} counts
 */

export const listDays = () => load("history") ?? [];

export function recordDay({ route, resortId }) {
  const day = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: Date.now(),
    resortId,
    title: route.title,
    label: route.label,
    minutes: route.minutes,
    km: route.km,
    vertical: route.vertical,
    distinctRuns: route.distinctRuns,
    lifts: route.lifts,
    areas: route.areas,
    highestAlt: route.highestAlt,
    longestDescent: route.longestDescent,
    counts: route.counts,
  };
  save("history", [day, ...listDays()].slice(0, MAX_ENTRIES));
  return day;
}

export const removeDay = (id) => save("history", listDays().filter((d) => d.id !== id));
export const clearHistory = () => save("history", []);

/** Season totals. The numbers a skier actually repeats to people. */
export function totals(days = listDays()) {
  return days.reduce(
    (t, d) => ({
      days: t.days + 1,
      vertical: t.vertical + d.vertical,
      km: Math.round((t.km + d.km) * 10) / 10,
      minutes: t.minutes + d.minutes,
      runs: t.runs + d.distinctRuns,
      lifts: t.lifts + d.lifts,
      best: Math.max(t.best, d.vertical),
      highest: Math.max(t.highest, d.highestAlt),
    }),
    { days: 0, vertical: 0, km: 0, minutes: 0, runs: 0, lifts: 0, best: 0, highest: 0 }
  );
}

/** "Today", "Yesterday", then a date. How a person refers to a day. */
export function dayLabel(at, now = Date.now()) {
  const d = new Date(at);
  const midnight = (t) => { const x = new Date(t); x.setHours(0, 0, 0, 0); return x.getTime(); };
  const diff = Math.round((midnight(now) - midnight(at)) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return d.toLocaleDateString(undefined, { weekday: "long" });
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}
