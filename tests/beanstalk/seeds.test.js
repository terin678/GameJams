import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	createSeeds, unlockDue, ribbonCount, crossCost, luckOf, makeOptions, canCross, cross, growingFor, choose,
	fairTrait, fairBar, judge, seedEffects, validateSeeds,
} from '../../games/beanstalk/src/core/seeds.js';

const S = {
	unlock: { grown: 100 }, log: 'Seeds!', maxLevel: 5,
	traits: [
		{ id: 'size', name: 'Size', effect: 'yield', per: 2, blurb: 'b', fair: 'Biggest' },
		{ id: 'speed', name: 'Speed', effect: 'growth', per: 1.5, blurb: 'b', fair: 'Fastest' },
	],
	cross: { cost: { coins: 10 }, costGrowth: 2, seconds: 15, luck: 0.2, luckPerRibbon: 0.1, maxLuck: 0.5, slip: 0.3 },
	fair: { season: 'autumn', firstBar: 2, barStep: 2, ribbonEffect: { marketing: 1.5 }, win: 'w', lose: 'l' },
};
const SEASONS = [{ id: 'spring' }, { id: 'autumn' }];
const fixed = (...values) => {
	let i = 0;
	return { next: () => values[i++ % values.length] };
};
const state = over => {
	const s = { time: 0, grown: 0, coins: 100, seeds: createSeeds(S), ...over };
	s.seeds.open = true;
	return s;
};

test('a new seed line starts at zero and opens once the farm is big enough', () => {
	const seeds = createSeeds(S);
	assert.deepEqual(seeds.traits, { size: 0, speed: 0 });
	assert.equal(unlockDue({ grown: 99, seeds }, S), false);
	assert.equal(unlockDue({ grown: 100, seeds }, S), true);
	assert.equal(unlockDue({ grown: 100, seeds: { ...seeds, open: true } }, S), false);
});

test('each seedling is better in its own trait; the others may slip or rise', () => {
	// Rolls go seedling by seedling, trait by trait.
	const options = makeOptions({ size: 2, speed: 2 }, S, 0.2, fixed(0.5, 0.1, 0.95, 0.1));
	assert.deepEqual(options[0], { size: 3, speed: 1 }, 'size +1, speed slipped');
	assert.deepEqual(options[1], { size: 3, speed: 4 }, 'size rose by luck, speed jumped two');
});

test('levels stay between zero and the maximum', () => {
	const low = makeOptions({ size: 0, speed: 0 }, S, 0.2, fixed(0.5, 0.1));
	assert.equal(low[0].speed, 0);
	const high = makeOptions({ size: 5, speed: 5 }, S, 0.2, fixed(0.1));
	assert.equal(high[0].size, 5);
});

test('a cross costs coins, takes time, then offers seedlings to choose from', () => {
	const s = state();
	assert.equal(cross(s, S, fixed(0.5)), true);
	assert.equal(s.coins, 90);
	assert.equal(growingFor(s), 15);
	assert.equal(canCross(s, S), false, 'one cross at a time');
	assert.equal(choose(s, 0), false, 'still growing');
	s.time = 15;
	assert.equal(growingFor(s), 0);
	assert.equal(choose(s, 0), true);
	assert.deepEqual(s.seeds.traits, { size: 1, speed: 0 });
	assert.equal(s.seeds.generation, 1);
	assert.equal(s.seeds.pending, null);
	assert.deepEqual(crossCost(s.seeds, S), { coins: 20 }, 'the next one costs more');
});

test('you can keep the old line instead', () => {
	const s = state();
	cross(s, S, fixed(0.5));
	s.time = 15;
	assert.equal(choose(s, 7), false, 'no such seedling');
	assert.equal(choose(s, -1), true);
	assert.deepEqual(s.seeds.traits, { size: 0, speed: 0 });
	assert.equal(s.seeds.generation, 1);
});

test('no crossing without coins or before the catalogue arrives', () => {
	assert.equal(cross(state({ coins: 5 }), S, fixed(0.5)), false);
	const closed = state();
	closed.seeds.open = false;
	assert.equal(cross(closed, S, fixed(0.5)), false);
	assert.equal(growingFor(closed), null);
});

test('the fair judges one trait a year, in turn, against a bar that rises with each ribbon', () => {
	assert.equal(fairTrait(1, S).id, 'size');
	assert.equal(fairTrait(2, S).id, 'speed');
	assert.equal(fairTrait(3, S).id, 'size');
	const s = state();
	s.seeds.traits.size = 2;
	assert.deepEqual(judge(s, 1, S), { trait: 'size', bar: 2, level: 2, won: true, year: 1 });
	assert.equal(s.seeds.ribbons.size, 1);
	assert.equal(fairBar(s.seeds, 'size', S), 4);
	assert.equal(judge(s, 1, S), null, 'once a year');
	const lost = judge(s, 2, S);
	assert.equal(lost.won, false);
	assert.equal(ribbonCount(s.seeds), 1);
});

test('picky judges raise every bar', () => {
	const s = state();
	s.seeds.traits.size = 2;
	assert.equal(fairBar(s.seeds, 'size', S, 1), 3);
	assert.equal(judge(s, 1, S, 1).won, false);
});

test('ribbons make crosses luckier, up to a limit', () => {
	const seeds = createSeeds(S);
	assert.equal(luckOf(seeds, S), 0.2);
	seeds.ribbons.size = 2;
	assert.ok(Math.abs(luckOf(seeds, S) - 0.4) < 1e-9);
	seeds.ribbons.size = 9;
	assert.equal(luckOf(seeds, S), 0.5);
});

test('traits and ribbons become modifiers', () => {
	const seeds = { ...createSeeds(S), open: true, traits: { size: 3, speed: 2 }, ribbons: { size: 2, speed: 0 } };
	assert.deepEqual(seedEffects(seeds, S), [{ yield: 8 }, { growth: 2.25 }, { marketing: 2.25 }]);
	assert.deepEqual(seedEffects(createSeeds(S), S), [], 'nothing before it opens');
});

test('validateSeeds accepts good data and explains bad data', () => {
	assert.deepEqual(validateSeeds(S, SEASONS), []);
	const bad = {
		unlock: {}, maxLevel: 0,
		traits: [{ id: 'x', effect: 'tend', per: 1 }],
		cross: { cost: { gold: 1 }, costGrowth: 0.5, seconds: 0, luck: 2, maxLuck: 1, slip: 0.9 },
		fair: { season: 'monsoon', firstBar: 0, barStep: 1, ribbonEffect: { tend: 2 } },
	};
	const errors = validateSeeds(bad, SEASONS).join('\n');
	for (const word of ['unlock', 'log', 'maxLevel', 'name', 'multiplying', 'per must', 'gold', 'costGrowth', 'seconds', 'luck', 'overlap', 'monsoon', 'firstBar', 'win', 'ribbonEffect']) {
		assert.match(errors, new RegExp(word));
	}
});
