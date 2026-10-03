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
import { nextEncounter, climbBlocked, climbingFor, optionBlocked, findsOf, temper } from '../core/climb.js';
import { raidIn, postsUsed, postCost, trainCost, defendersFor, ranksEarned, nextRank, hasDrill, needsAttention, waveText } from '../core/guard.js';
import { valueOf, averageCost } from '../core/exchange.js';
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
	{ id: 'seeds', label: 'Seeds', unlocked: state => state.seeds.open, wants: state => growingFor(state) === 0 },
	{ id: 'guard', label: 'Guard', unlocked: state => state.guard.open, wants: (state, data) => needsAttention(state, data.GUARD) },
	{ id: 'climb', label: 'Climb', unlocked: state => state.climb.open, wants: state => state.climb.waiting },
	{ id: 'exchange', label: 'Exchange', unlocked: state => state.exchange.open },
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
	$('open-menu').addEventListener('click', () => {
		$('save-code').value = handlers.saveCode();
		set('save-note', ' ');
		show('menu', true);
		$('menu-close').focus();
	});
	$('menu-close').addEventListener('click', () => show('menu', false));
	$('menu').addEventListener('click', e => { if (e.target === $('menu')) show('menu', false); });
	$('install').addEventListener('click', handlers.install);
	$('awake').addEventListener('click', handlers.awake);
	$('backdrop').addEventListener('click', handlers.backdrop);
	$('save-copy').addEventListener('click', async () => {
		$('save-code').value = handlers.saveCode();
		$('save-code').select();
		try {
			await navigator.clipboard.writeText($('save-code').value);
			set('save-note', 'Copied. Paste it into the Menu on your other device.');
		} catch (e) {
			set('save-note', 'Select the text above and copy it.');
		}
	});
	$('save-load').addEventListener('click', () => {
		const loaded = handlers.loadCode($('save-code').value);
		set('save-note', loaded ? 'Loaded. Welcome back.' : 'That is not a Beanstalk save code.');
		if (loaded) show('menu', false);
	});
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
	$('climb').addEventListener('click', e => {
		const b = e.target.closest('button');
		if (!b) return;
		if (b.dataset.climb) handlers.climb();
		if (b.dataset.option) handlers.ledge(Number(b.dataset.option));
	});
	$('exchange').addEventListener('click', e => {
		const b = e.target.closest('button');
		if (b?.dataset.buy) handlers.trade('buy', Number(b.dataset.buy));
		if (b?.dataset.sell) handlers.trade('sell', Number(b.dataset.sell));
	});
	$('guard').addEventListener('click', e => {
		const b = e.target.closest('button');
		if (!b) return;
		if (b.dataset.post) handlers.post(b.dataset.post, Number(b.dataset.delta));
		if (b.dataset.build) handlers.build();
		if (b.dataset.train) handlers.train(b.dataset.train);
	});
	$('tabs').addEventListener('click', e => {
		const b = e.target.closest('[data-tab]');
		if (!b) return;
		tab = b.dataset.tab;
		handlers.seen(`tab:${tab}`);
	});

	function tabs(state) {
		const open = TABS.filter(t => t.unlocked(state));
		const sig = open.map(t => `${t.id}:${!!state.seen[`tab:${t.id}`]}:${!!t.wants?.(state, data)}`).join('|') + tab;
		if (shown.get('tabs') === sig) return;
		const known = shown.get('tabIds') ?? '';
		shown.set('tabs', sig);
		shown.set('tabIds', open.map(t => t.id).join('|'));
		$('tabs').replaceChildren(...open.map(t => {
			const fresh = t.id !== tab && (t.wants?.(state, data) || (t.id !== 'projects' && !state.seen[`tab:${t.id}`]));
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

	// The Climb: where the climber is, the choice in front of them, and what they have brought home.
	function climb(state) {
		const C = data.CLIMB;
		const { climb: trip } = state;
		const enc = nextEncounter(state, C);
		const left = climbingFor(state);
		const blocked = climbBlocked(state, C);
		const options = trip.waiting ? enc.options.map(o => optionBlocked(state, o, T.friends)) : [];
		const sig = [trip.ledge, trip.waiting, left === null ? '' : Math.ceil(left), blocked, options.join(','), trip.finds.length,
			trip.anger, trip.said, blocked === 'short' ? formatHeight(state.height) : ''].join('|');
		if (shown.get('climb') === sig) return;
		shown.set('climb', sig);
		const focused = doc.activeElement?.dataset?.option ?? (doc.activeElement?.dataset?.climb ? 'climb' : null);

		let now;
		if (!enc) {
			now = [el('p', { className: 'story' }, 'There is nothing above you now but stars. You have seen all of it.')];
		} else if (trip.waiting) {
			now = [el('h3', {}, enc.name), el('p', { className: 'story' }, enc.text),
				el('div', { className: 'seedlings' }, ...enc.options.map((o, i) => {
					const why = options[i];
					const risk = o.chance !== undefined && o.chance < 1 ? ` · risky (${Math.round(o.chance * 100)}%)` : '';
					const b = el('button', { type: 'button', disabled: !!why },
						el('b', {}, o.label),
						o.cost ? el('span', { className: 'gold' }, ` (${costText(o.cost)})`) : '',
						risk,
						why === 'needs' ? el('small', { className: 'muted' }, o.needsText) : '');
					b.dataset.option = String(i);
					return b;
				}))];
		} else if (left !== null) {
			now = [el('h3', {}, enc.name), el('p', {}, `Your climber is on the way up... ${Math.ceil(left)}s`)];
		} else {
			const b = el('button', { type: 'button', disabled: !!blocked }, `Climb to ${enc.name.replace(/^The /, 'the ')} `,
				el('span', { className: 'gold' }, `(provisions: ${costText(enc.provisions)})`));
			b.dataset.climb = '1';
			now = [el('h3', {}, `Next: ${enc.name}, at ${formatHeight(enc.height)}`), b,
				el('p', { className: 'muted' }, blocked === 'short'
					? `The stalk is ${formatHeight(state.height)} tall. It has to reach the ledge first.`
					: `About ${C.seconds} seconds up. There will be a choice to make at the top.`)];
		}

		const finds = findsOf(trip, C);
		$('climb').replaceChildren(
			el('div', { className: 'box' }, ...now, trip.said ? el('p', { className: 'said' }, trip.said) : ''),
			el('div', { className: 'box' }, el('h3', {}, `Brought home · ledge ${trip.ledge} of ${C.encounters.length}`),
				finds.length
					? el('ul', { className: 'finds' }, ...finds.map(f => el('li', {}, el('b', {}, f.name), ` ${f.text}`)))
					: el('p', { className: 'muted' }, 'Nothing yet.'),
				el('p', { className: trip.anger ? 'down' : 'muted' }, trip.ledge >= C.encounters.findIndex(e => e.id === 'gate')
					? `The Giant is ${temper(trip, C)}.${trip.anger ? ' A failed risk makes him angrier.' : ''}`
					: 'Some options are risky. A failure sends your climber sliding back down.')));
		const again = focused === 'climb' ? '[data-climb]' : focused ? `[data-option="${focused}"]` : null;
		if (again) $('climb').querySelector(again)?.focus();
	}

	// The price of a crate over the last few minutes, with a line at what yours cost.
	function chart(history, cost) {
		const c = el('canvas', { className: 'chart', width: 300, height: 72 });
		c.setAttribute('role', 'img');
		c.setAttribute('aria-label', 'The price of a crate over the last few minutes');
		const g = c.getContext('2d');
		if (!g || history.length < 2) return c;
		const all = cost ? [...history, cost] : history;
		const lo = Math.min(...all);
		const hi = Math.max(...all);
		const y = v => 66 - (v - lo) / Math.max(1e-9, hi - lo) * 60;
		if (cost) {
			g.strokeStyle = '#f2d544';
			g.setLineDash([4, 4]);
			g.beginPath();
			g.moveTo(0, y(cost));
			g.lineTo(300, y(cost));
			g.stroke();
			g.setLineDash([]);
		}
		g.strokeStyle = '#6fdc55';
		g.lineWidth = 2;
		g.beginPath();
		history.forEach((v, i) => g[i ? 'lineTo' : 'moveTo'](i / (data.EXCHANGE.history - 1) * 300, y(v)));
		g.stroke();
		return c;
	}

	// The Exchange: the board, your crates, and the buttons to trade.
	function exchange(state) {
		const X = data.EXCHANGE;
		const ex = state.exchange;
		const canBuy = state.coins > 0;
		const sig = [ex.price, ex.crates, ex.history.length, canBuy].join('|');
		if (shown.get('exchange') === sig) return;
		shown.set('exchange', sig);
		const d = doc.activeElement?.dataset ?? {};
		const focused = d.buy ? `[data-buy="${d.buy}"]` : d.sell ? `[data-sell="${d.sell}"]` : null;

		const cost = averageCost(ex);
		const worth = valueOf(ex);
		const change = ex.paid > 0 ? (worth / ex.paid - 1) * 100 : 0;
		const row = (label, key, can) => el('div', { className: 'trade' }, el('span', {}, label),
			...X.shares.map(share => {
				const b = el('button', { type: 'button', disabled: !can }, share === 1 ? 'all' : `${Math.round(share * 100)}%`);
				b.dataset[key] = String(share);
				b.setAttribute('aria-label', `${label} ${share === 1 ? 'all' : `${Math.round(share * 100)}%`} of your ${key === 'buy' ? 'coins' : 'crates'}`);
				return b;
			}));
		const crates = ex.crates < 100 ? String(Math.round(ex.crates * 10) / 10) : formatNumber(ex.crates);
		$('exchange').replaceChildren(
			el('div', { className: 'box' }, el('h3', {}, `Bean crates · ${ex.price.toFixed(2)} coins each`),
				chart(ex.history, cost),
				el('p', { className: 'muted' }, X.hint)),
			el('div', { className: 'box' }, el('h3', {}, 'Your crates'),
				ex.crates > 0
					? el('p', {}, `${crates} crates, bought at ${cost.toFixed(2)} each. Worth ${formatMoney(worth)} coins now `,
						el('span', { className: change >= 0 ? 'up' : 'down' }, `(${change >= 0 ? '+' : ''}${change.toFixed(0)}%)`), '.')
					: el('p', { className: 'muted' }, 'You hold no crates.'),
				row('Buy', 'buy', canBuy), row('Sell', 'sell', ex.crates > 0),
				el('p', { className: 'muted' }, `Buying spends that share of your coins. Selling pays the price on the board, less a ${Math.round(X.fee * 100)}% fee.`)),
			el('div', { className: 'box' }, el('h3', {}, 'Account'),
				el('p', {}, 'Made at the exchange so far: ',
					el('span', { className: ex.profit >= 0 ? 'up' : 'down' }, `${ex.profit < 0 ? '−' : ''}${formatMoney(Math.abs(ex.profit))} coins`))));
		if (focused) $('exchange').querySelector(focused)?.focus();
	}

	// The Guard: the raid that is coming (or going on), who is posted, and the record so far.
	function guard(state) {
		const G = data.GUARD;
		const { guard: g } = state;
		const { fight } = g;
		const left = Math.ceil(raidIn(state));
		const cost = postCost(g, G);
		const canBuild = !!cost && state.coins >= cost.coins;
		const used = postsUsed(g);
		const drilled = hasDrill(g, G);
		const training = defendersFor(g, G).map(def => {
			const price = trainCost(state, def.id, G);
			return { price, can: !!price && Object.entries(price).every(([c, v]) => state[c] >= v) };
		});
		const sig = [left, JSON.stringify(g.roster), g.posts, g.wins, g.losses, JSON.stringify(fight), g.said, canBuild,
			JSON.stringify(g.levels), state.phase, training.map(x => x.can).join('')].join('|');
		if (shown.get('guard') === sig) return;
		shown.set('guard', sig);
		const d = doc.activeElement?.dataset ?? {};
		const focused = d.post ? `[data-post="${d.post}"][data-delta="${d.delta}"]` : d.build ? '[data-build]' : d.train ? `[data-train="${d.train}"]` : null;

		const sum = counts => Object.values(counts).reduce((a, b) => a + b, 0);
		const tough = G.foes.filter(f => f.tough && g.wave[f.id] > 0).map(f => f.plural.replace(/^./, ch => ch.toUpperCase()));
		const now = fight
			? [el('h3', { className: 'down' }, 'Raid!'),
				el('p', {}, `${waveText(fight.foes, G)} still in the beans. ${sum(fight.up)} of ${used} animals on their feet.`)]
			: [el('h3', {}, `Next raid in ${formatDuration(left)}`),
				el('p', {}, `Coming: ${waveText(g.wave, G)}.`),
				el('p', { className: 'muted' }, 'Post animals that suit what is coming: about one for every two pests. The wrong animal is little use.'),
				tough.length ? el('p', { className: 'muted' }, `${tough.join(' and ')} are tough: they take trained animals.`) : ''];

		const trains = state.phase >= G.train.phase;
		const posts = defendersFor(g, G).map((def, k) => {
			const n = g.roster[def.id] ?? 0;
			const level = g.levels[def.id] ?? 0;
			const { price, can } = training[k];
			const coach = el('button', { type: 'button', className: 'train', disabled: !can },
				price ? `Train to level ${level + 1} ` : `Trained: level ${level}`, price ? el('span', { className: 'gold' }, `(${costText(price)})`) : '');
			coach.dataset.train = def.id;
			const button = (label, delta, disabled) => {
				const b = el('button', { type: 'button', disabled: disabled || !!fight || drilled }, label);
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
		const build = el('button', { type: 'button', disabled: !canBuild }, 'Build another post ',
			el('span', { className: 'gold' }, cost ? `(${costText(cost)})` : ''));
		build.dataset.build = '1';

		const earned = ranksEarned(g, G);
		const next = nextRank(g, G);
		$('guard').replaceChildren(
			el('div', { className: 'box' }, ...now, g.said ? el('p', { className: 'said' }, g.said) : ''),
			el('div', { className: 'box' }, el('h3', {}, `Posts · ${used} of ${g.posts} filled`), ...posts,
				drilled ? el('p', { className: 'muted' }, 'The animals take their own posts now.') : '',
				cost ? build : el('p', { className: 'muted' }, 'Every post is built.')),
			el('div', { className: 'box' }, el('h3', {}, `Record · ${g.wins} won, ${g.losses} lost`),
				earned.length
					? el('ul', { className: 'finds' }, ...earned.map(r => el('li', {}, el('b', {}, r.name), ` ${r.text}`)))
					: el('p', { className: 'muted' }, 'A win pays a bounty. A loss costs plots and beans from the barn.'),
				el('p', { className: 'muted' }, next ? `At ${next.wins} ${next.wins === 1 ? 'win' : 'wins'}: ${next.text}` : 'Every rank earned.')));
		if (focused) $('guard').querySelector(focused)?.focus();
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
			if (tab === 'climb') climb(state);
			if (tab === 'guard') guard(state);
			if (tab === 'exchange') exchange(state);
			journal(state);
			shown.set('ready', true);   // from now on, anything that appears is news
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
