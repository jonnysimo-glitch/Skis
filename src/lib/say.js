/**
 * The app in the language the reader's phone is set to.
 *
 * Five of the six mountains are in Italy and Austria. The person holding the
 * phone on the piste is, more often than not, reading Italian or German — and
 * the words that matter most on that screen are the ones a mistranslation
 * would make dangerous: which lift is the last one up, what a red run is,
 * whether the day still fits.
 *
 * Same decision as the clock, for the same reason. `src/lib/clock.js` follows
 * the device rather than offering a setting, because the phone already knows
 * and a skier who set it once has told us once. This follows the device too.
 * There is no language picker and there should not be one.
 *
 * ---------------------------------------------------------------- the shape
 *
 * Keyed on the English string, not on an identifier.
 *
 * `t("Last lift")` rather than `t("status.lastLift")`, which is unfashionable
 * and is the right way round for this app. A key that has no entry renders as
 * itself, so the worst case is an English word on an Italian screen — legible,
 * obviously untranslated, and fixable. The alternative fails as
 * "status.lastLift" in the one place the reader most needs a real answer.
 *
 * It also means nothing breaks if a screen is never wired up: the English
 * source string is already the fallback, so partial coverage is a coherent
 * state rather than a half-broken one. That matters, because this covers the
 * critical copy and not the whole app.
 *
 * -------------------------------------------------------- where words came from
 *
 * The ski vocabulary is not translated by ear. Every lift type, piste grade
 * and lift-hours term below is the word the industry and the resorts actually
 * print, checked against third-party sources rather than guessed:
 *
 *   IT  seggiovia / cabinovia / funivia / sciovia  — the four lift types, as
 *       distinguished by Italian ski glossaries: funivia is one or two cabins
 *       shuttling, cabinovia (or ovovia) is many cabins on a circulating
 *       cable, seggiovia is the chairlift, sciovia the drag.
 *   IT  pista blu / rossa / nera  — beginner, intermediate, expert.
 *   IT  "ultima salita"  — the published wording for the last lift up. Taken
 *       from Cervinia's own timetable, which prints "Ultima salita da
 *       Breuil-Cervinia per Plateau Rosà (no discesa)". "Rientro a valle" is
 *       the matching phrase for getting back down.
 *   IT  "impianti di risalita" for the lifts as a system, "impianti aperti"
 *       for what is running — the phrase resorts put at the top of the page.
 *   IT  "dislivello" for vertical drop.
 *   IT  "tappeto mobile", also "nastro trasportatore" — the beginners' belt.
 *       Sunkid, who make them, use both on their Italian site.
 *   DE  Sessellift / Gondelbahn / Seilbahn / Schlepplift  — chair, gondola,
 *       cable car, drag, per German ski-lift references.
 *   DE  Piste blau / rot / schwarz, and the gradients behind them: blue to
 *       25%, red to 40%, black unregulated.
 *   DE  "Letzte Bergfahrt" for the last lift up and "Talabfahrt" for the run
 *       back down to the valley — both standard published terms.
 *   DE  "Zauberteppich" for the belt, which is a Sunkid product name that
 *       became the general word; "Förderband" is the technical one.
 *
 * Sourced through search summaries rather than fetched pages: the OSM wiki,
 * Wikipedia and every resort site are unreachable from the build environment,
 * which is the same limitation recorded against the lift hours in
 * scripts/resorts/*.json. The ordinary interface wording — buttons, labels,
 * the empty state — is plain language and did not need a ski source, only
 * care: short noun phrases and imperatives, which is what a label wants
 * anyway and which sidesteps the formal-or-familiar question that a full
 * sentence in either language would force.
 *
 * One thing deliberately NOT translated: the mountain's own names. A piste is
 * called Cimalegna, a station is called Talstation 8er Sommerberg, and those
 * are what the signs at the top of the run say. Translating them would be
 * actively harmful — the reader has to match the word on the screen to the
 * word on the post.
 */

