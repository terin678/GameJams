// Auto-attack geometry and scaling. Shapes: arc, line, projectile, orbit.

const DEG = Math.PI / 180;
const DEFAULT_SPREAD_PER_SHOT = 12; // degrees, when a def has no spreadDeg

// Resolve a data definition at an attack level under the current stats.
export function attackAt(def, level, stats) {
	const lv = level - 1;
	const per = def.perLevel ?? {};
	const area = stats.area * (1 + (per.area ?? 0) * lv);
	const a = {
		...def,
		level,
		damage: def.damage * (1 + (per.damage ?? 0) * lv) * stats.might,
		count: (def.count ?? 1) + Math.floor((per.count ?? 0) * lv),
		knockback: def.knockback ?? 0,
	};
	if (def.cooldownMs) a.cooldownMs = def.cooldownMs * (1 - (per.cooldown ?? 0) * lv) / stats.haste;
	for (const k of ['range', 'length', 'width', 'orbit', 'hitRadius', 'radius']) {
		if (def[k] !== undefined) a[k] = def[k] * area;
	}
	return a;
}

// Unit vector from (x, y) to the target, or the facing when there is none.
export function aimAt(x, y, target, facing) {
	if (!target) return facing;
	const dx = target.x - x, dy = target.y - y;
	const d = Math.hypot(dx, dy);
	return d < 1e-6 ? facing : { x: dx / d, y: dy / d };
}

export function inArc(px, py, dx, dy, range, arcDeg, ex, ey, er) {
	const vx = ex - px, vy = ey - py;
	const d = Math.hypot(vx, vy);
	if (d > range + er) return false;
	if (d <= er) return true;
	const cos = (vx * dx + vy * dy) / d;
	// Widen the cone by the enemy's angular size so edges count.
	const half = arcDeg / 2 * DEG + Math.asin(Math.min(1, er / d));
	return cos >= Math.cos(Math.min(Math.PI, half));
}

export function inLine(px, py, dx, dy, length, width, ex, ey, er) {
	const vx = ex - px, vy = ey - py;
	const along = vx * dx + vy * dy;
	if (along < -er || along > length + er) return false;
	return Math.abs(vx * dy - vy * dx) <= width / 2 + er;
}

export function spreadDirections(dir, count, spreadDeg) {
	if (count <= 1) return [dir];
	const total = (spreadDeg ?? DEFAULT_SPREAD_PER_SHOT * (count - 1)) * DEG;
	const base = Math.atan2(dir.y, dir.x);
	return Array.from({ length: count }, (_, i) => {
		const a = base - total / 2 + (total * i) / (count - 1);
		return { x: Math.cos(a), y: Math.sin(a) };
	});
}

// Homing: rotate velocity toward (tx, ty) by at most turnRate rad/s.
export function turnToward(p, tx, ty, turnRate, dt) {
	const speed = Math.hypot(p.vx, p.vy);
	const cur = Math.atan2(p.vy, p.vx);
	const want = Math.atan2(ty - p.y, tx - p.x);
	let diff = want - cur;
	while (diff > Math.PI) diff -= 2 * Math.PI;
	while (diff < -Math.PI) diff += 2 * Math.PI;
	const max = turnRate * dt;
	const a = cur + Math.max(-max, Math.min(max, diff));
	p.vx = Math.cos(a) * speed;
	p.vy = Math.sin(a) * speed;
}

export function orbitPositions(cx, cy, count, radius, angle) {
	return Array.from({ length: count }, (_, i) => {
		const a = angle + (2 * Math.PI * i) / count;
		return { x: cx + Math.cos(a) * radius, y: cy + Math.sin(a) * radius, a };
	});
}

// The closest live item within maxDist; `skip(item)` true leaves an item out.
export function nearest(items, x, y, maxDist = Infinity, skip = null) {
	let best = null, bestD = maxDist * maxDist;
	for (const it of items) {
		if (it.dead || skip?.(it)) continue;
		const dx = it.x - x, dy = it.y - y, d = dx * dx + dy * dy;
		if (d <= bestD) { best = it; bestD = d; }
	}
	return best;
}
