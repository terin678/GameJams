// Seed breeding and the county fair. How it works is described in core/seeds.js.
export const SEEDS = {
	unlock: { grown: 1500 },
	log: 'A seed catalogue arrives, and with it an idea: you could breed your own. The fair is every autumn.',
	maxLevel: 20,
	// Each level multiplies `effect` (a modifier from core/projects.js) by `per`.
	// `fair` is the name of the class it is judged in.
	traits: [
		{ id: 'size', name: 'Size', effect: 'yield', per: 1.12, blurb: 'beans per plant', fair: 'Biggest bean' },
		{ id: 'vigour', name: 'Vigour', effect: 'growth', per: 1.05, blurb: 'growing speed', fair: 'Fastest sprout' },
		{ id: 'flavour', name: 'Flavour', effect: 'marketing', per: 1.1, blurb: 'demand', fair: 'Tastiest bean' },
	],
	cross: {
		cost: { coins: 100 },
		costGrowth: 1.3,     // each generation costs this much more
		seconds: 20,          // growing out the seedlings
		luck: 0.3,            // chance the best trait jumps two; half this for the others to rise
		luckPerRibbon: 0.02,
		maxLuck: 0.6,
		slip: 0.3,            // chance each other trait drops a level
	},
	fair: {
		season: 'autumn',     // judged on the first day
		firstBar: 2,          // the level needed for a class's first ribbon
		barStep: 2,           // and how much higher for each one after
		ribbonEffect: { marketing: 1.1 },
		win: 'County fair, {class}: first prize! A ribbon for the farmhouse door.',
		lose: 'County fair, {class}: second place. The judges wanted a {bar}; yours was a {level}.',
	},
};
