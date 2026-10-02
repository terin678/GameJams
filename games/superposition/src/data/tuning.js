// Every gameplay number in one place. Speeds are in tiles per second.
export const TUNING = {
	width: 480,
	height: 640,
	tile: 24,
	mazeTop: 76,          // px from the top of the canvas to the maze
	spriteScale: 2,

	lives: 3,
	extraLifeAt: 10000,

	speed: {
		cat: 6.6,
		tunnelling: 5.2,  // slower while inside a wall
		observer: 6.0,
		measured: 3.6,    // frightened observers dawdle
		returning: 13,    // eaten observers zip home
		perLevel: 0.06,   // +6% per level...
		maxBoost: 0.4,    // ...up to +40%
	},

	score: { quantum: 10, pellet: 50, item: 300, observer: 200, levelClear: 1000 },

	// Powers. Durations shrink a little each level (never below `min`).
	powers: {
		measure: { ms: 7000, perLevel: 600, min: 2500, warnMs: 1800 },
		tunnel: { ms: 6000, perLevel: 300, min: 3500, warnMs: 1500 },
		split: { ms: 9000, perLevel: 400, min: 5000, warnMs: 2000 },
	},

	// Tunnel/split items appear every N quanta eaten, then vanish if ignored.
	items: { every: 45, cycle: ['tunnel', 'split'], lifeMs: 9000 },

	// Classic-style scatter/chase rhythm; the last phase lasts forever.
	schedule: [
		{ mode: 'scatter', ms: 6000 },
		{ mode: 'chase', ms: 20000 },
		{ mode: 'scatter', ms: 5000 },
		{ mode: 'chase', ms: 20000 },
		{ mode: 'scatter', ms: 4000 },
		{ mode: 'chase' },
	],

	catchRadius: 0.6,     // tiles between centres that counts as caught
	deathMs: 1500,
	readyMs: 1800,
};
