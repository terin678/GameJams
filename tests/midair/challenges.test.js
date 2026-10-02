import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadProgress, record, tierOf, describe, tierTotals, formatTitle } from '../../games/midair/src/core/challenges.js';

const DEFS = [
	{ id: 'cars', title: 'Poop on {n} blue cars', event: 'kill', match: { enemy: 'car' }, goals: [2, 4, 6] },
	{ id: 'any', title: 'Down {n} things', event: 'kill', goals: [3, 5, 10] },
	{ id: 'chain', title: 'Hit a {n} chain', event: 'chain', mode: 'best', goals: [5, 10, 20] },
];

test('loadProgress keeps known numeric entries and drops junk', () => {
	assert.deepEqual(loadProgress({ cars: 3, chain: 'x', gone: 9 }, DEFS), { cars: 3, any: 0, chain: 0 });
	assert.deepEqual(loadProgress(null, DEFS), { cars: 0, any: 0, chain: 0 });
});

test('tierOf counts goals met', () => {
	const d = DEFS[0];
	assert.equal(tierOf(d, 0), 0);
	assert.equal(tierOf(d, 2), 1);
	assert.equal(tierOf(d, 5), 2);
	assert.equal(tierOf(d, 99), 3);
});

test('count challenges accumulate and only match their enemy', () => {
	const p = loadProgress({}, DEFS);
	record(p, DEFS, 'kill', { enemy: 'car' });
	record(p, DEFS, 'kill', { enemy: 'jet' });
	assert.equal(p.cars, 1);
	assert.equal(p.any, 2);
});

test('record reports each tier the moment it is reached', () => {
	const p = loadProgress({ cars: 1 }, DEFS);
	const ups = record(p, DEFS, 'kill', { enemy: 'car' });
	assert.deepEqual(ups.map(u => [u.def.id, u.tier]), [['cars', 1]]);
	assert.deepEqual(record(p, DEFS, 'kill', { enemy: 'car' }), []);
});

test('a big jump can skip straight to a higher tier', () => {
	const p = loadProgress({}, DEFS);
	const ups = record(p, DEFS, 'chain', { value: 12 });
	assert.deepEqual(ups.map(u => u.tier), [2]);
});

test('best-mode challenges keep the maximum, not the sum', () => {
	const p = loadProgress({}, DEFS);
	record(p, DEFS, 'chain', { value: 4 });
	record(p, DEFS, 'chain', { value: 3 });
	assert.equal(p.chain, 4);
});

test('describe fills in the next goal and caps at gold', () => {
	assert.deepEqual(describe(DEFS[0], 3), { title: 'Poop on 4 blue cars', tier: 1, value: 3, goal: 4, done: false });
	assert.deepEqual(describe(DEFS[0], 8), { title: 'Poop on 6 blue cars', tier: 3, value: 8, goal: 6, done: true });
	assert.equal(describe(DEFS[0], 0).title, 'Poop on 2 blue cars');
});

test('{s} pluralises against the goal', () => {
	const d = { id: 't', title: 'Stomp {n} truck{s}', event: 'kill', goals: [1, 5, 20] };
	assert.equal(describe(d, 0).title, 'Stomp 1 truck');
	assert.equal(describe(d, 1).title, 'Stomp 5 trucks');
	assert.equal(formatTitle(d, 20), 'Stomp 20 trucks');
});

test('tierTotals counts medals per tier', () => {
	assert.deepEqual(tierTotals(DEFS, { cars: 6, any: 3, chain: 0 }), [1, 0, 1]);
});
