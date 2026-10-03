import { test } from 'node:test';
import assert from 'node:assert/strict';
import { noteHz, stepSeconds, stepsPerBar, stepOffset, barEvents, validateSong } from '../../shared/music.js';

const SONG = {
	bpm: 60, stepsPerBeat: 4, beatsPerBar: 4, swing: 0.5,
	voices: { keys: { wave: 'triangle' }, kick: { drum: 'kick' } },
	drums: { kick: [0, 8] },
	bars: [
		{ keys: [[0, ['C4', 'E4'], 8], [8, 'A4', 4]] },
		{},
	],
};

test('noteHz reads note names', () => {
	assert.equal(noteHz('A4'), 440);
	assert.equal(noteHz('A3'), 220);
	assert.ok(Math.abs(noteHz('C4') - 261.63) < 0.01);
	assert.ok(Math.abs(noteHz('Bb3') - noteHz('A#3')) < 1e-9);
	assert.equal(noteHz('H2'), null);
	assert.equal(noteHz('C'), null);
});

test('steps divide the beat, and off-steps are swung late', () => {
	assert.equal(stepSeconds(SONG), 0.25);
	assert.equal(stepsPerBar(SONG), 16);
	assert.equal(stepOffset(SONG, 0), 0);
	assert.equal(stepOffset(SONG, 2), 0.5);
	assert.equal(stepOffset(SONG, 1), 0.375);
});

test('barEvents flattens chords and adds the drum pattern to every bar', () => {
	const events = barEvents(SONG, 0);
	assert.deepEqual(events.filter(e => e.voice === 'keys').map(e => [e.step, e.steps, Math.round(e.hz)]),
		[[0, 8, 262], [0, 8, 330], [8, 4, 440]]);
	assert.deepEqual(events.filter(e => e.voice === 'kick').map(e => e.step), [0, 8]);
	assert.deepEqual(barEvents(SONG, 1).map(e => e.voice), ['kick', 'kick']);
	assert.deepEqual(barEvents(SONG, 2), barEvents(SONG, 0), 'the song loops');
});

test('validateSong accepts a good song and explains a bad one', () => {
	assert.deepEqual(validateSong(SONG), []);
	const bad = {
		bpm: 0, stepsPerBeat: 4, beatsPerBar: 4,
		voices: { keys: { wave: 'kazoo' }, boom: { drum: 'gong' } },
		drums: { kick: [0], boom: [99] },
		bars: [{ keys: [[20, 'C4', 2], [0, 'X9', 2], [0, 'C4', 0]], flute: [[0, 'C4', 1]] }],
	};
	const errors = validateSong(bad).join('\n');
	for (const word of ['bpm', 'kazoo', 'gong', 'kick', '99', '20', 'X9', 'length', 'flute']) assert.match(errors, new RegExp(word));
	assert.match(validateSong({ ...SONG, bars: [] }).join(), /bars/);
});
