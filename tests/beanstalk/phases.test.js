import { test } from 'node:test';
import assert from 'node:assert/strict';
import { heightFor, phaseAt, crossed, stalkFrac } from '../../games/beanstalk/src/core/phases.js';

const H = { points: [[10, 1], [1000, 100], [1e9, 1e5]] };

test('heightFor passes through its points, straight on a log-log chart between them', () => {
	const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9 * Math.max(1, b), `${a} vs ${b}`);
	assert.equal(heightFor(0, H), 0);
	near(heightFor(5, H), 0.5);
	near(heightFor(10, H), 1);
	near(heightFor(100, H), 10);
	near(heightFor(1000, H), 100);
	near(heightFor(1e6, H), Math.sqrt(100 * 1e5));
	near(heightFor(1e9, H), 1e5);
	assert.equal(heightFor(1e20, H), 1e5, 'flat past the last point');
	assert.ok(heightFor(101, H) > heightFor(100, H));
});

test('phaseAt is the last phase whose height has been reached', () => {
	const phases = [{ id: 1, height: 0 }, { id: 2, height: 100 }, { id: 3, height: 5000 }];
	assert.equal(phaseAt(0, phases).id, 1);
	assert.equal(phaseAt(100, phases).id, 2);
	assert.equal(phaseAt(1e9, phases).id, 3);
});

test('crossed lists the milestones passed in one step, lowest first', () => {
	const ms = [{ id: 'a', height: 10 }, { id: 'b', height: 20 }, { id: 'c', height: 30 }];
	assert.deepEqual(crossed(5, 25, ms).map(m => m.id), ['a', 'b']);
	assert.deepEqual(crossed(10, 20, ms).map(m => m.id), ['b']);
	assert.deepEqual(crossed(30, 40, ms), []);
});

test('stalkFrac places a height on screen between landmarks, on a log scale', () => {
	const marks = [{ height: 1, y: 0 }, { height: 100, y: 0.5 }, { height: 1e6, y: 1 }];
	assert.equal(stalkFrac(0, marks), 0);
	assert.equal(stalkFrac(1, marks), 0);
	assert.ok(Math.abs(stalkFrac(10, marks) - 0.25) < 1e-9);
	assert.equal(stalkFrac(100, marks), 0.5);
	assert.ok(Math.abs(stalkFrac(1e4, marks) - 0.75) < 1e-9);
	assert.equal(stalkFrac(1e30, marks), 1);
});
