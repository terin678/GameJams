# Beanstalk roadmap

Where the game is going, in order. Update the status as things land.

| # | Step | Status |
|---|---|---|
| 1 | **Long game**: retune so a run is 2–5 hours for a real player (the pacing bot, which plays perfectly, takes about 2.3 h: 36 / 55 / 44 minutes across the phases; see Target playtime below). Time away at 15% speed, capped at 8 hours. | done, awaiting play-testing |
| 2 | **New Game+ flavour**: the world remembers earlier runs (new lines, a golden bean, a run count), and each run adds a twist. A second run takes the bot about 77% as long. | done |
| 3 | **Installable web app (PWA)**: manifest, icons, offline cache with a version stamp, phone layout with Tend in thumb reach, vibration, wake lock. Built; **still to be tested on a real phone** (install, offline launch, sound with the ringer off, time-away summary). | built, needs phone testing |
| 4 | **More systems**: The Climb is in (ten ledges, the Giant, finds), two stages of the Guard (pests, then the realm; see below) and the Exchange (bean futures). Still to come: the Guard's last stage, Blight. Each is a tab with its own data, rules and tests, followed by a retune. | in progress |
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
- **Middle (phase 2, from 13 wins), built:** the realm up the stalk. Cloud
  moths and giant magpies come down it; they are tough, so matching is no
  longer enough and you train your animals with Almanac pages. Bats and
  geese arrive to deal with them. Not done: turning the Climb's risky
  options into fights you can prepare for.
- **Late (phase 3):** this becomes Blight, the planned phase 3 system: some
  probes go to seed and turn on you, and you split the swarm between
  planting and guarding, as in Paperclips' drifter battles.

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
It takes about 2.3 hours, a little over Paperclips' optimised figure, so a
first run by a person should land in the same 4 to 8 hour range. That is the
target; the bounds in `balance.test.js` hold the bot between 2 and 2.8 hours.
What is not measured yet is a real person's run. When one is, compare it with
the bot's time and move the bounds if the ratio is not about 2 to 3.

## Done so far

- Core loop: tend, sell, projects, three phases, ending, New Game+.
- Neighbours (gifts, hearts, perks) and Seeds (breeding, county fair, ribbons).
- The Climb: ten ledges up the stalk, the Giant, finds that change the farm.
- The Guard, stages one and two: pests, posts, animals, ranks; tough pests and training.
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
