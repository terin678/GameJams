// The Exchange tab: the board, what you hold, and the buttons to trade.

import { formatNumber } from '../../core/format.js';
import { valueOf, averageCost } from '../../core/exchange.js';

export function createExchange({ el, data, money }) {
	const X = data.EXCHANGE;
	// The chart is only redrawn when what it shows has changed; otherwise the
	// same canvas is handed back, and stays on the page.
	let drawn = { key: '', canvas: null };

	// The price over the last few minutes, with a line at what yours cost.
	function chart(history, cost) {
		const key = `${history.length}:${history.at(-1)}:${cost}`;
		if (drawn.key === key) return drawn.canvas;
		const c = el('canvas', { className: 'chart', width: 300, height: 72 });
		c.setAttribute('role', 'img');
		c.setAttribute('aria-label', 'The price over the last few minutes');
		drawn = { key, canvas: c };
		const g = c.getContext('2d');
		if (!g || history.length < 2) return c;
		const all = cost ? [...history, cost] : history;
		const lo = Math.min(...all);
		const hi = Math.max(...all);
		const y = v => 66 - (v - lo) / Math.max(1e-9, hi - lo) * 60;
		if (cost) {
			g.strokeStyle = '#f2d544';
			g.setLineDash([4, 4]);
			g.beginPath();
			g.moveTo(0, y(cost));
			g.lineTo(300, y(cost));
			g.stroke();
			g.setLineDash([]);
		}
		g.strokeStyle = '#6fdc55';
		g.lineWidth = 2;
		g.beginPath();
		history.forEach((v, i) => g[i ? 'lineTo' : 'moveTo'](i / (X.history - 1) * 300, y(v)));
		g.stroke();
		return c;
	}

	return {
		id: 'exchange',
		label: 'Exchange',
		unlocked: state => state.exchange.open,
		render(state) {
			const ex = state.exchange;
			// With coins gone, what is traded is a promise of beans: a contract.
			const lot = state.rate ? 'contract' : 'crate';
			const lots = `${lot}s`;
			const cost = averageCost(ex);
			const worth = valueOf(ex);
			const change = ex.paid > 0 ? (worth / ex.paid - 1) * 100 : 0;
			const row = (label, key, can) => el('div', { className: 'trade' }, el('span', {}, label),
				...X.shares.map(share => {
					const size = share === 1 ? 'all' : `${Math.round(share * 100)}%`;
					const b = el('button', { type: 'button', disabled: !can }, size);
					b.dataset[key] = String(share);
					b.setAttribute('aria-label', `${label} ${size} of your ${key === 'buy' ? money.name : lots}`);
					return b;
				}));
			const held = ex.crates < 100 ? String(Math.round(ex.crates * 10) / 10) : formatNumber(ex.crates);
			return [
				el('div', { className: 'box' }, el('h3', {}, `Bean ${state.rate ? 'futures' : 'crates'} · ${money.each(ex.price)} ${money.name} a ${lot}`),
					chart(ex.history, cost),
					el('p', { className: 'muted' }, X.hint)),
				el('div', { className: 'box' }, el('h3', {}, `Your ${lots}`),
					ex.crates > 0
						? el('p', {}, `${held} ${lots}, bought at ${money.each(cost)} each. Worth ${money.cash(worth)} ${money.name} now `,
							el('span', { className: change >= 0 ? 'up' : 'down' }, `(${change >= 0 ? '+' : ''}${change.toFixed(0)}%)`), '.')
						: el('p', { className: 'muted' }, `You hold no ${lots}.`),
					row('Buy', 'buy', state.coins > 0), row('Sell', 'sell', ex.crates > 0),
					el('p', { className: 'muted' }, `Buying spends that share of your ${money.name}. Selling pays the price on the board, less a ${Math.round(X.fee * 100)}% fee.`)),
				el('div', { className: 'box' }, el('h3', {}, 'Account'),
					el('p', {}, 'Made at the exchange so far: ',
						el('span', { className: ex.profit >= 0 ? 'up' : 'down' }, `${ex.profit < 0 ? '−' : ''}${money.cash(Math.abs(ex.profit))} ${money.name}`))),
			];
		},
		press(d, handlers) {
			if (d.buy) handlers.trade('buy', Number(d.buy));
			if (d.sell) handlers.trade('sell', Number(d.sell));
		},
	};
}
