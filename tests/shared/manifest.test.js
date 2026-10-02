import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { validateEntry, entryHref, sortEntries } from '../../portal/manifest.js';

const ROOT = new URL('../../', import.meta.url);
const games = JSON.parse(readFileSync(new URL('games.json', ROOT), 'utf8'));

test('validateEntry accepts in-repo and external entries', () => {
	assert.deepEqual(validateEntry({ slug: 'a', title: 'A', blurb: 'b', date: '2026-10-02', path: 'games/a/' }), []);
	assert.deepEqual(validateEntry({ slug: 'b', title: 'B', blurb: 'b', date: '2026-10-02', url: 'https://x.y/' }), []);
});

test('validateEntry rejects missing fields, both/neither link, bad dates', () => {
	assert.ok(validateEntry({ title: 'A', blurb: 'b', date: '2026-10-02', path: 'x/' }).some(e => /slug/.test(e)));
	assert.ok(validateEntry({ slug: 'a', title: 'A', blurb: 'b', date: '2026-10-02' }).some(e => /path or url/.test(e)));
	assert.ok(validateEntry({ slug: 'a', title: 'A', blurb: 'b', date: '2026-10-02', path: 'x/', url: 'https://x/' }).some(e => /path or url/.test(e)));
	assert.ok(validateEntry({ slug: 'a', title: 'A', blurb: 'b', date: 'soon', path: 'x/' }).some(e => /date/.test(e)));
	assert.ok(validateEntry({ slug: 'a', title: 'A', blurb: 'b', date: '2026-10-02', url: 'javascript:alert(1)' }).some(e => /url/.test(e)));
});

test('entryHref prefers path, falls back to url', () => {
	assert.equal(entryHref({ path: 'games/a/' }), 'games/a/');
	assert.equal(entryHref({ url: 'https://x.y/' }), 'https://x.y/');
});

test('sortEntries puts newest first and does not mutate', () => {
	const list = [{ slug: 'old', date: '2026-01-01' }, { slug: 'new', date: '2026-10-01' }];
	assert.deepEqual(sortEntries(list).map(e => e.slug), ['new', 'old']);
	assert.equal(list[0].slug, 'old');
});

test('games.json: every entry is valid', () => {
	assert.ok(Array.isArray(games) && games.length > 0);
	for (const g of games) assert.deepEqual(validateEntry(g), [], `entry ${g.slug}`);
});

test('games.json: slugs are unique', () => {
	const slugs = games.map(g => g.slug);
	assert.equal(new Set(slugs).size, slugs.length);
});

test('games.json: in-repo games have an index.html', () => {
	for (const g of games.filter(g => g.path)) {
		assert.ok(existsSync(new URL(g.path + 'index.html', ROOT)), `${g.path}index.html missing`);
	}
});
