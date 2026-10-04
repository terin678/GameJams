// The Neighbours tab: one card per neighbour you've met, with hearts, what the
// next heart brings, and the gifts you can give. A gift shows how they took it
// once you've tried it.

import { heartsOf, heartProgress, giftsFor, giftCost, canGive, waitFor, nextPerk } from '../../core/neighbours.js';

const REACTION_MARK = { love: '♥', like: '+', neutral: '·', dislike: '×' };

export function createNeighbours({ el, data, T, money }) {
	const F = T.friends;

	function card(state, def, gifts) {
		const friend = state.friends[def.id];
		const hearts = heartsOf(friend.points, F);
		const wait = Math.ceil(waitFor(state, def));
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
			el('div', { className: 'gifts' }, ...gifts.map(g => {
				const known = friend.known[g.id];
				const b = el('button', { type: 'button', disabled: !canGive(state, def, g, F), className: known ?? 'unknown' },
					el('span', { className: 'mark' }, known ? REACTION_MARK[known] : '?'), ` ${g.name} `,
					el('span', { className: 'cost' }, `(${money.costText(giftCost(g, hearts, F))})`));
				b.title = known ? `${def.name}: ${known}` : 'Not tried yet';
				b.dataset.friend = def.id;
				b.dataset.gift = g.id;
				return b;
			})),
			el('p', { className: 'muted' }, [friend.said ? status : '', progress].filter(Boolean).join(' · ')));
	}

	return {
		id: 'neighbours',
		label: 'Neighbours',
		unlocked: state => Object.keys(state.friends).length > 0,
		render(state) {
			const gifts = giftsFor(state, data.GIFTS);
			return data.NEIGHBOURS.filter(n => state.friends[n.id]).map(def => card(state, def, gifts));
		},
		press(d, handlers) {
			if (d.gift) handlers.gift(d.friend, d.gift);
		},
	};
}
