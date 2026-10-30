// Content lives in src/data/. These tests check every cross-reference so a typo
// in a job or a spawn window fails the suite instead of crashing mid-run.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JOBS, TIERS } from '../../games/jobhop/src/data/jobs.js';
import { ATTACKS, ACTIONS } from '../../games/jobhop/src/data/abilities.js';
import { STATS, PASSIVES } from '../../games/jobhop/src/data/passives.js';
import { ENEMIES } from '../../games/jobhop/src/data/enemies.js';
import { STAGE } from '../../games/jobhop/src/data/stage.js';
import { SPRITES, PALETTE } from '../../games/jobhop/src/data/sprites.js';
import { SOUNDS } from '../../games/jobhop/src/data/sounds.js';
import { TUNING, DEFAULT_PICKS } from '../../games/jobhop/src/data/tuning.js';
import { ACTION_PARTS } from '../../games/jobhop/src/core/actions.js';
import { parsePixelMap } from '../../shared/pixelart.js';
import { validateSfx } from '../../shared/sfx.js';

const SHAPES = {
	arc: ['range', 'arcDeg', 'cooldownMs'],
	line: ['length', 'width', 'cooldownMs'],
	projectile: ['count', 'speed', 'radius', 'lifeMs', 'cooldownMs', 'sprite'],
	orbit: ['count', 'orbit', 'spin', 'hitRadius', 'hitEveryMs', 'sprite'],
};
const tierIndex = id => TIERS.indexOf(JOBS[id].tier);

test('every sprite frame parses against the palette and frames share a size', () => {
	for (const [key, sprite] of Object.entries(SPRITES)) {
		assert.ok(sprite.frames?.length > 0, `${key} has frames`);
		const sizes = sprite.frames.map(rows => {
			const m = parsePixelMap(rows, PALETTE);
			return `${m.width}x${m.height}`;
		});
		assert.equal(new Set(sizes).size, 1, `${key} frames differ in size: ${sizes}`);
	}
});

test('every sound definition is valid', () => {
	for (const [key, def] of Object.entries(SOUNDS)) assert.deepEqual(validateSfx(def), [], key);
});

test('the tree is 4 basic, 4 advanced, 2 expert', () => {
	const count = t => Object.values(JOBS).filter(j => j.tier === t).length;
	assert.deepEqual(TIERS.map(count), [4, 4, 2]);
});

test('jobs are well-formed', () => {
	const abbrs = new Set();
	for (const [id, j] of Object.entries(JOBS)) {
		assert.ok(TIERS.includes(j.tier), `${id}.tier`);
		assert.ok(SPRITES[j.sprite], `${id}.sprite`);
		assert.ok(j.attacks.length > 0, `${id} has an attack`);
		for (const a of j.attacks) assert.ok(ATTACKS[a], `${id} attack "${a}"`);
		assert.ok(ACTIONS[j.action], `${id}.action "${j.action}"`);
		assert.match(j.abbr, /^[A-Z]{3}$/, `${id}.abbr`);
		assert.ok(!abbrs.has(j.abbr), `${id}.abbr is unique`);
		abbrs.add(j.abbr);
		for (const stat of Object.keys(j.stats)) assert.ok(STATS[stat], `${id}.stats.${stat}`);
		let last = 1;
		for (const n of j.nodes) {
			assert.ok(STATS[n.stat], `${id} node stat "${n.stat}"`);
			assert.ok(Number.isFinite(n.add) && n.add !== 0, `${id} node add`);
			assert.ok(n.level > last && n.level <= TUNING.jobXp.maxLevel, `${id} node levels rise within the cap`);
			last = n.level;
		}
		assert.equal(j.nodes.filter(n => n.mastery).length, 1, `${id} has one mastery node`);
		assert.equal(j.nodes.find(n => n.mastery).level, TUNING.jobXp.maxLevel, `${id} mastery is at max level`);
	}
});

test('unlocks: basics are free, every other job needs jobs exactly one tier down', () => {
	for (const [id, j] of Object.entries(JOBS)) {
		if (j.tier === 'basic') { assert.deepEqual(j.unlock, [], `${id} is free`); continue; }
		assert.ok(j.unlock.length > 0, `${id} has a requirement`);
		for (const r of j.unlock) {
			assert.ok(JOBS[r.job], `${id} needs unknown "${r.job}"`);
			assert.equal(tierIndex(r.job), tierIndex(id) - 1, `${id} needs a job one tier down`);
			assert.ok(r.level >= 2 && r.level <= TUNING.jobXp.maxLevel, `${id} level requirement`);
		}
		if (j.tier === 'expert') assert.equal(j.unlock.length, 2, `${id} needs two advanced jobs`);
	}
});

test('every advanced job leads somewhere', () => {
	const needed = new Set(Object.values(JOBS).flatMap(j => j.unlock.map(r => r.job)));
	for (const [id, j] of Object.entries(JOBS)) {
		if (j.tier === 'advanced') assert.ok(needed.has(id), `${id} unlocks no expert job`);
	}
});

