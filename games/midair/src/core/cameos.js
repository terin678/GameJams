// Surprise guests (the monster truck) that show up every now and then.
// State is { id: nextAtMs } on the play clock.

export function createCameos(defs) {
	const c = {};
	for (const [id, d] of Object.entries(defs)) c[id] = d.firstMs;
	return c;
}

// Ids due at `now`, each rescheduled. While blocked (boss, intermission),
// due cameos wait and fire as soon as the way is clear.
export function dueCameos(state, defs, now, rng, { blocked = false } = {}) {
	if (blocked) return [];
	const due = [];
	for (const [id, d] of Object.entries(defs)) {
		if (now < state[id]) continue;
		state[id] = now + rng.range(d.everyMs[0], d.everyMs[1]);
		due.push(id);
	}
	return due;
}
