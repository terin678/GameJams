import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMeters, tickMeters, damage, feed, trySpend, isDead } from '../../games/midair/src/core/meters.js';

const CFG = { energyMax: 100, gutMax: 80, energyDrain: 2, gutRegen: 10 };

test('meters start full', () => {
	const m = createMeters(CFG);
	assert.equal(m.energy, 100);
	assert.equal(m.gut, 80);
});

test('energy drains and gut regenerates over time, clamped', () => {
	const m = createMeters(CFG);
	m.gut = 0;
	tickMeters(m, 1.5, CFG);
	assert.equal(m.energy, 97);
	assert.equal(m.gut, 15);
	tickMeters(m, 100, CFG);
	assert.equal(m.gut, 80, 'gut caps at max');
	assert.equal(m.energy, 0, 'energy floors at zero');
});

test('damage clamps at zero and kills', () => {
	const m = createMeters(CFG);
	damage(m, 30);
	assert.equal(m.energy, 70);
	assert.equal(isDead(m), false);
	damage(m, 999);
	assert.equal(m.energy, 0);
	assert.equal(isDead(m), true);
});

test('feed restores both meters, clamped', () => {
	const m = createMeters(CFG);
	m.energy = 50; m.gut = 10;
	feed(m, { energy: 20, gut: 200 });
	assert.equal(m.energy, 70);
	assert.equal(m.gut, 80);
	feed(m, {});
	assert.equal(m.energy, 70, 'missing fields are no-ops');
});

test('trySpend only spends when affordable', () => {
	const m = createMeters(CFG);
	m.gut = 25;
	assert.equal(trySpend(m, 20), true);
	assert.equal(m.gut, 5);
	assert.equal(trySpend(m, 20), false);
	assert.equal(m.gut, 5, 'failed spend leaves gut alone');
});
