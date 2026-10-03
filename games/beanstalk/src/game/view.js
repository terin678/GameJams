// The text half of the screen: numbers, buttons, tabs and the journal.
// update() is called every frame and only touches the page when something changed.
//
// Nothing here may move a button the player is about to press:
// - lines in the status column are always present;
// - sections that unlock later (Almanac, Beyond) are hidden until then, and
//   sit at the bottom of their column so their arrival pushes nothing;
// - lists live in fixed-height panels that scroll.

import { formatNumber, formatMoney, formatHeight, formatDuration } from '../core/format.js';
import { counts, findWork } from '../core/farm.js';
import { demand } from '../core/market.js';
import { calendar, growthMult, seasonNote } from '../core/seasons.js';
import { periodAt } from '../core/sky.js';
import { nextTwist, twistsFor, endingLine } from '../core/runs.js';
import { available, affordable, costOf } from '../core/projects.js';
import { crossCost, canCross, growingFor, fairTrait, fairBar, ribbonCount, luckOf } from '../core/seeds.js';
import { heartsOf, heartProgress, giftsFor, giftCost, canGive, waitFor, nextPerk } from '../core/neighbours.js';

// After the project list changes shape, clicks on it are ignored for a moment,
// so a button that slid under the pointer isn't bought by accident.
const GUARD_MS = 350;

// The panels of the right-hand column. A tab appears the first time `unlocked` is true.
const TABS = [
	{ id: 'projects', label: 'Projects', unlocked: () => true },
	{ id: 'neighbours', label: 'Neighbours', unlocked: state => Object.keys(state.friends).length > 0 },
	{ id: 'seeds', label: 'Seeds', unlocked: state => state.seeds.open },
];
const REACTION_MARK = { love: '♥', like: '+', neutral: '·', dislike: '×' };

// Currencies are named in the plural ("coins"); one of them drops the s.
const costText = cost => Object.entries(cost)
	.map(([c, v]) => `${formatNumber(v)} ${v === 1 ? c.replace(/s$/, '') : c}`).join(' + ');
const perSecond = n => (n < 10 ? n.toFixed(1) : formatNumber(n));
const repeatable = def => (def.max ?? 1) > 1;

