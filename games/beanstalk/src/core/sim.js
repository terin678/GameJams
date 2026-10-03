// The whole game as a state object and the functions that move it forward.
// `data` is DATA from src/data/index.js. Nothing here touches the page.

import { resize, grow, findWork, tendPlot, eatOne } from './farm.js';
import { demand, sell, adjustPrice, autoPriceDir } from './market.js';
import { calendar, advance, rollWeather, growthMult } from './seasons.js';
import { heightFor, phaseAt, crossed } from './phases.js';
import { computeMods, buy } from './projects.js';
import { newlyMet, meet, give, perkEffects } from './neighbours.js';

const VERSION = 1;

export function createState(data, { golden = 0 } = {}) {
	const state = {
		v: VERSION,
		time: 0,
		day: 0, dayT: 0, weather: null,
		plots: [], tendAcc: 0, tendAt: 0, priceAcc: 0, saleAcc: 0,
		beans: 0,          // in the barn, unsold
		grown: 0,          // ever grown; this is what the stalk is made of
		coins: 0, pages: 0, matter: 0, probes: 0,
		price: data.TUNING.startPrice,
		owned: {},
		friends: {},
		height: 0, phase: 1,
		log: [],
		seen: {},          // journal lines that are only worth saying once
		done: false,
		golden,
	};
	refresh(state, data);
	say(state, data, data.PHASES[0].log);
	return state;
}

// Recomputes everything derived from what is owned. Call after `owned` changes.
export function refresh(state, data) {
	const perks = perkEffects(state.friends, data.NEIGHBOURS, data.TUNING.friends);
	state.mods = computeMods(state.owned, data.PROJECTS, data.TUNING.base, perks);
	state.mods.yield *= 1 + state.golden * data.TUNING.goldenBonus;
	resize(state.plots, state.mods.plots);
	return state;
}

function say(state, data, text) {
	if (!text) return;
	state.log.unshift(text);
	state.log.length = Math.min(state.log.length, data.TUNING.logLines);
}

// Seasons and weather come round again and again; the journal notes each once.
function sayOnce(state, data, key, text) {
	if (state.seen[key]) return;
	state.seen[key] = true;
	say(state, data, text);
}

// One job on the farm, by you or a helper, taking the plots in rotation.
function tendNext(state) {
	const i = findWork(state.plots, state.tendAt);
	if (i < 0) return null;
	state.tendAt = (i + 1) % state.plots.length;
	const did = tendPlot(state.plots, i);
	if (did === 'harvest') {
		state.beans += state.mods.yield;
		state.grown += state.mods.yield;
	}
	return did;
}

function newDay(state, data, rng, events) {
	const { mods } = state;
	const w = mods.rainmaker ? data.WEATHER.find(x => x.summoned) : rollWeather(rng, data.WEATHER);
	state.weather = null;
	if (!w) return;
	if (w.eats) {
		if (mods.scarecrow) return;
		const plot = eatOne(state.plots, rng);
		if (plot < 0) return;
		events.push({ type: 'crow', plot });
		say(state, data, w.log);
		return;
	}
	state.weather = w.id;
	events.push({ type: 'weather', id: w.id });
	sayOnce(state, data, w.id, w.log);
}

