// The whole game as a state object and the functions that move it forward.
// `data` is DATA from src/data/index.js. Nothing here touches the page.

import { resize, grow, findWork, tendPlot, eatOne } from './farm.js';
import { demand, sell, adjustPrice, autoPriceDir, analystPrice, clearingPrice } from './market.js';
import { calendar, advance, rollWeather, growthMult } from './seasons.js';
import { heightFor, phaseAt, crossed } from './phases.js';
import { computeMods, buy } from './projects.js';
import { newlyMet, meet, give, perkEffects } from './neighbours.js';
import { createSeeds, unlockDue, cross, choose, judge, seedEffects } from './seeds.js';
import { rulesFor, twistsFor, lineFor } from './runs.js';
import { createClimb, unlockDue as climbDue, startClimb, arrive, choose as chooseOption, nextEncounter, findEffects } from './climb.js';
import { createGuard, unlockDue as guardDue, openGuard, step as guardStep, assign, buyPost, train, rankEffects, waveText } from './guard.js';
import { createExchange, unlockDue as exchangeDue, openExchange, step as exchangeStep, kick, buy as buyShare, sell as sellShare } from './exchange.js';
import { createBlight, unlockDue as blightDue, step as blightStep, setShare } from './blight.js';
import { formatNumber } from './format.js';

const VERSION = 1;

export function createState(data, { golden = 0 } = {}) {
	const state = {
		v: VERSION,
		time: 0,
		day: 0, dayT: 0, weather: null, weatherT: 0,
		plots: [], tendAcc: 0, tendAt: 0, priceAcc: 0, saleAcc: 0,
		farmRate: 0,       // beans a second off the plots lately, for whoever sets the price
		beans: 0,          // in the barn, unsold
		grown: 0,          // ever grown; this is what the stalk is made of
		coins: 0, pages: 0, matter: 0, probes: 0,
		price: data.TUNING.startPrice,
		// Once the market is cornered: what a bean is worth in coins, for good, and
		// the demand at that moment. 0 until then. `coins` stays the wallet; it is
		// shown, and prices are quoted, in beans (coins / rate).
		rate: 0, demandAtCorner: 0,
		owned: {},
		friends: {},
		seeds: createSeeds(data.SEEDS),
		climb: createClimb(),
		guard: createGuard(data.GUARD),
		exchange: createExchange(),
		blight: createBlight(),
		height: 0, phase: 1,
		log: [],
		seen: {},          // journal lines that are only worth saying once
		done: false,
		golden,
	};
	refresh(state, data);
	say(state, data, lineFor(data.PHASES[0].log, data.RUNS.again.start, golden));
	for (const twist of twistsFor(golden, data.RUNS)) say(state, data, `This time: ${twist.name}. ${twist.text}`);
	return state;
}

// Recomputes everything derived from what is owned. Call after `owned` changes.
export function refresh(state, data) {
	const perks = perkEffects(state.friends, data.NEIGHBOURS, data.TUNING.friends);
	state.rules = rulesFor(state.golden, data.RUNS);
	const bred = seedEffects(state.seeds, data.SEEDS);
	const found = findEffects(state.climb, data.CLIMB);
	const ranks = rankEffects(state.guard, data.GUARD);
	state.mods = computeMods(state.owned, data.PROJECTS, data.TUNING.base, [...perks, ...bred, ...found, ...ranks]);
	for (const [key, share] of Object.entries(data.TUNING.golden)) state.mods[key] *= 1 + state.golden * share;
	if (state.mods.barter && !state.rate) cornered(state, data);
	// With no market, demand won since then counts towards the harvest, as much as it used to earn.
	if (state.rate) state.mods.yield *= Math.sqrt(Math.max(1, state.mods.marketing / state.demandAtCorner));
	resize(state.plots, state.mods.plots);
	return state;
}

// The market has just been cornered: a bean is fixed at what it was fetching,
// and the barn is emptied into the wallet.
function cornered(state, data) {
	const M = data.TUNING.market;
	state.rate = state.farmRate > 0 ? clearingPrice(state.farmRate, state.mods.marketing, M) : state.price;
	state.demandAtCorner = state.mods.marketing;
	say(state, data, M.cornerLog);
}

// What coins are called and worth, for text: beans once the market is cornered.
export const moneyOf = state => (state.rate ? { name: 'beans', per: state.rate } : { name: 'coins', per: 1 });

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

