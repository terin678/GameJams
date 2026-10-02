// Lifetime challenges, saved across runs. Each has one goal per tier.
// event: what Play.js reports (see CHALLENGE_EVENTS). match.enemy narrows a
// 'kill' to one enemy type. mode 'best' keeps the best single value instead
// of adding up. {n} in the title is replaced with the next goal.
export const TIERS = [
	{ name: 'BRONZE', color: '#d08a4a', tint: 0xd08a4a },
	{ name: 'SILVER', color: '#c8d0e0', tint: 0xc8d0e0 },
	{ name: 'GOLD', color: '#f2d544', tint: 0xf2d544 },
];

export const CHALLENGE_EVENTS = ['kill', 'bullseye', 'squadron', 'chain', 'score', 'flock', 'form', 'maxform', 'loop'];

export const CHALLENGES = [
	{ id: 'blue_cars', title: 'Poop on {n} blue cars', event: 'kill', match: { enemy: 'car' }, goals: [20, 100, 300] },
	{ id: 'taxis', title: 'Bomb {n} sky taxis', event: 'kill', match: { enemy: 'taxi' }, goals: [15, 60, 200] },
	{ id: 'drones', title: 'Swat {n} delivery drones', event: 'kill', match: { enemy: 'drone' }, goals: [30, 150, 500] },
	{ id: 'jets', title: 'Down {n} jet{s}', event: 'kill', match: { enemy: 'jet' }, goals: [5, 25, 100] },
	{ id: 'vans', title: 'Wreck {n} hover van{s}', event: 'kill', match: { enemy: 'van' }, goals: [5, 25, 80] },
	{ id: 'blimps', title: 'Pop {n} ad blimp{s}', event: 'kill', match: { enemy: 'blimp' }, goals: [2, 10, 30] },
	{ id: 'trucks', title: 'Stomp {n} monster truck{s}', event: 'kill', match: { enemy: 'monster_truck' }, goals: [1, 5, 20] },
	{ id: 'zeppelins', title: 'Bring down {n} zeppelin{s}', event: 'kill', match: { enemy: 'airship' }, goals: [1, 3, 10] },
	{ id: 'bullseyes', title: 'Land {n} windshield bullseyes', event: 'bullseye', goals: [5, 30, 120] },
	{ id: 'squadrons', title: 'Wipe out {n} red squadron{s}', event: 'squadron', goals: [1, 10, 40] },
	{ id: 'ducks', title: 'Turn into a duck {n} time{s}', event: 'form', goals: [3, 20, 75] },
	{ id: 'max_duck', title: 'Max out a duck {n} time{s}', event: 'maxform', goals: [1, 5, 20] },
	{ id: 'flock', title: 'Fly in a V of {n}', event: 'flock', mode: 'best', goals: [2, 3, 4] },
	{ id: 'chain', title: 'Hit a {n} chain', event: 'chain', mode: 'best', goals: [10, 25, 50] },
	{ id: 'score', title: 'Score {n} in one flight', event: 'score', mode: 'best', goals: [10000, 50000, 150000] },
	{ id: 'loops', title: 'Reach loop {n}', event: 'loop', mode: 'best', goals: [2, 3, 5] },
];
