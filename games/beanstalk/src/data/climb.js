// The Climb: what is up the stalk. The format is described in core/climb.js.
// Heights are in metres; a ledge can be climbed to once the stalk is that tall.
export const CLIMB = {
	unlock: { phase: 2 },
	log: 'The stalk is tall enough to climb. Someone ought to see what is up there.',
	seconds: 40,               // how long the climber takes to reach a ledge
	giant: {
		stompAt: 3,            // anger at which he stamps
		afterStomp: 1,
		moods: ['calm', 'grumbling', 'furious'],
		stomp: 'FEE. FI. FO. FUM. The Giant stamps, and every bean on the farm jumps out of the ground.',
	},
	encounters: [
		{
			id: 'nest', name: 'The cloud ledge', height: 2500, provisions: { coins: 20000 },
			text: 'A shelf of solid cloud, and on it a nest the size of a cart. Three pale eggs, still warm.',
			options: [
				{ label: 'Take one egg to market', win: 'It sells before you reach the stall. Nobody asks what laid it.', grant: { coins: 60000 } },
				{ label: 'Leave them, and draw them instead', win: 'Eleven careful pages. The mother watches you the whole time.', grant: { pages: 150 } },
			],
		},
		{
			id: 'fork', name: 'The fork', height: 4500, provisions: { coins: 40000 },
			text: 'The stalk splits in two. One side is in full sun; the other is cool, green and dripping.',
			options: [
				{ label: 'Take cuttings from the sunny side', win: 'They root in a day.',
					find: { id: 'sun_cuttings', name: 'Sun-warmed cuttings', text: 'Growth +15%.', effect: { growth: 1.15 } } },
				{ label: 'Gather moss from the shady side', win: 'The plots have never been so damp.',
					find: { id: 'cloud_moss', name: 'Cloud moss', text: 'Yield +15%.', effect: { yield: 1.15 } } },
			],
		},
		{
			id: 'gate', name: 'The castle gate', height: 7000, provisions: { coins: 80000 },
			text: 'A door forty feet high, in a wall made of cloud and stone. Something inside is snoring.',
			options: [
				{ label: 'Knock, with a cartload of beans', cost: { coins: 60000 },
					win: 'The Giant eats the lot, cart included. "MORE OF THOSE," he says. It sounds like an order.',
					find: { id: 'giant_customer', name: 'The Giant\'s standing order', text: 'Demand +50%.', effect: { marketing: 1.5 } } },
				{ label: 'Slip in under the door', chance: 0.6,
					win: 'In the yard is a goose. It looks at you, then lays a golden egg, like a hint.',
					lose: 'The snoring stops. You leave by the way you came, faster.',
					find: { id: 'goose', name: 'The golden goose', text: 'Lays a golden egg every second.', effect: { coinsRate: 2000 } } },
			],
		},
		{
			id: 'kitchen', name: 'The kitchen', height: 11000, provisions: { coins: 150000 },
			text: 'The Giant\'s wife is making stew in a pot you could swim in. She is not surprised to see you. "Another one."',
			options: [
				{ label: 'Trade her your almanac for the recipe', cost: { pages: 400 },
					win: 'Bean stew, giant style. It goes on every menu in the valley.',
					find: { id: 'stew', name: 'Giant bean stew', text: 'Demand +50%.', effect: { marketing: 1.5 } } },
				{ label: 'Hide in the oven and wait for the bag of gold', chance: 0.7,
					win: 'He counts it, he sleeps, you carry off as much as you can lift.',
					lose: '"I SMELL A FARMER." You do not wait for the rest.',
					grant: { coins: 1500000 } },
			],
		},
		{
			id: 'harp', name: 'The harp room', height: 16000, provisions: { coins: 300000 },
			text: 'A golden harp with a face, singing to an empty room. It stops when it sees you. "Do you take requests?"',
			options: [
				{ label: 'Ask it to sing for the farm', needs: { hearts: { who: 'marigold', n: 4 } }, needsText: 'It only sings for people with friends: 4 hearts with Marigold.',
					win: '"A baker vouches for you? Fine." Beans, it turns out, like music.',
					find: { id: 'harp', name: 'The singing harp', text: 'Growth +30%.', effect: { growth: 1.3 } } },
				{ label: 'Carry it off under your coat', chance: 0.5, failAnger: 2,
					win: 'It complains the whole way down, then sings all summer.',
					lose: '"MASTER! MASTER!" The harp has a very loud voice.',
					find: { id: 'stolen_harp', name: 'The stolen harp', text: 'Growth +30%.', effect: { growth: 1.3 } } },
				{ label: 'Listen for a while, then go', win: 'It is a good song. You hum it for weeks.', grant: { pages: 200 } },
			],
		},
		{
			id: 'garden', name: 'The Giant\'s garden', height: 26000, provisions: { coins: 600000 },
			text: 'Rows of beans as big as boats. So this is where the first one came from.',
			options: [
				{ label: 'Swap seeds with the gardener', needs: { trait: { id: 'size', level: 5 } }, needsText: 'She only swaps with serious growers: Size 5 in your seed line.',
					win: '"Not bad, for a small one." She fills your pockets.',
					find: { id: 'giant_seeds', name: 'Giant\'s seed stock', text: 'Yield +50%.', effect: { yield: 1.5 } } },
				{ label: 'Take cuttings after dark', chance: 0.6,
					win: 'Nobody sees. The cuttings are heavier than you are.',
					lose: 'A watering can the size of a barn tips over. Then a light comes on.',
					find: { id: 'night_cuttings', name: 'Giant cuttings', text: 'Yield +50%.', effect: { yield: 1.5 } } },
				{ label: 'Just take notes', win: 'Forty pages on spacing alone.', grant: { pages: 400 } },
			],
		},
		{
			id: 'tower', name: 'The tower top', height: 45000, provisions: { coins: 1500000 },
			text: 'The Giant is waiting at the top of the stairs, arms folded. He has been keeping count.',
			options: [
				{ label: 'Shake hands', needs: { calm: true }, needsText: 'He will only shake the hand of someone who has not annoyed him.',
					win: '"YOU ARE THE POLITE ONE." He comes down to help with the harvest. He is very fast.',
					find: { id: 'giant_hand', name: 'The Giant\'s help', text: 'Tends 12 plots a second.', effect: { tend: 12 } } },
				{ label: 'Apologise, with a feast', cost: { coins: 2e7 }, anger: -3,
					win: 'He eats for an hour and forgives everything. Then he asks if you need a hand.',
					find: { id: 'giant_feast', name: 'The Giant\'s forgiveness', text: 'Tends 12 plots a second.', effect: { tend: 12 } } },
				{ label: 'Walk past as if you live here', win: 'It works, which worries you.' },
			],
		},
		{
			id: 'thin_air', name: 'Thin air', height: 80000, provisions: { coins: 4000000 },
			text: 'The sky is nearly black up here and the leaves are stiff with frost. Below, the whole valley fits under your thumb.',
			options: [
				{ label: 'Build a waystation', cost: { coins: 8000000 },
					win: 'A hut, a stove, and a sign: LAST BEANS BEFORE SPACE.',
					find: { id: 'waystation', name: 'The waystation', text: 'Growth +20%.', effect: { growth: 1.2 } } },
				{ label: 'Plant a flag and write it up', win: 'The almanac gets a new chapter.', grant: { pages: 1500 } },
			],
		},
		{
			id: 'station', name: 'The space station', height: 400e3, provisions: { coins: 2e7 },
			text: 'A tendril has grown through a porthole. The crew have tied it up neatly and are waiting to see who comes for it.',
			options: [
				{ label: 'Trade seeds for a lift', win: 'They take your probes higher than you could throw them.',
					find: { id: 'lift', name: 'A lift from the crew', text: 'Probe yield x3.', effect: { probeYield: 3 } } },
				{ label: 'Share the stew', needs: { hearts: { who: 'quill', n: 2 } }, needsText: 'Needs someone to translate: 2 hearts with Dr. Quill.',
					win: 'Dr. Quill does the talking. The crew start growing their own, on every surface.',
					find: { id: 'orbit_farm', name: 'The orbital allotment', text: 'Probes spread faster.', effect: { replicate: 0.002 } } },
			],
		},
		{
			id: 'far_side', name: 'The far side of the Moon', height: 384.4e6, provisions: { coins: 1e8 },
			text: 'Someone has been gardening here already. Neat rows, in the dust, of something that is not quite a bean.',
			options: [
				{ label: 'Take samples', win: 'They grow in anything. They grow in nothing.',
					find: { id: 'moon_beans', name: 'Not-quite-beans', text: 'Probe yield x3.', effect: { probeYield: 3 } } },
				{ label: 'Leave a gift and a note', needs: { hearts: { who: 'visitor', n: 2 } }, needsText: 'You would need to know whose garden it is: 2 hearts with the Visitor.',
					win: '"YOU FOUND OUR HOUSE." In the morning there is a gift left for you, too.',
					find: { id: 'visitor_gift', name: 'A gift from the neighbours', text: 'Probes spread faster.', effect: { replicate: 0.003 } } },
			],
		},
	],
};
