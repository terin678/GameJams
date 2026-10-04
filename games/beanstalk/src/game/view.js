// The text half of the screen: the status column, the tabs and their panels,
// the journal, and the cards that pop up (menu, time away, the ending).
//
// How it is put together:
// - Each tab is a panel in view/ (projects, neighbours, seeds, guard, climb,
//   exchange). A panel has no state on the page of its own: render(state)
//   builds what it should look like now, and press(...) turns a pressed button
//   into a call on the game.
// - update() draws the status column and the tab that is showing by morphing
//   the page to match (view/dom.js): buttons that are still wanted stay the
//   same nodes, so a press is never lost to a redraw.
// - Nothing here remembers what it drew last time, apart from the text cache
//   in dom.js. There is no "has this changed?" bookkeeping to get wrong.

import { formatNumber, formatHeight, formatDuration } from '../core/format.js';
import { nextTwist, endingLine } from '../core/runs.js';
import { createDom } from './view/dom.js';
import { createMoney } from './view/text.js';
import { createStatus } from './view/status.js';
import { createProjects } from './view/projects.js';
import { createNeighbours } from './view/neighbours.js';
import { createSeeds } from './view/seeds.js';
import { createGuard } from './view/guard.js';
import { createClimb } from './view/climb.js';
import { createExchange } from './view/exchange.js';

// How long a tab that has just appeared keeps its glow (the CSS animation's length).
const REVEAL_MS = 2400;

export function createView(doc, data, handlers) {
	const dom = createDom(doc);
	const { $, el, set, show, morph } = dom;
	const ui = { el, data, T: data.TUNING, money: createMoney() };
	// The tabs, in the order they open. A tab appears the first time `unlocked` is true.
	const panels = [createProjects, createNeighbours, createSeeds, createGuard, createClimb, createExchange].map(create => create(ui));
	const status = createStatus(dom, ui);
	let tab = panels[0].id;
	let ready = false;              // after the first update, a tab that appears is news
	const appeared = new Map();     // tab id -> when it first showed, for the glow

	// A handler is looked up when the button is pressed, not now, so the caller
	// can fill `handlers` in after the view exists.
	const on = (id, name, ...args) => $(id).addEventListener('click', () => handlers[name](...args));
	on('tend', 'tend');
	on('price-up', 'price', 1);
	on('price-down', 'price', -1);
	on('mute', 'mute');
	on('music', 'music');
	on('reset', 'reset');
	on('again', 'again');
	on('install', 'install');
	on('awake', 'awake');
	on('backdrop', 'backdrop');
	$('away-ok').addEventListener('click', () => show('away', false));
	$('open-menu').addEventListener('click', () => {
		show('menu', true);
		$('menu-close').focus();
	});
	$('menu-close').addEventListener('click', () => show('menu', false));
	$('menu').addEventListener('click', e => { if (e.target === $('menu')) show('menu', false); });
	for (const panel of panels) {
		$(panel.id).addEventListener('click', e => {
			const b = e.target.closest('button');
			if (b && !b.disabled) panel.press(b.dataset, handlers);
		});
	}
	$('tabs').addEventListener('click', e => {
		const b = e.target.closest('[data-tab]');
		if (!b) return;
		tab = b.dataset.tab;
		handlers.seen(`tab:${tab}`);
	});

	// The tab bar. A tab is flagged when it is new, or when something in it is waiting for you.
	function tabs(state) {
		const open = panels.filter(p => p.unlocked(state));
		const now = Date.now();
		morph($('tabs'), open.map(p => {
			if (!appeared.has(p.id)) appeared.set(p.id, ready ? now : -Infinity);
			const fresh = p.id !== tab && (p.wants?.(state) || (p.id !== 'projects' && !state.seen[`tab:${p.id}`]));
			const glow = now - appeared.get(p.id) < REVEAL_MS;
			const b = el('button', { type: 'button', className: [p.id === tab && 'on', fresh && 'fresh', glow && 'reveal'].filter(Boolean).join(' ') }, p.label);
			b.dataset.tab = p.id;
			b.setAttribute('aria-pressed', String(p.id === tab));
			return b;
		}));
		for (const p of panels) $(p.id).hidden = p.id !== tab;
	}

	return {
		// `rate` is beans grown per second, measured by the caller.
		update(state, rate) {
			ui.money.use(state);
			status(state, rate);
			tabs(state);
			const panel = panels.find(p => p.id === tab);
			morph($(panel.id), panel.render(state));
			morph($('log'), state.log.map(text => el('li', {}, text)));
			ready = true;
		},

		muted(on) {
			set('mute', `Sound: ${on ? 'off' : 'on'}`);
		},

		music(on) {
			set('music', `Music: ${on ? 'on' : 'off'}`);
		},

		// `can`: the browser has offered to install the game.
		installable(can) {
			show('install-box', can);
		},

		// `on` is null when this device can't keep the screen awake.
		awake(on) {
			show('awake-box', on !== null);
			set('awake', `Keep screen awake: ${on ? 'on' : 'off'}`);
		},

		backdrop(on) {
			set('backdrop', `Farm behind the page: ${on ? 'on' : 'off'}`);
		},

		closeMenu() {
			show('menu', false);
		},

		// Closes the menu or the time-away card if one is open. Returns whether it did.
		closeOverlay() {
			const open = ['menu', 'away'].find(id => !$(id).hidden);
			if (open) show(open, false);
			return !!open;
		},

		away(summary) {
			ui.money.use(summary.money);
			morph($('away-body'), [
				`You were gone for ${summary.capped ? 'more than ' : ''}${formatDuration(summary.seconds)}.`,
				`Without you the farm takes it easy: it got ${formatDuration(summary.worked)} of work done, over ${summary.days} days.`,
				`${formatNumber(summary.grown)} beans grown.`,
				`${ui.money.cash(summary.coins)} ${ui.money.name} earned.`,
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
			morph($('ending-body'), [stats,
				el('p', {}, 'There is nothing left to plant, and nowhere left to plant it.'),
				el('p', { className: 'gold' }, endingLine(state.golden, data.RUNS)),
				el('p', {}, 'Plant it again: the Golden Bean doubles your harvest and hurries everything along. ',
					twist ? el('b', {}, `Next run: ${twist.name}. `) : 'The valley has no new tricks left. ',
					twist ? twist.text : 'Every twist stays in play.')]);
			show('ending', true);
			$('again').focus();
		},
	};
}
