// Animation math: progress, easing, swings, bobs. Phaser-free so it is tested;
// game/fx.js and the scenes turn these numbers into pictures.

export const clamp01 = v => Math.max(0, Math.min(1, v));

// 0 at `born`, 1 at `until`, clamped. A zero-length span counts as done.
export const progress = (now, born, until) => (until <= born ? 1 : clamp01((now - born) / (until - born)));

export const easeOutCubic = t => 1 - (1 - t) ** 3;

// Overshoots past 1 before settling: for things that pop in.
export const easeOutBack = (t, s = 1.70158) => 1 + (s + 1) * (t - 1) ** 3 + s * (t - 1) ** 2;

// A sword swing: the lit sector grows from one edge of the arc to the other
// over the first `sweep` of the effect, then holds while it fades.
export function swingSpan(center, arcRad, t, sweep = 0.55) {
	const from = center - arcRad / 2;
	return { from, to: from + arcRad * easeOutCubic(clamp01(t / sweep)) };
}

// A thrust shoots out to full length in the first 40% of the effect.
export const thrustReach = t => easeOutCubic(clamp01(t / 0.4));

// A walking bounce in px: 0 on the ground, `amp` at the top of each step.
export const bob = (now, phase, periodMs, amp) => Math.abs(Math.sin(((now + phase) / periodMs) * Math.PI)) * amp;

// Squash and stretch after a hit, springing back to 1 at `until`.
export function squash(now, until, ms, amt) {
	if (now >= until) return { x: 1, y: 1 };
	const k = clamp01((until - now) / ms) * amt;
	return { x: 1 + k, y: 1 - k };
}

// A trailing bar (the white "chip" behind HP) drains toward the real value at
// `perSecond` of the full bar, and jumps straight up when the value rises.
export const chase = (shown, target, dt, perSecond) => (target >= shown ? target : Math.max(target, shown - perSecond * dt));
