// Food restores energy (health) and gut (bomb ammo).
// Eggs turn you into a duck (see forms.js). Shoot a falling egg to cycle it
// through EGG_CYCLE, like 1943's POW. Feathers add a wingman to your V.
export const PICKUPS = {
	fries: { name: 'Fries', sprite: 'fries', energy: 10, gut: 35 },
	bread: { name: 'Bread', sprite: 'bread', energy: 25, gut: 10 },
	bug: { name: 'Bug', sprite: 'bug', energy: 5, gut: 50 },

	mallard_egg: { name: 'Mallard', sprite: 'egg_mallard', form: 'mallard' },
	merganser_egg: { name: 'Merganser', sprite: 'egg_merganser', form: 'merganser' },
	eider_egg: { name: 'Eider', sprite: 'egg_eider', form: 'eider' },

	feather: { name: 'Wingman', sprite: 'feather', wingman: true },
};

export const EGG_CYCLE = ['mallard_egg', 'merganser_egg', 'eider_egg'];
