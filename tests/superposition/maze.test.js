import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMaze, isWall, walkable, mirrorCol, isSymmetric, reachable, key, wrapCol } from '../../games/superposition/src/core/maze.js';

const ROWS = [
	'#######',
	'#o...P#',
	'#.#-#.#',
	' .#G#. ',
	'#..S..#',
	'#######',
];

test('parseMaze finds the start, door, pen, item spawn, dots and pellets', () => {
	const m = parseMaze(ROWS);
	assert.equal(m.cols, 7);
	assert.equal(m.rows, 6);
	assert.deepEqual(m.start, { col: 5, row: 1 });
	assert.deepEqual(m.door, { col: 3, row: 2 });
	assert.deepEqual(m.pen, [{ col: 3, row: 3 }]);
	assert.deepEqual(m.spawn, { col: 3, row: 4 });
	assert.equal(m.pellets.length, 1);
	assert.ok(m.pellets.some(p => p.col === 1 && p.row === 1));
	assert.equal(m.dots.length, 11);
});

test('rows must all be the same width', () => {
	assert.throws(() => parseMaze(['###', '##']), /width/);
});

test('walls, the door and the pen are not walkable; off the top/bottom is a wall', () => {
	const m = parseMaze(ROWS);
	assert.ok(isWall(m, 0, 0));
	assert.ok(isWall(m, 2, -1));
	assert.ok(isWall(m, 2, 99));
	assert.ok(!walkable(m, 3, 2), 'door');
	assert.ok(!walkable(m, 3, 3), 'pen');
	assert.ok(walkable(m, 1, 1));
	assert.ok(walkable(m, 0, 3), 'tunnel mouth');
});

test('columns wrap for side tunnels', () => {
	const m = parseMaze(ROWS);
	assert.equal(wrapCol(m, -1), 6);
	assert.equal(wrapCol(m, 7), 0);
});

test('mirror and symmetry', () => {
	const m = parseMaze(ROWS);
	assert.equal(mirrorCol(m, 1), 5);
	assert.equal(mirrorCol(m, 3), 3);
	assert.ok(isSymmetric(m), 'only walls, door and pen count: o and P are both path');
	assert.ok(!isSymmetric(parseMaze(['##.', '#..'])));
});

test('reachable walks through the side tunnel', () => {
	const m = parseMaze(ROWS);
	const seen = reachable(m, m.start, (c, r) => walkable(m, c, r));
	assert.ok(seen.has(key(m, 0, 3)));
	assert.ok(seen.has(key(m, 6, 3)));
	assert.ok(!seen.has(key(m, 3, 3)), 'pen is sealed');
});
