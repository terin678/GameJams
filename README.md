# Game Jams

A portal of small browser games, served by GitHub Pages straight from `main`.
No build step and no CI: plain ES modules, vendored Phaser 3, tests run locally.

| Game | Where |
|---|---|
| **Superposition**: Schrödinger's cat in a maze, with quantum powers | [`games/superposition/`](games/superposition/) |
| **Fowl Play: The Battle of Midair** — 1943 with a pigeon | [`games/midair/`](games/midair/) |
| **Teron2** — WoW Teron Gorefiend trainer remake | [external](https://terin678.github.io/Teron2/) |

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
2. Add an entry to `games.json`:
   ```json
   { "slug": "x", "title": "X", "blurb": "One line.", "date": "2026-10-02", "tags": ["jam"], "path": "games/x/" }
   ```
   Use `"url"` instead of `"path"` to link a game hosted elsewhere. Optional `"thumb"` image path.
3. Put tests in `tests/<slug>/`. `npm test` picks them up.

Use relative paths everywhere so the site works under `/GameJams/`.

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
