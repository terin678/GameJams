// Job Actions are data made of optional parts (see data/abilities.js):
//   pulse    { radius, damage, knockback?, delayMs?, at?: 'self'|'target', repeat?: { count, everyMs } }
//   dash     { distance, ms, damage, width }
//   field    { radius, ms, tickMs, damage?, slow?, heal?, follow? }
//   clones   { count, ms, radius }
//   haste    { mult, ms }
//   invulnMs, hideMs, heal (fraction of max HP)
// planAction turns one into absolute times and positions; Play carries it out.

export const ACTION_PARTS = ['pulse', 'dash', 'field', 'clones', 'haste', 'invulnMs', 'hideMs', 'heal'];

export function planAction(def, { now, x, y, dir, target }) {
	const plan = { pulses: [], invulnUntil: 0, hideUntil: 0, heal: 0, haste: null, dash: null, field: null, clones: null };

	if (def.pulse) {
		const p = def.pulse;
		const atTarget = p.at === 'target' && target;
		const px = atTarget ? target.x : x, py = atTarget ? target.y : y;
		const delay = p.delayMs ?? 0;
		const reps = p.repeat?.count ?? 1, every = p.repeat?.everyMs ?? 0;
		for (let i = 0; i < reps; i++) {
			const at = now + delay + i * every;
			plan.pulses.push({ at, x: px, y: py, radius: p.radius, damage: p.damage, knockback: p.knockback ?? 0, follow: !atTarget && at > now });
		}
	}
	if (def.invulnMs) plan.invulnUntil = now + def.invulnMs;
	if (def.hideMs) plan.hideUntil = now + def.hideMs;
	if (def.heal) plan.heal = def.heal;
	if (def.haste) plan.haste = { mult: def.haste.mult, until: now + def.haste.ms };
	if (def.dash) {
		const d = def.dash, speed = d.distance / (d.ms / 1000);
		plan.dash = { vx: dir.x * speed, vy: dir.y * speed, until: now + d.ms, damage: d.damage, width: d.width };
	}
	if (def.field) {
		const f = def.field;
		plan.field = { x, y, radius: f.radius, until: now + f.ms, tickMs: f.tickMs, damage: f.damage ?? 0, slow: f.slow ?? 0, heal: f.heal ?? 0, follow: !!f.follow };
	}
	if (def.clones) plan.clones = { count: def.clones.count, until: now + def.clones.ms, radius: def.clones.radius };
	return plan;
}
