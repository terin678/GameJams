// Every gameplay number in one place. Times are in seconds.
export const TUNING = {
	tickSeconds: 0.1,
	growSeconds: 5,           // one bean, seed to ripe, before any upgrades
	startPrice: 1,
	// Modifiers before any project is bought (see EFFECTS in core/projects.js).
	base: { plots: 1, probeYield: 40 },
	calendar: { daySeconds: 5, daysPerSeason: 7 },
	market: {
		demandBase: 2,        // beans/sec bought at a price of 1.00
		elasticity: 2,        // halve the price, sell four times as many
		priceStep: 1.1,
		priceMin: 0.05,
		priceMax: 100,
		autoprice: { everySeconds: 1, lowSeconds: 0.5, highSeconds: 5 },
	},
	// Stalk height in metres = scale * (beans ever grown) ^ power.
	height: { scale: 0.935, power: 0.9 },
	universeBeans: 1e30,      // every atom is bean
	goldenBonus: 1,           // each Golden Bean (New Game+) adds this much yield
	// Away for longer than minSeconds, the farm works at `rate` of normal speed,
	// for at most capSeconds of your absence.
	offline: { capSeconds: 8 * 3600, rate: 0.25, stepSeconds: 0.5, minSeconds: 60 },
	catchUpSeconds: 1,        // a gap longer than this is simulated in coarse steps
	saveSeconds: 5,
	logLines: 40,
};
