// Lifetime challenges with bronze/silver/gold tiers. Progress is a plain
// { id: number } object so it saves straight to storage.
// mode 'count' (default) adds up across runs; mode 'best' keeps the maximum.

export function loadProgress(saved, defs) {
	const p = {};
	for (const d of defs) {
		const v = saved?.[d.id];
		p[d.id] = Number.isFinite(v) ? v : 0;
	}
	return p;
}

export const tierOf = (def, value) => def.goals.filter(g => value >= g).length;

const matches = (def, event, info) =>
	def.event === event && (!def.match?.enemy || def.match.enemy === info.enemy);

// Returns [{ def, tier }] for every tier reached by this event.
export function record(progress, defs, event, info = {}) {
	const value = info.value ?? 1;
	const ups = [];
	for (const def of defs) {
		if (!matches(def, event, info)) continue;
		const before = progress[def.id] ?? 0;
		const after = def.mode === 'best' ? Math.max(before, value) : before + value;
		progress[def.id] = after;
		const t0 = tierOf(def, before), t1 = tierOf(def, after);
		if (t1 > t0) ups.push({ def, tier: t1 });
	}
	return ups;
}

// {n} becomes the goal; {s} becomes 's' unless the goal is 1.
export const formatTitle = (def, goal) =>
	def.title.replace('{n}', goal).replace('{s}', goal === 1 ? '' : 's');

// What to show: the title names the next goal (or the gold goal once done).
export function describe(def, value) {
	const tier = tierOf(def, value);
	const done = tier >= def.goals.length;
	const goal = def.goals[Math.min(tier, def.goals.length - 1)];
	return { title: formatTitle(def, goal), tier, value, goal, done };
}

// [bronze, silver, gold] medal counts, each challenge counted at its top tier.
export function tierTotals(defs, progress) {
	const totals = [0, 0, 0];
	for (const d of defs) {
		const t = tierOf(d, progress[d.id] ?? 0);
		if (t > 0) totals[t - 1]++;
	}
	return totals;
}
