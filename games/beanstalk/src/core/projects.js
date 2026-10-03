// Projects are the upgrades. A project is data:
//   { id, phase, title, flavor, cost: { coins|pages|matter }, costGrowth?, max?,
//     requires?: { grown, height, phase, has: [ids] }, effect?: { ... }, grant?: { ... } }
// `effect` changes the modifiers below for as long as the project is owned;
// `grant` is handed over once, at the moment of purchase.

export const EFFECTS = {
	plots: 'add', tend: 'add', pagesRate: 'add', replicate: 'add',
	growth: 'mul', yield: 'mul', marketing: 'mul', probeYield: 'mul', matterRate: 'mul',
	scarecrow: 'flag', greenhouse: 'flag', autoprice: 'flag', rainmaker: 'flag',
};
export const GRANTS = ['probes', 'done'];
export const CURRENCIES = ['coins', 'pages', 'matter'];
const REQUIRES = ['grown', 'height', 'phase'];
const PHASES = [1, 2, 3];
const START = { add: 0, mul: 1, flag: false };

export function computeMods(owned, defs, base = {}) {
	const mods = {};
	for (const [key, kind] of Object.entries(EFFECTS)) mods[key] = base[key] ?? START[kind];
	for (const def of defs) {
		const n = owned[def.id] ?? 0;
		if (!n) continue;
		for (const [key, v] of Object.entries(def.effect ?? {})) {
			const kind = EFFECTS[key];
			if (kind === 'add') mods[key] += v * n;
			else if (kind === 'mul') mods[key] *= v ** n;
			else mods[key] = true;
		}
	}
	return mods;
}

export function costOf(def, count = 0) {
	const cost = {};
	for (const [c, v] of Object.entries(def.cost)) cost[c] = Math.ceil(v * (def.costGrowth ?? 1) ** count);
	return cost;
}

const count = (state, def) => state.owned[def.id] ?? 0;

export function visible(state, def) {
	if (count(state, def) >= (def.max ?? 1)) return false;
	if (state.phase < def.phase) return false;
	const r = def.requires ?? {};
	if (REQUIRES.some(k => r[k] !== undefined && state[k] < r[k])) return false;
	return (r.has ?? []).every(id => state.owned[id] > 0);
}

export const affordable = (state, def) =>
	Object.entries(costOf(def, count(state, def))).every(([c, v]) => state[c] >= v);

export const available = (state, defs) => defs.filter(d => visible(state, d));

export function buy(state, def) {
	if (!visible(state, def) || !affordable(state, def)) return false;
	for (const [c, v] of Object.entries(costOf(def, count(state, def)))) state[c] -= v;
	state.owned[def.id] = count(state, def) + 1;
	for (const [k, v] of Object.entries(def.grant ?? {})) state[k] = v === true ? true : state[k] + v;
	return true;
}

export function validateProject(def, ids) {
	const errors = [];
	for (const k of ['id', 'title', 'flavor']) if (!def[k] || typeof def[k] !== 'string') errors.push(`${k} is missing`);
	if (!PHASES.includes(def.phase)) errors.push(`phase ${def.phase} is not one of ${PHASES}`);
	const cost = Object.entries(def.cost ?? {});
	if (!cost.length) errors.push('cost is empty');
	for (const [c, v] of cost) {
		if (!CURRENCIES.includes(c)) errors.push(`unknown currency "${c}"`);
		if (!(v > 0)) errors.push(`cost in ${c} must be > 0`);
	}
	if (def.costGrowth !== undefined && !(def.costGrowth >= 1)) errors.push('costGrowth must be >= 1');
	if (def.max !== undefined && !(Number.isInteger(def.max) && def.max >= 1)) errors.push('max must be a whole number >= 1');
	for (const [k, v] of Object.entries(def.requires ?? {})) {
		if (k === 'has') {
			for (const id of v) if (!ids.has(id)) errors.push(`requires unknown project "${id}"`);
		} else if (!REQUIRES.includes(k)) errors.push(`unknown requirement "${k}"`);
	}
	for (const k of Object.keys(def.effect ?? {})) if (!EFFECTS[k]) errors.push(`unknown effect "${k}"`);
	for (const k of Object.keys(def.grant ?? {})) if (!GRANTS.includes(k)) errors.push(`unknown grant "${k}"`);
	if (!def.effect && !def.grant) errors.push('does nothing: no effect or grant');
	return errors;
}
