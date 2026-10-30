// Every gameplay number in one place. Tweak here, not in scenes.
export const TUNING = {
	width: 800,
	height: 600,
	spriteScale: 3,

	runSeconds: 600,        // the boss arrives at 10:00
	maxEnemies: 250,
	spawnMargin: 60,        // spawn ring sits this far outside the view
	despawnDistance: 900,   // stragglers further than this are moved back to the ring
	winBonus: 300,          // score is seconds survived, plus this for beating the boss

	player: {
		speed: 140,          // px/s at Speed 100%
		radius: 8,
		invulnMs: 450,       // after taking a hit
		pickupRadius: 40,    // times Magnet
		magnetSpeed: 420,
		aimRange: 420,       // auto-aim looks this far for a target
	},

	// Tab / Shift: change job. Instant attack, short i-frames, a little gauge.
	swap: { cooldownMs: 1200, invulnMs: 350, gaugeRefill: 25 },

	// Job Action gauge (active job only).
	gauge: { max: 100, perSecond: 2.5, perKill: 1 },

	// Run levels: xp to next = base + (level - 1) * step.
	runXp: { base: 5, step: 6 },
	gems: { cap: 300, potionHeal: 0.3 },

	// Job levels persist across runs. Level L -> L+1 costs round(base * growth^(L-1)).
	// Each kill gives the ACTIVE job (enemy xp * perEnemyXp) job XP.
	jobXp: { base: 60, growth: 1.35, maxLevel: 10, perEnemyXp: 1 },

	attackMaxLevel: 5,
	cards: 3,
	cardInputDelayMs: 350,   // ignore keys briefly so a held key doesn't pick a card

	difficulty: { hpPerMinute: 0.35, damagePerMinute: 0.06 },

	hitFlashMs: 70,
	fxMs: 160,
	gridCell: 64,
	separation: 0.35,
};

export const DEFAULT_PICKS = ['swordsman', 'mage'];
