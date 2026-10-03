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

Not started. Tick these off in order; each group depends on the one before.

**Before any of it**
- [ ] The phone web version is play-tested to the end at least once, on a real phone.
- [ ] Sound with the ringer off is confirmed on a phone (GitHub issue 2), then the issue is closed.
- [ ] Decide the price: free, paid, or free with a tip. It changes the store forms below. No ads or purchases are planned.
- [ ] Decide what happens to web saves. A farm on the website cannot be read by the app (different storage), and the save codes that could have moved one were cut. Either accept that app players start fresh, or bring back a one-way "send my farm to the app" import.

**A build step, for the app only**
- [ ] Add a bundler script (esbuild is enough) that takes `games/beanstalk` plus the `shared` files it imports and writes one minified file, with no source maps, into a `dist` folder. The website keeps running unbundled.
- [ ] Run the test suite against the source as now, and add one test that the bundle loads and a game can be ticked.
- [ ] Leave out of the bundle: the portal, the other games, the tests, the service worker (the app is already offline).

**The Capacitor project**
- [ ] `npm init @capacitor/app` in a new `app/` folder; app id (for example `com.<yourname>.beanstalk`) and name. The id can never be changed after release.
- [ ] Point `webDir` at the bundle's `dist`; add the Android platform; open in Android Studio and run on a phone.
- [ ] Replace the analytics call (GoatCounter, in `shared/site.js`) with nothing, or declare it in the privacy policy and data form.
- [ ] Saves: move from `localStorage` to Capacitor Preferences, so Android clearing the web cache cannot lose a farm.
- [ ] Android back button: close an open overlay, otherwise ask before leaving.
- [ ] Keep-awake and vibration through Capacitor plugins (the web versions are patchy inside an app).
- [ ] Pause the music and the game clock when the app goes to the background; catch up on return (the time-away code already does this for the website).
- [ ] Local notifications, opt-in: "the fair is tomorrow", "your farm has done all it can without you" (after the 8-hour cap).
- [ ] App icon and splash screen from `tools/make-icons.mjs` (adaptive icon: foreground and background layers).
- [ ] Lock to portrait; check the layout with a notch and with gesture navigation.

**Play Console**
- [ ] Developer account (one-off fee, identity check; allow a few days).
- [ ] Create the app; choose app signing by Google Play; keep the upload key and its password somewhere safe and backed up.
- [ ] Store listing: short and full description, 512 px icon, 1024x500 feature graphic, at least four phone screenshots.
- [ ] Privacy policy on a public web page, linked from the listing.
- [ ] Forms: data safety, content rating questionnaire, target audience, ads declaration.
- [ ] Build a release bundle (.aab) targeting the API level Play currently requires.

**Testing and release**
- [ ] Internal test track first, with your own phone.
- [ ] Closed test: 12 testers opted in for 14 days running (required for new personal accounts before production).
- [ ] Fix what they find; apply for production access; staged rollout.

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
  which means all rights are reserved already. Add a short copyright line to
  the app's about text and the store listing.
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
