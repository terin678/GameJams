// Synthesized sound effects, see shared/sfx.js for the format.
export const SOUNDS = {
	eatA: { wave: 'triangle', f0: 520, f1: 780, dur: 0.06, vol: 0.12 },
	eatB: { wave: 'triangle', f0: 780, f1: 520, dur: 0.06, vol: 0.12 },
	measure: { wave: 'square', notes: [330, 440, 554, 660], dur: 0.35, vol: 0.18 },
	tunnel: { wave: 'sine', f0: 200, f1: 1200, dur: 0.5, vol: 0.25 },
	split: { wave: 'triangle', notes: [523, 1047, 523, 1047, 784], dur: 0.45, vol: 0.22 },
	collapse: { wave: 'sawtooth', f0: 900, f1: 120, dur: 0.4, vol: 0.2 },
	observed: { wave: 'triangle', notes: [880, 440], dur: 0.25, vol: 0.2 },
	eatObserver: { wave: 'square', f0: 200, f1: 1600, dur: 0.25, vol: 0.2 },
	death: { wave: 'sawtooth', f0: 700, f1: 60, dur: 1.2, vol: 0.25 },
	item: { wave: 'sine', notes: [1047, 1319, 1568], dur: 0.3, vol: 0.18 },
	powerdown: { wave: 'triangle', notes: [660, 440, 330], dur: 0.3, vol: 0.15 },
	levelClear: { wave: 'square', notes: [523, 659, 784, 1047, 784, 1047], dur: 0.9, vol: 0.2 },
	start: { wave: 'triangle', notes: [262, 392, 330, 523], dur: 0.6, vol: 0.2 },
	extraLife: { wave: 'triangle', notes: [784, 988, 1175, 1568], dur: 0.5, vol: 0.22 },
	select: { wave: 'square', f0: 660, dur: 0.05, vol: 0.1 },
};
