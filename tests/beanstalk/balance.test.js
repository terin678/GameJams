// Plays the real game data with a simple bot to check the pacing and that the
// game can be finished. Set BEANSTALK_TIMELINE=1 to print what the bot bought when.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick, tend, buyProject, giveGift, crossSeeds, chooseSeedling, nudgePrice } from '../../games/beanstalk/src/core/sim.js';
import { available, affordable } from '../../games/beanstalk/src/core/projects.js';
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
	const at = { phase: {}, bought: {}, buys: [] };
	const dt = T.tickSeconds;
	let click = 0;
	let second = 0;
	while (!state.done && state.time < limit) {
		for (const e of tick(state, dt, DATA, rng)) {
			if (e.type === 'phase') at.phase[e.id] = state.time;
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

test('the first purchase comes quickly', () => {
	const first = Math.min(...Object.values(at.bought));
	assert.ok(first < 45, `first purchase after ${first.toFixed(0)}s`);
});
