// The background tune: slow, swung, a little worn. See shared/music.js for the format.
// Eight bars in C major. A bar is 16 steps; each note is [step, note or chord, length].

const comp = chord => [[0, chord, 9], [10, chord, 4]];
const bass = note => [[0, note, 6], [10, note, 3]];

export const MUSIC = {
	bpm: 72,
	stepsPerBeat: 4,
	beatsPerBar: 4,
	swing: 0.18,
	volume: 0.55,
	lowpass: 2600,         // rolls the top off everything
	crackle: 0.05,
	voices: {
		keys: { wave: 'triangle', attack: 0.03, release: 0.9, vol: 0.05, detune: 7, lowpass: 1500 },
		bass: { wave: 'sine', attack: 0.02, release: 0.25, vol: 0.2 },
		lead: { wave: 'sine', attack: 0.04, release: 0.7, vol: 0.07, detune: 4 },
		kick: { drum: 'kick', vol: 0.28 },
		snare: { drum: 'snare', vol: 0.06 },
		hat: { drum: 'hat', vol: 0.025 },
	},
	drums: {
		kick: [0, 7, 10],
		snare: [4, 12],
		hat: [0, 2, 4, 6, 8, 10, 12, 14, 15],
	},
	bars: [
		{ keys: comp(['F3', 'A3', 'C4', 'E4']), bass: bass('F2'), lead: [[8, 'A4', 3], [12, 'G4', 4]] },
		{ keys: comp(['E3', 'G3', 'B3', 'D4']), bass: bass('E2'), lead: [[6, 'E4', 6]] },
		{ keys: comp(['D3', 'F3', 'A3', 'C4']), bass: bass('D2'), lead: [[4, 'D4', 2], [6, 'F4', 2], [8, 'A4', 6]] },
		{ keys: comp(['C3', 'E3', 'G3', 'B3']), bass: bass('C2'), lead: [[8, 'G4', 4], [12, 'E4', 4]] },
		{ keys: comp(['F3', 'A3', 'C4', 'E4']), bass: bass('F2'), lead: [[2, 'C5', 4], [8, 'A4', 2], [10, 'G4', 4]] },
		{ keys: comp(['G3', 'B3', 'D4', 'E4']), bass: bass('G2'), lead: [[4, 'D5', 3], [8, 'B4', 6]] },
		{ keys: comp(['A3', 'C4', 'E4', 'G4']), bass: bass('A2'), lead: [[0, 'C5', 2], [2, 'A4', 4], [10, 'G4', 2], [12, 'E4', 4]] },
		{ keys: comp(['G3', 'C4', 'D4']), bass: bass('G2'), lead: [[4, 'D4', 8]] },
	],
};
