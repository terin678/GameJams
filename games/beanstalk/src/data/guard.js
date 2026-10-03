// The Guard: pests, the animals that see them off, and what winning earns.
// The rules are described in core/guard.js.
//
// It is rolled out a step at a time: slugs alone, then mice as well, then
// bigger waves, then rabbits and the dog; once that is second nature the
// animals learn to post themselves (the `drill` rank). In phase 2 the raids
// start coming down the stalk: tough pests, which need trained animals.
export const GUARD = {
	unlock: { grown: 6000 },
	log: 'Something has been at the beans in the night. Time to post a guard.',
	posts: { start: 2, max: 8, cost: { coins: 1500 }, costGrowth: 3 },
	raid: {
		firstSeconds: 75,     // from the guard opening to the first raid
		everySeconds: 150,    // from the end of one raid to the start of the next
		warnSeconds: 40,      // the tab is flagged this long before a raid you are not ready for
		roundSeconds: 0.6,
		maxSeconds: 24,       // a raid that lasts this long is lost
		lead: 0.6,            // share of a mixed wave that is its main pest
	},
	// Each round: an animal sees off a pest it is good against (strong) or not
	// (weak) with these chances; each pest wears out an animal with chance `tire`.
	// As a rule of thumb you need one well-matched animal for every two pests,
	// and one more than that makes it safe (tests/beanstalk/balance.test.js checks).
	odds: { strong: 0.5, weak: 0.08, tire: 0.08 },
	// Each pest left at the end of a lost raid eats this many plots; together they take a share of the barn.
	loss: { plotsEach: 1, barnShare: 0.25 },
	// Training, with Almanac pages: each level multiplies an animal's chances by (1 + per).
	train: {
		phase: 2, max: 5, per: 0.3, cap: 0.95, cost: { pages: 150 }, costGrowth: 2,
		log: 'Things have started coming down the stalk, and they are tougher than slugs. The almanac has a chapter on training animals.',
	},
	bountySeconds: 20,        // a win pays this many seconds of the farm's income
	lines: {
		raid: 'Raid! {wave} in the beans.',
		won: 'The guard saw them off.',
		lost: 'The guard was overrun.',
	},
	// Each has a sprite of the same name in sprites.js.
	foes: [
		{ id: 'slug', name: 'slug', plural: 'slugs' },
		{ id: 'mouse', name: 'mouse', plural: 'mice' },
		{ id: 'rabbit', name: 'rabbit', plural: 'rabbits' },
		// From up the stalk. `tough` divides every animal's chance against them.
		{ id: 'moth', name: 'cloud moth', plural: 'cloud moths', tough: 1.9 },
		{ id: 'magpie', name: 'giant magpie', plural: 'giant magpies', tough: 2.5 },
	],
	// `wins`: how many raids you must have won before the animal turns up.
	defenders: [
		{ id: 'duck', name: 'Duck', plural: 'Ducks', strong: ['slug'], text: 'Eats slugs.', wins: 0 },
		{ id: 'cat', name: 'Cat', plural: 'Cats', strong: ['mouse'], text: 'Catches mice.', wins: 0 },
		{ id: 'dog', name: 'Dog', plural: 'Dogs', strong: ['rabbit'], text: 'Chases rabbits.', wins: 6 },
		{ id: 'bat', name: 'Bat', plural: 'Bats', strong: ['moth'], text: 'Eats cloud moths.', wins: 13 },
		{ id: 'goose', name: 'Goose', plural: 'Geese', strong: ['magpie'], text: 'Sees off giant magpies.', wins: 17 },
	],
	// The wave you face after this many wins.
	waves: [
		{ wins: 0, size: 3, foes: ['slug'] },
		{ wins: 2, size: 4, foes: ['slug', 'mouse'] },
		{ wins: 4, size: 6, foes: ['slug', 'mouse'] },
		{ wins: 6, size: 8, foes: ['slug', 'mouse', 'rabbit'] },
		{ wins: 10, size: 10, foes: ['slug', 'mouse', 'rabbit'] },
		{ wins: 13, phase: 2, size: 10, foes: ['mouse', 'rabbit', 'moth'] },
		{ wins: 17, phase: 2, size: 12, foes: ['rabbit', 'moth', 'magpie'] },
		{ wins: 23, phase: 2, size: 14, foes: ['rabbit', 'moth', 'magpie'] },
		{ wins: 30, phase: 2, size: 16, foes: ['rabbit', 'moth', 'magpie'] },
	],
	// What your record earns. `effect` uses the same modifiers as projects.
	ranks: [
		{ wins: 1, name: 'Not a leaf out of place', text: 'Demand +15%.', effect: { marketing: 1.15 } },
		{ wins: 3, name: 'Nothing nibbled', text: 'Yield +15%.', effect: { yield: 1.15 } },
		{ wins: 6, name: 'A dog about the place', text: 'A dog turns up, and stays. Dogs chase rabbits, which is lucky.', effect: { marketing: 1.05 } },
		{ wins: 10, name: 'Well drilled', text: 'The animals take the right posts for each raid by themselves.', drill: true },
		{ wins: 13, name: 'Bats in the barn roof', text: 'Bats move in. They eat cloud moths. Growth +10%.', effect: { growth: 1.1 } },
		{ wins: 17, name: 'A goose with opinions', text: 'A goose arrives and takes charge. Geese see off giant magpies. Demand +10%.', effect: { marketing: 1.1 } },
		{ wins: 23, name: 'Best-kept farm in the county', text: 'Yield +25%.', effect: { yield: 1.25 } },
		{ wins: 30, name: 'A legend among slugs', text: 'Demand +25%.', effect: { marketing: 1.25 } },
	],
};
