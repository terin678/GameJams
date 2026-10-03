// The Climb: expeditions up the stalk, one ledge at a time.
//
// Each ledge is an encounter with a few options. Reaching a ledge costs
// provisions and takes a while; the stalk has to be tall enough first. An
// option may cost something, may need something (a friend, a seed trait, a
// calm Giant), and may be risky. A success moves you up for good and can leave
// you a find, which changes the farm from then on. A failure sends the climber
// sliding back down and usually annoys the Giant; annoy him enough and he
// stamps, which shakes every bean on the farm out of the ground.
//
// `C` is CLIMB from data/climb.js. state.climb is
//   { open, ledge, climbing: null | { readyAt }, waiting, finds: [ids], anger, said }
// An encounter is { id, name, height, provisions: { coins }, text, options: [...] }.
// An option is { label, cost?, needs?: { hearts: { who, n } | trait: { id, level } | calm: true },
//   chance?, win, lose?, find?: { id, name, text, effect }, grant?: { coins|pages|beans },
//   anger?: change on success, failAnger?: change on failure (default 1) }.

import { EFFECTS, CURRENCIES } from './projects.js';
import { heartsOf } from './neighbours.js';
import { formatNumber } from './format.js';

export const createClimb = () => ({
	open: false, ledge: 0, climbing: null, waiting: false, finds: [], anger: 0, said: '',
});

export const unlockDue = (state, C) => !state.climb.open && state.phase >= C.unlock.phase;

// The ledge the climber is heading for, or null at the top.
export const nextEncounter = (state, C) => C.encounters[state.climb.ledge] ?? null;

const affordable = (state, cost) => Object.entries(cost ?? {}).every(([c, v]) => state[c] >= v);

// Why the climber can't set off: 'top', 'busy', 'short' (stalk too low), 'poor', or null if they can.
export function climbBlocked(state, C) {
	const enc = nextEncounter(state, C);
	if (!state.climb.open || !enc) return 'top';
	if (state.climb.climbing || state.climb.waiting) return 'busy';
	if (state.height < enc.height) return 'short';
	if (!affordable(state, enc.provisions)) return 'poor';
	return null;
}

export function startClimb(state, C) {
	if (climbBlocked(state, C)) return false;
	const enc = nextEncounter(state, C);
	for (const [c, v] of Object.entries(enc.provisions)) state[c] -= v;
	state.climb.climbing = { readyAt: state.time + C.seconds };
	return true;
}

// Seconds until the climber reaches the ledge; null when not climbing.
export const climbingFor = state => (state.climb.climbing ? Math.max(0, state.climb.climbing.readyAt - state.time) : null);

// Call every tick: true at the moment the climber arrives.
export function arrive(state) {
	if (!state.climb.climbing || climbingFor(state) > 0) return false;
	state.climb.climbing = null;
	state.climb.waiting = true;
	return true;
}

// Why an option can't be chosen: 'needs' or 'poor', or null if it can.
// `t` is TUNING.friends, for counting hearts.
export function optionBlocked(state, option, t) {
	const n = option.needs ?? {};
	if (n.hearts && heartsOf(state.friends[n.hearts.who]?.points ?? 0, t) < n.hearts.n) return 'needs';
	if (n.trait && (state.seeds.traits[n.trait.id] ?? 0) < n.trait.level) return 'needs';
	if (n.calm && state.climb.anger > 0) return 'needs';
	if (!affordable(state, option.cost)) return 'poor';
	return null;
}

// Makes the choice. Returns null if it can't be made, otherwise
// { won, text, find, stomp }. `rng.next()` decides a risky option. `money`
// names what coins are called and worth when reporting a grant.
export function choose(state, index, C, rng, t, money = { name: 'coins', per: 1 }) {
	const { climb } = state;
	const enc = nextEncounter(state, C);
	const option = enc?.options[index];
	if (!climb.waiting || !option || optionBlocked(state, option, t)) return null;
	for (const [c, v] of Object.entries(option.cost ?? {})) state[c] -= v;
	climb.waiting = false;
	const won = (option.chance ?? 1) >= 1 || rng.next() < option.chance;
	if (!won) {
		climb.anger = Math.max(0, climb.anger + (option.failAnger ?? 1));
		const stomp = climb.anger >= C.giant.stompAt;
		if (stomp) climb.anger = C.giant.afterStomp;
		climb.said = stomp ? `${option.lose} ${C.giant.stomp}` : option.lose;
		return { won, text: climb.said, find: null, stomp };
	}
	for (const [k, v] of Object.entries(option.grant ?? {})) state[k] += v;
	climb.anger = Math.max(0, climb.anger + (option.anger ?? 0));
	if (option.find) climb.finds.push(option.find.id);
	climb.ledge++;
	const gains = Object.entries(option.grant ?? {})
		.map(([k, v]) => (k === 'coins' ? `+${formatNumber(v / money.per)} ${money.name}` : `+${formatNumber(v)} ${k}`)).join(', ');
	climb.said = gains ? `${option.win} (${gains})` : option.win;
	return { won, text: climb.said, find: option.find ?? null, stomp: false };
}

