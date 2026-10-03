// The Exchange: crates of beans, bought and sold. The rules are in core/exchange.js.
export const EXCHANGE = {
	unlock: { phase: 2, grown: 400000 },
	log: 'A telegram: the Bean Exchange has opened a desk in town. Buy low, sell high, they say, as if it were easy.',
	base: 100,                // coins a crate, before the season and the weather
	// The level in the middle of each season. Cheapest at harvest, dearest in spring.
	seasons: { spring: 1.2, summer: 1, autumn: 0.8, winter: 1.1 },
	// A spell of this weather pushes the price by this share (rain is a glut).
	weather: { rain: -0.06, drought: 0.1 },
	noise: 0.03,              // random push at each repricing, either way
	revertSeconds: 60,        // how quickly a push fades
	maxShock: 0.35,           // pushes never add up to more than this
	sampleSeconds: 5,         // how often the board is repriced
	history: 72,              // prices kept for the chart: six minutes, half a year
	fee: 0.02,                // taken from every sale
	shares: [0.1, 0.5, 1],    // the buttons: a tenth, half, all
	hint: 'Crates are cheapest at harvest, in autumn, and dearest in spring, when the barns are empty. Rain brings the price down; a dry spell sends it up.',
};
