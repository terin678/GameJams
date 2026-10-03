// The data files are the game's content. These tests catch typos and broken
// cross-references before they reach the browser.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DATA, SPRITES, PALETTE, VIEW, SOUNDS, EVENT_SOUNDS, MUSIC, SKY } from '../../games/beanstalk/src/data/index.js';
import { validateProject, EFFECTS } from '../../games/beanstalk/src/core/projects.js';
import { validateNeighbour, validateGift } from '../../games/beanstalk/src/core/neighbours.js';
import { validateSeeds } from '../../games/beanstalk/src/core/seeds.js';
import { validateSky } from '../../games/beanstalk/src/core/sky.js';
import { validateRuns } from '../../games/beanstalk/src/core/runs.js';
import { validateClimb } from '../../games/beanstalk/src/core/climb.js';
import { validateGuard } from '../../games/beanstalk/src/core/guard.js';
import { validateExchange } from '../../games/beanstalk/src/core/exchange.js';
import { heightFor } from '../../games/beanstalk/src/core/phases.js';
import { plotOrder } from '../../games/beanstalk/src/core/layout.js';
import { parsePixelMap } from '../../shared/pixelart.js';
import { validateSfx } from '../../shared/sfx.js';
import { validateSong } from '../../shared/music.js';

const { TUNING: T, PROJECTS, SEASONS, WEATHER, PHASES, MILESTONES, LANDMARKS, NEIGHBOURS, GIFTS, SEEDS, RUNS, CLIMB, GUARD, EXCHANGE } = DATA;
const ascending = list => list.every((v, i) => i === 0 || v > list[i - 1]);

test('every project is well formed', () => {
	const ids = new Set(PROJECTS.map(p => p.id));
	assert.equal(ids.size, PROJECTS.length, 'ids are unique');
	for (const p of PROJECTS) assert.deepEqual(validateProject(p, ids), [], p.id);
});

test('a project only requires projects listed before it, from its own phase or earlier', () => {
	const seen = new Map();
	for (const p of PROJECTS) {
		for (const id of p.requires?.has ?? []) {
			assert.ok(seen.has(id), `${p.id} requires ${id}, which comes later`);
			assert.ok(seen.get(id).phase <= p.phase, `${p.id} requires ${id} from a later phase`);
		}
		seen.set(p.id, p);
	}
});

test('projects are listed in phase order and every phase has some', () => {
	const phases = PROJECTS.map(p => p.phase);
	assert.deepEqual(phases, [...phases].sort());
	for (const ph of PHASES) assert.ok(phases.includes(ph.id), `phase ${ph.id}`);
});

test('the tuning base only sets real modifiers', () => {
	for (const k of Object.keys(T.base)) assert.ok(EFFECTS[k], k);
	for (const [k, v] of Object.entries(T.golden)) assert.ok(EFFECTS[k] && EFFECTS[k] !== 'flag' && v > 0, `golden ${k}`);
});

test('every level of bookkeeping you can buy has someone to do it', () => {
	const top = PROJECTS.reduce((n, p) => n + (p.effect?.pricing ?? 0) * (p.max ?? 1), 0);
	const { levels } = T.market.autoprice;
	assert.equal(levels.length - 1, top);
	assert.equal(levels[0], null, 'level 0 is you');
	for (const l of levels.slice(1)) assert.ok(l.name && l.everySeconds > 0);
	assert.ok(levels.at(-1).analyst);
	for (const p of PROJECTS) if (p.effect?.autoprice) assert.ok(p.effect.pricing > 0, p.id);
});

test('money ends once, in the middle of phase 2, when the market is cornered', () => {
	const corners = PROJECTS.filter(p => p.effect?.barter);
	assert.equal(corners.length, 1);
	assert.equal(corners[0].phase, 2);
	assert.ok(corners[0].requires.has.includes('accountant'), 'someone is setting a fair price when it is fixed');
	assert.ok(T.market.cornerLog);
	// Nothing after phase 1 is priced in barn beans: there is no barn once the market has gone.
	for (const e of CLIMB.encounters) for (const o of e.options) assert.ok(!o.cost?.beans, e.id);
	assert.ok(!PROJECTS.at(-1).cost.coins, 'the last bean is not bought with money');
});

test('there is exactly one way to end the game, at a full universe', () => {
	const endings = PROJECTS.filter(p => p.grant?.done);
	assert.equal(endings.length, 1);
	assert.equal(endings[0].requires.grown, T.universeBeans);
});

