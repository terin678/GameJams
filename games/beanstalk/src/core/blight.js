// The Blight: the Guard's last stage, out among the probes.
//
// Some of the probes that are planting go to seed: they stop planting and
// start eating the others. You answer by setting a share of the swarm to stand
// guard. Guards clear the blight, but they neither plant nor spread, so every
// probe on guard is one not growing beans: the job is to find the split that
// keeps the swarm growing fastest, and to find it again each time the blight
// adapts.
//
// `B` is BLIGHT from data/blight.js. state.blight is { open, amount, share, level }
// where `amount` is how many probes are blighted and `share` is the part of
// the swarm on guard. core/sim.js does the planting; this does the rest.

export const createBlight = () => ({ open: false, amount: 0, share: 0, level: 0 });

export const unlockDue = (state, B) => !state.blight.open && state.grown >= B.unlock.grown && state.probes > 0;

// The index of the level the blight has reached for this many beans grown.
export const levelAt = (grown, B) => B.levels.reduce((at, l, i) => (grown >= l.grown ? i : at), 0);

// Moves the guard share one step up (dir 1) or down (dir -1).
export function setShare(state, dir, B) {
	const { blight } = state;
	const next = Math.round((blight.share + dir * B.step) / B.step) * B.step;
	if (!blight.open || next < 0 || next > B.maxShare + 1e-9) return false;
	blight.share = Math.round(next * 1000) / 1000;
	return true;
}

// Call every tick, after the planting probes have planted and spread.
// Returns the new level's entry when the blight has just adapted, else null.
export function step(state, dt, B) {
	const { blight } = state;
	if (!blight.open || !(state.probes > 0)) return null;
	const level = B.levels[blight.level];
	const turned = Math.min(state.probes - 1, state.probes * (1 - blight.share) * level.drift * dt);
	state.probes -= Math.max(0, turned);
	blight.amount += Math.max(0, turned);
	blight.amount *= Math.exp(-B.kill * blight.share * dt);
	// The blight never eats the last probe, and never outnumbers the swarm by much.
	state.probes = Math.max(1, state.probes - blight.amount * B.eat * dt);
	blight.amount = Math.min(blight.amount, state.probes * B.maxRatio);
	const now = levelAt(state.grown, B);
	if (now <= blight.level) return null;
	blight.level = now;
	return B.levels[now];
}

// Blighted probes for every healthy one.
export const ratio = state => (state.probes > 0 ? state.blight.amount / state.probes : 0);

// The share of the swarm the blight is eating each second, right now.
export const eating = (state, B) => ratio(state) * B.eat;

// How fast the swarm would grow, per second, if this split were held until
// things settled. `replicate` is the swarm's own rate (mods.replicate).
export function steadyGrowth(share, replicate, level, B) {
	const turning = level.drift * (1 - share);
	const spread = replicate * (1 - share) - turning;
	const settled = turning / Math.max(1e-6, B.kill * share + Math.max(0, spread));
	return spread - Math.min(settled, B.maxRatio) * B.eat;
}

// The split that grows the swarm fastest, among the steps on offer.
export function bestShare(replicate, level, B) {
	let best = 0;
	for (let s = 0; s <= B.maxShare + 1e-9; s += B.step) {
		if (steadyGrowth(s, replicate, level, B) > steadyGrowth(best, replicate, level, B)) best = Math.round(s * 1000) / 1000;
	}
	return best;
}

export function validateBlight(B) {
	const errors = [];
	if (!(B.unlock?.grown > 0)) errors.push('unlock.grown must be > 0');
	if (!B.log) errors.push('log is missing');
	if (!(B.kill > 0)) errors.push('kill must be > 0');
	if (!(B.eat > 0)) errors.push('eat must be > 0');
	if (!(B.step > 0 && B.step < 1)) errors.push('step must be in (0, 1)');
	if (!(B.maxShare >= B.step && B.maxShare < 1)) errors.push('maxShare must be at least one step, and below 1');
	if (!(B.maxRatio > 0)) errors.push('maxRatio must be > 0');
	if (!B.levels?.length) errors.push('levels is empty');
	if (B.levels?.[0]?.grown !== 0) errors.push('the first level must start at 0 beans');
	let last = -1;
	let drift = 0;
	for (const l of B.levels ?? []) {
		if (!(l.grown > last)) errors.push('levels must climb in grown');
		if (!(l.drift > drift && l.drift < 1)) errors.push('each level must drift more than the last');
		if (last >= 0 && !l.log) errors.push(`level at ${l.grown}: log is missing`);
		last = l.grown;
		drift = l.drift;
	}
	return errors;
}
