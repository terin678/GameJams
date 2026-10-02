// Every gameplay number in one place. Tweak here, not in scenes.
export const TUNING = {
	width: 480,
	height: 640,
	spriteScale: 3,

	player: {
		speed: 270,          // px/s
		radius: 7,           // hitbox, smaller than the sprite on purpose
		invulnMs: 1400,
		startY: 560,
		margin: 18,
		form: 'pigeon',      // see forms.js
		touchFollow: 1.4,    // drag sensitivity on touch
	},

	meters: {
		energyMax: 100,
		gutMax: 100,
		energyDrain: 0.4,    // per second, the 1943 fuel clock
		gutRegen: 8,         // per second
	},

	bomb: {
		offset: 130,         // reticle distance ahead of the bird
		fallMs: 550,
		baseRadius: 24,
		maxRadius: 62,
		baseCost: 18,
		maxCost: 45,
		chargeMs: 900,
		bullseyeFrac: 0.3,
		damage: 3,           // per hit at no charge
		chargeDamage: 1.5,   // a full charge adds +150%
	},

	// Duck forms: timed like 1943's weapons; same egg again = level up.
	power: { durationMs: 20000, maxLevel: 3, warnMs: 3000 },

	// Shooting a falling egg cycles which duck it holds.
	eggs: { cycleCooldownMs: 220, fall: 60 },

	// V formation wingmen: fire with you, each soaks one hit.
	flock: { max: 4, spacing: 30, follow: 9, radius: 7, scale: 0.7, damage: 1, shotSpeed: 560 },

	combo: { windowMs: 1800, perStep: 5, maxMult: 5, bullseyeMult: 2 },

	damage: { shot: 10, flak: 14, collide: 22 },

	enemyShot: { radius: 4 },
	flak: { radius: 7, riseMs: 750, armedMs: 900 },
	pickup: { fall: 80, radius: 14, score: 50 },

	// Only fire while comfortably on screen, so shots never come from nowhere.
	fireZone: { top: 10, bottom: 0.7 },

	layers: { lowScale: 0.72, lowTint: 0xb4bcd8, offscreenMargin: 50 },

	scroll: { ground: 45, clouds: 110 },

	bossBar: { color: 0xd6463c },
};
