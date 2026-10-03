# Game Jams

A portal of small browser games, served by GitHub Pages straight from `main`.
No build step and no CI: plain ES modules, vendored Phaser 3, tests run locally.

| Game | Where |
|---|---|
| **Superposition**: Schrödinger's cat in a maze, with quantum powers | [`games/superposition/`](games/superposition/) |
| **Fowl Play: The Battle of Midair** — 1943 with a pigeon | [`games/midair/`](games/midair/) |
## Run it

```bash
npm run serve        # http://localhost:8620
npm test             # node --test, Node 20+, zero dependencies
npm run setup        # once per clone: enables the pre-push test hook
```

## How it's organised

```
index.html, portal/     landing page; renders games.json
games.json              the manifest (validated by tests/shared/manifest.test.js)
lib/phaser.min.js       Phaser 3.90, shared by every game
shared/                 storage + high scores, pixel-art textures, WebAudio synth, rng, ui
games/<slug>/
  index.html            loads ../../lib/phaser.min.js and src/game/main.js
  src/data/             content and tuning: plain data, no logic
  src/core/             rules: pure JS, no Phaser, unit tested
  src/game/             Phaser scenes that wire data + core to the screen
tests/<slug>/, tests/shared/
```

Two rules keep it working:

- **Test-driven.** Logic goes in `core/` and gets tests first. `src/game/` is glue only.
- **Data-driven.** Enemies, waves, weapons, pickups, sounds, sprites and every tuning
  number live in `src/data/`. `tests/<slug>/data.test.js` checks every cross-reference,
  so a typo in a wave fails `npm test` instead of crashing mid-game.

Art and sound are generated in code: sprites are strings of palette characters
(`shared/pixelart.js`), sounds are synth descriptions (`shared/sfx.js`). No asset files.

## Add a game

1. Make `games/<slug>/index.html` (copy `games/midair/index.html` for a Phaser game).
   A game doesn't have to use Phaser: Beanstalk is plain HTML and a small canvas;
   copy `games/beanstalk/index.html` for that kind.
2. Add an entry to `games.json`:
   ```json
   { "slug": "x", "title": "X", "blurb": "One line.", "date": "2026-10-02", "tags": ["jam"], "path": "games/x/" }
   ```
   Use `"url"` instead of `"path"` to link a game hosted elsewhere. Optional `"thumb"` image path.
3. Put tests in `tests/<slug>/`. `npm test` picks them up.

Use relative paths everywhere so the site works under `/GameJams/`.

## Feedback and visitor counts

Settings live in `shared/site.js`; every page calls `installPage()`.

- **Feedback**: any `<a data-feedback="bug|idea">` becomes a link to the matching
  GitHub issue form in `.github/ISSUE_TEMPLATE/` (game pages pre-fill which game).
  `data-feedback` with no value opens the template chooser. Posting needs a GitHub account.
