/**
 * Everything that has to happen to `ios/` before it can be archived.
 *
 * This used to be a checklist in ios-setup/README.md that began "on the Mac".
 * It does not need a Mac any more: Capacitor 8 wires plugins through Swift
 * Package Manager rather than CocoaPods, so `cap add ios` is a template copy
 * and runs anywhere. What still needs macOS is the archive itself, and that
 * is a hosted runner's job.
 *
 * The point of doing it in a script rather than by hand is that it is the same
 * on a laptop and on a build machine nobody can log into. Every step is
 * idempotent: run it as often as you like.
 *
 *   node scripts/ios-prepare.mjs
 */
import { execSync } from "node:child_process";
import {
  existsSync, readFileSync, writeFileSync, copyFileSync, mkdirSync, readdirSync,
} from "node:fs";
import { join } from "node:path";

const APP = "ios/App/App";
const say = (s) => console.log(`  ${s}`);
const run = (cmd) => execSync(cmd, { stdio: ["ignore", "pipe", "pipe"] }).toString();

console.log("\nPREPARING ios/\n");

// ---- 1. the web build the shell wraps ------------------------------------
if (!existsSync("dist/index.html")) {
  say("building the web app first");
  run("npm run build");
}

// ---- 2. the Xcode project ------------------------------------------------
if (!existsSync("ios/App/App.xcodeproj/project.pbxproj")) {
  say("generating the Xcode project");
  run("npx cap add ios");
} else {
  say("Xcode project already there");
}
run("npx cap sync ios");
say("web assets and plugins synced");

// ---- 3. the keys Capacitor cannot know about -----------------------------
//
// Merged rather than appended: running this twice must not leave two copies of
// NSLocationWhenInUseUsageDescription in the plist, which is a malformed file
// that Xcode will not open.
const plistPath = join(APP, "Info.plist");
let plist = readFileSync(plistPath, "utf8");
const additions = readFileSync("ios-setup/Info.plist.additions", "utf8");

// Pull <key>/value pairs out of the additions file, ignoring its comments.
const pairs = [];
const withoutComments = additions.replace(/<!--[\s\S]*?-->/g, "");
const re = /<key>([^<]+)<\/key>\s*((?:<array>[\s\S]*?<\/array>)|(?:<[a-z]+\s*\/>)|(?:<[a-z]+>[\s\S]*?<\/[a-z]+>))/g;
let m;
while ((m = re.exec(withoutComments)) !== null) pairs.push([m[1], m[2].trim()]);
if (!pairs.length) throw new Error("no keys found in ios-setup/Info.plist.additions");

let added = 0;
let replaced = 0;
for (const [key, value] of pairs) {
  const present = new RegExp(
    `<key>${key}</key>\\s*((?:<array>[\\s\\S]*?</array>)|(?:<[a-z]+\\s*/>)|(?:<[a-z]+>[\\s\\S]*?</[a-z]+>))`
  );
  if (present.test(plist)) {
    plist = plist.replace(present, `<key>${key}</key>\n\t${value}`);
    replaced++;
  } else {
    plist = plist.replace(/\n<\/dict>\n<\/plist>/, `\n\t<key>${key}</key>\n\t${value}\n</dict>\n</plist>`);
    added++;
  }
}
writeFileSync(plistPath, plist);
say(`Info.plist: ${added} keys added, ${replaced} updated`);

// ---- 4. the privacy manifest ---------------------------------------------
//
// Apple requires this for App Store submission. Copying it in is the easy
// half; it also has to be a member of the App target, which is step 5.
copyFileSync("ios-setup/PrivacyInfo.xcprivacy", join(APP, "PrivacyInfo.xcprivacy"));
say("PrivacyInfo.xcprivacy copied");

