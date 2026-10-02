import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reticleFor, charge, bombProgress, splashTargets, isBullseye, bombDamage } from '../../games/midair/src/core/bombing.js';

const CFG = { offset: 100, fallMs: 600, baseRadius: 20, maxRadius: 60, baseCost: 20, maxCost: 50, chargeMs: 1000, bullseyeFrac: 0.25 };

test('reticle sits straight ahead of the bird', () => {
	assert.deepEqual(reticleFor({ x: 200, y: 500 }, CFG), { x: 200, y: 400 });
});

test('charge interpolates radius and cost, clamped to full', () => {
	assert.deepEqual(charge(0, CFG), { t: 0, radius: 20, cost: 20 });
	assert.deepEqual(charge(500, CFG), { t: 0.5, radius: 40, cost: 35 });
	assert.deepEqual(charge(5000, CFG), { t: 1, radius: 60, cost: 50 });
	assert.deepEqual(charge(-10, CFG), { t: 0, radius: 20, cost: 20 });
});

test('bombProgress goes 0..1 over the fall time', () => {
	assert.equal(bombProgress(0, CFG), 0);
	assert.equal(bombProgress(300, CFG), 0.5);
	assert.equal(bombProgress(9999, CFG), 1);
});

test('splashTargets finds targets inside radius (plus their size), nearest first', () => {
	const targets = [
		{ id: 'far', x: 100, y: 0, r: 5 },
		{ id: 'edge', x: 28, y: 0, r: 10 },
		{ id: 'center', x: 2, y: 0, r: 10 },
		{ id: 'miss', x: 40, y: 0, r: 5 },
	];
	const hits = splashTargets({ x: 0, y: 0 }, 20, targets);
	assert.deepEqual(hits.map(h => h.target.id), ['center', 'edge']);
	assert.equal(hits[0].dist, 2);
});

test('splashTargets skips dead targets', () => {
	const hits = splashTargets({ x: 0, y: 0 }, 20, [{ x: 0, y: 0, r: 5, dead: true }]);
	assert.equal(hits.length, 0);
});

test('bombDamage scales with charge', () => {
	const cfg = { ...CFG, damage: 3, chargeDamage: 1.5 };
	assert.equal(bombDamage(0, cfg), 3);
	assert.equal(bombDamage(1, cfg), 7.5);
	assert.equal(bombDamage(0.5, cfg), 5.25);
});

test('bullseye is a centred hit', () => {
	assert.equal(isBullseye(4, 20, CFG), true);
	assert.equal(isBullseye(6, 20, CFG), false);
});
