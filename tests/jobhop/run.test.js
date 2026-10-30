import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRun, tickRun, startBoss, endRun, formatTime, runScore } from '../../games/jobhop/src/core/run.js';

test('the run clock ticks while playing or fighting the boss, then stops', () => {
	const r = createRun();
	tickRun(r, 1.5);
	startBoss(r);
	assert.equal(r.phase, 'boss');
	tickRun(r, 1);
	endRun(r, true);
	tickRun(r, 5);
	assert.equal(r.t, 2.5);
	assert.equal(r.phase, 'won');
});

test('endRun only ends once', () => {
	const r = createRun();
	endRun(r, false);
	endRun(r, true);
	assert.equal(r.phase, 'lost');
});

test('formatTime', () => {
	assert.equal(formatTime(0), '00:00');
	assert.equal(formatTime(65.9), '01:05');
	assert.equal(formatTime(600), '10:00');
});

test('runScore is whole seconds survived plus a win bonus', () => {
	const r = createRun();
	tickRun(r, 100.7);
	assert.equal(runScore(r, 300), 100);
	endRun(r, true);
	assert.equal(runScore(r, 300), 400);
});
