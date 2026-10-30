// The one stage. Windows spawn continuously while active (seconds); `max` caps
// how many of that type can be alive at once. Events are one-off arrivals.
// The boss event must sit at TUNING.runSeconds; data.test.js checks it.
export const STAGE = {
	windows: [
		{ from: 0, to: 120, type: 'goblin', everyMs: 900, max: 40 },
		{ from: 20, to: 200, type: 'bat', everyMs: 1500, burst: 3, max: 40 },
		{ from: 60, to: 360, type: 'goblin', everyMs: 500, burst: 2, max: 60 },
		{ from: 90, to: 300, type: 'flan', everyMs: 3000, max: 15 },
		{ from: 150, to: 480, type: 'wolf', everyMs: 1400, burst: 2, max: 40 },
		{ from: 240, to: 720, type: 'skeleton', everyMs: 900, burst: 2, max: 60 },
		{ from: 300, to: 720, type: 'bat', everyMs: 700, burst: 4, max: 60 },
		{ from: 360, to: 720, type: 'imp', everyMs: 800, burst: 3, max: 60 },
		{ from: 420, to: 720, type: 'flan', everyMs: 1800, burst: 2, max: 30 },
		{ from: 480, to: 720, type: 'wolf', everyMs: 900, burst: 3, max: 50 },
	],
	events: [
		{ at: 180, type: 'ogre', count: 1 },
		{ at: 300, type: 'ogre', count: 2 },
		{ at: 450, type: 'ogre', count: 3 },
		{ at: 600, type: 'chaos', count: 1 },
	],
};
