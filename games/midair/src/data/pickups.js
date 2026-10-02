// Food restores energy (health) and gut (bomb ammo). Chili powers up the splat.
export const PICKUPS = {
	fries: { name: 'Fries', sprite: 'fries', energy: 10, gut: 35 },
	bread: { name: 'Bread', sprite: 'bread', energy: 25, gut: 10 },
	bug: { name: 'Bug', sprite: 'bug', energy: 5, gut: 50 },
	chili: { name: 'Chili', sprite: 'chili', energy: 5, gut: 20, weapon: 'spread', durationMs: 12000 },
};
