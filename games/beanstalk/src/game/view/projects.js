// The Projects tab: things you buy many of stay put at the top; one-off
// projects come and go below.

import { available, affordable, costOf } from '../../core/projects.js';

// After the list changes shape, presses on it are ignored for a moment, so a
// button that slid under the pointer isn't bought by accident.
const GUARD_MS = 350;
const repeatable = def => (def.max ?? 1) > 1;

export function createProjects({ el, data, money }) {
	let members = null;
	let guardUntil = 0;

	function button(state, def) {
		const n = state.owned[def.id] ?? 0;
		const b = el('button', { type: 'button', disabled: !affordable(state, def) },
			el('b', {}, def.title),
			el('span', { className: 'cost' }, ` (${money.costText(costOf(def, n))})`),
			repeatable(def) ? ` ${n}/${def.max}` : '',
			el('small', {}, def.flavor));
		b.dataset.id = def.id;
		return b;
	}

	return {
		id: 'projects',
		label: 'Projects',
		unlocked: () => true,
		render(state) {
			const list = available(state, data.PROJECTS);
			const now = list.map(def => def.id).join('|');
			if (members !== now) {
				if (members !== null) guardUntil = Date.now() + GUARD_MS;
				members = now;
			}
			const more = list.filter(repeatable);
			const once = list.filter(def => !repeatable(def));
			return [
				...(more.length ? [el('h3', {}, 'Buy more'), ...more.map(def => button(state, def))] : []),
				...(once.length ? [el('h3', {}, 'One-off'), ...once.map(def => button(state, def))] : []),
				...(list.length ? [] : [el('h3', {}, 'Nothing to buy yet. Grow some beans.')]),
			];
		},
		press(d, handlers) {
			if (d.id && Date.now() >= guardUntil) handlers.buy(d.id);
		},
	};
}
