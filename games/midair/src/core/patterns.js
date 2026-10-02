// Enemy flight paths as pure functions of age (seconds). Waves name a pattern
// and pass params; p always has { x0, speed, width, height }.

const ENTRY_Y = -40;

export const PATTERNS = {
	straight: (t, p) => ({ x: p.x0 + (p.vx ?? 0) * t, y: ENTRY_Y + p.speed * t }),

	sine: (t, p) => ({ x: p.x0 + p.amp * Math.sin(t * p.freq), y: ENTRY_Y + p.speed * t }),

	// Peels off toward dir (+1 right, -1 left).
	swoop: (t, p) => ({ x: p.x0 + p.dir * p.amp * (1 - Math.cos(Math.min(t * p.freq, Math.PI))), y: ENTRY_Y + p.speed * t }),

	// Dives to `depth` at dur/2, then climbs back off the top.
	uturn: (t, p) => ({ x: p.x0 + (p.vx ?? 0) * t, y: ENTRY_Y + p.depth * Math.sin(Math.PI * t / p.dur) }),

	// Crosses the screen horizontally at y0, entering from the side opposite dir.
	side: (t, p) => ({
		x: (p.dir > 0 ? -40 : p.width + 40) + p.dir * p.speed * t,
		y: p.y0 + (p.amp ?? 0) * Math.sin(t * (p.freq ?? 1)),
	}),

	// Boss entry: descend to targetY, then sway around the centre.
	hover: (t, p) => ({
		x: p.width / 2 + p.amp * Math.sin(t * 0.5),
		y: Math.min(p.targetY, -80 + p.speed * t),
	}),
};

export function positionAt(name, t, p) {
	const fn = PATTERNS[name];
	if (!fn) throw new Error(`unknown pattern "${name}"`);
	return fn(t, p);
}

export const isOffscreen = (pos, w, h, margin) =>
	pos.x < -margin || pos.x > w + margin || pos.y < -margin * 2 || pos.y > h + margin;
