// The data files are the game's content. These tests catch typos and broken
// cross-references before they reach the browser.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DATA, SPRITES, PALETTE, VIEW, SOUNDS, EVENT_SOUNDS, MUSIC } from '../../games/beanstalk/src/data/index.js';
import { validateProject, EFFECTS } from '../../games/beanstalk/src/core/projects.js';
import { validateNeighbour, validateGift } from '../../games/beanstalk/src/core/neighbours.js';
import { heightFor } from '../../games/beanstalk/src/core/phases.js';
import { plotOrder } from '../../games/beanstalk/src/core/layout.js';
import { parsePixelMap } from '../../shared/pixelart.js';
import { validateSfx } from '../../shared/sfx.js';
import { validateSong } from '../../shared/music.js';

const { TUNING: T, PROJECTS, SEASONS, WEATHER, PHASES, MILESTONES, LANDMARKS, NEIGHBOURS, GIFTS } = DATA;
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
	for (const n of ['plant', 'harvest', 'buy', 'deny', 'price', 'ending', 'heart', 'love', 'like', 'neutral', 'dislike']) assert.ok(SOUNDS[n], n);
});
