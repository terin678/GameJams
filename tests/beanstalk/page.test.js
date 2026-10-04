// The game played through its page: real rules, real actions and the real
// view, with every press going through the page's own buttons. These are the
// standing tests behind the rule that a button, once on screen, stays the same
// button until it genuinely goes away (games/beanstalk/docs/refactor-plan.md).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openGame, earlyGame, midGame, lateGame, PANELS } from './support/page.js';
import { createActions } from '../../games/beanstalk/src/game/actions.js';
import { createState, giveGift, crossSeeds } from '../../games/beanstalk/src/core/sim.js';
import { DATA } from '../../games/beanstalk/src/data/index.js';
import { createRng } from '../../shared/rng.js';

// The project list ignores presses for a moment after it changes shape, by the
// wall clock. Tests run much faster than that, so the clock follows game time.
function withGameClock(game, fn) {
	const real = Date.now;
	Date.now = () => Math.round(game.state.time * 1000);
	try {
		return fn();
	} finally {
		Date.now = real;
	}
}

const finite = state => ['coins', 'beans', 'grown', 'pages', 'matter', 'probes', 'height', 'price'].every(k => Number.isFinite(state[k]) && state[k] >= 0);

test('a press is never lost to a redraw: finger down, the game moves on, finger up', () => {
	// Each case is a tab in a state where something on it changes every second or so.
	const cases = [
		{ name: 'guard, raid forecast counting down', state: midGame, tab: 'guard', pick: '[data-post="duck"][data-delta="1"]', did: g => g.state.guard.roster.duck === 1 },
		{ name: 'guard, the build button', state: midGame, tab: 'guard', pick: '[data-build]', did: g => g.state.guard.posts === DATA.GUARD.posts.start + 1 },
		{
			name: 'neighbours, someone else counting down after a gift', state: midGame, tab: 'neighbours',
			before: g => giveGift(g.state, 'marigold', 'pie', DATA),
			pick: '[data-friend="bram"][data-gift="pie"]', did: g => g.state.friends.bram.said !== '',
		},
		{ name: 'exchange, the board repricing', state: midGame, tab: 'exchange', pick: '[data-buy="0.5"]', did: g => g.state.exchange.crates > 0 },
		// Nothing on the Projects tab changes by the clock, so there is nothing to see change.
		{ name: 'projects, coins coming in', state: earlyGame, tab: 'projects', still: true, pick: '[data-id="plot"]', did: g => g.state.owned.plot === 4 },
		{ name: 'seeds, waiting to cross', state: midGame, tab: 'seeds', still: true, pick: '[data-cross]', did: g => g.state.seeds.pending !== null },
		{ name: 'blight, the swarm on guard', state: lateGame, tab: 'guard', pick: '[data-swarm="1"]', did: g => g.state.blight.share > 0 },
	];
	for (const c of cases) {
		const page = openGame(c.state());
		c.before?.(page.game);
		withGameClock(page.game, () => {
			page.open(c.tab);
			const pressed = page.$(c.tab).querySelector(`${c.pick}:not([disabled])`);
			assert.ok(pressed, `${c.name}: the button is there to press`);
			const words = page.$(c.tab).textContent;
			page.run(6);                                   // the finger is down for six seconds of game
			if (!c.still) assert.notEqual(page.$(c.tab).textContent, words, `${c.name}: the tab did change meanwhile`);
			assert.ok(pressed.isConnected, `${c.name}: the button under the finger was replaced`);
			assert.equal(page.$(c.tab).querySelector(c.pick), pressed, `${c.name}: and it is still the one the page shows`);
			page.press(pressed);
			assert.ok(c.did(page.game), `${c.name}: the press reached the game`);
		});
	}
});

test('a choice that appears while you watch can be pressed (seedlings, a ledge)', () => {
	const page = openGame(midGame());
	page.open('seeds');
	page.press(page.$('seeds').querySelector('[data-cross]'));
	page.run(DATA.SEEDS.cross.seconds + 1);
	const pick = page.$('seeds').querySelector('[data-seedling="0"]');
	assert.ok(pick, 'the seedlings turned up');
	page.run(3);
	assert.ok(pick.isConnected);
	page.press(pick);
	assert.equal(page.game.state.seeds.generation, 1);

	page.open('climb');
	page.press(page.$('climb').querySelector('[data-climb]'));
	page.run(DATA.CLIMB.seconds + 1);
	const option = page.$('climb').querySelector('[data-option="0"]');
	assert.ok(option, 'the ledge turned up');
	page.run(3);
	assert.ok(option.isConnected);
	page.press(option);
	assert.equal(page.game.state.climb.ledge, 1);
});