// The county fair: this year's class is judged, and a win is a ribbon.
function fair(state, data, events) {
	const S = data.SEEDS;
	const { year } = calendar(state.day, data.SEASONS, data.TUNING.calendar);
	const result = judge(state, year, S, state.rules.fairBar);
	if (!result) return;
	const trait = S.traits.find(t => t.id === result.trait);
	const line = (result.won ? S.fair.win : S.fair.lose)
		.replace('{class}', trait.fair).replace('{bar}', result.bar).replace('{level}', result.level);
	say(state, data, line);
	events.push({ type: 'fair', id: result.won ? 'won' : 'lost' });
	if (result.won) refresh(state, data);
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

// A raid on the farm begins or ends. A win pays a bounty and may earn a rank;
// after a loss, the pests still in the beans eat plots and help themselves to the barn.
function raid(state, data, e, rng) {
	const G = data.GUARD;
	const { guard } = state;
	if (e.type === 'raid') {
		guard.said = '';
		say(state, data, G.lines.raid.replace('{wave}', waveText(e.wave, G)));
		return;
	}
	if (e.id === 'won') {
		const money = moneyOf(state);
		const bounty = Math.round(G.bountySeconds * Math.max(1, state.farmRate) * (state.rate || state.price));
		state.coins += bounty;
		guard.said = `${G.lines.won} Bounty: ${formatNumber(bounty / money.per)} ${money.name}.`;
	} else {
		let eaten = 0;
		for (let i = 0; i < e.left * G.loss.plotsEach; i++) if (eatOne(state.plots, rng) >= 0) eaten++;
		// With no market there is no barn to raid: the beans come out of the wallet.
		const taken = Math.floor((state.rate ? state.coins / state.rate : state.beans) * G.loss.barnShare);
		if (state.rate) state.coins -= taken * state.rate;
		else state.beans -= taken;
		guard.said = `${G.lines.lost} They ate ${eaten} ${eaten === 1 ? 'plot' : 'plots'} and took ${formatNumber(taken)} beans from the barn.`;
	}
	say(state, data, guard.said);
	for (const rank of e.ranks) say(state, data, `${rank.name}: ${rank.text}`);
	if (e.ranks.length) refresh(state, data);
}

// A new spell of weather begins.
function newWeather(state, data, rng, events) {
	const { mods } = state;
	const w = mods.rainmaker ? data.WEATHER.find(x => x.summoned) : rollWeather(rng, data.WEATHER, state.rules.crows);
	state.weather = null;
	if (!w) return;
	if (w.eats) {
		// A brave crow (a New Game+ rule) is not put off by the scarecrow.
		if (mods.scarecrow && !(state.rules.brave > 0 && rng.next() < state.rules.brave)) return;
		const plot = eatOne(state.plots, rng);
		if (plot < 0) return;
		events.push({ type: 'crow', plot });
		say(state, data, w.log);
		return;
	}
	state.weather = w.id;
	kick(state, w.id, data.EXCHANGE);
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
	advance(state, dt, T.calendar);
	state.weatherT += dt;
	while (state.weatherT >= T.weather.everySeconds) {
		state.weatherT -= T.weather.everySeconds;
		newWeather(state, data, rng, events);
	}
	const { season } = calendar(state.day, data.SEASONS, T.calendar);
	if (season !== was) {
		events.push({ type: 'season', id: season.id });
		const warm = season.cold && mods.greenhouse && season.logWarm;
		sayOnce(state, data, warm ? `${season.id}:warm` : season.id, warm ? season.logWarm : season.log);
		if (season.id === data.SEEDS.fair.season) fair(state, data, events);
	}

	const weather = data.WEATHER.find(w => w.id === state.weather) ?? null;
	grow(state.plots, dt * mods.growth * growthMult(season, weather, mods, state.rules.cold) / T.growSeconds);

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
		// Probes standing guard against the blight neither plant nor spread.
		const planting = state.probes * (1 - (state.blight.open ? state.blight.share : 0));
		state.grown += planting * mods.probeYield * dt;
		state.matter += planting * mods.matterRate * dt;
		state.probes += planting * (Math.exp(mods.replicate * dt) - 1);
		if (blightDue(state, data.BLIGHT)) {
			state.blight.open = true;
			events.push({ type: 'blight' });
			say(state, data, data.BLIGHT.log);
		}
		const adapted = blightStep(state, dt, data.BLIGHT);
		if (adapted) {
			events.push({ type: 'blightAdapt' });
			say(state, data, adapted.log);
		}
	}

	if (state.rate) {
		// No market: every bean picked is money in hand.
		state.coins += state.beans * state.rate;
		state.beans = 0;
	} else {
		const sale = sell(state.beans, state.price, mods.marketing, dt, T.market, state.saleAcc);
		state.beans -= sale.sold;
		state.coins += sale.revenue;
		state.saleAcc = sale.acc;
	}
	// How fast the farm is producing, smoothed, for the analyst.
	const A = T.market.autoprice;
	state.farmRate += (harvested * mods.yield / dt - state.farmRate) * Math.min(1, dt / A.rateSeconds);
	const pricer = A.levels[Math.min(mods.pricing, A.levels.length - 1)];
	if (pricer && !state.rate) {
		state.priceAcc += dt;
		if (state.priceAcc >= pricer.everySeconds) {
			state.priceAcc = 0;
			if (pricer.analyst) {
				state.price = analystPrice(state.beans, state.farmRate, mods.marketing, T.market);
			} else {
				const dir = autoPriceDir(state.beans, demand(state.price, mods.marketing, T.market), T.market);
				if (dir) state.price = adjustPrice(state.price, dir, T.market);
			}
		}
	}

	state.pages += mods.pagesRate * dt;
	state.coins += mods.coinsRate * dt;

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
	if (unlockDue(state, data.SEEDS)) {
		state.seeds.open = true;
		events.push({ type: 'seeds' });
		say(state, data, lineFor(data.SEEDS.log, data.RUNS.again.seeds, state.golden));
	}
	if (climbDue(state, data.CLIMB)) {
		state.climb.open = true;
		events.push({ type: 'climb' });
		say(state, data, data.CLIMB.log);
	}
	if (arrive(state)) {
		events.push({ type: 'ledge', id: nextEncounter(state, data.CLIMB).id });
		say(state, data, `Your climber has reached ${nextEncounter(state, data.CLIMB).name.replace(/^The /, 'the ')}.`);
	}
	if (guardDue(state, data.GUARD)) {
		openGuard(state, data.GUARD, rng);
		events.push({ type: 'guard' });
		say(state, data, data.GUARD.log);
	}
	if (state.guard.open && state.phase >= data.GUARD.train.phase) sayOnce(state, data, 'guard:train', data.GUARD.train.log);
	for (const e of guardStep(state, dt, data.GUARD, rng)) {
		raid(state, data, e, rng);
		events.push(e);
	}
	if (exchangeDue(state, data.EXCHANGE)) {
		openExchange(state, data.EXCHANGE, data.SEASONS, T.calendar);
		events.push({ type: 'exchange' });
		say(state, data, data.EXCHANGE.log);
	}
	exchangeStep(state, dt, data.EXCHANGE, data.SEASONS, T.calendar, rng);
	for (const def of newlyMet(state, data.NEIGHBOURS)) {
		meet(state, def);
		events.push({ type: 'meet', id: def.id });
		say(state, data, lineFor(def.meet, data.RUNS.again.neighbours[def.id], state.golden));
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
	const F = data.TUNING.friends;
	const result = give(state, def, gift, { ...F, giftSeconds: F.giftSeconds * state.rules.giftWait });
	if (!result) return null;
	for (const perk of result.perks) say(state, data, `${def.name}, ${perk.hearts} hearts: ${perk.text}`);
	if (result.perks.length) refresh(state, data);
	return result;
}

// Sends the climber up to the next ledge.
export const climb = (state, data) => !state.done && startClimb(state, data.CLIMB);

// Chooses an option at the ledge. Returns null, or { won, text, find, stomp }.
// When the Giant stamps, every plot on the farm is emptied.
export function chooseAtLedge(state, index, data, rng) {
	if (state.done) return null;
	const result = chooseOption(state, index, data.CLIMB, rng, data.TUNING.friends, moneyOf(state));
	if (!result) return null;
	say(state, data, result.text);
	if (result.find) say(state, data, `Found: ${result.find.name}. ${result.find.text}`);
	if (result.stomp) state.plots.fill(null);
	refresh(state, data);
	return result;
}

// Posts one more or one fewer of an animal on guard.
export const postAnimal = (state, id, delta, data) => !state.done && assign(state, id, delta, data.GUARD);

// Trains one kind of guard animal up a level.
export const trainAnimal = (state, id, data) => !state.done && train(state, id, data.GUARD);

// Puts more (dir 1) or less (dir -1) of the probe swarm on guard against the blight.
export const guardSwarm = (state, dir, data) => !state.done && setShare(state, dir, data.BLIGHT);

// Builds another guard post.
export const buildPost = (state, data) => !state.done && buyPost(state, data.GUARD);

// Buys crates at the exchange with a share of your coins, or sells a share of your crates.
export const buyCrates = (state, share, data) => !state.done && buyShare(state, share, data.EXCHANGE);
export const sellCrates = (state, share, data) => !state.done && sellShare(state, share, data.EXCHANGE);

// Starts a cross: pays for it and sets the seedlings growing.
export const crossSeeds = (state, data, rng) => !state.done && cross(state, data.SEEDS, rng);

// Keeps seedling `index` (or -1 for the old line) once they have grown out.
export function chooseSeedling(state, index, data) {
	if (state.done || !choose(state, index)) return false;
	refresh(state, data);
	return true;
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
		money: moneyOf(state),
		days: state.day - before.day,
	};
}

export function serialize(state) {
	const { mods, rules, ...rest } = state;
	return rest;
}

// Whether an object looks like a save this version can load.
export const isSave = saved => !!saved && saved.v === VERSION && Array.isArray(saved.plots)
	&& !!saved.owned && typeof saved.owned === 'object';

export function restore(saved, data) {
	const fresh = createState(data);
	if (!isSave(saved)) return fresh;
	// Fields added since the save was made keep their fresh values, one level
	// down as well: a saved guard from before training still gets its `levels`.
	const state = { ...fresh, ...saved };
	const plain = v => !!v && typeof v === 'object' && !Array.isArray(v);
	for (const [k, v] of Object.entries(fresh)) if (plain(v) && plain(saved[k])) state[k] = { ...v, ...saved[k] };
	return refresh(state, data);
}

export const newGamePlus = (state, data) => createState(data, { golden: state.golden + 1 });