test('attacks match their shape', () => {
	for (const [id, a] of Object.entries(ATTACKS)) {
		assert.ok(SHAPES[a.shape], `${id}.shape "${a.shape}"`);
		assert.ok(a.damage > 0, `${id}.damage`);
		for (const k of SHAPES[a.shape]) assert.ok(a[k] !== undefined, `${id}.${k}`);
		if (a.sprite) assert.ok(SPRITES[a.sprite], `${id}.sprite`);
		if (a.burn) assert.ok(a.burn.dps > 0 && a.burn.ms > 0, `${id}.burn`);
		for (const k of Object.keys(a.perLevel ?? {})) assert.ok(['damage', 'area', 'count', 'cooldown'].includes(k), `${id}.perLevel.${k}`);
		if (a.perLevel?.cooldown) assert.ok(a.perLevel.cooldown * (TUNING.attackMaxLevel - 1) < 1, `${id} cooldown stays positive`);
	}
});

test('every attack and action is used by some job', () => {
	const attacks = new Set(Object.values(JOBS).flatMap(j => j.attacks));
	const actions = new Set(Object.values(JOBS).map(j => j.action));
	for (const id of Object.keys(ATTACKS)) assert.ok(attacks.has(id), `attack ${id} unused`);
	for (const id of Object.keys(ACTIONS)) assert.ok(actions.has(id), `action ${id} unused`);
});

test('actions use known parts and are affordable', () => {
	const meta = ['name', 'cost', 'color'];
	for (const [id, a] of Object.entries(ACTIONS)) {
		assert.ok(a.cost > 0 && a.cost <= TUNING.gauge.max, `${id}.cost`);
		const parts = Object.keys(a).filter(k => !meta.includes(k));
		assert.ok(parts.length > 0, `${id} does something`);
		for (const p of parts) assert.ok(ACTION_PARTS.includes(p), `${id} part "${p}"`);
		if (a.pulse) assert.ok(a.pulse.radius > 0 && a.pulse.damage > 0, `${id}.pulse`);
		if (a.field) assert.ok(a.field.radius > 0 && a.field.ms > 0 && a.field.tickMs > 0, `${id}.field`);
		if (a.heal) assert.ok(a.heal > 0 && a.heal <= 1, `${id}.heal`);
	}
});

test('passives raise real stats', () => {
	for (const [id, p] of Object.entries(PASSIVES)) {
		assert.ok(STATS[p.stat], `${id}.stat`);
		assert.ok(p.max >= 1 && Number.isFinite(p.perLevel) && p.perLevel > 0, `${id} levels`);
	}
});

test('enemies are well-formed', () => {
	for (const [id, e] of Object.entries(ENEMIES)) {
		assert.ok(SPRITES[e.sprite], `${id}.sprite`);
		assert.ok(e.hp > 0 && e.speed > 0 && e.radius > 0 && e.damage > 0 && e.xp > 0, `${id} numbers`);
		if (e.potion !== undefined) assert.ok(e.potion > 0 && e.potion <= 1, `${id}.potion`);
		if (e.summon) assert.ok(ENEMIES[e.summon.type] && !ENEMIES[e.summon.type].boss, `${id}.summon`);
		if (e.dash) assert.ok(e.dash.ms < e.dash.everyMs, `${id}.dash`);
	}
	assert.equal(Object.values(ENEMIES).filter(e => e.boss).length, 1, 'one boss');
	assert.ok(Object.values(ENEMIES).some(e => e.elite), 'at least one elite');
});

test('stage windows reference real, non-special enemies', () => {
	for (const [i, w] of STAGE.windows.entries()) {
		const e = ENEMIES[w.type];
		assert.ok(e, `window ${i} type "${w.type}"`);
		assert.ok(!e.boss && !e.elite, `window ${i} spawns a special enemy`);
		assert.ok(w.from >= 0 && w.from < w.to, `window ${i} times`);
		assert.ok(w.everyMs > 0 && w.max > 0 && w.max <= TUNING.maxEnemies, `window ${i} rate/max`);
	}
	assert.ok(STAGE.windows.some(w => w.from === 0), 'something spawns from the start');
});

test('stage events: elites before the boss, one boss at the end of the clock', () => {
	for (const ev of STAGE.events) assert.ok(ENEMIES[ev.type] && ev.count > 0, `event ${ev.type}`);
	const bosses = STAGE.events.filter(ev => ENEMIES[ev.type].boss);
	assert.equal(bosses.length, 1);
	assert.equal(bosses[0].at, TUNING.runSeconds);
	assert.equal(bosses[0].count, 1);
	assert.ok(STAGE.events.some(ev => ENEMIES[ev.type].elite && ev.at === TUNING.runSeconds / 2), 'an elite at the halfway mark');
});

test('default picks are two different basic jobs', () => {
	assert.equal(DEFAULT_PICKS.length, 2);
	assert.notEqual(DEFAULT_PICKS[0], DEFAULT_PICKS[1]);
	for (const id of DEFAULT_PICKS) assert.equal(JOBS[id]?.tier, 'basic');
});
