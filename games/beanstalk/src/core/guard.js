// The Guard: pests raid the farm in waves, and the animals you post see them off.
//
// Every raid is forecast: you know what is coming and when. Before it arrives
// you fill your posts with animals, each good against one kind of pest. The
// raid itself plays out on its own, a round at a time: every animal still on
// its feet goes for a pest (one it is good against, if any are left), and every
// pest still in the beans may wear an animal out. The raid is won when the
// pests are gone, and lost when the animals are, or when it drags on too long.
// Wins add up to ranks, which change the farm for good; the pests left at the
// end of a lost raid eat plots and raid the barn (core/sim.js does that part).
//
// Later, up in the clouds, the pests are tough: a tough pest shrugs off most
// attempts (the chance is divided by its `tough`). The answer is training: each
// level an animal has been trained multiplies its chances.
//
// `G` is GUARD from data/guard.js. state.guard is
//   { open, posts, roster: { defenderId: n }, wins, losses, wave: { foeId: n },
//     nextAt, fight: null | { foes, up, t }, acc, said, levels: { defenderId: n } }

import { EFFECTS } from './projects.js';

export const createGuard = G => ({
	open: false, posts: G.posts.start, roster: {}, wins: 0, losses: 0,
	wave: null, nextAt: 0, fight: null, acc: 0, said: '', levels: {},
});

const total = counts => Object.values(counts ?? {}).reduce((a, b) => a + b, 0);

export const unlockDue = (state, G) => !state.guard.open && state.grown >= G.unlock.grown;

// The wave table row for this many wins. Some rows wait for a later phase of the game.
export const tierFor = (wins, G, phase = 1) => G.waves.filter(w => wins >= w.wins && phase >= (w.phase ?? 1)).at(-1) ?? G.waves[0];

// The next wave: mostly one kind of pest, the rest drawn from the tier's others.
export function makeWave(wins, G, rng, phase = 1) {
	const tier = tierFor(wins, G, phase);
	const lead = rng.pick(tier.foes);
	const others = tier.foes.filter(f => f !== lead);
	const wave = {};
	for (let i = 0; i < tier.size; i++) {
		const kind = !others.length || rng.next() < G.raid.lead ? lead : rng.pick(others);
		wave[kind] = (wave[kind] ?? 0) + 1;
	}
	return wave;
}

