// How numbers and prices are worded on the page.

import { formatNumber, formatMoney } from '../../core/format.js';
import { moneyOf } from '../../core/sim.js';

export const perSecond = n => (n < 10 ? n.toFixed(1) : formatNumber(n));

// A share as a percentage, with a decimal while it is small.
export const pct = v => (v < 0.1 ? (v * 100).toFixed(1) : String(Math.round(v * 100)));

// What the wallet is called and worth: coins, or beans once the market is
// cornered (see moneyOf in core/sim.js). Call use(state) before drawing.
export function createMoney() {
	const money = {
		name: 'coins',
		per: 1,
		use(source) {
			Object.assign(money, source.name ? source : moneyOf(source));
		},
		// An amount of the wallet, in whatever it is counted in now.
		cash: v => (money.per === 1 ? formatMoney(v) : formatNumber(v / money.per)),
		// One unit's price, to two places ("52.80").
		each: v => (v / money.per).toFixed(2),
		// "5 coins + 20 pages". Currencies are named in the plural; one of them drops the s.
		costText: cost => Object.entries(cost).map(([c, v]) => {
			const n = c === 'coins' ? v / money.per : v;
			const name = c === 'coins' ? money.name : c;
			return `${formatNumber(n)} ${n === 1 ? name.replace(/s$/, '') : name}`;
		}).join(' + '),
	};
	return money;
}
