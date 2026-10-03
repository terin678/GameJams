import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	createExchange, unlockDue, openExchange, seasonFactor, yearFrac, step, kick, buy, sell, valueOf, averageCost, validateExchange,
} from '../../games/beanstalk/src/core/exchange.js';

const X = {
	unlock: { phase: 2, grown: 1000 }, log: 'The exchange opens.',
	base: 100,
	seasons: { spring: 1.2, summer: 1, autumn: 0.8, winter: 1.1 },
	weather: { rain: -0.1, drought: 0.2 },
	noise: 0.05, revertSeconds: 60, maxShock: 0.4,
	sampleSeconds: 5, history: 4, fee: 0.02,
	shares: [0.1, 0.5, 1],
	hint: 'Cheap at harvest.',
};
const SEASONS = [{ id: 'spring' }, { id: 'summer' }, { id: 'autumn' }, { id: 'winter' }];
const CAL = { daySeconds: 60, daysPerSeason: 3 };
const flat = { next: () => 0.5 };   // no noise
const state = over => ({ phase: 2, grown: 1000, coins: 1000, day: 0, dayT: 0, exchange: createExchange(), ...over });
const opened = over => {
	const s = state(over);
	openExchange(s, X, SEASONS, CAL);
	return s;
};
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} is not ${b}`);

test('the exchange opens in its phase once enough has grown, with a price on the board', () => {
	assert.equal(unlockDue(state({ phase: 1 }), X), false);
	assert.equal(unlockDue(state({ grown: 999 }), X), false);
	const s = state();
	assert.equal(unlockDue(s, X), true);
	openExchange(s, X, SEASONS, CAL);
	assert.equal(unlockDue(s, X), false);
	assert.ok(s.exchange.price > 0);
	assert.deepEqual(s.exchange.history, [s.exchange.price]);
});

test('the price follows the seasons smoothly: each season is at full strength in its middle', () => {
	const f = [1.2, 1, 0.8, 1.1];
	close(seasonFactor(0.125, f), 1.2);
	close(seasonFactor(0.375, f), 1);
	close(seasonFactor(0.625, f), 0.8);
	close(seasonFactor(0.875, f), 1.1);
	close(seasonFactor(0.25, f), 1.1);          // halfway from spring to summer
	close(seasonFactor(0, f), 1.15);            // halfway from winter to spring
	close(seasonFactor(1, f), 1.15);
	close(yearFrac({ day: 6, dayT: 30 }, SEASONS, CAL), 6.5 / 12);
	close(yearFrac({ day: 12, dayT: 0 }, SEASONS, CAL), 0);
});

test('the board is repriced every few seconds and keeps a short history', () => {
	const s = opened({ day: 1, dayT: 30 });   // the middle of spring
	close(s.exchange.price, 120);
	s.day = 7;                                 // the middle of autumn
	assert.equal(step(s, 4, X, SEASONS, CAL, flat), false);
	close(s.exchange.price, 120);
	assert.equal(step(s, 1, X, SEASONS, CAL, flat), true);
	close(s.exchange.price, 80);
	for (let i = 0; i < 10; i++) step(s, 5, X, SEASONS, CAL, flat);
	assert.equal(s.exchange.history.length, 4);
});

test('weather moves the price, and the move fades', () => {
	const s = opened({ day: 4, dayT: 30 });   // the middle of summer: factor 1
	kick(s, 'drought', X);
	step(s, 5, X, SEASONS, CAL, flat);
	assert.ok(s.exchange.price > 115 && s.exchange.price < 120, `${s.exchange.price}`);
	for (let i = 0; i < 120; i++) step(s, 5, X, SEASONS, CAL, flat);
	assert.ok(Math.abs(s.exchange.price - 100) < 0.5, `${s.exchange.price}`);
	for (let i = 0; i < 20; i++) kick(s, 'drought', X);
	assert.equal(s.exchange.shock, X.maxShock, 'a shock has a limit');
	kick(s, 'fog', X);
	assert.equal(s.exchange.shock, X.maxShock, 'weather the exchange has not heard of does nothing');
});

test('noise wobbles the price either way', () => {
	const up = opened({ day: 4, dayT: 30 });
	step(up, 5, X, SEASONS, CAL, { next: () => 1 });
	const down = opened({ day: 4, dayT: 30 });
	step(down, 5, X, SEASONS, CAL, { next: () => 0 });
	assert.ok(up.exchange.price > 100 && down.exchange.price < 100);
});

test('buying turns a share of your coins into crates at the price on the board', () => {
	const s = opened({ day: 7, dayT: 30 });   // 80 a crate
	assert.equal(buy(s, 0.5, X), true);
	close(s.coins, 500);
	close(s.exchange.crates, 6.25);
	close(averageCost(s.exchange), 80);
	close(valueOf(s.exchange), 500);
	assert.equal(buy(s, 0.3, X), false, 'not a share on offer');
	assert.equal(buy(state(), 0.5, X), false, 'not open');
	assert.equal(buy(opened({ coins: 0 }), 0.5, X), false, 'nothing to spend');
});

test('selling pays the price on the board less the fee, and keeps count of the profit', () => {
	const s = opened({ day: 7, dayT: 30 });
	buy(s, 1, X);                              // 12.5 crates at 80
	assert.equal(sell(s, 0.5, X), true);       // straight back: only the fee is lost
	close(s.coins, 500 * 0.98);
	close(s.exchange.profit, -10);
	close(s.exchange.crates, 6.25);
	close(averageCost(s.exchange), 80);
	s.day = 1;                                 // spring: 120 a crate
	step(s, 5, X, SEASONS, CAL, flat);
	assert.equal(sell(s, 1, X), true);
	close(s.coins, 490 + 6.25 * 120 * 0.98);
	close(s.exchange.profit, -10 + 6.25 * 120 * 0.98 - 500);
	assert.equal(s.exchange.crates, 0);
	assert.equal(s.exchange.paid, 0);
	assert.equal(averageCost(s.exchange), 0);
	assert.equal(sell(s, 1, X), false, 'nothing to sell');
});

test('validateExchange accepts good data and explains bad data', () => {
	const ctx = { seasons: SEASONS.map(s => s.id), weather: ['rain', 'drought'], phases: [1, 2, 3] };
	assert.deepEqual(validateExchange(X, ctx), []);
	const bad = {
		unlock: { phase: 7 }, base: 0, seasons: { spring: 1, summer: 1, autumn: 1, monsoon: 1 }, weather: { fog: 0.1, rain: 2 },
		noise: -1, revertSeconds: 0, maxShock: 2, sampleSeconds: 0, history: 1, fee: 1, shares: [0, 2],
	};
	const errors = validateExchange(bad, ctx).join('\n');
	for (const word of ['unlock.phase', 'unlock.grown', 'log is', 'hint is', 'base', 'no price for winter', 'unknown season "monsoon"', 'never changes',
		'unknown weather "fog"', 'rain', 'noise', 'revertSeconds', 'maxShock', 'sampleSeconds', 'history', 'fee', 'share 0', 'share 2', 'sell everything']) {
		assert.match(errors, new RegExp(word), word);
	}
});