/** Italian. */
const IT = {
  // -- the plan --------------------------------------------------------------
  "Down by": "A valle entro",
  By: "Entro",
  "First lift": "Prima risalita",
  "Finish at": "Arrivo a",
  "On the mountain": "Sulla montagna",
  Ability: "Livello",
  Anything: "Tutte",
  Blue: "Blu",
  "Blue and red": "Blu e rosse",
  "Find routes": "Trova percorsi",
  Optional: "Opzionale",
  "Add a place": "Aggiungi una tappa",
  "Add another": "Aggiungine un'altra",
  "Straight there": "Diretto",
  "Take me there": "Portami lì",
  "Change the plan": "Modifica il piano",
  "Back to the resort": "Torna al comprensorio",
  "Go skiing": "Vai a sciare",

  // -- the plan's own headings and the labels above each field -------------
  "Plan a day": "Programma la giornata",
  "Plan the day": "Programma la giornata",
  "Plan from here": "Programma da qui",
  "Already skiing": "Già sulle piste",
  Start: "Partenza",
  Starting: "Partenza",
  "You are at": "Sei a",
  "Take me to": "Portami a",
  /*
   * "A tuo agio su", not a translation of the word "ability". The English is
   * "Comfortable on" for a reason recorded in PlanScreen — it asks what a
   * skier is happy on rather than grading them — and the Italian has to keep
   * that, so this is the same question and not the same words.
   */
  "Comfortable on": "A tuo agio su",
  Also: "Inoltre",
  /*
   * "Pranzo in rifugio", which is what an Italian skier calls this. A rifugio
   * is the mountain hut you stop at; "pranzo seduto" would be a literal
   * rendering of the English and nobody says it.
   */
  "Sit-down lunch": "Pranzo in rifugio",

  // -- what is open, and the hours the day is planned against ----------------
  "What is open": "Impianti aperti",
  "First to shut": "Prima chiusura",
  "Last to shut": "Ultima chiusura",
  "Last lift": "Ultima salita",
  "last up": "ultima salita",
  Lifts: "Impianti",
  Altitude: "Altitudine",
  "Total pisted": "Piste totali",
  "Planning against": "Orari usati",

  // -- the character of a day ------------------------------------------------
  "Most vertical": "Più dislivello",
  "Most variety": "Più varietà",
  Cruisiest: "Più tranquilla",
  "Least queuing": "Meno code",
  "Longest descent": "Discesa più lunga",
  "Highest point": "Punto più alto",
  "Pick a shape for the day": "Scegli la giornata",
  "Not quite?": "Non è quello che cerchi?",
  "Turn one back off": "Disattivane uno",
  "One route": "Un percorso",

  // -- refine ----------------------------------------------------------------
  Shorter: "Più corta",
  Longer: "Più lunga",
  Easier: "Più facile",
  Harder: "Più difficile",
  Lunch: "Pranzo",

  // -- navigating ------------------------------------------------------------
  "To next junction": "Al prossimo incrocio",
  "Stop navigating": "Termina",
  "Re-plan": "Ricalcola",
  "The whole route": "Tutto il percorso",
  "Just the instruction": "Solo l'indicazione",
  "Back to the map": "Torna alla mappa",
  "Show the detail": "Mostra i dettagli",
  Finish: "Concludi",

  // -- the units and connectives in a leg line -------------------------------
  min: "min",
  "min queue": "min di coda",
  up: "in salita",
  down: "in discesa",
  "m down": "m di dislivello",
  "skating or on foot": "spingendo o a piedi",
  or: "o",

  // -- lifts and grades, the sourced vocabulary ------------------------------
  chair: "seggiovia",
  gondola: "cabinovia",
  "cable car": "funivia",
  drag: "sciovia",
  carpet: "tappeto mobile",
  link: "collegamento",
  blue: "blu",
  red: "rossa",
  black: "nera",

  // -- when nothing fits -----------------------------------------------------
  "That won't fit": "Non ci sta",
  "No day fits": "Nessuna giornata possibile",
  "That rules everything out": "Così non resta niente",
  "Nothing left": "Niente disponibile",
  "Ski through lunch": "Salta il pranzo",
  "Include red runs": "Includi le rosse",
  "Drop the places to swing by": "Togli le tappe",
  "Everything else stays as it is.": "Tutto il resto resta com'è.",
};

