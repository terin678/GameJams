// Neighbours: people in the valley you can befriend with gifts.
// A neighbour is data:
//   { id, name, role, unlock: { grown?, phase? }, loves: [giftIds], likes: [...], dislikes: [...],
//     look: { hat, shirt, skin }, meet: 'journal line', says: { love, like, neutral, dislike },
//     perks: [{ hearts, effect: { ... }, text }] }
// A gift is { id, name, phase, cost: { coins|pages|matter } }.
// `t` is TUNING.friends. state.friends[id] = { points, readyAt, known: { giftId: reaction }, said }.

import { EFFECTS, CURRENCIES } from './projects.js';

export const REACTIONS = ['love', 'like', 'neutral', 'dislike'];

export const reactionTo = (def, giftId) =>
	def.loves.includes(giftId) ? 'love'
		: def.likes.includes(giftId) ? 'like'
			: def.dislikes.includes(giftId) ? 'dislike' : 'neutral';

export const heartsOf = (points, t) => Math.min(t.maxHearts, Math.floor(points / t.pointsPerHeart));

// Neighbours who should turn up now and haven't yet.
export const newlyMet = (state, defs) => defs.filter(d =>
	!state.friends[d.id] && state.phase >= (d.unlock.phase ?? 1) && state.grown >= (d.unlock.grown ?? 0));

export function meet(state, def) {
	state.friends[def.id] = { points: 0, readyAt: 0, known: {}, said: '' };
}

// Gifts get dearer as the friendship deepens.
export function giftCost(gift, hearts, t) {
	const cost = {};
	for (const [c, v] of Object.entries(gift.cost)) cost[c] = Math.ceil(v * t.costGrowth ** hearts);
	return cost;
}

export const giftsFor = (state, gifts) => gifts.filter(g => state.phase >= g.phase);

// Seconds until this neighbour will take another gift.
export const waitFor = (state, def) => Math.max(0, (state.friends[def.id]?.readyAt ?? 0) - state.time);

export function canGive(state, def, gift, t) {
	const friend = state.friends[def.id];
	if (!friend || state.phase < gift.phase || waitFor(state, def) > 0) return false;
	if (heartsOf(friend.points, t) >= t.maxHearts) return false;
	return Object.entries(giftCost(gift, heartsOf(friend.points, t), t)).every(([c, v]) => state[c] >= v);
}

// Hands over a gift. Returns null if it can't be given, otherwise
// { reaction, hearts, perks } where perks are the ones this gift just earned.
// A disliked gift is wasted, but never costs a heart already won.
export function give(state, def, gift, t) {
	if (!canGive(state, def, gift, t)) return null;
	const friend = state.friends[def.id];
	const before = heartsOf(friend.points, t);
	for (const [c, v] of Object.entries(giftCost(gift, before, t))) state[c] -= v;
	const reaction = reactionTo(def, gift.id);
	friend.points = Math.max(before * t.pointsPerHeart, friend.points + t.points[reaction]);
	friend.known[gift.id] = reaction;
	friend.said = def.says[reaction];
	friend.readyAt = state.time + t.giftSeconds;
	const hearts = heartsOf(friend.points, t);
	return { reaction, hearts, perks: def.perks.filter(p => p.hearts > before && p.hearts <= hearts) };
}

// The effects of every perk earned so far, for computeMods.
export function perkEffects(friends, defs, t) {
	const effects = [];
	for (const def of defs) {
		const friend = friends[def.id];
		if (!friend) continue;
		const hearts = heartsOf(friend.points, t);
		for (const p of def.perks) if (p.hearts <= hearts) effects.push(p.effect);
	}
	return effects;
}

export const nextPerk = (def, hearts) => def.perks.find(p => p.hearts > hearts) ?? null;

export function validateGift(gift) {
	const errors = [];
	for (const k of ['id', 'name']) if (!gift[k] || typeof gift[k] !== 'string') errors.push(`${k} is missing`);
	if (![1, 2, 3].includes(gift.phase)) errors.push(`phase ${gift.phase} is not 1, 2 or 3`);
	const cost = Object.entries(gift.cost ?? {});
	if (!cost.length) errors.push('cost is empty');
	for (const [c, v] of cost) {
		if (!CURRENCIES.includes(c)) errors.push(`unknown currency "${c}"`);
		if (!(v > 0)) errors.push(`cost in ${c} must be > 0`);
	}
	return errors;
}

export function validateNeighbour(def, giftIds, t) {
	const errors = [];
	for (const k of ['id', 'name', 'role', 'meet']) if (!def[k] || typeof def[k] !== 'string') errors.push(`${k} is missing`);
	if (!def.unlock) errors.push('unlock is missing');
	const tastes = ['loves', 'likes', 'dislikes'].flatMap(k => def[k] ?? []);
	for (const k of ['loves', 'likes', 'dislikes']) if (!Array.isArray(def[k])) errors.push(`${k} must be a list`);
	for (const id of tastes) if (!giftIds.has(id)) errors.push(`unknown gift "${id}"`);
	if (new Set(tastes).size !== tastes.length) errors.push('a gift is listed under two tastes');
	if (!def.loves?.length) errors.push('loves nothing');
	for (const r of REACTIONS) if (!def.says?.[r]) errors.push(`says.${r} is missing`);
	for (const k of ['hat', 'shirt', 'skin']) if (!def.look?.[k]) errors.push(`look.${k} is missing`);
	if (!def.perks?.length) errors.push('has no perks');
	let last = 0;
	for (const p of def.perks ?? []) {
		if (!(p.hearts > last && p.hearts <= t.maxHearts)) errors.push(`perk at ${p.hearts} hearts is out of order or out of range`);
		last = p.hearts;
		if (!p.text) errors.push(`perk at ${p.hearts} hearts has no text`);
		const keys = Object.keys(p.effect ?? {});
		if (!keys.length) errors.push(`perk at ${p.hearts} hearts does nothing`);
		for (const k of keys) if (!EFFECTS[k]) errors.push(`unknown effect "${k}"`);
	}
	return errors;
}
