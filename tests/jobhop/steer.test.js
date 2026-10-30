import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seek, separate, knockback, speedAt } from '../../games/jobhop/src/core/steer.js';

test('seek moves toward the target without overshooting', () => {
	const e = { x: 0, y: 0 };
	seek(e, 10, 0, 100, 0.05);
	assert.deepEqual(e, { x: 5, y: 0 });
	seek(e, 10, 0, 100, 1);
	assert.deepEqual(e, { x: 10, y: 0 });
});

test('separate pushes overlapping neighbours apart, ignores itself', () => {
	const e = { x: 0, y: 0, radius: 5 };
	separate(e, [e, { x: 6, y: 0, radius: 5 }], 0.5);
	assert.equal(e.x, -2);
	const f = { x: 0, y: 0, radius: 5 };
	separate(f, [{ x: 0, y: 0, radius: 5 }], 0.5);
	assert.ok(f.x !== 0 || f.y !== 0, 'stacked enemies get nudged');
});

test('knockback pushes away from a point', () => {
	const e = { x: 10, y: 0 };
	knockback(e, 0, 0, 5);
	assert.deepEqual(e, { x: 15, y: 0 });
});

test('speedAt applies dash bursts on a cycle', () => {
	const def = { dash: { everyMs: 1000, ms: 200, mult: 3 } };
	assert.equal(speedAt(def, 100), 3);
	assert.equal(speedAt(def, 500), 1);
	assert.equal(speedAt(def, 1100), 3);
	assert.equal(speedAt({}, 100), 1);
});
