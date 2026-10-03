import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSfx, validateSfx, Sfx } from '../../shared/sfx.js';

// Just enough of an AudioContext to watch what unlock() does with it.
function fakeAudio(state) {
	const made = [];
	class FakeContext {
		constructor() {
			this.state = state;
			this.sampleRate = 8;
			this.destination = {};
			this.resumed = 0;
			this.started = 0;
			made.push(this);
		}
		createGain() { return { gain: {}, connect() {} }; }
		createBuffer(ch, len) { return { getChannelData: () => new Float32Array(len) }; }
		createBufferSource() { return { connect() {}, start: () => { this.started++; } }; }
		resume() { this.resumed++; return Promise.resolve(); }
	}
	return { FakeContext, made };
}

test('unlock wakes a suspended context from every gesture until it runs', () => {
	const { FakeContext, made } = fakeAudio('suspended');
	globalThis.AudioContext = FakeContext;
	try {
		const sfx = new Sfx({});
		sfx.unlock();
		assert.equal(made.length, 1);
		assert.equal(made[0].resumed, 1, 'asked to start, even on the first gesture');
		assert.equal(made[0].started, 1, 'played a silent sample to unlock iOS');
		sfx.unlock();
		assert.equal(made.length, 1, 'one context only');
		assert.equal(made[0].resumed, 2);
		made[0].state = 'running';
		sfx.unlock();
		assert.equal(made[0].resumed, 2, 'left alone once it is running');
	} finally {
		delete globalThis.AudioContext;
	}
});

test('unlock does nothing more when the context starts out running', () => {
	const { FakeContext, made } = fakeAudio('running');
	globalThis.AudioContext = FakeContext;
	try {
		new Sfx({}).unlock();
		assert.equal(made[0].resumed, 0);
		assert.equal(made[0].started, 0);
	} finally {
		delete globalThis.AudioContext;
	}
});

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
