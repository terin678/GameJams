// Auto attacks and Job Actions. Numbers are at level 1 and 100% stats;
// core/attacks.js attackAt scales them. perLevel: per level above 1,
// damage/area/cooldown as fractions, count as extra shots (floored).
//
// shapes
//   arc        range, arcDeg, knockback?           a swing toward the nearest enemy
//   line       length, width, knockback?           a thrust toward the nearest enemy
//   projectile count, spreadDeg?, speed, radius, lifeMs, pierce, homing? (rad/s), burn? { dps, ms }, sprite, spin?
//   orbit      count, orbit (radius), spin (rad/s), hitRadius, hitEveryMs, sprite
export const ATTACKS = {
	slash: { name: 'Slash', shape: 'arc', damage: 10, cooldownMs: 900, range: 70, arcDeg: 120, knockback: 12, color: 0xdfe6ff, perLevel: { damage: 0.25, area: 0.08 } },
	thrust: { name: 'Thrust', shape: 'line', damage: 13, cooldownMs: 950, length: 115, width: 18, knockback: 8, color: 0xa8f0a0, perLevel: { damage: 0.25, area: 0.1 } },
	bolt: { name: 'Bolt', shape: 'projectile', damage: 8, cooldownMs: 850, count: 1, speed: 300, radius: 6, lifeMs: 1800, pierce: 0, homing: 4, sprite: 'bolt', perLevel: { damage: 0.2, count: 0.5 } },
	jab: { name: 'Jab', shape: 'arc', damage: 5, cooldownMs: 320, range: 46, arcDeg: 70, knockback: 4, color: 0xffc070, perLevel: { damage: 0.2, cooldown: 0.05 } },

	cleave: { name: 'Cleave', shape: 'arc', damage: 18, cooldownMs: 1100, range: 92, arcDeg: 180, knockback: 18, color: 0xffffff, perLevel: { damage: 0.25, area: 0.08 } },
	pike: { name: 'Pike', shape: 'line', damage: 18, cooldownMs: 950, length: 140, width: 22, knockback: 10, color: 0xc89af0, perLevel: { damage: 0.25, area: 0.1 } },
	lances: { name: 'Wyvern Lances', shape: 'orbit', damage: 7, count: 2, orbit: 72, spin: 2.8, hitRadius: 12, hitEveryMs: 400, sprite: 'lance', perLevel: { damage: 0.2, count: 0.5 } },
	firebolt: { name: 'Fira', shape: 'projectile', damage: 9, cooldownMs: 1000, count: 3, spreadDeg: 24, speed: 320, radius: 6, lifeMs: 1600, pierce: 0, homing: 3, burn: { dps: 6, ms: 2000 }, sprite: 'firebolt', perLevel: { damage: 0.2, count: 0.5 } },
	palm: { name: 'Palm Strike', shape: 'arc', damage: 9, cooldownMs: 340, range: 56, arcDeg: 90, knockback: 8, color: 0xffe060, perLevel: { damage: 0.2, cooldown: 0.05 } },

	holysword: { name: 'Holy Edge', shape: 'arc', damage: 20, cooldownMs: 1000, range: 95, arcDeg: 170, knockback: 16, color: 0xfff2a0, perLevel: { damage: 0.25, area: 0.08 } },
	holybeam: { name: 'Holy Beam', shape: 'projectile', damage: 14, cooldownMs: 1400, count: 2, spreadDeg: 30, speed: 440, radius: 7, lifeMs: 1000, pierce: 99, sprite: 'beam', perLevel: { damage: 0.2, count: 0.5 } },
	shuriken: { name: 'Shuriken', shape: 'projectile', damage: 8, cooldownMs: 700, count: 4, spreadDeg: 50, speed: 380, radius: 6, lifeMs: 1200, pierce: 1, sprite: 'shuriken', spin: 18, perLevel: { damage: 0.2, count: 0.5 } },
};

// Job Actions spend `cost` gauge. Parts are listed in core/actions.js.
export const ACTIONS = {
	spin: { name: 'Spin Slash', cost: 50, color: 0xdfe6ff, pulse: { radius: 105, damage: 30, knockback: 40 } },
	charge: { name: 'Charge', cost: 50, color: 0xa8f0a0, invulnMs: 260, dash: { distance: 180, ms: 200, damage: 35, width: 36 } },
	blizzard: { name: 'Blizzard', cost: 70, color: 0x9ff0fa, field: { radius: 125, ms: 4000, tickMs: 500, damage: 5, slow: 0.55 } },
	flurry: { name: 'Flurry', cost: 55, color: 0xffc070, haste: { mult: 1.6, ms: 3500 }, pulse: { radius: 72, damage: 12, knockback: 10, repeat: { count: 3, everyMs: 130 } } },

	shieldwall: { name: 'Shield Wall', cost: 70, color: 0xffffff, invulnMs: 2500, pulse: { radius: 85, damage: 10, knockback: 70 } },
	jump: { name: 'Jump', cost: 65, color: 0xc89af0, invulnMs: 850, hideMs: 750, pulse: { radius: 125, damage: 75, knockback: 50, delayMs: 750 } },
	meteor: { name: 'Meteor', cost: 80, color: 0xff7040, pulse: { radius: 140, damage: 110, knockback: 30, delayMs: 800, at: 'target' } },
	chakra: { name: 'Chakra', cost: 75, color: 0xffe060, heal: 0.3, pulse: { radius: 130, damage: 15, knockback: 80 } },

	sanctuary: { name: 'Sanctuary', cost: 85, color: 0xfff2a0, field: { radius: 115, ms: 5000, tickMs: 400, damage: 9, heal: 3, follow: true } },
	shadowclone: { name: 'Shadow Clone', cost: 85, color: 0x8060c0, invulnMs: 300, clones: { count: 3, ms: 6500, radius: 44 } },
};
