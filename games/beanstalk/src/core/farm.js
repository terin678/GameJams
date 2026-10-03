// The farm is a list of plots. A plot is null (empty) or its growth, 0 to 1 (ripe).
// These mutate the list in place: it is ticked many times a second.

export const createFarm = n => Array(n).fill(null);

export function resize(plots, n) {
	while (plots.length < n) plots.push(null);
	return plots;
}

export function grow(plots, amount) {
	for (let i = 0; i < plots.length; i++) {
		if (plots[i] !== null) plots[i] = Math.min(1, plots[i] + amount);
	}
}

const isRipe = g => g !== null && g >= 1;

// The next plot that needs a hand (ripe or empty), looking from `start` and
// wrapping round; -1 if everything is growing. Starting where the last job
// ended keeps every plot in the rotation: always starting at 0, or always
// picking before planting, leaves the far plots untouched on a busy farm.
export function findWork(plots, start = 0) {
	const n = plots.length;
	for (let k = 0; k < n; k++) {
		const i = (start + k) % n;
		if (plots[i] === null || isRipe(plots[i])) return i;
	}
	return -1;
}

// Works one plot: plants it if empty, otherwise harvests and replants it.
export function tendPlot(plots, i) {
	const did = plots[i] === null ? 'plant' : 'harvest';
	plots[i] = 0;
	return did;
}

// One action by a hand, a farmhand or a drone, starting the search at `start`.
export function tendOnce(plots, start = 0) {
	const i = findWork(plots, start);
	return i < 0 ? null : tendPlot(plots, i);
}

// Returns the plot that was eaten, or -1.
export function eatOne(plots, rng) {
	const planted = [];
	plots.forEach((g, i) => { if (g !== null) planted.push(i); });
	if (!planted.length) return -1;
	const i = rng.pick(planted);
	plots[i] = null;
	return i;
}

export function counts(plots) {
	const c = { empty: 0, growing: 0, ripe: 0 };
	for (const g of plots) c[g === null ? 'empty' : g >= 1 ? 'ripe' : 'growing']++;
	return c;
}

// Sprite frame for a plot: -1 empty, stages-1 only when ripe.
export const stageOf = (g, stages) =>
	g === null ? -1 : g >= 1 ? stages - 1 : Math.floor(g * (stages - 1));
