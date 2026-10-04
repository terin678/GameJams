// Boot: load the save, catch up on time away, then run the loop.
//
// This file owns the game while it runs: the state, the clock, saving, and
// when the screen is redrawn. What the buttons do is in actions.js, what the
// page looks like is in view.js and farmCanvas.js, and everything about the
// device (sound switches, vibration, install, back button) is in platform.js.

import { DATA, SPRITES, PALETTE, VIEW, SOUNDS, EVENT_SOUNDS, MUSIC, SKY } from '../data/index.js';
import { createState, tick, simulateOffline, serialize, restore, newGamePlus } from '../core/sim.js';
import { createStore } from '../../../../shared/storage.js';
import { createRng } from '../../../../shared/rng.js';
import { Sfx } from '../../../../shared/sfx.js';
import { Music } from '../../../../shared/music.js';
import { createFarmView } from './farmCanvas.js';
import { createView } from './view.js';
import { createActions } from './actions.js';
import { createPlatform } from './platform.js';

const T = DATA.TUNING;
const store = createStore('beanstalk');
const rng = createRng();
const sfx = new Sfx(SOUNDS, { muted: store.get('muted', false) });
const music = new Music(MUSIC);
const seconds = () => performance.now() / 1000;

// The game. `state` is replaced whole on "start over" and New Game+.
const game = { state: restore(store.get('save'), DATA) };

// The page text is only redrawn when something may have changed. Anything
// that changes the game calls this: the loop after a tick, and every press.
let stale = true;
const changed = () => { stale = true; };

const handlers = {};
const farm = createFarmView(document.getElementById('farm'), DATA, { SPRITES, PALETTE, VIEW, SKY });
const view = createView(document, { ...DATA, SKY }, handlers);
const platform = createPlatform({ store, view, sfx, music });
Object.assign(handlers, createActions({
	game, data: DATA, rng,
	feedback: {
		sound: name => sfx.play(name),
		buzz: platform.buzz,
		ended() {
			view.ending(game.state);
			save();
		},
	},
}), {
	mute: platform.toggleMute,
	music: platform.toggleMusic,
	backdrop: platform.toggleBackdrop,
	awake: platform.toggleAwake,
	install: platform.install,
	reset() {
		if (!confirm('Start over from one bean? This erases your farm.')) return;
		begin(createState(DATA));
		view.closeMenu();
	},
	again() {
		begin(newGamePlus(game.state, DATA));
	},
});

function begin(next) {
	game.state = next;
	changed();
	view.ending(null);
	measured = { at: next.time, grown: next.grown, rate: 0 };
	save();
}

function save() {
	store.set('save', serialize(game.state));
	store.set('savedAt', Date.now());
}

// Sounds and effects for what happened in a tick.
function react(events) {
	for (const e of events) {
		const sound = EVENT_SOUNDS[e.type];
		sfx.play(typeof sound === 'string' ? sound : sound?.[e.id]);
		if (e.type === 'crow') farm.crow(seconds());
		if (e.type === 'fair' && e.id === 'won') platform.buzz([20, 40, 20]);
		if (e.type === 'raid') platform.buzz([30, 30, 30]);
	}
}

// Time the game was not running: the tab was closed or in the background.
function catchUp(awaySeconds) {
	const { state } = game;
	if (state.done) return;
	const summary = simulateOffline(state, awaySeconds, DATA, rng);
	if (awaySeconds >= T.offline.minSeconds) view.away(summary);
	measured = { at: state.time, grown: state.grown, rate: summary.worked ? summary.grown / summary.worked : 0 };
	changed();
	save();
}

// Beans per second, measured over the last second or so of game time.
let measured = { at: game.state.time, grown: game.state.grown, rate: 0 };
function measure() {
	const { state } = game;
	const span = state.time - measured.at;
	if (span < 1) return;
	measured = { at: state.time, grown: state.grown, rate: (state.grown - measured.grown) / span };
}

let pending = 0;
let sinceSave = 0;
function advance(dt) {
	pending += dt;
	while (pending >= T.tickSeconds) {
		pending -= T.tickSeconds;
		react(tick(game.state, T.tickSeconds, DATA, rng));
		changed();
	}
	measure();
	sinceSave += dt;
	if (sinceSave >= T.saveSeconds) {
		sinceSave = 0;
		save();
	}
}

// Game time follows the wall clock, not the frame rate: a slow or sleeping tab
// (browsers throttle both frames and timers in the background) catches up in
// one go the next time anything runs.
let last = seconds();
function step() {
	const now = seconds();
	const elapsed = now - last;
	last = now;
	if (elapsed > T.catchUpSeconds) catchUp(elapsed);
	else advance(elapsed);
}

// Easy on a phone's battery: the page text is redrawn only when the game has
// moved on (a tick, ten times a second) or something was pressed; the farm is
// redrawn VIEW.fps times a second, and not at all while it is scrolled out of sight.
let farmInView = true;
let drawnAt = -Infinity;
function frame() {
	const began = seconds();
	step();
	if (farmInView && began - drawnAt >= 1 / VIEW.fps - 0.004) {
		drawnAt = began;
		farm.draw(game.state, began);
	}
	if (stale) {
		stale = false;
		view.update(game.state, measured.rate);
	}
	platform.meter(began);
	requestAnimationFrame(frame);
}
setInterval(step, 1000);
for (const type of ['click', 'keydown']) document.addEventListener(type, changed);
if ('IntersectionObserver' in window) {
	new IntersectionObserver(entries => { farmInView = entries.at(-1).isIntersecting; }).observe(document.getElementById('farm'));
}

document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
addEventListener('pagehide', save);

// Space or Enter tends the farm, unless a button has the keyboard's attention.
document.addEventListener('keydown', e => {
	if (e.code !== 'Space' && e.code !== 'Enter') return;
	if (e.target instanceof HTMLButtonElement) return;   // the button handles its own keys
	e.preventDefault();
	if (!e.repeat) document.getElementById('tend').click();
});

const savedAt = store.get('savedAt');
if (savedAt) catchUp((Date.now() - savedAt) / 1000);
platform.start();
if (game.state.done) view.ending(game.state);
requestAnimationFrame(frame);

// For poking at the game from the console: game.state, game.skip(60).
// Left out of the shipping app.
if (!globalThis.BEANSTALK_SHIP) window.game = {
	music,
	get state() { return game.state; },
	skip(s) {
		for (let t = 0; t < s; t += T.tickSeconds) tick(game.state, T.tickSeconds, DATA, rng);
		view.update(game.state, measured.rate);
	},
	// Redraws the farm for animation time `t` (seconds), e.g. to check a frame.
	draw(t = seconds()) {
		farm.draw(game.state, t);
	},
};
