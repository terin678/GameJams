// Playable bird forms. Eggs turn you into a duck; the same egg again levels it
// up (max TUNING.power.maxLevel). Each level is a weapon:
//   cooldownMs, speed, damage, sprite,
//   angles  - degrees off straight up, one splat per entry
//   offsets - optional x offset per splat (parallel streams)
//   pierce  - optional, how many extra enemies one splat passes through
export const FORMS = {
	pigeon: {
		name: 'Pigeon', sprite: 'bird', speed: 270,
		levels: [
			{ cooldownMs: 130, speed: 560, damage: 1, sprite: 'splat', angles: [0] },
		],
	},
	mallard: {
		name: 'Mallard', blurb: 'spread', sprite: 'mallard', speed: 270,
		levels: [
			{ cooldownMs: 150, speed: 540, damage: 1, sprite: 'splat', angles: [-10, 0, 10] },
			{ cooldownMs: 145, speed: 540, damage: 1, sprite: 'splat', angles: [-20, -9, 0, 9, 20] },
			{ cooldownMs: 135, speed: 560, damage: 1, sprite: 'splat', angles: [-30, -18, -7, 0, 7, 18, 30] },
		],
	},
	merganser: {
		name: 'Merganser', blurb: 'rapid', sprite: 'merganser', speed: 300,
		levels: [
			{ cooldownMs: 75, speed: 680, damage: 1, sprite: 'splat', angles: [0, 0], offsets: [-6, 6] },
			{ cooldownMs: 65, speed: 700, damage: 1, sprite: 'splat', angles: [-2, 0, 0, 2], offsets: [-14, -5, 5, 14] },
			{ cooldownMs: 55, speed: 720, damage: 1.5, sprite: 'splat', angles: [-3, 0, 0, 3], offsets: [-16, -6, 6, 16] },
		],
	},
	eider: {
		name: 'Eider', blurb: 'piercing', sprite: 'eider', speed: 250,
		levels: [
			{ cooldownMs: 240, speed: 480, damage: 3, sprite: 'shell', angles: [0], pierce: 2 },
			{ cooldownMs: 220, speed: 500, damage: 4, sprite: 'shell', angles: [-6, 6], offsets: [-8, 8], pierce: 3 },
			{ cooldownMs: 200, speed: 520, damage: 5, sprite: 'shell', angles: [-10, 0, 10], pierce: 4 },
		],
	},
};
