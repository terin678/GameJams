import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DIRS, createMover } from '../../games/superposition/src/core/move.js';
import { createPowers, activate, isActive, remaining, splitOff, collapseTo, observe, nextItem, eatChainScore } from '../../games/superposition/src/core/quantum.js';

test('powers are timed and stack independently', () => {
	const p = createPowers();
	activate(p, 'tunnel', 1000, 5000);
	activate(p, 'split', 2000, 3000);
	assert.ok(isActive(p, 'tunnel', 5999));
	assert.ok(!isActive(p, 'tunnel', 6000));
	assert.equal(remaining(p, 'split', 4000), 1000);
	assert.equal(remaining(p, 'measure', 4000), 0);
});

test('re-activating extends from now, not from the old end', () => {
	const p = createPowers();
	activate(p, 'tunnel', 0, 5000);
	activate(p, 'tunnel', 4000, 5000);
	assert.equal(remaining(p, 'tunnel', 4000), 5000);
});

test('splitOff makes a mirror image moving the mirrored way', () => {
	const m = createMover(2, 7, DIRS.right);
	m.t = 0.25;
	m.want = DIRS.up;
	const twin = splitOff(m, 19);
	assert.equal(twin.col, 16);
	assert.equal(twin.row, 7);
	assert.equal(twin.t, 0.25);
	assert.deepEqual(twin.dir, DIRS.left);
	assert.deepEqual(twin.want, DIRS.up);
	assert.notEqual(twin, m);
});

test('collapseTo keeps only the survivor', () => {
	const a = { id: 'a' }, b = { id: 'b' };
	assert.deepEqual(collapseTo([a, b], b), [b]);
});

test('observe: when superposition ends, the rng decides which copy is real', () => {
	const a = { id: 'a' }, b = { id: 'b' };
	assert.equal(observe([a, b], { next: () => 0.2 }), a);
	assert.equal(observe([a, b], { next: () => 0.7 }), b);
	assert.equal(observe([a], { next: () => 0.7 }), a);
});

test('items appear every N quanta eaten, cycling kinds', () => {
	const cfg = { every: 40, cycle: ['tunnel', 'split'] };
	const s = { spawned: 0 };
	assert.equal(nextItem(s, 39, cfg), null);
	assert.equal(nextItem(s, 40, cfg), 'tunnel');
	assert.equal(nextItem(s, 41, cfg), null);
	assert.equal(nextItem(s, 80, cfg), 'split');
	assert.equal(nextItem(s, 120, cfg), 'tunnel');
});

test('eating measured observers in one go doubles each time', () => {
	assert.deepEqual([0, 1, 2, 3, 4].map(i => eatChainScore(i, 200)), [200, 400, 800, 1600, 1600]);
});
