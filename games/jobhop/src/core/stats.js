// Player stats are a base (data/passives.js STATS) plus a flat list of mods
// { stat, add } from the active job, mastery nodes and passive items.

export function deriveStats(STATS, mods) {
	const s = {};
	for (const [k, def] of Object.entries(STATS)) s[k] = def.base;
	for (const m of mods) {
		if (!(m.stat in STATS)) throw new Error(`unknown stat "${m.stat}"`);
		s[m.stat] += m.add;
	}
	for (const [k, def] of Object.entries(STATS)) if (def.min !== undefined) s[k] = Math.max(def.min, s[k]);
	return s;
}

export function passiveMods(PASSIVES, levels) {
	const mods = [];
	for (const [id, lv] of Object.entries(levels)) {
		if (lv > 0 && PASSIVES[id]) mods.push({ stat: PASSIVES[id].stat, add: PASSIVES[id].perLevel * lv });
	}
	return mods;
}

export function formatMod(STATS, stat, add) {
	const def = STATS[stat];
	const sign = add < 0 ? '-' : '+';
	const n = Math.abs(add);
	const value = def.pct ? `${Math.round(n * 100)}%` : `${Math.round(n * 10) / 10}`;
	return `${sign}${value} ${def.name}`;
}
