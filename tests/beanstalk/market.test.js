import { test } from 'node:test';
import assert from 'node:assert/strict';
import { demand, sell, adjustPrice, autoPriceDir } from '../../games/beanstalk/src/core/market.js';

const T = { demandBase: 2, elasticity: 2, priceStep: 1.1, priceMin: 0.05, priceMax: 100, autoprice: { lowSeconds: 1, highSeconds: 5 } };

test('demand falls with price and rises with marketing', () => {
	assert.equal(demand(1, 1, T), 2);
	assert.equal(demand(2, 1, T), 0.5);
	assert.equal(demand(2, 4, T), 2);
});

test('sell moves beans at the demand rate and pays the asking price', () => {
	assert.deepEqual(sell(100, 2, 1, 4, T), { sold: 2, revenue: 4 });
});

test('you cannot sell beans you do not have', () => {
	assert.deepEqual(sell(0.5, 1, 1, 10, T), { sold: 0.5, revenue: 0.5 });
});

test('adjustPrice steps by a ratio, in whole cents, inside the limits', () => {
	assert.equal(adjustPrice(1, 1, T), 1.1);
	assert.equal(adjustPrice(1, -1, T), 0.91);
	assert.equal(adjustPrice(0.05, -1, T), 0.05);
	assert.equal(adjustPrice(0.05, 1, T), 0.06);
	assert.equal(adjustPrice(99, 1, T), 100);
});

test('the accountant raises the price when sold out and cuts it when stock piles up', () => {
	assert.equal(autoPriceDir(0, 10, T), 1);
	assert.equal(autoPriceDir(30, 10, T), 0);
	assert.equal(autoPriceDir(51, 10, T), -1);
});
