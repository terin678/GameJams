import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../../shared/rng.js';

test('same seed gives the same sequence', () => {
	const a = createRng(42), b = createRng(42);
	for (let i = 0; i < 20; i++) assert.equal(a.next(), b.next());
});

test('different seeds diverge', () => {
	const a = createRng(1), b = createRng(2);
	assert.notEqual(a.next(), b.next());
});

test('next() stays in [0, 1)', () => {
	const r = createRng(7);
	for (let i = 0; i < 1000; i++) {
		const v = r.next();
		assert.ok(v >= 0 && v < 1, `out of range: ${v}`);
	}
});

test('range and pick', () => {
	const r = createRng(3);
	for (let i = 0; i < 200; i++) {
		const v = r.range(5, 10);
		assert.ok(v >= 5 && v < 10);
	}
	const items = ['a', 'b', 'c'];
	for (let i = 0; i < 50; i++) assert.ok(items.includes(r.pick(items)));
});
