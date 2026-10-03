// Pixel art as data. Each sprite: { frames: [rows...] } where rows use PALETTE
// characters and '.' is transparent. Drawn at VIEW.scale screen pixels per pixel.

import { NEIGHBOURS } from './neighbours.js';

export const PALETTE = {
	k: '#1b1b2a', // outline
	w: '#f4f4f4',
	c: '#f6efc8', // cream
	n: '#c9ceda', // moon grey
	N: '#7e8496',
	d: '#4a2f16', // soil, dark
	D: '#7a5230', // soil
	g: '#6fdc55', // leaf
	G: '#2f8a2a', // stem
	y: '#f2d544',
	o: '#f29d38',
	r: '#d6463c',
	b: '#4d8fe0',
	s: '#f0c090', // skin
	h: '#9a6a3b', // wood
	p: '#b48cf0', // galaxy
	P: '#7a5ac8',
	R: '#8f2a24', // roof shadow
	C: '#d9cfa0', // wall shadow
	H: '#5a3a1a', // dark wood
};

// Swap palette characters, e.g. a moon that has been planted over.
const recolor = (rows, map) => rows.map(r => [...r].map(ch => map[ch] ?? ch).join(''));

const MOON = [
	'..nnnn..',
	'.nnnNnn.',
	'nnnnnnnn',
	'nNnnnnnn',
	'nnnnnNnn',
	'nnNnnnnn',
	'.nnnnnn.',
	'..nnnn..',
];
const GALAXY = [
	'..........pp..',
	'....ppp....pp.',
	'..pp...pp...p.',
	'.p...pwwp..pp.',
	'.p..pwyywp.p..',
	'.pp..pwwp...p.',
	'.p...pp...pp..',
	'.pp....ppp....',
	'..pp..........',
];

// A neighbour on a visit: A is the hat, B the shirt, S the skin (see `look` in neighbours.js).
const VISITOR = [
	'.AAAA.',
	'AAAAAA',
	'.SSSS.',
	'.SkSk.',
	'.BBBB.',
	'SBBBBS',
	'.BBBB.',
	'.k..k.',
];

