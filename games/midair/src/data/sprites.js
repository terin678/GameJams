// Pixel art as data. Each sprite: { frames: [rows...], scale? } where rows use
// PALETTE characters and '.' is transparent. Most sprites are authored as the
// left half and mirrored. Enemies face down-screen (they fly toward you).
import { mirror } from '../../../../shared/pixelart.js';

export const PALETTE = {
	k: '#1b1b2a', // outline
	w: '#f4f4f4',
	z: '#e8dcc0', // poop cream
	g: '#b8bcc8',
	G: '#6b7080',
	p: '#9aa3c8', // pigeon
	P: '#5d6690',
	q: '#6a7398', // bird head (ducks recolour it)
	n: '#4fb38a', // pigeon neck sheen
	o: '#f29d38', // beak / orange
	v: '#7a8a42', // olive plane
	V: '#4b5628',
	r: '#d6463c',
	R: '#8f2a24',
	y: '#f2d544',
	Y: '#c9a227',
	u: '#4d8fe0',
	U: '#2b5aa8',
	c: '#9ff0fa', // glass / hover glow
	m: '#ef6fb0',
	h: '#9a6a3b', // brown
	H: '#5a3a1a',
	e: '#5ccf4a',
	E: '#2f8a2a',
	x: '#6b4a2a', // poop
	X: '#3e2814',
};

// Swap palette characters, e.g. recolor(car, { u: 'y', U: 'Y' }) for a taxi.
const recolor = (rows, map) => rows.map(r => [...r].map(ch => map[ch] ?? ch).join(''));

// Top-down pigeon: round head, eyes, jagged feather tips, fan tail.
const BIRD_UP = mirror([
	'........',
	'.......o',
	'......qo',
	'.....qkq',
	'.....qqq',
	'......nn',
	'...kkppp',
	'.kkpppPp',
	'kpppppPp',
	'pPPpPppp',
	'PkPkPkpp',
	'k.k.k.pp',
	'......Pp',
	'.....PPP',
	'....PgPg',
	'....k.k.',
]);

const BIRD_DOWN = mirror([
	'........',
	'.......o',
	'......qo',
	'.....qkq',
	'.....qqq',
	'......nn',
	'.....ppp',
	'....kpPp',
	'...kppPp',
	'..kpPppp',
	'.kPkPppp',
	'kPk.kPpp',
	'k.....Pp',
	'.....PPP',
	'....PgPg',
	'....k.k.',
]);

const PROP = [
	'........',
	'......kV',
	'....kVVv',
	'......kv',
	'......kv',
	'......kv',
	'kVVVVVVv',
	'kvvrrvvv',
	'kvvRrvvv',
	'kVVVVVVv',
	'......kv',
	'......kc',
	'......yv',
	'.....GGy',
	'........',
	'........',
];
const PROP_B = PROP.map((r, i) => (i === 13 ? '.......y' : r));

const JET = mirror([
	'........',
	'.....k.k',
	'.....kGg',
	'......Gg',
	'......Gg',
	'.....kGg',
	'....kGgg',
	'...kGggg',
	'..kGgggg',
	'.kGggggg',
	'kGGGGggg',
	'......gc',
	'......gc',
	'......kg',
	'.......k',
	'........',
]);

const DRONE = mirror([
	'GGG...',
	'GkG...',
	'GGGk..',
	'...kk.',
	'....gg',
	'....gr',
	'....gr',
	'....gg',
	'...kk.',
	'GGGk..',
	'GkG...',
	'GGG...',
]);
const DRONE_B = DRONE.map(r => r.replace(/GGG/g, 'g.g').replace(/GkG/g, '.k.'));

// Flying car, front (bottom) has the windshield: the bullseye.
const CAR = mirror([
	'..kkkk',
	'.kuuuu',
	'rkuccc',
	'.kuuuu',
	'ckuUUU',
	'.kuUUU',
	'.kuUUU',
	'.kuuuu',
	'ckuccc',
	'.kuccc',
	'.kuuuu',
	'ykuuuu',
	'..kkkk',
	'...c..',
]);
const CAR_B = CAR.map((r, i) => (i === 13 ? '............' : r));

