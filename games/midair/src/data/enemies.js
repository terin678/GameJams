// layer 'sky' = your altitude, hit by splats. layer 'low' = below you, hit by
// bombs only. climbAt (seconds) lifts a low enemy up into the sky layer.
// fire.kind: 'aimed' (at the bird), 'spread' (fan aimed at the bird),
// 'flak' (rises from below, only dangerous once it reaches your altitude).
export const ENEMIES = {
	prop: {
		name: 'Prop plane', layer: 'sky', sprite: 'prop',
		hp: 1, radius: 16, speed: 150, score: 100,
		fire: { kind: 'aimed', everyMs: 2600, speed: 210 },
		drops: [{ pickup: 'fries', chance: 0.07 }, { pickup: 'bug', chance: 0.05 }],
		sfx: 'pop',
	},
	drone: {
		name: 'Delivery drone', layer: 'sky', sprite: 'drone',
		hp: 1, radius: 13, speed: 140, score: 60,
		drops: [{ pickup: 'bug', chance: 0.12 }],
		sfx: 'pop',
	},
	jet: {
		name: 'Jet', layer: 'sky', sprite: 'jet',
		hp: 4, radius: 18, speed: 210, score: 350,
		fire: { kind: 'spread', everyMs: 2000, speed: 220, count: 3, spreadDeg: 28 },
		drops: [{ pickup: 'chili', chance: 0.15 }, { pickup: 'fries', chance: 0.15 }],
		sfx: 'boom',
	},
	car: {
		name: 'Flying car', layer: 'low', sprite: 'car',
		hp: 2, radius: 15, speed: 85, score: 150,
		fire: { kind: 'flak', everyMs: 3000, speed: 150 },
		drops: [{ pickup: 'fries', chance: 0.25 }],
		sfx: 'crunch',
	},
	taxi: {
		name: 'Sky taxi', layer: 'low', sprite: 'taxi',
		hp: 2, radius: 15, speed: 95, score: 200,
		climbAt: 1.6,
		drops: [{ pickup: 'bread', chance: 0.25 }],
		sfx: 'crunch',
	},
	van: {
		name: 'Hover van', layer: 'low', sprite: 'van',
		hp: 6, radius: 20, speed: 60, score: 400,
		fire: { kind: 'flak', everyMs: 2000, speed: 160 },
		drops: [{ pickup: 'fries', chance: 0.35 }, { pickup: 'chili', chance: 0.15 }],
		sfx: 'crunch',
	},
	blimp: {
		name: 'Ad blimp', layer: 'low', sprite: 'blimp',
		hp: 12, radius: 30, speed: 40, score: 1000,
		fire: { kind: 'flak', everyMs: 1500, speed: 150 },
		drops: [{ pickup: 'bread', chance: 0.5 }, { pickup: 'chili', chance: 0.5 }],
		sfx: 'boom',
	},
	airship: {
		name: 'The Akagi Zeppelin', layer: 'low', sprite: 'airship', boss: true,
		hp: 60, radius: 58, speed: 50, score: 10000,
		fire: { kind: 'flak', everyMs: 850, speed: 170 },
		escorts: { type: 'prop', everyMs: 3200, pattern: 'swoop', params: { amp: 130, freq: 1.3 } },
		drops: [{ pickup: 'chili', chance: 1 }],
		sfx: 'bigboom',
	},
};
