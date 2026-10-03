import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	createGuard, unlockDue, openGuard, tierFor, makeWave, defendersFor, postsUsed, setRoster, assign, postCost, buyPost,
	raidIn, bestRoster, step, trainCost, train, hitChance, ranksEarned, rankEffects, nextRank, hasDrill, needsAttention, waveText, validateGuard,
} from '../../games/beanstalk/src/core/guard.js';
import { createRng } from '../../shared/rng.js';

const G = {
	unlock: { grown: 100 }, log: 'Pests!',
	posts: { start: 2, max: 4, cost: { coins: 100 }, costGrowth: 3 },
	raid: { firstSeconds: 60, everySeconds: 150, warnSeconds: 30, roundSeconds: 1, maxSeconds: 20, lead: 0.6 },
	odds: { strong: 0.5, weak: 0.1, tire: 0.1 },
	loss: { plotsEach: 1, barnShare: 0.25 },
	bountySeconds: 20,
	train: { phase: 2, max: 2, per: 0.5, cap: 0.9, cost: { pages: 100 }, costGrowth: 2, log: 'Train them.' },
	lines: { raid: 'Raid: {wave}.', won: 'Won.', lost: 'Lost.' },
	foes: [
		{ id: 'slug', name: 'slug', plural: 'slugs' },
		{ id: 'mouse', name: 'mouse', plural: 'mice' },
		{ id: 'moth', name: 'moth', plural: 'moths', tough: 2 },
	],
	defenders: [
		{ id: 'duck', name: 'Duck', plural: 'Ducks', strong: ['slug'], text: 'Eats slugs.', wins: 0 },
		{ id: 'cat', name: 'Cat', plural: 'Cats', strong: ['mouse'], text: 'Catches mice.', wins: 0 },
		{ id: 'owl', name: 'Owl', plural: 'Owls', strong: ['mouse', 'moth'], text: 'Late arrival.', wins: 3 },
	],
	waves: [
		{ wins: 0, size: 3, foes: ['slug'] },
		{ wins: 2, size: 4, foes: ['slug', 'mouse'] },
		{ wins: 3, phase: 2, size: 5, foes: ['moth'] },
	],
	ranks: [
		{ wins: 1, name: 'Tidy', text: 'Yield +10%.', effect: { yield: 1.1 } },
		{ wins: 2, name: 'Drilled', text: 'They sort themselves out.', drill: true },
	],
};
const state = over => {
	const s = { time: 0, grown: 100, coins: 1000, guard: createGuard(G), ...over };
	return s;
};
const sure = { next: () => 0, pick: list => list[0] };
const never = { next: () => 0.999, pick: list => list[0] };
const opened = over => {
	const s = state(over);
	openGuard(s, G, sure);
	return s;
};
// Runs the guard forward and collects what happened.
const run = (s, seconds, rng) => {
	const events = [];
	for (let t = 0; t < seconds; t++) {
		s.time += 1;
		events.push(...step(s, 1, G, rng));
	}
	return events;
};

test('the guard opens once enough beans have grown, with a first raid on the way', () => {
	assert.equal(unlockDue(state({ grown: 99 }), G), false);
	const s = state();
	assert.equal(unlockDue(s, G), true);
	openGuard(s, G, sure);
	assert.equal(unlockDue(s, G), false);
	assert.deepEqual(s.guard.wave, { slug: 3 });
	assert.equal(raidIn(s), 60);
	assert.equal(s.guard.posts, 2);
});

test('waves get bigger and more mixed with wins', () => {
	assert.equal(tierFor(0, G).size, 3);
	assert.equal(tierFor(1, G).size, 3);
	assert.equal(tierFor(7, G).size, 4);
	const rng = createRng(4);
	const seen = new Set();
	for (let i = 0; i < 40; i++) {
		const wave = makeWave(2, G, rng);
		assert.equal(Object.values(wave).reduce((a, b) => a + b, 0), 4);
		for (const [k, v] of Object.entries(wave)) if (v > 0) seen.add(k);
		assert.ok(Object.values(wave).every(v => v > 0), 'no empty entries');
	}
	assert.deepEqual([...seen].sort(), ['mouse', 'slug']);
	assert.equal(waveText({ slug: 3, mouse: 1 }, G), '3 slugs and 1 mouse');
	assert.equal(waveText({ mouse: 2 }, G), '2 mice');
});

