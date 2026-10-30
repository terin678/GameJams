// Run levels (reset every run) and XP gems.

export const xpToNext = (level, curve) => curve.base + (level - 1) * curve.step;

export const createLevelState = () => ({ level: 1, xp: 0 });

// Returns how many levels were gained.
export function gainXp(state, amount, curve) {
	state.xp += amount;
	let gained = 0;
	while (state.xp >= xpToNext(state.level, curve)) {
		state.xp -= xpToNext(state.level, curve);
		state.level++;
		gained++;
	}
	return gained;
}

// Past the cap, new gems fold into the last one instead of piling up.
// Returns the gem merged into, or null if the new gem was added.
export function addGem(gems, gem, cap) {
	if (gems.length < cap) {
		gems.push(gem);
		return null;
	}
	const target = gems[gems.length - 1];
	target.value += gem.value;
	return target;
}

export const gemTier = value => (value >= 20 ? 2 : value >= 5 ? 1 : 0);
