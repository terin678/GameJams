// New Game+ content. How it is used is described in core/runs.js.
export const RUNS = {
	// Journal lines used instead of the usual ones once you have a Golden Bean.
	again: {
		start: 'One plot again. But the bean in your hand is gold, and you know exactly where this goes.',
		seeds: 'The seed catalogue arrives. You could have written it.',
		neighbours: {
			marigold: 'Marigold leans on your fence and squints. "Have we met? You look like someone who owes me a pie tin."',
			bram: 'Old Bram stops at your plot. "Hm." A pause. "Hm," again, as if he has said it before.',
			wren: 'Wren is measuring your stalk. "Funny. I already had these numbers written down."',
			pell: 'Mayor Pell arrives with a photographer. "I have the strangest feeling I have given this speech."',
			quill: 'Dr. Quill opens a fresh notebook, then frowns. Every page is already in her handwriting.',
			visitor: 'Something climbs down the stalk. "WE REMEMBER YOU. YOU DO NOT REMEMBER US. THAT IS FINE."',
		},
	},
	// Each run adds the next twist to the ones before it. `rule` keys are listed in core/runs.js.
	twists: [
		{ id: 'hard_winters', name: 'Hard winters', text: 'Without a greenhouse, winter growth is halved.', rule: { cold: 0.5 } },
		{ id: 'bold_crows', name: 'Bold crows', text: 'Crows come twice as often, and one in three ignores the scarecrow.', rule: { crows: 2, brave: 0.34 } },
		{ id: 'picky_judges', name: 'Picky judges', text: 'Every class at the fair wants one more level.', rule: { fairBar: 1 } },
		{ id: 'busy_neighbours', name: 'Busy neighbours', text: 'Neighbours take half as long again between gifts.', rule: { giftWait: 1.5 } },
	],
	// The last line of the ending card, by how many runs came before this one.
	endings: [
		'The first bean is still in your pocket. It has turned to gold.',
		'Two gold beans now. They click together in your pocket like a secret.',
		'Three. You are starting to suspect the universe likes being a beanstalk.',
		'Another gold bean. You have stopped counting. The beans have not.',
	],
};
