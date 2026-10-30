import { test } from 'node:test';
import assert from 'node:assert/strict';
import { progress, easeOutCubic, easeOutBack, swingSpan, thrustReach, bob, squash, chase } from '../../games/jobhop/src/core/anim.js';

const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, `${msg ?? ''} ${a} != ${b}`);

test('progress runs 0 to 1 over the span and clamps outside it', () => {
	assert.equal(progress(100, 100, 300), 0);
	assert.equal(progress(200, 100, 300), 0.5);
	assert.equal(progress(900, 100, 300), 1);
	assert.equal(progress(50, 100, 300), 0);
	assert.equal(progress(5, 5, 5), 1, 'a zero-length span is already done');
});

test('eases start at 0 and land on 1; Back overshoots on the way', () => {
	for (const ease of [easeOutCubic, easeOutBack]) {
		near(ease(0), 0);
		near(ease(1), 1);
	}
	assert.ok(easeOutBack(0.7) > 1, 'Back overshoots');
	assert.ok(easeOutCubic(0.5) > 0.5, 'out-eases are fast first');
});

test('a swing sweeps from one edge of the arc to the other, then holds', () => {
	const arc = Math.PI / 2;
	const start = swingSpan(0, arc, 0);
	near(start.from, -Math.PI / 4);
	near(start.to, -Math.PI / 4, 'nothing swept yet');
	const done = swingSpan(0, arc, 0.55);
	near(done.to, Math.PI / 4);
	near(swingSpan(0, arc, 1).to, Math.PI / 4, 'holds after the sweep');
	assert.ok(swingSpan(0, arc, 0.2).to < done.to);
});

test('a thrust reaches full length early and holds', () => {
	assert.equal(thrustReach(0), 0);
	assert.equal(thrustReach(0.4), 1);
	assert.equal(thrustReach(1), 1);
});

test('bob is a bounce: never below the ground, peaks at amp', () => {
	const samples = Array.from({ length: 50 }, (_, i) => bob(i * 13, 0, 280, 2));
	assert.ok(samples.every(v => v >= 0 && v <= 2));
	near(bob(140, 0, 280, 2), 2, 'peak mid-period');
	assert.equal(bob(0, 0, 280, 0), 0);
});

test('squash springs back to 1 by the deadline', () => {
	assert.deepEqual(squash(100, 100, 120, 0.25), { x: 1, y: 1 });
	const s = squash(0, 120, 120, 0.25);
	near(s.x, 1.25);
	near(s.y, 0.75);
	const half = squash(60, 120, 120, 0.25);
	assert.ok(half.x > 1 && half.x < 1.25);
});

test('chase drains a trailing bar toward the target and snaps up on heals', () => {
	near(chase(1, 0.5, 0.1, 1), 0.9);
	assert.equal(chase(0.55, 0.5, 0.1, 1), 0.5, 'never undershoots');
	assert.equal(chase(0.3, 0.8, 0.1, 1), 0.8, 'heals show at once');
});
