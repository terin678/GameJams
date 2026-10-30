// Two equipped jobs, one active. Swapping has a cooldown and tops up the
// incoming job's action gauge. Only the active job's gauge fills.
// The gauge is shown as charges: a job whose action costs 50 out of a 100
// gauge holds 2 charges. `caps` limits each job's gauge to whole charges so
// nothing fills uselessly past the last one.

export function createLoadout(a, b, caps = {}) {
	if (!a || !b || a === b) throw new Error(`a loadout needs two different jobs, got "${a}" and "${b}"`);
	return { jobs: [a, b], active: 0, gauge: { [a]: 0, [b]: 0 }, caps, swapReadyAt: 0 };
}

export const activeJob = l => l.jobs[l.active];
export const benchJob = l => l.jobs[1 - l.active];
export const canSwap = (l, now) => now >= l.swapReadyAt;
const capOf = (l, id, max) => Math.min(max, l.caps[id] ?? max);

export function swap(l, now, tuning, gaugeMax) {
	if (!canSwap(l, now)) return false;
	l.active = 1 - l.active;
	l.swapReadyAt = now + tuning.cooldownMs;
	const id = activeJob(l);
	l.gauge[id] = Math.min(capOf(l, id, gaugeMax), l.gauge[id] + tuning.gaugeRefill);
	return true;
}

export function addGauge(l, amount, max) {
	const id = activeJob(l);
	l.gauge[id] = Math.min(capOf(l, id, max), l.gauge[id] + amount);
}

export const canAct = (l, cost) => l.gauge[activeJob(l)] >= cost;

export function spendAction(l, cost) {
	if (!canAct(l, cost)) return false;
	l.gauge[activeJob(l)] -= cost;
	return true;
}

// The most gauge worth holding: whole charges only.
export const gaugeCap = (cost, max) => Math.max(1, Math.floor(max / cost)) * cost;

// { ready, total, progress }: charges ready to use, charges the job can hold,
// and how far the next charge has filled (1 when every charge is full).
export function chargeInfo(gauge, cost, max) {
	const total = Math.max(1, Math.floor(max / cost));
	const ready = Math.min(total, Math.floor(gauge / cost + 1e-9));
	const progress = ready >= total ? 1 : (gauge - ready * cost) / cost;
	return { ready, total, progress };
}

// Picking jobs on the Jobs screen: toggle off if picked, else add, dropping the oldest past two.
export function togglePick(picks, id) {
	if (picks.includes(id)) return picks.filter(p => p !== id);
	return [...picks, id].slice(-2);
}
