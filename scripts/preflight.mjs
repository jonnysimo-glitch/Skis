/**
 * Is this ready to submit? Run with: npm run preflight
 *
 * Separate from `npm test` on purpose. These are not build failures, they are
 * submission gates: a placeholder contact address is fine while the app is a
 * web build being passed around, and unacceptable the moment it is in front of
 * App Review. Running them as part of the normal suite would make them noise
 * that gets ignored, which is how they end up shipping.
 *
 * Exits non-zero if anything here would embarrass you in front of a reviewer or
 * mislead a skier.
 */
import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";

let blocking = 0;
let warnings = 0;

const ok = (name, detail = "") => console.log(`  PASS   ${name}${detail ? "  — " + detail : ""}`);
const fail = (name, detail = "") => { blocking++; console.log(`  BLOCK  ${name}${detail ? "  — " + detail : ""}`); };
const warn = (name, detail = "") => { warnings++; console.log(`  WARN   ${name}${detail ? "  — " + detail : ""}`); };
const check = (cond, name, detail) => (cond ? ok(name, detail) : fail(name, detail));

const root = new URL("../", import.meta.url).pathname;
const read = (p) => readFile(root + p, "utf8");

console.log("\nICONS");
{
  const path = root + "assets/icon.png";
  if (!existsSync(path)) fail("assets/icon.png exists", "run npm run icons");
  else {
    const png = await readFile(path);
    const width = png.readUInt32BE(16);
    const height = png.readUInt32BE(20);
    const colourType = png[25];
    check(width === 1024 && height === 1024, "the App Store icon is 1024x1024", `${width}x${height}`);
    check(colourType === 2, "and has no alpha channel, which Apple rejects", `colour type ${colourType}`);
  }
  check(existsSync(root + "assets/splash.png"), "there is a launch image");
}

console.log("\nPRIVACY");
{
  const path = root + "ios-setup/PrivacyInfo.xcprivacy";
  if (!existsSync(path)) fail("the app target has a privacy manifest");
  else {
    const xml = await readFile(path, "utf8");
    check(/<key>NSPrivacyTracking<\/key>\s*<false\/>/.test(xml), "it declares no tracking");
    check(/<key>NSPrivacyCollectedDataTypes<\/key>\s*<array\/>/.test(xml), "and no collected data types");
    check(/NSPrivacyAccessedAPICategoryUserDefaults/.test(xml), "and gives a reason for its storage use");
  }

  for (const page of ["privacy.html", "support.html"]) {
    const html = await read(`public/${page}`).catch(() => null);
    if (!html) { fail(`public/${page} exists`); continue; }
    check(!/CONTACT@EXAMPLE\.COM/.test(html), `${page} has a real contact address`, "still says CONTACT@EXAMPLE.COM");
    check(!/—/.test(html.replace(/<!--[\s\S]*?-->/g, "")), `${page} has no em dashes`);
  }
}

console.log("\nWHAT THE PLIST HAS TO SAY");
{
  const add = await read("ios-setup/Info.plist.additions").catch(() => "");
  check(/NSLocationWhenInUseUsageDescription/.test(add), "there is a location usage string");
  const reason = add.match(/NSLocationWhenInUseUsageDescription<\/key>\s*<string>([^<]*)</)?.[1] ?? "";
  check(reason.length > 40 && !/better experience/i.test(reason),
    "and it says what the app actually does with the position", `${reason.length} chars`);
  check(/ITSAppUsesNonExemptEncryption/.test(add), "encryption is declared, so uploads do not stall");
  check(/UIInterfaceOrientationPortrait/.test(add), "orientation is locked to portrait");
}

console.log("\nDATA HONESTY");
{
  const configs = await readdir(root + "scripts/resorts");
  for (const file of configs.filter((f) => f.endsWith(".json"))) {
    const c = JSON.parse(await read(`scripts/resorts/${file}`));
    const placeholder = /PLACEHOLDER/i.test(c.operationsProvenance || "");
    const built = existsSync(`${root}src/resorts/${c.id}.js`);
    if (placeholder) {
      warn(`${c.name}: lift hours are still a placeholder`,
        "not in OSM; must come from the resort before this goes public");
    } else {
      ok(`${c.name}: lift hours have a source`);
    }
    if (!built) warn(`${c.name}: no graph generated yet`, `npm run resort -- ${c.id}`);
  }

  const resort = await read("src/resort.js");
  if (/hand-typed from memory/.test(resort)) {
    warn("Monterosa still ships the hand-typed graph",
      "run names, lift times and last lifts are invented; replace before a public listing");
  } else {
    ok("no hand-typed graph ships");
  }
}

console.log("\nVERSION");
{
  const pkg = JSON.parse(await read("package.json"));
  check(/^\d+\.\d+\.\d+$/.test(pkg.version), "package.json has a release version", pkg.version);
  const cap = JSON.parse(await read("capacitor.config.json"));
  check(/^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$/i.test(cap.appId), "the bundle identifier is well formed", cap.appId);
}

console.log(
  `\n  ${blocking} blocking, ${warnings} to resolve before a public listing\n` +
    (blocking
      ? "  Not ready to submit.\n"
      : warnings
        ? "  Ready for TestFlight. The warnings above gate a public listing.\n"
        : "  Ready.\n")
);
process.exit(blocking ? 1 : 0);
