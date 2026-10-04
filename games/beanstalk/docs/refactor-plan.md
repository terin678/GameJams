# Refactor plan for the page code (proposed, not started)

Written from `unclickable-buttons.md`. Scope: `src/game/` (the page, the loop,
the phone glue) and its tests. The rules (`src/core`), the data (`src/data`)
and the farm canvas are not touched: the notes found nothing wrong there.

The goal in one line: **a button, once on screen, stays the same button until
it genuinely goes away**, and a test fails if that stops being true.

Each step below lands on its own, with its tests, and leaves the game
shippable. Nothing changes for the player except presses that always work.

## 1. Standing integration tests first (before moving any code)

Extend `tests/beanstalk/view.test.js` so the refactor has a net under it.

- **No lost presses.** For every panel, in the states that have countdowns
  (after a gift, during a raid forecast, with the exchange repricing): press
  down, run a few seconds of game, release; the button must be the same node
  and the click must reach the game. Today this passes only because of the
  interim "no rebuild under a finger" measure; after step 2 it must pass with
  that measure removed.
- **Play it through the page.** Drive the first ten minutes of a run by
  clicking real buttons (Tend, buy, gift, cross) instead of calling the rules
  directly, and check the farm gets where the bot gets.
- **Press everything.** In an early, a mid and a late farm, open every tab and
  press every enabled button once; nothing throws, and each press reaches a
  handler.
- **Stays in step.** After any sequence of ticks, the text on screen equals a
  fresh page drawn from the same state (catches a panel going stale).

## 2. Panels update in place

Replace "signature changed, rebuild everything" with two separate steps per
panel:

- **shape**: the list of things in the panel (which projects, which
  neighbours and gifts, which animals). Nodes are built or removed only when
  the shape changes.
- **values**: text, `disabled`, bar widths. Written into the existing nodes on
  every update, through the same "only if different" cache used for the
  status column.

A countdown then changes one text node and nothing else. Consequences:

- the interim press-hold measure, `GUARD_MS` (the 350 ms click blackout) and
  the six hand-written focus and scroll restores can all be deleted;
- the "forget every signature" side door goes: prices are values, redrawn
  like any other.

Order: Guard and Neighbours first (they rebuild once a second today), then
Exchange, Projects, Seeds, Climb.

## 3. One module per panel

Split `view.js` (about 650 lines, one closure) into `src/game/view/`:
`status.js`, `tabs.js`, `projects.js`, `neighbours.js`, `seeds.js`, `guard.js`,
`climb.js`, `exchange.js`, `journal.js`, over a small `dom.js` (the `el`
helper, the text cache, the shape/values helper from step 2). Each panel
exports one `create(root, data, handlers)` returning `update(state)`, owns its
own cache, and can be tested alone. `view.js` becomes the list of panels.

This is what makes the original collision impossible to write again: nothing
is shared by name between panels.

## 4. `main.js` does one job

Move the browser and phone glue (wake lock, install prompt, service worker,
back button, vibration, the audio unlock, the `#perf` meter) into
`src/game/platform.js`. `main.js` keeps the loop and the handlers. Replace the
`stale` flag with one function, `changed()`, that the loop and every handler
call, so "the page needs redrawing" has a single entry point.

## Not proposed

- **Reworking how systems plug into `tick`.** The notes found no mistake that
  came from it. Leave it until one does.
- **A UI framework.** In-place updates for six small panels are a few dozen
  lines of helper; a framework would be the first runtime dependency and a
  build step for the website.
- **Testing on iOS in automation.** Not possible with the tools here. The
  standing test asserts the property Safari needs instead; a person with an
  iPhone confirms it.

## Size and order

Steps 1 and 2 are the ones that fix things; 3 and 4 are tidying that makes
the fix stick. A sensible stopping point exists after each.
