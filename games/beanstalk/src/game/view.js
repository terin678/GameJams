// The text half of the screen: numbers, buttons, projects and the journal.
// update() is called every frame and only touches the page when something changed.
// Every line in the status column is always present (locked sections are dimmed,
// not hidden), so nothing moves when something new unlocks.

import { formatNumber, formatMoney, formatHeight, formatDuration } from '../core/format.js';
import { counts, findWork } from '../core/farm.js';
import { demand } from '../core/market.js';
import { calendar, growthMult, seasonNote } from '../core/seasons.js';
import { available, affordable, costOf } from '../core/projects.js';

// After the project list changes shape, clicks on it are ignored for a moment,
// so a button that slid under the pointer isn't bought by accident.
const GUARD_MS = 350;

// Currencies are named in the plural ("coins"); one of them drops the s.
const costText = cost => Object.entries(cost)
	.map(([c, v]) => `${formatNumber(v)} ${v === 1 ? c.replace(/s$/, '') : c}`).join(' + ');
const perSecond = n => (n < 10 ? n.toFixed(1) : formatNumber(n));
const repeatable = def => (def.max ?? 1) > 1;

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
	const lock = (id, locked) => $(id).classList.toggle('locked', locked);
	let guardUntil = 0;

	$('tend').addEventListener('click', handlers.tend);
	$('price-up').addEventListener('click', () => handlers.price(1));
	$('price-down').addEventListener('click', () => handlers.price(-1));
	$('mute').addEventListener('click', handlers.mute);
	$('music').addEventListener('click', handlers.music);
	$('reset').addEventListener('click', handlers.reset);
	$('again').addEventListener('click', handlers.again);
	$('away-ok').addEventListener('click', () => show('away', false));
	$('projects').addEventListener('click', e => {
		const b = e.target.closest('[data-id]');
		if (b && Date.now() >= guardUntil) handlers.buy(b.dataset.id);
	});

	function projectButton({ def, n, cost, can }) {
		const b = doc.createElement('button');
		b.type = 'button';
		b.dataset.id = def.id;
		b.disabled = !can;
		const title = doc.createElement('b');
		title.textContent = def.title;
		const price = doc.createElement('span');
		price.className = 'cost';
		price.textContent = ` (${cost})`;
		const flavor = doc.createElement('small');
		flavor.textContent = def.flavor;
		b.append(title, price, repeatable(def) ? ` ${n}/${def.max}` : '', flavor);
		return b;
	}

	const heading = text => {
		const h = doc.createElement('h3');
		h.textContent = text;
		return h;
	};

	// Things you buy many of stay put at the top; one-off projects come and go below.
	function projects(state) {
		const list = available(state, data.PROJECTS).map(def => {
			const n = state.owned[def.id] ?? 0;
			return { def, n, cost: costText(costOf(def, n)), can: affordable(state, def) };
		});
		const sig = list.map(p => `${p.def.id}:${p.n}:${p.can}`).join('|');
		if (shown.get('projects') === sig) return;
		shown.set('projects', sig);
		const members = list.map(p => p.def.id).join('|');
		if (shown.get('members') !== members) {
			if (shown.has('members')) guardUntil = Date.now() + GUARD_MS;
			shown.set('members', members);
		}
		const more = list.filter(p => repeatable(p.def));
		const once = list.filter(p => !repeatable(p.def));
		// Keep keyboard focus and the scroll position across the rebuild.
		const focused = doc.activeElement?.dataset?.id;
		const scroll = $('projects').scrollTop;
		$('projects').replaceChildren(
			...(more.length ? [heading('Buy more'), ...more.map(projectButton)] : []),
			...(once.length ? [heading('One-off'), ...once.map(projectButton)] : []),
			...(list.length ? [] : [heading('Nothing to buy yet. Grow some beans.')]),
		);
		$('projects').scrollTop = scroll;
		if (focused) $('projects').querySelector(`[data-id="${focused}"]`)?.focus();
	}

	function journal(state) {
		const sig = `${state.log.length}:${state.log[0]}`;
		if (shown.get('log') === sig) return;
		shown.set('log', sig);
		$('log').replaceChildren(...state.log.map(text => {
			const li = doc.createElement('li');
			li.textContent = text;
			return li;
		}));
		$('log').scrollTop = 0;
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
			set('rate', `${perSecond(rate)} beans a second`);
			set('calendar', `${cal.season.name}, day ${cal.dayOfSeason} · year ${cal.year} · ${weather?.name ?? 'Fair'}`);
			set('golden', state.golden > 0 ? `Golden Beans: ${state.golden}` : '');

			const c = counts(state.plots);
			const next = findWork(state.plots, state.tendAt);
			set('plots', `${c.ripe} ripe · ${c.growing} growing · ${c.empty} empty`);
			set('tend', next < 0 ? 'Growing...' : state.plots[next] === null ? 'Plant a bean' : 'Pick beans');
			$('tend').disabled = next < 0;
			const seconds = T.growSeconds / (mods.growth * growthMult(cal.season, weather, mods));
			set('growing', `Each plant gives ${formatNumber(mods.yield)} ${mods.yield === 1 ? 'bean' : 'beans'} and takes ${seconds.toFixed(1)}s`);
			set('season', seasonNote(cal.season, mods));
			// Each plot wants one visit per crop; say so when the helpers can't keep up.
			const wanted = state.plots.length / seconds;
			set('helpers', !mods.tend ? 'No helpers yet: it is all you'
				: `Helpers tend ${perSecond(mods.tend)} plots/sec${mods.tend < wanted ? ` (farm could use ${perSecond(wanted)})` : ''}`);

			set('coins', formatMoney(state.coins));
			set('beans', formatNumber(state.beans));
			set('price', state.price.toFixed(2));
			$('price-up').disabled = $('price-down').disabled = mods.autoprice;
			// A trickle reads better as "one every 40s" than as "0.0 a second".
			const buyRate = demand(state.price, mods.marketing, T.market);
			const selling = buyRate >= 0.1 ? `${perSecond(buyRate)} a second` : `one every ${formatDuration(1 / buyRate)}`;
			set('demand', mods.autoprice ? `Accountant's price · people buy ${selling}` : `At that price people buy ${selling}`);

			const research = mods.pagesRate > 0 || state.pages > 0;
			lock('research', !research);
			set('pages', research ? formatNumber(state.pages) : '—');
			set('pages-rate', research ? `+${perSecond(mods.pagesRate)} a second` : '');
			const space = state.probes > 0;
			lock('space', !space);
			set('probes', space ? formatNumber(state.probes) : '—');
			set('matter', space ? formatNumber(state.matter) : '—');

			projects(state);
			journal(state);
		},

		muted(on) {
			set('mute', `Sound: ${on ? 'off' : 'on'}`);
		},

		music(on) {
			set('music', `Music: ${on ? 'on' : 'off'}`);
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
			const stats = doc.createElement('dl');
			stats.className = 'stats';
			stats.append(...[
				['Beans grown', formatNumber(state.grown)],
				['Stalk', formatHeight(state.height)],
				['Farm days', formatNumber(state.day)],
				['Your time', formatDuration(state.time)],
			].map(([label, value]) => {
				const box = doc.createElement('div');
				const dt = doc.createElement('dt');
				dt.textContent = label;
				const dd = doc.createElement('dd');
				dd.textContent = value;
				box.append(dt, dd);
				return box;
			}));
			const say = (text, cls = '') => {
				const p = doc.createElement('p');
				p.textContent = text;
				p.className = cls;
				return p;
			};
			$('ending-body').replaceChildren(stats,
				say('There is nothing left to plant, and nowhere left to plant it.'),
				say('The first bean is still in your pocket. It has turned to gold.', 'gold'));
			show('ending', true);
			$('again').focus();
		},
	};
}
