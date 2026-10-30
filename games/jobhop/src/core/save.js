// Cleaning what comes back from storage. Anything odd falls back to a default.

export function loadJobXp(raw, JOBS) {
	const out = {};
	for (const id of Object.keys(JOBS)) {
		const v = raw?.[id];
		out[id] = Number.isFinite(v) && v > 0 ? v : 0;
	}
	return out;
}

export function loadPicks(raw, unlocked, fallback) {
	const ok = Array.isArray(raw) && raw.length === 2 && raw[0] !== raw[1] && raw.every(id => unlocked.includes(id));
	return ok ? [...raw] : [...fallback];
}
