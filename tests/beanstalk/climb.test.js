import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	createClimb, unlockDue, nextEncounter, climbBlocked, startClimb, climbingFor, arrive, optionBlocked, choose,
	findsOf, findEffects, temper, validateClimb,
} from '../../games/beanstalk/src/core/climb.js';

const F = { pointsPerHeart: 100, maxHearts: 8 };
const C = {
	unlock: { phase: 2 }, log: 'Up!', seconds: 40,
	giant: { stompAt: 2, afterStomp: 1, moods: ['calm', 'cross'], stomp: 'STOMP.' },
	encounters: [
		{
			id: 'a', name: 'A', height: 100, provisions: { coins: 10 }, text: 'a',
			options: [
				{ label: 'safe', win: 'ok', grant: { pages: 5 } },
				{ label: 'risky', chance: 0.5, win: 'got it', lose: 'oops', find: { id: 'egg', name: 'Egg', text: 't', effect: { yield: 2 } } },
			],
		},
		{
			id: 'b', name: 'B', height: 500, provisions: { coins: 20 }, text: 'b',
			options: [
				{ label: 'friend', needs: { hearts: { who: 'may', n: 2 } }, needsText: 'n', win: 'w', find: { id: 'harp', name: 'Harp', text: 't', effect: { growth: 1.5 } } },
				{ label: 'grower', needs: { trait: { id: 'size', level: 3 } }, needsText: 'n', win: 'w' },
				{ label: 'calm', needs: { calm: true }, needsText: 'n', win: 'w' },
				{ label: 'pay', cost: { beans: 50 }, anger: -1, win: 'w' },
			],
		},
	],
};
const state = over => ({
	time: 0, phase: 2, height: 1000, coins: 100, pages: 0, beans: 0,
	friends: {}, seeds: { traits: { size: 0 } }, climb: { ...createClimb(), open: true }, ...over,
});
const sure = { next: () => 0 };
const unlucky = { next: () => 0.99 };
const atLedge = over => {
	const s = state(over);
	startClimb(s, C);
	s.time = 40;
	arrive(s);
	return s;
};

test('the climb opens in its phase, once', () => {
	const closed = state({ phase: 1, climb: createClimb() });
	assert.equal(unlockDue(closed, C), false);
	assert.equal(unlockDue({ ...closed, phase: 2 }, C), true);
	assert.equal(unlockDue(state(), C), false);
});

test('setting off needs a tall enough stalk and provisions, and takes time', () => {
	assert.equal(climbBlocked(state({ height: 50 }), C), 'short');
	assert.equal(climbBlocked(state({ coins: 5 }), C), 'poor');
	const s = state();
	assert.equal(climbBlocked(s, C), null);
	assert.equal(startClimb(s, C), true);
	assert.equal(s.coins, 90);
	assert.equal(climbingFor(s), 40);
	assert.equal(climbBlocked(s, C), 'busy');
	assert.equal(arrive(s), false);
	s.time = 40;
	assert.equal(arrive(s), true);
	assert.equal(s.climb.waiting, true);
	assert.equal(arrive(s), false, 'arrives once');
	assert.equal(climbBlocked(s, C), 'busy', 'there is a choice to make first');
});

test('a sure option moves you up and hands over its grant', () => {
	const s = atLedge();
	assert.deepEqual(choose(s, 0, C, unlucky, F), { won: true, text: 'ok (+5 pages)', find: null, stomp: false });
	assert.equal(s.pages, 5);
	assert.equal(s.climb.ledge, 1);
	assert.equal(s.climb.waiting, false);
	assert.equal(nextEncounter(s, C).id, 'b');
});

