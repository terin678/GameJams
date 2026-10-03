import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createState, refresh, tick, tend, buyProject, nudgePrice, simulateOffline, serialize, restore, newGamePlus } from '../../games/beanstalk/src/core/sim.js';
import { DATA } from '../../games/beanstalk/src/data/index.js';
import { createRng } from '../../shared/rng.js';

const T = DATA.TUNING;
const fair = { next: () => 0.999, pick: l => l[0] };   // never rolls any weather
const run = (state, seconds, rng = fair, dt = 0.1) => {
	const events = [];
	for (let t = 0; t < seconds - 1e-9; t += dt) events.push(...tick(state, dt, DATA, rng));
	return events;
};
const own = (state, ...ids) => {
	for (const id of ids) state.owned[id] = (state.owned[id] ?? 0) + 1;
	refresh(state, DATA);
};

test('a new game is one empty plot and an opening line', () => {
	const s = createState(DATA);
	assert.deepEqual(s.plots, [null]);
	assert.equal(s.price, T.startPrice);
	assert.equal(s.phase, 1);
	assert.equal(s.log[0], DATA.PHASES[0].log);
});

test('plant, wait, harvest: one bean', () => {
	const s = createState(DATA);
	assert.equal(tend(s, DATA), 'plant');
	run(s, T.growSeconds / 2);
	assert.equal(tend(s, DATA), null, 'not ripe yet');
	run(s, T.growSeconds / 2 + 0.2);
	assert.equal(tend(s, DATA), 'harvest');
	assert.equal(s.grown, 1);
	assert.equal(s.plots[0], 0, 'replanted');
});

test('the market turns beans into coins', () => {
	const s = createState(DATA);
	s.beans = 10;
	run(s, 5);
	assert.ok(s.beans < 10);
	assert.ok(s.coins > 0);
	assert.ok(Math.abs(s.coins - (10 - s.beans) * s.price) < 1e-9);
});

test('the price buttons move the price', () => {
	const s = createState(DATA);
	nudgePrice(s, 1, DATA);
	assert.ok(s.price > T.startPrice);
});

test('beans barely grow in winter, unless there is a greenhouse', () => {
	const winterDay = 3 * T.calendar.daysPerSeason;
	const grownBy = (...owned) => {
		const s = createState(DATA);
		s.day = winterDay;
		own(s, ...owned);
		tend(s, DATA);
		run(s, 2);
		return s.plots[0];
	};
	assert.ok(grownBy('greenhouse') > grownBy() * 3);
});

test('a crow eats a bean, but not past a scarecrow', () => {
	const crowAt = DATA.WEATHER.findIndex(w => w.eats);
	const before = DATA.WEATHER.slice(0, crowAt).reduce((a, w) => a + w.chance, 0);
	const crows = { next: () => before + 0.001, pick: l => l[0] };
	const s = createState(DATA);
	tend(s, DATA);
	const events = run(s, T.calendar.daySeconds + 0.1, crows);
	assert.ok(events.some(e => e.type === 'crow'));
	assert.equal(s.plots[0], null);

	const guarded = createState(DATA);
	own(guarded, 'scarecrow');
	tend(guarded, DATA);
	run(guarded, T.calendar.daySeconds + 0.1, crows);
	assert.notEqual(guarded.plots[0], null);
});

test('the journal mentions each season and kind of weather once, crows every time', () => {
	const s = createState(DATA);
	const year = T.calendar.daySeconds * T.calendar.daysPerSeason * DATA.SEASONS.length;
	const rain = { next: () => 0.001, pick: l => l[0] };
	run(s, year * 2 + 1, rain, 0.5);
	const count = text => s.log.filter(l => l === text).length;
	for (const season of DATA.SEASONS) assert.equal(count(season.log), 1, season.id);
	assert.equal(count(DATA.WEATHER[0].log), 1);
});

