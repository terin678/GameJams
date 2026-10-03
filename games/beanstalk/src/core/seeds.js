// Seed breeding and the county fair.
//
// Your seed line has a level in each trait. A cross costs coins, takes a while
// to grow out, then offers a few seedlings: each is better in one trait and may
// have slipped (or, with luck, gained) in the others. You keep one, or none.
// Every year at the fair one trait is judged against a bar; clearing it wins a
// ribbon, which raises that trait's bar, boosts demand, and makes crosses luckier.
//
// `S` is SEEDS from data/seeds.js. state.seeds is
//   { open, traits: { id: level }, generation, pending: null | { readyAt, options: [traits] },
//     ribbons: { id: count }, judged: lastYearJudged, result: last fair result }

import { EFFECTS, CURRENCIES } from './projects.js';

const zero = S => Object.fromEntries(S.traits.map(t => [t.id, 0]));

export const createSeeds = S => ({
	open: false, traits: zero(S), generation: 0, pending: null, ribbons: zero(S), judged: 0, result: null,
});

export const unlockDue = (state, S) => !state.seeds.open && state.grown >= S.unlock.grown;

export const ribbonCount = seeds => Object.values(seeds.ribbons).reduce((a, b) => a + b, 0);

export function crossCost(seeds, S) {
	const cost = {};
	for (const [c, v] of Object.entries(S.cross.cost)) cost[c] = Math.ceil(v * S.cross.costGrowth ** seeds.generation);
	return cost;
}

// Chance that a seedling's other traits improve, and that its best one jumps two.
export const luckOf = (seeds, S) => Math.min(S.cross.maxLuck, S.cross.luck + S.cross.luckPerRibbon * ribbonCount(seeds));

// One seedling per trait: that trait goes up; the others may slip or, with luck, rise.
export function makeOptions(traits, S, luck, rng) {
	const clamp = v => Math.max(0, Math.min(S.maxLevel, v));
	return S.traits.map(best => {
		const option = {};
		for (const t of S.traits) {
			const r = rng.next();
			const change = t.id === best.id ? (r < luck ? 2 : 1)
				: r < S.cross.slip ? -1
					: r > 1 - luck / 2 ? 1 : 0;
			option[t.id] = clamp(traits[t.id] + change);
		}
		return option;
	});
}

export const canCross = (state, S) => state.seeds.open && !state.seeds.pending
	&& Object.entries(crossCost(state.seeds, S)).every(([c, v]) => state[c] >= v);

export function cross(state, S, rng) {
	if (!canCross(state, S)) return false;
	const { seeds } = state;
	for (const [c, v] of Object.entries(crossCost(seeds, S))) state[c] -= v;
	seeds.pending = { readyAt: state.time + S.cross.seconds, options: makeOptions(seeds.traits, S, luckOf(seeds, S), rng) };
	return true;
}

// Seconds until the seedlings can be judged; 0 when they're ready. null with no cross under way.
export const growingFor = state => (state.seeds.pending ? Math.max(0, state.seeds.pending.readyAt - state.time) : null);

// Keep seedling `index`, or pass -1 to stick with the old line. Either way the cross is over.
export function choose(state, index) {
	const { seeds } = state;
	if (!seeds.pending || growingFor(state) > 0) return false;
	const option = seeds.pending.options[index];
	if (index !== -1 && !option) return false;
	if (option) seeds.traits = { ...option };
	seeds.generation++;
	seeds.pending = null;
	return true;
}

// The fair judges the traits in turn, one a year.
export const fairTrait = (year, S) => S.traits[(year - 1) % S.traits.length];

// `extra` raises every bar (a New Game+ rule).
export const fairBar = (seeds, traitId, S, extra = 0) => S.fair.firstBar + S.fair.barStep * seeds.ribbons[traitId] + extra;

// Runs this year's fair, once. Returns { trait, bar, level, won } or null if already judged.
export function judge(state, year, S, extra = 0) {
	const { seeds } = state;
	if (!seeds.open || seeds.judged >= year) return null;
	const trait = fairTrait(year, S);
	const bar = fairBar(seeds, trait.id, S, extra);
	const level = seeds.traits[trait.id];
	const won = level >= bar;
	if (won) seeds.ribbons[trait.id]++;
	seeds.judged = year;
	seeds.result = { trait: trait.id, bar, level, won, year };
	return seeds.result;
}

// What the seed line and the ribbons do, as effects for computeMods.
export function seedEffects(seeds, S) {
	if (!seeds.open) return [];
	const effects = S.traits.map(t => ({ [t.effect]: t.per ** seeds.traits[t.id] }));
	const ribbons = ribbonCount(seeds);
	for (const [key, v] of Object.entries(S.fair.ribbonEffect)) effects.push({ [key]: v ** ribbons });
	return effects;
}

export function validateSeeds(S, seasons) {
	const errors = [];
	if (!(S.unlock?.grown >= 0)) errors.push('unlock.grown is missing');
	if (!S.log) errors.push('log is missing');
	if (!(S.maxLevel > 0)) errors.push('maxLevel must be > 0');
	if (!S.traits?.length) errors.push('traits is empty');
	for (const t of S.traits ?? []) {
		for (const k of ['id', 'name', 'fair', 'blurb']) if (!t[k]) errors.push(`trait ${t.id}: ${k} is missing`);
		if (EFFECTS[t.effect] !== 'mul') errors.push(`trait ${t.id}: effect "${t.effect}" must be a multiplying modifier`);
		if (!(t.per > 1)) errors.push(`trait ${t.id}: per must be > 1`);
	}
	const c = S.cross ?? {};
	for (const [cur, v] of Object.entries(c.cost ?? {})) {
		if (!CURRENCIES.includes(cur)) errors.push(`cross: unknown currency "${cur}"`);
		if (!(v > 0)) errors.push('cross: cost must be > 0');
	}
	if (!Object.keys(c.cost ?? {}).length) errors.push('cross: cost is empty');
	if (!(c.costGrowth >= 1)) errors.push('cross: costGrowth must be >= 1');
	if (!(c.seconds > 0)) errors.push('cross: seconds must be > 0');
	for (const k of ['luck', 'maxLuck', 'slip']) if (!(c[k] >= 0 && c[k] <= 1)) errors.push(`cross: ${k} must be between 0 and 1`);
	if (c.slip + c.maxLuck / 2 > 1) errors.push('cross: slip and luck overlap');
	const f = S.fair ?? {};
	if (!seasons.some(s => s.id === f.season)) errors.push(`fair: unknown season "${f.season}"`);
	if (!(f.firstBar > 0 && f.barStep > 0)) errors.push('fair: firstBar and barStep must be > 0');
	for (const k of ['win', 'lose']) if (!f[k]) errors.push(`fair: ${k} line is missing`);
	for (const [key, v] of Object.entries(f.ribbonEffect ?? {})) {
		if (EFFECTS[key] !== 'mul' || !(v > 1)) errors.push(`fair: ribbonEffect "${key}" must multiply by more than 1`);
	}
	return errors;
}