test('a risky option can win a find or send you sliding back', () => {
	const won = atLedge();
	assert.equal(choose(won, 1, C, sure, F).find.id, 'egg');
	assert.deepEqual(findsOf(won.climb, C).map(f => f.name), ['Egg']);
	assert.deepEqual(findEffects(won.climb, C), [{ yield: 2 }]);

	const lost = atLedge();
	const result = choose(lost, 1, C, unlucky, F);
	assert.equal(result.won, false);
	assert.equal(lost.climb.ledge, 0, 'still below the ledge');
	assert.equal(lost.climb.anger, 1);
	assert.equal(temper(lost.climb, C), 'cross');
	assert.equal(climbBlocked(lost, C), null, 'free to climb again');
	assert.deepEqual(findEffects(lost.climb, C), []);
});

test('annoy the Giant enough and he stamps', () => {
	const s = atLedge();
	choose(s, 1, C, unlucky, F);
	startClimb(s, C);
	s.time = 80;
	arrive(s);
	const result = choose(s, 1, C, unlucky, F);
	assert.equal(result.stomp, true);
	assert.match(result.text, /STOMP/);
	assert.equal(s.climb.anger, 1, 'he calms down a little afterwards');
});

test('options can need a friend, a seed trait, a calm Giant, or payment', () => {
	const s = state();
	const [friend, grower, calm, pay] = C.encounters[1].options;
	assert.equal(optionBlocked(s, friend, F), 'needs');
	assert.equal(optionBlocked({ ...s, friends: { may: { points: 200 } } }, friend, F), null);
	assert.equal(optionBlocked(s, grower, F), 'needs');
	assert.equal(optionBlocked({ ...s, seeds: { traits: { size: 3 } } }, grower, F), null);
	assert.equal(optionBlocked(s, calm, F), null);
	assert.equal(optionBlocked({ ...s, climb: { ...s.climb, anger: 1 } }, calm, F), 'needs');
	assert.equal(optionBlocked(s, pay, F), 'poor');
	assert.equal(optionBlocked({ ...s, beans: 50 }, pay, F), null);
});

test('you cannot choose before arriving, or choose what is blocked; at the top there is nothing to climb', () => {
	assert.equal(choose(state(), 0, C, sure, F), null);
	const s = atLedge();
	choose(s, 0, C, sure, F);
	startClimb(s, C);
	s.time = 100;
	arrive(s);
	assert.equal(choose(s, 0, C, sure, F), null, 'needs a friend');
	s.beans = 60;
	s.climb.anger = 1;
	assert.equal(choose(s, 3, C, sure, F).won, true);
	assert.equal(s.beans, 10);
	assert.equal(s.climb.anger, 0, 'a feast calms him');
	assert.equal(nextEncounter(s, C), null);
	assert.equal(climbBlocked(s, C), 'top');
});

test('validateClimb accepts good data and explains bad data', () => {
	const ctx = { neighbours: ['may'], traits: ['size'], phases: [1, 2, 3] };
	assert.deepEqual(validateClimb(C, ctx), []);
	const bad = {
		unlock: { phase: 9 }, seconds: 0, giant: { stompAt: 2, afterStomp: 5, moods: ['calm'] },
		encounters: [
			{ id: 'x', name: 'X', height: 10, provisions: {}, options: [{ label: 'only', needs: { luck: 1 }, win: 'w' }] },
			{ id: 'x', name: 'X', text: 't', height: 5, provisions: { coins: 1 }, options: [
				{ label: 'a', chance: 0.5, win: 'w', cost: { gold: 1 }, find: { id: 'f', effect: { luck: 1 } } },
				{ label: 'b', win: 'w', needs: { hearts: { who: 'nobody', n: 1 }, trait: { id: 'nope', level: 1 } }, find: { id: 'f', name: 'F', text: 't', effect: {} } },
			] },
		],
	};
	const errors = validateClimb(bad, ctx).join('\n');
	for (const word of ['unlock.phase', 'log is', 'seconds', 'stompAt', 'stomp line', 'mood', 'text is missing', 'twice', 'must climb', 'provisions', 'two options', 'anyone can take', 'lose line', 'gold', 'nobody', 'nope', 'unknown need "luck"', 'needsText', 'find.name', 'used twice', 'does nothing', 'unknown effect "luck"']) {
		assert.match(errors, new RegExp(word), word);
	}
});
