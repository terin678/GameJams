// Two equipped jobs, one active. Swapping has a cooldown and tops up the
// incoming job's action gauge. Only the active job's gauge fills.

export function createLoadout(a, b) {
	if (!a || !b || a === b) throw new Error(`a loadout needs two different jobs, got "${a}" and "${b}"`);
	return { jobs: [a, b], active: 0, gauge: { [a]: 0, [b]: 0 }, swapReadyAt: 0 };
}

export const activeJob = l => l.jobs[l.active];
export const benchJob = l => l.jobs[1 - l.active];
export const canSwap = (l, now) => now >= l.swapReadyAt;

export function swap(l, now, tuning, gaugeMax) {
	if (!canSwap(l, now)) return false;
	l.active = 1 - l.active;
	l.swapReadyAt = now + tuning.cooldownMs;
	const id = activeJob(l);
	l.gauge[id] = Math.min(gaugeMax, l.gauge[id] + tuning.gaugeRefill);
	return true;
}

export function addGauge(l, amount, max) {
	const id = activeJob(l);
	l.gauge[id] = Math.min(max, l.gauge[id] + amount);
}

export const canAct = (l, cost) => l.gauge[activeJob(l)] >= cost;

export function spendAction(l, cost) {
	if (!canAct(l, cost)) return false;
	l.gauge[activeJob(l)] -= cost;
	return true;
}

// Picking jobs on the Jobs screen: toggle off if picked, else add, dropping the oldest past two.
export function togglePick(picks, id) {
	if (picks.includes(id)) return picks.filter(p => p !== id);
	return [...picks, id].slice(-2);
}