const VAN = mirror([
	'.kkkkkk',
	'kwwwwww',
	'rwwwwww',
	'kwhhhhh',
	'cwhwwww',
	'kwhwwhw',
	'kwhwwhw',
	'kwhhhhh',
	'kwwwwww',
	'cwwwwww',
	'kwwwwww',
	'kGGGGGG',
	'kGccccc',
	'kGccccc',
	'yGGGGGG',
	'.kkkkkk',
	'..c....',
]);
const VAN_B = VAN.map((r, i) => (i === 16 ? '..............' : r));

const BLIMP = mirror([
	'......kk',
	'....kkGG',
	'..kkGggg',
	'.kGggggg',
	'.kgggggg',
	'kGgggggg',
	'kgggggrr',
	'kggggrww',
	'kggggrwr',
	'kggggrww',
	'kgggggrr',
	'kGgggggg',
	'kGgggggg',
	'kGgggggg',
	'kGgggggg',
	'.kGggggg',
	'.kGggggg',
	'..kGgggg',
	'..kGGggg',
	'.kkkGGgg',
	'kmmkkGGg',
	'kmmk.kGG',
	'.kk...kk',
	'......kh',
	'......kh',
	'.......k',
]);

// The boss: a zeppelin with gun gondolas, flying in from the top.
const AIRSHIP = mirror([
	'..........kkkk',
	'.......kkkGGGG',
	'.....kkGGggggg',
	'....kGgggggggg',
	'...kGggggggggg',
	'..kGgggggggggg',
	'..kgggggggggrr',
	'.kGggggggggrRR',
	'.kgggggggggrRw',
	'.kggggggggggrr',
	'kGgggggggggggg',
	'kggggggggggggg',
	'kgggkkkggggggg',
	'kggkhhhkgggggg',
	'kggkhrhkgggggg',
	'kggkhhhkgggggg',
	'kgggkkkggggggg',
	'kggggggggggggg',
	'kGgggggggggggg',
	'kGgggggggggkkk',
	'kGggggggggkhhh',
	'kGggggggggkhcc',
	'kGggggggggkhhh',
	'kGggggggggkhcc',
	'kGggggggggkhhh',
	'kGgggggggggkkk',
	'.kGggggggggggg',
	'.kGggggggggggg',
	'..kGgggggggggg',
	'..kGGggggggggg',
	'...kGGgggggggg',
	'.kkkkGGggggggg',
	'kmmmmkGGgggggg',
	'kmmmmkkGGGgggg',
	'.kkkk..kkGGGGG',
	'.........kkkkk',
	'............kh',
	'............kh',
	'...........kkh',
	'.............k',
]);

// Monster truck, top-down, facing right: oversized tyres, cab glass, flame decals.
const TYRES_A = '..kGkGkk....kGkGkk..';
const TYRES_B = '..kkGkGk....kkGkGk..';
const TRUCK = tread => [
	'..kkkkkk....kkkkkk..',
	tread,
	'..kkkkkk....kkkkkk..',
	'.kkkkkkkkkkkkkkkkkk.',
	'kyrrrrrrrrrkcccRrrrk',
	'kyoyrrrrrrrkcccRrrrw',
	'kroyorrrrrrkcccRrrrk',
	'kroyorrrrrrkcccRrrrk',
	'kyoyrrrrrrrkcccRrrrw',
	'kyrrrrrrrrrkcccRrrrk',
	'.kkkkkkkkkkkkkkkkkk.',
	'..kkkkkk....kkkkkk..',
	tread,
	'..kkkkkk....kkkkkk..',
];

