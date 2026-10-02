import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSfx, validateSfx } from '../../shared/sfx.js';

test('normalizeSfx fills defaults', () => {
	const s = normalizeSfx({ wave: 'square', f0: 440 });
	assert.equal(s.f1, 440, 'no sweep by default');
	assert.ok(s.dur > 0);
	assert.ok(s.vol > 0 && s.vol <= 1);
	assert.deepEqual(s.notes, null);
});

test('validateSfx accepts good definitions', () => {
	assert.deepEqual(validateSfx({ wave: 'noise', f0: 800, f1: 100, dur: 0.2, vol: 0.4 }), []);
	assert.deepEqual(validateSfx({ wave: 'triangle', notes: [440, 660, 880], dur: 0.3 }), []);
});

test('validateSfx flags bad definitions', () => {
	assert.ok(validateSfx({ wave: 'kazoo', f0: 100 }).length > 0);
	assert.ok(validateSfx({ wave: 'square' }).length > 0, 'needs f0 or notes');
	assert.ok(validateSfx({ wave: 'square', f0: 100, vol: 3 }).length > 0);
	assert.ok(validateSfx({ wave: 'square', f0: 100, dur: 0 }).length > 0);
});
