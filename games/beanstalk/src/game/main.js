// Boot: load the save, catch up on time away, then run the loop.

import { DATA, SPRITES, PALETTE, VIEW, SOUNDS, EVENT_SOUNDS, MUSIC, SKY } from '../data/index.js';
import { createState, tick, tend, buyProject, giveGift, crossSeeds, chooseSeedling, climb, chooseAtLedge, postAnimal, buildPost, trainAnimal, guardSwarm, buyCrates, sellCrates, nudgePrice, simulateOffline, serialize, restore, newGamePlus } from '../core/sim.js';
import { createStore } from '../../../../shared/storage.js';
import { createRng } from '../../../../shared/rng.js';
import { Sfx } from '../../../../shared/sfx.js';
import { Music } from '../../../../shared/music.js';
import { createFarmView } from './farmCanvas.js';
import { createView } from './view.js';

const T = DATA.TUNING;
const store = createStore('beanstalk');
const rng = createRng();
const sfx = new Sfx(SOUNDS, { muted: store.get('muted', false) });
const music = new Music(MUSIC);
let musicOn = store.get('music', true);
const seconds = () => performance.now() / 1000;

// Browsers only allow audio after a click or key press, so this runs on each one.
// The tune pauses while the tab is hidden: a sleeping tab can't keep time.
function audio() {
	sfx.unlock();
	const { ctx } = sfx;
	if (!ctx) return;
	if (!musicOn || document.hidden) music.stop();
	else if (ctx.state === 'running') music.start(ctx);
	else ctx.resume().then(() => { if (musicOn && !document.hidden) music.start(ctx); }, () => {});
}

let state = restore(store.get('save'), DATA);

