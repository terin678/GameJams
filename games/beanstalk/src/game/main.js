// Boot: load the save, catch up on time away, then run the loop.

import { DATA, SPRITES, PALETTE, VIEW, SOUNDS, EVENT_SOUNDS } from '../data/index.js';
import { createState, tick, tend, buyProject, nudgePrice, simulateOffline, serialize, restore, newGamePlus } from '../core/sim.js';
import { createStore } from '../../../../shared/storage.js';
import { createRng } from '../../../../shared/rng.js';
import { Sfx } from '../../../../shared/sfx.js';
import { createFarmView } from './farmCanvas.js';
import { createView } from './view.js';

const T = DATA.TUNING;
const store = createStore('beanstalk');
const rng = createRng();
const sfx = new Sfx(SOUNDS, { muted: store.get('muted', false) });
const seconds = () => performance.now() / 1000;

let state = restore(store.get('save'), DATA);

const farm = createFarmView(document.getElementById('farm'), DATA, { SPRITES, PALETTE, VIEW });
const view = createView(document, DATA, {
	tend() {
		const did = tend(state, DATA);
		sfx.play(did ?? 'deny');
	},
	buy(id) {
		const bought = buyProject(state, id, DATA);
		sfx.play(bought ? 'buy' : 'deny');
		if (!state.done) return;
		sfx.play('ending');
		view.ending(state);
		save();
	},
	price(dir) {
		nudgePrice(state, dir, DATA);
		sfx.play('price');
	},
	mute() {
		sfx.muted = !sfx.muted;
		store.set('muted', sfx.muted);
		view.muted(sfx.muted);
	},
	reset() {
		if (!confirm('Start over from one bean? This erases your farm.')) return;
		begin(createState(DATA));
	},
	again() {
		begin(newGamePlus(state, DATA));
	},
});

function begin(next) {
	state = next;
	view.ending(null);
	measured = { at: state.time, grown: state.grown, rate: 0 };
	save();
}

function save() {
	store.set('save', serialize(state));
	store.set('savedAt', Date.now());
}

function react(events) {
	for (const e of events) {
		const sound = EVENT_SOUNDS[e.type];
		sfx.play(typeof sound === 'string' ? sound : sound?.[e.id]);
		if (e.type === 'crow') farm.crow(seconds());
	}
}

// Time the game was not running: the tab was closed or in the background.
function catchUp(awaySeconds) {
	if (state.done) return;
	const summary = simulateOffline(state, awaySeconds, DATA, rng);
	if (awaySeconds >= T.offline.minSeconds) view.away(summary);
	measured = { at: state.time, grown: state.grown, rate: summary.worked ? summary.grown / summary.worked : 0 };
	save();
}

// Beans per second, measured over the last second or so of game time.
let measured = { at: state.time, grown: state.grown, rate: 0 };
function measure() {
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
		react(tick(state, T.tickSeconds, DATA, rng));
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

function frame() {
	step();
	farm.draw(state, seconds());
	view.update(state, measured.rate);
	requestAnimationFrame(frame);
}
setInterval(step, 1000);

document.addEventListener('visibilitychange', () => {
	if (document.hidden) save();
});
addEventListener('pagehide', save);

document.addEventListener('keydown', e => {
	sfx.unlock();
	if (e.code !== 'Space' && e.code !== 'Enter') return;
	if (e.target instanceof HTMLButtonElement) return;   // the button handles its own keys
	e.preventDefault();
	if (!e.repeat) document.getElementById('tend').click();
});
document.addEventListener('pointerdown', () => sfx.unlock());

const savedAt = store.get('savedAt');
if (savedAt) catchUp((Date.now() - savedAt) / 1000);
view.muted(sfx.muted);
if (state.done) view.ending(state);
requestAnimationFrame(frame);

// For poking at the game from the console: game.state, game.skip(60).
window.game = {
	get state() { return state; },
	skip(s) {
		for (let t = 0; t < s; t += T.tickSeconds) tick(state, T.tickSeconds, DATA, rng);
		view.update(state, measured.rate);
	},
};
