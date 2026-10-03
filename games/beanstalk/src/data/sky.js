// The light through one farm day. See core/sky.js for how it is used.
// `at` runs 0 to 1 from one dawn to the next; `amount` is how strongly `color`
// washes over the season's sky; `night` is how dark it is (stars, lit windows).
export const SKY = {
	easeRate: 1.2,            // how fast colours drift to a new target, per second
	groundShare: 0.55,        // how much of the light's tint reaches the ground
	weatherAtNight: 0.6,      // how much weather tints fade when it is dark
	keys: [
		{ at: 0, color: '#ffb074', amount: 0.45, night: 0.2 },    // dawn
		{ at: 0.08, color: '#ffffff', amount: 0, night: 0 },      // morning
		{ at: 0.6, color: '#ffffff', amount: 0, night: 0 },       // afternoon
		{ at: 0.7, color: '#ff8a5c', amount: 0.5, night: 0.15 },  // sunset
		{ at: 0.78, color: '#141a44', amount: 0.82, night: 1 },   // night falls
		{ at: 0.94, color: '#141a44', amount: 0.82, night: 1 },
		{ at: 1, color: '#ffb074', amount: 0.45, night: 0.2 },    // dawn again
	],
	// Names for the calendar line.
	periods: [
		{ until: 0.08, name: 'Dawn' },
		{ until: 0.34, name: 'Morning' },
		{ until: 0.6, name: 'Afternoon' },
		{ until: 0.76, name: 'Evening' },
		{ until: 1, name: 'Night' },
	],
	window: '#ffd978',        // farmhouse windows after dark
};
