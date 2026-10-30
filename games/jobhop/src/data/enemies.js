// Enemies walk at the player (or the nearest shadow clone).
//   hp, speed (px/s), radius (hitbox), damage (on contact), xp (gem value and job XP)
//   dash?    { everyMs, ms, mult }  speed bursts on a cycle
//   summon?  { type, count, everyMs } calls minions (boss)
//   potion?  drop chance of a healing potion
//   elite / boss: not scaled by the clock; the boss ends the run when it dies
export const ENEMIES = {
	goblin: { name: 'Goblin', sprite: 'goblin', hp: 8, speed: 55, radius: 9, damage: 6, xp: 1, potion: 0.004 },
	bat: { name: 'Bat', sprite: 'bat', hp: 5, speed: 85, radius: 7, damage: 4, xp: 1 },
	flan: { name: 'Flan', sprite: 'flan', hp: 30, speed: 34, radius: 11, damage: 10, xp: 3, potion: 0.01 },
	wolf: { name: 'Wolf', sprite: 'wolf', hp: 14, speed: 58, radius: 10, damage: 8, xp: 2, dash: { everyMs: 2600, ms: 600, mult: 2.4 } },
	skeleton: { name: 'Skeleton', sprite: 'skeleton', hp: 22, speed: 50, radius: 9, damage: 10, xp: 2, potion: 0.004 },
	imp: { name: 'Imp', sprite: 'imp', hp: 12, speed: 92, radius: 8, damage: 7, xp: 2 },
	ogre: { name: 'Ogre', sprite: 'ogre', hp: 450, speed: 46, radius: 19, damage: 20, xp: 30, elite: true, potion: 1 },
	chaos: {
		name: 'Chaos', sprite: 'chaos', hp: 3000, speed: 52, radius: 28, damage: 30, xp: 100, boss: true,
		summon: { type: 'imp', count: 6, everyMs: 5000 },
	},
};
