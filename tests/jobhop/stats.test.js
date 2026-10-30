import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deriveStats, passiveMods, formatMod } from '../../games/jobhop/src/core/stats.js';

const STATS = {
	might: { name: 'Might', base: 1, pct: true, min: 0.1 },
	maxHp: { name: 'Max HP', base: 100, min: 1 },
	armor: { name: 'Armor', base: 0 },
};

test('deriveStats starts at base and adds every mod', () => {
	assert.deepEqual(deriveStats(STATS, []), { might: 1, maxHp: 100, armor: 0 });
	const s = deriveStats(STATS, [{ stat: 'might', add: 0.2 }, { stat: 'might', add: 0.1 }, { stat: 'armor', add: 2 }]);
	assert.ok(Math.abs(s.might - 1.3) < 1e-9);
	assert.equal(s.armor, 2);
});

test('deriveStats clamps to the minimum', () => {
	assert.equal(deriveStats(STATS, [{ stat: 'maxHp', add: -500 }]).maxHp, 1);
});

test('deriveStats rejects unknown stats', () => {
	assert.throws(() => deriveStats(STATS, [{ stat: 'luck', add: 1 }]));
});

test('passiveMods scales perLevel by level', () => {
	const P = { ring: { stat: 'might', perLevel: 0.1 }, plate: { stat: 'armor', perLevel: 1 } };
	const mods = passiveMods(P, { ring: 3 });
	assert.equal(mods.length, 1);
	assert.equal(mods[0].stat, 'might');
	assert.ok(Math.abs(mods[0].add - 0.3) < 1e-9);
	assert.deepEqual(passiveMods(P, {}), []);
});

test('formatMod shows percent or flat', () => {
	assert.equal(formatMod(STATS, 'might', 0.1), '+10% Might');
	assert.equal(formatMod(STATS, 'maxHp', 20), '+20 Max HP');
	assert.equal(formatMod(STATS, 'maxHp', -10), '-10 Max HP');
});
