// The installable-app pieces: the manifest, the icons, the service worker and save codes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { encodeSave, decodeSave } from '../../games/beanstalk/src/core/save.js';
import { createState, tend, serialize, restore, isSave } from '../../games/beanstalk/src/core/sim.js';
import { DATA } from '../../games/beanstalk/src/data/index.js';
import { ICONS, encodePng, drawIcon } from '../../tools/make-icons.mjs';

const game = name => new URL(`../../games/beanstalk/${name}`, import.meta.url);
const manifest = JSON.parse(readFileSync(game('manifest.webmanifest'), 'utf8'));
const page = readFileSync(game('index.html'), 'utf8');

test('the manifest makes the game installable', () => {
	assert.equal(manifest.display, 'standalone');
	assert.equal(manifest.start_url, './', 'relative, so it works under /GameJams/');
	assert.equal(manifest.scope, './');
	assert.ok(manifest.name && manifest.short_name.length <= 12);
	assert.ok(manifest.icons.some(i => i.sizes === '192x192'));
	assert.ok(manifest.icons.some(i => i.sizes === '512x512' && i.purpose === 'any'));
	assert.ok(manifest.icons.some(i => i.purpose === 'maskable'));
	assert.match(page, /<link rel="manifest" href="manifest\.webmanifest">/);
	assert.match(page, /<meta name="theme-color"/);
	assert.match(page, /rel="apple-touch-icon"/);
});

test('every icon is on disk, is a PNG of the size it claims, and is up to date', () => {
	const listed = [...manifest.icons.map(i => i.src), page.match(/rel="apple-touch-icon" href="([^"]+)"/)[1]];
	for (const src of listed) {
		const icon = ICONS.find(i => `icons/${i.file}` === src);
		assert.ok(icon, `${src} is made by tools/make-icons.mjs`);
		const bytes = readFileSync(game(src));
		assert.deepEqual([...bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], `${src} is a PNG`);
		assert.equal(bytes.readUInt32BE(16), icon.size, `${src} width`);
		assert.equal(bytes.readUInt32BE(20), icon.size, `${src} height`);
		assert.ok(bytes.equals(encodePng(icon.size, drawIcon(icon.size, icon.fill))), `${src} is stale: run node tools/make-icons.mjs`);
	}
});

// Runs sw.js against a fake browser and returns its fetch handler's answer.
// (new Function here only ever evaluates our own sw.js, read from the repo.)
function serviceWorker({ online = true, kept = {}, slowMs = 0 } = {}) {
	const listeners = {};
	const store = new Map(Object.entries(kept));
	const fetched = [];
	const self = {
		location: { origin: 'https://example.test' },
		clients: { claim: () => Promise.resolve() },
		skipWaiting() {},
		addEventListener: (type, fn) => { listeners[type] = fn; },
	};
	const caches = {
		open: async () => ({
			match: async url => store.get(url),
			put: async (url, response) => { store.set(url, response.body); },
		}),
	};
	const fetch = (url, init) => new Promise((resolve, reject) => {
		fetched.push({ url, init });
		const answer = () => (online
			? resolve({ ok: true, body: `fresh ${url}`, clone() { return this; } })
			: reject(new Error('offline')));
		if (slowMs) setTimeout(answer, slowMs);
		else answer();
	});
	const timers = slowMs ? (fn, ms, v) => setTimeout(fn, Math.min(ms, 5), v) : setTimeout;
	new Function('self', 'caches', 'fetch', 'setTimeout', readFileSync(game('sw.js'), 'utf8'))(self, caches, fetch, timers);
	const request = (url, method = 'GET') => {
		let answer;
		listeners.fetch({ request: { url, method }, respondWith: p => { answer = p; } });
		return answer;
	};
	return { request, store, fetched };
}

test('online, the service worker fetches fresh files and keeps a copy', async () => {
	const sw = serviceWorker();
	const response = await sw.request('https://example.test/games/beanstalk/src/game/main.js');
	assert.equal(response.body, 'fresh https://example.test/games/beanstalk/src/game/main.js');
	assert.equal(sw.fetched[0].init.cache, 'no-cache', 'asks the server, not the ten-minute browser cache');
	await new Promise(r => setTimeout(r, 0));
	assert.ok(sw.store.has('https://example.test/games/beanstalk/src/game/main.js'));
});

test('offline, it serves the kept copy, including shared files outside the game folder', async () => {
	const url = 'https://example.test/shared/sfx.js';
	const sw = serviceWorker({ online: false, kept: { [url]: 'kept copy' } });
	assert.equal(await sw.request(url), 'kept copy');
	await assert.rejects(sw.request('https://example.test/never/seen.js'), /offline/);
});

test('on a slow connection it uses the kept copy instead of waiting', async () => {
	const url = 'https://example.test/games/beanstalk/';
	const sw = serviceWorker({ slowMs: 60, kept: { [url]: 'kept copy' } });
	assert.equal(await sw.request(url), 'kept copy');
});

test('it leaves other sites and non-GET requests alone', () => {
	const sw = serviceWorker();
	assert.equal(sw.request('https://terin-gamejams.goatcounter.com/count'), undefined);
	assert.equal(sw.request('https://example.test/games/beanstalk/', 'POST'), undefined);
});

test('the page registers the service worker from the game folder', () => {
	const main = readFileSync(game('src/game/main.js'), 'utf8');
	assert.match(main, /serviceWorker[\s\S]*register\('sw\.js'\)/);
});

test('a save code round-trips a farm, accents and all', () => {
	const s = createState(DATA);
	tend(s, DATA);
	s.coins = 1234.5;
	s.log.unshift('Café, naïve, 🌱');
	const code = encodeSave(serialize(s));
	assert.match(code, /^BEAN1\.[A-Za-z0-9+/=]+$/);
	const back = decodeSave(`  ${code.slice(0, 40)}\n${code.slice(40)}  `);
	assert.ok(isSave(back));
	assert.deepEqual(restore(back, DATA), s);
});

test('junk is not a save code', () => {
	for (const junk of ['', null, 'hello', 'BEAN1.!!!', 'BEAN1.' + btoa('not json'), 'BEAN1.' + btoa('7')]) {
		assert.equal(decodeSave(junk), null, String(junk));
	}
	assert.equal(isSave(decodeSave('BEAN1.' + btoa('{"v":99}'))), false);
});
