# Game Jams

A portal of small browser games, served by GitHub Pages straight from `main`.
No build step and no CI: plain ES modules, vendored Phaser 3, tests run locally.

| Game | Where |
|---|---|
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

| | Keyboard | Touch |
|---|---|---|
| Fly | Arrows / WASD | drag anywhere |
| Splat (hits your altitude) | Z / J / Space | automatic while dragging |
| Bomb (hits below you) | X / K, hold to charge | hold the poop button |
| Pause / mute | P or Esc / M | — |

Energy drains over time and on hits; gut is bomb ammo and refills slowly. Food
refills both; chili gives a spread shot. Bomb a car dead-centre for a bullseye.
