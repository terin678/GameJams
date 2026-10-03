import { test } from 'node:test';
import assert from 'node:assert/strict';
import { plotOrder, mixColor } from '../../games/beanstalk/src/core/layout.js';

test('plotOrder covers every cell once', () => {
	const order = plotOrder(12, 4);
	assert.equal(order.length, 48);
	assert.equal(new Set(order.map(c => `${c.col},${c.row}`)).size, 48);
});

test('the farm grows outward from the middle of the top row', () => {
	const order = plotOrder(12, 4);
	assert.deepEqual(order[0], { col: 5, row: 0 });
	assert.deepEqual(order[1], { col: 6, row: 0 });
	const first12 = order.slice(0, 12);
	assert.ok(first12.every(c => c.row <= 1 && c.col >= 3 && c.col <= 8), 'the first dozen form a block');
});

test('mixColor blends two hex colours', () => {
	assert.equal(mixColor('#000000', '#ffffff', 0), '#000000');
	assert.equal(mixColor('#000000', '#ffffff', 1), '#ffffff');
	assert.equal(mixColor('#102030', '#304050', 0.5), '#203040');
});
