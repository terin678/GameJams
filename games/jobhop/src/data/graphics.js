// Graphics quality presets and the numbers behind every visual effect.
// Gameplay never reads these: LOW plays exactly like HIGH, it just draws less.

export const QUALITY_LEVELS = ['high', 'medium', 'low'];   // AUTO steps down this list
export const GRAPHICS_ORDER = ['auto', ...QUALITY_LEVELS];  // what [G] cycles through

//   particles      multiplier on every burst size (FX.burst)
//   maxParticles   live particle cap
//   shadows        a ground shadow under every unit
//   trails         sparks behind projectiles
//   damageNumbers  numbers float up off hits
//   flashes        screen flash on big blasts, red vignette when hurt
//   bob            units bounce as they walk
//   maxScale       most canvas pixels per game pixel (sharpness; set at page load)
export const PRESETS = {
	high: { particles: 1, maxParticles: 900, shadows: true, trails: true, damageNumbers: true, flashes: true, bob: true, maxScale: 3 },
	medium: { particles: 0.5, maxParticles: 350, shadows: true, trails: false, damageNumbers: false, flashes: true, bob: true, maxScale: 2 },
	low: { particles: 0.25, maxParticles: 120, shadows: false, trails: false, damageNumbers: false, flashes: false, bob: false, maxScale: 1 },
};

// AUTO: average frame time over windowMs; `windows` slow windows in a row
// (slower than slowMs, about 45 fps) drop one level.
export const AUTO = { windowMs: 2000, slowMs: 22, windows: 2, ignoreMs: 250 };

export const FX = {
	// Particles per burst at HIGH; presets scale these down.
	burst: { kill: 6, elite: 28, boss: 70, blast: 18, swap: 14, joblevel: 34, ready: 10, potion: 10 },
	particle: { lifeMs: [260, 620], speed: [50, 190] },
	trailEveryMs: 34,

	spawnMs: 240,            // enemies grow in
	deathMs: 240,            // and puff out
	squash: { ms: 130, amt: 0.28 },
	bob: { periodMs: 150, player: 2, enemy: 1.5 },
	swapSpinMs: 180,

	fxMs: 200,               // swing and thrust lifetime
	blastMs: 360,
	ringMs: 300,
	shake: { hurt: [90, 0.004], blast: [160, 0.006], elite: [260, 0.008], boss: [420, 0.012] },
	hitStopMs: { elite: 60, boss: 160 },
	flashMs: 200,
	vignetteMs: 320,

	chip: { holdMs: 380, perSecond: 0.7 },   // the white bar behind HP
	bannerPopMs: 280,
	numbers: { max: 40, ms: 650, rise: 24 },
};
