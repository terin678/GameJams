// Helpers for tests that need the page: the real index.html and the real view
// code against a DOM in Node (jsdom). Not a test file itself.
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';
import { createView } from '../../../games/beanstalk/src/game/view.js';
import { createActions } from '../../../games/beanstalk/src/game/actions.js';
import { createState, refresh, tick } from '../../../games/beanstalk/src/core/sim.js';
import { DATA, SKY } from '../../../games/beanstalk/src/data/index.js';
import { createRng } from '../../../shared/rng.js';

const html = readFileSync(new URL('../../../games/beanstalk/index.html', import.meta.url), 'utf8');
export const PANELS = ['projects', 'neighbours', 'seeds', 'guard', 'climb', 'exchange'];

function attach(handlers) {
	// The chart asks for a canvas, which this DOM does not draw; that is fine, and need not be reported.
	const dom = new JSDOM(html, { virtualConsole: new VirtualConsole() });
	const { document } = dom.window;
	const view = createView(document, { ...DATA, SKY }, handlers);
	const $ = id => document.getElementById(id);
	const tabs = () => [...$('tabs').querySelectorAll('button')].map(b => b.dataset.tab);
	return { document, view, $, tabs, Event: dom.window.Event };
}

// A page with the view attached and handlers that only record. `calls` lists
// every handler the page invoked, as [name, ...args].
export function openPage() {
	const calls = [];
	const handlers = new Proxy({}, { get: (_, name) => (...args) => { calls.push([name, ...args]); } });
	const page = attach(handlers);
	return {
		...page, calls,
		// Shows a tab the way a player would, then lets the page catch up.
		open(tab, state) {
			[...page.$('tabs').querySelectorAll('button')].find(b => b.dataset.tab === tab).click();
			page.view.update(state, 0);
		},
		called: name => calls.filter(c => c[0] === name),
	};
}

// The whole game behind the page: real rules, real actions, real view. Every
// press goes through the page's own buttons. `sounds` lists what was played.
export function openGame(state = createState(DATA), seed = 1) {
	const rng = createRng(seed);
	const game = { state };
	const sounds = [];
	const handlers = {};
	const page = attach(handlers);
	Object.assign(handlers, createActions({
		game, data: DATA, rng,
		feedback: { sound: name => sounds.push(name), buzz() {}, ended() {} },
	}));
	const draw = () => page.view.update(game.state, 0);
	draw();
	return {
		...page, game, sounds, draw,
		// Lets game time pass, redrawing after every tick as the real loop does.
		run(seconds) {
			for (let t = 0; t < seconds - 1e-9; t += DATA.TUNING.tickSeconds) {
				tick(game.state, DATA.TUNING.tickSeconds, DATA, rng);
				draw();
			}
		},
		open(tab) {
			[...page.$('tabs').querySelectorAll('button')].find(b => b.dataset.tab === tab).click();
			draw();
		},
		// Presses a button the way the loop sees it: the click, then a redraw.
		press(button) {
			button.click();
			draw();
		},
		enabled: (root, selector = 'button') => [...page.$(root).querySelectorAll(`${selector}:not([disabled])`)],
	};
}

const settle = (state, seconds = 2) => {
	const rng = createRng(1);
	for (let t = 0; t < seconds; t += 0.1) tick(state, 0.1, DATA, rng);
	return state;
};

// A farm a few minutes in: a few plots, a farmhand, the first neighbour.
export function earlyGame() {
	const state = createState(DATA);
	state.grown = 120;
	state.coins = 400;
	state.owned = { plot: 3, farmhand: 1, watering_can: 1 };
	refresh(state, DATA);
	return settle(state);
}

// A farm far enough along that every tab is open and there is something to press in each.
export function midGame() {
	const state = createState(DATA);
	state.grown = 6e5;
	state.height = 3000;
	state.phase = 2;
	state.coins = 5e6;
	state.pages = 5000;
	return settle(state);
}

// Out in space, after the market is cornered, with the blight about.
export function lateGame() {
	const state = createState(DATA);
	state.owned = { plot: 11, farmhand: 8, accountant: 1, market_stall: 1, futures: 1, corner: 1, library: 1, field: 9, drone_design: 1, drone: 12, seed_probe: 1, self_planting: 1, lunar_soil: 1 };
	state.grown = 5e11;
	state.height = 1e9;
	state.phase = 3;
	state.coins = 1e12;
	state.pages = 5e4;
	state.matter = 1e9;
	state.probes = 1e6;
	state.farmRate = 50;
	refresh(state, DATA);
	return settle(state);
}
