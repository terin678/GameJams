// The Blight: probes that go to seed and turn on the swarm. Rules in core/blight.js.
export const BLIGHT = {
	unlock: { grown: 1e10 },
	log: 'Some of the probes have gone to seed. They have stopped planting, and started eating the ones that still do. The swarm will need guards.',
	kill: 0.5,        // a swarm entirely on guard would clear this share of the blight a second
	eat: 0.05,        // probes each blighted probe destroys a second
	step: 0.05,       // the guard share moves in steps of this
	maxShare: 0.5,
	// The blight never grows beyond this many per healthy probe, so a swarm left
	// unguarded stalls (it loses about as fast as it spreads) rather than dying.
	maxRatio: 0.15,
	// `drift`: the share of planting probes that go to seed each second.
	levels: [
		{ grown: 0, drift: 0.001 },
		{ grown: 1e16, drift: 0.003, log: 'The blight has adapted. It spreads between the stars now, far faster.' },
		{ grown: 1e23, drift: 0.007, log: 'The blight has adapted again. It has learned to look like a bean.' },
	],
};