export const SPRITES = {
	soil: { frames: [[
		'DDDDDDDD',
		'DdDDDDdD',
		'DDDDDDDD',
		'DDDdDDDD',
		'DDDDDDDD',
		'DdDDDDdD',
		'DDDDDDDD',
		'dddddddd',
	]] },
	// One frame per stage of growth; the last is ripe.
	bean: { frames: [
		[
			'........',
			'........',
			'........',
			'........',
			'........',
			'...g....',
			'...G....',
			'........',
		],
		[
			'........',
			'........',
			'........',
			'..g..g..',
			'...gg...',
			'...G....',
			'...G....',
			'........',
		],
		[
			'........',
			'..g.g...',
			'.gGgGg..',
			'..gGg.g.',
			'.gGGGg..',
			'..gGg...',
			'...G....',
			'........',
		],
		[
			'..g.g...',
			'.gGgGgg.',
			'gGyGgyG.',
			'.gGgGGg.',
			'gyGGyGg.',
			'.gGGGg..',
			'...G....',
			'........',
		],
	] },
	farmhand: { frames: [[
		'..yyyy..',
		'.yyyyyy.',
		'..ssss..',
		'..ksks..',
		'..bbbb..',
		'.sbbbbs.',
		'..bbbb..',
		'..k..k..',
	]] },
	drone: { frames: [[
		'nnn..nnn',
		'.NNNNNN.',
		'..NrrN..',
		'...NN...',
	]] },
	scarecrow: { frames: [[
		'..yyyy..',
		'.yyyyyy.',
		'..cccc..',
		'..ckck..',
		'hhrrrrhh',
		'..rrrr..',
		'..rrrr..',
		'...hh...',
		'...hh...',
		'...hh...',
	]] },
	farmhouse: { frames: [[
		'...........NN...',
		'.......rr..NN...',
		'......rrrr.NN...',
		'.....rrrrrrNN...',
		'....rrrrrrrrN...',
		'...rrrrrrrrrr...',
		'..rrrrrrrrrrrr..',
		'.RRRRRRRRRRRRRR.',
		'..cccccccccccC..',
		'..cwwcccccwwcC..',
		'..cbbcchhcbbcC..',
		'..cbbcchhcbbcC..',
		'..cccccHhccccC..',
		'..CCCCChhCCCCC..',
	]] },
	crow: { frames: [
		[
			'k......k',
			'.kk..kk.',
			'..kkkk..',
			'...kko..',
		],
		[
			'........',
			'..kkkk..',
			'.kkkkko.',
			'k..kk..k',
		],
	] },
	leaf: { frames: [[
		'.gg..',
		'gGGg.',
		'.ggGG',
	]] },
	cloud: { frames: [[
		'....wwww........',
		'..wwwwwwww..ww..',
		'.wwwwwwwwwwwwww.',
		'wwwwwwwwwwwwwwww',
		'.wwwwwwwwwwwwww.',
	]] },
	moon: { frames: [MOON] },
	moon_green: { frames: [recolor(MOON, { n: 'g', N: 'G' })] },
	sun: { frames: [[
		'..yyyy..',
		'.yyyyyy.',
		'yyyyyyyy',
		'yyyoyyyy',
		'yyyyyyyy',
		'yyyyyoyy',
		'.yyyyyy.',
		'..yyyy..',
	]] },
	sun_green: { frames: [[
		'..gggg..',
		'.gyyyyg.',
		'gyyyyyyg',
		'gyyGyyyg',
		'gyyyyyyg',
		'gyyyyGyg',
		'.gyyyyg.',
		'..gggg..',
	]] },
	star: { frames: [[
		'..w..',
		'..w..',
		'wwwww',
		'..w..',
		'..w..',
	]] },
	galaxy: { frames: [GALAXY] },
	galaxy_green: { frames: [recolor(GALAXY, { p: 'g', w: 'y' })] },
	probe: { frames: [[
		'.g.',
		'gyg',
		'.g.',
	]] },
	...Object.fromEntries(NEIGHBOURS.map(n => [`friend_${n.id}`, {
		frames: [recolor(VISITOR, { A: n.look.hat, B: n.look.shirt, S: n.look.skin })],
	}])),
	// The Giant's castle, on its cloud, once the climber has found it.
	castle: { frames: [[
		'n.n..n.n',
		'nnn..nnn',
		'nNn..nNn',
		'nnnnnnnn',
		'nnNkkNnn',
		'nnnkknnn',
	]] },
	// Someone on their way up the stalk.
	climber: { frames: [[
		'.ss.',
		'.rr.',
		'srrs',
		'.kk.',
	]] },
	// A prize ribbon, pinned to the farmhouse for each one won at the fair.
	ribbon: { frames: [[
		'.bb.',
		'byyb',
		'.bb.',
		'b..b',
	]] },
	// The guard (data/guard.js): pests, and the animals posted against them.
	slug: { frames: [[
		'.....k',
		'.hhhhh',
		'hhHhHh',
	]] },
	mouse: { frames: [[
		'n.n...',
		'nnnn..',
		'knnnnr',
		'.n..n.',
	]] },
	rabbit: { frames: [[
		'c.c...',
		'c.c...',
		'ccc...',
		'kcccc.',
		'cccccw',
		'c..cc.',
	]] },
	duck: { frames: [[
		'.ww...',
		'okw...',
		'.wwwww',
		'.wwww.',
		'..o.o.',
	]] },
	cat: { frames: [[
		'o.o....',
		'ooo...o',
		'kok...o',
		'ooooooo',
		'.ooooo.',
		'.o...o.',
	]] },
	dog: { frames: [[
		'H.H.....',
		'hhh....h',
		'khk....h',
		'hhhhhhhh',
		'.hhhhhh.',
		'.h....h.',
	]] },
	// Things that appear on the farm when a project is bought (see VIEW.props).
	can: { frames: [[
		'.nn..n',
		'nnnnn.',
		'nNnn..',
		'nnnn..',
		'.nn...',
	]] },
	compost: { frames: [[
		'...gg...',
		'..hHhh..',
		'.hHhhHh.',
		'hhHhhhHh',
		'HHHHHHHH',
	]] },
	sign: { frames: [[
		'cccccc',
		'cGGGGc',
		'cccccc',
		'..hh..',
		'..hh..',
		'..hh..',
		'..hh..',
		'..hh..',
	]] },
	stall: { frames: [[
		'rrwwrrwwrrww',
		'rrwwrrwwrrww',
		'.rwwrrwwrrw.',
		'.h........h.',
		'.h........h.',
		'.h.gg.gg..h.',
		'hhhhhhhhhhhh',
		'hHHHHHHHHHHh',
		'hHHHHHHHHHHh',
		'h..........h',
	]] },
	library: { frames: [[
		'.....nn.....',
		'....nnnn....',
		'...nnnnnn...',
		'..nnnnnnnn..',
		'.nnnnnnnnnn.',
		'NNNNNNNNNNNN',
		'.nnnnnnnnnn.',
		'.nbnbnnbnbn.',
		'.nbnbnnbnbn.',
		'.nnnnhhnnnn.',
		'.nnnnhhnnnn.',
		'NNNNNNNNNNNN',
	]] },
	billboard: { frames: [[
		'kkkkkkkkkkkk',
		'kwwwwggwwwwk',
		'kwwwgGGgwwwk',
		'kwwwgGGgwwwk',
		'kwwwwggwwwwk',
		'kkkkkkkkkkkk',
		'..h......h..',
		'..h......h..',
		'..h......h..',
		'..h......h..',
	]] },
};

// The Golden Bean from an earlier run grows on the first plot: the same plant, in gold.
SPRITES.bean_gold = { frames: SPRITES.bean.frames.map(f => recolor(f, { g: 'y', G: 'o' })) };

// The farm view. Sizes are in screen pixels of the 240x320 canvas.
export const VIEW = {
	width: 240,
	height: 320,
	scale: 2,
	horizon: 232,         // y of the ground line; the sky is above it
	stalkX: 120,
	plots: { x: 24, y: 250, cols: 12, rows: 4, size: 16 },
	skyStops: [           // from the horizon up; null takes the season's sky colour
		{ at: 0, color: null },
		{ at: 0.3, color: null },
		{ at: 0.42, color: '#1c2a5e' },
		{ at: 0.56, color: '#0a0d20' },
		{ at: 1, color: '#000000' },
	],
	stars: { count: 60, above: 0.4 },
	glass: { tint: 'rgba(200, 244, 255, 0.2)', frame: '#e8fbff' },   // the greenhouse
	// Where a project's `scene` prop stands: x of its left edge; it sits on the grass.
	props: { can: 44, compost: 56, library: 76, billboard: 140, sign: 168, stall: 182 },
	// Scene tags that are effects, not props.
	effects: ['sprinkle', 'glow'],
	// Farmhouse window panes, in sprite pixels [x, y, w, h]; lit at night.
	windows: [[3, 10, 2, 2], [10, 10, 2, 2]],
	castleFrom: 'gate',   // the castle shows once this ledge of the climb has been reached
	maxRibbons: 5,        // drawn on the farmhouse
	maxHelpers: 8,
	maxProbes: 24,
};
