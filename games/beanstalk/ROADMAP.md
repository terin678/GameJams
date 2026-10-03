# Beanstalk roadmap

Where the game is going, in order. Update the status as things land.

| # | Step | Status |
|---|---|---|
| 1 | **Long game**: retune so a run is 2–5 hours for a real player (the pacing bot, which plays perfectly, takes about 2.4 h: 36 / 51 / 58 minutes across the phases; see Target playtime below). Time away at 15% speed, capped at 8 hours. | done, awaiting play-testing |
| 2 | **New Game+ flavour**: the world remembers earlier runs (new lines, a golden bean, a run count), and each run adds a twist. A second run takes the bot about 77% as long. | done |
| 3 | **Installable web app (PWA)**: manifest, icons, offline cache with a version stamp, phone layout with Tend in thumb reach, vibration, wake lock. Built; **still to be tested on a real phone** (install, offline launch, sound with the ringer off, time-away summary). | built, needs phone testing |
| 4 | **More systems**: The Climb is in (ten ledges, the Giant, finds), all three stages of the Guard (pests, the realm, Blight; see below) and the Exchange (bean futures). Each has its own data, rules and tests. What is left is play-testing and tuning by feel. | built, needs play-testing |
| 5 | **Capacitor and the Play Store**: wrap the same files, local notifications, store listing, privacy policy, closed test (12 testers, 14 days), release. Only once the PWA is well tested and solid. | planned |

## How systems are rolled out

The rule for adding anything: **introduce one idea, leave room to get good at
it, then raise the difficulty a little with the next idea, and repeat.** A new
system should arrive when the last one has become comfortable, not before, and
never two at once.

Where things unlock today (minutes are for the pacing bot; a person is slower):

| When | What arrives | The idea it teaches |
|---|---|---|
| start | Tend, the market, the price | plant, pick, sell |
| ~1 min | first projects, Marigold (Neighbours tab) | spend coins; give gifts and learn tastes |
| ~5 min | farmhands, the accountant | the farm can run itself |
| ~10 min | Seeds tab, the county fair | steer your own multipliers; a yearly goal |
| ~20 min | Guard tab: slugs, then mice, then rabbits | read a forecast, match the answer to it |
| ~15-30 min | more neighbours, greenhouse, adding machine | more of the same, deeper |
| ~36 min (phase 2) | Almanac pages, the Climb tab | a second currency; choices with risk |
| ~48 min | the Guard drills itself (10 wins) | a mastered job is automated, like the price |
| ~55 min | Exchange tab: crates, a price chart | timing: buy low, sell high, with the seasons |
| ~60 min (13 wins) | tough pests from up the stalk, training | invest in the animals, not just place them |
| ~63 min | Corner the market: coins end, beans are the money | the Paperclips beat: money stops mattering |
| ~45-85 min | drones, analyst, Dr. Quill, the Giant | scale; the Climb's stakes rise |
| ~87 min (phase 3) | seed probes, matter, the Visitor | exponential growth |
| ~100 min | the Blight: a share of the swarm on guard | a trade-off with a best answer that moves |

No gaps are left in the table. `data.test.js` checks that the tabs open in
order and well apart.

## The Guard: a combat system in three stages

Raised by the owner (2026-10-03): a Stardew-flavoured combat simulator in the
spirit of the one in Universal Paperclips, introduced early so it can grow
with the "beanstalk realm". All three stages are built:

- **Early (from about 20 minutes), built:** pests. Slugs, mice and rabbits
  raid in forecast waves; you post ducks, cats and dogs and watch a short
  automatic skirmish. One idea: match the animal to the pest. Within the
  stage the same rule applies: slugs alone, then mice, bigger waves, then
  rabbits, and at ten wins the animals post themselves.
- **Middle (phase 2, from 13 wins), built:** the realm up the stalk. Cloud
  moths and giant magpies come down it; they are tough, so matching is no
  longer enough and you train your animals with Almanac pages. Bats and
  geese arrive to deal with them. Not done: turning the Climb's risky
  options into fights you can prepare for.
- **Late (phase 3, from 10 billion beans), built:** Blight. Some probes go
  to seed and eat the rest, and you split the swarm between planting and
  guarding, as in Paperclips' drifter battles. It adapts twice, and each
  time the best split moves. Ignored, it stalls the swarm but never kills it.

One system that changes scale three times teaches itself once and keeps
paying off, which fits the rollout rule above.

## The shape of a run, against Universal Paperclips

