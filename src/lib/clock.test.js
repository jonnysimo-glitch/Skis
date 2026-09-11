/**
 * The clock, on a phone set either way. Run with: node src/lib/clock.test.js
 *
 * Two halves, because the interesting behaviour is locale-dependent and a test
 * process has exactly one locale. The first half checks what holds whatever
 * the device is set to; the second spawns a node for each locale and reads the
 * output back, which is slower than mocking Intl and is the only way to find
 * out what ICU actually does rather than what this file assumes it does.
 *
 * The assertion that matters most is the boring one: on a 24-hour locale,
 * showClock must be byte-identical to the solver's minutesToClock. That is
 * what says this change adds an American clock without altering the European
 * one, and it is the check that would have caught the first version, which
 * quietly dropped the leading zero and turned the leg list's time column
 * ragged.
 */
import { execFileSync } from "node:child_process";
import { showClock, usesAmPm, widestClock } from "./clock.js";
import { minutesToClock } from "../solver.js";

let failures = 0;
let checks = 0;
function is(name, condition, detail = "") {
  checks++;
  if (!condition) failures++;
  console.log(`  ${condition ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
}

console.log("\nTRUE WHATEVER THE PHONE IS SET TO");
is("a time comes back as something", showClock(9 * 60 + 15).length >= 4, showClock(9 * 60 + 15));
is("the minutes survive", /15\b/.test(showClock(9 * 60 + 15)) && /:45/.test(showClock(13 * 60 + 45)),
  `${showClock(9 * 60 + 15)}, ${showClock(13 * 60 + 45)}`);
/*
 * Nothing user-facing carries a narrow no-break space. Current ICU puts U+202F
 * before AM/PM; it is invisible, it is not what a reader thinks they are
 * looking at, and it breaks a check written against "4:30 PM" in a way that
 * takes an afternoon to see.
 */
is("no invisible spaces in the output",
  ![0, 555, 720, 825, 990, 1439].some((m) => /[\u202f\u2009\u00a0]/.test(showClock(m))),
  JSON.stringify(showClock(13 * 60 + 45)));
is("a day's worth of times all format", [0, 1, 59, 60, 719, 720, 721, 1439]
  .every((m) => showClock(m).length >= 4));

console.log("\nNOTHING TO SAY");
is("not a number is not a time", showClock(undefined) === "" && showClock(NaN) === "" &&
  showClock(null) === "", JSON.stringify(showClock(undefined)));
/*
 * Minutes past midnight, and the app never generates more than 1440 — but
 * `lastDown + 45` in the empty state is arithmetic on a config value, so the
 * wrap is defined rather than left to produce "25:30".
 */
is("midnight and the end of the day are the same instant",
  showClock(1440) === showClock(0), `${showClock(1440)} / ${showClock(0)}`);
is("and a negative wraps rather than printing a minus",
  showClock(-30) === showClock(1410), `${showClock(-30)} / ${showClock(1410)}`);
is("widestClock really is the widest",
  [0, 555, 720, 825, 990, 1439].every((m) => showClock(m).length <= widestClock().length),
  `${JSON.stringify(widestClock())} at ${widestClock().length} chars`);
is("usesAmPm agrees with what is printed",
  usesAmPm() === /[ap]\.?\s?m/i.test(showClock(13 * 60)), `${usesAmPm()} for "${showClock(13 * 60)}"`);

console.log("\nON A PHONE SET TO 24 HOURS, NOTHING CHANGED");
/*
 * Spawned rather than mocked. Intl reads the locale once, at construction, off
 * the environment — so the only way to ask "what would an Italian phone show"
 * is to be an Italian phone for a moment.
 */
const inLocale = (locale, minutes) =>
  JSON.parse(execFileSync(process.execPath, [
    "--input-type=module", "-e",
    `import("${new URL("./clock.js", import.meta.url).href}").then(({ showClock, usesAmPm }) =>
       console.log(JSON.stringify({ out: ${JSON.stringify(minutes)}.map(showClock), ampm: usesAmPm() })));`,
  ], { env: { ...process.env, LANG: `${locale}.UTF-8`, LC_ALL: `${locale}.UTF-8`, TZ: "UTC" }, encoding: "utf8" }));

const SAMPLE = [0, 555, 720, 825, 990, 1439];
const WANT = SAMPLE.map(minutesToClock);

for (const locale of ["it-IT", "de-AT", "en-GB", "fr-FR", "ja-JP"]) {
  const { out, ampm } = inLocale(locale, SAMPLE);
  is(`${locale}: identical to the solver's own formatter`,
    out.join("|") === WANT.join("|"), `${out.join(", ")} against ${WANT.join(", ")}`);
  is(`${locale}: and says so`, ampm === false, String(ampm));
}

console.log("\nON A PHONE SET TO 12 HOURS, IT SAYS HALF FOUR");
{
  const { out, ampm } = inLocale("en-US", SAMPLE);
  is("en-US is on a twelve-hour clock", ampm === true, String(ampm));
  is("the afternoon is PM", out[3] === "1:45 PM" && out[4] === "4:30 PM", out.join(", "));
  is("the morning is AM", out[1] === "9:15 AM", out[1]);
  is("midnight and noon are the ones people get wrong",
    out[0] === "12:00 AM" && out[2] === "12:00 PM", `${out[0]} / ${out[2]}`);
  // Nobody writes "04:30 PM". The hour is padded only on a 24-hour clock.
  is("and the hour is not zero-padded", !out.some((t) => /^0\d:/.test(t)), out.join(", "));
  is("which is wider than the 24-hour form, and that is the layout to watch",
    out[4].length > minutesToClock(990).length, `"${out[4]}" against "${minutesToClock(990)}"`);
}

console.log("\n" + (failures ? `  ${failures} FAILING of ${checks}` : `  the clock holds, all ${checks} checks`));
process.exit(failures ? 1 : 0);
