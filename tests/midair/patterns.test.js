import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PATTERNS, positionAt, isOffscreen } from '../../games/midair/src/core/patterns.js';

const BASE = { x0: 200, speed: 100, width: 480, height: 640 };
const near = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;

test('straight enters from above and moves down at speed', () => {
	const a = positionAt('straight', 0, BASE);
	const b = positionAt('straight', 1, BASE);
	assert.ok(a.y < 0, 'starts above the screen');
	assert.equal(b.y - a.y, 100);
	assert.equal(a.x, 200);
	assert.equal(positionAt('straight', 1, { ...BASE, vx: 30 }).x, 230, 'optional drift');
});

test('sine weaves around x0 within amp', () => {
	const p = { ...BASE, amp: 50, freq: 2 };
	for (let t = 0; t < 5; t += 0.1) {
		const { x } = positionAt('sine', t, p);
		assert.ok(x >= 150 - 1e-9 && x <= 250 + 1e-9);
	}
	assert.ok(near(positionAt('sine', 0, p).x, 200));
});

test('swoop curves toward dir and ends displaced', () => {
	const right = positionAt('swoop', 1.5, { ...BASE, amp: 120, freq: 2, dir: 1 });
	const left = positionAt('swoop', 1.5, { ...BASE, amp: 120, freq: 2, dir: -1 });
	assert.ok(right.x > 200);
	assert.ok(left.x < 200);
});

test('uturn dives in then climbs back out', () => {
	const p = { ...BASE, depth: 300, dur: 4 };
	const mid = positionAt('uturn', 2, p);
	const late = positionAt('uturn', 3.5, p);
	const end = positionAt('uturn', 4.2, p);
	assert.ok(near(mid.y, 300 - 40), 'deepest point at dur/2');
	assert.ok(late.y < mid.y, 'climbing back');
	assert.ok(end.y < 0, 'leaves off the top');
});

test('side crosses horizontally from the side given by dir', () => {
	const p = { ...BASE, y0: 120, dir: 1 };
	const a = positionAt('side', 0, p);
	const b = positionAt('side', 1, p);
	assert.ok(a.x < 0);
	assert.equal(b.x - a.x, 100);
	const q = positionAt('side', 0, { ...p, dir: -1 });
	assert.ok(q.x > 480);
});

test('hover descends to targetY and stays, swaying', () => {
	const p = { ...BASE, targetY: 150, amp: 60 };
	const settled = [10, 20, 30].map(t => positionAt('hover', t, p));
	for (const s of settled) {
		assert.equal(s.y, 150);
		assert.ok(Math.abs(s.x - 240) <= 60 + 1e-9, 'sways around centre');
	}
	assert.ok(positionAt('hover', 0, p).y < 0);
});

test('unknown pattern throws', () => {
	assert.throws(() => positionAt('loop-de-loop', 0, BASE), /loop-de-loop/);
});

test('every pattern is a function', () => {
	for (const [name, fn] of Object.entries(PATTERNS)) assert.equal(typeof fn, 'function', name);
});

test('isOffscreen uses a margin around the playfield', () => {
	assert.equal(isOffscreen({ x: 10, y: 10 }, 480, 640, 40), false);
	assert.equal(isOffscreen({ x: -30, y: 10 }, 480, 640, 40), false);
	assert.equal(isOffscreen({ x: -50, y: 10 }, 480, 640, 40), true);
	assert.equal(isOffscreen({ x: 10, y: 700 }, 480, 640, 40), true);
});
