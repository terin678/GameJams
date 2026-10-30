// Enemy movement: walk at the target, don't stack, get shoved by hits.

export function seek(e, tx, ty, speed, dt) {
	const dx = tx - e.x, dy = ty - e.y;
	const d = Math.hypot(dx, dy);
	if (d < 1e-6) return;
	const step = Math.min(d, speed * dt);
	e.x += (dx / d) * step;
	e.y += (dy / d) * step;
}

// Push e out of any neighbour it overlaps; strength 1 resolves fully at once.
export function separate(e, others, strength = 0.5) {
	for (const o of others) {
		if (o === e) continue;
		let dx = e.x - o.x, dy = e.y - o.y;
		const min = (e.radius ?? 0) + (o.radius ?? 0);
		let d = Math.hypot(dx, dy);
		if (d >= min) continue;
		if (d < 1e-6) { dx = Math.cos(e.x * 12.9898 + e.y * 78.233) || 1; dy = Math.sin(e.x + 1) || 0.5; d = Math.hypot(dx, dy); }
		const push = (min - Math.min(d, min)) * strength;
		e.x += (dx / d) * push;
		e.y += (dy / d) * push;
	}
}

export function knockback(e, fromX, fromY, dist) {
	const dx = e.x - fromX, dy = e.y - fromY;
	const d = Math.hypot(dx, dy);
	if (d < 1e-6 || !dist) return;
	e.x += (dx / d) * dist;
	e.y += (dy / d) * dist;
}

// Speed multiplier for an enemy `ageMs` old: dashers burst at the start of each cycle.
export function speedAt(def, ageMs) {
	const d = def.dash;
	if (!d) return 1;
	return ageMs % d.everyMs < d.ms ? d.mult : 1;
}
