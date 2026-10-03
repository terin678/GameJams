import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createState, refresh, tick, tend, buyProject, giveGift, crossSeeds, chooseSeedling, climb, chooseAtLedge, postAnimal, buildPost, nudgePrice, simulateOffline, serialize, restore, newGamePlus } from '../../games/beanstalk/src/core/sim.js';
import { DATA } from '../../games/beanstalk/src/data/index.js';
import { createRng } from '../../shared/rng.js';

const T = DATA.TUNING;
const fair = { next: () => 0.999, pick: l => l[0] };   // never rolls any weather
const run = (state, seconds, rng = fair, dt = 0.1) => {
	const events = [];
	for (let t = 0; t < seconds - 1e-9; t += dt) events.push(...tick(state, dt, DATA, rng));
	return events;
};
const own = (state, ...ids) => {
	for (const id of ids) state.owned[id] = (state.owned[id] ?? 0) + 1;
	refresh(state, DATA);
};

test('a new game is one empty plot and an opening line', () => {
	const s = createState(DATA);
	assert.deepEqual(s.plots, [null]);
	assert.equal(s.price, T.startPrice);
	assert.equal(s.phase, 1);
	assert.equal(s.log[0], DATA.PHASES[0].log);
});

test('plant, wait, harvest: one bean', () => {
	const s = createState(DATA);
	assert.equal(tend(s, DATA), 'plant');
	run(s, T.growSeconds / 2);
	assert.equal(tend(s, DATA), null, 'not ripe yet');
	run(s, T.growSeconds / 2 + 0.2);
	assert.equal(tend(s, DATA), 'harvest');
	assert.equal(s.grown, 1);
	assert.equal(s.plots[0], 0, 'replanted');
});

test('the market turns beans into coins', () => {
	const s = createState(DATA);
	s.beans = 10;
	run(s, 5);
	assert.ok(s.beans < 10);
	assert.ok(s.coins > 0);
	assert.ok(Math.abs(s.coins - (10 - s.beans) * s.price) < 1e-9);
});

test('a sky-high price cannot earn coins without beans leaving the barn', () => {
	const s = createState(DATA);
	s.beans = 2;
	s.price = 12;
	run(s, 30);
	assert.equal(s.coins, (2 - s.beans) * 12);
	assert.ok(Number.isInteger(s.beans));
});

test('better bookkeeping finds the right price sooner', () => {
	// A farm with plenty of hands, and a price that is far too high.
	const settle = (...staff) => {
		const s = createState(DATA);
		own(s, 'plot', 'plot', 'plot', 'farmhand', 'farmhand', 'farmhand', 'farmhand', 'farmhand', ...staff);
		run(s, 60);                // let the farm get going
		s.price = 40;
		run(s, 8);
		return s;
	};
	const slow = settle('accountant');
	const quick = settle('accountant', 'adding_machine');
	const analyst = settle('accountant', 'adding_machine', 'analyst');
	assert.ok(slow.price > 15, `the accountant is still creeping down from 40: ${slow.price}`);
	assert.ok(quick.price < slow.price / 2, `four times as fast: ${quick.price}`);
	assert.ok(analyst.price < 3, `the analyst went straight there: ${analyst.price}`);
	assert.ok(analyst.farmRate > 0);
});

test('the price buttons move the price', () => {
	const s = createState(DATA);
	nudgePrice(s, 1, DATA);
	assert.ok(s.price > T.startPrice);
});

test('beans grow slowly in winter, unless there is a greenhouse', () => {
	const winterDay = 3 * T.calendar.daysPerSeason;
	const grownBy = (...owned) => {
		const s = createState(DATA);
		s.day = winterDay;
		own(s, ...owned);
		tend(s, DATA);
		run(s, 2);
		return s.plots[0];
	};
	assert.ok(grownBy('greenhouse') > grownBy() * 2);
});

