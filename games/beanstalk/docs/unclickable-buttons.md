# The unclickable buttons (October 2026)

Notes kept while finding and fixing GitHub issue terin678/GameJams#3, and the
input to the refactor that follows. Written as it happened.

## The symptom

- On the phone (installed web version): buttons show their pressed outline but
  often do nothing. Pressing several times sometimes gets through.
- On a PC: a project button under the pointer flickers between its hover and
  normal look many times a second, though a click goes through.

## How it was measured

In the browser, with a farm sitting idle: count how many times the project
list's children are replaced over 300 game ticks. The answer was 300. Nothing
in the list had changed in that time: the same buttons, the same ones enabled.

A button that is thrown away and rebuilt between finger-down and finger-up
never receives a click, because the press started on a node that no longer
exists. A mouse click is quick enough to land between two rebuilds most of the
time, which is why the PC only showed the flicker (each new button starts
un-hovered).

## The cause

`src/game/view.js` kept one `Map`, called `shown`, for three unrelated things:

1. the text last written to each element, keyed by the element's id (so the
   page is only touched when a number changes);
2. each panel's signature of what it last drew, keyed by the panel's name (so a
   panel is only rebuilt when something it shows has changed);
3. a few flags (`ready`, `members`, `tabIds`).

The status line writes `set('rate', '12 beans a second')`, which stores that
text under the key `rate`. The corner-the-market change (commit d579879) added
a check meaning "if the money has changed from coins to beans, redraw every
price": `if (shown.get('rate') !== state.rate) forget every panel's signature`.
It read the same key. A line of text is never equal to a number, so every
signature was forgotten, and every panel rebuilt, on every update.

It shipped on 3 October with the corner-the-market commit. Later that day the
page was changed to update ten times a second instead of sixty, which turned
"never works" into "sometimes works".

## Why nothing caught it

- There were no tests for anything under `src/game/` (the page, the canvas,
  the loop). All 358 tests were for the rules and the data.
- The browser checks I did after that commit drove the game with `game.skip`
  and scripted `.click()` calls. A scripted click is instant, so it can never
  straddle a rebuild. Nothing I did resembled a finger.
- The page looked right in every screenshot. A rebuild that draws the same
  thing is invisible.

## The fix (done)

- `shown` is split into `written` (element text) and `drawn` (panel signatures
  and flags), and the money check uses its own key, `money`. Six lines.
- `tests/beanstalk/view.test.js` is new: it loads the real `index.html` and the
  real view into a DOM in Node (`jsdom`, a dev-only dependency). It checks that
  with nothing changed every panel keeps the very same button nodes, that
  pressing a button in each panel calls the game once, and that the change
  from coins to beans redraws the prices once and then leaves them alone. The
  first and last of those failed before the fix.

## The sweep: rebuilds per panel, after the fix

Measured with the same test harness, a mid-game farm, 60 seconds of game time,
ten updates a second. "Taps lost" is a press that goes down just before an
update and comes up just after it: lost if the button was replaced in between.

| Panel | State | Rebuilds in 60 s | Straddling taps lost |
|---|---|---|---|
| any of the six | before the fix | 600 | 600 of 600 |
| Projects | idle | 0 | 0 of 600 |
| Projects | coins arriving, things becoming affordable | 0 | 0 of 600 |
| Neighbours | nobody waiting on a gift | 0 | 0 of 600 |
| Neighbours | after a gift (the "come back in 42s" countdown) | 60 | 60 of 600 |
| Seeds | idle | 0 | 0 of 600 |
| Seeds | seedlings growing (no buttons shown meanwhile) | 1 | 0 |
| Climb | idle | 0 | 0 of 600 |
| Climb | climber on the way (no buttons shown meanwhile) | 1 | 0 |
| Guard | always (the "next raid in 1m 20s" countdown) | 60 | 60 of 600 |
| Exchange | always (the board reprices every 5 s) | 12 | 12 of 600 |

