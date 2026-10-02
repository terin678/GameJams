// Wingmen fly in a V behind the leader: slot 0/1 is the inner pair, 2/3 next.

export function slotOffset(i, spacing) {
	const row = Math.floor(i / 2) + 1;
	const side = i % 2 === 0 ? -1 : 1;
	return { x: side * row * spacing, y: row * spacing * 0.8 };
}

export function formationTargets(leader, count, spacing) {
	return Array.from({ length: count }, (_, i) => {
		const o = slotOffset(i, spacing);
		return { x: leader.x + o.x, y: leader.y + o.y };
	});
}

// Frame-rate independent easing toward a target; `rate` is per second.
export function follow(pos, target, dt, rate) {
	const k = 1 - Math.exp(-rate * dt);
	return { x: pos.x + (target.x - pos.x) * k, y: pos.y + (target.y - pos.y) * k };
}
