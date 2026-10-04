// Beanstalk's service worker: what lets the installed game open with no signal.
//
// Network first, cache as a fallback. Online, every file is fetched fresh (so
// a new version shows up straight away, with no version numbers to bump) and a
// copy is kept. Offline, or on a connection too slow to wait for, the kept
// copy is used. One visit online stores everything the game needs, because
// the game loads all its files at start-up.
//
// Only this site's own GET requests are handled; anything else (the visitor
// counter, GitHub links) goes straight to the network as usual.

const CACHE = 'beanstalk';
const SLOW_MS = 4000;   // after this long, a kept copy is better than waiting

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(Promise.all([self.clients.claim(), prune()])));

self.addEventListener('fetch', event => {
	const { request } = event;
	if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
	event.respondWith(respond(request.url, event));
});

async function respond(url, event) {
	const cache = await caches.open(CACHE);
	// 'no-cache' makes the browser check with the server instead of trusting
	// its ten-minute copy; unchanged files still come back as a quick "not modified".
	const fresh = fetch(url, { cache: 'no-cache' }).then(response => {
		// The worker is kept alive until the copy is stored. A full disk is not the page's problem.
		if (response.ok) event.waitUntil(cache.put(url, response.clone()).catch(() => {}));
		return response;
	});
	fresh.catch(() => {});   // if we answer from the kept copy, a late failure is not news
	const slow = new Promise(resolve => setTimeout(resolve, SLOW_MS, null));
	try {
		const first = await Promise.race([fresh, slow]);
		if (first) return first;
		// Slow connection: use the kept copy if there is one, else keep waiting.
		return (await cache.match(url)) ?? await fresh;
	} catch (offline) {
		const kept = await cache.match(url);
		if (kept) return kept;
		throw offline;
	}
}

// A new version of this worker arrives with a new version of the site, so
// that is the moment to forget kept files the site no longer has (it once
// published dozens of source files; now it is a handful). A file is only
// forgotten when the server says it is gone; with no answer, it stays.
async function prune() {
	const cache = await caches.open(CACHE);
	await Promise.all((await cache.keys()).map(async request => {
		try {
			const response = await fetch(request.url, { method: 'HEAD', cache: 'no-cache' });
			if (response.status === 404) await cache.delete(request);
		} catch (offline) {
			// Keep it.
		}
	}));
}