/** German. */
const DE = {
  // -- the plan --------------------------------------------------------------
  "Down by": "Im Tal bis",
  By: "Bis",
  "First lift": "Erste Bergfahrt",
  "Finish at": "Ziel",
  "On the mountain": "Am Berg",
  Ability: "Niveau",
  Anything: "Alles",
  Blue: "Blau",
  "Blue and red": "Blau und rot",
  "Find routes": "Routen finden",
  Optional: "Optional",
  "Add a place": "Ort hinzufügen",
  "Add another": "Noch einen",
  "Straight there": "Direkt",
  "Take me there": "Bring mich hin",
  "Change the plan": "Plan ändern",
  "Back to the resort": "Zurück zum Skigebiet",
  "Go skiing": "Skifahren",

  // -- the plan's own headings and the labels above each field -------------
  "Plan a day": "Tag planen",
  "Plan the day": "Tag planen",
  "Plan from here": "Von hier planen",
  "Already skiing": "Schon am Berg",
  Start: "Start",
  Starting: "Start",
  "You are at": "Du bist bei",
  "Take me to": "Bring mich zu",
  "Comfortable on": "Sicher auf",
  Also: "Außerdem",
  /*
   * "Hütteneinkehr" — the Alpine German for stopping at a hut to eat, which is
   * exactly what this option is. A literal "sitzendes Mittagessen" describes
   * the posture and misses the thing.
   */
  "Sit-down lunch": "Hütteneinkehr",

  // -- what is open, and the hours the day is planned against ----------------
  "What is open": "Was offen ist",
  "First to shut": "Erste Schließung",
  "Last to shut": "Letzte Schließung",
  "Last lift": "Letzte Bergfahrt",
  "last up": "letzte Bergfahrt",
  Lifts: "Lifte",
  Altitude: "Höhe",
  "Total pisted": "Pistenkilometer",
  "Planning against": "Geplant mit",

  // -- the character of a day ------------------------------------------------
  "Most vertical": "Meiste Höhenmeter",
  "Most variety": "Meiste Abwechslung",
  Cruisiest: "Gemütlichste",
  "Least queuing": "Kürzeste Wartezeit",
  "Longest descent": "Längste Abfahrt",
  "Highest point": "Höchster Punkt",
  "Pick a shape for the day": "Wähle deinen Tag",
  "Not quite?": "Nicht ganz?",
  "Turn one back off": "Eins wieder aus",
  "One route": "Eine Route",

  // -- refine ----------------------------------------------------------------
  Shorter: "Kürzer",
  Longer: "Länger",
  Easier: "Leichter",
  Harder: "Schwerer",
  Lunch: "Mittagessen",

  // -- navigating ------------------------------------------------------------
  "To next junction": "Bis zur nächsten Kreuzung",
  "Stop navigating": "Beenden",
  "Re-plan": "Neu planen",
  "The whole route": "Die ganze Route",
  "Just the instruction": "Nur die Anweisung",
  "Back to the map": "Zurück zur Karte",
  "Show the detail": "Details zeigen",
  Finish: "Beenden",

  // -- the units and connectives in a leg line -------------------------------
  min: "Min.",
  "min queue": "Min. Wartezeit",
  up: "bergauf",
  down: "bergab",
  "m down": "Höhenmeter",
  "skating or on foot": "schiebend oder zu Fuß",
  or: "oder",

  // -- lifts and grades, the sourced vocabulary ------------------------------
  chair: "Sessellift",
  gondola: "Gondelbahn",
  "cable car": "Seilbahn",
  drag: "Schlepplift",
  carpet: "Zauberteppich",
  link: "Verbindung",
  blue: "blau",
  red: "rot",
  black: "schwarz",

  // -- when nothing fits -----------------------------------------------------
  "That won't fit": "Das passt nicht",
  "No day fits": "Kein Tag passt",
  "That rules everything out": "Damit bleibt nichts übrig",
  "Nothing left": "Nichts übrig",
  "Ski through lunch": "Mittagspause streichen",
  "Include red runs": "Rote Pisten dazunehmen",
  "Drop the places to swing by": "Tappen weglassen",
  "Everything else stays as it is.": "Alles andere bleibt, wie es ist.",
};

export const DICTS = { it: IT, de: DE };

/**
 * The two-letter language the device is set to, or null for one we do not
 * carry.
 *
 * Read off `navigator.language` rather than off a stored preference, and
 * narrowed to the base tag: de-AT, de-DE and de-CH all get German, and it-IT
 * and it-CH both get Italian, because the words below do not differ between
 * them in any way that matters on a piste.
 */
function deviceLang() {
  try {
    const tag = (typeof navigator !== "undefined" && navigator.language) || "";
    const base = String(tag).toLowerCase().split("-")[0];
    return base in DICTS ? base : null;
  } catch {
    return null;
  }
}

let lang;
/** The dictionary in force, resolved once. */
const dict = () => {
  if (lang === undefined) lang = deviceLang();
  return lang ? DICTS[lang] : null;
};

/**
 * One string, in the reader's language if we have it and in English if not.
 *
 * `t("Last lift")` returns "Ultima salita" on an Italian phone and
 * "Last lift" on any other, including one set to a language this does carry
 * but for a string that was never entered. English is the fallback because
 * English is the key.
 */
export function t(s) {
  const d = dict();
  if (!d || typeof s !== "string") return s;
  return d[s] ?? s;
}

/**
 * The same, for a word that appears inside a sentence the app builds — a lift
 * type or a piste grade. Separate only so the call sites read honestly: these
 * are the sourced ski terms, and a missing one is a vocabulary gap rather than
 * an untranslated label.
 */
export const term = (s) => t(s);

/** Which language is in force, for checks and for nothing else. */
export const language = () => dict() && lang;

/** Only for the checks: pin the language rather than reading the device. */
export function useLanguage(code) {
  lang = code && code in DICTS ? code : null;
}
