// The Guard tab: the raid that is coming (or going on), who is posted, the
// record so far, and, out in space, the Blight.

import { formatNumber, formatDuration } from '../../core/format.js';
import { raidIn, postsUsed, postCost, trainCost, defendersFor, ranksEarned, nextRank, hasDrill, needsAttention, waveText } from '../../core/guard.js';
import { ratio as blightRatio, eating } from '../../core/blight.js';
import { pct } from './text.js';

const sum = counts => Object.values(counts).reduce((a, b) => a + b, 0);

export function createGuard({ el, data, money }) {
	const G = data.GUARD;
	const B = data.BLIGHT;

	// How bad the blight is, and how much of the swarm stands guard.
	function blightBox(state) {
		const { blight } = state;
		const button = (label, dir, disabled) => {
			const b = el('button', { type: 'button', disabled }, label);
			b.dataset.swarm = String(dir);
			b.setAttribute('aria-label', dir > 0 ? 'Put more of the swarm on guard' : 'Put less of the swarm on guard');
			return b;
		};
		return el('div', { className: 'box' }, el('h3', { className: 'down' }, 'The Blight'),
			el('p', {}, `Blighted probes: ${formatNumber(blight.amount)}, ${pct(blightRatio(state))} for every 100 healthy. They are eating ${pct(eating(state, B) * 60)}% of the swarm a minute.`),
			el('div', { className: 'post' },
				el('span', {}, el('b', {}, 'Swarm on guard')),
				button('−', -1, blight.share <= 0), el('span', { className: 'n' }, `${Math.round(blight.share * 100)}%`), button('+', 1, blight.share >= B.maxShare)),
			el('p', { className: 'muted' }, 'Guards clear the blight, but they do not plant or spread. Too few and the swarm is eaten; too many and it stops growing.'
				+ (blight.level ? ' It has adapted since it first appeared: it may want more guards than it did.' : '')));
	}

	function raid(state) {
		const g = state.guard;
		if (g.fight) {
			return [el('h3', { className: 'down' }, 'Raid!'),
				el('p', {}, `${waveText(g.fight.foes, G)} still in the beans. ${sum(g.fight.up)} of ${postsUsed(g)} animals on their feet.`)];
		}
		const tough = G.foes.filter(f => f.tough && g.wave[f.id] > 0).map(f => f.plural.replace(/^./, ch => ch.toUpperCase()));
		return [el('h3', {}, `Next raid in ${formatDuration(Math.ceil(raidIn(state)))}`),
			el('p', {}, `Coming: ${waveText(g.wave, G)}.`),
			el('p', { className: 'muted' }, 'Post animals that suit what is coming: about one for every two pests. The wrong animal is little use.'),
			tough.length ? el('p', { className: 'muted' }, `${tough.join(' and ')} are tough: they take trained animals.`) : ''];
	}

	function posts(state) {
		const g = state.guard;
		const used = postsUsed(g);
		const drilled = hasDrill(g, G);
		const trains = state.phase >= G.train.phase;
		const rows = defendersFor(g, G).map(def => {
			const n = g.roster[def.id] ?? 0;
			const level = g.levels[def.id] ?? 0;
			const price = trainCost(state, def.id, G);
			const can = !!price && Object.entries(price).every(([c, v]) => state[c] >= v);
			const coach = el('button', { type: 'button', className: 'train', disabled: !can },
				price ? `Train to level ${level + 1} ` : `Trained: level ${level}`, price ? el('span', { className: 'gold' }, `(${money.costText(price)})`) : '');
			coach.dataset.train = def.id;
			const button = (label, delta, disabled) => {
				const b = el('button', { type: 'button', disabled: disabled || !!g.fight || drilled }, label);
				b.dataset.post = def.id;
				b.dataset.delta = String(delta);
				b.setAttribute('aria-label', `${delta > 0 ? 'Post another' : 'Stand down a'} ${def.name.toLowerCase()}`);
				return b;
			};
			return el('div', { className: 'post' },
				el('span', {}, el('b', {}, def.plural), trains && level ? ` lv ${level}` : '', el('span', { className: 'muted' }, ` ${def.text}`)),
				button('−', -1, n === 0), el('span', { className: 'n' }, String(n)), button('+', 1, used >= g.posts),
				trains ? coach : '');
		});
		const cost = postCost(g, G);
		const build = el('button', { type: 'button', disabled: !cost || state.coins < cost.coins }, 'Build another post ',
			el('span', { className: 'gold' }, cost ? `(${money.costText(cost)})` : ''));
		build.dataset.build = '1';
		return el('div', { className: 'box' }, el('h3', {}, `Posts · ${used} of ${g.posts} filled`), ...rows,
			drilled ? el('p', { className: 'muted' }, 'The animals take their own posts now.') : '',
			cost ? build : el('p', { className: 'muted' }, 'Every post is built.'));
	}

	return {
		id: 'guard',
		label: 'Guard',
		unlocked: state => state.guard.open,
		wants: state => needsAttention(state, G) || (state.blight.open && state.blight.share === 0),
		render(state) {
			const g = state.guard;
			const earned = ranksEarned(g, G);
			const next = nextRank(g, G);
			return [
				state.blight.open && blightBox(state),
				el('div', { className: 'box' }, ...raid(state), g.said ? el('p', { className: 'said' }, g.said) : ''),
				posts(state),
				el('div', { className: 'box' }, el('h3', {}, `Record · ${g.wins} won, ${g.losses} lost`),
					earned.length
						? el('ul', { className: 'finds' }, ...earned.map(r => el('li', {}, el('b', {}, r.name), ` ${r.text}`)))
						: el('p', { className: 'muted' }, 'A win pays a bounty. A loss costs plots and beans from the barn.'),
					el('p', { className: 'muted' }, next ? `At ${next.wins} ${next.wins === 1 ? 'win' : 'wins'}: ${next.text}` : 'Every rank earned.')),
			];
		},
		press(d, handlers) {
			if (d.post) handlers.post(d.post, Number(d.delta));
			if (d.build) handlers.build();
			if (d.train) handlers.train(d.train);
			if (d.swarm) handlers.swarm(Number(d.swarm));
		},
	};
}
