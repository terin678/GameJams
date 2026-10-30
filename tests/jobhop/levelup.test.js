import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cardPool, offerCards, applyCard } from '../../games/jobhop/src/core/levelup.js';
import { createRng } from '../../shared/rng.js';

const JOBS = { a: { attacks: ['slash'] }, b: { attacks: ['bolt', 'orb'] } };
const PASSIVES = { ring: { max: 2 }, boots: { max: 1 } };

test('cardPool offers attacks of both equipped jobs and passives below max', () => {
	const pool = cardPool({ jobs: ['a', 'b'], JOBS, PASSIVES, attackLevels: { slash: 5, bolt: 1, orb: 2 }, passiveLevels: { boots: 1 }, attackMax: 5 });
	assert.deepEqual(pool.map(c => `${c.kind}:${c.id}:${c.level}`), ['attack:bolt:2', 'attack:orb:3', 'passive:ring:1']);
	assert.equal(pool[0].job, 'b');
});

test('offerCards picks n distinct cards, or a heal when nothing is left', () => {
	const pool = cardPool({ jobs: ['a', 'b'], JOBS, PASSIVES, attackLevels: { slash: 1, bolt: 1, orb: 1 }, passiveLevels: {}, attackMax: 5 });
	const cards = offerCards(createRng(1), pool, 3);
	assert.equal(cards.length, 3);
	assert.equal(new Set(cards.map(c => c.id)).size, 3);
	assert.deepEqual(offerCards(createRng(1), [], 3), [{ kind: 'heal', id: 'heal' }]);
});

test('offerCards returns the whole pool when it is small', () => {
	const pool = [{ kind: 'passive', id: 'x', level: 1 }];
	assert.equal(offerCards(createRng(1), pool, 3).length, 1);
});

test('applyCard raises the right level', () => {
	const attackLevels = { slash: 1 }, passiveLevels = {};
	applyCard({ kind: 'attack', id: 'slash' }, attackLevels, passiveLevels);
	applyCard({ kind: 'passive', id: 'ring' }, attackLevels, passiveLevels);
	assert.deepEqual([attackLevels, passiveLevels], [{ slash: 2 }, { ring: 1 }]);
});
