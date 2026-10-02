// Stage 1: over the harbour city. Times are seconds from stage start.
// { t, type, pattern, x, count?, gap?, dx?, params? }; see core/patterns.js.
// Sky waves teach splatting, low waves teach bombing, then they overlap.
const swoopR = { amp: 140, freq: 1.4, dir: 1 };
const swoopL = { amp: 140, freq: 1.4, dir: -1 };

export const STAGE = [
	// Warm-up: sky only.
	{ t: 1.5, type: 'prop', pattern: 'straight', x: 140, count: 4, gap: 0.35 },
	{ t: 3.5, type: 'prop', pattern: 'straight', x: 340, count: 4, gap: 0.35 },
	{ t: 6, type: 'prop', pattern: 'swoop', x: 90, count: 5, gap: 0.3, params: swoopR },
	{ t: 8.5, type: 'prop', pattern: 'swoop', x: 390, count: 5, gap: 0.3, params: swoopL },

	// First cars below: bombs.
	{ t: 11, type: 'car', pattern: 'straight', x: 240, count: 3, gap: 1.1 },
	{ t: 14, type: 'car', pattern: 'sine', x: 140, count: 3, gap: 1, params: { amp: 40, freq: 1.5 } },
	{ t: 15, type: 'car', pattern: 'sine', x: 340, count: 3, gap: 1, params: { amp: 40, freq: 1.5 } },

	// Mixed.
	{ t: 19, type: 'drone', pattern: 'side', x: 0, count: 6, gap: 0.35, params: { y0: 150, dir: 1, amp: 20, freq: 3 } },
	{ t: 20, type: 'car', pattern: 'straight', x: 100, count: 2, gap: 1.4, dx: 60 },
	{ t: 22, type: 'drone', pattern: 'side', x: 480, count: 6, gap: 0.35, params: { y0: 230, dir: -1, amp: 20, freq: 3 } },
	{ t: 24, type: 'prop', pattern: 'uturn', x: 120, count: 3, gap: 0.5, dx: 120, params: { depth: 380, dur: 4 } },

	// Taxis climb up to your level: bomb them early or splat them late.
	{ t: 28, type: 'taxi', pattern: 'straight', x: 160, count: 2, gap: 0.8, dx: 160 },
	{ t: 30, type: 'prop', pattern: 'swoop', x: 80, count: 5, gap: 0.3, params: swoopR },
	{ t: 32, type: 'taxi', pattern: 'sine', x: 240, count: 3, gap: 0.9, params: { amp: 70, freq: 1.2 } },
	{ t: 35, type: 'van', pattern: 'straight', x: 240 },
	{ t: 36, type: 'prop', pattern: 'straight', x: 80, count: 4, gap: 0.35 },
	{ t: 37, type: 'prop', pattern: 'straight', x: 400, count: 4, gap: 0.35 },

	// Jets.
	{ t: 42, type: 'jet', pattern: 'straight', x: 240 },
	{ t: 44, type: 'car', pattern: 'sine', x: 120, count: 4, gap: 0.8, params: { amp: 30, freq: 2 } },
	{ t: 45, type: 'car', pattern: 'sine', x: 360, count: 4, gap: 0.8, params: { amp: 30, freq: 2 } },
	{ t: 48, type: 'jet', pattern: 'swoop', x: 120, params: { amp: 200, freq: 0.9, dir: 1 } },
	{ t: 49, type: 'jet', pattern: 'swoop', x: 360, params: { amp: 200, freq: 0.9, dir: -1 } },
	{ t: 52, type: 'drone', pattern: 'sine', x: 120, count: 8, gap: 0.25, params: { amp: 60, freq: 3 } },
	{ t: 54, type: 'drone', pattern: 'sine', x: 360, count: 8, gap: 0.25, params: { amp: 60, freq: 3 } },

	// The blimp, with escorts.
	{ t: 60, type: 'blimp', pattern: 'straight', x: 240 },
	{ t: 62, type: 'prop', pattern: 'swoop', x: 90, count: 4, gap: 0.35, params: swoopR },
	{ t: 65, type: 'prop', pattern: 'swoop', x: 390, count: 4, gap: 0.35, params: swoopL },
	{ t: 68, type: 'taxi', pattern: 'straight', x: 120, count: 3, gap: 0.6, dx: 120 },
	{ t: 72, type: 'prop', pattern: 'uturn', x: 100, count: 4, gap: 0.4, dx: 90, params: { depth: 420, dur: 4.5 } },

	// Rush hour.
	{ t: 78, type: 'van', pattern: 'sine', x: 140, params: { amp: 50, freq: 0.8 } },
	{ t: 79, type: 'van', pattern: 'sine', x: 340, params: { amp: 50, freq: 0.8 } },
	{ t: 80, type: 'car', pattern: 'straight', x: 60, count: 5, gap: 0.7, dx: 90 },
	{ t: 83, type: 'drone', pattern: 'side', x: 0, count: 8, gap: 0.3, params: { y0: 120, dir: 1 } },
	{ t: 85, type: 'jet', pattern: 'straight', x: 160 },
	{ t: 86, type: 'jet', pattern: 'straight', x: 320 },
	{ t: 90, type: 'taxi', pattern: 'sine', x: 240, count: 4, gap: 0.7, params: { amp: 120, freq: 1 } },
	{ t: 94, type: 'prop', pattern: 'swoop', x: 90, count: 6, gap: 0.25, params: swoopR },
	{ t: 95, type: 'prop', pattern: 'swoop', x: 390, count: 6, gap: 0.25, params: swoopL },

	// Second blimp pair + jets.
	{ t: 100, type: 'blimp', pattern: 'sine', x: 140, params: { amp: 30, freq: 0.5 } },
	{ t: 104, type: 'blimp', pattern: 'sine', x: 340, params: { amp: 30, freq: 0.5 } },
	{ t: 102, type: 'jet', pattern: 'swoop', x: 100, params: { amp: 220, freq: 0.9, dir: 1 } },
	{ t: 106, type: 'jet', pattern: 'swoop', x: 380, params: { amp: 220, freq: 0.9, dir: -1 } },
	{ t: 108, type: 'drone', pattern: 'side', x: 480, count: 8, gap: 0.3, params: { y0: 180, dir: -1, amp: 30, freq: 2 } },
	{ t: 112, type: 'car', pattern: 'sine', x: 240, count: 6, gap: 0.5, params: { amp: 150, freq: 1.2 } },
	{ t: 116, type: 'taxi', pattern: 'straight', x: 80, count: 4, gap: 0.5, dx: 105 },
	{ t: 120, type: 'van', pattern: 'straight', x: 240 },
	{ t: 121, type: 'prop', pattern: 'uturn', x: 60, count: 5, gap: 0.3, dx: 90, params: { depth: 450, dur: 4 } },
	{ t: 126, type: 'jet', pattern: 'straight', x: 120 },
	{ t: 126, type: 'jet', pattern: 'straight', x: 360 },
	{ t: 130, type: 'car', pattern: 'straight', x: 60, count: 6, gap: 0.5, dx: 70 },
	{ t: 134, type: 'drone', pattern: 'sine', x: 240, count: 10, gap: 0.2, params: { amp: 160, freq: 2 } },

	// Boss.
	{ t: 142, type: 'airship', pattern: 'hover', x: 240, params: { targetY: 170, amp: 120 } },
];