// "3 slugs and 1 mouse"
export function waveText(wave, G) {
	const parts = G.foes.filter(f => wave[f.id] > 0).map(f => `${wave[f.id]} ${wave[f.id] === 1 ? f.name : f.plural}`);
	return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}` : parts[0] ?? 'nothing';
}

export const ranksEarned = (guard, G) => G.ranks.filter(r => guard.wins >= r.wins);
export const rankEffects = (guard, G) => ranksEarned(guard, G).filter(r => r.effect).map(r => r.effect);
export const nextRank = (guard, G) => G.ranks.find(r => guard.wins < r.wins) ?? null;
// Once drilled, the animals take the best posts for each raid themselves.
export const hasDrill = (guard, G) => ranksEarned(guard, G).some(r => r.drill);

// The animals that have turned up so far.
export const defendersFor = (guard, G) => G.defenders.filter(d => guard.wins >= d.wins);
export const postsUsed = guard => total(guard.roster);

// The roster that covers a wave best: each post goes to whichever animal has
// the most pests of its kind per animal already posted.
export function bestRoster(wave, posts, defenders) {
	const roster = {};
	const covers = d => d.strong.reduce((n, f) => n + (wave[f] ?? 0), 0);
	for (let i = 0; i < posts && defenders.length; i++) {
		let best = defenders[0];
		for (const d of defenders) {
			if (covers(d) / ((roster[d.id] ?? 0) + 1) > covers(best) / ((roster[best.id] ?? 0) + 1)) best = d;
		}
		roster[best.id] = (roster[best.id] ?? 0) + 1;
	}
	return roster;
}

function drill(guard, G) {
	if (hasDrill(guard, G) && !guard.fight && guard.wave) guard.roster = bestRoster(guard.wave, guard.posts, defendersFor(guard, G));
}

export function openGuard(state, G, rng) {
	const { guard } = state;
	guard.open = true;
	guard.wave = makeWave(guard.wins, G, rng, state.phase);
	guard.nextAt = state.time + G.raid.firstSeconds;
	drill(guard, G);
}

// Replaces the whole roster. Not during a raid, and only with animals you have and posts to put them on.
export function setRoster(state, roster, G) {
	const { guard } = state;
	if (!guard.open || guard.fight) return false;
	const known = defendersFor(guard, G).map(d => d.id);
	const entries = Object.entries(roster).filter(([, n]) => n !== 0);
	if (entries.some(([id, n]) => !known.includes(id) || n < 0 || !Number.isInteger(n))) return false;
	if (entries.reduce((sum, [, n]) => sum + n, 0) > guard.posts) return false;
	guard.roster = Object.fromEntries(entries);
	return true;
}

// Posts one more (delta 1) or one fewer (delta -1) of an animal.
export const assign = (state, id, delta, G) =>
	setRoster(state, { ...state.guard.roster, [id]: (state.guard.roster[id] ?? 0) + delta }, G);

// What the next post costs, or null when every post is built.
export function postCost(guard, G) {
	if (guard.posts >= G.posts.max) return null;
	const cost = {};
	for (const [c, v] of Object.entries(G.posts.cost)) cost[c] = Math.ceil(v * G.posts.costGrowth ** (guard.posts - G.posts.start));
	return cost;
}

export function buyPost(state, G) {
	const cost = postCost(state.guard, G);
	if (!state.guard.open || !cost || Object.entries(cost).some(([c, v]) => state[c] < v)) return false;
	for (const [c, v] of Object.entries(cost)) state[c] -= v;
	state.guard.posts++;
	drill(state.guard, G);
	return true;
}

// Training: what the next level of an animal costs, or null when it is fully trained
// (or training has not started yet).
export function trainCost(state, id, G) {
	const level = state.guard.levels[id] ?? 0;
	if ((state.phase ?? 1) < G.train.phase || level >= G.train.max) return null;
	const cost = {};
	for (const [c, v] of Object.entries(G.train.cost)) cost[c] = Math.ceil(v * G.train.costGrowth ** level);
	return cost;
}

export function train(state, id, G) {
	const { guard } = state;
	const cost = trainCost(state, id, G);
	if (!guard.open || !cost || !defendersFor(guard, G).some(d => d.id === id)) return false;
	if (Object.entries(cost).some(([c, v]) => state[c] < v)) return false;
	for (const [c, v] of Object.entries(cost)) state[c] -= v;
	guard.levels[id] = (guard.levels[id] ?? 0) + 1;
	return true;
}

// The chance that one attempt by an animal sees off a pest of this kind.
export function hitChance(defender, foeId, level, G) {
	const base = defender.strong.includes(foeId) ? G.odds.strong : G.odds.weak;
	const tough = G.foes.find(f => f.id === foeId)?.tough ?? 1;
	return Math.min(G.train.cap, base * (1 + G.train.per * level) / tough);
}

// Seconds until the next raid; 0 while one is going on.
export const raidIn = state => (state.guard.fight ? 0 : Math.max(0, state.guard.nextAt - state.time));

// Whether the tab should be flagged: a post stands empty, or a raid is close
// and brings a pest that nothing posted is good against.
export function needsAttention(state, G) {
	const { guard } = state;
	if (!guard.open || guard.fight || hasDrill(guard, G)) return false;
	if (postsUsed(guard) < guard.posts) return true;
	if (raidIn(state) > G.raid.warnSeconds) return false;
	const covered = new Set(G.defenders.filter(d => guard.roster[d.id] > 0).flatMap(d => d.strong));
	return Object.keys(guard.wave).some(f => guard.wave[f] > 0 && !covered.has(f));
}

// The kind of pest with the most left, from `kinds`.
const biggest = (foes, kinds) => kinds.filter(f => foes[f] > 0).sort((a, b) => foes[b] - foes[a])[0];

function round(fight, G, rng, levels = {}) {
	const { foes, up } = fight;
	for (const d of G.defenders) {
		for (let i = 0; i < (up[d.id] ?? 0); i++) {
			const good = biggest(foes, d.strong);
			const target = good ?? biggest(foes, Object.keys(foes));
			if (!target) return;
			if (rng.next() < hitChance(d, target, levels[d.id] ?? 0, G)) foes[target]--;
		}
	}
	for (let i = total(foes); i > 0 && total(up) > 0; i--) {
		if (rng.next() >= G.odds.tire) continue;
		// One of the animals still up, picked evenly.
		let k = Math.floor(rng.next() * total(up));
		for (const id of Object.keys(up)) {
			if (k < up[id]) {
				up[id]--;
				break;
			}
			k -= up[id];
		}
	}
}

// Call every tick. Returns events: { type: 'raid', wave } when one begins, and
// { type: 'raidEnd', id: 'won' | 'lost', left, wave, ranks } when it is over,
// where `left` is how many pests were still in the beans and `ranks` are newly earned.
export function step(state, dt, G, rng) {
	const { guard } = state;
	const events = [];
	if (!guard.open) return events;
	if (!guard.fight) {
		if (state.time < guard.nextAt) return events;
		drill(guard, G);
		guard.fight = { foes: { ...guard.wave }, up: { ...guard.roster }, t: 0 };
		guard.acc = 0;
		events.push({ type: 'raid', wave: guard.wave });
	} else {
		guard.acc += dt;
	}
	const { fight } = guard;
	while (guard.fight) {
		const left = total(fight.foes);
		const over = left === 0 || total(fight.up) === 0 || fight.t >= G.raid.maxSeconds;
		if (over) {
			const before = ranksEarned(guard, G);
			const won = left === 0;
			if (won) guard.wins++;
			else guard.losses++;
			guard.fight = null;
			const wave = guard.wave;
			guard.wave = makeWave(guard.wins, G, rng, state.phase);
			guard.nextAt = state.time + G.raid.everySeconds;
			drill(guard, G);
			events.push({ type: 'raidEnd', id: won ? 'won' : 'lost', left, wave, ranks: ranksEarned(guard, G).filter(r => !before.includes(r)) });
			break;
		}
		if (guard.acc < G.raid.roundSeconds) break;
		guard.acc -= G.raid.roundSeconds;
		fight.t += G.raid.roundSeconds;
		round(fight, G, rng, guard.levels);
	}
	return events;
}

export function validateGuard(G) {
	const errors = [];
	if (!(G.unlock?.grown > 0)) errors.push('unlock.grown must be > 0');
	if (!G.log) errors.push('log is missing');
	const p = G.posts ?? {};
	if (!(p.start > 0)) errors.push('posts.start must be > 0');
	if (!(p.max >= p.start && p.max > 0)) errors.push('posts.max must be at least posts.start');
	if (!(p.cost?.coins > 0)) errors.push('posts.cost must cost coins');
	if (!(p.costGrowth > 1)) errors.push('posts.costGrowth must be > 1');
	const r = G.raid ?? {};
	if (!(r.firstSeconds > 0 && r.everySeconds > 0)) errors.push('raid: firstSeconds and everySeconds must be > 0');
	if (!(r.warnSeconds > 0 && r.warnSeconds < r.everySeconds)) errors.push('raid: warnSeconds must be shorter than the wait between raids');
	if (!(r.roundSeconds > 0)) errors.push('raid: roundSeconds must be > 0');
	if (!(r.maxSeconds > r.roundSeconds && r.maxSeconds < r.everySeconds)) errors.push('raid: maxSeconds must be a few rounds, and less than the wait');
	if (!(r.lead > 0 && r.lead <= 1)) errors.push('raid: lead must be in (0, 1]');
	const o = G.odds ?? {};
	if (!(o.strong > o.weak && o.weak >= 0 && o.strong <= 1)) errors.push('odds: strong must beat weak');
	if (!(o.tire > 0 && o.tire < 1)) errors.push('odds: tire must be in (0, 1)');
	if (!(G.loss?.plotsEach >= 0)) errors.push('loss.plotsEach must be >= 0');
	if (!(G.loss?.barnShare >= 0 && G.loss?.barnShare <= 1)) errors.push('loss.barnShare must be in [0, 1]');
	if (!(G.bountySeconds >= 0)) errors.push('bountySeconds must be >= 0');
	if (!G.lines?.raid?.includes('{wave}')) errors.push('lines.raid must mention {wave}');
	for (const k of ['won', 'lost']) if (!G.lines?.[k]) errors.push(`lines.${k} is missing`);

	const tr = G.train ?? {};
	if (!(tr.phase >= 1 && tr.max > 0 && tr.per > 0 && tr.cap > 0 && tr.cap <= 1)) errors.push('train: phase, max, per and cap are needed');
	if (!(tr.costGrowth > 1) || !Object.keys(tr.cost ?? {}).length) errors.push('train: cost and costGrowth are needed');
	if (!tr.log) errors.push('train: log is missing');
	const foes = new Set();
	for (const f of G.foes ?? []) {
		if (f.tough !== undefined && !(f.tough > 1)) errors.push(`foe ${f.id}: tough must be > 1`);
		if (!f.name || !f.plural) errors.push(`foe ${f.id}: name or plural is missing`);
		if (foes.has(f.id)) errors.push(`foe ${f.id} is listed twice`);
		foes.add(f.id);
	}
	for (const d of G.defenders ?? []) {
		for (const k of ['name', 'plural', 'text']) if (!d[k]) errors.push(`${d.id}: ${k} is missing`);
		if (!(d.wins >= 0)) errors.push(`${d.id}: wins must be >= 0`);
		if (!d.strong?.length) errors.push(`${d.id}: is good against nothing`);
		for (const f of d.strong ?? []) if (!foes.has(f)) errors.push(`${d.id}: unknown foe "${f}"`);
	}
	if (!(G.defenders ?? []).some(d => d.wins === 0)) errors.push('there is nobody to post at the start');
	if (G.waves?.[0]?.wins !== 0) errors.push('the first wave must be for 0 wins');
	let last = -1;
	for (const w of G.waves ?? []) {
		if (!(w.size > 0)) errors.push(`wave at ${w.wins} wins: size must be > 0`);
		if (!(w.wins > last)) errors.push('waves must climb in wins');
		if ((w.foes ?? []).some(f => (G.foes ?? []).find(x => x.id === f)?.tough) && !((w.phase ?? 1) >= tr.phase)) errors.push(`wave at ${w.wins} wins: tough pests before training begins`);
		last = w.wins;
		for (const f of w.foes ?? []) {
			if (!foes.has(f)) errors.push(`wave at ${w.wins} wins: unknown foe "${f}"`);
			else if (!(G.defenders ?? []).some(d => d.wins <= w.wins && d.strong?.includes(f))) errors.push(`wave at ${w.wins} wins: nothing guards against ${f} yet`);
		}
		if (!w.foes?.length) errors.push(`wave at ${w.wins} wins: no foes`);
	}
	last = 0;
	for (const rank of G.ranks ?? []) {
		if (!rank.name || !rank.text) errors.push(`rank ${rank.name ?? rank.wins}: text or name is missing`);
		if (!(rank.wins > last)) errors.push('ranks must climb in wins');
		last = rank.wins;
		const keys = Object.keys(rank.effect ?? {});
		if (!keys.length && !rank.drill) errors.push(`rank ${rank.name}: does nothing`);
		for (const k of keys) if (!EFFECTS[k]) errors.push(`rank ${rank.name}: unknown effect "${k}"`);
	}
	if (!(G.ranks ?? []).some(rank => rank.drill)) errors.push('no drill rank: the guard never learns to post itself');
	return errors;
}
