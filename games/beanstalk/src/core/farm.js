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

// One action by a hand, a farmhand or a drone. Harvesting replants the plot.
export function tendOnce(plots) {
	const ripe = plots.findIndex(isRipe);
	if (ripe >= 0) {
		plots[ripe] = 0;
		return 'harvest';
	}
	const empty = plots.indexOf(null);
	if (empty >= 0) {
		plots[empty] = 0;
		return 'plant';
	}
	return null;
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