test('with a greenhouse, the journal says winter is not a problem', () => {
	const winter = DATA.SEASONS.find(s => s.cold);
	const untilWinter = T.calendar.daySeconds * T.calendar.daysPerSeason * DATA.SEASONS.indexOf(winter) + 1;
	const cold = createState(DATA);
	run(cold, untilWinter, fair, 0.5);
	assert.ok(cold.log.includes(winter.log));
	const warm = createState(DATA);
	own(warm, 'greenhouse');
	run(warm, untilWinter, fair, 0.5);
	assert.ok(warm.log.includes(winter.logWarm));
	assert.ok(!warm.log.includes(winter.log));
});

test('weather keeps its own clock, whatever the length of a day', () => {
	const rain = { next: () => 0.001, pick: l => l[0] };
	const s = createState(DATA);
	const events = run(s, T.weather.everySeconds * 3 + 0.1, rain, 0.5);
	assert.equal(events.filter(e => e.type === 'weather').length, 3);
	assert.equal(s.weather, DATA.WEATHER[0].id);
});

test('a crow eats a bean, but not past a scarecrow', () => {
	const crowAt = DATA.WEATHER.findIndex(w => w.eats);
	const before = DATA.WEATHER.slice(0, crowAt).reduce((a, w) => a + w.chance, 0);
	const crows = { next: () => before + 0.001, pick: l => l[0] };
	const s = createState(DATA);
	tend(s, DATA);
	const events = run(s, T.weather.everySeconds + 0.1, crows);
	assert.ok(events.some(e => e.type === 'crow'));
	assert.equal(s.plots[0], null);

	const guarded = createState(DATA);
	own(guarded, 'scarecrow');
	tend(guarded, DATA);
	run(guarded, T.weather.everySeconds + 0.1, crows);
	assert.notEqual(guarded.plots[0], null);
});

test('the journal mentions each season and kind of weather once, crows every time', () => {
	const s = createState(DATA);
	const year = T.calendar.daySeconds * T.calendar.daysPerSeason * DATA.SEASONS.length;
	const rain = { next: () => 0.001, pick: l => l[0] };
	run(s, year * 2 + 1, rain, 0.5);
	const count = text => s.log.filter(l => l === text).length;
	for (const season of DATA.SEASONS) assert.equal(count(season.log), 1, season.id);
	assert.equal(count(DATA.WEATHER[0].log), 1);
});

test('farmhands plant and pick on their own', () => {
	const s = createState(DATA);
	own(s, 'farmhand');
	const events = run(s, 30);
	assert.ok(s.grown >= 2);
	assert.ok(events.some(e => e.type === 'harvest'));
});

test('helpers who cannot keep up still get round to every plot', () => {
	const s = createState(DATA);
	s.coins = 1e6;
	for (let i = 0; i < 11; i++) buyProject(s, 'plot', DATA);
	own(s, 'farmhand');                       // far too few hands for twelve plots
	const visits = s.plots.map(() => 0);
	for (let t = 0; t < 600; t++) {
		const before = [...s.plots];
		tick(s, 0.1, DATA, fair);
		s.plots.forEach((g, i) => { if (before[i] !== null && before[i] >= 1 && g < 1) visits[i]++; });
	}
	assert.ok(visits.every(v => v > 0), `harvests per plot: ${visits}`);
});

test('neighbours turn up as the farm grows, and gifts earn perks', () => {
	const who = DATA.NEIGHBOURS[0];
	const loved = who.loves[0];
	const s = createState(DATA);
	s.grown = who.unlock.grown;
	const events = run(s, 0.1);
	assert.ok(events.some(e => e.type === 'meet' && e.id === who.id));
	assert.equal(s.log[0], who.meet);
	assert.deepEqual(run(s, 0.1).filter(e => e.type === 'meet'), [], 'met once');

	s.coins = 1e6;
	const marketing = s.mods.marketing;
	let result;
	for (let i = 0; i < 20 && !(result?.perks.length); i++) {
		result = giveGift(s, who.id, loved, DATA);
		assert.ok(result, 'gift accepted');
		s.time += T.friends.giftSeconds;
	}
	assert.equal(result.hearts, who.perks[0].hearts);
	assert.ok(s.mods.marketing > marketing, 'the perk is applied');
	assert.ok(s.log[0].includes(who.perks[0].text));
	assert.equal(giveGift(s, 'nobody', loved, DATA), null);
});

