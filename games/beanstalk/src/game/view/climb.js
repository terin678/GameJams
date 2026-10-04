// The Climb tab: where the climber is, the choice in front of them, and what
// they have brought home.

import { formatHeight } from '../../core/format.js';
import { nextEncounter, climbBlocked, climbingFor, optionBlocked, findsOf, temper } from '../../core/climb.js';

export function createClimb({ el, data, T, money }) {
	const C = data.CLIMB;

	function now(state) {
		const trip = state.climb;
		const enc = nextEncounter(state, C);
		if (!enc) return [el('p', { className: 'story' }, 'There is nothing above you now but stars. You have seen all of it.')];
		if (trip.waiting) {
			return [el('h3', {}, enc.name), el('p', { className: 'story' }, enc.text),
				el('div', { className: 'seedlings' }, ...enc.options.map((o, i) => {
					const why = optionBlocked(state, o, T.friends);
					const risk = o.chance !== undefined && o.chance < 1 ? ` · risky (${Math.round(o.chance * 100)}%)` : '';
					const b = el('button', { type: 'button', disabled: !!why },
						el('b', {}, o.label),
						o.cost ? el('span', { className: 'gold' }, ` (${money.costText(o.cost)})`) : '',
						risk,
						why === 'needs' ? el('small', { className: 'muted' }, o.needsText) : '');
					b.dataset.option = String(i);
					return b;
				}))];
		}
		const left = climbingFor(state);
		if (left !== null) return [el('h3', {}, enc.name), el('p', {}, `Your climber is on the way up... ${Math.ceil(left)}s`)];
		const blocked = climbBlocked(state, C);
		const b = el('button', { type: 'button', disabled: !!blocked }, `Climb to ${enc.name.replace(/^The /, 'the ')} `,
			el('span', { className: 'gold' }, `(provisions: ${money.costText(enc.provisions)})`));
		b.dataset.climb = '1';
		return [el('h3', {}, `Next: ${enc.name}, at ${formatHeight(enc.height)}`), b,
			el('p', { className: 'muted' }, blocked === 'short'
				? `The stalk is ${formatHeight(state.height)} tall. It has to reach the ledge first.`
				: `About ${C.seconds} seconds up. There will be a choice to make at the top.`)];
	}

	return {
		id: 'climb',
		label: 'Climb',
		unlocked: state => state.climb.open,
		wants: state => state.climb.waiting,
		render(state) {
			const trip = state.climb;
			const finds = findsOf(trip, C);
			return [
				el('div', { className: 'box' }, ...now(state), trip.said ? el('p', { className: 'said' }, trip.said) : ''),
				el('div', { className: 'box' }, el('h3', {}, `Brought home · ledge ${trip.ledge} of ${C.encounters.length}`),
					finds.length
						? el('ul', { className: 'finds' }, ...finds.map(f => el('li', {}, el('b', {}, f.name), ` ${f.text}`)))
						: el('p', { className: 'muted' }, 'Nothing yet.'),
					el('p', { className: trip.anger ? 'down' : 'muted' }, trip.ledge >= C.encounters.findIndex(e => e.id === 'gate')
						? `The Giant is ${temper(trip, C)}.${trip.anger ? ' A failed risk makes him angrier.' : ''}`
						: 'Some options are risky. A failure sends your climber sliding back down.')),
			];
		},
		press(d, handlers) {
			if (d.climb) handlers.climb();
			if (d.option) handlers.ledge(Number(d.option));
		},
	};
}
