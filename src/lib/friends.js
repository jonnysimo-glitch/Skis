/**
 * Who you ski with, and who can see where you are.
 *
 * NOTHING HERE LEAVES THE PHONE. There is no server, so a friend you add
 * cannot actually see you yet and you cannot see them. The model, the list and
 * the per-friend switch are all real; the transport is not built. Every screen
 * that touches this says so plainly, for the same reason the closures panel
 * does: someone who believes their group can see them on the mountain, and is
 * wrong, is in more trouble than someone who knows they are on their own.
 *
 * The phone number is the identity. Not a username, not an account: the thing
 * both people already have for each other. That makes normalising it a
 * correctness problem rather than a formatting one — if "+44 7700 900123" and
 * "+447700900123" do not collide you get two records for one person, and the
 * switch you flipped is on the record that is not being used.
 */
import { load, save } from "./persist.js";

const MAX_FRIENDS = 200;

/**
 * Longest name kept. Long enough for "Maria Chiara Bertolini", short enough
 * that a row stays a row: names come from a text field, and a text field will
 * take a paragraph if you let it.
 */
export const MAX_NAME = 32;

const cleanName = (name) =>
  (name ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_NAME);

/**
 * A phone number as a comparable key, or null if it is not one.
 *
 * The country code is required, and that is deliberate rather than lazy.
 * "07700 900123" is a real number to a British reader and a different real
 * number to an Italian one; without the prefix the same person has two
 * identities depending on who typed them in. WhatsApp requires it for the same
 * reason. `00` is accepted as the international prefix because half of Europe
 * dials it that way.
 */
export function normalisePhone(input) {
  if (typeof input !== "string") return null;
  let s = input.trim().replace(/[\s().‐-―-]/g, "");
  if (s.startsWith("00")) s = `+${s.slice(2)}`;
  if (!s.startsWith("+")) return null;
  const digits = s.slice(1);
  if (!/^[0-9]{7,15}$/.test(digits)) return null;
  return `+${digits}`;
}

/**
 * How a number is shown.
 *
 * What they typed, if we have it. Regrouping it ourselves needs a table of
 * country codes we do not have: an attempt to split from the right turned
 * "+44 7700 900123" into "+447 700 900 123", which is not a phone number
 * anyone recognises. So the normalised form is the key and the typed form is
 * the label, and only the key is ever compared.
 */
export const formatPhone = (record) =>
  typeof record === "string" ? record : record?.typed || record?.phone || "";

export const samePhone = (a, b) => {
  const x = normalisePhone(a);
  const y = normalisePhone(b);
  return x !== null && x === y;
};

/**
 * You. A name and a number, and nothing else — no picture, because a picture
 * is not how anyone finds their friend on a mountain.
 *
 * Shares the stored profile with ability, which was there first, so both read
 * and write merge rather than replace. Returns null until both fields are
 * filled: half a profile is not an identity, and every caller here wants to
 * know whether there is someone to share as.
 */
export function getProfile() {
  const p = load("profile");
  return p?.name && p?.phone ? { name: p.name, phone: p.phone, typed: p.typed } : null;
}

export function saveProfile({ name, phone }) {
  const trimmed = cleanName(name);
  const number = normalisePhone(phone);
  if (!trimmed) return { ok: false, error: "name", message: "A name, so your friends know who is sharing." };
  if (!number) {
    return {
      ok: false,
      error: "phone",
      message: "A phone number with its country code, like +39 333 123 4567.",
    };
  }
  const profile = { name: trimmed, phone: number, typed: phone.trim() };
  save("profile", { ...load("profile"), ...profile });
  return { ok: true, profile };
}

/** Forget who you are, without forgetting what you ski. */
export function clearProfile() {
  const { name, phone, typed, ...rest } = load("profile") ?? {};
  save("profile", rest);
}

export const listFriends = () => load("friends") ?? [];

/**
 * Add someone. Name and number is everything that is asked for.
 *
 * Adding yourself is refused rather than allowed and ignored: the list is who
 * can see you, and your own name sitting in it reads as though you are sharing
 * with yourself, which is not a thing.
 */
export function addFriend({ name, phone }) {
  const trimmed = cleanName(name);
  const number = normalisePhone(phone);
  if (!trimmed) return { ok: false, error: "name", message: "Give them a name you will recognise." };
  if (!number) {
    return {
      ok: false,
      error: "phone",
      message: "A phone number with its country code, like +39 333 123 4567.",
    };
  }
  const me = getProfile();
  if (me && me.phone === number) {
    return { ok: false, error: "self", message: "That is your own number." };
  }
  const friends = listFriends();
  const existing = friends.find((f) => f.phone === number);
  if (existing) {
    return { ok: false, error: "duplicate", message: `${existing.name} is already on the list.` };
  }
  const friend = { phone: number, typed: phone.trim(), name: trimmed, sharing: false, addedAt: Date.now() };
  save("friends", [...friends, friend].slice(0, MAX_FRIENDS));
  return { ok: true, friend };
}

export function removeFriend(phone) {
  const number = normalisePhone(phone);
  save("friends", listFriends().filter((f) => f.phone !== number));
}

export function renameFriend(phone, name) {
  const number = normalisePhone(phone);
  const trimmed = cleanName(name);
  if (!trimmed) return { ok: false, error: "name" };
  save("friends", listFriends().map((f) => (f.phone === number ? { ...f, name: trimmed } : f)));
  return { ok: true };
}

/**
 * Turn sharing on or off for one person.
 *
 * Refused without a profile. Sharing means handing someone your position, and
 * a position that arrives from nobody, with no number attached, is not
 * something the other end can do anything with.
 */
export function setSharing(phone, on) {
  const number = normalisePhone(phone);
  if (on && !getProfile()) {
    return { ok: false, error: "noProfile", message: "Add your own name and number first." };
  }
  save("friends", listFriends().map((f) => (f.phone === number ? { ...f, sharing: Boolean(on) } : f)));
  return { ok: true };
}

/** Everyone you have turned sharing on for. */
export const sharingWith = () => listFriends().filter((f) => f.sharing);

export function clearFriends() {
  save("friends", []);
}
