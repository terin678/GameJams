// Player stats and the passive items offered on level-up.
// pct stats show as percentages; min keeps a stat from going silly.
export const STATS = {
	might: { name: 'Might', base: 1, pct: true, min: 0.1 },        // damage multiplier
	area: { name: 'Area', base: 1, pct: true, min: 0.3 },          // attack size
	haste: { name: 'Haste', base: 1, pct: true, min: 0.3 },        // attack rate
	speed: { name: 'Speed', base: 1, pct: true, min: 0.3 },        // move speed
	maxHp: { name: 'Max HP', base: 100, min: 1 },
	magnet: { name: 'Magnet', base: 1, pct: true, min: 0.5 },      // gem pickup range
	armor: { name: 'Armor', base: 0, min: 0 },                     // flat damage taken reduction
	regen: { name: 'Regen', base: 0, min: 0 },                     // HP per second
	lifesteal: { name: 'Lifesteal', base: 0, pct: true, min: 0 },  // fraction of damage dealt
};

export const PASSIVES = {
	powerWrist: { name: 'Power Wrist', stat: 'might', perLevel: 0.1, max: 5 },
	sageRobe: { name: 'Sage Robe', stat: 'area', perLevel: 0.1, max: 5 },
	hasteCharm: { name: 'Haste Charm', stat: 'haste', perLevel: 0.08, max: 5 },
	sprintShoes: { name: 'Sprint Shoes', stat: 'speed', perLevel: 0.1, max: 5 },
	hyperWrist: { name: 'Hyper Wrist', stat: 'maxHp', perLevel: 20, max: 5 },
	moogleCharm: { name: 'Moogle Charm', stat: 'magnet', perLevel: 0.3, max: 5 },
	diamondArmlet: { name: 'Diamond Armlet', stat: 'armor', perLevel: 1, max: 5 },
	regenRing: { name: 'Regen Ring', stat: 'regen', perLevel: 0.4, max: 5 },
};
