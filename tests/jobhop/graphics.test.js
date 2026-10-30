import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGraphics, nextGraphics, createAutoQuality, sampleFrame, resolvePreset, scaleCount, describeGraphics, renderScale } from '../../games/jobhop/src/core/graphics.js';
import { GRAPHICS_ORDER, QUALITY_LEVELS, PRESETS, AUTO, FX } from '../../games/jobhop/src/data/graphics.js';

const LEVELS = ['high', 'medium', 'low'];
const CFG = { windowMs: 1000, slowMs: 20, windows: 2, ignoreMs: 250 };
const feed = (s, ms, count) => {
	let changed = null;
	for (let i = 0; i < count; i++) changed = sampleFrame(s, ms, CFG, LEVELS) ?? changed;
	return changed;
};

test('a saved setting must be one we know, else auto', () => {
	assert.equal(loadGraphics('low', GRAPHICS_ORDER), 'low');
	assert.equal(loadGraphics('ultra', GRAPHICS_ORDER), 'auto');
	assert.equal(loadGraphics(null, GRAPHICS_ORDER), 'auto');
});

test('the setting cycles through the list and wraps', () => {
	assert.equal(nextGraphics('auto', GRAPHICS_ORDER), 'high');
	assert.equal(nextGraphics('low', GRAPHICS_ORDER), 'auto');
});

test('auto starts at the top and holds while frames are fast', () => {
	const s = createAutoQuality(LEVELS);
	assert.equal(s.level, 'high');
	assert.equal(feed(s, 16, 600), null);
	assert.equal(s.level, 'high');
});

test('auto steps down one level after enough slow windows in a row', () => {
	const s = createAutoQuality(LEVELS);
	assert.equal(feed(s, 30, 34), null, 'one slow window is not enough');
	assert.equal(feed(s, 30, 34), 'medium');
	assert.equal(s.level, 'medium');
	feed(s, 30, 70);
	assert.equal(s.level, 'low');
	assert.equal(feed(s, 30, 200), null, 'nothing below low');
});

test('a fast window resets the slow streak', () => {
	const s = createAutoQuality(LEVELS);
	feed(s, 30, 34);
	feed(s, 16, 63);
	assert.equal(feed(s, 30, 34), null);
	assert.equal(s.level, 'high');
});

test('huge frames (tab switches, pauses) are ignored', () => {
	const s = createAutoQuality(LEVELS);
	assert.equal(feed(s, 2000, 10), null);
	assert.equal(s.ms, 0);
});

test('resolvePreset follows auto or the fixed choice', () => {
	const presets = { high: { n: 3 }, medium: { n: 2 }, low: { n: 1 } };
	assert.equal(resolvePreset('auto', { level: 'medium' }, presets), presets.medium);
	assert.equal(resolvePreset('low', { level: 'high' }, presets), presets.low);
});

test('describeGraphics shows what auto picked', () => {
	assert.equal(describeGraphics('auto', { level: 'medium' }), 'AUTO (medium)');
	assert.equal(describeGraphics('low', { level: 'high' }), 'LOW');
});

test('scaleCount scales bursts by the preset and rounds', () => {
	assert.equal(scaleCount(10, { particles: 0.5 }), 5);
	assert.equal(scaleCount(3, { particles: 0.25 }), 1);
	assert.equal(scaleCount(10, { particles: 0 }), 0);
});

test('graphics data: every level has a full preset, ordered from best to cheapest', () => {
	assert.deepEqual(GRAPHICS_ORDER, ['auto', ...QUALITY_LEVELS]);
	const keys = Object.keys(PRESETS.high).sort();
	for (const lv of QUALITY_LEVELS) assert.deepEqual(Object.keys(PRESETS[lv]).sort(), keys, lv);
	for (let i = 1; i < QUALITY_LEVELS.length; i++) {
		const a = PRESETS[QUALITY_LEVELS[i - 1]], b = PRESETS[QUALITY_LEVELS[i]];
		assert.ok(b.particles <= a.particles && b.maxParticles <= a.maxParticles, `${QUALITY_LEVELS[i]} is not cheaper`);
	}
	assert.ok(AUTO.slowMs > 16.7 && AUTO.windows >= 1 && AUTO.ignoreMs > AUTO.slowMs);
	for (const [k, n] of Object.entries(FX.burst)) assert.ok(Number.isInteger(n) && n >= 0, k);
});

test('renderScale draws the canvas at about the real screen pixels, capped', () => {
	assert.equal(renderScale(800, 600, 1, 800, 600, 3), 1, 'exactly fits: no upscale needed');
	assert.equal(renderScale(1600, 1200, 1, 800, 600, 3), 2);
	assert.equal(renderScale(698, 900, 1.5, 800, 600, 3), 2, 'high-DPI rounds up so text is never stretched');
	assert.equal(renderScale(3840, 2160, 1, 800, 600, 3), 3, 'capped');
	assert.equal(renderScale(1600, 1200, 1, 800, 600, 1), 1, 'LOW keeps the 1x canvas');
	assert.equal(renderScale(2000, 600, 1, 800, 600, 3), 1, 'a wide window is limited by its height');
	assert.equal(renderScale(0, 0, 1, 800, 600, 3), 1, 'not laid out yet');
});

test('sharper levels never render at a lower scale than cheaper ones', () => {
	for (let i = 1; i < QUALITY_LEVELS.length; i++) {
		assert.ok(PRESETS[QUALITY_LEVELS[i]].maxScale <= PRESETS[QUALITY_LEVELS[i - 1]].maxScale);
	}
	assert.equal(PRESETS.low.maxScale, 1);
});
