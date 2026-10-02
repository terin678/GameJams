import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPower, collect, tickPower, remaining, levelDef } from '../../games/midair/src/core/power.js';

const CFG = { durationMs: 10000, maxLevel: 3 };

test('starts as the default form at level 1, never expiring', () => {
	const p = createPower('pigeon');
	assert.deepEqual({ form: p.form, level: p.level }, { form: 'pigeon', level: 1 });
	assert.equal(tickPower(p, 1e9, 'pigeon'), false);
	assert.equal(remaining(p, 1e9), Infinity);
});

test('collecting a new form swaps to it and starts the timer', () => {
	const p = createPower('pigeon');
	assert.equal(collect(p, 'mallard', 1000, CFG), 'swap');
	assert.equal(p.form, 'mallard');
	assert.equal(p.level, 1);
	assert.equal(remaining(p, 3000), 8000);
});

test('collecting the same form levels up to the cap and refreshes the timer', () => {
	const p = createPower('pigeon');
	collect(p, 'mallard', 0, CFG);
	assert.equal(collect(p, 'mallard', 5000, CFG), 'levelup');
	assert.equal(p.level, 2);
	assert.equal(remaining(p, 5000), 10000);
	assert.equal(collect(p, 'mallard', 6000, CFG), 'levelup');
	assert.equal(collect(p, 'mallard', 7000, CFG), 'max');
	assert.equal(p.level, 3);
});

test('swapping keeps your level', () => {
	const p = createPower('pigeon');
	collect(p, 'mallard', 0, CFG);
	collect(p, 'mallard', 0, CFG);
	collect(p, 'eider', 0, CFG);
	assert.deepEqual({ form: p.form, level: p.level }, { form: 'eider', level: 2 });
});

test('a form expires back to the default at level 1', () => {
	const p = createPower('pigeon');
	collect(p, 'mallard', 0, CFG);
	collect(p, 'mallard', 0, CFG);
	assert.equal(tickPower(p, 9999, 'pigeon'), false);
	assert.equal(tickPower(p, 10000, 'pigeon'), true);
	assert.deepEqual({ form: p.form, level: p.level }, { form: 'pigeon', level: 1 });
	assert.equal(remaining(p, 10000), Infinity);
});

test('levelDef clamps to the levels a form actually has', () => {
	const form = { levels: [{ id: 1 }, { id: 2 }] };
	assert.equal(levelDef(form, 1).id, 1);
	assert.equal(levelDef(form, 3).id, 2);
	assert.equal(levelDef(form, 0).id, 1);
});
