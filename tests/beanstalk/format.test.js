import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatNumber, formatMoney, formatHeight, formatDuration } from '../../games/beanstalk/src/core/format.js';

test('formatNumber shows whole beans, then three figures with a suffix', () => {
	assert.equal(formatNumber(0), '0');
	assert.equal(formatNumber(12.9), '12');
	assert.equal(formatNumber(999), '999');
	assert.equal(formatNumber(1000), '1.00k');
	assert.equal(formatNumber(1234), '1.23k');
	assert.equal(formatNumber(45600), '45.6k');
	assert.equal(formatNumber(999999), '999k');
	assert.equal(formatNumber(1e6), '1.00M');
	assert.equal(formatNumber(2.5e9), '2.50B');
	assert.equal(formatNumber(7e12), '7.00T');
});

test('formatNumber switches to powers of ten when it runs out of names', () => {
	assert.equal(formatNumber(1e15), '1.00e15');
	assert.equal(formatNumber(1.234e30), '1.23e30');
	assert.equal(formatNumber(Infinity), '∞');
});

test('formatMoney keeps cents while they matter', () => {
	assert.equal(formatMoney(0), '0.00');
	assert.equal(formatMoney(3.456), '3.45');
	assert.equal(formatMoney(1234.5), '1.23k');
});

test('formatHeight climbs through m, km, AU and light years', () => {
	assert.equal(formatHeight(0), '0.0 m');
	assert.equal(formatHeight(3.25), '3.2 m');
	assert.equal(formatHeight(250), '250 m');
	assert.equal(formatHeight(2000), '2.00 km');
	assert.equal(formatHeight(384400e3), '384k km');
	assert.equal(formatHeight(1.496e11), '1.00 AU');
	assert.equal(formatHeight(9.461e15), '1.00 ly');
	assert.equal(formatHeight(9.461e20), '100k ly');
});

test('formatDuration', () => {
	assert.equal(formatDuration(45), '45s');
	assert.equal(formatDuration(200), '3m 20s');
	assert.equal(formatDuration(3725), '1h 02m');
});
