// Looping background music from data, played with WebAudio. A song is
//   { bpm, stepsPerBeat, beatsPerBar, swing?, volume?, lowpass?, crackle?,
//     voices: { name: { wave, attack?, release?, vol?, detune?, lowpass? } | { drum: 'kick'|'snare'|'hat', vol? } },
//     drums: { voiceName: [steps...] },            played in every bar
//     bars: [{ voiceName: [[step, note | [notes], lengthInSteps], ...] }] }   played in order, looping
// Notes are names like 'C4', 'F#3', 'Bb2'. The maths is pure; Music needs a browser.

const SEMITONES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const WAVES = ['sine', 'triangle', 'square', 'sawtooth'];
const DRUMS = ['kick', 'snare', 'hat'];

export function noteHz(name) {
	const m = /^([A-G])([#b]?)(\d)$/.exec(name);
	if (!m) return null;
	const midi = SEMITONES[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (Number(m[3]) + 1) * 12;
	return 440 * 2 ** ((midi - 69) / 12);
}

export const stepSeconds = song => 60 / song.bpm / song.stepsPerBeat;
export const stepsPerBar = song => song.stepsPerBeat * song.beatsPerBar;

// Seconds from the start of a bar to a step. Odd steps land late by `swing` of a step.
export function stepOffset(song, step) {
	const d = stepSeconds(song);
	return step * d + (step % 2 ? (song.swing ?? 0) * d : 0);
}

// Everything that sounds in one bar: [{ voice, step, steps, hz }]; drums have hz null.
export function barEvents(song, index) {
	const bar = song.bars[index % song.bars.length];
	const events = [];
	for (const [voice, notes] of Object.entries(bar)) {
		for (const [step, note, steps] of notes) {
			for (const n of [].concat(note)) events.push({ voice, step, steps, hz: noteHz(n) });
		}
	}
	for (const [voice, steps] of Object.entries(song.drums ?? {})) {
		for (const step of steps) events.push({ voice, step, steps: 1, hz: null });
	}
	return events;
}

export function validateSong(song) {
	const errors = [];
	for (const k of ['bpm', 'stepsPerBeat', 'beatsPerBar']) if (!(song[k] > 0)) errors.push(`${k} must be > 0`);
	const perBar = stepsPerBar(song);
	const inBar = s => Number.isInteger(s) && s >= 0 && s < perBar;
	const voices = song.voices ?? {};
	for (const [name, v] of Object.entries(voices)) {
		if (v.drum !== undefined) {
			if (!DRUMS.includes(v.drum)) errors.push(`voice ${name}: drum "${v.drum}" must be one of ${DRUMS.join(', ')}`);
		} else if (!WAVES.includes(v.wave)) errors.push(`voice ${name}: wave "${v.wave}" must be one of ${WAVES.join(', ')}`);
	}
	for (const [name, steps] of Object.entries(song.drums ?? {})) {
		if (voices[name]?.drum === undefined) errors.push(`drums: "${name}" is not a drum voice`);
		for (const s of steps) if (!inBar(s)) errors.push(`drums ${name}: step ${s} is outside the bar`);
	}
	if (!song.bars?.length) errors.push('bars is empty');
	(song.bars ?? []).forEach((bar, i) => {
		for (const [name, notes] of Object.entries(bar)) {
			if (!voices[name] || voices[name].drum !== undefined) errors.push(`bar ${i}: "${name}" is not a tone voice`);
			for (const [step, note, steps] of notes) {
				if (!inBar(step)) errors.push(`bar ${i} ${name}: step ${step} is outside the bar`);
				if (!(steps > 0)) errors.push(`bar ${i} ${name}: length must be > 0`);
				for (const n of [].concat(note)) if (noteHz(n) === null) errors.push(`bar ${i} ${name}: "${n}" is not a note`);
			}
		}
	});
	return errors;
}

const LOOKAHEAD = 1;      // seconds of music kept scheduled ahead of the clock
const PUMP_MS = 200;

export class Music {
	constructor(song) {
		this.song = song;
		this.ctx = null;
		this.timer = null;
	}

	get playing() {
		return this.timer !== null;
	}

	// `ctx` is an AudioContext that a user gesture has already unlocked.
	start(ctx) {
		if (this.playing || !ctx) return;
		if (this.ctx !== ctx) this.build(ctx);
		const now = ctx.currentTime;
		this.out.gain.cancelScheduledValues(now);
		this.out.gain.setTargetAtTime(this.song.volume ?? 0.5, now, 0.4);
		this.bar = 0;
		this.nextBar = now + 0.1;
		this.timer = setInterval(() => this.pump(), PUMP_MS);
		this.pump();
	}

	// Fades out; notes already scheduled die away under the fade.
	stop() {
		if (!this.playing) return;
		clearInterval(this.timer);
		this.timer = null;
		const now = this.ctx.currentTime;
		this.out.gain.cancelScheduledValues(now);
		this.out.gain.setTargetAtTime(0, now, 0.15);
	}

	build(ctx) {
		this.ctx = ctx;
		this.out = ctx.createGain();
		this.out.gain.value = 0;
		const tone = ctx.createBiquadFilter();
		tone.type = 'lowpass';
		tone.frequency.value = this.song.lowpass ?? 3000;
		this.out.connect(tone).connect(ctx.destination);

		const len = ctx.sampleRate * 2;
		this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
		const data = this.noise.getChannelData(0);
		for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

		// Vinyl crackle: sparse clicks, looping quietly under everything.
		if (this.song.crackle > 0) {
			const dust = ctx.createBuffer(1, len, ctx.sampleRate);
			const d = dust.getChannelData(0);
			for (let i = 0; i < len; i++) d[i] = Math.random() < 0.0012 ? Math.random() * 2 - 1 : 0;
			const src = ctx.createBufferSource();
			src.buffer = dust;
			src.loop = true;
			const g = ctx.createGain();
			g.gain.value = this.song.crackle;
			src.connect(g).connect(this.out);
			src.start();
		}
	}

	pump() {
		const { ctx, song } = this;
		// A sleeping tab can leave the schedule in the past; pick up from now.
		if (this.nextBar < ctx.currentTime) this.nextBar = ctx.currentTime + 0.05;
		while (this.nextBar < ctx.currentTime + LOOKAHEAD) {
			for (const e of barEvents(song, this.bar)) {
				const t = this.nextBar + stepOffset(song, e.step);
				const voice = song.voices[e.voice];
				if (voice.drum) this.drum(voice, t);
				else this.tone(voice, e.hz, t, e.steps * stepSeconds(song));
			}
			this.nextBar += stepsPerBar(song) * stepSeconds(song);
			this.bar = (this.bar + 1) % song.bars.length;
		}
	}

	envelope(vol, t, attack, end) {
		const g = this.ctx.createGain();
		g.gain.setValueAtTime(0.0001, t);
		g.gain.linearRampToValueAtTime(vol, t + attack);
		g.gain.exponentialRampToValueAtTime(0.0001, end);
		return g;
	}

	tone(voice, hz, t, dur) {
		const { ctx } = this;
		const end = t + dur + (voice.release ?? 0.3);
		const g = this.envelope(voice.vol ?? 0.1, t, voice.attack ?? 0.01, end);
		let dest = g;
		if (voice.lowpass) {
			const f = ctx.createBiquadFilter();
			f.type = 'lowpass';
			f.frequency.value = voice.lowpass;
			f.connect(g);
			dest = f;
		}
		g.connect(this.out);
		// Two slightly detuned oscillators give the wobbly, worn-tape sound.
		for (const cents of voice.detune ? [-voice.detune, voice.detune] : [0]) {
			const osc = ctx.createOscillator();
			osc.type = voice.wave;
			osc.frequency.value = hz;
			osc.detune.value = cents;
			osc.connect(dest);
			osc.start(t);
			osc.stop(end);
		}
	}

	drum(voice, t) {
		const { ctx } = this;
		const vol = voice.vol ?? 0.2;
		if (voice.drum === 'kick') {
			const end = t + 0.22;
			const osc = ctx.createOscillator();
			osc.frequency.setValueAtTime(110, t);
			osc.frequency.exponentialRampToValueAtTime(40, t + 0.12);
			const g = this.envelope(vol, t, 0.004, end);
			osc.connect(g).connect(this.out);
			osc.start(t);
			osc.stop(end);
			return;
		}
		const hat = voice.drum === 'hat';
		const end = t + (hat ? 0.05 : 0.16);
		const src = ctx.createBufferSource();
		src.buffer = this.noise;
		const f = ctx.createBiquadFilter();
		f.type = hat ? 'highpass' : 'bandpass';
		f.frequency.value = hat ? 6000 : 1700;
		const g = this.envelope(vol, t, 0.002, end);
		src.connect(f).connect(g).connect(this.out);
		src.start(t, Math.random());
		src.stop(end);
	}
}
