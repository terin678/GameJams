// Plays the real game data with a simple bot to check the pacing and that the
// game can be finished. Set BEANSTALK_TIMELINE=1 to print what the bot bought when.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick, tend, buyProject, giveGift, crossSeeds, chooseSeedling, climb, chooseAtLedge, buildPost, buyCrates, sellCrates, nudgePrice } from '../../games/beanstalk/src/core/sim.js';
import { available, affordable } from '../../games/beanstalk/src/core/projects.js';
import { nextEncounter, optionBlocked } from '../../games/beanstalk/src/core/climb.js';
import { createGuard, makeWave, bestRoster, defendersFor, setRoster, postCost, step as guardStep } from '../../games/beanstalk/src/core/guard.js';
import { canCross, crossCost, growingFor, fairTrait } from '../../games/beanstalk/src/core/seeds.js';
import { calendar } from '../../games/beanstalk/src/core/seasons.js';
import { demand, autoPriceDir } from '../../games/beanstalk/src/core/market.js';
import { formatNumber, formatHeight, formatDuration } from '../../games/beanstalk/src/core/format.js';
import { DATA } from '../../games/beanstalk/src/data/index.js';
import { createRng } from '../../shared/rng.js';

const T = DATA.TUNING;
const MINUTE = 60;

// Clicks Tend a few times a second, keeps the price sensible, buys whatever it can afford.
function playBot({ seed = 1, limit = 8 * 60 * MINUTE, clicksPerSecond = 3, verbose = false, golden = 0 } = {}) {
	const rng = createRng(seed);
	const state = createState(DATA, { golden });
	const at = { phase: {}, bought: {}, buys: [], guard: null };
	const dt = T.tickSeconds;
	let click = 0;
	let second = 0;
	while (!state.done && state.time < limit) {
		for (const e of tick(state, dt, DATA, rng)) {
			if (e.type === 'phase') at.phase[e.id] = state.time;
			if (e.type === 'guard') at.guard = state.time;
		}
		click += clicksPerSecond * dt;
		while (click >= 1) {
			click--;
			tend(state, DATA);
		}
		second += dt;
		if (second < 1) continue;
		second = 0;
		if (!state.mods.autoprice) {
			const dir = autoPriceDir(state.beans, demand(state.price, state.mods.marketing, T.market), T.market);
			if (dir) nudgePrice(state, dir, DATA);
		}
		// It knows what everyone loves; a real player has to find out.
		for (const n of DATA.NEIGHBOURS) {
			if (state.friends[n.id]) giveGift(state, n.id, n.loves[0], DATA);
		}
		// Breeds when it has coins to spare, keeping the seedling bred for the next fair's class.
		if (growingFor(state) === 0) {
			const { year } = calendar(state.day, DATA.SEASONS, T.calendar);
			const next = fairTrait(state.seeds.judged >= year ? year + 1 : year, DATA.SEEDS);
			chooseSeedling(state, DATA.SEEDS.traits.indexOf(next), DATA);
		}
		if (canCross(state, DATA.SEEDS) && state.coins > 4 * crossCost(state.seeds, DATA.SEEDS).coins) crossSeeds(state, DATA, rng);
		// Climbs when it can, and takes the first option open to it that leaves a find.
		if (state.climb.waiting) {
			const options = nextEncounter(state, DATA.CLIMB).options;
			const open = options.map((o, i) => i).filter(i => !optionBlocked(state, options[i], T.friends));
			chooseAtLedge(state, open.find(i => options[i].find) ?? open[0], DATA, rng);
		} else {
			climb(state, DATA);
		}
		// Posts the right animals for the raid that is coming, and builds posts when it has coins to spare.
		if (state.guard.open && !state.guard.fight) {
			const { guard } = state;
			const cost = postCost(guard, DATA.GUARD);
			if (cost && state.coins > 3 * cost.coins) buildPost(state, DATA);
			setRoster(state, bestRoster(guard.wave, guard.posts, defendersFor(guard, DATA.GUARD)), DATA.GUARD);
		}
		// Buys crates at harvest and sells them in spring.
		if (state.exchange.open) {
			const { season } = calendar(state.day, DATA.SEASONS, T.calendar);
			if (season.id === 'autumn' && state.exchange.crates === 0) buyCrates(state, 0.5, DATA);
			if (season.id === 'spring' && state.exchange.crates > 0) sellCrates(state, 1, DATA);
		}
		for (const def of available(state, DATA.PROJECTS)) {
			if (!affordable(state, def) || !buyProject(state, def.id, DATA)) continue;
			at.bought[def.id] ??= state.time;
			at.buys.push(state.time);
			if (verbose) {
				console.log(`${formatDuration(state.time).padStart(8)}  ${def.title.padEnd(28)} grown ${formatNumber(state.grown).padStart(8)}  ${formatHeight(state.height)}`);
			}
		}
	}
	return { state, at };
}

