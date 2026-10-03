import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	createBlight, unlockDue, levelAt, setShare, step, ratio, eating, steadyGrowth, bestShare, validateBlight,
} from '../../games/beanstalk/src/core/blight.js';

const B = {
	unlock: { grown: 1000 }, log: 'Blight.',
	kill: 0.5, eat: 0.05, step: 0.05, maxShare: 0.5, maxRatio: 1,
	levels: [{ grown: 0, drift: 0.001 }, { grown: 1e6, drift: 0.002, log: 'Worse.' }],
};
const state = over => ({ grown: 1000, probes: 1000, blight: { ...createBlight(), open: true }, ...over });

test('the blight arrives once the swarm has grown enough beans', () => {
	assert.equal(unlockDue(state({ grown: 999, blight: createBlight() }), B), false);
	assert.equal(unlockDue(state({ probes: 0, blight: createBlight() }), B), false);
	assert.equal(unlockDue(state({ blight: createBlight() }), B), true);
	assert.equal(unlockDue(state(), B), false);
});

test('planting probes go to seed, and the blighted eat the healthy', () => {
	const s = state();
	assert.equal(step(s, 1, B), null);
	assert.ok(Math.abs(s.blight.amount - 1) < 1e-9, 'one in a thousand turned');
	assert.ok(s.probes < 999 && s.probes > 998.9, `${s.probes}`);
	assert.ok(ratio(s) > 0.0009 && ratio(s) < 0.0011);
	assert.ok(Math.abs(eating(s, B) - ratio(s) * 0.05) < 1e-12);
});

test('guards clear the blight, and fewer probes turn when fewer are planting', () => {
	const idle = state({ blight: { ...createBlight(), open: true, amount: 100 } });
	const guarded = state({ blight: { ...createBlight(), open: true, amount: 100, share: 0.5 } });
	for (let i = 0; i < 20; i++) {
		step(idle, 1, B);
		step(guarded, 1, B);
	}
	assert.ok(idle.blight.amount > 100, 'unguarded, it only grows');
	assert.ok(guarded.blight.amount < 5, `guarded: ${guarded.blight.amount}`);
	assert.ok(guarded.probes > idle.probes);
});

test('the blight never eats the last probe, and never outnumbers the swarm by much', () => {
	const s = state({ probes: 3, blight: { ...createBlight(), open: true, amount: 1e6 } });
	for (let i = 0; i < 100; i++) step(s, 1, B);
	assert.equal(s.probes, 1);
	assert.ok(s.blight.amount <= 1 + 1e-9);
	assert.equal(step(state({ probes: 0 }), 1, B), null);
});

test('the guard share moves in steps between none and the limit', () => {
	const s = state();
	assert.equal(setShare(s, -1, B), false);
	assert.equal(setShare(s, 1, B), true);
	assert.equal(s.blight.share, 0.05);
	for (let i = 0; i < 20; i++) setShare(s, 1, B);
	assert.equal(s.blight.share, 0.5);
	assert.equal(setShare(s, 1, B), false);
	assert.equal(setShare(s, -1, B), true);
	assert.equal(s.blight.share, 0.45);
	assert.equal(setShare(state({ blight: createBlight() }), 1, B), false, 'not before it arrives');
});

test('the blight adapts as the beans pile up, once per level', () => {
	assert.equal(levelAt(0, B), 0);
	assert.equal(levelAt(1e6, B), 1);
	const s = state({ grown: 1e6 });
	assert.deepEqual(step(s, 0.1, B), B.levels[1]);
	assert.equal(s.blight.level, 1);
	assert.equal(step(s, 0.1, B), null);
});

test('some guards beat none, and too many beat nobody: the best split is in between', () => {
	const level = B.levels[0];
	const r = 0.01;
	const none = steadyGrowth(0, r, level, B);
	const some = steadyGrowth(0.1, r, level, B);
	const all = steadyGrowth(0.5, r, level, B);
	assert.ok(some > none && some > all, `${none} ${some} ${all}`);
	const best = bestShare(r, level, B);
	assert.ok(best > 0 && best < 0.5, `${best}`);
	assert.ok(bestShare(r, B.levels[1], B) >= best, 'a worse blight wants at least as many guards');
	// What the sum predicts is what happens.
	const s = state({ probes: 1e6, blight: { ...createBlight(), open: true, share: best } });
	let before = 0;
	for (let t = 0; t < 600; t++) {
		if (t === 500) before = s.probes;
		s.probes += s.probes * (1 - best) * (Math.exp(r) - 1);
		step(s, 1, B);
	}
	const measured = Math.log(s.probes / before) / 100;
	assert.ok(Math.abs(measured - steadyGrowth(best, r, level, B)) < 0.0005, `${measured} vs ${steadyGrowth(best, r, level, B)}`);
});

test('validateBlight accepts good data and explains bad data', () => {
	assert.deepEqual(validateBlight(B), []);
	const bad = { unlock: {}, kill: 0, eat: 0, step: 1, maxShare: 1, maxRatio: 0, levels: [{ grown: 5, drift: 0.01 }, { grown: 5, drift: 0.01 }] };
	const errors = validateBlight(bad).join('\n');
	for (const word of ['unlock.grown', 'log is', 'kill', 'eat', 'step', 'maxShare', 'maxRatio', 'first level', 'climb in grown', 'drift more', 'level at 5: log']) {
		assert.match(errors, new RegExp(word), word);
	}
});
