import { test } from 'node:test';
import assert from 'node:assert/strict';
import { demand, sell, adjustPrice, autoPriceDir, clearingPrice, analystPrice } from '../../games/beanstalk/src/core/market.js';

const T = { demandBase: 2, elasticity: 2, priceStep: 1.1, priceMin: 0.05, priceMax: 100, autoprice: { lowSeconds: 1, highSeconds: 5, glutDiscount: 0.8 } };

test('demand falls with price and rises with marketing', () => {
	assert.equal(demand(1, 1, T), 2);
	assert.equal(demand(2, 1, T), 0.5);
	assert.equal(demand(2, 4, T), 2);
});

test('sell moves beans at the demand rate and pays the asking price', () => {
	assert.deepEqual(sell(100, 2, 1, 4, T), { sold: 2, revenue: 4, acc: 0 });
});

test('beans sell whole: a slow market pays nothing until a bean actually goes', () => {
	const slow = sell(5, 10, 1, 10, T);            // 0.02 beans/sec for 10s
	assert.equal(slow.sold, 0);
	assert.equal(slow.revenue, 0);
	assert.ok(Math.abs(slow.acc - 0.2) < 1e-9);
	const later = sell(5, 10, 1, 40, T, slow.acc); // the rest of that bean
	assert.equal(later.sold, 1);
	assert.equal(later.revenue, 10);
	assert.ok(later.acc < 1e-9);
});

test('you cannot sell beans you do not have, and only one customer waits', () => {
	assert.deepEqual(sell(0, 1, 1, 10, T), { sold: 0, revenue: 0, acc: 1 });
	assert.deepEqual(sell(3, 1, 1, 10, T), { sold: 3, revenue: 3, acc: 1 });
});

test('adjustPrice steps by a ratio, in whole cents, inside the limits', () => {
	assert.equal(adjustPrice(1, 1, T), 1.1);
	assert.equal(adjustPrice(1, -1, T), 0.91);
	assert.equal(adjustPrice(0.05, -1, T), 0.05);
	assert.equal(adjustPrice(0.05, 1, T), 0.06);
	assert.equal(adjustPrice(99, 1, T), 100);
});

test('clearingPrice is where demand equals production', () => {
	assert.equal(clearingPrice(2, 1, T), 1);
	assert.equal(clearingPrice(8, 1, T), 0.5);
	assert.equal(clearingPrice(8, 4, T), 1);
	assert.equal(demand(clearingPrice(50, 3, T), 3, T) > 45, true);
	assert.equal(clearingPrice(0, 1, T), T.priceMax, 'nothing to sell: ask the moon');
	assert.equal(clearingPrice(1e12, 1, T), T.priceMin);
});

test('the analyst charges the clearing price, less a discount while the barn is full', () => {
	assert.equal(analystPrice(0, 8, 1, T), 0.5);
	assert.equal(analystPrice(39, 8, 1, T), 0.5, 'under five seconds of sales is not a glut');
	assert.equal(analystPrice(1000, 8, 1, T), 0.4);
});

test('the accountant raises the price when sold out and cuts it when stock piles up', () => {
	assert.equal(autoPriceDir(0, 10, T), 1);
	assert.equal(autoPriceDir(30, 10, T), 0);
	assert.equal(autoPriceDir(51, 10, T), -1);
});