const verbose = !!process.env.BEANSTALK_TIMELINE;
const { state, at } = playBot({ verbose });
const { buys } = at;

test('the bot finishes the game', () => {
	assert.equal(state.done, true, `stuck at ${formatHeight(state.height)} after ${formatDuration(state.time)}`);
	assert.equal(state.grown, T.universeBeans);
});

test('every project gets bought along the way', () => {
	const missed = DATA.PROJECTS.filter(p => !(p.id in at.bought)).map(p => p.id);
	assert.deepEqual(missed, []);
});

// The bot plays perfectly, so a person takes longer: these bounds put a real
// run at roughly three to four and a half hours.
test('pacing: a run is a couple of hours for the bot, split sensibly across the phases', () => {
	const p1 = at.phase[2] / MINUTE;
	const p2 = (at.phase[3] - at.phase[2]) / MINUTE;
	const p3 = (state.time - at.phase[3]) / MINUTE;
	const total = state.time / MINUTE;
	const report = `phase 1: ${p1.toFixed(0)} min, phase 2: ${p2.toFixed(0)} min, phase 3: ${p3.toFixed(0)} min, total ${(total / 60).toFixed(2)} h`;
	if (verbose) console.log(report);
	assert.ok(p1 >= 30 && p1 <= 50, report);
	assert.ok(p2 >= 45 && p2 <= 70, report);
	assert.ok(p3 >= 35 && p3 <= 55, report);
	assert.ok(total >= 120 && total <= 170, report);
});

test('there is always something to buy soon: no long droughts between purchases', () => {
	const times = [0, ...buys].sort((x, y) => x - y);
	let worst = 0;
	let when = 0;
	for (let i = 1; i < times.length; i++) {
		if (times[i] - times[i - 1] > worst) {
			worst = times[i] - times[i - 1];
			when = times[i - 1];
		}
	}
	if (verbose) console.log(`longest wait between purchases: ${formatDuration(worst)}, after ${formatDuration(when)}`);
	assert.ok(worst <= 7 * MINUTE, `nothing bought for ${formatDuration(worst)} after ${formatDuration(when)}`);
});

test('an idle player still gets there, just slower', () => {
	const slow = playBot({ seed: 2, clicksPerSecond: 1, limit: 6 * 60 * MINUTE });
	assert.equal(slow.state.done, true);
});

test('a second run is quicker, but still a proper game', () => {
	const again = playBot({ seed: 3, golden: 1 });
	assert.equal(again.state.done, true);
	const ratio = again.state.time / state.time;
	if (verbose) console.log(`run 2 takes ${(ratio * 100).toFixed(0)}% as long as run 1`);
	assert.ok(ratio > 0.6 && ratio < 0.9, `run 2 took ${(ratio * 100).toFixed(0)}% of run 1`);
});

test('the bot climbs all the way up', () => {
	assert.equal(state.climb.ledge, DATA.CLIMB.encounters.length);
	assert.ok(state.climb.finds.length >= 5, `${state.climb.finds.length} finds`);
});