test('tough pests wait for a later phase, and training is the answer to them', () => {
	assert.equal(tierFor(5, G).size, 4, 'still the old waves in phase 1');
	assert.equal(tierFor(5, G, 2).size, 5);
	assert.deepEqual(makeWave(5, G, sure, 2), { moth: 5 });
	const owl = G.defenders[2];
	assert.equal(hitChance(owl, 'mouse', 0, G), 0.5);
	assert.equal(hitChance(owl, 'slug', 0, G), 0.1);
	assert.equal(hitChance(owl, 'moth', 0, G), 0.25, 'tough halves it');
	assert.equal(hitChance(owl, 'moth', 2, G), 0.5, 'two levels of training double it');
	assert.equal(hitChance(owl, 'mouse', 2, G), 0.9, 'never a certainty');

	const s = opened({ pages: 350, phase: 1 });
	assert.equal(trainCost(s, 'duck', G), null, 'no training in phase 1');
	assert.equal(train(s, 'duck', G), false);
	s.phase = 2;
	assert.deepEqual(trainCost(s, 'duck', G), { pages: 100 });
	assert.equal(train(s, 'owl', G), false, 'no owl yet');
	assert.equal(train(s, 'duck', G), true);
	assert.deepEqual(trainCost(s, 'duck', G), { pages: 200 });
	assert.equal(train(s, 'duck', G), true);
	assert.equal(s.pages, 50);
	assert.equal(s.guard.levels.duck, 2);
	assert.equal(trainCost(s, 'duck', G), null, 'fully trained');
	assert.equal(train(s, 'cat', G), false, 'cannot afford it');
});

test('animals are posted up to the number of posts, and only ones that have turned up', () => {
	const s = opened();
	assert.deepEqual(defendersFor(s.guard, G).map(d => d.id), ['duck', 'cat']);
	assert.equal(assign(s, 'duck', 1, G), true);
	assert.equal(assign(s, 'cat', 1, G), true);
	assert.equal(assign(s, 'duck', 1, G), false, 'both posts are taken');
	assert.equal(assign(s, 'owl', 1, G), false, 'no owl yet');
	assert.equal(assign(s, 'cat', -1, G), true);
	assert.equal(assign(s, 'cat', -1, G), false, 'none to take away');
	assert.equal(postsUsed(s.guard), 1);
	assert.equal(setRoster(s, { duck: 3 }, G), false);
	assert.equal(setRoster(s, { duck: 2 }, G), true);
	assert.deepEqual(s.guard.roster, { duck: 2 });
});

test('more posts cost more each time, up to a limit', () => {
	const s = opened({ coins: 450 });
	assert.deepEqual(postCost(s.guard, G), { coins: 100 });
	assert.equal(buyPost(s, G), true);
	assert.equal(s.coins, 350);
	assert.deepEqual(postCost(s.guard, G), { coins: 300 });
	assert.equal(buyPost(s, G), true);
	assert.equal(s.guard.posts, 4);
	assert.equal(postCost(s.guard, G), null, 'that is all the posts there are');
	assert.equal(buyPost(s, G), false);
	assert.equal(buyPost(opened({ coins: 5 }), G), false, 'cannot afford one');
});

test('the best roster covers the wave in proportion', () => {
	const all = G.defenders.slice(0, 2);
	assert.deepEqual(bestRoster({ slug: 3 }, 2, all), { duck: 2 });
	assert.deepEqual(bestRoster({ slug: 3, mouse: 3 }, 4, all), { duck: 2, cat: 2 });
	assert.deepEqual(bestRoster({ slug: 2, mouse: 4 }, 3, all), { duck: 1, cat: 2 });
	assert.deepEqual(bestRoster({ slug: 2 }, 0, all), {});
});

test('a raid with the right animals is won, and the next one is forecast', () => {
	const s = opened();
	setRoster(s, { duck: 2 }, G);
	assert.deepEqual(run(s, 59, sure), []);
	const events = run(s, 4, sure);
	assert.deepEqual(events.map(e => e.type), ['raid', 'raidEnd']);
	assert.equal(events[1].id, 'won');
	assert.equal(events[1].left, 0);
	assert.deepEqual(events[1].ranks.map(r => r.name), ['Tidy']);
	assert.equal(s.guard.wins, 1);
	assert.equal(s.guard.fight, null);
	assert.ok(raidIn(s) > 140, 'the next raid is a while off');
	assert.deepEqual(rankEffects(s.guard, G), [{ yield: 1.1 }]);
	assert.equal(nextRank(s.guard, G).name, 'Drilled');
});

test('the roster cannot be changed in the middle of a raid', () => {
	const s = opened();
	setRoster(s, { duck: 2 }, G);
	run(s, 60, never);
	assert.ok(s.guard.fight);
	assert.equal(raidIn(s), 0);
	assert.equal(assign(s, 'duck', -1, G), false);
	assert.equal(buyPost(s, G), true, 'building is still allowed');
});

