// Pixel art as data, same format as Fowl Play: rows of PALETTE characters,
// '.' transparent, mostly authored as the left half and mirrored.
// Observer eyes use 'i' for the iris; textures.js paints it each observer's colour.
import { mirror } from '../../../../shared/pixelart.js';

export const PALETTE = {
	k: '#1b1b2a',
	w: '#f4f4f4',
	g: '#b8bcc8',
	G: '#6b7080',
	o: '#f29d38', // cat
	O: '#b8641e',
	p: '#ff9ab8', // nose
	r: '#d6463c',
	b: '#4d6fe0', // measured observer
	B: '#2b3a8a',
	y: '#f2d544',
	c: '#7ad7ff',
	C: '#2f8fb8',
	m: '#ff7ad1',
	M: '#a8338a',
	i: '#888888', // iris placeholder
};

// Schrödinger's cat, front on. Frame 2 opens its mouth to eat.
const CAT = mirror([
	'.k....',
	'.kk...',
	'.kok..',
	'.kookk',
	'kooooo',
	'kowkoo',
	'kowkoo',
	'koOoop',
	'.koOww',
	'..kkkk',
], { odd: false });
const CAT_EAT = CAT.map((r, i) => (i === 8 ? '.koOwkkwOok.' : r));

// A floating eye on a dangling nerve.
const EYE = mirror([
	'..kkkk',
	'.kwwww',
	'kwwwww',
	'kwwiii',
	'kwwiii',
	'kwwiii',
	'kwwiii',
	'kwwwww',
	'.kwwww',
	'..kkkk',
	'.....r',
	'....r.',
]);
const recolor = (rows, map) => rows.map(r => [...r].map(ch => map[ch] ?? ch).join(''));

const PUPIL = ['kk', 'kk'];
const IRIS = mirror(['.ii', 'iii', 'iii', '.ii']);
const PELLET = mirror(['.yy', 'yyw', 'yyy', '.yy']);

// Tunnelling: a wave passing through a wall.
const ITEM_TUNNEL = [
	'....GG....',
	'....GG....',
	'.c..GG..c.',
	'cCc.GG.cCc',
	'c.cCGGCc.c',
	'...cGGc...',
	'....GG....',
	'....GG....',
];
// Superposition: two overlapping copies.
const ITEM_SPLIT = [
	'.mmm......',
	'mMMMm.....',
	'mMMMmmm...',
	'mMMmMMMm..',
	'.mmmMMMm..',
	'...mMMMm..',
	'....mmm...',
	'..........',
];

export const SPRITES = {
	cat: { frames: [CAT, CAT_EAT] },
	eye: { frames: [EYE] },
	eye_measured: { frames: [recolor(EYE, { w: 'b', i: 'B', r: 'B' })] },
	eye_flash: { frames: [recolor(EYE, { w: 'w', i: 'b', r: 'b' })] },
	iris: { frames: [IRIS] },
	pupil: { frames: [PUPIL] },
	pellet: { frames: [PELLET] },
	item_tunnel: { frames: [ITEM_TUNNEL] },
	item_split: { frames: [ITEM_SPLIT] },
};