test('seed breeding opens, a chosen seedling changes the farm, and the fair gives ribbons', () => {
	const S = DATA.SEEDS;
	const s = createState(DATA);
	assert.equal(crossSeeds(s, DATA, createRng(1)), false, 'not before the catalogue arrives');
	s.grown = S.unlock.grown;
	assert.ok(run(s, 0.1).some(e => e.type === 'seeds'));
	assert.ok(s.log.includes(S.log));

	s.coins = 1e9;
	const before = { ...s.mods };
	for (let i = 0; i < 12; i++) {
		assert.equal(crossSeeds(s, DATA, createRng(i)), true);
		s.time += S.cross.seconds;
		assert.equal(chooseSeedling(s, 0, DATA), true);   // seedling 0 is the one bred for the first trait
	}
	const first = S.traits[0];
	assert.ok(s.seeds.traits[first.id] >= 12);
	assert.ok(s.mods[first.effect] > before[first.effect]);

	// Run to the first fair: the first trait is judged in year one.
	const untilFair = T.calendar.daySeconds * T.calendar.daysPerSeason * DATA.SEASONS.findIndex(x => x.id === S.fair.season);
	const marketing = s.mods.marketing;
	const events = run(s, untilFair + 1, fair, 0.5);
	assert.ok(events.some(e => e.type === 'fair' && e.id === 'won'));
	assert.equal(s.seeds.ribbons[first.id], 1);
	assert.ok(s.mods.marketing > marketing, 'a ribbon lifts demand');
	assert.ok(s.log.some(l => l.includes(first.fair)));
});

test('the climb: reach a ledge, make a choice, bring something home', () => {
	const C = DATA.CLIMB;
	const s = createState(DATA);
	assert.equal(climb(s, DATA), false, 'not before the stalk is in the clouds');
	s.grown = T.height.points[1][0] * 2;
	assert.ok(run(s, 0.1).some(e => e.type === 'climb'));
	s.coins = 1e9;
	s.grown = T.height.points[2][0];          // tall enough for every ledge of this phase
	run(s, 0.1);

	// Climb until an option with a find has been taken.
	const always = { next: () => 0 };
	let found = null;
	for (let i = 0; i < 4 && !found; i++) {
		assert.equal(climb(s, DATA), true);
		const events = run(s, C.seconds + 0.2);
		assert.ok(events.some(e => e.type === 'ledge'));
		const enc = C.encounters[s.climb.ledge];
		const pick = enc.options.findIndex(o => o.find && !o.needs && !o.cost);
		const result = chooseAtLedge(s, Math.max(0, pick), DATA, always);
		assert.equal(result.won, true);
		found = result.find;
	}
	assert.ok(found, 'a find within the first few ledges');
	assert.ok(s.log.some(l => l.includes(found.name)));
	const [key, value] = Object.entries(found.effect)[0];
	const without = { ...s, climb: { ...s.climb, finds: [] } };
	refresh(without, DATA);
	assert.ok(typeof value === 'number' && s.mods[key] !== without.mods[key], 'the find changes the farm');
});

test('the Giant stamping empties the farm', () => {
	const C = DATA.CLIMB;
	const s = createState(DATA);
	s.grown = T.height.points[2][0];
	s.coins = 1e12;
	run(s, 0.1);
	tend(s, DATA);
	s.climb.ledge = C.encounters.findIndex(e => e.options.some(o => o.chance < 1));
	s.climb.anger = C.giant.stompAt - 1;
	climb(s, DATA);
	run(s, C.seconds + 0.2);
	tend(s, DATA);
	const risky = C.encounters[s.climb.ledge].options.findIndex(o => o.chance < 1);
	const result = chooseAtLedge(s, risky, DATA, { next: () => 0.999 });
	assert.equal(result.stomp, true);
	assert.ok(s.plots.every(p => p === null));
	assert.ok(s.log[0].includes(C.giant.stomp));
});

test('buying a project applies it straight away', () => {
	const s = createState(DATA);
	s.coins = 100;
	assert.equal(buyProject(s, 'plot', DATA), true);
	assert.equal(s.plots.length, 2);
	assert.ok(s.coins < 100);
	assert.equal(buyProject(s, 'no_such_thing', DATA), false);
});