const farm = createFarmView(document.getElementById('farm'), DATA, { SPRITES, PALETTE, VIEW, SKY });
const view = createView(document, { ...DATA, SKY }, {
	tend() {
		const did = tend(state, DATA);
		sfx.play(did ?? 'deny');
		if (did) buzz(8);
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
	gift(neighbourId, giftId) {
		const result = giveGift(state, neighbourId, giftId, DATA);
		sfx.play(!result ? 'deny' : result.perks.length ? 'heart' : result.reaction);
		if (result?.perks.length) buzz([20, 40, 20]);
	},
	cross() {
		sfx.play(crossSeeds(state, DATA, rng) ? 'cross' : 'deny');
	},
	seedling(index) {
		sfx.play(chooseSeedling(state, index, DATA) ? 'buy' : 'deny');
	},
	climb() {
		sfx.play(climb(state, DATA) ? 'buy' : 'deny');
	},
	ledge(index) {
		const result = chooseAtLedge(state, index, DATA, rng);
		sfx.play(!result ? 'deny' : result.stomp ? 'stomp' : result.won ? (result.find ? 'heart' : 'like') : 'dislike');
		if (result?.stomp) buzz([80, 40, 120]);
	},
	post(id, delta) {
		sfx.play(postAnimal(state, id, delta, DATA) ? 'price' : 'deny');
	},
	trade(side, share) {
		sfx.play((side === 'buy' ? buyCrates : sellCrates)(state, share, DATA) ? 'buy' : 'deny');
	},
	swarm(dir) {
		sfx.play(guardSwarm(state, dir, DATA) ? 'price' : 'deny');
	},
	train(id) {
		sfx.play(trainAnimal(state, id, DATA) ? 'cross' : 'deny');
	},
	build() {
		sfx.play(buildPost(state, DATA) ? 'buy' : 'deny');
	},
	// The player has looked at something new (a tab), so stop flagging it.
	seen(key) {
		state.seen[key] = true;
	},
	mute() {
		sfx.muted = !sfx.muted;
		store.set('muted', sfx.muted);
		view.muted(sfx.muted);
	},
	music() {
		musicOn = !musicOn;
		store.set('music', musicOn);
		view.music(musicOn);
		audio();
	},
	reset() {
		if (!confirm('Start over from one bean? This erases your farm.')) return;
		begin(createState(DATA));
		view.closeMenu();
	},
	async install() {
		if (!installPrompt) return;
		installPrompt.prompt();
		await installPrompt.userChoice;
		installPrompt = null;
		view.installable(false);
	},
	backdrop() {
		farmBehind = !farmBehind;
		store.set('backdrop', farmBehind);
		backdrop();
	},
	awake() {
		keepAwake = !keepAwake;
		store.set('awake', keepAwake);
		wake();
	},
	again() {
		begin(newGamePlus(state, DATA));
	},
});

// On a phone the farm can sit behind the page, between the top bar and the
// Tend button (the CSS only acts on narrow screens). It needs to know how
// tall those two bars are, which depends on the phone.
let farmBehind = store.get('backdrop', true);
function backdrop() {
	document.body.classList.toggle('backdrop', farmBehind);
	view.backdrop(farmBehind);
	measureBars();
}
function measureBars() {
	const px = id => `${document.getElementById(id).offsetHeight}px`;
	document.documentElement.style.setProperty('--top-h', px('top'));
	document.documentElement.style.setProperty('--tend-h', px('tendbar'));
}
addEventListener('resize', measureBars);

// A short buzz on phones that can (Android; iPhones ignore it).
function buzz(pattern) {
	try { navigator.vibrate?.(pattern); } catch (e) { /* not allowed here */ }
}

// The browser offers to install the game once it has seen the manifest and
// the service worker; keep the offer for the Menu's Install button.
let installPrompt = null;
addEventListener('beforeinstallprompt', e => {
	e.preventDefault();
	installPrompt = e;
	view.installable(true);
});
addEventListener('appinstalled', () => view.installable(false));

// Keeping the screen awake is opt-in (it costs battery) and has to be asked
// for again each time the page comes back into view.
let keepAwake = store.get('awake', false);
let wakeLock = null;
async function wake() {
	const can = 'wakeLock' in navigator;
	view.awake(can ? keepAwake : null);
	if (!can) return;
	try {
		if (keepAwake && !document.hidden) wakeLock = await navigator.wakeLock.request('screen');
		else if (!keepAwake) {
			await wakeLock?.release();
			wakeLock = null;
		}
	} catch (e) { /* the system said no (low battery, say): nothing to do */ }
}

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
		if (e.type === 'fair' && e.id === 'won') buzz([20, 40, 20]);
		if (e.type === 'raid') buzz([30, 30, 30]);
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
	else wake();
	if (sfx.ctx) audio();
});
addEventListener('pagehide', save);

document.addEventListener('keydown', e => {
	audio();
	if (e.code !== 'Space' && e.code !== 'Enter') return;
	if (e.target instanceof HTMLButtonElement) return;   // the button handles its own keys
	e.preventDefault();
	if (!e.repeat) document.getElementById('tend').click();
});
// Phones differ on which event counts as "the user did something", so listen to all of them.
for (const type of ['pointerup', 'touchend', 'click']) document.addEventListener(type, audio);

const savedAt = store.get('savedAt');
if (savedAt) catchUp((Date.now() - savedAt) / 1000);
view.muted(sfx.muted);
view.music(musicOn);
backdrop();
wake();
if (state.done) view.ending(state);
requestAnimationFrame(frame);

// The service worker makes the game open offline and always fetch the newest
// files when online (see sw.js). Browsers only allow it on https or localhost.
// The phone app (tools/build-app.mjs) is already offline and leaves it out.
if (!globalThis.BEANSTALK_APP && 'serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});

// For poking at the game from the console: game.state, game.skip(60).
window.game = {
	music,
	get state() { return state; },
	skip(s) {
		for (let t = 0; t < s; t += T.tickSeconds) tick(state, T.tickSeconds, DATA, rng);
		view.update(state, measured.rate);
	},
	// Redraws the farm for animation time `t` (seconds), e.g. to check a frame.
	draw(t = seconds()) {
		farm.draw(state, t);
	},
};