So the hotfix cures the reported bug, and a smaller one of the same family is
still there by design: a panel with a countdown rebuilds all of its buttons
every time the countdown's text changes. On the Guard tab that is once a
second, so about one press in ten that happens to straddle it is lost; a real
press lasts longer than one update, so the real figure is higher. Neighbours
does the same while anyone is waiting on a gift.

## Checking with real presses, and what that showed

After the fix I drove the Android app on the emulator with real held presses
(250 ms, sent by `adb`), ten on the project list, ten on the Guard tab and one
gift. All 21 worked. Then I took the fix out again and repeated it as a
control: **all 21 still worked.**

So the Android emulator cannot reproduce this bug, with or without the fix.
The likely reason: Chrome on Android decides what was tapped when the finger
lifts, by looking at what is under it then, so a rebuilt button still gets the
click. Safari on an iPhone ties the click to the element the finger first
touched; if that element has been replaced, there is no click. The bug report
came from an iPhone, and the PC symptom was only the flicker, which fits.

What this means:

- The measurements in the DOM harness (same nodes or not) are the evidence the
  fix rests on. I have no way to press a real iPhone screen from here.
- **The fix is not confirmed on the device that showed the bug.** That needs
  the owner's iPhone. Issue 3 stays open until then.
- The once-a-second rebuilds on the Guard and Neighbours tabs would, on an
  iPhone, still eat a press now and then. That is too visible to leave for the
  refactor, so there is an interim measure (below).

## Interim measure (done): no rebuild under a finger

While a pointer is down on a panel, that panel is not rebuilt; it catches up
on the first update after the press ends (or after 1.5 s, if the release is
never seen). About fifteen lines in `view.js` (`changed`, `held`), with a test
that presses a Guard button, moves the raid countdown on, and checks the
button is still the same node until release. The refactor should make this
unnecessary; until then it protects every panel.

## Afterwards

The owner confirmed on the iPhone that presses land (4 October), and issue 3
was closed. The refactor these notes fed is written up in `refactor-plan.md`;
it removed the stopgap above along with the mechanism that made the bug
possible.

## What else was seen (input for the refactor)

- **For the refactor: whole-panel rebuilds.** Every panel is drawn by "work out
  a signature string; if it changed, throw everything away and build it
  again". Anything on a timer in the signature (a countdown, a price) rebuilds
  the buttons beside it. Buttons should be built when the *set* of buttons
  changes, and otherwise have their text and enabled state changed in place.
- **For the refactor: signatures are hand-written lists.** Each panel's
  signature is a hand-kept list of the things it displays. Miss one and the
  panel goes stale; add a timer and it churns. The money change needed a side
  door ("forget every signature") because prices were not in any signature,
  and the side door is where the bug was.
- **For the refactor: `GUARD_MS`.** The project list ignores clicks for 350 ms
  after its membership changes, so a button that slid under the pointer is not
  bought by mistake. It is a patch over the same rebuild problem, and is itself
  a way to lose a press. With in-place updates and stable positions it can go.
- **For the refactor: focus and scroll are restored by hand** after each
  rebuild, separately in each panel (six copies of nearly the same code).
- **For the refactor: one 650-line file.** `view.js` holds the status column,
  the tab bar and six panels in one closure sharing its caches. The collision
  was possible because everything shared one scope.
- **For the refactor: `stale` in `main.js`.** The page is updated when a tick
  ran or a click or key press happened anywhere. That is a second, separate
  "has anything changed" mechanism layered over the signatures. It works, but
  a handler that changes the game without a click (the back button, a
  notification) would need to remember to set it.
- **For the refactor: no way to test on iOS.** Every tool I have runs Chromium.
  The harness can only assert the property that matters on Safari (a pressed
  button is never replaced), so that property has to be a standing test.
- **For the refactor: how I test in the browser.** `game.skip` plus scripted
  clicks cannot see this class of bug. The harness needs a "press" that spans
  an update, and it now has one (the sweep above); it should become a standing
  test once panels update in place, asserting zero lost presses.
- **Fixed now: nothing else.** No other key in `written` matches a key in
  `drawn` (checked every `set(...)` id against every panel and flag name;
  `rate` was the only one).
- **Not a problem:** the rules and data (`src/core`, `src/data`) played no part.
