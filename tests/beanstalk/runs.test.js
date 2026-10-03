import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_RULES, twistsFor, nextTwist, rulesFor, lineFor, endingLine, validateRuns } from '../../games/beanstalk/src/core/runs.js';

const RUNS = {
	again: { start: 'Again.', seeds: 'Seeds again.', neighbours: { may: 'You again.' } },
	twists: [
		{ id: 'a', name: 'A', text: 'a', rule: { cold: 0.5 } },
		{ id: 'b', name: 'B', text: 'b', rule: { crows: 2, brave: 0.3 } },
	],
	endings: ['first', 'second'],
};
const NEIGHBOURS = [{ id: 'may' }];

test('a first run has no twists; each later run adds the next one', () => {
	assert.deepEqual(twistsFor(0, RUNS), []);
	assert.deepEqual(twistsFor(1, RUNS).map(t => t.id), ['a']);
	assert.deepEqual(twistsFor(2, RUNS).map(t => t.id), ['a', 'b']);
	assert.deepEqual(twistsFor(9, RUNS).map(t => t.id), ['a', 'b']);
	assert.equal(nextTwist(0, RUNS).id, 'a');
	assert.equal(nextTwist(2, RUNS), null);
});

test('twists set rules on top of the defaults', () => {
	assert.deepEqual(rulesFor(0, RUNS), DEFAULT_RULES);
	assert.deepEqual(rulesFor(1, RUNS), { ...DEFAULT_RULES, cold: 0.5 });
	assert.deepEqual(rulesFor(2, RUNS), { ...DEFAULT_RULES, cold: 0.5, crows: 2, brave: 0.3 });
	assert.deepEqual(rulesFor(0, RUNS), DEFAULT_RULES, 'the defaults are not changed');
});

test('the world remembers: later runs use the "again" line when there is one', () => {
	assert.equal(lineFor('Hello.', 'You again.', 0), 'Hello.');
	assert.equal(lineFor('Hello.', 'You again.', 1), 'You again.');
	assert.equal(lineFor('Hello.', undefined, 3), 'Hello.');
});

test('the ending line changes per run, and the last one repeats', () => {
	assert.equal(endingLine(0, RUNS), 'first');
	assert.equal(endingLine(1, RUNS), 'second');
	assert.equal(endingLine(7, RUNS), 'second');
});

test('validateRuns accepts good data and explains bad data', () => {
	assert.deepEqual(validateRuns(RUNS, NEIGHBOURS), []);
	const bad = {
		again: { neighbours: { nobody: 'x' } },
		twists: [{ id: 'a', name: 'A', rule: { luck: 2 } }, { id: 'a', name: 'A', text: 't', rule: { cold: -1 } }, { id: 'c', name: 'C', text: 't' }],
		endings: [],
	};
	const errors = validateRuns(bad, NEIGHBOURS).join('\n');
	for (const word of ['again.start', 'again.seeds', 'neighbours.may', 'nobody', 'endings', 'text is missing', 'luck', 'twice', 'cold must', 'changes nothing']) {
		assert.match(errors, new RegExp(word));
	}
});