test('the stalk grows with the harvest and crosses milestones and phases', () => {
	const s = createState(DATA);
	s.grown = T.height.points[1][0] * 1.2;
	const events = run(s, 0.1);
	assert.ok(s.height > DATA.PHASES[1].height);
	assert.equal(s.phase, 2);
	assert.ok(events.some(e => e.type === 'phase' && e.id === 2));
	assert.ok(events.some(e => e.type === 'milestone'));
	assert.ok(s.log.includes(DATA.PHASES[1].log));
	assert.deepEqual(run(s, 0.1).filter(e => e.type !== 'harvest'), [], 'announced once');
});

test('probes multiply, and stop when the universe is full', () => {
	const s = createState(DATA);
	s.phase = 3;
	own(s, 'seed_probe');
	s.probes = 1;
	run(s, 20);
	assert.ok(s.probes > 1);
	assert.ok(s.matter > 0);
	assert.ok(s.grown > 0);

	s.probes = 1e40;
	const events = run(s, 1);
	assert.equal(s.grown, T.universeBeans);
	assert.equal(events.filter(e => e.type === 'full').length, 1);
});

test('planting the last bean ends the game, and nothing moves afterwards', () => {
	const s = createState(DATA);
	s.grown = T.universeBeans;
	s.coins = 10;
	run(s, 0.1);
	assert.equal(buyProject(s, 'last_bean', DATA), true);
	assert.equal(s.done, true);
	const time = s.time;
	assert.deepEqual(run(s, 5), []);
	assert.equal(s.time, time);
});

test('time away is simulated, up to a cap, and summarised', () => {
	const s = createState(DATA);
	own(s, 'farmhand', 'farmhand');
	const summary = simulateOffline(s, 1200, DATA, createRng(7));
	const worked = 1200 * T.offline.rate;
	assert.equal(summary.seconds, 1200);
	assert.equal(summary.worked, worked, 'the farm slows down without you');
	assert.equal(summary.capped, false);
	assert.ok(summary.grown > 20);
	assert.ok(summary.coins > 0);
	assert.equal(summary.days, worked / T.calendar.daySeconds);
	assert.equal(s.grown, summary.grown);

	const blink = simulateOffline(createState(DATA), 10, DATA, createRng(7));
	assert.equal(blink.worked, 10, 'a short gap runs at full speed');

	const long = simulateOffline(createState(DATA), T.offline.capSeconds * 3, DATA, createRng(7));
	assert.equal(long.seconds, T.offline.capSeconds);
	assert.equal(long.capped, true);
});

test('a save survives a round trip through JSON', () => {
	const s = createState(DATA);
	s.coins = 500;
	buyProject(s, 'plot', DATA);
	tend(s, DATA);
	run(s, 3);
	const back = restore(JSON.parse(JSON.stringify(serialize(s))), DATA);
	assert.deepEqual(back, s);
});

test('a broken or missing save starts a new game', () => {
	for (const junk of [null, 'beans', {}, { v: 99 }, { v: 1, plots: 'no' }]) {
		assert.deepEqual(restore(junk, DATA).plots, [null]);
	}
});

test('New Game+: the world remembers, and each run adds a twist', () => {
	const R = DATA.RUNS;
	const first = createState(DATA);
	assert.deepEqual(first.rules, { cold: 1, crows: 1, brave: 0, fairBar: 0, giftWait: 1 });
	assert.equal(first.log.at(-1), DATA.PHASES[0].log);

	const second = newGamePlus(first, DATA);
	assert.equal(second.log.at(-1), R.again.start);
	assert.ok(second.log[0].includes(R.twists[0].name));
	assert.equal(second.rules.cold, R.twists[0].rule.cold);

	const who = DATA.NEIGHBOURS[0];
	second.grown = who.unlock.grown;
	run(second, 0.1);
	assert.ok(second.log.includes(R.again.neighbours[who.id]));
	assert.ok(!second.log.includes(who.meet));

	const third = newGamePlus(second, DATA);
	assert.equal(third.golden, 2);
	assert.equal(third.rules.crows, R.twists[1].rule.crows);
	assert.deepEqual(restore(JSON.parse(JSON.stringify(serialize(third))), DATA).rules, third.rules, 'rules come back after a reload');
});

