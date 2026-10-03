// The text half of the screen: numbers, buttons, projects and the journal.
// update() is called every frame and only touches the page when something changed.

import { formatNumber, formatMoney, formatHeight, formatDuration } from '../core/format.js';
import { counts } from '../core/farm.js';
import { demand } from '../core/market.js';
import { calendar, growthMult } from '../core/seasons.js';
import { available, affordable, costOf } from '../core/projects.js';

const LOG_SHOWN = 9;

// Currencies are named in the plural ("coins"); one of them drops the s.
const costText = cost => Object.entries(cost)
	.map(([c, v]) => `${formatNumber(v)} ${v === 1 ? c.replace(/s$/, '') : c}`).join(' + ');
const perSecond = n => (n < 10 ? n.toFixed(1) : formatNumber(n));

export function createView(doc, data, handlers) {
	const T = data.TUNING;
	const $ = id => doc.getElementById(id);
	const shown = new Map();
	const set = (id, text) => {
		if (shown.get(id) === text) return;
		shown.set(id, text);
		$(id).textContent = text;
	};
	const show = (id, on) => { $(id).hidden = !on; };

	$('tend').addEventListener('click', handlers.tend);
	$('price-up').addEventListener('click', () => handlers.price(1));
	$('price-down').addEventListener('click', () => handlers.price(-1));
	$('mute').addEventListener('click', handlers.mute);
	$('reset').addEventListener('click', handlers.reset);
	$('again').addEventListener('click', handlers.again);
	$('away-ok').addEventListener('click', () => show('away', false));
	$('projects').addEventListener('click', e => {
		const b = e.target.closest('[data-id]');
		if (b) handlers.buy(b.dataset.id);
	});

	function projects(state) {
		const list = available(state, data.PROJECTS).map(def => {
			const n = state.owned[def.id] ?? 0;
			return { def, n, cost: costText(costOf(def, n)), can: affordable(state, def) };
		});
		const sig = list.map(p => `${p.def.id}:${p.n}:${p.can}`).join('|');
		if (shown.get('projects') === sig) return;
		shown.set('projects', sig);
		// Keep keyboard focus on the same project across the rebuild.
		const focused = doc.activeElement?.dataset?.id;
		$('projects').replaceChildren(...list.map(({ def, n, cost, can }) => {
			const b = doc.createElement('button');
			b.type = 'button';
			b.dataset.id = def.id;
			b.disabled = !can;
			const title = doc.createElement('b');
			title.textContent = def.title;
			const price = doc.createElement('span');
			price.className = 'cost';
			price.textContent = ` (${cost})`;
			const count = (def.max ?? 1) > 1 ? ` ${n}/${def.max}` : '';
			const flavor = doc.createElement('small');
			flavor.textContent = def.flavor;
			b.append(title, price, count, flavor);
			return b;
		}));
		if (focused) $('projects').querySelector(`[data-id="${focused}"]`)?.focus();
	}

	function journal(state) {
		const sig = `${state.log.length}:${state.log[0]}`;
		if (shown.get('log') === sig) return;
		shown.set('log', sig);
		$('log').replaceChildren(...state.log.slice(0, LOG_SHOWN).map(text => {
			const li = doc.createElement('li');
			li.textContent = text;
			return li;
		}));
	}

	const lines = (id, rows) => $(id).replaceChildren(...rows.map(text => {
		const p = doc.createElement('p');
		p.textContent = text;
		return p;
	}));

	return {
		// `rate` is beans grown per second, measured by the caller.
		update(state, rate) {
			const { mods } = state;
			const cal = calendar(state.day, data.SEASONS, T.calendar);
			const weather = data.WEATHER.find(w => w.id === state.weather) ?? null;
			const phase = data.PHASES.find(p => p.id === state.phase);

			set('grown', formatNumber(state.grown));
			set('height', formatHeight(state.height));
			set('phase', phase.name);
			set('rate', rate > 0 ? `${perSecond(rate)} beans a second` : '');
			set('calendar', `${cal.season.name}, day ${cal.dayOfSeason} · year ${cal.year} · ${weather?.name ?? 'Fair'}`);
			show('golden', state.golden > 0);
			set('golden', `Golden Beans: ${state.golden}`);

			const c = counts(state.plots);
			set('plots', `${c.ripe} ripe · ${c.growing} growing · ${c.empty} empty`);
			set('tend', c.ripe ? 'Pick beans' : c.empty ? 'Plant a bean' : 'Growing...');
			$('tend').disabled = !c.ripe && !c.empty;
			const seconds = T.growSeconds / (mods.growth * growthMult(cal.season, weather, mods));
			set('growing', `Each plant gives ${formatNumber(mods.yield)} ${mods.yield === 1 ? 'bean' : 'beans'} and takes ${seconds.toFixed(1)}s`);
			show('helpers', mods.tend > 0);
			set('helpers', `Helpers tend ${perSecond(mods.tend)} plots a second`);

			set('coins', formatMoney(state.coins));
			set('beans', formatNumber(state.beans));
			set('price', state.price.toFixed(2));
			set('pricing', mods.autoprice ? 'set by the accountant' : '');
			$('price-up').disabled = $('price-down').disabled = mods.autoprice;
			set('demand', `At that price people buy ${perSecond(demand(state.price, mods.marketing, T.market))} beans a second`);

			show('research', mods.pagesRate > 0 || state.pages > 0);
			set('pages', formatNumber(state.pages));
			set('pages-rate', `+${perSecond(mods.pagesRate)} a second`);
			show('space', state.probes > 0);
			set('probes', formatNumber(state.probes));
			set('matter', formatNumber(state.matter));

			projects(state);
			journal(state);
		},

		muted(on) {
			set('mute', `Sound: ${on ? 'off' : 'on'}`);
		},

		away(summary) {
			lines('away-body', [
				`You were gone for ${summary.capped ? 'more than ' : ''}${formatDuration(summary.seconds)}.`,
				`Without you the farm takes it easy: it got ${formatDuration(summary.worked)} of work done, over ${summary.days} days.`,
				`${formatNumber(summary.grown)} beans grown.`,
				`${formatMoney(summary.coins)} coins earned.`,
			]);
			show('away', true);
			$('away-ok').focus();
		},

		ending(state) {
			if (!state) return show('ending', false);
			lines('ending-body', [
				`${formatNumber(state.grown)} beans. A stalk ${formatHeight(state.height)} tall.`,
				`It took ${state.day} days, or ${formatDuration(state.time)} of yours.`,
				'There is nothing left to plant, and nowhere left to plant it.',
				'You still have the first bean in your pocket. It has turned to gold.',
			]);
			show('ending', true);
			$('again').focus();
		},
	};
}
