import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createScore, registerKill, multiplier, tickCombo } from '../../games/midair/src/core/scoring.js';

const CFG = { windowMs: 2000, perStep: 3, maxMult: 3, bullseyeMult: 2 };

test('first kill scores base points at x1', () => {
	const s = createScore();
	assert.equal(registerKill(s, 100, 0, CFG), 100);
	assert.equal(s.score, 100);
	assert.equal(s.combo, 1);
});

test('combo grows the multiplier every perStep kills, capped', () => {
	const s = createScore();
	const pts = [];
	for (let i = 0; i < 10; i++) pts.push(registerKill(s, 10, i * 100, CFG));
	// combos 1..10 -> mult 1,1,2,2,2,3,3,3,3,3 (1 + floor(combo/perStep), cap 3)
	assert.deepEqual(pts, [10, 10, 20, 20, 20, 30, 30, 30, 30, 30]);
	assert.equal(multiplier(s, CFG), 3);
	assert.equal(s.bestCombo, 10);
});

test('combo resets when the window lapses', () => {
	const s = createScore();
	registerKill(s, 10, 0, CFG);
	registerKill(s, 10, 100, CFG);
	registerKill(s, 10, 5000, CFG);
	assert.equal(s.combo, 1);
	assert.equal(s.bestCombo, 2);
});

test('tickCombo clears an expired combo for the HUD', () => {
	const s = createScore();
	registerKill(s, 10, 0, CFG);
	tickCombo(s, 1000, CFG);
	assert.equal(s.combo, 1);
	tickCombo(s, 2500, CFG);
	assert.equal(s.combo, 0);
});

test('bullseye multiplies base before the combo multiplier', () => {
	const s = createScore();
	assert.equal(registerKill(s, 100, 0, CFG, { bullseye: true }), 200);
});
