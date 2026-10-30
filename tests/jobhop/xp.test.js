import { test } from 'node:test';
import assert from 'node:assert/strict';
import { xpToNext, createLevelState, gainXp, addGem, gemTier } from '../../games/jobhop/src/core/xp.js';

const CURVE = { base: 5, step: 5 };

test('xpToNext grows linearly', () => {
	assert.deepEqual([1, 2, 3].map(l => xpToNext(l, CURVE)), [5, 10, 15]);
});

test('gainXp can level more than once and keeps the remainder', () => {
	const s = createLevelState();
	assert.equal(gainXp(s, 4, CURVE), 0);
	assert.equal(gainXp(s, 13, CURVE), 2); // 17 total: 5 to L2, 10 to L3, 2 left
	assert.deepEqual(s, { level: 3, xp: 2 });
});

test('addGem pushes until the cap, then merges into the last gem', () => {
	const gems = [];
	assert.equal(addGem(gems, { value: 1 }, 2), null);
	addGem(gems, { value: 2 }, 2);
	const merged = addGem(gems, { value: 5 }, 2);
	assert.equal(gems.length, 2);
	assert.equal(merged, gems[1]);
	assert.equal(gems[1].value, 7);
});

test('gemTier buckets value', () => {
	assert.deepEqual([1, 2, 5, 25].map(gemTier), [0, 0, 1, 2]);
});