test('every button on every tab can be pressed, early, mid-game and late, and nothing breaks', () => {
	for (const [name, make] of [['early', earlyGame], ['mid', midGame], ['late', lateGame]]) {
		const page = openGame(make());
		withGameClock(page.game, () => {
			let presses = 0;
			for (const tab of page.tabs()) {
				page.open(tab);
				// The buttons change as they are pressed, so look again each time.
				for (let i = 0; i < page.enabled(tab).length; i++) {
					page.press(page.enabled(tab)[i]);
					page.run(0.5);
					presses++;
				}
			}
			for (const id of ['tend', 'price-up', 'price-down']) {
				if (!page.$(id).disabled) page.press(page.$(id));
			}
			page.run(5);
			assert.ok(presses >= (name === 'early' ? 3 : 12), `${name}: only ${presses} presses`);
			assert.ok(page.sounds.length >= presses, `${name}: every press was answered with a sound`);
			assert.ok(finite(page.game.state), `${name}: the numbers are still numbers`);
		});
	}
	const late = openGame(lateGame());
	assert.deepEqual([...late.tabs()].sort(), [...PANELS].sort());
	late.open('guard');
	assert.match(late.$('guard').textContent, /The Blight/);
	late.open('projects');
	assert.match(late.$('projects').textContent, /beans\)/, 'prices are in beans once the market is cornered');
	assert.doesNotMatch(late.$('projects').textContent, /coins\)/);
});

test('ten minutes played through the page gets a farm going', () => {
	const page = openGame();
	withGameClock(page.game, () => {
		for (let second = 0; second < 600; second++) {
			for (let i = 0; i < 3; i++) if (!page.$('tend').disabled) page.press(page.$('tend'));
			if (page.$('projects').hidden) page.open('projects');
			const [buy] = page.enabled('projects');
			if (buy) page.press(buy);
			if (second % 30 === 0 && page.tabs().includes('neighbours')) {
				page.open('neighbours');
				const [gift] = page.enabled('neighbours');
				if (gift) page.press(gift);
				page.open('projects');
			}
			page.run(1);
		}
	});
	const { state } = page.game;
	assert.ok(state.grown > 400, `grew ${state.grown}`);
	assert.ok(Object.keys(state.owned).length >= 6, `owns ${Object.keys(state.owned).join(', ')}`);
	assert.ok(state.owned.farmhand >= 1 && state.mods.tend > 0, 'hired help');
	assert.ok(Object.values(state.friends).some(f => f.said), 'gave a gift');
	assert.ok(page.tabs().length >= 2);
	assert.ok(finite(state));
});

test('after any amount of play, the page says exactly what a fresh page would', () => {
	const page = openGame(midGame(), 7);
	withGameClock(page.game, () => {
		for (const tab of page.tabs()) {
			page.open(tab);
			const [first] = page.enabled(tab);
			if (first) page.press(first);
			page.run(8);
		}
		giveGift(page.game.state, 'marigold', 'pie', DATA);
		crossSeeds(page.game.state, DATA, createRng(3));
		page.run(20);
		const fresh = openGame(page.game.state);
		const status = ['grown', 'height', 'phase', 'coins', 'beans', 'price', 'plots', 'tend', 'growing', 'helpers', 'pages', 'calendar'];
		for (const tab of page.tabs()) {
			page.open(tab);
			fresh.open(tab);
			assert.equal(page.$(tab).textContent, fresh.$(tab).textContent, tab);
			assert.deepEqual(page.enabled(tab).map(b => b.textContent), fresh.enabled(tab).map(b => b.textContent), `${tab}: which buttons can be pressed`);
		}
		for (const id of status) assert.equal(page.$(id).textContent, fresh.$(id).textContent, id);
		assert.equal(page.$('log').textContent, fresh.$('log').textContent);
		assert.deepEqual(page.tabs(), fresh.tabs());
	});
});

test('actions say how it went: a sound for done, a sound for refused, a buzz for a harvest', () => {
	const game = { state: createState(DATA) };
	const heard = [];
	const buzzed = [];
	let ended = 0;
	const actions = createActions({ game, data: DATA, rng: createRng(1), feedback: { sound: s => heard.push(s), buzz: b => buzzed.push(b), ended: () => { ended++; } } });
	assert.equal(actions.tend(), 'plant');
	assert.equal(actions.tend(), null, 'nothing to do while it grows');
	assert.deepEqual(heard, ['plant', 'deny']);
	assert.equal(buzzed.length, 1);
	assert.equal(actions.buy('plot'), false);
	game.state.coins = 5;
	assert.equal(actions.buy('plot'), true);
	assert.deepEqual(heard.slice(2), ['deny', 'buy']);
	assert.equal(actions.cross(), false);
	assert.equal(actions.post('duck', 1), false);
	assert.equal(actions.trade('buy', 0.5), false);
	actions.seen('tab:seeds');
	assert.equal(game.state.seen['tab:seeds'], true);
	// The state object can be swapped out from under the actions.
	game.state = createState(DATA);
	assert.equal(actions.tend(), 'plant');
	// Planting the last bean ends the game and says so.
	game.state.grown = DATA.TUNING.universeBeans;
	game.state.phase = 3;
	game.state.matter = 1;
	assert.equal(actions.buy('last_bean'), true);
	assert.equal(ended, 1);
	assert.equal(heard.at(-1), 'ending');
});
