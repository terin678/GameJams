import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	reactionTo, heartsOf, newlyMet, meet, giftCost, giftsFor, waitFor, canGive, give, perkEffects, nextPerk,
	validateGift, validateNeighbour,
} from '../../games/beanstalk/src/core/neighbours.js';

const T = { pointsPerHeart: 100, maxHearts: 3, giftSeconds: 30, costGrowth: 2, points: { love: 60, like: 30, neutral: 10, dislike: -20 } };
const GIFTS = [
	{ id: 'pie', name: 'Pie', phase: 1, cost: { coins: 10 } },
	{ id: 'bolts', name: 'Bolts', phase: 1, cost: { coins: 4 } },
	{ id: 'page', name: 'Page', phase: 2, cost: { pages: 5 } },
];
const gift = id => GIFTS.find(g => g.id === id);
const BAKER = {
	id: 'baker', name: 'May', role: 'baker', unlock: { grown: 30 }, meet: 'Hello.',
	look: { hat: 'w', shirt: 'o', skin: 's' },
	loves: ['pie'], likes: ['page'], dislikes: ['bolts'],
	says: { love: 'Yum!', like: 'Nice.', neutral: 'Oh.', dislike: 'Why?' },
	perks: [{ hearts: 1, effect: { marketing: 2 }, text: 'a' }, { hearts: 3, effect: { yield: 3 }, text: 'b' }],
};
const ALIEN = { ...BAKER, id: 'alien', unlock: { phase: 3 } };
const state = over => ({ time: 0, phase: 1, grown: 0, coins: 1000, pages: 0, matter: 0, friends: {}, ...over });
const met = over => {
	const s = state(over);
	meet(s, BAKER);
	return s;
};

test('reactionTo sorts gifts into love, like, dislike and the rest', () => {
	assert.equal(reactionTo(BAKER, 'pie'), 'love');
	assert.equal(reactionTo(BAKER, 'page'), 'like');
	assert.equal(reactionTo(BAKER, 'bolts'), 'dislike');
	assert.equal(reactionTo(BAKER, 'socks'), 'neutral');
});

test('hearts come from points, up to a maximum', () => {
	assert.equal(heartsOf(0, T), 0);
	assert.equal(heartsOf(199, T), 1);
	assert.equal(heartsOf(9999, T), 3);
});

test('neighbours turn up when their time comes, once', () => {
	const defs = [BAKER, ALIEN];
	assert.deepEqual(newlyMet(state(), defs), []);
	assert.deepEqual(newlyMet(state({ grown: 30 }), defs), [BAKER]);
	assert.deepEqual(newlyMet(state({ grown: 30, phase: 3 }), defs), [BAKER, ALIEN]);
	assert.deepEqual(newlyMet(met({ grown: 30 }), defs), []);
});

test('gifts cost more as the friendship deepens, and later gifts wait for their phase', () => {
	assert.deepEqual(giftCost(gift('pie'), 0, T), { coins: 10 });
	assert.deepEqual(giftCost(gift('pie'), 2, T), { coins: 40 });
	assert.deepEqual(giftsFor(state(), GIFTS).map(g => g.id), ['pie', 'bolts']);
	assert.equal(giftsFor(state({ phase: 2 }), GIFTS).length, 3);
});

test('a loved gift costs coins, earns points and starts a wait', () => {
	const s = met();
	const result = give(s, BAKER, gift('pie'), T);
	assert.deepEqual(result, { reaction: 'love', hearts: 0, perks: [] });
	assert.equal(s.coins, 990);
	assert.equal(s.friends.baker.points, 60);
	assert.equal(s.friends.baker.known.pie, 'love');
	assert.equal(s.friends.baker.said, 'Yum!');
	assert.equal(waitFor(s, BAKER), 30);
	assert.equal(canGive(s, BAKER, gift('pie'), T), false, 'not again today');
	assert.equal(give(s, BAKER, gift('pie'), T), null);
	s.time = 30;
	assert.equal(canGive(s, BAKER, gift('pie'), T), true);
});

test('reaching a heart hands over its perk', () => {
	const s = met();
	give(s, BAKER, gift('pie'), T);
	s.time = 30;
	const result = give(s, BAKER, gift('pie'), T);
	assert.equal(result.hearts, 1);
	assert.deepEqual(result.perks.map(p => p.text), ['a']);
	assert.deepEqual(perkEffects(s.friends, [BAKER, ALIEN], T), [{ marketing: 2 }]);
	assert.equal(nextPerk(BAKER, 1).hearts, 3);
	assert.equal(nextPerk(BAKER, 3), null);
});

test('a disliked gift is wasted but never costs a heart already won', () => {
	const s = met();
	s.friends.baker.points = 105;
	const result = give(s, BAKER, gift('bolts'), T);
	assert.equal(result.reaction, 'dislike');
	assert.equal(s.friends.baker.points, 100);
	assert.equal(s.coins, 1000 - 8, 'charged the one-heart price');
});

test('you cannot give what you cannot afford, to someone you have not met, or past full hearts', () => {
	assert.equal(canGive(met({ coins: 5 }), BAKER, gift('pie'), T), false);
	assert.equal(canGive(state(), BAKER, gift('pie'), T), false);
	assert.equal(canGive(met(), BAKER, gift('page'), T), false, 'gift from a later phase');
	const full = met();
	full.friends.baker.points = 300;
	assert.equal(canGive(full, BAKER, gift('pie'), T), false);
});

test('validation catches the mistakes a data file can make', () => {
	const ids = new Set(GIFTS.map(g => g.id));
	assert.deepEqual(validateNeighbour(BAKER, ids, T), []);
	for (const g of GIFTS) assert.deepEqual(validateGift(g), []);
	assert.match(validateGift({ id: 'x', name: 'X', phase: 7, cost: { gold: 1 } }).join('\n'), /phase[\s\S]*gold/);
	const bad = {
		id: 'x', name: 'X', unlock: {}, look: { hat: 'w' },
		loves: ['socks'], likes: ['pie'], dislikes: ['pie'],
		says: { love: 'a' },
		perks: [{ hearts: 9, effect: { luck: 1 } }],
	};
	const errors = validateNeighbour(bad, ids, T).join('\n');
	for (const word of ['role', 'meet', 'socks', 'two tastes', 'says.like', 'look.shirt', '9 hearts', 'no text', 'luck']) {
		assert.match(errors, new RegExp(word));
	}
});
