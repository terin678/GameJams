// Tiny WebAudio synth driven by data. A sound is
//   { wave: 'square'|'sine'|'triangle'|'sawtooth'|'noise', f0, f1?, dur?, vol? }
// a pitch sweep from f0 to f1, or { wave, notes: [hz...], dur } for an arpeggio.

const WAVES = ['square', 'sine', 'triangle', 'sawtooth', 'noise'];

export function normalizeSfx(def) {
	return {
		wave: def.wave,
		f0: def.f0 ?? null,
		f1: def.f1 ?? def.f0 ?? null,
		dur: def.dur ?? 0.15,
		vol: def.vol ?? 0.3,
		notes: def.notes ?? null,
	};
}

export function validateSfx(def) {
	const errors = [];
	if (!WAVES.includes(def.wave)) errors.push(`wave "${def.wave}" must be one of ${WAVES.join(', ')}`);
	if (!(def.f0 > 0) && !(def.notes?.length)) errors.push('needs f0 or notes');
	if (def.vol !== undefined && !(def.vol > 0 && def.vol <= 1)) errors.push('vol must be in (0, 1]');
	if (def.dur !== undefined && !(def.dur > 0)) errors.push('dur must be > 0');
	return errors;
}

// A short silent WAV as a data: URI. Looping it in an <audio> element makes an
// iPhone treat the page as media playback, which the ringer switch does not mute.
export function silentWavUri(seconds = 0.5, rate = 8000) {
	const n = Math.floor(seconds * rate);
	const bytes = new Uint8Array(44 + n).fill(128, 44);   // 8-bit silence is 128
	const view = new DataView(bytes.buffer);
	const text = (at, s) => [...s].forEach((c, i) => view.setUint8(at + i, c.charCodeAt(0)));
	text(0, 'RIFF');
	view.setUint32(4, 36 + n, true);
	text(8, 'WAVEfmt ');
	view.setUint32(16, 16, true);    // format chunk size
	view.setUint16(20, 1, true);     // PCM
	view.setUint16(22, 1, true);     // mono
	view.setUint32(24, rate, true);
	view.setUint32(28, rate, true);  // bytes per second
	view.setUint16(32, 1, true);     // bytes per sample
	view.setUint16(34, 8, true);     // bits per sample
	text(36, 'data');
	view.setUint32(40, n, true);
	let binary = '';
	for (const b of bytes) binary += String.fromCharCode(b);
	return `data:audio/wav;base64,${btoa(binary)}`;
}

// iPhones and iPads (which can claim to be Macs).
export const isIOS = (nav = globalThis.navigator) =>
	/iPad|iPhone|iPod/.test(nav?.userAgent ?? '') || (nav?.platform === 'MacIntel' && nav?.maxTouchPoints > 1);

export class Sfx {
	constructor(defs, { muted = false } = {}) {
		this.defs = defs;
		this.muted = muted;
		this.ctx = null;
		this.noise = null;
	}

	// Browsers only allow audio after a user gesture; call this from one
	// (a click, a touchend or a key press), every time, until it is running.
	unlock() {
		if (!this.ctx) {
			const AC = globalThis.AudioContext ?? globalThis.webkitAudioContext;
			if (!AC) return;
			// iPhones mute web audio when the ringer switch is off, unless the page
			// says it is playing media (Safari 16.4 and later).
			try {
				const session = globalThis.navigator?.audioSession;
				if (session) session.type = 'playback';
			} catch (e) { /* not supported: the silent loop below covers it */ }
			if (isIOS() && globalThis.Audio) {
				this.keepAlive = new Audio(silentWavUri());
				this.keepAlive.loop = true;
				this.keepAlive.setAttribute('playsinline', '');
				// Don't hold the phone's audio while the page is in the background;
				// the next tap starts it again.
				globalThis.document?.addEventListener('visibilitychange', () => {
					if (globalThis.document.hidden) this.keepAlive.pause();
				});
			}
			this.ctx = new AC();
			this.master = this.ctx.createGain();
			this.master.gain.value = 0.5;
			this.master.connect(this.ctx.destination);
			const len = this.ctx.sampleRate;
			this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
			const data = this.noise.getChannelData(0);
			for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
		}
		// Must be started from a gesture; try again on each one until it takes.
		if (this.keepAlive?.paused) this.keepAlive.play()?.catch?.(() => {});
		if (this.ctx.state === 'running') return;
		// Phones often hand over a suspended context even inside a gesture. Ask
		// for it to start, and play one silent sample: older iOS only unlocks
		// audio when a sound is actually started from the gesture.
		this.ctx.resume?.()?.catch?.(() => {});
		const tick = this.ctx.createBufferSource();
		tick.buffer = this.ctx.createBuffer(1, 1, this.ctx.sampleRate);
		tick.connect(this.ctx.destination);
		tick.start(0);
	}

	play(name) {
		if (this.muted || !this.ctx || this.ctx.state !== 'running') return;
		const def = this.defs[name];
		if (!def) return;
		const s = normalizeSfx(def);
		const t0 = this.ctx.currentTime;
		const gain = this.ctx.createGain();
		gain.gain.setValueAtTime(s.vol, t0);
		gain.gain.exponentialRampToValueAtTime(0.001, t0 + s.dur);
		gain.connect(this.master);

		if (s.wave === 'noise') {
			const src = this.ctx.createBufferSource();
			src.buffer = this.noise;
			const filter = this.ctx.createBiquadFilter();
			filter.type = 'lowpass';
			filter.frequency.setValueAtTime(s.f0, t0);
			filter.frequency.exponentialRampToValueAtTime(Math.max(20, s.f1), t0 + s.dur);
			src.connect(filter).connect(gain);
			src.start(t0, Math.random() * 0.5);
			src.stop(t0 + s.dur);
			return;
		}

		const osc = this.ctx.createOscillator();
		osc.type = s.wave;
		if (s.notes) {
			const step = s.dur / s.notes.length;
			s.notes.forEach((hz, i) => osc.frequency.setValueAtTime(hz, t0 + i * step));
		} else {
			osc.frequency.setValueAtTime(s.f0, t0);
			osc.frequency.exponentialRampToValueAtTime(Math.max(20, s.f1), t0 + s.dur);
		}
		osc.connect(gain);
		osc.start(t0);
		osc.stop(t0 + s.dur);
	}
}
