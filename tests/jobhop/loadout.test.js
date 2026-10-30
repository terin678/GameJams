import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLoadout, activeJob, benchJob, canSwap, swap, addGauge, canAct, spendAction, togglePick } from '../../games/jobhop/src/core/loadout.js';

const SWAP = { cooldownMs: 1000, gaugeRefill: 25 };

test('a loadout needs two different jobs', () => {
	assert.throws(() => createLoadout('a', 'a'));
	const l = createLoadout('a', 'b');
	assert.equal(activeJob(l), 'a');
	assert.equal(benchJob(l), 'b');
});

test('swap flips the active job, starts a cooldown and refills the incoming gauge', () => {
	const l = createLoadout('a', 'b');
	assert.equal(swap(l, 0, SWAP, 100), true);
	assert.equal(activeJob(l), 'b');
	assert.equal(l.gauge.b, 25);
	assert.equal(canSwap(l, 999), false);
	assert.equal(swap(l, 500, SWAP, 100), false, 'still cooling down');
	assert.equal(swap(l, 1000, SWAP, 100), true);
	assert.equal(activeJob(l), 'a');
});

test('swap refill is capped at max', () => {
	const l = createLoadout('a', 'b');
	l.gauge.b = 90;
	swap(l, 0, SWAP, 100);
	assert.equal(l.gauge.b, 100);
});

test('gauge only fills for the active job', () => {
	const l = createLoadout('a', 'b');
	addGauge(l, 30, 100);
	assert.deepEqual(l.gauge, { a: 30, b: 0 });
	addGauge(l, 300, 100);
	assert.equal(l.gauge.a, 100);
});

test('actions spend the active gauge', () => {
	const l = createLoadout('a', 'b');
	addGauge(l, 60, 100);
	assert.equal(canAct(l, 70), false);
	assert.equal(spendAction(l, 70), false);
	assert.equal(spendAction(l, 50), true);
	assert.equal(l.gauge.a, 10);
});

test('togglePick keeps at most two distinct picks, oldest replaced', () => {
	assert.deepEqual(togglePick([], 'a'), ['a']);
	assert.deepEqual(togglePick(['a'], 'b'), ['a', 'b']);
	assert.deepEqual(togglePick(['a', 'b'], 'a'), ['b']);
	assert.deepEqual(togglePick(['a', 'b'], 'c'), ['b', 'c']);
});
