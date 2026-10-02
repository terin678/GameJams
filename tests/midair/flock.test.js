import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slotOffset, formationTargets, follow } from '../../games/midair/src/core/flock.js';

test('slots fill a V behind the leader: inner pair first, alternating sides', () => {
	assert.deepEqual(slotOffset(0, 30), { x: -30, y: 24 });
	assert.deepEqual(slotOffset(1, 30), { x: 30, y: 24 });
	assert.deepEqual(slotOffset(2, 30), { x: -60, y: 48 });
	assert.deepEqual(slotOffset(3, 30), { x: 60, y: 48 });
});

test('formationTargets places each wingman relative to the leader', () => {
	const t = formationTargets({ x: 200, y: 500 }, 3, 30);
	assert.deepEqual(t, [{ x: 170, y: 524 }, { x: 230, y: 524 }, { x: 140, y: 548 }]);
	assert.deepEqual(formationTargets({ x: 0, y: 0 }, 0, 30), []);
});

test('follow eases toward the target without overshooting', () => {
	const a = follow({ x: 0, y: 0 }, { x: 100, y: 0 }, 0.1, 10);
	assert.ok(a.x > 0 && a.x < 100);
	const b = follow(a, { x: 100, y: 0 }, 0.1, 10);
	assert.ok(b.x > a.x && b.x < 100);
	const c = follow({ x: 0, y: 0 }, { x: 100, y: 50 }, 100, 10);
	assert.ok(Math.abs(c.x - 100) < 1e-6 && Math.abs(c.y - 50) < 1e-6, 'converges');
});

test('follow with zero dt stays put', () => {
	assert.deepEqual(follow({ x: 5, y: 5 }, { x: 100, y: 100 }, 0, 10), { x: 5, y: 5 });
});
