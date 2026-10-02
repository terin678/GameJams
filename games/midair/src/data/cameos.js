// Surprise guests that zoom through every now and then (play-clock ms).
// warnMs: a flashing marker on the entry side before it arrives.
// bonus: extra points (times the loop) for catching it; reward: a pickup.
export const CAMEOS = {
	monster_truck: {
		enemy: 'monster_truck', pattern: 'side',
		params: { amp: 5, freq: 16 },      // bouncing on its big tyres
		y: [190, 360],                     // inside the bomb reticle's reach
		firstMs: 35000, everyMs: [45000, 75000],
		warnMs: 1300,
		banner: 'MONSTER TRUCK!',
		sfx: 'horn',
		bonus: 2500,
		reward: 'feather',
	},
};
