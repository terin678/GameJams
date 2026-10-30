import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSpawner, dueSpawns, dueEvents, ringPosition, enemyHp } from '../../games/jobhop/src/core/spawner.js';
import { createRng } from '../../shared/rng.js';

const STAGE = {
	windows: [
		{ from: 0, to: 10, type: 'g', everyMs: 1000, max: 3 },
		{ from: 5, to: 10, type: 'b', everyMs: 500, burst: 2, max: 10 },
	],
	events: [{ at: 8, type: 'boss', count: 1 }, { at: 3, type: 'elite', count: 2 }],
};

test('windows spawn on their timer only while active', () => {
	const sp = createSpawner(STAGE);
	assert.deepEqual(dueSpawns(sp, STAGE, 0.5, 500, {}, 0, 100), []);
	assert.deepEqual(dueSpawns(sp, STAGE, 1, 500, {}, 0, 100), ['g']);
	assert.deepEqual(dueSpawns(sp, STAGE, 5.5, 500, {}, 0, 100), ['b', 'b']);
});

test('per-type max and the global cap are respected', () => {
	const sp = createSpawner(STAGE);
	assert.deepEqual(dueSpawns(sp, STAGE, 1, 1000, { g: 3 }, 3, 100), []);
	assert.equal(dueSpawns(sp, STAGE, 6, 1000, {}, 99, 100).length, 1);
});

test('a long frame does not burst more than the window max', () => {
	const sp = createSpawner(STAGE);
	assert.equal(dueSpawns(sp, STAGE, 9, 60000, {}, 0, 100).filter(t => t === 'g').length, 3);
});

test('events fire once, in time order', () => {
	const sp = createSpawner(STAGE);
	assert.deepEqual(dueEvents(sp, STAGE, 2), []);
	assert.deepEqual(dueEvents(sp, STAGE, 9).map(e => e.type), ['elite', 'boss']);
	assert.deepEqual(dueEvents(sp, STAGE, 20), []);
});

test('ringPosition is on the ring', () => {
	const rng = createRng(3);
	for (let i = 0; i < 20; i++) {
		const p = ringPosition(rng, 100, 50, 300);
		assert.ok(Math.abs(Math.hypot(p.x - 100, p.y - 50) - 300) < 1e-6);
	}
});

test('enemyHp scales over time, except elites and bosses', () => {
	const d = { hpPerMinute: 0.5 };
	assert.equal(enemyHp({ hp: 10 }, 120, d), 20);
	assert.equal(enemyHp({ hp: 10, elite: true }, 120, d), 10);
	assert.equal(enemyHp({ hp: 10, boss: true }, 120, d), 10);
});