test('New Game+: a brave crow gets past the scarecrow', () => {
	const crowAt = DATA.WEATHER.findIndex(w => w.eats);
	const before = DATA.WEATHER.slice(0, crowAt).reduce((a, w) => a + w.chance, 0);
	const crows = { next: () => before + 0.001, pick: l => l[0] };
	const s = createState(DATA, { golden: 2 });
	own(s, 'scarecrow');
	tend(s, DATA);
	run(s, T.weather.everySeconds + 0.1, crows);
	assert.equal(s.plots[0], null);
});

test('New Game+ starts over with a Golden Bean that boosts yield', () => {
	const s = createState(DATA);
	s.grown = 1e30;
	const again = newGamePlus(s, DATA);
	assert.equal(again.grown, 0);
	assert.equal(again.golden, 1);
	assert.equal(again.mods.yield, s.mods.yield * (1 + T.golden.yield));
	assert.equal(again.mods.growth, s.mods.growth * (1 + T.golden.growth));
});

test('the guard: a raid is forecast, fought and paid for', () => {
	const G = DATA.GUARD;
	const s = createState(DATA);
	assert.equal(postAnimal(s, 'duck', 1, DATA), false, 'no guard yet');
	s.grown = G.unlock.grown;
	const opened = tick(s, 0.1, DATA, createRng(1));
	assert.ok(opened.some(e => e.type === 'guard'));
	assert.ok(s.log.includes(G.log));
	assert.equal(postAnimal(s, 'duck', 1, DATA), true);
	assert.equal(postAnimal(s, 'duck', 1, DATA), true);
	s.coins = G.posts.cost.coins;
	assert.equal(buildPost(s, DATA), true);
	assert.equal(s.coins, 0);
	assert.equal(postAnimal(s, 'duck', 1, DATA), true);

	// A roll that lands every animal's attempt and never lets a pest wear one out.
	const roll = (G.odds.tire + G.odds.strong) / 2;
	const lucky = { next: () => roll, pick: list => list[0], range: min => min };
	const events = [];
	for (let t = 0; t < G.raid.firstSeconds + 10; t += 0.1) events.push(...tick(s, 0.1, DATA, lucky));
	assert.ok(events.some(e => e.type === 'raid'));
	assert.equal(events.find(e => e.type === 'raidEnd')?.id, 'won');
	assert.equal(s.guard.wins, 1);
	assert.ok(s.coins > 0, 'a bounty was paid');
	assert.ok(s.mods.marketing > 1, 'the first rank is in force');
	assert.ok(s.log.some(line => line.startsWith(G.ranks[0].name)));
	assert.ok(s.log.some(line => line.startsWith('Raid!')));
});

test('the guard: a lost raid costs plots and beans from the barn', () => {
	const G = DATA.GUARD;
	const s = createState(DATA);
	s.grown = G.unlock.grown;
	s.owned.plot = 5;
	refresh(s, DATA);
	s.plots.fill(0.5);
	const rng = createRng(2);
	tick(s, 0.1, DATA, rng);
	s.beans = 1000;
	s.price = 100;          // nothing sells, so the barn only loses what is taken
	s.time = s.guard.nextAt;
	const events = tick(s, 0.1, DATA, rng);
	assert.equal(events.find(e => e.type === 'raidEnd').id, 'lost', 'nobody was posted');
	assert.equal(s.guard.losses, 1);
	assert.equal(s.beans, 1000 * (1 - G.loss.barnShare));
	const wave = G.waves[0].size;
	assert.equal(s.plots.filter(p => p === null).length, wave * G.loss.plotsEach);
	assert.match(s.log[0], /ate 3 plots/);
});

test('an old save without a guard gets one', () => {
	const s = createState(DATA);
	const saved = JSON.parse(JSON.stringify(serialize(s)));
	delete saved.guard;
	const back = restore(saved, DATA);
	assert.equal(back.guard.open, false);
	assert.equal(back.guard.posts, DATA.GUARD.posts.start);
});
