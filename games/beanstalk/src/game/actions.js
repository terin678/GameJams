// What the buttons do: each action applies a rule from core/sim.js to the
// game and says how it went, as a sound and sometimes a buzz. Nothing here
// touches the page, so the whole set can be driven from a test.
//
// `game` is anything with a `state` property (the state object is replaced on
// "start over" and New Game+, so it is looked up each time). `feedback` is
// { sound(name), buzz(pattern), ended() }.

import {
	tend, buyProject, nudgePrice, giveGift, crossSeeds, chooseSeedling, climb, chooseAtLedge,
	postAnimal, buildPost, trainAnimal, guardSwarm, buyCrates, sellCrates,
} from '../core/sim.js';

export function createActions({ game, data, rng, feedback }) {
	const { sound, buzz, ended } = feedback;
	// Most actions either happen or are refused, and sound like it.
	const tried = (did, yes) => {
		sound(did ? yes : 'deny');
		return did;
	};
	return {
		tend() {
			const did = tend(game.state, data);
			sound(did ?? 'deny');
			if (did) buzz(8);
			return did;
		},
		buy(id) {
			const bought = tried(buyProject(game.state, id, data), 'buy');
			if (game.state.done) {
				sound('ending');
				ended();
			}
			return bought;
		},
		price(dir) {
			nudgePrice(game.state, dir, data);
			sound('price');
		},
		gift(neighbourId, giftId) {
			const result = giveGift(game.state, neighbourId, giftId, data);
			sound(!result ? 'deny' : result.perks.length ? 'heart' : result.reaction);
			if (result?.perks.length) buzz([20, 40, 20]);
			return result;
		},
		cross: () => tried(crossSeeds(game.state, data, rng), 'cross'),
		seedling: index => tried(chooseSeedling(game.state, index, data), 'buy'),
		climb: () => tried(climb(game.state, data), 'buy'),
		ledge(index) {
			const result = chooseAtLedge(game.state, index, data, rng);
			sound(!result ? 'deny' : result.stomp ? 'stomp' : result.won ? (result.find ? 'heart' : 'like') : 'dislike');
			if (result?.stomp) buzz([80, 40, 120]);
			return result;
		},
		post: (id, delta) => tried(postAnimal(game.state, id, delta, data), 'price'),
		build: () => tried(buildPost(game.state, data), 'buy'),
		train: id => tried(trainAnimal(game.state, id, data), 'cross'),
		swarm: dir => tried(guardSwarm(game.state, dir, data), 'price'),
		trade: (side, share) => tried((side === 'buy' ? buyCrates : sellCrates)(game.state, share, data), 'buy'),
		// The player has looked at something new (a tab), so stop flagging it.
		seen(key) {
			game.state.seen[key] = true;
		},
	};
}
