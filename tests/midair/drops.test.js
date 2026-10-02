import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rollDrop } from '../../games/midair/src/core/drops.js';
import { circlesOverlap } from '../../games/midair/src/core/collide.js';

const fixed = v => ({ next: () => v });

test('rollDrop walks the table cumulatively', () => {
	const table = [{ pickup: 'fries', chance: 0.2 }, { pickup: 'chili', chance: 0.1 }];
	assert.equal(rollDrop(table, fixed(0.1)), 'fries');
	assert.equal(rollDrop(table, fixed(0.25)), 'chili');
	assert.equal(rollDrop(table, fixed(0.5)), null);
});

test('rollDrop handles missing tables', () => {
	assert.equal(rollDrop(undefined, fixed(0)), null);
	assert.equal(rollDrop([], fixed(0)), null);
});

test('rollDrop scales chances with a luck factor', () => {
	const table = [{ pickup: 'fries', chance: 0.2 }];
	assert.equal(rollDrop(table, fixed(0.3), 2), 'fries');
});

test('circlesOverlap', () => {
	assert.equal(circlesOverlap({ x: 0, y: 0, r: 5 }, { x: 9, y: 0, r: 5 }), true);
	assert.equal(circlesOverlap({ x: 0, y: 0, r: 5 }, { x: 10, y: 0, r: 5 }), false, 'touching is not overlapping');
	assert.equal(circlesOverlap({ x: 0, y: 0, r: 5 }, { x: 6, y: 6, r: 5 }), true);
});
