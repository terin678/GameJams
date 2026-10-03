// Pixel art as data. Each sprite: { frames: [rows...] } where rows use PALETTE
// characters and '.' is transparent. Drawn at VIEW.scale screen pixels per pixel.

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
};

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
		'......rr......',
		'.....rrrr.....',
		'....rrrrrr....',
		'...rrrrrrrr...',
		'..rrrrrrrrrr..',
		'.rrrrrrrrrrrr.',
		'..cccccccccc..',
		'..cbbcccbbcc..',
		'..cbbcccbbcc..',
		'..ccccchhccc..',
		'..ccccchhccc..',
		'..ccccchhccc..',
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
	moon: { frames: [[
		'..nnnn..',
		'.nnnNnn.',
		'nnnnnnnn',
		'nNnnnnnn',
		'nnnnnNnn',
		'nnNnnnnn',
		'.nnnnnn.',
		'..nnnn..',
	]] },
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
	star: { frames: [[
		'..w..',
		'..w..',
		'wwwww',
		'..w..',
		'..w..',
	]] },
	galaxy: { frames: [[
		'........pp..',
		'..ppp..pp...',
		'.pp.pwwp....',
		'....wwww....',
		'...pwwp.pp..',
		'..pp..ppp...',
		'.pp.........',
	]] },
	probe: { frames: [[
		'.g.',
		'gyg',
		'.g.',
	]] },
};

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
	maxHelpers: 8,
	maxProbes: 24,
};