test('all the plots you can buy fit in the farm view', () => {
	const plots = PROJECTS.reduce((n, p) => n + (p.effect?.plots ?? 0) * (p.max ?? 1), T.base.plots);
	assert.ok(plots <= VIEW.plots.cols * VIEW.plots.rows, `${plots} plots`);
	assert.equal(plotOrder(VIEW.plots.cols, VIEW.plots.rows).length, VIEW.plots.cols * VIEW.plots.rows);
});

test('every neighbour and gift is well formed', () => {
	const giftIds = new Set(GIFTS.map(g => g.id));
	assert.equal(giftIds.size, GIFTS.length, 'gift ids are unique');
	for (const g of GIFTS) assert.deepEqual(validateGift(g), [], g.id);
	assert.equal(new Set(NEIGHBOURS.map(n => n.id)).size, NEIGHBOURS.length, 'neighbour ids are unique');
	for (const n of NEIGHBOURS) {
		assert.deepEqual(validateNeighbour(n, giftIds, T.friends), [], n.id);
		for (const c of Object.values(n.look)) assert.ok(PALETTE[c], `${n.id} look "${c}"`);
		assert.ok(SPRITES[`friend_${n.id}`], `sprite for ${n.id}`);
	}
});

test('each neighbour loves a gift you can give when you meet them, and every gift is loved by someone', () => {
	const gift = id => GIFTS.find(g => g.id === id);
	for (const n of NEIGHBOURS) {
		assert.ok(n.loves.some(id => gift(id).phase <= (n.unlock.phase ?? 1)), n.id);
	}
	for (const g of GIFTS) {
		assert.ok(NEIGHBOURS.some(n => n.loves.includes(g.id) || n.likes.includes(g.id)), `nobody wants ${g.id}`);
	}
	assert.ok(NEIGHBOURS.some(n => (n.unlock.phase ?? 1) === 1 && (n.unlock.grown ?? 0) <= 100), 'someone to meet early');
});

test('seed breeding data is well formed', () => {
	assert.deepEqual(validateSeeds(SEEDS, SEASONS), []);
	assert.equal(new Set(SEEDS.traits.map(t => t.id)).size, SEEDS.traits.length);
	for (const k of ['{class}']) assert.ok(SEEDS.fair.win.includes(k) && SEEDS.fair.lose.includes(k), k);
	// The last ribbon in a class must be reachable.
	const topBar = SEEDS.fair.firstBar + SEEDS.fair.barStep * Math.floor((SEEDS.maxLevel - SEEDS.fair.firstBar) / SEEDS.fair.barStep);
	assert.ok(topBar <= SEEDS.maxLevel);
	assert.ok(SPRITES.ribbon);
});

