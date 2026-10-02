// Content lives in src/data/. These tests check every cross-reference so a typo
// in a wave or enemy fails the suite instead of crashing mid-game.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ENEMIES } from '../../games/midair/src/data/enemies.js';
import { STAGE } from '../../games/midair/src/data/stage1.js';
import { FORMS } from '../../games/midair/src/data/forms.js';
import { PICKUPS, EGG_CYCLE } from '../../games/midair/src/data/pickups.js';
import { SPRITES, PALETTE } from '../../games/midair/src/data/sprites.js';
import { SOUNDS } from '../../games/midair/src/data/sounds.js';
import { TUNING } from '../../games/midair/src/data/tuning.js';
import { PATTERNS } from '../../games/midair/src/core/patterns.js';
import { buildStage } from '../../games/midair/src/core/waves.js';
import { parsePixelMap } from '../../shared/pixelart.js';
import { validateSfx } from '../../shared/sfx.js';

const FIRE_KINDS = ['aimed', 'flak', 'spread'];

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
	for (const [key, def] of Object.entries(SOUNDS)) {
		assert.deepEqual(validateSfx(def), [], key);
	}
});

test('enemies are well-formed', () => {
	for (const [key, e] of Object.entries(ENEMIES)) {
		assert.ok(['sky', 'low'].includes(e.layer), `${key}.layer`);
		assert.ok(SPRITES[e.sprite], `${key}.sprite "${e.sprite}"`);
		assert.ok(e.hp > 0 && e.radius > 0 && e.score > 0, `${key} hp/radius/score`);
		if (e.fire) {
			assert.ok(FIRE_KINDS.includes(e.fire.kind), `${key}.fire.kind`);
			assert.ok(e.fire.everyMs > 0 && e.fire.speed > 0, `${key}.fire timing`);
			if (e.fire.kind === 'flak') assert.equal(e.layer, 'low', `${key}: flak comes from below`);
		}
		for (const d of e.drops ?? []) {
			assert.ok(PICKUPS[d.pickup], `${key} drops unknown "${d.pickup}"`);
			assert.ok(d.chance > 0 && d.chance <= 1, `${key} drop chance`);
		}
		if (e.climbAt !== undefined) assert.equal(e.layer, 'low', `${key}: only low enemies climb`);
		if (e.escorts) {
			assert.ok(ENEMIES[e.escorts.type], `${key}.escorts.type`);
			assert.ok(PATTERNS[e.escorts.pattern], `${key}.escorts.pattern`);
		}
		if (e.sfx) assert.ok(SOUNDS[e.sfx], `${key}.sfx`);
	}
});

test('enemy drop chances sum to at most 1', () => {
	for (const [key, e] of Object.entries(ENEMIES)) {
		const sum = (e.drops ?? []).reduce((a, d) => a + d.chance, 0);
		assert.ok(sum <= 1, `${key} drops sum to ${sum}`);
	}
});

test('both layers have something to shoot at', () => {
	const layers = new Set(Object.values(ENEMIES).map(e => e.layer));
	assert.ok(layers.has('sky') && layers.has('low'));
});

test('pickups reference real sprites and forms', () => {
	for (const [key, p] of Object.entries(PICKUPS)) {
		assert.ok(SPRITES[p.sprite], `${key}.sprite`);
		if (p.form) assert.ok(FORMS[p.form], `${key}.form "${p.form}"`);
		assert.ok(p.form || p.wingman || p.energy || p.gut, `${key} does something`);
	}
});

test('the egg cycle only holds form eggs, one per duck', () => {
	assert.ok(EGG_CYCLE.length >= 2);
	for (const key of EGG_CYCLE) assert.ok(PICKUPS[key]?.form, `${key} is a form egg`);
	assert.equal(new Set(EGG_CYCLE.map(k => PICKUPS[k].form)).size, EGG_CYCLE.length);
});

test('forms are well-formed', () => {
	assert.ok(FORMS[TUNING.player.form], 'default form exists');
	for (const [key, f] of Object.entries(FORMS)) {
		assert.ok(SPRITES[f.sprite], `${key}.sprite`);
		assert.ok(f.speed > 0, `${key}.speed`);
		assert.ok(f.levels.length >= 1 && f.levels.length <= TUNING.power.maxLevel, `${key}.levels`);
		f.levels.forEach((l, i) => {
			const at = `${key} level ${i + 1}`;
			assert.ok(l.cooldownMs > 0 && l.speed > 0 && l.damage > 0, at);
			assert.ok(Array.isArray(l.angles) && l.angles.length > 0, `${at} angles`);
			if (l.offsets) assert.equal(l.offsets.length, l.angles.length, `${at} offsets match angles`);
			assert.ok(SPRITES[l.sprite], `${at} sprite "${l.sprite}"`);
		});
	}
});

test('every duck form can be reached from an egg', () => {
	const reachable = new Set(Object.values(PICKUPS).map(p => p.form).filter(Boolean));
	for (const key of Object.keys(FORMS)) {
		if (key !== TUNING.player.form) assert.ok(reachable.has(key), `no egg for ${key}`);
	}
});

test('squadron rewards are real pickups on multi-plane waves', () => {
	const rewarded = STAGE.filter(w => w.reward);
	assert.ok(rewarded.length > 0, 'stage has squadron rewards');
	for (const w of rewarded) {
		assert.ok(PICKUPS[w.reward], `reward "${w.reward}"`);
		assert.ok((w.count ?? 1) >= 2, `rewarded wave at t=${w.t} needs a squadron`);
		assert.ok(!ENEMIES[w.type].boss, 'no squadron bosses');
	}
});

test('a feather is obtainable', () => {
	const fromWaves = STAGE.some(w => w.reward && PICKUPS[w.reward].wingman);
	const fromDrops = Object.values(ENEMIES).some(e => (e.drops ?? []).some(d => PICKUPS[d.pickup].wingman));
	assert.ok(fromWaves && fromDrops);
});

test('stage waves reference real enemies and patterns, on-screen', () => {
	for (const [i, w] of STAGE.entries()) {
		assert.ok(ENEMIES[w.type], `wave ${i} type "${w.type}"`);
		assert.ok(PATTERNS[w.pattern], `wave ${i} pattern "${w.pattern}"`);
		assert.ok(w.t >= 0, `wave ${i} time`);
	}
	for (const s of buildStage(STAGE)) {
		assert.ok(s.x >= 0 && s.x <= TUNING.width, `${s.type}@${s.t} x=${s.x} off the playfield`);
	}
});

test('stage ends with exactly one boss', () => {
	const spawns = buildStage(STAGE);
	const bosses = spawns.filter(s => ENEMIES[s.type].boss);
	assert.equal(bosses.length, 1);
	assert.equal(spawns.at(-1).type, bosses[0].type, 'boss is the last spawn');
});

test('stage uses both layers before the boss', () => {
	const layers = new Set(STAGE.filter(w => !ENEMIES[w.type].boss).map(w => ENEMIES[w.type].layer));
	assert.deepEqual([...layers].sort(), ['low', 'sky']);
});

test('tuning: bomb charge range is sane and affordable', () => {
	const b = TUNING.bomb;
	assert.ok(b.maxRadius > b.baseRadius && b.maxCost >= b.baseCost);
	assert.ok(b.maxCost <= TUNING.meters.gutMax, 'a full charge is affordable from full gut');
});
