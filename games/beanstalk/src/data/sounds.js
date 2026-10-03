// Synthesized sound effects, see shared/sfx.js for the format.
export const SOUNDS = {
	plant: { wave: 'triangle', f0: 220, f1: 160, dur: 0.07, vol: 0.14 },
	harvest: { wave: 'triangle', f0: 520, f1: 780, dur: 0.07, vol: 0.14 },
	buy: { wave: 'square', notes: [523, 784], dur: 0.14, vol: 0.14 },
	deny: { wave: 'square', f0: 140, dur: 0.06, vol: 0.08 },
	price: { wave: 'square', f0: 660, dur: 0.04, vol: 0.08 },
	milestone: { wave: 'triangle', notes: [659, 784, 988], dur: 0.35, vol: 0.18 },
	phase: { wave: 'triangle', notes: [262, 330, 392, 523, 659, 784], dur: 1.1, vol: 0.22 },
	season: { wave: 'sine', notes: [440, 554], dur: 0.3, vol: 0.12 },
	rain: { wave: 'noise', f0: 3000, f1: 600, dur: 0.6, vol: 0.1 },
	crow: { wave: 'sawtooth', notes: [520, 400, 520, 380], dur: 0.35, vol: 0.14 },
	meet: { wave: 'triangle', notes: [392, 523, 659], dur: 0.3, vol: 0.16 },
	love: { wave: 'sine', notes: [659, 784, 1047, 1319], dur: 0.4, vol: 0.18 },
	like: { wave: 'sine', notes: [523, 659], dur: 0.2, vol: 0.15 },
	neutral: { wave: 'sine', f0: 440, dur: 0.12, vol: 0.12 },
	dislike: { wave: 'triangle', notes: [330, 262], dur: 0.25, vol: 0.14 },
	heart: { wave: 'triangle', notes: [523, 659, 784, 1047, 1319], dur: 0.6, vol: 0.2 },
	cross: { wave: 'triangle', notes: [330, 392, 494], dur: 0.25, vol: 0.14 },
	raid: { wave: 'square', notes: [330, 262, 330, 262], dur: 0.4, vol: 0.14 },
	stomp: { wave: 'noise', f0: 400, f1: 40, dur: 0.9, vol: 0.5 },
	ending: { wave: 'sine', notes: [523, 392, 330, 262, 196, 262], dur: 2.4, vol: 0.25 },
};

// Which sound plays for each kind of event from core/sim.js tick().
// Weather sounds are looked up by the weather's id.
export const EVENT_SOUNDS = {
	milestone: 'milestone',
	phase: 'phase',
	season: 'season',
	crow: 'crow',
	meet: 'meet',
	seeds: 'meet',
	climb: 'meet',
	ledge: 'milestone',
	guard: 'meet',
	exchange: 'meet',
	raid: 'raid',
	raidEnd: { won: 'milestone', lost: 'dislike' },
	fair: { won: 'heart', lost: 'dislike' },
	full: 'milestone',
	weather: { rain: 'rain' },
};
