import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePixelMap, mirror } from '../../shared/pixelart.js';

const PALETTE = { k: '#000000', w: '#ffffff' };

test('parses rows into sized, coloured pixels; dots are transparent', () => {
	const map = parsePixelMap(['k.', '.w'], PALETTE);
	assert.equal(map.width, 2);
	assert.equal(map.height, 2);
	assert.deepEqual(map.pixels, [
		{ x: 0, y: 0, color: '#000000' },
		{ x: 1, y: 1, color: '#ffffff' },
	]);
});

test('rejects ragged rows', () => {
	assert.throws(() => parsePixelMap(['kk', 'k'], PALETTE), /row 1/);
});

test('rejects characters missing from the palette', () => {
	assert.throws(() => parsePixelMap(['kz'], PALETTE), /"z"/);
});

test('rejects empty maps', () => {
	assert.throws(() => parsePixelMap([], PALETTE), /empty/);
});

test('mirror reflects the left half to build symmetric sprites', () => {
	assert.deepEqual(mirror(['ab', 'c.']), ['abba', 'c..c']);
});

test('mirror with odd:true shares the centre column', () => {
	assert.deepEqual(mirror(['abc'], { odd: true }), ['abcba']);
});