test('the guard arrives in the quiet stretch of phase 1, and a careful player wins most raids', () => {
	const opened = at.guard / MINUTE;
	if (verbose) console.log(`guard opens at ${opened.toFixed(0)} min; raids won ${state.guard.wins}, lost ${state.guard.losses}`);
	assert.ok(opened >= 12 && opened <= 22, `opened at ${opened.toFixed(0)} min`);
	const { wins, losses } = state.guard;
	assert.ok(wins / (wins + losses) >= 0.7, `won ${wins} of ${wins + losses}`);
	assert.ok(wins >= DATA.GUARD.ranks.at(-1).wins, `${wins} wins is short of the top rank`);
	assert.equal(state.guard.posts, DATA.GUARD.posts.max);
});

// At every size of wave: one matched animal for every two pests usually wins,
// one more post makes it safe, and the wrong animals lose.
test('in every wave tier, matching the animals to the pests is what wins', () => {
	const G = DATA.GUARD;
	const N = 200;
	const winRate = (tier, posts, how) => {
		let won = 0;
		for (let seed = 1; seed <= N; seed++) {
			const rng = createRng(seed * 13 + tier.wins);
			const wave = makeWave(tier.wins, G, rng);
			const all = defendersFor({ wins: tier.wins }, G);
			const lead = Object.keys(wave).sort((x, y) => wave[y] - wave[x])[0];
			const useless = all.find(d => !d.strong.includes(lead));
			const roster = how === 'right' ? bestRoster(wave, posts, all) : { [useless.id]: posts };
			// `wins: 0` keeps the drill from fixing a bad roster.
			const s = { time: 0, guard: { ...createGuard(G), open: true, wins: 0, posts, wave, roster } };
			for (let end = null; !end; s.time += 0.1) {
				end = guardStep(s, 0.1, G, rng).find(e => e.type === 'raidEnd');
				if (end?.id === 'won') won++;
			}
		}
		return won / N;
	};
	const bad = [];
	for (const tier of G.waves) {
		const posts = Math.ceil(tier.size / 2);
		const right = winRate(tier, posts, 'right');
		const wrong = winRate(tier, posts, 'wrong');
		const safe = winRate(tier, posts + 1, 'right');
		const note = `wave of ${tier.size}: ${posts} posts right ${Math.round(right * 100)}%, wrong ${Math.round(wrong * 100)}%; ${posts + 1} posts ${Math.round(safe * 100)}%`;
		if (verbose) console.log(note);
		if (right < 0.65 || wrong > 0.35 || safe < 0.9) bad.push(note);
	}
	assert.deepEqual(bad, []);
});

test('trading with the seasons makes money; trading against them loses it', () => {
	if (verbose) console.log(`exchange profit: ${formatNumber(state.exchange.profit)} coins`);
	assert.ok(state.exchange.open);
	assert.ok(state.exchange.profit > 0, `profit ${state.exchange.profit}`);
	// The same years on the board, bought in spring and sold in autumn.
	const s = createState(DATA);
	const rng = createRng(11);
	s.phase = 2;
	s.grown = DATA.EXCHANGE.unlock.grown;
	for (let t = 0; t < 4 * 12 * T.calendar.daySeconds; t += 1) {
		tick(s, 1, DATA, rng);
		const { season } = calendar(s.day, DATA.SEASONS, T.calendar);
		s.coins = Math.max(s.coins, 1000);
		if (season.id === 'spring' && s.exchange.crates === 0) buyCrates(s, 0.5, DATA);
		if (season.id === 'autumn' && s.exchange.crates > 0) sellCrates(s, 1, DATA);
	}
	assert.ok(s.exchange.profit < 0, `profit ${s.exchange.profit}`);
});

test('the first purchase comes quickly', () => {
	const first = Math.min(...Object.values(at.bought));
	assert.ok(first < 45, `first purchase after ${first.toFixed(0)}s`);
});
