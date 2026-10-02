// The quantum powers. Timers live in a plain { kind: untilMs } object.
import { mirrorDir } from './move.js';

export const createPowers = () => ({});

// Picking one up again restarts its timer from now.
export function activate(p, kind, nowMs, durationMs) {
	p[kind] = nowMs + durationMs;
}

export const isActive = (p, kind, nowMs) => nowMs < (p[kind] ?? 0);
export const remaining = (p, kind, nowMs) => Math.max(0, (p[kind] ?? 0) - nowMs);

// Superposition: a mirror-image twin across the maze's centre line, moving
// the mirrored way. Steer right and the twin goes left.
export function splitOff(m, cols) {
	return { ...m, col: cols - 1 - m.col, dir: mirrorDir(m.dir), want: mirrorDir(m.want) };
}

// An observer caught one copy: the wave function collapses to the other.
export const collapseTo = (copies, survivor) => copies.filter(c => c === survivor);

// Superposition ran out: which copy turns out to be real is a coin flip.
export const observe = (copies, rng) => copies[Math.floor(rng.next() * copies.length)];

// Tunnel/split items appear every `every` quanta eaten, cycling through kinds.
export function nextItem(state, eaten, cfg) {
	if (eaten < (state.spawned + 1) * cfg.every) return null;
	state.spawned++;
	return cfg.cycle[(state.spawned - 1) % cfg.cycle.length];
}

// Eating measured observers in one go: 200, 400, 800, 1600.
export const eatChainScore = (i, base) => base * 2 ** Math.min(i, 3);
