// What the stalk passes on its way up. Heights are in metres.

// A phase begins when the stalk reaches its height. Projects name the phase they belong to.
export const PHASES = [
	{ id: 1, name: 'The Plot', height: 0, log: 'You have one plot, one bean and a good feeling about this.' },
	{ id: 2, name: 'Agribusiness', height: 2000, log: 'The stalk is in the clouds. The valley has started to talk.' },
	{ id: 3, name: 'Beyond', height: 100e3, log: 'The stalk has left the atmosphere. There is more room up here.' },
];

// One log line each, the first time the stalk gets there.
export const MILESTONES = [
	{ id: 'knee', height: 0.5, log: 'The stalk is knee high.' },
	{ id: 'house', height: 8, log: 'The stalk is taller than the farmhouse.' },
	{ id: 'oak', height: 30, log: 'The stalk is taller than the old oak. The oak says nothing.' },
	{ id: 'steeple', height: 120, log: 'You can see the whole valley from the top leaf.' },
	{ id: 'birds', height: 600, log: 'Birds have started nesting in it.' },
	{ id: 'everest', height: 8849, log: 'The stalk is taller than any mountain. Climbers ask for permits.' },
	{ id: 'jets', height: 12e3, log: 'Airlines have rerouted around the stalk.' },
	{ id: 'station', height: 400e3, log: 'A space station waves on its way past.' },
	{ id: 'moon', height: 384.4e6, log: 'A tendril has curled around the Moon.' },
	{ id: 'sun', height: 1.496e11, log: 'The stalk reaches the Sun. It photosynthesises directly now.' },
	{ id: 'pluto', height: 5.9e12, log: 'Pluto is a planter.' },
	{ id: 'lightyear', height: 9.461e15, log: 'The stalk is one light year tall. Sunlight takes a year to climb it.' },
	{ id: 'centauri', height: 4e16, log: 'Alpha Centauri has been staked and tied.' },
	{ id: 'galaxy', height: 9.461e20, log: 'The galaxy is a vine. It is a good vine.' },
	{ id: 'andromeda', height: 2.4e22, log: 'Andromeda was going to collide with us anyway.' },
	{ id: 'edge', height: 8e26, log: 'There is nowhere taller to grow.' },
];

// Where heights sit in the sky of the farm view: y is 0 at the ground, 1 at the
// top of the screen, logarithmic in between. `sprite` is drawn beside the stalk;
// once the `greenBy` project is owned, `<sprite>_green` is drawn instead.
export const LANDMARKS = [
	{ height: 1, y: 0 },
	{ height: 2000, y: 0.3, sprite: 'cloud' },
	{ height: 100e3, y: 0.42 },
	{ height: 384.4e6, y: 0.55, sprite: 'moon', greenBy: 'lunar_soil' },
	{ height: 1.496e11, y: 0.67, sprite: 'sun', greenBy: 'dyson_trellis' },
	{ height: 9.461e15, y: 0.78, sprite: 'star' },
	{ height: 9.461e20, y: 0.9, sprite: 'galaxy', greenBy: 'co_op' },
	{ height: 8.8e26, y: 1 },
];
