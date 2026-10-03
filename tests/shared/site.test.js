import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { issueUrl, goatcounterEndpoint, ISSUE_TEMPLATES, counterUrl, parseCount, formatCount } from '../../shared/site.js';

test('issueUrl without a kind opens the template chooser', () => {
	assert.equal(issueUrl('me/repo'), 'https://github.com/me/repo/issues/new/choose');
});

test('issueUrl picks a template and pre-fills the game', () => {
	const u = new URL(issueUrl('me/repo', { kind: 'bug', game: 'Fowl Play' }));
	assert.equal(u.pathname, '/me/repo/issues/new');
	assert.equal(u.searchParams.get('template'), ISSUE_TEMPLATES.bug);
	assert.equal(u.searchParams.get('game'), 'Fowl Play');
});

test('issueUrl rejects unknown kinds', () => {
	assert.throws(() => issueUrl('me/repo', { kind: 'rant' }), /kind/);
});

test('every linked issue form exists and has the "game" field we pre-fill', () => {
	for (const file of Object.values(ISSUE_TEMPLATES)) {
		const yml = readFileSync(new URL(`../../.github/ISSUE_TEMPLATE/${file}`, import.meta.url), 'utf8');
		assert.match(yml, /^\s+id: game$/m, file);
	}
});

test('counterUrl asks for one page, or the site total', () => {
	assert.equal(counterUrl('my-jams', '/GameJams/games/midair/'), 'https://my-jams.goatcounter.com/counter/%2FGameJams%2Fgames%2Fmidair%2F.json');
	assert.equal(counterUrl('my-jams'), 'https://my-jams.goatcounter.com/counter/TOTAL.json');
	assert.equal(counterUrl(''), null);
});

test('parseCount reads GoatCounter strings like "1,234"', () => {
	assert.deepEqual(parseCount({ count: '1,234', count_unique: '987' }), { views: 1234, unique: 987 });
	assert.deepEqual(parseCount({}), { views: 0, unique: 0 });
	assert.deepEqual(parseCount(null), { views: 0, unique: 0 });
});

test('formatCount groups thousands and pluralises', () => {
	assert.equal(formatCount(1, 'play'), '1 play');
	assert.equal(formatCount(12345, 'play'), '12,345 plays');
	assert.equal(formatCount(0, 'visitor'), '0 visitors');
});

test('goatcounterEndpoint only accepts a plain site code', () => {
	assert.equal(goatcounterEndpoint('my-jams'), 'https://my-jams.goatcounter.com/count');
	assert.equal(goatcounterEndpoint(''), null);
	assert.equal(goatcounterEndpoint('evil.com/x'), null);
});
