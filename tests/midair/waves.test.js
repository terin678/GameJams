import { test } from 'node:test';
import assert from 'node:assert/strict';
import { expandWave, buildStage, createCursor, takeDue, isDone, difficulty } from '../../games/midair/src/core/waves.js';

test('expandWave defaults to one spawn', () => {
	const s = expandWave({ t: 2, type: 'prop', pattern: 'straight', x: 100 });
	assert.equal(s.length, 1);
	assert.deepEqual(s[0], { t: 2, type: 'prop', pattern: 'straight', x: 100, params: {} });
});

test('expandWave staggers count by gap and dx', () => {
	const s = expandWave({ t: 1, type: 'prop', pattern: 'sine', x: 100, count: 3, gap: 0.5, dx: 40, params: { amp: 20 } });
	assert.deepEqual(s.map(e => e.t), [1, 1.5, 2]);
	assert.deepEqual(s.map(e => e.x), [100, 140, 180]);
	assert.deepEqual(s[2].params, { amp: 20 });
	assert.notEqual(s[0].params, s[1].params, 'params are copied per spawn');
});

test('buildStage flattens and sorts by time', () => {
	const spawns = buildStage([
		{ t: 5, type: 'b', pattern: 'straight', x: 0 },
		{ t: 1, type: 'a', pattern: 'straight', x: 0, count: 2, gap: 10 },
	]);
	assert.deepEqual(spawns.map(s => `${s.type}@${s.t}`), ['a@1', 'b@5', 'a@11']);
	assert.deepEqual(Object.keys(spawns[0]).sort(), ['params', 'pattern', 't', 'type', 'wave', 'waveSize', 'x']);
});

test('buildStage tags spawns with their wave index, size and reward', () => {
	const spawns = buildStage([
		{ t: 0, type: 'a', pattern: 'straight', x: 0, count: 2, reward: 'feather' },
		{ t: 5, type: 'b', pattern: 'straight', x: 0 },
	]);
	assert.deepEqual(spawns.map(s => [s.wave, s.waveSize, s.reward]), [[0, 2, 'feather'], [0, 2, 'feather'], [1, 1, undefined]]);
});

test('cursor yields each spawn exactly once when due', () => {
	const c = createCursor(buildStage([
		{ t: 1, type: 'a', pattern: 'straight', x: 0 },
		{ t: 2, type: 'b', pattern: 'straight', x: 0 },
		{ t: 2, type: 'c', pattern: 'straight', x: 0 },
	]));
	assert.deepEqual(takeDue(c, 0.5), []);
	assert.deepEqual(takeDue(c, 1).map(s => s.type), ['a']);
	assert.deepEqual(takeDue(c, 1.5), []);
	assert.equal(isDone(c), false);
	assert.deepEqual(takeDue(c, 3).map(s => s.type), ['b', 'c']);
	assert.equal(isDone(c), true);
	assert.deepEqual(takeDue(c, 99), []);
});

test('difficulty ramps per loop', () => {
	const d0 = difficulty(0), d2 = difficulty(2);
	assert.deepEqual(d0, { hp: 1, speed: 1, fire: 1 });
	assert.ok(d2.hp > 1 && d2.speed > 1 && d2.fire > 1);
	assert.ok(difficulty(3).speed > d2.speed);
});