test('farmhands plant and pick on their own', () => {
	const s = createState(DATA);
	own(s, 'farmhand');
	const events = run(s, 30);
	assert.ok(s.grown >= 2);
	assert.ok(events.some(e => e.type === 'harvest'));
});

test('buying a project applies it straight away', () => {
	const s = createState(DATA);
	s.coins = 100;
	assert.equal(buyProject(s, 'plot', DATA), true);
	assert.equal(s.plots.length, 2);
	assert.ok(s.coins < 100);
	assert.equal(buyProject(s, 'no_such_thing', DATA), false);
});

test('the stalk grows with the harvest and crosses milestones and phases', () => {
	const s = createState(DATA);
	s.grown = 6000;
	const events = run(s, 0.1);
	assert.ok(s.height > 2000);
	assert.equal(s.phase, 2);
	assert.ok(events.some(e => e.type === 'phase' && e.id === 2));
	assert.ok(events.some(e => e.type === 'milestone'));
	assert.ok(s.log.includes(DATA.PHASES[1].log));
	assert.deepEqual(run(s, 0.1).filter(e => e.type !== 'harvest'), [], 'announced once');
});

test('probes multiply, and stop when the universe is full', () => {
	const s = createState(DATA);
	s.phase = 3;
	own(s, 'seed_probe');
	s.probes = 1;
	run(s, 20);
	assert.ok(s.probes > 1);
	assert.ok(s.matter > 0);
	assert.ok(s.grown > 0);

	s.probes = 1e40;
	const events = run(s, 1);
	assert.equal(s.grown, T.universeBeans);
	assert.equal(events.filter(e => e.type === 'full').length, 1);
});

test('planting the last bean ends the game, and nothing moves afterwards', () => {
	const s = createState(DATA);
	s.grown = T.universeBeans;
	s.coins = 10;
	run(s, 0.1);
	assert.equal(buyProject(s, 'last_bean', DATA), true);
	assert.equal(s.done, true);
	const time = s.time;
	assert.deepEqual(run(s, 5), []);
	assert.equal(s.time, time);
});

test('time away is simulated, up to a cap, and summarised', () => {
	const s = createState(DATA);
	own(s, 'farmhand', 'farmhand');
	const summary = simulateOffline(s, 1200, DATA, createRng(7));
	const worked = 1200 * T.offline.rate;
	assert.equal(summary.seconds, 1200);
	assert.equal(summary.worked, worked, 'the farm slows down without you');
	assert.equal(summary.capped, false);
	assert.ok(summary.grown > 20);
	assert.ok(summary.coins > 0);
	assert.equal(summary.days, worked / T.calendar.daySeconds);
	assert.equal(s.grown, summary.grown);

	const blink = simulateOffline(createState(DATA), 10, DATA, createRng(7));
	assert.equal(blink.worked, 10, 'a short gap runs at full speed');

	const long = simulateOffline(createState(DATA), T.offline.capSeconds * 3, DATA, createRng(7));
	assert.equal(long.seconds, T.offline.capSeconds);
	assert.equal(long.capped, true);
});

test('a save survives a round trip through JSON', () => {
	const s = createState(DATA);
	s.coins = 500;
	buyProject(s, 'plot', DATA);
	tend(s, DATA);
	run(s, 3);
	const back = restore(JSON.parse(JSON.stringify(serialize(s))), DATA);
	assert.deepEqual(back, s);
});

test('a broken or missing save starts a new game', () => {
	for (const junk of [null, 'beans', {}, { v: 99 }, { v: 1, plots: 'no' }]) {
		assert.deepEqual(restore(junk, DATA).plots, [null]);
	}
});

test('New Game+ starts over with a Golden Bean that boosts yield', () => {
	const s = createState(DATA);
	s.grown = 1e30;
	const again = newGamePlus(s, DATA);
	assert.equal(again.grown, 0);
	assert.equal(again.golden, 1);
	assert.equal(again.mods.yield, s.mods.yield * (1 + T.goldenBonus));
});
