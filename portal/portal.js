import { validateEntry, entryHref, sortEntries } from './manifest.js';
import { installPage, fetchCount, formatCount } from '../shared/site.js';

installPage();

// Public GoatCounter counts: site visitors in the header, plays on each card.
const plays = new Map(); // slug -> views
const pathOf = g => new URL(entryHref(g), location.href).pathname;

async function showVisitors() {
	const total = await fetchCount();
	const out = document.getElementById('visitors');
	if (!total || !out) return;
	out.textContent = `👀 ${formatCount(total.unique, 'visitor')}`;
	out.hidden = false;
}

async function loadPlays(games) {
	await Promise.all(games.filter(g => g.path).map(async g => {
		const c = await fetchCount(pathOf(g));
		if (c) plays.set(g.slug, c.views);
	}));
	for (const span of grid.querySelectorAll('[data-plays]')) showPlays(span);
}

function showPlays(span) {
	const n = plays.get(span.dataset.plays);
	if (n === undefined) return;
	span.textContent = `▶ ${formatCount(n, 'play')}`;
	span.hidden = false;
}

const grid = document.getElementById('games');
const filters = document.getElementById('filters');
const errorEl = document.getElementById('error');

function el(tag, props = {}, ...children) {
	const node = Object.assign(document.createElement(tag), props);
	node.append(...children.filter(c => c !== null && c !== undefined));
	return node;
}

function card(g) {
	const external = !!g.url;
	const thumb = g.thumb
		? el('img', { src: g.thumb, alt: '', loading: 'lazy' })
		: el('div', { className: 'thumb-fallback', textContent: g.title.slice(0, 1) });
	return el('li', { className: 'card' },
		el('a', { href: entryHref(g), ...(external ? { target: '_blank', rel: 'noopener' } : {}) },
			el('div', { className: 'thumb' }, thumb),
			el('div', { className: 'body' },
				el('h2', { textContent: g.title }),
				el('p', { className: 'blurb', textContent: g.blurb }),
				el('div', { className: 'meta' },
					el('time', { dateTime: g.date, textContent: g.date }),
					...(g.tags ?? []).map(t => el('span', { className: 'tag', textContent: t })),
					external ? el('span', { className: 'ext', textContent: 'external ↗' }) : playsBadge(g),
				),
			),
		),
	);
}

function playsBadge(g) {
	const span = el('span', { className: 'plays', hidden: true });
	span.dataset.plays = g.slug;
	showPlays(span);
	return span;
}

function render(list, tag) {
	grid.replaceChildren(...list.filter(g => !tag || g.tags?.includes(tag)).map(card));
	for (const b of filters.children) b.classList.toggle('on', (b.dataset.tag || null) === tag);
}

async function main() {
	try {
		const res = await fetch('games.json', { cache: 'no-cache' });
		if (!res.ok) throw new Error(`games.json: HTTP ${res.status}`);
		const raw = await res.json();
		const games = sortEntries(raw.filter(g => {
			const errs = validateEntry(g);
			if (errs.length) console.warn(`games.json: skipping "${g.slug ?? '?'}":`, errs);
			return !errs.length;
		}));
		const tags = [...new Set(games.flatMap(g => g.tags ?? []))].sort();
		const button = (label, tag) => {
			const b = el('button', { type: 'button', textContent: label, onclick: () => render(games, tag) });
			if (tag) b.dataset.tag = tag;
			return b;
		};
		filters.replaceChildren(button('all', null), ...tags.map(t => button(t, t)));
		render(games, null);
		showVisitors();
		loadPlays(games);
	} catch (e) {
		errorEl.hidden = false;
		errorEl.textContent = `Couldn't load the game list (${e.message}).`;
	}
}

main();