Paperclips has three beats: a business (money, prices, marketing), then money
becoming irrelevant as the thing itself takes over, then space. Ours: phase 1
and the first half of phase 2 are the business; "Corner the market" ends money
and beans become what you spend (owner's choice, 2026-10-03, over ending money
at the start of phase 2 or at space); phase 3 is space, paid for in matter.

## Target playtime

Universal Paperclips, for reference (owner's notes, 2026-10-03): an optimised
run is 1.5 to 2 hours, a casual or first run 3 to 8, and the average
completion 6.5 to 9.

The pacing bot is our optimised run: it clicks three times a second without
stopping, never misses a purchase and knows every neighbour's favourite gift.
It takes about 2.4 hours, a little over Paperclips' optimised figure, so a
first run by a person should land in the same 4 to 8 hour range. That is the
target; the bounds in `balance.test.js` hold the bot between 2 and 2.8 hours.
What is not measured yet is a real person's run. When one is, compare it with
the bot's time and move the bounds if the ratio is not about 2 to 3.

## Step 5 checklist: Capacitor and the Play Store

Started: everything that could be added without touching how the website
works is in (ticked below). The rest waits for launch. Tick these off in
order; each group depends on the one before.

Decided (owner, 2026-10-03): testers play free on the website for now. At
launch the app is a paid app at about $1, with optional tips, and the swap
away from the free site starts then. Nothing carries over: app players
start a fresh farm.

**Before any of it**
- [ ] The phone web version is play-tested to the end at least once, on a real phone.
- [ ] Sound with the ringer off is confirmed on a phone (GitHub issue 2), then the issue is closed.
- [x] Price decided: paid, about $1, with optional tips. No ads.
- [x] Web saves decided: nothing carries over.
- [x] App id: `com.veracity.beanstalk`, set in `app/capacitor.config.json`. It can never change after release.
- [x] Copyright line: "© 2026 Veracity", in the Menu's About section and on the privacy page. Use the same name as the developer name on the store listing.

**A build step, for the app only**
- [x] `npm run build:app` (tools/build-app.mjs, using esbuild) writes `app/www`: one minified script with no source map, the page, the icons, the privacy page. The website keeps running unbundled.
- [x] Tests check the built copy: minified, no source map, no service worker, no visit counting, game data bundled in. Checked by hand that it runs in a browser.
- [x] Left out of the app copy: the portal link, the other games, the tests, the service worker, the web manifest.

**The Capacitor project**
- [x] `app/` folder with the Capacitor settings, the packages to install and a README with the commands.
- [x] Android Studio installed; the Android project is made (`app/android`, Capacitor 8) and builds; the app was installed and played on the emulator (2026-10-03).
- [ ] Run it on a real Android phone: sound, vibration, the back button, the layout round a notch. The owner has an iPhone, so this needs a tester: send them `app-debug.apk` to install by hand (they must allow installs from unknown sources), or use Play's internal test track once the developer account exists (a link, up to 100 testers, no review wait).
- [ ] iPhone: the installable web version already works there. A real App Store app needs a Mac with Xcode and Apple's developer programme (yearly fee); not planned yet.
- [x] No analytics in the app copy (the script that loads it is not bundled).
- [x] Saves: a farm survived an app update and a cold restart on the emulator (2026-10-03), so it stays in the app's own web storage. Recheck once on a real phone.
- [x] A shipping build (`npm run sync:ship` in `app/`) leaves out the bug and idea links, the "in testing" line, the console handle, the `#perf` meter and console output. The Android release build refuses anything else.
- [x] Android back button: closes the menu or the time-away card; with nothing open it puts the app away, still running.
- [ ] Keep-awake and vibration through Capacitor plugins (the web versions are patchy inside an app).
- [ ] Pause the music and the game clock when the app goes to the background; catch up on return (the time-away code already does this for the website).
- [ ] Local notifications, opt-in: "the fair is tomorrow", "your farm has done all it can without you" (after the 8-hour cap).
- [x] App icon and splash screen: `node tools/make-icons.mjs` writes the bean at every Android density (adaptive foreground included); the splash is the icon on the game's dark background.
- [x] Locked to portrait.
- [ ] Check the layout with a notch and with gesture navigation, on a real phone.

**Play Console**
- [ ] Play Console developer account at play.google.com/console (one-off fee, identity check; allow a few days). This is separate from an account on developer.android.com.
- [ ] Create the app; choose app signing by Google Play; make the upload key (steps in `app/README.md`; the build is already set up to use it) and keep it and its password somewhere safe and backed up.
- [ ] Store listing: draft text and form answers are in `app/store-listing.md`. The feature graphic and six phone screenshots are in `app/store/` (made by `tools/store-shots.mjs`); retake them at launch, once the testing links are out of the app.
- [x] Privacy policy page (`games/beanstalk/privacy.html`, linked from the Menu). Update it when tips are added: it says there are no purchases in the game.
- [ ] Link the privacy page from the store listing.
- [ ] Forms: data safety, content rating questionnaire, target audience, ads declaration.
- [ ] Build a release bundle (.aab) targeting the API level Play currently requires.

**Testing and release**
- [ ] Internal test track first, with your own phone.
- [ ] Closed test: 12 testers opted in for 14 days running (required for new personal accounts before production).
- [ ] Fix what they find; apply for production access; staged rollout.

**Money**
- [ ] Set the app up as paid (about $1) in the Play Console. A paid app can never be made free and then paid again, and needs a payments profile (tax and bank details).
- [ ] Tips inside the app go through Google Play's billing, as small one-off purchases ("a coffee", "a sack of beans"). Google takes its cut (15% for small developers at the time of writing). This needs the Play Billing plugin and a few lines of code.
- [ ] A Buy Me a Coffee link can go on the website and the store listing's website field. A button inside the Android app that takes payment outside Play has been against Play's payments policy; the rules have been changing (and differ by country), so check them at launch before adding one.
- [ ] After launch: decide when the free web version comes down (see Protecting the code).

## Performance on phones

Measured 2026-10-03 on a desktop: one game tick takes about 0.003 ms, drawing
the farm 0.15 ms, rebuilding the page text 0.4 ms. None of that is heavy; the
cost on a phone is doing it sixty times a second for hours, which is battery
and heat rather than speed. In place:

- The page text is rebuilt only after a tick (ten a second) or a press, not every frame.
- The farm is redrawn 30 times a second (`VIEW.fps`), and not at all while it is scrolled out of sight.
- A sleeping tab or app stops drawing altogether and catches up when it comes back.
- Add `#perf` to the web address to see frames a second and milliseconds of work per frame on any device.

Not measured: a real phone. The emulator's numbers are not meaningful. Ask a
tester to open the site with `#perf` and report the two numbers, early and
late in a run. If a phone struggles, the next things to try, in order: lower
`VIEW.fps` to 20, draw the sky once into a cached layer, and tint the ground
in one pass instead of three.

## Protecting the code

A Capacitor app does not hide the code. The `.aab`/`.apk` is a zip, and the
game's JavaScript sits inside it as files anyone can pull out and read. So,
the same as on the website, it is a concern, and the answers are these:

- **Minify and bundle** (the build step above). Names are shortened, comments
  and layout go, and the data files are folded in. This stops casual reading
  and copying; it does not stop someone determined.
- **Obfuscation** on top of that buys little, costs speed and makes crashes
  hard to read. Not planned.
- **No source maps** in anything shipped.
- **Copyright is the real protection.** The repository has no licence file,
  which means all rights are reserved already. The Menu's About section and
  the privacy page carry "© 2026 Veracity"; put the same on the store listing.
- **When the game leaves the free portal:** make the repository private (or
  move Beanstalk to its own private one) and take the page down. Everything
  published before then stays out there: the full readable source and its
  history have been public, and anyone may have a copy. Private repositories
  cannot serve GitHub Pages on the free plan, so the website version would
  need another host or would simply end.
- **Not worth doing:** moving the rules to a server. It would protect them
  properly, and it would also end offline play and add running costs.

## Done so far

- Core loop: tend, sell, projects, three phases, ending, New Game+.
- Neighbours (gifts, hearts, perks) and Seeds (breeding, county fair, ribbons).
- The Climb: ten ledges up the stalk, the Giant, finds that change the farm.
- The Guard, all three stages: pests, posts, animals, ranks; tough pests and training; the Blight.
- Corner the market: coins end midway through phase 2 and beans become the money.
- The Exchange: crates of beans, priced by the season and the weather.
- Installable phone version, farm-behind-the-page mode. (Save codes for moving a farm between devices were built and then cut: a lot of surface for little value.)
- A minute-long day with dawn, dusk and night; blended season and weather colours.
- Music, sound, tabbed layout, purchases that change the farm view.

## How pacing is checked

`tests/beanstalk/balance.test.js` plays the real data with a bot. See what it
bought and when:

```bash
BEANSTALK_TIMELINE=1 node --test tests/beanstalk/balance.test.js
```