test('a raid nobody guards against is lost at once, and the pests are counted', () => {
	const s = opened();
	const events = run(s, 61, sure);
	const end = events.find(e => e.type === 'raidEnd');
	assert.equal(end.id, 'lost');
	assert.equal(end.left, 3);
	assert.deepEqual(end.ranks, []);
	assert.equal(s.guard.losses, 1);
	assert.equal(s.guard.wins, 0);
});

test('a raid that drags on is lost when the pests have eaten their fill', () => {
	const s = opened();
	setRoster(s, { duck: 2 }, G);
	const events = run(s, 60 + 20, never);
	assert.equal(events.at(-1).id, 'lost');
	assert.equal(events.at(-1).left, 3);
});

test('the right animal is far better than the wrong one', () => {
	const wins = roster => {
		let won = 0;
		for (let seed = 1; seed <= 200; seed++) {
			const s = opened();
			setRoster(s, roster, G);
			if (run(s, 90, createRng(seed)).find(e => e.type === 'raidEnd').id === 'won') won++;
		}
		return won / 200;
	};
	const right = wins({ duck: 2 });
	const wrong = wins({ cat: 2 });
	assert.ok(right > 0.75, `ducks beat slugs ${right}`);
	assert.ok(wrong < 0.4, `cats beat slugs ${wrong}`);
});

test('a drilled guard sorts itself out before each raid', () => {
	const s = opened();
	assert.equal(hasDrill(s.guard, G), false);
	s.guard.wins = 2;
	assert.equal(hasDrill(s.guard, G), true);
	assert.deepEqual(ranksEarned(s.guard, G).map(r => r.name), ['Tidy', 'Drilled']);
	assert.equal(nextRank(s.guard, G), null);
	s.guard.roster = { cat: 2 };
	run(s, 60, never);
	assert.deepEqual(s.guard.roster, { duck: 2 });
});

test('the tab asks for attention when a post is empty or a pest is not covered', () => {
	const s = opened();
	assert.equal(needsAttention(s, G), true, 'empty posts');
	setRoster(s, { cat: 2 }, G);
	assert.equal(needsAttention(s, G), false, 'the raid is a long way off');
	s.time = 40;
	assert.equal(needsAttention(s, G), true, 'slugs are coming and nobody eats slugs');
	setRoster(s, { duck: 1, cat: 1 }, G);
	assert.equal(needsAttention(s, G), false);
	assert.equal(needsAttention(state(), G), false, 'not open yet');
});

test('validateGuard accepts good data and explains bad data', () => {
	assert.deepEqual(validateGuard(G), []);
	const bad = {
		unlock: {}, posts: { start: 0, max: 0, cost: {}, costGrowth: 1 },
		raid: { firstSeconds: 0, everySeconds: 10, warnSeconds: 20, roundSeconds: 0, maxSeconds: 0, lead: 2 },
		odds: { strong: 0.1, weak: 0.5, tire: 0 }, loss: { plotsEach: -1, barnShare: 2 }, bountySeconds: -1,
		lines: { raid: 'Raid.' },
		foes: [{ id: 'slug', name: 'slug' }, { id: 'slug', name: 'slug', plural: 'slugs' }, { id: 'moth', name: 'moth', plural: 'moths', tough: 1 }],
		defenders: [{ id: 'duck', name: 'Duck', strong: ['snail'], wins: 2 }],
		waves: [{ wins: 1, size: 0, foes: ['wasp'] }, { wins: 1, size: 2, foes: ['moth'] }],
		ranks: [{ wins: 3, name: 'A' }, { wins: 2, name: 'B', text: 't', effect: { luck: 1 } }],
		train: { phase: 2, max: 0, per: 0, cap: 2, cost: {}, costGrowth: 1 },
	};
	const errors = validateGuard(bad).join('\n');
	for (const word of ['unlock.grown', 'log is', 'posts.start', 'posts.max', 'posts.cost', 'costGrowth', 'firstSeconds', 'warnSeconds', 'roundSeconds',
		'maxSeconds', 'lead', 'odds', 'tire', 'plotsEach', 'barnShare', 'bountySeconds', '{wave}', 'lines.won', 'lines.lost', 'plural', 'slug is listed twice',
		'unknown foe "snail"', 'duck: text', 'nobody to post', 'first wave', 'size', 'unknown foe "wasp"', 'waves must climb', 'nothing guards against moth',
		'train: phase', 'train: cost', 'train: log', 'tough must be', 'tough pests before training', 'rank A: text', 'does nothing', 'ranks must climb', 'unknown effect "luck"', 'no drill']) {
		assert.match(errors, new RegExp(word.replace(/[{}]/g, '\\$&')), word);
	}
});
