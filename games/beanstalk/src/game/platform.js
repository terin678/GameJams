// Everything that is about the browser or the phone rather than the game:
// sound and music switches, vibration, keeping the screen awake, the install
// offer, the farm-behind-the-page mode, the Android back button, the service
// worker, and the #perf meter. main.js runs the game; this file deals with
// the device it is running on.

const seconds = () => performance.now() / 1000;

export function createPlatform({ store, view, sfx, music }) {
	let musicOn = store.get('music', true);
	let farmBehind = store.get('backdrop', true);
	let keepAwake = store.get('awake', false);
	let wakeLock = null;
	let installPrompt = null;

	// Browsers only allow audio after a click or key press, so this runs on each one.
	// The tune pauses while the tab is hidden: a sleeping tab can't keep time.
	function audio() {
		sfx.unlock();
		const { ctx } = sfx;
		if (!ctx) return;
		if (!musicOn || document.hidden) music.stop();
		else if (ctx.state === 'running') music.start(ctx);
		else ctx.resume().then(() => { if (musicOn && !document.hidden) music.start(ctx); }, () => {});
	}

	// On a phone the farm can sit behind the page, between the top bar and the
	// Tend button (the CSS only acts on narrow screens). It needs to know how
	// tall those two bars are, which depends on the phone.
	function measureBars() {
		const px = id => `${document.getElementById(id).offsetHeight}px`;
		document.documentElement.style.setProperty('--top-h', px('top'));
		document.documentElement.style.setProperty('--tend-h', px('tendbar'));
	}
	function backdrop() {
		document.body.classList.toggle('backdrop', farmBehind);
		view.backdrop(farmBehind);
		measureBars();
	}

	// Keeping the screen awake is opt-in (it costs battery) and has to be asked
	// for again each time the page comes back into view.
	async function wake() {
		const can = 'wakeLock' in navigator;
		view.awake(can ? keepAwake : null);
		if (!can) return;
		try {
			if (keepAwake && !document.hidden) wakeLock = await navigator.wakeLock.request('screen');
			else if (!keepAwake) {
				await wakeLock?.release();
				wakeLock = null;
			}
		} catch (e) { /* the system said no (low battery, say): nothing to do */ }
	}

	// Open the page with #perf on the end of the address to see how hard the
	// device is working: frames a second, and milliseconds of work in each.
	// Left out of the shipping app.
	const perf = !globalThis.BEANSTALK_SHIP && location.hash === '#perf' ? { frames: 0, work: 0, since: seconds(), el: null } : null;
	function meter(began) {
		if (!perf) return;
		perf.frames++;
		perf.work += seconds() - began;
		if (began - perf.since < 1) return;
		if (!perf.el) {
			perf.el = document.createElement('div');
			perf.el.style.cssText = 'position:fixed;left:4px;bottom:4px;z-index:99;font:11px monospace;color:#fff;background:#000a;padding:2px 5px;pointer-events:none';
			document.body.append(perf.el);
		}
		perf.el.textContent = `${Math.round(perf.frames / (began - perf.since))} fps · ${(perf.work / perf.frames * 1000).toFixed(2)} ms a frame`;
		perf.frames = 0;
		perf.work = 0;
		perf.since = began;
	}

	return {
		meter,

		// A short buzz on phones that can (Android; iPhones ignore it).
		buzz(pattern) {
			try { navigator.vibrate?.(pattern); } catch (e) { /* not allowed here */ }
		},

		// The switches in the top bar and the Menu.
		toggleMute() {
			sfx.muted = !sfx.muted;
			store.set('muted', sfx.muted);
			view.muted(sfx.muted);
		},
		toggleMusic() {
			musicOn = !musicOn;
			store.set('music', musicOn);
			view.music(musicOn);
			audio();
		},
		toggleBackdrop() {
			farmBehind = !farmBehind;
			store.set('backdrop', farmBehind);
			backdrop();
		},
		toggleAwake() {
			keepAwake = !keepAwake;
			store.set('awake', keepAwake);
			wake();
		},
		async install() {
			if (!installPrompt) return;
			installPrompt.prompt();
			await installPrompt.userChoice;
			installPrompt = null;
			view.installable(false);
		},

		// Call once, when the page is ready.
		start() {
			view.muted(sfx.muted);
			view.music(musicOn);
			backdrop();
			wake();
			addEventListener('resize', measureBars);
			// The date over the farm fades out once the page is scrolled across it (see the CSS).
			addEventListener('scroll', () => document.body.classList.toggle('scrolled', scrollY > 40), { passive: true });

			// The browser offers to install the game once it has seen the manifest and
			// the service worker; keep the offer for the Menu's Install button.
			addEventListener('beforeinstallprompt', e => {
				e.preventDefault();
				installPrompt = e;
				view.installable(true);
			});
			addEventListener('appinstalled', () => view.installable(false));

			document.addEventListener('visibilitychange', () => {
				if (!document.hidden) wake();
				if (sfx.ctx) audio();
			});
			// Phones differ on which event counts as "the user did something", so listen to all of them.
			for (const type of ['pointerup', 'touchend', 'click', 'keydown']) document.addEventListener(type, audio);

			// In the phone app, Android's back button closes whatever card is open; with
			// nothing open it puts the app away (it keeps running, as the home button does).
			const phone = globalThis.Capacitor?.Plugins?.App;
			phone?.addListener('backButton', () => {
				if (!view.closeOverlay()) phone.minimizeApp();
			});

			// The service worker makes the game open offline and always fetch the newest
			// files when online (see sw.js). Browsers only allow it on https or localhost.
			// The phone app (tools/build-app.mjs) is already offline and leaves it out.
			if (!globalThis.BEANSTALK_APP && 'serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
		},
	};
}
