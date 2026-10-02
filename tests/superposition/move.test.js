import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DIRS, opposite, mirrorDir, createMover, step, position } from '../../games/superposition/src/core/move.js';

// A 5x5 open box with a single wall in the middle.
const OPEN = (c, r) => c >= 0 && c < 5 && r >= 0 && r < 5 && !(c === 2 && r === 2);
const COLS = 5;

test('opposite and mirror', () => {
	assert.deepEqual(opposite(DIRS.left), DIRS.right);
	assert.deepEqual(mirrorDir(DIRS.left), DIRS.right);
	assert.deepEqual(mirrorDir(DIRS.up), DIRS.up);
});

test('moves along its direction and reports entered cells', () => {
	const m = createMover(0, 0, DIRS.right);
	const entered = step(m, 2.5, OPEN, COLS);
	assert.deepEqual(entered, [{ col: 1, row: 0 }, { col: 2, row: 0 }]);
	assert.equal(m.col, 2);
	assert.equal(m.t, 0.5);
	assert.deepEqual(position(m), { x: 2.5, y: 0 });
});

test('stops against a wall and keeps facing it', () => {
	const m = createMover(0, 2, DIRS.right);
	step(m, 3, OPEN, COLS);
	assert.equal(m.col, 1);
	assert.equal(m.t, 0);
	assert.equal(m.moving, false);
	assert.deepEqual(m.dir, DIRS.right);
});

test('a buffered turn is taken at the next tile centre where it fits', () => {
	const m = createMover(0, 1, DIRS.right);
	m.want = DIRS.down;
	step(m, 0.5, (c, r) => OPEN(c, r) && !(c === 0 && r === 2), COLS);
	assert.deepEqual(m.dir, DIRS.right, 'blocked at col 0, keeps going');
	step(m, 1, OPEN, COLS);
	assert.deepEqual(m.dir, DIRS.down);
	assert.deepEqual(position(m), { x: 1, y: 1.5 });
});

test('reversing mid-tile is instant', () => {
	const m = createMover(1, 0, DIRS.right);
	step(m, 0.3, OPEN, COLS);
	m.want = DIRS.left;
	step(m, 0.1, OPEN, COLS);
	assert.deepEqual(m.dir, DIRS.left);
	assert.equal(m.col, 2);
	assert.ok(Math.abs(position(m).x - 1.2) < 1e-9);
});

test('columns wrap through side tunnels', () => {
	const m = createMover(0, 0, DIRS.left);
	const tunnel = (c, r) => r === 0;
	const entered = step(m, 1, tunnel, COLS);
	assert.deepEqual(entered, [{ col: 4, row: 0 }]);
});

test('decide is consulted at every tile centre', () => {
	const m = createMover(0, 0, DIRS.right);
	const seen = [];
	step(m, 2, OPEN, COLS, mv => { seen.push(mv.col); });
	assert.deepEqual(seen, [0, 1], 'not at col 2: no distance left to spend');
});