test('the light through the day is well formed, and night is short', () => {
	assert.deepEqual(validateSky(SKY), []);
	assert.match(SKY.window, /^#[0-9a-f]{6}$/i);
	for (const x of [...SEASONS, ...WEATHER.filter(w => w.tint).map(w => ({ id: w.id, sky: w.tint.color, grass: w.tint.color }))]) {
		assert.match(x.sky, /^#[0-9a-f]{6}$/i, x.id);
		assert.match(x.grass, /^#[0-9a-f]{6}$/i, x.id);
	}
	for (const w of WEATHER) if (w.tint) assert.ok(w.tint.amount > 0 && w.tint.amount <= 1, w.id);
	const dark = SKY.keys.reduce((sum, k, i) => sum + (i && k.night === 1 && SKY.keys[i - 1].night === 1 ? k.at - SKY.keys[i - 1].at : 0), 0);
	assert.ok(dark > 0.05 && dark < 0.3, `fully dark for ${dark} of the day`);
	assert.ok(T.calendar.daySeconds >= 30, 'a day is long enough to watch the light change');
	assert.ok(VIEW.windows.length > 0);
});

test('New Game+ content is well formed', () => {
	assert.deepEqual(validateRuns(RUNS, NEIGHBOURS), []);
	assert.ok(RUNS.twists.length >= 3);
	assert.ok(SPRITES.bean_gold);
	assert.equal(SPRITES.bean_gold.frames.length, SPRITES.bean.frames.length);
});

test('the climb is well formed and can be reached', () => {
	assert.deepEqual(validateClimb(CLIMB, {
		neighbours: NEIGHBOURS.map(n => n.id), traits: SEEDS.traits.map(t => t.id), phases: PHASES.map(p => p.id),
	}), []);
	const opens = PHASES.find(p => p.id === CLIMB.unlock.phase).height;
	assert.ok(CLIMB.encounters[0].height >= opens, 'the first ledge is above where the climb opens');
	assert.ok(CLIMB.encounters.at(-1).height < heightFor(T.universeBeans, T.height));
	for (const e of CLIMB.encounters) {
		for (const o of e.options) {
			const who = o.needs?.hearts;
			if (who) assert.ok(who.n <= T.friends.maxHearts, `${e.id}: ${who.n} hearts`);
			if (o.needs?.trait) assert.ok(o.needs.trait.level <= SEEDS.maxLevel, e.id);
		}
	}
	for (const name of ['castle', 'climber']) assert.ok(SPRITES[name], name);
});

test('the guard is well formed, opens in phase 1, and has art for everything', () => {
	assert.deepEqual(validateGuard(GUARD), []);
	assert.ok(heightFor(GUARD.unlock.grown, T.height) < PHASES[1].height, 'opens before the clouds');
	for (const x of [...GUARD.foes, ...GUARD.defenders]) assert.ok(SPRITES[x.id], `sprite for ${x.id}`);
	// A new animal is announced by a rank, so its arrival is never silent.
	for (const d of GUARD.defenders) if (d.wins > 0) assert.ok(GUARD.ranks.some(r => r.wins === d.wins), d.id);
	// One new idea at a time: a wave never adds more than one kind of pest.
	GUARD.waves.forEach((w, i) => {
		const before = i ? GUARD.waves[i - 1].foes : [];
		assert.ok(w.foes.filter(f => !before.includes(f)).length <= 1, `wave at ${w.wins} wins`);
	});
	assert.ok(GUARD.waves.at(-1).size <= GUARD.posts.max * 2 + 1, 'the biggest wave can be beaten with every post built');
	// Training can cancel the toughest pest, and is paid for in a currency its phase has.
	const toughest = Math.max(...GUARD.foes.map(f => f.tough ?? 1));
	assert.ok(1 + GUARD.train.per * GUARD.train.max >= toughest, `full training is x${1 + GUARD.train.per * GUARD.train.max}, toughest pest is ${toughest}`);
	assert.deepEqual(Object.keys(GUARD.train.cost), ['pages']);
	assert.ok(PHASES.some(p => p.id === GUARD.train.phase));
});

test('the exchange is well formed, and a year on the board is worth trading', () => {
	assert.deepEqual(validateExchange(EXCHANGE, {
		seasons: SEASONS.map(s => s.id), weather: WEATHER.map(w => w.id), phases: PHASES.map(p => p.id),
	}), []);
	const levels = Object.values(EXCHANGE.seasons);
	const swing = Math.max(...levels) / Math.min(...levels) * (1 - EXCHANGE.fee);
	assert.ok(swing > 1.2 && swing < 2, `buying at the bottom and selling at the top makes x${swing.toFixed(2)}`);
	assert.ok(EXCHANGE.noise * 3 < Math.max(...levels) - Math.min(...levels), 'the seasons matter more than the noise');
	assert.ok(SPRITES.crates && VIEW.cratesX > 0);
});

test('one new tab at a time: the systems open in order, well apart', () => {
	const order = [SEEDS.unlock.grown, GUARD.unlock.grown, T.height.points[1][0], EXCHANGE.unlock.grown];
	assert.ok(ascending(order), order.join(' < '));
	for (let i = 1; i < order.length; i++) assert.ok(order[i] >= order[i - 1] * 3, `${order[i - 1]} then ${order[i]}`);
	assert.equal(CLIMB.unlock.phase, 2);
	assert.equal(EXCHANGE.unlock.phase, 2);
});

test('seasons and weather make sense', () => {
	assert.equal(SEASONS.length, 4);
	for (const s of SEASONS) {
		assert.ok(s.name && s.log && s.sky && s.grass, s.id);
		assert.ok(s.growth > 0, s.id);
	}
	assert.ok(WEATHER.reduce((a, w) => a + w.chance, 0) < 0.5, 'most days are fair');
	assert.equal(WEATHER.filter(w => w.summoned).length, 1, 'one weather for the rainmaker');
	for (const w of WEATHER) assert.ok(w.name && w.log && (w.growth > 0 || w.eats), w.id);
});

test('phases, milestones and landmarks climb in order', () => {
	assert.deepEqual(PHASES.map(p => p.id), [1, 2, 3]);
	assert.equal(PHASES[0].height, 0);
	assert.ok(ascending(PHASES.map(p => p.height)));
	assert.ok(ascending(MILESTONES.map(m => m.height)));
	assert.ok(ascending(LANDMARKS.map(m => m.height)));
	assert.ok(ascending(LANDMARKS.map(m => m.y)));
	assert.equal(LANDMARKS[0].y, 0);
	assert.equal(LANDMARKS.at(-1).y, 1);
	assert.equal(new Set(MILESTONES.map(m => m.id)).size, MILESTONES.length);
	for (const x of [...PHASES, ...MILESTONES]) assert.ok(x.log, `log line for ${x.id}`);
});

test('the height curve climbs, and each phase starts on one of its points', () => {
	const pts = T.height.points;
	assert.ok(ascending(pts.map(p => p[0])) && ascending(pts.map(p => p[1])));
	assert.equal(pts.at(-1)[0], T.universeBeans);
	for (const ph of PHASES.slice(1)) assert.ok(pts.some(p => p[1] === ph.height), `phase ${ph.id} at ${ph.height} m`);
});

test('a full universe is taller than every milestone and reaches the top of the sky', () => {
	const top = heightFor(T.universeBeans, T.height);
	assert.ok(top >= MILESTONES.at(-1).height);
	assert.ok(top >= LANDMARKS.at(-1).height);
});

test('every sprite parses, and its frames are all one size', () => {
	for (const [name, sprite] of Object.entries(SPRITES)) {
		const maps = sprite.frames.map(f => parsePixelMap(f, PALETTE));
		for (const m of maps) {
			assert.equal(m.width, maps[0].width, name);
			assert.equal(m.height, maps[0].height, name);
		}
	}
});

test('the view only uses sprites that exist', () => {
	for (const m of LANDMARKS) if (m.sprite) assert.ok(SPRITES[m.sprite], m.sprite);
	for (const p of PROJECTS) {
		if (!p.scene) continue;
		assert.ok(p.scene in VIEW.props ? SPRITES[p.scene] : VIEW.effects.includes(p.scene), `${p.id} scene "${p.scene}"`);
	}
	for (const m of LANDMARKS) {
		if (!m.greenBy) continue;
		assert.ok(PROJECTS.some(p => p.id === m.greenBy), m.greenBy);
		assert.ok(SPRITES[`${m.sprite}_green`], `${m.sprite}_green`);
	}
	for (const p of PROJECTS) if (p.helper) assert.ok(SPRITES[p.helper], `${p.id} helper`);
	for (const x of [...SEASONS, ...WEATHER]) if (x.fx) assert.ok(['rain', 'snow'].includes(x.fx), `${x.id} fx`);
	for (const name of ['soil', 'bean', 'farmhand', 'drone', 'scarecrow', 'farmhouse', 'crow', 'leaf', 'probe']) {
		assert.ok(SPRITES[name], name);
	}
	assert.equal(SPRITES.soil.frames[0].length * VIEW.scale, VIEW.plots.size, 'a soil tile fills a plot');
	assert.equal(VIEW.skyStops[0].at, 0);
	assert.equal(VIEW.skyStops.at(-1).at, 1);
});

test('the tune is a valid song, and quiet enough to sit under the sound effects', () => {
	assert.deepEqual(validateSong(MUSIC), []);
	assert.ok(MUSIC.volume <= 0.7);
	for (const [name, v] of Object.entries(MUSIC.voices)) assert.ok(v.vol <= 0.3, name);
});

test('cold seasons have a line for when there is a greenhouse', () => {
	for (const s of SEASONS) if (s.cold) assert.ok(s.logWarm, s.id);
});

test('every sound is valid, and every event sound exists', () => {
	for (const [name, def] of Object.entries(SOUNDS)) assert.deepEqual(validateSfx(def), [], name);
	const names = Object.values(EVENT_SOUNDS).flatMap(v => (typeof v === 'string' ? [v] : Object.values(v)));
	for (const n of names) assert.ok(SOUNDS[n], n);
	for (const id of Object.keys(EVENT_SOUNDS.weather)) assert.ok(WEATHER.some(w => w.id === id), id);
	for (const n of ['plant', 'harvest', 'buy', 'deny', 'price', 'ending', 'cross', 'stomp', 'raid', 'heart', 'love', 'like', 'neutral', 'dislike']) assert.ok(SOUNDS[n], n);
});
