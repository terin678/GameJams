import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeMods, costOf, visible, affordable, available, buy, validateProject } from '../../games/beanstalk/src/core/projects.js';

const DEFS = [
	{ id: 'plot', phase: 1, title: 'Plot', flavor: '.', cost: { coins: 10 }, costGrowth: 2, max: 3, effect: { plots: 1 } },
	{ id: 'can', phase: 1, title: 'Can', flavor: '.', cost: { coins: 5 }, requires: { grown: 5 }, effect: { growth: 1.5 } },
	{ id: 'hose', phase: 1, title: 'Hose', flavor: '.', cost: { coins: 5 }, requires: { has: ['can'] }, effect: { growth: 2, greenhouse: true } },
	{ id: 'probe', phase: 3, title: 'Probe', flavor: '.', cost: { pages: 3, coins: 1 }, grant: { probes: 1 }, effect: { replicate: 0.1 } },
];
const byId = id => DEFS.find(d => d.id === id);
const state = over => ({ coins: 0, pages: 0, matter: 0, grown: 0, height: 0, phase: 1, probes: 0, owned: {}, ...over });

test('computeMods starts from the base and applies every owned project', () => {
	const base = { plots: 1, growth: 1 };
	assert.deepEqual(computeMods({}, DEFS, base), {
		plots: 1, tend: 0, pagesRate: 0, replicate: 0, pricing: 0, coinsRate: 0,
		growth: 1, yield: 1, marketing: 1, probeYield: 1, matterRate: 1,
		scarecrow: false, greenhouse: false, autoprice: false, rainmaker: false,
	});
	const mods = computeMods({ plot: 2, can: 1, hose: 1 }, DEFS, base);
	assert.equal(mods.plots, 3);
	assert.equal(mods.growth, 3);
	assert.equal(mods.greenhouse, true);
});

test('computeMods also applies effects from elsewhere, such as neighbours', () => {
	const mods = computeMods({ can: 1 }, DEFS, {}, [{ growth: 2, tend: 3 }, { tend: 1 }]);
	assert.equal(mods.growth, 3);
	assert.equal(mods.tend, 4);
});

test('costOf grows with each copy owned', () => {
	assert.deepEqual(costOf(byId('plot'), 0), { coins: 10 });
	assert.deepEqual(costOf(byId('plot'), 2), { coins: 40 });
	assert.deepEqual(costOf(byId('can'), 0), { coins: 5 });
});

test('a project shows once its phase and requirements are met, until it is maxed', () => {
	assert.equal(visible(state(), byId('plot')), true);
	assert.equal(visible(state({ owned: { plot: 3 } }), byId('plot')), false);
	assert.equal(visible(state(), byId('can')), false);
	assert.equal(visible(state({ grown: 5 }), byId('can')), true);
	assert.equal(visible(state({ owned: { can: 1 } }), byId('can')), false);
	assert.equal(visible(state(), byId('hose')), false);
	assert.equal(visible(state({ owned: { can: 1 } }), byId('hose')), true);
	assert.equal(visible(state({ phase: 2 }), byId('probe')), false);
	assert.equal(visible(state({ phase: 3 }), byId('probe')), true);
	assert.deepEqual(available(state({ grown: 9 }), DEFS).map(d => d.id), ['plot', 'can']);
});

test('affordable needs every currency in the cost', () => {
	assert.equal(affordable(state({ pages: 3 }), byId('probe')), false);
	assert.equal(affordable(state({ pages: 3, coins: 1 }), byId('probe')), true);
});

test('buy pays, counts the purchase and hands over any grant', () => {
	const s = state({ phase: 3, pages: 5, coins: 2 });
	assert.equal(buy(s, byId('probe')), true);
	assert.equal(s.pages, 2);
	assert.equal(s.coins, 1);
	assert.equal(s.probes, 1);
	assert.deepEqual(s.owned, { probe: 1 });
	assert.equal(buy(s, byId('probe')), false, 'already owned');
});

test('buy refuses what you cannot afford and charges the grown price', () => {
	const s = state({ coins: 25 });
	assert.equal(buy(s, byId('plot')), true);
	assert.equal(s.coins, 15);
	assert.equal(buy(s, byId('plot')), false);
	assert.equal(s.coins, 15);
});

test('validateProject catches the mistakes a data file can make', () => {
	const ids = new Set(DEFS.map(d => d.id));
	for (const d of DEFS) assert.deepEqual(validateProject(d, ids), []);
	const bad = { id: 'x', phase: 9, cost: { gold: 1 }, requires: { mood: 1, has: ['nope'] }, effect: { luck: 2 }, grant: { cows: 1 } };
	const errors = validateProject(bad, ids).join('\n');
	for (const word of ['title', 'flavor', 'phase', 'gold', 'mood', 'nope', 'luck', 'cows']) assert.match(errors, new RegExp(word));
	assert.match(validateProject({ ...DEFS[0], cost: {} }, ids).join(), /cost/);
});
