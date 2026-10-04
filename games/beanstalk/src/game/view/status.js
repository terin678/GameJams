// The status column: the big numbers, the farm, the market (or barn), and the
// Almanac and Beyond sections once the game reaches them.
//
// Nothing here may move a button the player is about to press: every line is
// always present, and sections that unlock later sit at the bottom of the
// column, so their arrival pushes nothing.

import { formatNumber, formatHeight, formatDuration } from '../../core/format.js';
import { counts, findWork } from '../../core/farm.js';
import { demand } from '../../core/market.js';
import { calendar, growthMult, seasonNote } from '../../core/seasons.js';
import { periodAt } from '../../core/sky.js';
import { twistsFor } from '../../core/runs.js';
import { eating } from '../../core/blight.js';
import { perSecond, pct } from './text.js';

export function createStatus({ $, set, show }, { data, T, money }) {
	let ready = false;   // after the first update, a section that appears is news
	// Shows a section that has just unlocked, with a glow the first time.
	const reveal = (id, on) => {
		if ($(id).hidden === !on) return;
		$(id).hidden = !on;
		if (on && ready) $(id).classList.add('reveal');
	};

	// `rate` is beans grown per second, measured by the caller.
	return function update(state, rate) {
		const { mods } = state;
		const cal = calendar(state.day, data.SEASONS, T.calendar);
		const weather = data.WEATHER.find(w => w.id === state.weather) ?? null;

		set('grown', formatNumber(state.grown));
		set('height', formatHeight(state.height));
		set('phase', data.PHASES.find(p => p.id === state.phase).name);
		set('rate', `${perSecond(rate)} beans a second`);
		const period = periodAt(state.dayT / T.calendar.daySeconds, data.SKY.periods);
		set('calendar', `${cal.season.name}, day ${cal.dayOfSeason} · year ${cal.year} · ${period} · ${weather?.name ?? 'Fair'}`);
		set('golden', state.golden > 0 ? `Run ${state.golden + 1} · Golden Beans: ${state.golden}` : '');
		$('golden').title = twistsFor(state.golden, data.RUNS).map(t => `${t.name}: ${t.text}`).join('\n');

		const c = counts(state.plots);
		const next = findWork(state.plots, state.tendAt);
		set('plots', `${c.ripe} ripe · ${c.growing} growing · ${c.empty} empty`);
		set('tend', next < 0 ? 'Growing...' : state.plots[next] === null ? 'Plant a bean' : 'Pick beans');
		$('tend').disabled = next < 0;
		const seconds = T.growSeconds / (mods.growth * growthMult(cal.season, weather, mods, state.rules.cold));
		// Breeding makes the yield fractional; show a decimal while it is small.
		const each = mods.yield < 100 ? String(Math.round(mods.yield * 10) / 10) : formatNumber(mods.yield);
		set('growing', `Each plant gives ${each} ${each === '1' ? 'bean' : 'beans'} and takes ${seconds.toFixed(1)}s`);
		set('season', seasonNote(cal.season, mods, state.rules.cold));
		// Each plot wants one visit per crop; say so when the helpers can't keep up.
		const wanted = state.plots.length / seconds;
		set('helpers', !mods.tend ? 'No helpers yet: it is all you'
			: `Helpers tend ${perSecond(mods.tend)} plots/sec${mods.tend < wanted ? ` (farm could use ${perSecond(wanted)})` : ''}`);

		set('coins', money.cash(state.coins));
		set('wallet-label', state.rate ? 'Beans' : 'Coins');
		set('market-title', state.rate ? 'Barn' : 'Market');
		for (const id of ['barn-row', 'price-row', 'demand']) show(id, !state.rate);
		set('beans', formatNumber(state.beans));
		set('price', state.price.toFixed(2));
		$('price-up').disabled = $('price-down').disabled = mods.autoprice;
		// A trickle reads better as "one every 40s" than as "0.0 a second".
		const buyRate = demand(state.price, mods.marketing, T.market);
		const selling = buyRate >= 0.1 ? `${perSecond(buyRate)} a second` : `one every ${formatDuration(1 / buyRate)}`;
		const levels = T.market.autoprice.levels;
		const pricer = levels[Math.min(mods.pricing, levels.length - 1)];
		set('demand', pricer ? `${pricer.name} · people buy ${selling}` : `At that price people buy ${selling}`);

		reveal('research', mods.pagesRate > 0 || state.pages > 0);
		set('pages', formatNumber(state.pages));
		set('pages-rate', `+${perSecond(mods.pagesRate)} a second`);
		reveal('space', state.probes > 0);
		set('probes', formatNumber(state.probes));
		set('matter', formatNumber(state.matter));
		show('blight-line', state.blight.open);
		if (state.blight.open) set('blight-line', `Blight: eating ${pct(eating(state, data.BLIGHT) * 60)}% a minute · ${Math.round(state.blight.share * 100)}% of the swarm on guard`);
		ready = true;
	};
}
