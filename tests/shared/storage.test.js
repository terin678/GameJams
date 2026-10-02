import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore, createScoreTable, memoryBackend } from '../../shared/storage.js';

test('store namespaces keys and round-trips JSON', () => {
	const backend = memoryBackend();
	const store = createStore('midair', backend);
	store.set('muted', true);
	assert.equal(store.get('muted'), true);
	assert.equal(backend.getItem('gamejams.midair.muted'), 'true');
});

test('store returns the fallback for missing or corrupt values', () => {
	const backend = memoryBackend();
	backend.setItem('gamejams.x.bad', '{not json');
	const store = createStore('x', backend);
	assert.equal(store.get('missing', 7), 7);
	assert.equal(store.get('bad', 'fb'), 'fb');
});

test('store survives a backend that throws (private mode, blocked storage)', () => {
	const throwing = {
		getItem() { throw new Error('denied'); },
		setItem() { throw new Error('denied'); },
	};
	const store = createStore('x', throwing);
	store.set('a', 1);
	assert.equal(store.get('a'), 1, 'falls back to in-memory values');
});

test('store works with no backend at all', () => {
	const store = createStore('x', null);
	store.set('a', [1, 2]);
	assert.deepEqual(store.get('a'), [1, 2]);
});

test('score table keeps the top N, highest first', () => {
	const table = createScoreTable(createStore('t', memoryBackend()), { max: 3 });
	table.add('AAA', 100);
	table.add('BBB', 300);
	table.add('CCC', 200);
	table.add('DDD', 50);
	assert.deepEqual(table.list().map(e => e.score), [300, 200, 100]);
	assert.equal(table.list()[0].name, 'BBB');
});

test('score table reports rank and new best', () => {
	const table = createScoreTable(createStore('t', memoryBackend()), { max: 3 });
	assert.deepEqual(table.add('AAA', 100), { rank: 0, isBest: true });
	assert.deepEqual(table.add('BBB', 50), { rank: 1, isBest: false });
	assert.deepEqual(table.add('CCC', 500), { rank: 0, isBest: true });
});

test('score table qualifies only scores that would make the board', () => {
	const table = createScoreTable(createStore('t', memoryBackend()), { max: 2 });
	assert.equal(table.qualifies(0), false, 'zero never qualifies');
	assert.equal(table.qualifies(10), true, 'empty board takes any positive score');
	table.add('A', 100);
	table.add('B', 200);
	assert.equal(table.qualifies(100), false, 'ties do not bump existing entries');
	assert.equal(table.qualifies(101), true);
	assert.equal(table.best(), 200);
});

test('score table drops malformed persisted entries', () => {
	const backend = memoryBackend();
	backend.setItem('gamejams.t.scores', JSON.stringify([{ name: 'OK', score: 5 }, { name: 'X' }, 'junk']));
	const table = createScoreTable(createStore('t', backend));
	assert.deepEqual(table.list(), [{ name: 'OK', score: 5 }]);
});

test('score table sanitizes names to 3 uppercase chars', () => {
	const table = createScoreTable(createStore('t', memoryBackend()));
	table.add('bird!!', 10);
	assert.equal(table.list()[0].name, 'BIR');
});