const allFinds = C => C.encounters.flatMap(e => e.options.map(o => o.find).filter(Boolean));

// The finds brought back so far, in the order they are listed in the data.
export const findsOf = (climb, C) => allFinds(C).filter(f => climb.finds.includes(f.id));

// What the finds do, as effects for computeMods.
export const findEffects = (climb, C) => findsOf(climb, C).map(f => f.effect);

// The Giant's mood, as a word from the data.
export const temper = (climb, C) => C.giant.moods[Math.min(climb.anger, C.giant.moods.length - 1)];

export function validateClimb(C, { neighbours, traits, phases }) {
	const errors = [];
	if (!phases.includes(C.unlock?.phase)) errors.push('unlock.phase is not a phase');
	if (!C.log) errors.push('log is missing');
	if (!(C.seconds > 0)) errors.push('seconds must be > 0');
	const g = C.giant ?? {};
	if (!(g.stompAt > 0 && g.afterStomp >= 0 && g.afterStomp < g.stompAt)) errors.push('giant: stompAt and afterStomp do not make sense');
	if (!g.stomp) errors.push('giant: stomp line is missing');
	if ((g.moods?.length ?? 0) < g.stompAt) errors.push('giant: needs a mood for every level of anger below a stamp');
	const ids = new Set();
	const findIds = new Set();
	let last = -1;
	for (const e of C.encounters ?? []) {
		const at = `ledge ${e.id}`;
		for (const k of ['id', 'name', 'text']) if (!e[k]) errors.push(`${at}: ${k} is missing`);
		if (ids.has(e.id)) errors.push(`${at} is listed twice`);
		ids.add(e.id);
		if (!(e.height > last)) errors.push(`${at}: heights must climb`);
		last = e.height;
		if (!(e.provisions?.coins > 0)) errors.push(`${at}: provisions must cost coins`);
		if ((e.options?.length ?? 0) < 2) errors.push(`${at}: needs at least two options`);
		if (!(e.options ?? []).some(o => !o.needs)) errors.push(`${at}: needs an option anyone can take`);
		for (const o of e.options ?? []) {
			const opt = `${at} "${o.label}"`;
			if (!o.label || !o.win) errors.push(`${opt}: label or win line is missing`);
			const risky = o.chance !== undefined && o.chance < 1;
			if (o.chance !== undefined && !(o.chance > 0 && o.chance <= 1)) errors.push(`${opt}: chance must be in (0, 1]`);
			if (risky && !o.lose) errors.push(`${opt}: a risky option needs a lose line`);
			for (const [c, v] of Object.entries({ ...o.cost, ...o.grant })) {
				if (![...CURRENCIES, 'beans'].includes(c) || !(v > 0)) errors.push(`${opt}: bad amount of "${c}"`);
			}
			const n = o.needs ?? {};
			if (n.hearts && !neighbours.includes(n.hearts.who)) errors.push(`${opt}: unknown neighbour "${n.hearts.who}"`);
			if (n.trait && !traits.includes(n.trait.id)) errors.push(`${opt}: unknown trait "${n.trait.id}"`);
			for (const k of Object.keys(n)) if (!['hearts', 'trait', 'calm'].includes(k)) errors.push(`${opt}: unknown need "${k}"`);
			if (o.needs && !o.needsText) errors.push(`${opt}: needsText is missing`);
			if (o.find) {
				for (const k of ['id', 'name', 'text']) if (!o.find[k]) errors.push(`${opt}: find.${k} is missing`);
				if (findIds.has(o.find.id)) errors.push(`${opt}: find "${o.find.id}" is used twice`);
				findIds.add(o.find.id);
				const keys = Object.keys(o.find.effect ?? {});
				if (!keys.length) errors.push(`${opt}: find does nothing`);
				for (const k of keys) if (!EFFECTS[k]) errors.push(`${opt}: unknown effect "${k}"`);
			}
		}
	}
	if (!C.encounters?.length) errors.push('encounters is empty');
	return errors;
}
