import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toRgb, toHex, mixRgb, lightAt, skyTarget, ease, periodAt, validateSky } from '../../games/beanstalk/src/core/sky.js';

const SKY = {
	easeRate: 1, groundShare: 0.5, weatherAtNight: 0.5,
	keys: [
		{ at: 0, color: '#ff0000', amount: 0.4, night: 0 },
		{ at: 0.5, color: '#ffffff', amount: 0, night: 0 },
		{ at: 0.75, color: '#000000', amount: 1, night: 1 },
		{ at: 1, color: '#ff0000', amount: 0.4, night: 0 },
	],
	periods: [{ until: 0.5, name: 'Day' }, { until: 1, name: 'Night' }],
};
const SEASON = { sky: '#0000ff', grass: '#00ff00' };

test('colours convert and mix', () => {
	assert.deepEqual(toRgb('#102030'), [16, 32, 48]);
	assert.equal(toHex([16, 32, 48]), '#102030');
	assert.equal(toHex([300, -5, 127.6]), '#ff0080');
	assert.deepEqual(mixRgb([0, 0, 0], [100, 200, 50], 0.5), [50, 100, 25]);
});

test('lightAt interpolates between the keys either side', () => {
	assert.deepEqual(lightAt(0, SKY.keys), { color: [255, 0, 0], amount: 0.4, night: 0 });
	const mid = lightAt(0.25, SKY.keys);
	assert.equal(mid.amount, 0.2);
	assert.deepEqual(mid.color, [255, 127.5, 127.5]);
	assert.equal(lightAt(0.625, SKY.keys).night, 0.5);
	assert.equal(lightAt(1, SKY.keys).amount, 0.4);
});

test('by day the sky is the season\'s; at night it is the night\'s', () => {
	const noon = skyTarget(0.5, SEASON, null, SKY);
	assert.deepEqual(noon.sky, [0, 0, 255]);
	assert.deepEqual(noon.grass, [0, 255, 0]);
	assert.equal(noon.night, 0);
	const midnight = skyTarget(0.75, SEASON, null, SKY);
	assert.deepEqual(midnight.sky, [0, 0, 0]);
	assert.equal(midnight.night, 1);
	assert.equal(midnight.light.amount, 0.5, 'the ground gets its share of the dark');
});

test('weather tints the sky and the ground, less so at night', () => {
	const rain = { tint: { color: '#808080', amount: 0.5 } };
	const day = skyTarget(0.5, SEASON, rain, SKY);
	assert.deepEqual(day.sky, [64, 64, 191.5]);
	assert.deepEqual(day.grass, mixRgb([0, 255, 0], [128, 128, 128], 0.25));
	const night = skyTarget(0.75, SEASON, rain, SKY);
	assert.deepEqual(night.sky, [32, 32, 32], 'half the tint in the dark');
	assert.deepEqual(skyTarget(0.5, SEASON, { id: 'crow' }, SKY).sky, [0, 0, 255], 'weather with no tint');
});

test('ease closes most of the gap in a second and all of it eventually', () => {
	assert.deepEqual(ease([0, 0, 0], [100, 100, 100], 0, 1), [0, 0, 0]);
	const one = ease([0], [100], 1, 1)[0];
	assert.ok(one > 60 && one < 66);
	assert.ok(ease([0], [100], 20, 1)[0] > 99.99);
});

test('periodAt names the time of day', () => {
	assert.equal(periodAt(0.1, SKY.periods), 'Day');
	assert.equal(periodAt(0.5, SKY.periods), 'Night');
	assert.equal(periodAt(1, SKY.periods), 'Night');
});

test('validateSky accepts good data and explains bad data', () => {
	assert.deepEqual(validateSky(SKY), []);
	const bad = {
		easeRate: 0, groundShare: 2, weatherAtNight: 0.5,
		keys: [{ at: 0.1, color: 'red', amount: 2, night: 0 }, { at: 0, color: '#000000', amount: 0, night: 0 }],
		periods: [{ until: 0.5 }],
	};
	const errors = validateSky(bad).join('\n');
	for (const word of ['0 to at: 1', 'out of order', 'not a colour', 'amount', 'match the first', 'easeRate', 'groundShare', 'until: 1', 'no name']) {
		assert.match(errors, new RegExp(word));
	}
});
