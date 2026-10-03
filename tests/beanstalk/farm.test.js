import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFarm, resize, grow, tendOnce, eatOne, counts, stageOf } from '../../games/beanstalk/src/core/farm.js';
import { createRng } from '../../shared/rng.js';

test('a new farm is empty plots', () => {
	assert.deepEqual(createFarm(3), [null, null, null]);
	assert.deepEqual(counts(createFarm(3)), { empty: 3, growing: 0, ripe: 0 });
});

test('tending plants an empty plot, and does nothing while everything grows', () => {
	const plots = createFarm(2);
	assert.equal(tendOnce(plots), 'plant');
	assert.deepEqual(plots, [0, null]);
	assert.equal(tendOnce(plots), 'plant');
	assert.equal(tendOnce(plots), null);
});

test('growth only touches planted plots and stops at ripe', () => {
	const plots = [0, null, 0.9];
	grow(plots, 0.5);
	assert.deepEqual(plots, [0.5, null, 1]);
	assert.deepEqual(counts(plots), { empty: 1, growing: 1, ripe: 1 });
});

test('tending prefers a ripe plot: harvests it and replants in one go', () => {
	const plots = [null, 1, 0.3];
	assert.equal(tendOnce(plots), 'harvest');
	assert.deepEqual(plots, [null, 0, 0.3]);
});

test('resize adds plots and never removes them', () => {
	const plots = [0.5];
	resize(plots, 3);
	assert.deepEqual(plots, [0.5, null, null]);
	resize(plots, 1);
	assert.equal(plots.length, 3);
});

test('a crow eats one planted plot, or nothing if the farm is bare', () => {
	const rng = createRng(1);
	assert.equal(eatOne(createFarm(2), rng), -1);
	const plots = [null, 0.4, null];
	assert.equal(eatOne(plots, rng), 1);
	assert.deepEqual(plots, [null, null, null]);
});

test('stageOf maps growth onto sprite frames, the last one only when ripe', () => {
	assert.equal(stageOf(null, 4), -1);
	assert.equal(stageOf(0, 4), 0);
	assert.equal(stageOf(0.5, 4), 1);
	assert.equal(stageOf(0.99, 4), 2);
	assert.equal(stageOf(1, 4), 3);
});
