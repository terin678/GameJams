import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSquadrons, enlist, recordKill, recordEscape } from '../../games/midair/src/core/squadrons.js';

test('wiping out a whole squadron pays its reward once', () => {
	const sq = createSquadrons();
	enlist(sq, 'a', 3, 'feather');
	assert.equal(recordKill(sq, 'a'), null);
	assert.equal(recordKill(sq, 'a'), null);
	assert.equal(recordKill(sq, 'a'), 'feather');
	assert.equal(recordKill(sq, 'a'), null, 'no double payout');
});

test('one escapee breaks the squadron', () => {
	const sq = createSquadrons();
	enlist(sq, 'a', 2, 'feather');
	recordKill(sq, 'a');
	recordEscape(sq, 'a');
	assert.equal(recordKill(sq, 'a'), null);
});

test('enlisting twice does not reset progress', () => {
	const sq = createSquadrons();
	enlist(sq, 'a', 2, 'egg');
	recordKill(sq, 'a');
	enlist(sq, 'a', 2, 'egg');
	assert.equal(recordKill(sq, 'a'), 'egg');
});

test('unknown squadrons are ignored', () => {
	const sq = createSquadrons();
	assert.equal(recordKill(sq, 'nope'), null);
	recordEscape(sq, 'nope');
});
