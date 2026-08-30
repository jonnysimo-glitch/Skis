/**
 * Small durable things: the profile, the last plan, the committed route.
 *
 * Ability is set once and shown as an overridable chip — that only works if it
 * survives a reload. Everything here degrades to defaults if storage is
 * unavailable (private browsing, quota), never throws.
 */

const KEY = "skis.v1";

const DEFAULTS = {
  profile: { ability: "red" },
  resortId: null,
  lastPlan: null,
  committed: null, // { resortId, route, opts, savedAt }
  seenMapNote: false,
};

let memory = null;

function readAll() {
  if (memory) return memory;
  try {
    const raw = localStorage.getItem(KEY);
    memory = raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
  } catch {
    memory = { ...DEFAULTS };
  }
  return memory;
}

function writeAll(next) {
  memory = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* Full or blocked. In-memory copy still serves this session. */
  }
}

export const load = (key) => readAll()[key];

export function save(key, value) {
  writeAll({ ...readAll(), [key]: value });
}

export function clearCommitted() {
  save("committed", null);
}
