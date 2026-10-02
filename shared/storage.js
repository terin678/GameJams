// Namespaced localStorage with an in-memory fallback, plus a top-N score table.
// Pure JS: the backend is injectable so tests run headless.

export function memoryBackend() {
	const map = new Map();
	return {
		getItem: k => (map.has(k) ? map.get(k) : null),
		setItem: (k, v) => map.set(k, String(v)),
	};
}

function defaultBackend() {
	try { return globalThis.localStorage ?? null; } catch (e) { return null; }
}

// Every read and write is guarded: private windows and blocked site data throw.
// Values set this session are mirrored in memory so the game still behaves.
export function createStore(namespace, backend = defaultBackend()) {
	const prefix = `gamejams.${namespace}.`;
	const memory = new Map();
	return {
		get(key, fallback = null) {
			if (memory.has(key)) return memory.get(key);
			try {
				const raw = backend?.getItem(prefix + key);
				if (raw === null || raw === undefined) return fallback;
				return JSON.parse(raw);
			} catch (e) {
				return fallback;
			}
		},
		set(key, value) {
			memory.set(key, value);
			try { backend?.setItem(prefix + key, JSON.stringify(value)); } catch (e) { /* memory only */ }
		},
	};
}

const isEntry = e => e && typeof e.name === 'string' && Number.isFinite(e.score);
const cleanName = name => String(name).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3) || '???';

export function createScoreTable(store, { key = 'scores', max = 5 } = {}) {
	const list = () => {
		const raw = store.get(key, []);
		return (Array.isArray(raw) ? raw.filter(isEntry) : [])
			.sort((a, b) => b.score - a.score)
			.slice(0, max);
	};
	return {
		list,
		best: () => list()[0]?.score ?? 0,
		qualifies(score) {
			if (!(score > 0)) return false;
			const l = list();
			return l.length < max || score > l.at(-1).score;
		},
		// Returns { rank, isBest }; rank is -1 when the score didn't make the board.
		add(name, score) {
			const before = list();
			const entry = { name: cleanName(name), score };
			// Stable: a new score ranks below existing equal scores.
			const l = [...before, entry].sort((a, b) => b.score - a.score).slice(0, max);
			store.set(key, l);
			return { rank: l.indexOf(entry), isBest: !before.length || score > before[0].score };
		},
	};
}
