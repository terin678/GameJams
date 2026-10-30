import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadJobXp, loadPicks } from '../../games/jobhop/src/core/save.js';

const JOBS = { a: {}, b: {}, c: {} };

test('loadJobXp keeps finite non-negative values for known jobs', () => {
	assert.deepEqual(loadJobXp({ a: 5, b: -1, c: 'x', z: 9 }, JOBS), { a: 5, b: 0, c: 0 });
	assert.deepEqual(loadJobXp(null, JOBS), { a: 0, b: 0, c: 0 });
});

test('loadPicks returns two distinct unlocked jobs, else the fallback', () => {
	assert.deepEqual(loadPicks(['b', 'a'], ['a', 'b'], ['a', 'c']), ['b', 'a']);
	assert.deepEqual(loadPicks(['b', 'c'], ['a', 'b'], ['a', 'b']), ['a', 'b'], 'c is locked');
	assert.deepEqual(loadPicks(['a', 'a'], ['a', 'b'], ['a', 'b']), ['a', 'b']);
	assert.deepEqual(loadPicks('junk', ['a', 'b'], ['a', 'b']), ['a', 'b']);
});
