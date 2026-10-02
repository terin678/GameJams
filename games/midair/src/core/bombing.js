// The bomb: poop dropped onto the low layer at a reticle ahead of the bird.
const clamp01 = v => Math.min(1, Math.max(0, v));
const lerp = (a, b, t) => a + (b - a) * t;

export function reticleFor(bird, cfg) {
	return { x: bird.x, y: bird.y - cfg.offset };
}

// Holding the button charges a bigger, pricier splat.
export function charge(heldMs, cfg) {
	const t = clamp01(heldMs / cfg.chargeMs);
	return { t, radius: lerp(cfg.baseRadius, cfg.maxRadius, t), cost: lerp(cfg.baseCost, cfg.maxCost, t) };
}

export const bombProgress = (elapsedMs, cfg) => clamp01(elapsedMs / cfg.fallMs);

// Targets are { x, y, r, dead? }. Returns [{ target, dist }] nearest first.
export function splashTargets(point, radius, targets) {
	const hits = [];
	for (const target of targets) {
		if (target.dead) continue;
		const dist = Math.hypot(target.x - point.x, target.y - point.y);
		if (dist <= radius + (target.r ?? 0)) hits.push({ target, dist });
	}
	return hits.sort((a, b) => a.dist - b.dist);
}

export const bombDamage = (t, cfg) => cfg.damage * (1 + cfg.chargeDamage * t);

export const isBullseye = (dist, radius, cfg) => dist <= radius * cfg.bullseyeFrac;
