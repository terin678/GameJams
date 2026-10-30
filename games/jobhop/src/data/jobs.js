// The job tree. Basic jobs start unlocked. An Advanced job unlocks when its
// Basic job reaches a level; an Expert job needs two Advanced jobs.
// Levels come from job XP (see TUNING.jobXp); only the job you are playing
// when a kill lands earns that XP.
//
// stats:  bonuses while this job is the active one
// nodes:  the job's own tree, earned by job level. Active while the job is
//         active, except `mastery` nodes, which apply to every job once earned.
// abbr:   three letters, used as the name on the best-times board
export const TIERS = ['basic', 'advanced', 'expert'];

export const JOBS = {
	swordsman: {
		name: 'Swordsman', abbr: 'SWD', tier: 'basic', unlock: [], sprite: 'swordsman',
		attacks: ['slash'], action: 'spin',
		blurb: 'Sturdy. Swings at whatever is closest.',
		stats: { maxHp: 20, armor: 1 },
		nodes: [
			{ level: 2, stat: 'might', add: 0.1 },
			{ level: 4, stat: 'maxHp', add: 20 },
			{ level: 6, stat: 'area', add: 0.15 },
			{ level: 8, stat: 'might', add: 0.15 },
			{ level: 10, stat: 'maxHp', add: 25, mastery: true },
		],
	},
	lancer: {
		name: 'Lancer', abbr: 'LNC', tier: 'basic', unlock: [], sprite: 'lancer',
		attacks: ['thrust'], action: 'charge',
		blurb: 'Long reach. Charge straight through a crowd.',
		stats: { speed: 0.05 },
		nodes: [
			{ level: 2, stat: 'area', add: 0.1 },
			{ level: 4, stat: 'might', add: 0.1 },
			{ level: 6, stat: 'speed', add: 0.1 },
			{ level: 8, stat: 'might', add: 0.15 },
			{ level: 10, stat: 'speed', add: 0.08, mastery: true },
		],
	},
	mage: {
		name: 'Mage', abbr: 'MAG', tier: 'basic', unlock: [], sprite: 'mage',
		attacks: ['bolt'], action: 'blizzard',
		blurb: 'Homing bolts. Freezes the ground around you.',
		stats: { maxHp: -10, area: 0.1 },
		nodes: [
			{ level: 2, stat: 'haste', add: 0.08 },
			{ level: 4, stat: 'magnet', add: 0.3 },
			{ level: 6, stat: 'might', add: 0.15 },
			{ level: 8, stat: 'haste', add: 0.12 },
			{ level: 10, stat: 'magnet', add: 0.5, mastery: true },
		],
	},
	pugilist: {
		name: 'Pugilist', abbr: 'PUG', tier: 'basic', unlock: [], sprite: 'pugilist',
		attacks: ['jab'], action: 'flurry',
		blurb: 'Fast feet, faster fists. Stay close.',
		stats: { speed: 0.15, haste: 0.1 },
		nodes: [
			{ level: 2, stat: 'speed', add: 0.05 },
			{ level: 4, stat: 'might', add: 0.1 },
			{ level: 6, stat: 'haste', add: 0.1 },
			{ level: 8, stat: 'regen', add: 0.5 },
			{ level: 10, stat: 'haste', add: 0.08, mastery: true },
		],
	},

	knight: {
		name: 'Knight', abbr: 'KNT', tier: 'advanced', unlock: [{ job: 'swordsman', level: 5 }], sprite: 'knight',
		attacks: ['cleave'], action: 'shieldwall',
		blurb: 'Huge swings, heavy armour, a wall of steel.',
		stats: { maxHp: 40, armor: 3 },
		nodes: [
			{ level: 2, stat: 'armor', add: 1 },
			{ level: 4, stat: 'might', add: 0.15 },
			{ level: 6, stat: 'maxHp', add: 30 },
			{ level: 8, stat: 'area', add: 0.2 },
			{ level: 10, stat: 'armor', add: 2, mastery: true },
		],
	},
	dragoon: {
		name: 'Dragoon', abbr: 'DRG', tier: 'advanced', unlock: [{ job: 'lancer', level: 5 }], sprite: 'dragoon',
		attacks: ['pike', 'lances'], action: 'jump',
		blurb: 'Lances circle you. Jump out of trouble, land on it.',
		stats: { speed: 0.05, might: 0.1 },
		nodes: [
			{ level: 2, stat: 'area', add: 0.1 },
			{ level: 4, stat: 'might', add: 0.15 },
			{ level: 6, stat: 'haste', add: 0.1 },
			{ level: 8, stat: 'might', add: 0.2 },
			{ level: 10, stat: 'might', add: 0.1, mastery: true },
		],
	},
	blackmage: {
		name: 'Black Mage', abbr: 'BLM', tier: 'advanced', unlock: [{ job: 'mage', level: 5 }], sprite: 'blackmage',
		attacks: ['firebolt'], action: 'meteor',
		blurb: 'Three burning bolts. Drops a meteor on the nearest foe.',
		stats: { maxHp: -15, might: 0.2 },
		nodes: [
			{ level: 2, stat: 'might', add: 0.1 },
			{ level: 4, stat: 'area', add: 0.15 },
			{ level: 6, stat: 'haste', add: 0.1 },
			{ level: 8, stat: 'might', add: 0.2 },
			{ level: 10, stat: 'area', add: 0.1, mastery: true },
		],
	},
	monk: {
		name: 'Monk', abbr: 'MNK', tier: 'advanced', unlock: [{ job: 'pugilist', level: 5 }], sprite: 'monk',
		attacks: ['palm'], action: 'chakra',
		blurb: 'Every blow heals you. Chakra blasts them away.',
		stats: { speed: 0.15, haste: 0.1, lifesteal: 0.03 },
		nodes: [
			{ level: 2, stat: 'regen', add: 0.5 },
			{ level: 4, stat: 'might', add: 0.15 },
			{ level: 6, stat: 'lifesteal', add: 0.02 },
			{ level: 8, stat: 'speed', add: 0.1 },
			{ level: 10, stat: 'regen', add: 0.6, mastery: true },
		],
	},

	paladin: {
		name: 'Paladin', abbr: 'PLD', tier: 'expert', unlock: [{ job: 'knight', level: 8 }, { job: 'blackmage', level: 8 }], sprite: 'paladin',
		attacks: ['holysword', 'holybeam'], action: 'sanctuary',
		blurb: 'Blade and beam. Sanctuary heals you and burns them.',
		stats: { maxHp: 40, armor: 2, might: 0.15 },
		nodes: [
			{ level: 2, stat: 'regen', add: 0.5 },
			{ level: 4, stat: 'might', add: 0.15 },
			{ level: 6, stat: 'area', add: 0.15 },
			{ level: 8, stat: 'armor', add: 2 },
			{ level: 10, stat: 'might', add: 0.15, mastery: true },
		],
	},
	ninja: {
		name: 'Ninja', abbr: 'NIN', tier: 'expert', unlock: [{ job: 'monk', level: 8 }, { job: 'dragoon', level: 8 }], sprite: 'ninja',
		attacks: ['shuriken'], action: 'shadowclone',
		blurb: 'Shuriken storms. Clones throw too, and draw attention.',
		stats: { speed: 0.25, haste: 0.2 },
		nodes: [
			{ level: 2, stat: 'speed', add: 0.05 },
			{ level: 4, stat: 'haste', add: 0.1 },
			{ level: 6, stat: 'might', add: 0.15 },
			{ level: 8, stat: 'haste', add: 0.1 },
			{ level: 10, stat: 'speed', add: 0.1, mastery: true },
		],
	},
};
