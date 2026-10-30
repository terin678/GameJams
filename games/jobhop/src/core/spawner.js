// The stage is spawn windows plus one-off events (data/stage.js):
//   windows: [{ from, to, type, everyMs, burst?, max }]   seconds; max is per type alive
//   events:  [{ at, type, count }]                       elites and the boss

export function createSpawner(stage) {
	return {
		timers: stage.windows.map(() => 0),
		events: [...stage.events].sort((a, b) => a.at - b.at),
		eventIdx: 0,
	};
}

// Enemy types to spawn this frame. `alive` counts live enemies by type.
export function dueSpawns(sp, stage, t, dtMs, alive, total, cap) {
	const out = [];
	const counts = { ...alive };
	stage.windows.forEach((w, i) => {
		if (t < w.from || t >= w.to) return;
		sp.timers[i] += dtMs;
		while (sp.timers[i] >= w.everyMs) {
			sp.timers[i] -= w.everyMs;
			for (let b = 0; b < (w.burst ?? 1); b++) {
				if ((counts[w.type] ?? 0) >= w.max || total + out.length >= cap) break;
				counts[w.type] = (counts[w.type] ?? 0) + 1;
				out.push(w.type);
			}
		}
	});
	return out;
}

export function dueEvents(sp, stage, t) {
	const out = [];
	while (sp.eventIdx < sp.events.length && sp.events[sp.eventIdx].at <= t) out.push(sp.events[sp.eventIdx++]);
	return out;
}

export function ringPosition(rng, cx, cy, radius) {
	const a = rng.next() * Math.PI * 2;
	return { x: cx + Math.cos(a) * radius, y: cy + Math.sin(a) * radius };
}

// Common enemies toughen up as the clock runs; elites and bosses are authored as-is.
export function enemyHp(def, t, difficulty) {
	if (def.elite || def.boss) return def.hp;
	return def.hp * (1 + difficulty.hpPerMinute * t / 60);
}
