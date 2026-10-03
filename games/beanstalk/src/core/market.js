// The bean market. `t` is TUNING.market.

// Beans per second the public will buy at this price.
export const demand = (price, marketing, t) => t.demandBase * marketing / price ** t.elasticity;

export function sell(stock, price, marketing, dt, t) {
	const sold = Math.min(stock, demand(price, marketing, t) * dt);
	return { sold, revenue: sold * price };
}

export function adjustPrice(price, dir, t) {
	const p = Math.round(price * t.priceStep ** dir * 100) / 100;
	return Math.min(t.priceMax, Math.max(t.priceMin, p));
}

// +1 raise, -1 cut, 0 leave it. `rate` is the current demand in beans/sec.
export function autoPriceDir(stock, rate, t) {
	if (stock < rate * t.autoprice.lowSeconds) return 1;
	if (stock > rate * t.autoprice.highSeconds) return -1;
	return 0;
}