export function createView(doc, data, handlers) {
	const T = data.TUNING;
	const $ = id => doc.getElementById(id);
	const el = (tag, props = {}, ...children) => {
		const node = Object.assign(doc.createElement(tag), props);
		node.append(...children);
		return node;
	};
	const shown = new Map();
	const set = (id, text) => {
		if (shown.get(id) === text) return;
		shown.set(id, text);
		$(id).textContent = text;
	};
	const show = (id, on) => { $(id).hidden = !on; };
	// Shows a section that has just unlocked, with a glow the first time.
	const reveal = (id, on) => {
		if ($(id).hidden === !on) return;
		$(id).hidden = !on;
		if (on && shown.get('ready')) $(id).classList.add('reveal');
	};
	let guardUntil = 0;
	let tab = 'projects';

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
	$('neighbours').addEventListener('click', e => {
		const b = e.target.closest('[data-gift]');
		if (b) handlers.gift(b.dataset.friend, b.dataset.gift);
	});
	$('seeds').addEventListener('click', e => {
		const b = e.target.closest('button');
		if (!b) return;
		if (b.dataset.cross) handlers.cross();
		if (b.dataset.seedling) handlers.seedling(Number(b.dataset.seedling));
	});
	$('tabs').addEventListener('click', e => {
		const b = e.target.closest('[data-tab]');
		if (!b) return;
		tab = b.dataset.tab;
		handlers.seen(`tab:${tab}`);
	});

	function tabs(state) {
		const open = TABS.filter(t => t.unlocked(state));
		const sig = open.map(t => `${t.id}:${!!state.seen[`tab:${t.id}`]}`).join('|') + tab;
		if (shown.get('tabs') === sig) return;
		const known = shown.get('tabIds') ?? '';
		shown.set('tabs', sig);
		shown.set('tabIds', open.map(t => t.id).join('|'));
		$('tabs').replaceChildren(...open.map(t => {
			const fresh = t.id !== 'projects' && t.id !== tab && !state.seen[`tab:${t.id}`];
			const b = el('button', { type: 'button', className: `${t.id === tab ? 'on' : ''} ${fresh ? 'fresh' : ''}` }, t.label);
			b.dataset.tab = t.id;
			b.setAttribute('aria-pressed', String(t.id === tab));
			if (shown.get('ready') && !known.includes(t.id)) b.classList.add('reveal');
			return b;
		}));
		for (const t of TABS) $(t.id).hidden = t.id !== tab;
	}

	function projectButton({ def, n, cost, can }) {
		const b = el('button', { type: 'button', disabled: !can },
			el('b', {}, def.title),
			el('span', { className: 'cost' }, ` (${cost})`),
			repeatable(def) ? ` ${n}/${def.max}` : '',
			el('small', {}, def.flavor));
		b.dataset.id = def.id;
		return b;
	}

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
			...(more.length ? [el('h3', {}, 'Buy more'), ...more.map(projectButton)] : []),
			...(once.length ? [el('h3', {}, 'One-off'), ...once.map(projectButton)] : []),
			...(list.length ? [] : [el('h3', {}, 'Nothing to buy yet. Grow some beans.')]),
		);
		$('projects').scrollTop = scroll;
		if (focused) $('projects').querySelector(`[data-id="${focused}"]`)?.focus();
	}

	// One card per neighbour you've met: hearts, what the next heart brings, and
	// the gifts you can give. A gift shows how they took it once you've tried it.
	function neighbours(state) {
		const F = T.friends;
		const gifts = giftsFor(state, data.GIFTS);
		const cards = data.NEIGHBOURS.filter(n => state.friends[n.id]).map(def => {
			const friend = state.friends[def.id];
			const hearts = heartsOf(friend.points, F);
			return {
				def, friend, hearts,
				wait: Math.ceil(waitFor(state, def)),
				gifts: gifts.map(g => ({ g, cost: costText(giftCost(g, hearts, F)), can: canGive(state, def, g, F) })),
			};
		});
		const sig = cards.map(c => `${c.def.id}:${c.friend.points}:${c.wait}:${c.gifts.map(x => `${x.g.id}${x.can ? 1 : 0}`).join('')}`).join('|');
		if (shown.get('neighbours') === sig) return;
		shown.set('neighbours', sig);
		const focused = doc.activeElement?.dataset?.gift && [doc.activeElement.dataset.friend, doc.activeElement.dataset.gift];
		const scroll = $('neighbours').scrollTop;
		$('neighbours').replaceChildren(...cards.map(({ def, friend, hearts, wait, gifts: list }) => {
			const perk = nextPerk(def, hearts);
			const full = hearts >= F.maxHearts;
			const status = full ? 'Best of friends.' : wait > 0 ? `Come back in ${wait}s.` : 'Would welcome a gift.';
			// A heart takes more than one gift, so show how full the next one is.
			const pct = Math.round(heartProgress(friend.points, F) * 100);
			const fill = el('i');
			fill.style.width = `${pct}%`;
			const share = Math.round((friend.gained ?? 0) / F.pointsPerHeart * 100);
			const gained = `${share < 0 ? '' : '+'}${share}%`;
			const progress = full ? '' : `Next heart: ${pct}%${friend.said ? ` (last gift ${gained})` : ''}`;
			return el('div', { className: 'friend' },
				el('div', { className: 'who' },
					el('b', {}, def.name), el('span', { className: 'muted' }, ` ${def.role}`),
					el('span', { className: 'hearts', title: `${hearts} of ${F.maxHearts} hearts` },
						'♥'.repeat(hearts), el('i', {}, '♥'.repeat(F.maxHearts - hearts)))),
				el('div', { className: 'bar', title: progress }, fill),
				el('p', { className: 'said' }, friend.said || status),
				el('p', { className: 'muted' }, perk ? `At ${perk.hearts} hearts: ${perk.text}` : 'Every perk earned.'),
				el('div', { className: 'gifts' }, ...list.map(({ g, cost, can }) => {
					const known = friend.known[g.id];
					const b = el('button', { type: 'button', disabled: !can, className: known ?? 'unknown' },
						el('span', { className: 'mark' }, known ? REACTION_MARK[known] : '?'), ` ${g.name} `,
						el('span', { className: 'cost' }, `(${cost})`));
					b.title = known ? `${def.name}: ${known}` : 'Not tried yet';
					b.dataset.friend = def.id;
					b.dataset.gift = g.id;
					return b;
				})),
				el('p', { className: 'muted' }, [friend.said ? status : '', progress].filter(Boolean).join(' · ')));
		}));
		$('neighbours').scrollTop = scroll;
		if (focused) $('neighbours').querySelector(`[data-friend="${focused[0]}"][data-gift="${focused[1]}"]`)?.focus();
	}

	// The seed line, the cross in progress (or its seedlings to choose from), and the fair.
	function seeds(state, year) {
		const S = data.SEEDS;
		const { seeds: line } = state;
		const growing = growingFor(state);
		const ready = growing === 0;
		const can = canCross(state, S);
		const sig = [JSON.stringify(line.traits), line.generation, growing === null ? 'idle' : Math.ceil(growing), can,
			ribbonCount(line), line.judged, year].join('|');
		if (shown.get('seeds') === sig) return;
		shown.set('seeds', sig);
		const focused = doc.activeElement?.dataset?.seedling ?? (doc.activeElement?.dataset?.cross ? 'cross' : null);

		const traits = S.traits.map(t => {
			const level = line.traits[t.id];
			const fill = el('i');
			fill.style.width = `${level / S.maxLevel * 100}%`;
			return el('div', { className: 'trait' },
				el('span', {}, el('b', {}, t.name), ` ${level}`),
				el('div', { className: 'bar' }, fill),
				el('span', { className: 'muted' }, `x${(t.per ** level).toFixed(2)} ${t.blurb}`));
		});

		let work;
		if (growing === null) {
			const b = el('button', { type: 'button', disabled: !can }, 'Cross seeds ',
				el('span', { className: 'gold' }, `(${costText(crossCost(line, S))})`));
			b.dataset.cross = '1';
			work = [b, el('p', { className: 'muted' }, 'Grows out three seedlings, each better at one thing. Keep one, or none.')];
		} else if (!ready) {
			work = [el('p', {}, `Seedlings are growing out... ${Math.ceil(growing)}s`)];
		} else {
			const pick = (index, ...children) => {
				const b = el('button', { type: 'button' }, ...children);
				b.dataset.seedling = String(index);
				return b;
			};
			work = [el('p', {}, 'The seedlings are ready. Which one becomes your line?'),
				el('div', { className: 'seedlings' },
					...line.pending.options.map((option, i) => pick(i, ...S.traits.flatMap((t, k) => {
						const change = option[t.id] - line.traits[t.id];
						const delta = change ? el('span', { className: change > 0 ? 'up' : 'down' }, ` (${change > 0 ? '+' : ''}${change})`) : '';
						return [k ? ' · ' : '', `${t.name} ${option[t.id]}`, delta];
					}))),
					pick(-1, 'Keep the old line'))];
		}

		const fairYear = line.judged >= year ? year + 1 : year;
		const judged = fairTrait(fairYear, S);
		const bar = fairBar(line, judged.id, S, state.rules.fairBar);
		const have = line.traits[judged.id];
		const ribbons = ribbonCount(line);
		const last = line.result;
		const lastTrait = last && S.traits.find(t => t.id === last.trait);
		const fairSeason = data.SEASONS.find(s => s.id === S.fair.season).name.toLowerCase();

		$('seeds').replaceChildren(
			el('div', { className: 'box' }, el('h3', {}, `Your seed line · generation ${line.generation}`), ...traits),
			el('div', { className: 'box' }, el('h3', {}, 'Breeding'), ...work),
			el('div', { className: 'box' }, el('h3', {}, 'County fair'),
				el('p', {}, `${fairYear === year ? 'This' : 'Next'} ${fairSeason}: ${judged.fair}. The judges want ${judged.name} ${bar}; yours is ${have}. `,
					el('span', { className: have >= bar ? 'up' : 'down' }, have >= bar ? 'Good enough to win.' : `${bar - have} to go.`)),
				el('p', { className: 'muted' }, last
					? `Last fair, ${lastTrait.fair}: ${last.won ? 'first prize' : `second place (needed ${last.bar}, had ${last.level})`}.`
					: 'A different class is judged each year.'),
				el('p', {}, el('span', { className: 'gold' }, `Ribbons: ${ribbons}`),
					el('span', { className: 'muted' }, ribbons
						? ` · demand x${(S.fair.ribbonEffect.marketing ** ribbons).toFixed(2)} · crosses ${Math.round(luckOf(line, S) * 100)}% lucky`
						: ' · each one lifts demand and makes crosses luckier'))));
		const again = focused === 'cross' ? '[data-cross]' : focused ? `[data-seedling="${focused}"]` : null;
		if (again) $('seeds').querySelector(again)?.focus();
	}

	function journal(state) {
		const sig = `${state.log.length}:${state.log[0]}`;
		if (shown.get('log') === sig) return;
		shown.set('log', sig);
		$('log').replaceChildren(...state.log.map(text => el('li', {}, text)));
		$('log').scrollTop = 0;
	}

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

			set('coins', formatMoney(state.coins));
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

			tabs(state);
			if (tab === 'projects') projects(state);
			if (tab === 'neighbours') neighbours(state);
			if (tab === 'seeds') seeds(state, cal.year);
			journal(state);
			shown.set('ready', true);   // from now on, anything that appears is news
		},

		muted(on) {
			set('mute', `Sound: ${on ? 'off' : 'on'}`);
		},

		music(on) {
			set('music', `Music: ${on ? 'on' : 'off'}`);
		},

		away(summary) {
			$('away-body').replaceChildren(...[
				`You were gone for ${summary.capped ? 'more than ' : ''}${formatDuration(summary.seconds)}.`,
				`Without you the farm takes it easy: it got ${formatDuration(summary.worked)} of work done, over ${summary.days} days.`,
				`${formatNumber(summary.grown)} beans grown.`,
				`${formatMoney(summary.coins)} coins earned.`,
			].map(text => el('p', {}, text)));
			show('away', true);
			$('away-ok').focus();
		},

		ending(state) {
			if (!state) return show('ending', false);
			const stats = el('dl', { className: 'stats' }, ...[
				['Beans grown', formatNumber(state.grown)],
				['Stalk', formatHeight(state.height)],
				['Farm days', formatNumber(state.day)],
				['Your time', formatDuration(state.time)],
			].map(([label, value]) => el('div', {}, el('dt', {}, label), el('dd', {}, value))));
			const twist = nextTwist(state.golden, data.RUNS);
			$('ending-title').textContent = state.golden > 0 ? `Every atom is bean. Again. (Run ${state.golden + 1})` : 'Every atom is bean.';
			$('ending-body').replaceChildren(stats,
				el('p', {}, 'There is nothing left to plant, and nowhere left to plant it.'),
				el('p', { className: 'gold' }, endingLine(state.golden, data.RUNS)),
				el('p', {}, 'Plant it again: the Golden Bean doubles your harvest and hurries everything along. ',
					twist ? el('b', {}, `Next run: ${twist.name}. `) : 'The valley has no new tricks left. ',
					twist ? twist.text : 'Every twist stays in play.'));
			show('ending', true);
			$('again').focus();
		},
	};
}
