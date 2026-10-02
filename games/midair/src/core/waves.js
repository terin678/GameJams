// A stage is a list of waves: { t, type, pattern, x, count?, gap?, dx?, params? }.
// Waves expand to individual timed spawns consumed by a cursor.

export function expandWave(w) {
	const { count = 1, gap = 0.3, dx = 0 } = w;
	return Array.from({ length: count }, (_, i) => ({
		t: w.t + i * gap,
		type: w.type,
		pattern: w.pattern,
		x: w.x + i * dx,
		params: { ...(w.params ?? {}) },
	}));
}

export function buildStage(waves) {
	// Stable sort keeps authoring order for same-time spawns.
	return waves
		.flatMap((w, wave) => expandWave(w).map(s => ({
			...s,
			wave,
			waveSize: w.count ?? 1,
			...(w.reward ? { reward: w.reward } : {}),
		})))
		.sort((a, b) => a.t - b.t);
}

export const createCursor = spawns => ({ spawns, idx: 0 });

export function takeDue(cursor, t) {
	const due = [];
	while (cursor.idx < cursor.spawns.length && cursor.spawns[cursor.idx].t <= t) {
		due.push(cursor.spawns[cursor.idx++]);
	}
	return due;
}

export const isDone = cursor => cursor.idx >= cursor.spawns.length;

// After the boss the stage loops, harder.
export function difficulty(loop) {
	return { hp: 1 + 0.5 * loop, speed: 1 + 0.12 * loop, fire: 1 + 0.3 * loop };
}
