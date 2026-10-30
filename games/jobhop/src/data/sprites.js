// Pixel art as data. Each sprite: { frames: [rows...], scale? } where rows use
// PALETTE characters and '.' is transparent. Most are authored as the left
// half and mirrored. Every job shares one hero body, recoloured, with a head
// that hints at the class.
import { mirror } from '../../../../shared/pixelart.js';

export const PALETTE = {
	k: '#14121c', // outline
	s: '#f0c39a', // skin
	d: '#3a3550', // trousers
	w: '#f4f4f4',
	g: '#b8bcc8',
	G: '#6b7080',
	r: '#d6463c',
	R: '#8f2a24',
	b: '#4d8fe0',
	B: '#2b5aa8',
	y: '#f2d544',
	Y: '#c9a227',
	e: '#5ccf4a',
	E: '#2f8a2a',
	p: '#9a5ad6',
	P: '#5a2f8a',
	o: '#f29d38',
	O: '#a85a1a',
	n: '#9a6a3b',
	N: '#5a3a1a',
	c: '#9ff0fa',
	x: '#26222f',
	t: '#e8dcc0', // bone
};

// Hero template. Placeholders: H helm/hat, h hair, a tunic, A tunic trim.
const HEADS = {
	helm: ['....kk', '...kHH', '..kHHH', '..kHss', '..ksks', '...kss'],
	hat: ['.....k', '....kH', '...kHH', '.kkHHH', '..ksks', '...kss'],
	band: ['...kkk', '..khhh', '..kHHH', '..khss', '..ksks', '...kss'],
	hood: ['...kkk', '..kHHH', '.kHHHH', '.kHsks', '.kHHHH', '..kHHH'],
	blackhat: ['.....k', '....kH', '...kHH', '.kkHHH', '..kxyx', '...kxx'],
};
const BODY = ['...kaa', '..kaAa', '.ksaAa', '..kAAA'];
const LEGS = [
	['...kdkkdk...', '...kk..kk...'],
	['..kdk..kdk..', '..kk....kk..'],
];

const recolor = (rows, map) => rows.map(r => [...r].map(ch => map[ch] ?? ch).join(''));

function hero(head, colors) {
	const top = mirror([...HEADS[head], ...BODY]);
	return { frames: LEGS.map(legs => recolor([...top, ...legs], colors)) };
}

export const SPRITES = {
	swordsman: hero('helm', { H: 'g', a: 'b', A: 'B' }),
	lancer: hero('helm', { H: 'E', a: 'e', A: 'E' }),
	mage: hero('hat', { H: 'b', a: 'b', A: 'B' }),
	pugilist: hero('band', { H: 'r', h: 'n', a: 'o', A: 'O' }),
	knight: hero('helm', { H: 'w', a: 'g', A: 'G' }),
	dragoon: hero('helm', { H: 'p', a: 'p', A: 'P' }),
	blackmage: hero('blackhat', { H: 'N', a: 'B', A: 'x', s: 'x' }),
	monk: hero('band', { H: 'r', h: 'x', a: 'y', A: 'Y' }),
	paladin: hero('helm', { H: 'y', a: 'w', A: 'Y' }),
	ninja: hero('hood', { H: 'x', a: 'x', A: 'P' }),

	goblin: { frames: [mirror([
		'k....', 'ke.kk', 'keeee', '.kere', '.keee', '..kEE', '.knnn', '.knNn', '..knn', '..k.k',
	])] },
	bat: { frames: [
		mirror(['k.....', 'kk...k', 'kpk.kp', 'kppkpp', '.kpppp', '..kprp', '...kpp', '....kk']),
		mirror(['......', '.....k', '....kp', '..kkpp', '.kpprp', 'kpppkp', 'kpk.kk', 'k.....']),
	] },
	flan: { frames: [mirror(['...kk', '..kyy', '.kyyy', '.kyky', 'kyyyy', 'kYyyy', 'kYYYY', '.kkkk'])] },
	wolf: { frames: [mirror([
		'.k....', 'kgk..k', 'kggkgg', '.kgggg', '.kgrgg', '..kggg', '.kgggg', 'kgggGG', 'kGk.kG', 'k....k',
	])] },
	skeleton: { frames: [mirror([
		'..kkk', '.kttt', '.ktkt', '.kttt', '..ktk', '...kt', '.kttt', 'kt.kt', 'k.ktt', '...kt', '..kt.', '..kk.',
	])] },
	imp: { frames: [mirror(['k....', 'kr...', '.krkk', '.krrr', '.kryr', '.krrr', 'kRrrr', 'kRkRr', '.k.kR', '...kk'])] },
	ogre: { frames: [mirror([
		'...kkkk', '..knnnn', '.knnnnn', '.knrknn', '.knnnnn', '..knkkk', '.kkNnnn',
		'knNNnnn', 'knnNnnn', 'knkNnnn', 'kk.kNnn', '...kNNk', '...kNk.', '...kk..',
	])] },
	chaos: { scale: 4, frames: [mirror([
		'k.......', 'rk......', 'rRk..kkk', '.rRkkRRR', '..kRRRRR', '..kRyRRR', '..kRRRRR', '.kxRRkkk',
		'kxxxRRRR', 'kxkxxRRR', 'kx.kxxxR', 'k..kxxxx', '...kxkxx', '...kx.kx', '..kxk.kx', '..kk..kk',
	])] },

	// Projectiles point up; Play rotates them to their heading.
	bolt: { frames: [['.cc.', 'cwwc', 'cwwc', '.cc.']] },
	firebolt: { frames: [['.yy.', 'ryyr', 'royr', '.rr.']] },
	shuriken: { frames: [['..g..', '.gGg.', 'gGkGg', '.gGg.', '..g..']] },
	lance: { frames: [['.w.', '.w.', 'gwg', '.g.', '.n.', '.n.', '.n.', '.n.', '.n.']] },
	beam: { frames: [['.yy.', 'ywwy', 'ywwy', 'ywwy', 'ywwy', 'ywwy', 'ywwy', 'ywwy', 'ywwy', '.yy.']] },

	// Grey so the tier tint shows through.
	gem: { scale: 2, frames: [['..w..', '.wgw.', 'wgwgw', 'wgggw', '.wgw.', '..w..']] },
	// White so particles can be tinted any colour.
	spark: { scale: 2, frames: [['ww', 'ww']] },
	potion: { frames: [['..k..', '.kwk.', '.krk.', 'krrrk', 'krRrk', '.kkk.']] },
};

// Gem colours by gemTier (core/xp.js): small, medium, large.
export const GEM_TINTS = [0x7fb6ff, 0x6fe07a, 0xff6a6a];
