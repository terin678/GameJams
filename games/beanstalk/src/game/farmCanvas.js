// Draws the farm, the sky and the stalk onto a small pixel canvas.
// Everything it shows is read from the game state; it keeps no game logic.

import { parsePixelMap } from '../../../../shared/pixelart.js';
import { createRng } from '../../../../shared/rng.js';
import { stageOf } from '../core/farm.js';
import { calendar } from '../core/seasons.js';
import { stalkFrac } from '../core/phases.js';
import { plotOrder, mixColor } from '../core/layout.js';
import { heartsOf } from '../core/neighbours.js';
import { ribbonCount } from '../core/seeds.js';

const CROW_SECONDS = 1.6;

function bake(rows, palette, scale, flip = false) {
	const map = parsePixelMap(rows, palette);
	const c = document.createElement('canvas');
	c.width = map.width * scale;
	c.height = map.height * scale;
	const ctx = c.getContext('2d');
	for (const p of map.pixels) {
		ctx.fillStyle = p.color;
		ctx.fillRect((flip ? map.width - 1 - p.x : p.x) * scale, p.y * scale, scale, scale);
	}
	return c;
}

export function createFarmView(canvas, data, { SPRITES, PALETTE, VIEW }) {
	canvas.width = VIEW.width;
	canvas.height = VIEW.height;
	const ctx = canvas.getContext('2d');
	const { horizon, stalkX, plots: grid } = VIEW;
	const T = data.TUNING;

	const art = {};
	for (const [name, s] of Object.entries(SPRITES)) art[name] = s.frames.map(f => bake(f, PALETTE, VIEW.scale));
	const leafRight = bake(SPRITES.leaf.frames[0], PALETTE, VIEW.scale, true);
	const order = plotOrder(grid.cols, grid.rows);
	const helperCount = (state, kind) => Math.min(VIEW.maxHelpers,
		data.PROJECTS.reduce((n, p) => n + (p.helper === kind ? state.owned[p.id] ?? 0 : 0), 0));

	const starRng = createRng(5);
	const stars = Array.from({ length: VIEW.stars.count }, () => ({
		x: Math.floor(starRng.range(0, VIEW.width)),
		y: starRng.range(VIEW.stars.above, 1),
		tw: starRng.range(0, 6),
	}));
	const skyY = frac => Math.round(horizon - frac * horizon);
	const cell = i => ({ x: grid.x + order[i].col * grid.size, y: grid.y + order[i].row * grid.size });
	const put = (img, x, y) => ctx.drawImage(img, Math.round(x), Math.round(y));
	const scenes = data.PROJECTS.filter(p => p.scene);
	const has = (state, tag) => scenes.some(p => p.scene === tag && state.owned[p.id] > 0);
	let crowUntil = 0;

	function sky(state, season, t) {
		const g = ctx.createLinearGradient(0, horizon, 0, 0);
		for (const s of VIEW.skyStops) g.addColorStop(s.at, s.color ?? season.sky);
		ctx.fillStyle = g;
		ctx.fillRect(0, 0, VIEW.width, horizon);
		for (const s of stars) {
			ctx.globalAlpha = 0.45 + 0.4 * Math.sin(t * 1.5 + s.tw);
			ctx.fillStyle = '#ffffff';
			ctx.fillRect(s.x, skyY(s.y), 1, 1);
		}
		ctx.globalAlpha = 1;
		data.LANDMARKS.filter(m => m.sprite).forEach((m, i) => {
			const img = art[m.greenBy && state.owned[m.greenBy] ? `${m.sprite}_green` : m.sprite][0];
			const drift = m.sprite === 'cloud' ? Math.sin(t / 6) * 8 : 0;
			const x = i % 2 ? stalkX + 30 : stalkX - 30 - img.width;
			put(img, x + drift, skyY(m.y) - img.height / 2);
			if (m.sprite === 'cloud') put(img, stalkX + 46 - drift, skyY(m.y) + 6);
		});
	}

	function stalk(state, t) {
		if (state.height <= 0) return horizon;
		const top = Math.min(horizon - 3, skyY(stalkFrac(state.height, data.LANDMARKS)));
		ctx.fillStyle = PALETTE.G;
		ctx.fillRect(stalkX - 2, top, 4, horizon - top);
		ctx.fillStyle = PALETTE.g;
		ctx.fillRect(stalkX - 2, top, 1, horizon - top);
		ctx.fillRect(stalkX - 3, top - 2, 6, 3);
		const leaf = art.leaf[0];
		// With canopy solar, the leaves above the clouds catch the light.
		const glowAbove = has(state, 'glow') ? skyY(data.LANDMARKS.find(m => m.sprite === 'cloud').y) : -1;
		for (let y = horizon - 12, i = 0; y > top + 4; y -= 13, i++) {
			const x = i % 2 ? stalkX + 2 : stalkX - 2 - leaf.width;
			put(i % 2 ? leafRight : leaf, x, y);
			if (y < glowAbove) {
				ctx.fillStyle = PALETTE.y;
				ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 2 + i);
				ctx.fillRect(i % 2 ? x + leaf.width - 4 : x + 2, y, 2, 2);
				ctx.globalAlpha = 1;
			}
		}
		return top;
	}

	function probes(state, top, t) {
		if (state.probes < 1) return;
		const n = Math.min(VIEW.maxProbes, 1 + Math.floor(Math.log10(state.probes) * 1.5));
		for (let i = 0; i < n; i++) {
			const f = (t * 0.12 + i * 0.37) % 1;
			put(art.probe[0], stalkX - 3 + Math.sin(i * 2.4 + f * 6) * (8 + 60 * f), top * (1 - f) - 3);
		}
	}

	function ground(state, season, t) {
		ctx.fillStyle = season.grass;
		ctx.fillRect(0, horizon, VIEW.width, VIEW.height - horizon);
		ctx.fillStyle = mixColor(season.grass, '#000000', 0.25);
		ctx.fillRect(0, horizon, VIEW.width, 2);
		put(art.farmhouse[0], 8, horizon - art.farmhouse[0].height + 12);
		const house = { x: 8, y: horizon - art.farmhouse[0].height + 12 };
		for (let i = 0; i < Math.min(VIEW.maxRibbons, ribbonCount(state.seeds)); i++) {
			put(art.ribbon[0], house.x + 3 + i * 5, house.y + 4 + (i % 2) * 2);
		}
		if (state.mods.scarecrow) put(art.scarecrow[0], VIEW.width - 30, horizon - art.scarecrow[0].height + 12);
		for (const [tag, x] of Object.entries(VIEW.props)) {
			if (has(state, tag)) put(art[tag][0], x, horizon - art[tag][0].height + 12);
		}

		// Friends drop by: anyone with a heart strolls along the lane.
		data.NEIGHBOURS.forEach((n, i) => {
			const friend = state.friends[n.id];
			if (!friend || heartsOf(friend.points, T.friends) < 1) return;
			const img = art[`friend_${n.id}`][0];
			const x = 22 + i * 34 + Math.sin(t * 0.35 + i * 1.7) * 12;
			put(img, x, horizon - img.height + 15 - (Math.floor(t * 3 + i) % 2));
		});

		const stages = art.bean.length;
		state.plots.forEach((g, i) => {
			const { x, y } = cell(i);
			put(art.soil[0], x, y);
			const stage = stageOf(g, stages);
			if (stage >= 0) put(art.bean[stage], x, y);
		});

		const n = state.plots.length;
		// Sprinklers: a few drops arcing over every other plot.
		if (has(state, 'sprinkle')) {
			ctx.fillStyle = '#bfe6ff';
			for (let i = 0; i < n; i += 2) {
				const { x, y } = cell(i);
				for (let d = 0; d < 3; d++) {
					const f = (t * 1.5 + d / 3 + i * 0.13) % 1;
					ctx.fillRect(Math.round(x + 2 + f * 11), Math.round(y + 3 - Math.sin(f * Math.PI) * 5), 1, 1);
				}
			}
		}
		for (let i = 0; i < helperCount(state, 'farmhand'); i++) {
			const { x, y } = cell((Math.floor(t * 1.3 + i * 0.6) * 7 + i * 5) % n);
			put(art.farmhand[0], x, y - 8 - (Math.floor(t * 4 + i) % 2));
		}
		const span = grid.cols * grid.size - art.drone[0].width;
		for (let i = 0; i < helperCount(state, 'drone'); i++) {
			const row = i % Math.ceil(n / grid.cols);
			put(art.drone[0], grid.x + (t * 45 + i * 61) % span, grid.y + row * grid.size - 6 + Math.sin(t * 3 + i) * 2);
		}

		if (t < crowUntil) {
			const f = 1 - (crowUntil - t) / CROW_SECONDS;
			put(art.crow[Math.floor(t * 8) % 2], -16 + f * (VIEW.width + 32), grid.y - 14 + Math.sin(f * 9) * 5);
		}
	}

	// The box around the plots in use, in screen pixels.
	function farmBox(n) {
		let x0 = Infinity, y0 = Infinity, x1 = 0, y1 = 0;
		for (let i = 0; i < n; i++) {
			const { x, y } = cell(i);
			x0 = Math.min(x0, x);
			y0 = Math.min(y0, y);
			x1 = Math.max(x1, x + grid.size);
			y1 = Math.max(y1, y + grid.size);
		}
		return { x: x0 - 2, y: y0 - 6, w: x1 - x0 + 4, h: y1 - y0 + 8 };
	}

	// Glass over the plots: a pale tint, a frame, and a pane line every two plots.
	function greenhouse(box) {
		ctx.fillStyle = VIEW.glass.tint;
		ctx.fillRect(box.x, box.y, box.w, box.h);
		ctx.fillStyle = VIEW.glass.frame;
		ctx.fillRect(box.x, box.y, box.w, 2);
		ctx.fillRect(box.x, box.y + box.h - 1, box.w, 1);
		ctx.fillRect(box.x, box.y, 1, box.h);
		ctx.fillRect(box.x + box.w - 1, box.y, 1, box.h);
		ctx.globalAlpha = 0.45;
		for (let x = box.x + 2 + grid.size * 2; x < box.x + box.w - 2; x += grid.size * 2) ctx.fillRect(x, box.y, 1, box.h);
		ctx.globalAlpha = 1;
	}

	// `shelter` is a box nothing falls into (the greenhouse).
	function falling(fx, t, shelter) {
		const snow = fx === 'snow';
		const from = skyY(data.LANDMARKS.find(m => m.sprite === 'cloud')?.y ?? 0.3);
		const drop = VIEW.height - from;
		ctx.fillStyle = snow ? '#ffffff' : '#9fd0ff';
		for (let i = 0; i < 36; i++) {
			const x = (i * 53 + t * (snow ? 8 : 30)) % VIEW.width;
			const y = from + (i * 97 + t * (snow ? 30 : 230)) % drop;
			if (shelter && x > shelter.x && x < shelter.x + shelter.w && y > shelter.y - 4 && y < shelter.y + shelter.h) continue;
			ctx.fillRect(Math.floor(x), Math.floor(y), snow ? 2 : 1, snow ? 2 : 5);
		}
	}

	return {
		// `t` is seconds on any steady clock; it only drives animation.
		draw(state, t) {
			const { season } = calendar(state.day, data.SEASONS, T.calendar);
			const weather = data.WEATHER.find(w => w.id === state.weather);
			sky(state, season, t);
			const top = stalk(state, t);
			probes(state, top, t);
			ground(state, season, t);
			const glass = state.mods.greenhouse ? farmBox(state.plots.length) : null;
			if (glass) greenhouse(glass);
			const fx = weather?.fx ?? season.fx;
			if (fx) falling(fx, t, glass);
		},
		crow(t) {
			crowUntil = t + CROW_SECONDS;
		},
	};
}
