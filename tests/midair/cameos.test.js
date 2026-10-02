import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCameos, dueCameos } from '../../games/midair/src/core/cameos.js';

const DEFS = {
	truck: { firstMs: 1000, everyMs: [5000, 5000] },
	ufo: { firstMs: 3000, everyMs: [2000, 4000] },
};
const rng = { next: () => 0, range: (a) => a };

test('nothing is due before firstMs', () => {
	const c = createCameos(DEFS);
	assert.deepEqual(dueCameos(c, DEFS, 999, rng), []);
});

test('a due cameo fires once and is rescheduled', () => {
	const c = createCameos(DEFS);
	assert.deepEqual(dueCameos(c, DEFS, 1000, rng), ['truck']);
	assert.deepEqual(dueCameos(c, DEFS, 1001, rng), []);
	assert.equal(c.truck, 6000);
	assert.ok(dueCameos(c, DEFS, 6000, rng).includes('truck'));
});

test('while blocked nothing fires, and it fires as soon as it is clear', () => {
	const c = createCameos(DEFS);
	assert.deepEqual(dueCameos(c, DEFS, 5000, rng, { blocked: true }), []);
	assert.deepEqual(dueCameos(c, DEFS, 5001, rng), ['truck', 'ufo']);
});