- **Visitor counts**: [GoatCounter](https://www.goatcounter.com), free for hobby
  sites, no cookies so no consent banner. Sign up, pick a site code, put it in
  `SITE.goatcounter`. Empty means nothing is loaded. Counts show up on your
  GoatCounter dashboard, per page (portal and each game).

## Deploy

GitHub Pages, **Settings → Pages → Deploy from a branch → `main` / root**.
There's no Actions workflow on purpose (minutes are limited). Instead,
`.githooks/pre-push` runs `npm test` and blocks the push if anything is red.

## Fowl Play controls

| | Keyboard + mouse | Touch |
|---|---|---|
| Fly | Arrows / WASD (the cursor never moves you) | drag anywhere |
| Splat (hits your altitude) | Z / J / Space, or left click | automatic while dragging |
| Bomb (hits below you) | X / K / Shift, or right click; hold to charge | hold the poop button |
| Pause / mute | P or Esc / M | — |

Energy drains over time and on hits; gut is bomb ammo and refills slowly. Food
refills both. Bomb a car dead-centre for a bullseye.

Upgrades (kept off the title screen on purpose; see `src/data/forms.js`, `pickups.js`):
eggs turn you into a duck with its own weapon (mallard spread, merganser rapid,
eider piercing), the same egg again levels it to 3, and shooting a falling egg
cycles which duck is inside. Feathers add wingmen who fly in a V, fire with you
and each soak a hit. Red-tinted squadrons drop a prize if you down every plane.

Every now and then a monster truck zooms sideways across the low layer
(`src/data/cameos.js`); bomb it before it escapes for a bonus and a feather.

**Challenges** (`src/data/challenges.js`, press C on the title screen) are lifetime
goals with bronze, silver and gold tiers, like "Poop on 20 / 100 / 300 blue cars".
Progress saves to localStorage and a toast pops up in play when you reach a tier.
Add one by adding a row: pick an `event` Play.js reports, optionally `match` an
enemy, give three rising `goals`; `data.test.js` checks it.

## Superposition

Eat every quantum in the lab maze without being seen by the Observers.
Arrows / WASD (or swipe) to move, P pause, M mute.

| Power | Where | Effect |
|---|---|---|
| Measurement | the four pellets | you observe them: Observers flee and can be eaten |
| Tunnelling | item, every 45 quanta | walk through interior walls |
| Superposition | item, alternating | a mirror twin splits off and moves mirrored; if one is caught, you collapse into the other; when it runs out, a coin flip decides which was real |

The maze (`src/data/maze.js`) is authored as a left half and mirrored, and
`tests/superposition/data.test.js` checks it stays symmetric, so the twin's
mirrored moves are always legal. Observer behaviours, timings and speeds are
all in `src/data/`.

## Beanstalk

An idle farming game. Plant one bean, sell beans, buy projects, and watch the
stalk grow from the garden to the edge of the universe. About half an hour,
in three phases: The Plot, Agribusiness, Beyond. Finishing gives a Golden Bean
(double yield) for New Game+.

Click **Tend** (or press Space / Enter) to plant and pick. Everything else is
buttons. It saves itself every few seconds.

- **Time away:** the farm keeps working while the tab is closed, at a quarter
  speed, for up to 8 hours of absence. You get a summary when you come back.
- **Add a project:** add a line to `src/data/projects.js` (cost, what it
  requires, what it does). `data.test.js` checks it, and `balance.test.js`
  plays the whole game with a bot to make sure it can still be finished in
  25 to 45 minutes. See the bot's timeline with:

  ```bash
  BEANSTALK_TIMELINE=1 node --test tests/beanstalk/balance.test.js
  ```
- Seasons, weather, prices, milestones and the height of everything in the sky
  are in `src/data/` too.
- **Neighbours** (`src/data/neighbours.js`): people who turn up as the farm
  grows. Give each a gift every 30 seconds; you find out what they love by
  trying. Hearts unlock perks (more demand, faster growth, extra helpers).
  Add a neighbour or a gift by adding an entry; `data.test.js` checks it.
- **Seeds** (`src/data/seeds.js`): from 400 beans you can breed your own seed
  line. A cross costs coins, grows out for 15 seconds, then offers three
  seedlings, each better in one trait (size, vigour, flavour) and maybe worse
  in another. Every autumn the county fair judges one trait; clearing the bar
  wins a ribbon, which lifts demand and makes crosses luckier.
- New systems appear as tabs beside Projects, and sections such as the Almanac
  stay hidden until the game reaches them.
- **Music:** the tune is data as well (`src/data/music.js`): chords, bass, a
  lead line and a drum pattern, eight bars that loop. `shared/music.js` plays
  it with WebAudio (no audio files) and any game can use it. It has its own
  on/off button and pauses while the tab is hidden.
- From the browser console, `game.state` is the live game and `game.skip(60)`
  fast-forwards a minute.
