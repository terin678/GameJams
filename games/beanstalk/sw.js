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
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', event => {
	const { request } = event;
	if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
	event.respondWith(respond(request.url));
});

async function respond(url) {
	const cache = await caches.open(CACHE);
	// 'no-cache' makes the browser check with the server instead of trusting
	// its ten-minute copy; unchanged files still come back as a quick "not modified".
	const fresh = fetch(url, { cache: 'no-cache' }).then(response => {
		if (response.ok) cache.put(url, response.clone());
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
