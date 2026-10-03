import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { issueUrl, goatcounterEndpoint, ISSUE_TEMPLATES } from '../../shared/site.js';

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

test('goatcounterEndpoint only accepts a plain site code', () => {
	assert.equal(goatcounterEndpoint('my-jams'), 'https://my-jams.goatcounter.com/count');
	assert.equal(goatcounterEndpoint(''), null);
	assert.equal(goatcounterEndpoint('evil.com/x'), null);
});
