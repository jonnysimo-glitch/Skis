# Getting Skis onto the App Store

**You do not need a Mac.** You do need an iPhone or iPad, an Apple Developer
Program membership, and a hosted macOS runner for the one step that genuinely
requires macOS.

This used to say "on the Mac" at the top of every section. That was true when
Capacitor wired plugins through CocoaPods, which needs macOS to run `pod
install`. Capacitor 8 uses Swift Package Manager instead, so generating the
Xcode project is a template copy and runs anywhere. `npm run ios:prepare` does
all of it, and it is verified on Linux.

## What genuinely needs macOS

Exactly one thing: `xcodebuild archive`, which compiles Swift and signs the
binary. Apple ships no Linux or Windows toolchain for it and will not. Rent it
by the minute rather than buying it.

## Order of operations

**Start the enrolment first**, because it is the only step with a queue in it.

### 1. Enrol in the Apple Developer Program — from your iPhone

$99 a year. Install Apple's **Developer** app from the App Store and enrol
inside it. Doing it on the phone is usually faster than the web form, because
Apple verifies you against the Apple ID already on the device rather than
asking for documents.

- **Individual** is same-day or thereabouts, and the App Store listing shows
  your own name as the seller.
- **Organization** shows a company name and needs a D-U-N-S number, which can
  take one to two weeks on its own. If the company name matters, start here
  and start now.

Nothing else on this list is blocked while it runs.

### 2. Prepare the project

Anywhere — this machine, a laptop, a CI runner:

```bash
npm install
npm run ios:prepare
```

That builds the web app, generates `ios/`, merges the keys from
`Info.plist.additions`, copies `PrivacyInfo.xcprivacy` in AND adds it to the
App target, generates every icon and launch image from `assets/`, and sets the
version from `package.json`. It is idempotent; run it as often as you like.

`ios/` stays gitignored. It is derived, and one command rebuilds it, so there
is nothing to merge and nothing to go stale.

Set the build number from CI, because App Store Connect refuses a repeat:

```bash
IOS_BUILD_NUMBER=$GITHUB_RUN_NUMBER npm run ios:prepare
```

### 3. Archive and upload, on a rented Mac

Pick one. All three do the same job; the difference is how much of the signing
they hide.

| | what it is | notes |
|---|---|---|
| **Codemagic** | CI built for Capacitor and Flutter | Free tier, ~500 min/month. Handles signing through the App Store Connect API, which is the fiddly part. Easiest of the three. |
| **GitHub Actions** | `runs-on: macos-latest` | Already where this repo lives. Free for public repos; macOS minutes bill at 10x for private ones. You manage certificates yourself. |
| **Xcode Cloud** | Apple's own | Included with the developer membership up to a limit, but expects to be configured from Xcode at least once. |

Whichever you pick, the runner does: `npm ci && npm run ios:prepare`, then
signs, then `xcodebuild -project ios/App/App.xcodeproj -scheme App
-configuration Release archive`, then uploads to App Store Connect.

You will need three things from Apple to let CI sign on your behalf, all
created at appstoreconnect.apple.com under **Users and Access → Integrations →
App Store Connect API**: an **Issuer ID**, a **Key ID**, and a **.p8 private
key**. The .p8 downloads exactly once. Store all three as CI secrets, never in
the repo.

### 4. Test on your own phone

Upload lands in **TestFlight**. Install the TestFlight app on your iPhone and
the build appears there within a few minutes of processing. This is a real
signed build on real hardware, which is the only way to find out whether the
gestures work in gloves and what the battery does on a chairlift.

**Ski it on a mountain before the listing.** The GPS auto-advance is verified
against simulated coordinates in `npm run features`, not against a real phone
on a real chairlift with a real cold battery. That is the one thing no test
here covers.

### 5. The listing, on your iPad

App Store Connect's web app works in Safari on an iPad; request the desktop
site if the layout fights you. You need:

- **Privacy policy URL**: `https://<your-site>/privacy.html`
- **Support URL**: `https://<your-site>/support.html`
- Both ship in `public/`. **Set a real contact address in them first** — they
  both say `CONTACT@EXAMPLE.COM`, and `npm run preflight` blocks on it.
- **App Privacy**: answer **Data Not Collected**. That is genuinely true, which
  is rare, and worth not giving away by accident. The only outbound requests
  are map tiles, which carry no identifier and no user data.
- **Age rating**: 4+.
- **Screenshots**: 6.7" required. Take them on your own phone from TestFlight,
  or from `npm run audit`, which shoots every screen at phone size.

### 6. Before you submit

```bash
npm run preflight
```

It refuses on anything that would come back as a rejection, and warns about
anything that is true but embarrassing — like shipping invented run names.

## Two things that are not ready yet

- **The resort data is invented.** Run names, lift times and queue estimates
  in `src/resort.js` are placeholders. Preflight warns about this. Do not put
  it in front of strangers who might ski it.
- **Location sharing does not share anything.** There is no server. The screen
  says so, but App Review may still ask; the honest answer is that it is a
  local list and no data leaves the device, which is also why App Privacy is
  "Data Not Collected".

## Files here

| file | what it is |
|---|---|
| `Info.plist.additions` | Keys Capacitor cannot know about. Merged by `ios:prepare`. The location string is not optional: iOS terminates the app on the first location request without it, and App Review reads it. |
| `PrivacyInfo.xcprivacy` | Apple's required privacy manifest. Copied in and added to the target by `ios:prepare`. |
