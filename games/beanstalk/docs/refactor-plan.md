# The page-code refactor (done, October 2026)

Planned from `unclickable-buttons.md`, approved by the owner once the fix was
confirmed on the iPhone, and carried out in one pass. This file records what
was planned, what was built, and where the two differ.

Scope: `src/game/` (the page, the loop, the device glue) and its tests. The
rules (`src/core`), the data (`src/data`) and the farm canvas were not touched.

The goal in one line: **a button, once on screen, stays the same button until
it genuinely goes away**, and a test fails if that stops being true.

## What the page code looks like now

```
src/game/
  main.js          the game while it runs: state, clock, saving, when to redraw
  actions.js       what the buttons do (rules + a sound for how it went); no page, testable
  platform.js      the device: sound switches, vibration, wake lock, install, back button, #perf
  farmCanvas.js    the pixel farm (unchanged)
  view.js          wires the page together: tabs, journal, pop-up cards
  view/
    dom.js         el(), the text cache, and morph(): change the page in place
    text.js        how numbers and prices are worded (coins or beans)
    status.js      the status column
    projects.js  neighbours.js  seeds.js  guard.js  climb.js  exchange.js
```

A panel is `{ id, label, unlocked(state), wants?(state), render(state), press(dataset, handlers) }`.
`render` builds what the tab should look like now; it remembers nothing.
`view.js` morphs the page to match on every update.

To add a tab: write one file in `view/` with that shape and add it to the list
in `view.js`.

## What was planned and what happened

1. **Standing integration tests first.** Done, in `tests/beanstalk/`:
   - `dom.test.js`: `morph` keeps nodes that are still wanted, slots new ones
     in, removes old ones, never reuses a canvas for another.
   - `view.test.js`: the view alone, with recording handlers: nothing is
     replaced when nothing changed; a countdown changes words and nothing
     else; every kind of button reaches its handler; a disabled one does not.
   - `page.test.js`: the real game behind the real page. A press held across
     six seconds of game time is never lost, in seven situations that used to
     rebuild; choices that appear (seedlings, a ledge) can be pressed; every
     enabled button on every tab is pressed in an early, a mid and a late
     farm; ten minutes are played through the page's own buttons; and after
     any amount of play the page reads exactly as a fresh page would.
   - Checked that the net holds: with `morph` changed back to "replace
     everything", eight of these tests fail.

2. **Panels update in place.** Done, but by a different route from the one
   planned. The plan was to split each panel by hand into "shape" (built
   rarely) and "values" (written often). What was built instead is `morph`:
   a panel still just describes itself from scratch, and one 50-line function
   makes the page match while keeping every node that is still wanted. Same
   outcome for the player, far less code per panel, and a new panel gets the
   behaviour for free. Elements are matched by tag and `data-*` attributes.

   Consequences, as planned:
   - the stopgap "no rebuild under a finger" is gone;
   - the hand-written signatures and the "forget every signature" side door
     (where the bug was) are gone: there is no "has this changed?" bookkeeping
     left to get wrong;
   - the six copies of focus and scroll restoring are gone (the nodes stay, so
     focus and scroll stay).

   One thing kept that the plan said could go: **the 350 ms pause on the
   project list after it changes shape.** It protects against a different
   problem (you buy a one-off project, the next one slides up under the
   pointer, a quick second click buys it), which in-place updates do not
   solve. It now lives in `view/projects.js`.

   Cost: every update now builds the visible tab's description and compares
   it. Measured in the browser at about 0.4 ms per tick-and-redraw on a
   mid-game farm, the same as before.

3. **One module per panel.** Done as planned. Nothing is shared by name
   between panels any more; the only cache left is the text cache in `dom.js`.

4. **`main.js` does one job.** Done. Device glue moved to `platform.js`; what
   buttons do moved to `actions.js` (which is what lets `page.test.js` play
   the real game); "the page needs redrawing" is one function, `changed()`.

## Still true, still not done

- **No automated test on iOS.** The tools here all run Chromium, which never
  showed the bug. The tests assert the property Safari needs. A person with an
  iPhone confirms it after changes to `view/dom.js`.
- **`platform.js` and the loop in `main.js` have no unit tests** (they are
  browser-only). They are exercised by the Android emulator runs and by hand.
- **How systems plug into `tick`** (`core/sim.js`) was left alone, as planned.
