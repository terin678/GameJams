# Beanstalk roadmap

Where the game is going, in order. Update the status as things land.

| # | Step | Status |
|---|---|---|
| 1 | **Long game**: retune so a run is 2–5 hours for a real player (the pacing bot, which plays perfectly, takes about 2.2 h: 36 / 49 / 44 minutes across the phases). Time away at 15% speed, capped at 8 hours. | done, awaiting play-testing |
| 2 | **New Game+ flavour**: the world remembers earlier runs (new lines, a golden bean, a run count), and each run adds a twist. A second run takes the bot about 77% as long. | done |
| 3 | **Installable web app (PWA)**: manifest, icons, offline cache with a version stamp, phone layout with Tend in thumb reach, vibration, wake lock, save export/import. Built; **still to be tested on a real phone** (install, offline launch, sound with the ringer off, time-away summary). | built, needs phone testing |
| 4 | **More systems**: The Climb is in (ten ledges, the Giant, finds), the first stage of the Guard (pests; see below) and the Exchange (bean futures). Still to come: the Guard's later stages. Each is a tab with its own data, rules and tests, followed by a retune. | in progress |
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
| ~45-85 min | drones, analyst, Dr. Quill, the Giant | scale; the Climb's stakes rise |
| ~85 min (phase 3) | seed probes, matter, the Visitor | exponential growth |

Gaps to fill, in order of need: phase 3 has no new system of its own (only
probes); the Guard's third stage (Blight) is meant for it. `data.test.js` checks
that the tabs open in order and well apart.

## The Guard: a combat system in three stages

Raised by the owner (2026-10-03): a Stardew-flavoured combat simulator in the
spirit of the one in Universal Paperclips, introduced early so it can grow
with the "beanstalk realm". Agreed shape; stage one is built:

- **Early (from about 20 minutes), built:** pests. Slugs, mice and rabbits
  raid in forecast waves; you post ducks, cats and dogs and watch a short
  automatic skirmish. One idea: match the animal to the pest. Within the
  stage the same rule applies: slugs alone, then mice, bigger waves, then
  rabbits, and at ten wins the animals post themselves.
- **Middle (phase 2):** the realm up the stalk. Cloud creatures and the
  Giant's guards; the Climb's risky options could become fights you can
  prepare for instead of dice rolls.
- **Late (phase 3):** this becomes Blight, the planned phase 3 system: some
  probes go to seed and turn on you, and you split the swarm between
  planting and guarding, as in Paperclips' drifter battles.

One system that changes scale three times teaches itself once and keeps
paying off, which fits the rollout rule above.

## Done so far

- Core loop: tend, sell, projects, three phases, ending, New Game+.
- Neighbours (gifts, hearts, perks) and Seeds (breeding, county fair, ribbons).
- The Climb: ten ledges up the stalk, the Giant, finds that change the farm.
- The Guard, stage one: pests, posts, animals, ranks.
- The Exchange: crates of beans, priced by the season and the weather.
- Installable phone version, farm-behind-the-page mode, save codes.
- A minute-long day with dawn, dusk and night; blended season and weather colours.
- Music, sound, tabbed layout, purchases that change the farm view.

## How pacing is checked

`tests/beanstalk/balance.test.js` plays the real data with a bot. See what it
bought and when:

```bash
BEANSTALK_TIMELINE=1 node --test tests/beanstalk/balance.test.js
```
