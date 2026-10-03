// Every gameplay number in one place. Times are in seconds.
export const TUNING = {
	tickSeconds: 0.1,
	growSeconds: 5,           // one bean, seed to ripe, before any upgrades
	startPrice: 1,
	// Modifiers before any project is bought (see EFFECTS in core/projects.js).
	base: { plots: 1, probeYield: 40 },
	// The calendar only drives what you see (the light, the seasons, the fair).
	// Weather has its own clock, so stretching the day changes nothing you earn.
	calendar: { daySeconds: 60, daysPerSeason: 3 },
	weather: { everySeconds: 20 },   // how long one spell of weather lasts
	market: {
		demandBase: 2,        // beans/sec bought at a price of 1.00
		elasticity: 2,        // halve the price, sell four times as many
		priceStep: 1.1,
		priceMin: 0.05,
		priceMax: 100,
		autoprice: { everySeconds: 1, lowSeconds: 0.5, highSeconds: 5 },
	},
	// Stalk height: [beans ever grown, metres] points (see heightFor). The middle
	// two set how many beans the clouds (phase 2) and space (phase 3) take.
	height: { points: [[1, 0.3], [5e4, 2000], [5.5e7, 100e3], [1e30, 8.8e26]] },
	universeBeans: 1e30,      // every atom is bean
	// Neighbours: a gift every giftSeconds each; hearts from points.
	friends: {
		pointsPerHeart: 100,
		maxHearts: 8,
		giftSeconds: 75,
		costGrowth: 1.3,      // gifts cost this much more per heart
		points: { love: 60, like: 35, neutral: 15, dislike: -20 },
	},
	// Each Golden Bean (one per finished run) adds this share to these modifiers.
	golden: { yield: 1, marketing: 1, tend: 0.5, growth: 0.25, replicate: 0.4 },
	// Away for longer than minSeconds, the farm works at `rate` of normal speed,
	// for at most capSeconds of your absence.
	offline: { capSeconds: 8 * 3600, rate: 0.15, stepSeconds: 0.5, minSeconds: 60 },
	catchUpSeconds: 1,        // a gap longer than this is simulated in coarse steps
	saveSeconds: 5,
	logLines: 40,
};