const SPLAT = mirror(['.z', 'zw', 'zw', 'zz', '.z']);
const BOMB = mirror(['.xx', 'xzx', 'xxX', '.XX']);
const SPLATTER = mirror([
	'..z...',
	'z..z.z',
	'...zzz',
	'.zzzzw',
	'..zzww',
	'z.zzzz',
	'..zzzz',
	'.z.zz.',
]);
const BULLET = mirror(['.r', 'ry', 'ry', '.r']);
const FLAK = mirror(['.oo', 'oyy', 'oyw', '.oo']);

const FRIES = mirror([
	'.y.y',
	'.yyy',
	'yyyy',
	'FFFF',
	'FFwF',
	'FFFF',
	'.FFF',
].map(r => r.replace(/F/g, 'r')));
const BREAD = mirror([
	'..hh',
	'.hYY',
	'hYYY',
	'hYYz',
	'hYYz',
	'hYYY',
	'.hhh',
]);
const BUG = mirror([
	'k...',
	'.k.E',
	'..Ee',
	'kEee',
	'.Eee',
	'kEee',
	'..Ee',
]);
const CLOUD = mirror([
	'.......ww',
	'....wwwww',
	'..wwwwwww',
	'.wwwwwwww',
	'wwwwwwwww',
	'gwwwwwwww',
	'.gggggggg',
]);
const SPARK = ['ww', 'ww'];

// Ducks are the pigeon body recoloured: q head, n neck, p body, P wing bars,
// o bill, g tail.
const DUCKS = {
	mallard: { q: 'E', n: 'w', p: 'g', P: 'h', o: 'y', g: 'k' },       // green head, white collar
	merganser: { q: 'R', n: 'w', p: 'w', P: 'G', o: 'r', g: 'G' },     // rusty crest, red bill
	eider: { q: 'w', n: 'e', p: 'w', P: 'k', o: 'G', g: 'k' },         // white back, black bars
};
const duck = map => [recolor(BIRD_UP, map), recolor(BIRD_DOWN, map)];

const egg = speck => mirror([
	'..z',
	'.zz',
	`z${speck}z`,
	'zzz',
	`zz${speck}`,
	'zzz',
	'.zz',
]);
const FEATHER = [
	'......w',
	'.....ww',
	'....wwg',
	'...wwg.',
	'..wwg..',
	'.wwg...',
	'.wg....',
	'h......',
];
const SHELL = mirror(['.zw', 'zww', 'zww', 'zzw', '.zz']);

export const SPRITES = {
	bird: { frames: [BIRD_UP, BIRD_DOWN] },
	mallard: { frames: duck(DUCKS.mallard) },
	merganser: { frames: duck(DUCKS.merganser) },
	eider: { frames: duck(DUCKS.eider) },
	egg_mallard: { frames: [egg('e')] },
	egg_merganser: { frames: [egg('r')] },
	egg_eider: { frames: [egg('G')] },
	feather: { frames: [FEATHER] },
	shell: { frames: [SHELL], scale: 2 },
	prop: { frames: [mirror(PROP), mirror(PROP_B)] },
	jet: { frames: [JET] },
	drone: { frames: [DRONE, DRONE_B] },
	car: { frames: [CAR, CAR_B] },
	taxi: { frames: [recolor(CAR, { u: 'y', U: 'Y' }), recolor(CAR_B, { u: 'y', U: 'Y' })] },
	van: { frames: [VAN, VAN_B] },
	blimp: { frames: [BLIMP] },
	monster_truck: { frames: [TRUCK(TYRES_A), TRUCK(TYRES_B)], scale: 4 },
	airship: { frames: [AIRSHIP], scale: 4 },
	splat: { frames: [SPLAT], scale: 2 },
	bomb: { frames: [BOMB] },
	splatter: { frames: [SPLATTER], scale: 4 },
	bullet: { frames: [BULLET], scale: 2 },
	flak: { frames: [FLAK], scale: 2 },
	fries: { frames: [FRIES] },
	bread: { frames: [BREAD] },
	bug: { frames: [BUG] },
	cloud: { frames: [CLOUD], scale: 5 },
	spark: { frames: [SPARK], scale: 2 },
};
