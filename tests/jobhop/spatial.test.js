import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGrid, clearGrid, insert, queryCircle } from '../../games/jobhop/src/core/spatial.js';

test('queryCircle finds overlapping items across cells, including negative coords', () => {
	const g = createGrid(32);
	const items = [
		{ x: 0, y: 0, radius: 5 },
		{ x: 40, y: 0, radius: 5 },
		{ x: -40, y: -40, radius: 5 },
		{ x: 200, y: 200, radius: 5 },
	];
	items.forEach(i => insert(g, i));
	assert.deepEqual(queryCircle(g, 20, 0, 16), [items[0], items[1]]);
	assert.deepEqual(queryCircle(g, -30, -30, 10), [items[2]]);
	assert.deepEqual(queryCircle(g, 100, 100, 10), []);
	clearGrid(g);
	assert.deepEqual(queryCircle(g, 0, 0, 50), []);
});

test('queryCircle counts item radius, even for items bigger than a cell', () => {
	const g = createGrid(16);
	const big = { x: 100, y: 0, radius: 30 };
	insert(g, big);
	assert.deepEqual(queryCircle(g, 0, 0, 75), [big]);
});
