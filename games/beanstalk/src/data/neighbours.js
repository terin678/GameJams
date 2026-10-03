// The people of the valley, and what you can give them. Format in core/neighbours.js.
// Players find out who likes what by trying, so tastes should make some sense.

export const GIFTS = [
	{ id: 'beans', name: 'Bag of beans', phase: 1, cost: { coins: 5 } },
	{ id: 'blossoms', name: 'Bean blossoms', phase: 1, cost: { coins: 8 } },
	{ id: 'pie', name: 'Bean pie', phase: 1, cost: { coins: 12 } },
	{ id: 'seeds', name: 'Seed packet', phase: 1, cost: { coins: 15 } },
	{ id: 'parts', name: 'Box of spare parts', phase: 1, cost: { coins: 25 } },
	{ id: 'page', name: 'Almanac page', phase: 2, cost: { pages: 20 } },
	{ id: 'moondust', name: 'Jar of moon dust', phase: 3, cost: { matter: 50 } },
];

// `look` uses PALETTE characters from sprites.js for the little figure on the farm.
export const NEIGHBOURS = [
	{
		id: 'marigold', name: 'Marigold', role: 'the baker', unlock: { grown: 30 },
		look: { hat: 'w', shirt: 'o', skin: 's' },
		loves: ['pie'], likes: ['beans', 'blossoms'], dislikes: ['parts'],
		meet: 'Marigold the baker leans on your fence. "So you\'re the bean person."',
		says: {
			love: '"You baked this? With MY oven closed? I\'m impressed."',
			like: '"Oh, lovely. These will go in tomorrow\'s loaf."',
			neutral: '"That\'s... kind. Thank you."',
			dislike: '"What would I do with a box of bolts?"',
		},
		perks: [
			{ hearts: 2, effect: { marketing: 1.5 }, text: 'She bakes with your beans. Demand +50%.' },
			{ hearts: 5, effect: { marketing: 2 }, text: 'Bean bread is the talk of the valley. Demand doubles.' },
			{ hearts: 8, effect: { marketing: 2 }, text: 'She names a loaf after you. Demand doubles again.' },
		],
	},
	{
		id: 'bram', name: 'Old Bram', role: 'retired farmer', unlock: { grown: 500 },
		look: { hat: 'h', shirt: 'G', skin: 's' },
		loves: ['seeds'], likes: ['pie', 'beans'], dislikes: ['blossoms'],
		meet: 'Old Bram stops to look at your plot. He says nothing for a long time. "Hm."',
		says: {
			love: '"Now these are seeds. Haven\'t seen this kind since \'62."',
			like: '"Don\'t mind if I do."',
			neutral: '"Hm."',
			dislike: '"Flowers. Hay fever." He sneezes for a full minute.',
		},
		perks: [
			{ hearts: 2, effect: { growth: 1.2 }, text: 'He shows you how to stake properly. Growth +20%.' },
			{ hearts: 5, effect: { yield: 1.5 }, text: 'He shares his pruning trick. Yield +50%.' },
			{ hearts: 8, effect: { growth: 1.3 }, text: 'He hands over sixty years of notes. Growth +30%.' },
		],
	},
	{
		id: 'wren', name: 'Wren', role: 'the tinkerer', unlock: { grown: 3000 },
		look: { hat: 'N', shirt: 'y', skin: 's' },
		loves: ['parts'], likes: ['seeds'], dislikes: ['pie'],
		meet: 'Wren the tinkerer is already measuring your stalk. "Do you know how tall this could get?"',
		says: {
			love: '"A whole box?! Don\'t wait up."',
			like: '"Ooh, I can test the planter with these."',
			neutral: '"Thanks. I\'ll find a use for it."',
			dislike: '"I had pie for lunch. And breakfast. I live above the bakery."',
		},
		perks: [
			{ hearts: 2, effect: { tend: 1 }, text: 'She builds a bean-picking contraption. +1 plot a second.' },
			{ hearts: 5, effect: { tend: 3 }, text: 'Contraption, mark two. +3 plots a second.' },
			{ hearts: 8, effect: { tend: 6 }, text: 'Mark three walks on its own. +6 plots a second.' },
		],
	},
	{
		id: 'pell', name: 'Mayor Pell', role: 'the mayor', unlock: { grown: 12000 },
		look: { hat: 'k', shirt: 'p', skin: 's' },
		loves: ['blossoms'], likes: ['pie', 'page'], dislikes: ['beans'],
		meet: 'Mayor Pell arrives with a photographer. "The stalk is very good for the valley. Very good."',
		says: {
			love: '"For my buttonhole! The cameras will love it."',
			like: '"The town thanks you. I thank you."',
			neutral: '"Noted. Duly noted."',
			dislike: '"Beans. Everyone gives me beans now."',
		},
		perks: [
			{ hearts: 2, effect: { marketing: 1.5 }, text: 'He mentions you in a speech. Demand +50%.' },
			{ hearts: 5, effect: { marketing: 2 }, text: 'He declares an official Bean Day. Demand doubles.' },
			{ hearts: 8, effect: { yield: 2 }, text: 'He lets you plant the village green. Yield doubles.' },
		],
	},
	{
		id: 'quill', name: 'Dr. Quill', role: 'almanac scholar', unlock: { phase: 2, grown: 80000 },
		look: { hat: 'n', shirt: 'b', skin: 's' },
		loves: ['page'], likes: ['seeds'], dislikes: ['parts'],
		meet: 'Dr. Quill has come from the university to study the stalk. She has brought eleven notebooks.',
		says: {
			love: '"A primary source! Do you know what this means? No. Of course. Thank you."',
			like: '"A fine specimen. I shall catalogue it."',
			neutral: '"How... rustic."',
			dislike: '"I am a scholar, not a mechanic."',
		},
		perks: [
			{ hearts: 2, effect: { pagesRate: 1 }, text: 'She shares her notes. +1 page a second.' },
			{ hearts: 5, effect: { pagesRate: 2 }, text: 'She moves her whole department here. +2 pages a second.' },
			{ hearts: 8, effect: { pagesRate: 4 }, text: 'She dedicates the book to you. +4 pages a second.' },
		],
	},
	{
		id: 'visitor', name: 'The Visitor', role: 'from somewhere else', unlock: { phase: 3, grown: 5e6 },
		look: { hat: 'p', shirt: 'c', skin: 'g' },
		loves: ['beans'], likes: ['moondust'], dislikes: ['page'],
		meet: 'Something climbed down the stalk last night. It is polite. It would like to know what a bean is.',
		says: {
			love: '"WE DO NOT HAVE THESE. WE WOULD LIKE TO."',
			like: '"THIS IS FROM NEAR OUR HOUSE. THANK YOU."',
			neutral: '"WE WILL KEEP IT WITH THE OTHERS."',
			dislike: '"WE HAVE READ IT ALREADY."',
		},
		perks: [
			{ hearts: 2, effect: { replicate: 0.0015 }, text: 'It tells its friends. Probes spread faster.' },
			{ hearts: 5, effect: { probeYield: 10 }, text: 'It shows you a better orbit. Probe yield x10.' },
			{ hearts: 8, effect: { replicate: 0.003 }, text: 'Its whole people are planting now. Probes spread much faster.' },
		],
	},
];