// ---- 5. and referenced by the App target ---------------------------------
//
// A resource Xcode does not know about is a resource that does not ship, and a
// missing privacy manifest is a rejection rather than a warning. The manual
// answer is to tick a box in Xcode, which is no answer at all without a Mac.
//
// Four entries, mirroring how Assets.xcassets is wired: a file reference, a
// build file, membership of the App group, and a line in the Resources phase.
// The identifiers are fixed rather than random so running this twice changes
// nothing, and so a diff of the project file stays readable.
const PBX = "ios/App/App.xcodeproj/project.pbxproj";
const REF = "5C1A7E0100000000000000A1";
const BUILD = "5C1A7E0100000000000000A2";
let pbx = readFileSync(PBX, "utf8");
if (!pbx.includes("PrivacyInfo.xcprivacy")) {
  const before = pbx.length;
  pbx = pbx.replace(
    "/* End PBXBuildFile section */",
    `\t\t${BUILD} /* PrivacyInfo.xcprivacy in Resources */ = {isa = PBXBuildFile; fileRef = ${REF} /* PrivacyInfo.xcprivacy */; };\n/* End PBXBuildFile section */`
  );
  pbx = pbx.replace(
    "/* End PBXFileReference section */",
    `\t\t${REF} /* PrivacyInfo.xcprivacy */ = {isa = PBXFileReference; lastKnownFileType = text.xml; path = PrivacyInfo.xcprivacy; sourceTree = "<group>"; };\n/* End PBXFileReference section */`
  );
  pbx = pbx.replace(
    /(504EC3131FED79650016851F \/\* Info\.plist \*\/,\n)/,
    `$1\t\t\t\t${REF} /* PrivacyInfo.xcprivacy */,\n`
  );
  pbx = pbx.replace(
    /(504EC30F1FED79650016851F \/\* Assets\.xcassets in Resources \*\/,\n)/,
    `$1\t\t\t\t${BUILD} /* PrivacyInfo.xcprivacy in Resources */,\n`
  );
  // Count the four structures, not the four mentions: Xcode's comment syntax
  // names the file twice on the build-file and file-reference lines, so a
  // plain string count reads six and says nothing about whether the edit
  // landed in the right four places.
  const wiring = {
    buildFile: new RegExp(`${BUILD} /\\* PrivacyInfo\\.xcprivacy in Resources \\*/ = \\{isa = PBXBuildFile`),
    fileRef: new RegExp(`${REF} /\\* PrivacyInfo\\.xcprivacy \\*/ = \\{isa = PBXFileReference`),
    inGroup: new RegExp(`\\n\\t\\t\\t\\t${REF} /\\* PrivacyInfo\\.xcprivacy \\*/,`),
    inResources: new RegExp(`\\n\\t\\t\\t\\t${BUILD} /\\* PrivacyInfo\\.xcprivacy in Resources \\*/,`),
  };
  const missing = Object.entries(wiring).filter(([, re]) => !re.test(pbx)).map(([k]) => k);
  if (missing.length) {
    throw new Error(
      `could not wire PrivacyInfo.xcprivacy into the Xcode project: ${missing.join(", ")} ` +
      "not written. The project template has changed shape; fix " +
      "scripts/ios-prepare.mjs rather than shipping without a privacy manifest, " +
      "which is a rejection."
    );
  }
  writeFileSync(PBX, pbx);
  say(`added to the App target (+${pbx.length - before} bytes)`);
} else {
  say("already in the App target");
}

// ---- 6. icons ------------------------------------------------------------
if (!existsSync("assets/icon.png")) {
  say("generating icon masters");
  run("npm run icons");
}
try {
  run("npx @capacitor/assets generate --ios");
  say("icons and launch images generated");
} catch {
  // Not fatal: the placeholder set Capacitor ships with will build, it just
  // is not ours. Better to say so than to fail the whole run over artwork.
  say("could not generate icons (npx @capacitor/assets unavailable) — the");
  say("  Capacitor placeholders will build, but do not ship them");
}

// ---- 7. version ----------------------------------------------------------
//
// MARKETING_VERSION follows package.json so there is one place to change it.
// CURRENT_PROJECT_VERSION has to rise on every single upload, forever, and
// App Store Connect rejects a repeat, so CI should set it from the run number.
const version = JSON.parse(readFileSync("package.json", "utf8")).version;
const build = process.env.IOS_BUILD_NUMBER ?? "1";
let proj = readFileSync(PBX, "utf8");
proj = proj
  .replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${version};`)
  .replace(/CURRENT_PROJECT_VERSION = [^;]+;/g, `CURRENT_PROJECT_VERSION = ${build};`);
writeFileSync(PBX, proj);
say(`version ${version}, build ${build}`);

console.log(`
Ready to archive. On a Mac:
  open ios/App/App.xcodeproj

On a hosted macOS runner, the remaining steps are signing and
  xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Release archive
`);
