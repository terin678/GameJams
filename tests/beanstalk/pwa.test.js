// The installable-app pieces: the manifest, the icons, and the service worker.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ICONS, ANDROID_ICONS, encodePng, drawIcon } from '../../tools/make-icons.mjs';
import { appHtml, buildApp } from '../../tools/build-app.mjs';

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
	const platform = readFileSync(game('src/game/platform.js'), 'utf8');
	assert.match(platform, /serviceWorker[\s\S]*register\('sw\.js'\)/);
});

test('there is a privacy page, linked from the menu', () => {
	const privacy = readFileSync(game('privacy.html'), 'utf8');
	assert.match(page, /<a href="privacy\.html">Privacy<\/a>/);
	assert.match(page, /&copy; \d{4} Veracity/, 'the copyright line');
	assert.match(privacy, /GoatCounter/);
	assert.match(privacy, /no purchases inside the game/);
	assert.doesNotMatch(privacy, /<script/);
});

test('the app copy of the page loads one bundled script and nothing from the website around it', () => {
	const html = appHtml(page);
	assert.match(html, /<script type="module" src="app\.js"><\/script>/);
	assert.equal(html.match(/<script/g).length, 1);
	assert.doesNotMatch(html, /\.\.\/\.\.\//, 'nothing outside the app folder');
	assert.doesNotMatch(html, /manifest|site\.js|src\/game/);
	assert.match(html, /id="tend"/);
	assert.throws(() => appHtml('<html></html>'), /scripts are not where/);
});

test('the app build is one minified script with no source map, no service worker and no counting', async t => {
	try {
		await import('esbuild');
	} catch (e) {
		return t.skip('esbuild is not installed: run npm install');
	}
	const out = await buildApp();
	const js = readFileSync(new URL('app.js', out), 'utf8');
	const source = readFileSync(game('src/core/sim.js'), 'utf8').length;
	assert.ok(js.length > source, 'the whole game is in there');
	assert.ok(js.split('\n').length < 50, 'minified');
	assert.doesNotMatch(js, /sourceMappingURL/);
	assert.doesNotMatch(js, /serviceWorker/);
	assert.doesNotMatch(js, /goatcounter/i);
	assert.match(js, /Corner the market/, 'the game data is bundled in');
	for (const f of ['index.html', 'privacy.html', 'icons/icon-192.png']) assert.ok(readFileSync(new URL(f, out)).length > 0, f);
});

test('the Android app has the bean as its icon, at every density, and it is up to date', () => {
	const res = name => new URL(`../../app/android/app/src/main/res/${name}`, import.meta.url);
	assert.equal(ANDROID_ICONS.length, 15);
	for (const icon of ANDROID_ICONS) {
		assert.ok(readFileSync(res(icon.file)).equals(encodePng(icon.size, drawIcon(icon.size, icon.fill))), `${icon.file} is stale: run node tools/make-icons.mjs`);
	}
	assert.match(readFileSync(res('values/ic_launcher_background.xml'), 'utf8'), /#10131C/i, 'the icon background matches the art');
});

test('the shipping copy leaves out what is only for development and testing', async t => {
	const testing = appHtml(page);
	const shipping = appHtml(page, { ship: true });
	assert.match(testing, /data-feedback="bug"/);
	assert.match(testing, /in testing/);
	assert.doesNotMatch(shipping, /data-feedback|issues\/new|in testing|test-only/);
	assert.match(shipping, /<a href="privacy\.html">Privacy<\/a>/, 'the privacy link stays');
	assert.match(shipping, /&copy; \d{4} Veracity/, 'so does the copyright line');
	assert.match(shipping, /id="open-menu"/);
	try {
		await import('esbuild');
	} catch (e) {
		return t.skip('esbuild is not installed: run npm install');
	}
	const read = (out, f) => readFileSync(new URL(f, out), 'utf8');
	let out = await buildApp({ ship: true });
	const ship = read(out, 'app.js');
	assert.equal(read(out, 'build.txt').trim(), 'ship');
	assert.doesNotMatch(ship, /#perf|console\.|debugger/);
	assert.doesNotMatch(ship, /window\.game\s*=/, 'no console handle');
	assert.doesNotMatch(read(out, 'index.html'), /data-feedback/);
	// Leave the everyday testing copy in place.
	out = await buildApp();
	assert.equal(read(out, 'build.txt').trim(), 'test');
	assert.match(read(out, 'app.js'), /#perf/);
	assert.match(read(out, 'app.js'), /window\.game\s*=/);
});

test('on a phone the Tend bar is above every card: no card is given a layer of its own', () => {
	// The bar is inside #status. A z-index on the cards would trap it in that
	// card's layer, and the cards after it would cover the button.
	const rule = page.match(/body\.backdrop #status, body\.backdrop #shop, body\.backdrop #journal \{([^}]*)\}/);
	assert.ok(rule, 'the rule for the cards in farm-behind mode');
	assert.match(rule[1], /position: relative/);
	assert.doesNotMatch(rule[1], /z-index/);
	assert.match(page, /#tendbar \{\s*position: fixed;[^}]*z-index: 4/);
	assert.match(page, /id="tendbar"/);
});
