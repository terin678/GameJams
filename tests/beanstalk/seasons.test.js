import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calendar, advance, rollWeather, growthMult } from '../../games/beanstalk/src/core/seasons.js';

const T = { daySeconds: 5, daysPerSeason: 7 };
const SEASONS = [
	{ id: 'spring', growth: 1 },
	{ id: 'summer', growth: 1.3 },
	{ id: 'autumn', growth: 1 },
	{ id: 'winter', growth: 0.2, cold: true },
];

test('calendar turns a day count into season, day and year', () => {
	assert.deepEqual(calendar(0, SEASONS, T), { season: SEASONS[0], dayOfSeason: 1, year: 1 });
	assert.equal(calendar(6, SEASONS, T).dayOfSeason, 7);
	assert.equal(calendar(7, SEASONS, T).season.id, 'summer');
	assert.equal(calendar(27, SEASONS, T).season.id, 'winter');
	assert.deepEqual(calendar(28, SEASONS, T), { season: SEASONS[0], dayOfSeason: 1, year: 2 });
});

test('advance counts the days that begin and keeps the remainder', () => {
	const clock = { day: 0, dayT: 0 };
	assert.equal(advance(clock, 4, T), 0);
	assert.equal(advance(clock, 2, T), 1);
	assert.deepEqual(clock, { day: 1, dayT: 1 });
	assert.equal(advance(clock, 10, T), 2);
	assert.equal(clock.day, 3);
});

test('rollWeather picks by chance, and mostly picks nothing', () => {
	const weather = [{ id: 'rain', chance: 0.2 }, { id: 'crow', chance: 0.1 }];
	const at = v => rollWeather({ next: () => v }, weather);
	assert.equal(at(0.1).id, 'rain');
	assert.equal(at(0.25).id, 'crow');
	assert.equal(at(0.5), null);
});

test('growthMult combines season and weather; a greenhouse ignores the cold', () => {
	const winter = SEASONS[3];
	assert.equal(growthMult(SEASONS[1], null, {}), 1.3);
	assert.equal(growthMult(SEASONS[0], { growth: 1.5 }, {}), 1.5);
	assert.equal(growthMult(winter, null, {}), 0.2);
	assert.equal(growthMult(winter, null, { greenhouse: true }), 1);
	assert.equal(growthMult(SEASONS[0], { id: 'crow' }, {}), 1);
});