// Advances the game by dt seconds. Returns what happened, for sounds and effects.
export function tick(state, dt, data, rng) {
	const events = [];
	if (state.done) return events;
	const T = data.TUNING;
	const { mods } = state;
	state.time += dt;

	const was = calendar(state.day, data.SEASONS, T.calendar).season;
	const days = advance(state, dt, T.calendar);
	for (let i = 0; i < days; i++) newDay(state, data, rng, events);
	const { season } = calendar(state.day, data.SEASONS, T.calendar);
	if (season !== was) {
		events.push({ type: 'season', id: season.id });
		const warm = season.cold && mods.greenhouse && season.logWarm;
		sayOnce(state, data, warm ? `${season.id}:warm` : season.id, warm ? season.logWarm : season.log);
	}

	const weather = data.WEATHER.find(w => w.id === state.weather) ?? null;
	grow(state.plots, dt * mods.growth * growthMult(season, weather, mods) / T.growSeconds);

	// Farmhands and drones. With nothing to do they wait, holding one action ready.
	state.tendAcc += mods.tend * dt;
	let harvested = 0;
	while (state.tendAcc >= 1) {
		const did = tendNext(state);
		if (!did) {
			state.tendAcc = 1;
			break;
		}
		state.tendAcc--;
		if (did === 'harvest') harvested++;
	}
	if (harvested) events.push({ type: 'harvest', n: harvested });

	const full = state.grown >= T.universeBeans;
	if (state.probes > 0 && !full) {
		state.grown += state.probes * mods.probeYield * dt;
		state.matter += state.probes * mods.matterRate * dt;
		state.probes *= Math.exp(mods.replicate * dt);
	}

	const sale = sell(state.beans, state.price, mods.marketing, dt, T.market, state.saleAcc);
	state.beans -= sale.sold;
	state.coins += sale.revenue;
	state.saleAcc = sale.acc;
	if (mods.autoprice) {
		state.priceAcc += dt;
		if (state.priceAcc >= T.market.autoprice.everySeconds) {
			state.priceAcc = 0;
			const dir = autoPriceDir(state.beans, demand(state.price, mods.marketing, T.market), T.market);
			if (dir) state.price = adjustPrice(state.price, dir, T.market);
		}
	}

	state.pages += mods.pagesRate * dt;

	if (state.grown >= T.universeBeans) {
		state.grown = T.universeBeans;
		if (!full) events.push({ type: 'full' });
	}
	const height = heightFor(state.grown, T.height);
	for (const m of crossed(state.height, height, data.MILESTONES)) {
		events.push({ type: 'milestone', id: m.id });
		say(state, data, m.log);
	}
	state.height = height;
	const phase = phaseAt(height, data.PHASES);
	if (phase.id > state.phase) {
		state.phase = phase.id;
		events.push({ type: 'phase', id: phase.id });
		say(state, data, phase.log);
	}
	for (const def of newlyMet(state, data.NEIGHBOURS)) {
		meet(state, def);
		events.push({ type: 'meet', id: def.id });
		say(state, data, def.meet);
	}
	return events;
}

// The Tend button. Returns 'plant', 'harvest' or null.
export function tend(state, data) {
	return state.done ? null : tendNext(state);
}

export function buyProject(state, id, data) {
	const def = data.PROJECTS.find(p => p.id === id);
	if (!def || state.done || !buy(state, def)) return false;
	refresh(state, data);
	return true;
}

// Gives a neighbour a gift. Returns null, or { reaction, hearts, perks }.
export function giveGift(state, neighbourId, giftId, data) {
	const def = data.NEIGHBOURS.find(n => n.id === neighbourId);
	const gift = data.GIFTS.find(g => g.id === giftId);
	if (!def || !gift || state.done) return null;
	const result = give(state, def, gift, data.TUNING.friends);
	if (!result) return null;
	for (const perk of result.perks) say(state, data, `${def.name}, ${perk.hearts} hearts: ${perk.text}`);
	if (result.perks.length) refresh(state, data);
	return result;
}

export function nudgePrice(state, dir, data) {
	state.price = adjustPrice(state.price, dir, data.TUNING.market);
}

// Catches up on time spent away, in coarse steps. Returns what was gained.
// A short gap (a sleepy tab) runs at full speed; a real absence runs slower.
export function simulateOffline(state, seconds, data, rng) {
	const T = data.TUNING.offline;
	const span = Math.min(seconds, T.capSeconds);
	const worked = seconds < T.minSeconds ? span : span * T.rate;
	const before = { grown: state.grown, coins: state.coins, day: state.day };
	for (let t = 0; t < worked && !state.done; t += T.stepSeconds) {
		tick(state, Math.min(T.stepSeconds, worked - t), data, rng);
	}
	return {
		seconds: span,
		worked,
		capped: seconds > T.capSeconds,
		grown: state.grown - before.grown,
		coins: state.coins - before.coins,
		days: state.day - before.day,
	};
}

export function serialize(state) {
	const { mods, ...rest } = state;
	return rest;
}

export function restore(saved, data) {
	const fresh = createState(data);
	if (!saved || saved.v !== VERSION || !Array.isArray(saved.plots) || typeof saved.owned !== 'object') return fresh;
	// Fields added since the save was made keep their fresh values.
	return refresh({ ...fresh, ...saved }, data);
}

export const newGamePlus = (state, data) => createState(data, { golden: state.golden + 1 });
