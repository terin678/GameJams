// The Seeds tab: the seed line, the cross in progress (or its seedlings to
// choose from), and the county fair.

import { calendar } from '../../core/seasons.js';
import { crossCost, canCross, growingFor, fairTrait, fairBar, ribbonCount, luckOf } from '../../core/seeds.js';

export function createSeeds({ el, data, T, money }) {
	const S = data.SEEDS;

	function breeding(state) {
		const line = state.seeds;
		const growing = growingFor(state);
		if (growing === null) {
			const b = el('button', { type: 'button', disabled: !canCross(state, S) }, 'Cross seeds ',
				el('span', { className: 'gold' }, `(${money.costText(crossCost(line, S))})`));
			b.dataset.cross = '1';
			return [b, el('p', { className: 'muted' }, 'Grows out three seedlings, each better at one thing. Keep one, or none.')];
		}
		if (growing > 0) return [el('p', {}, `Seedlings are growing out... ${Math.ceil(growing)}s`)];
		const pick = (index, ...children) => {
			const b = el('button', { type: 'button' }, ...children);
			b.dataset.seedling = String(index);
			return b;
		};
		return [el('p', {}, 'The seedlings are ready. Which one becomes your line?'),
			el('div', { className: 'seedlings' },
				...line.pending.options.map((option, i) => pick(i, ...S.traits.flatMap((t, k) => {
					const change = option[t.id] - line.traits[t.id];
					const delta = change ? el('span', { className: change > 0 ? 'up' : 'down' }, ` (${change > 0 ? '+' : ''}${change})`) : '';
					return [k ? ' · ' : '', `${t.name} ${option[t.id]}`, delta];
				}))),
				pick(-1, 'Keep the old line'))];
	}

	return {
		id: 'seeds',
		label: 'Seeds',
		unlocked: state => state.seeds.open,
		wants: state => growingFor(state) === 0,
		render(state) {
			const line = state.seeds;
			const { year } = calendar(state.day, data.SEASONS, T.calendar);
			const traits = S.traits.map(t => {
				const level = line.traits[t.id];
				const fill = el('i');
				fill.style.width = `${level / S.maxLevel * 100}%`;
				return el('div', { className: 'trait' },
					el('span', {}, el('b', {}, t.name), ` ${level}`),
					el('div', { className: 'bar' }, fill),
					el('span', { className: 'muted' }, `x${(t.per ** level).toFixed(2)} ${t.blurb}`));
			});

			const fairYear = line.judged >= year ? year + 1 : year;
			const judged = fairTrait(fairYear, S);
			const bar = fairBar(line, judged.id, S, state.rules.fairBar);
			const have = line.traits[judged.id];
			const ribbons = ribbonCount(line);
			const last = line.result;
			const lastTrait = last && S.traits.find(t => t.id === last.trait);
			const fairSeason = data.SEASONS.find(s => s.id === S.fair.season).name.toLowerCase();

			return [
				el('div', { className: 'box' }, el('h3', {}, `Your seed line · generation ${line.generation}`), ...traits),
				el('div', { className: 'box' }, el('h3', {}, 'Breeding'), ...breeding(state)),
				el('div', { className: 'box' }, el('h3', {}, 'County fair'),
					el('p', {}, `${fairYear === year ? 'This' : 'Next'} ${fairSeason}: ${judged.fair}. The judges want ${judged.name} ${bar}; yours is ${have}. `,
						el('span', { className: have >= bar ? 'up' : 'down' }, have >= bar ? 'Good enough to win.' : `${bar - have} to go.`)),
					el('p', { className: 'muted' }, last
						? `Last fair, ${lastTrait.fair}: ${last.won ? 'first prize' : `second place (needed ${last.bar}, had ${last.level})`}.`
						: 'A different class is judged each year.'),
					el('p', {}, el('span', { className: 'gold' }, `Ribbons: ${ribbons}`),
						el('span', { className: 'muted' }, ribbons
							? ` · demand x${(S.fair.ribbonEffect.marketing ** ribbons).toFixed(2)} · crosses ${Math.round(luckOf(line, S) * 100)}% lucky`
							: ' · each one lifts demand and makes crosses luckier'))),
			];
		},
		press(d, handlers) {
			if (d.cross) handlers.cross();
			if (d.seedling) handlers.seedling(Number(d.seedling));
		},
	};
}
