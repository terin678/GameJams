// Turns src/data/sprites.js into Phaser textures, and paints the city backdrop.
import { SPRITES, PALETTE } from '../data/sprites.js';
import { TUNING } from '../data/tuning.js';
import { makeTexture } from '../../../../shared/pixelart.js';
import { createRng } from '../../../../shared/rng.js';

export const frameKey = (key, i = 0) => `${key}_${i}`;
export const frameCount = key => SPRITES[key].frames.length;

export function buildTextures(scene) {
	for (const [key, sprite] of Object.entries(SPRITES)) {
		sprite.frames.forEach((rows, i) => makeTexture(scene, frameKey(key, i), rows, PALETTE, sprite.scale ?? TUNING.spriteScale));
	}
	buildCity(scene);
}

// A tiling city block grid seen from high above: streets on 96px cells so the
// texture wraps cleanly when it scrolls.
const CITY = {
	cell: 96,
	street: 14,
	base: '#252c3d',
	streetColor: '#323a4e',
	stripe: '#4a5470',
	roofs: ['#3b4458', '#444d63', '#363e52', '#4d4a58', '#3f4a50', '#4a4440'],
	park: '#2c4a36',
	tree: '#365e40',
	water: '#1d3550',
};

function buildCity(scene) {
	const w = TUNING.width, h = 576; // multiple of the cell so it wraps
	const tex = scene.textures.createCanvas('city', w, h);
	const ctx = tex.context;
	const rng = createRng(1943);
	const { cell, street } = CITY;

	ctx.fillStyle = CITY.streetColor;
	ctx.fillRect(0, 0, w, h);
	// lane stripes
	ctx.fillStyle = CITY.stripe;
	for (let y = 0; y < h; y += cell) for (let x = 0; x < w; x += 12) ctx.fillRect(x, y + street / 2, 6, 1);
	for (let x = 0; x < w; x += cell) for (let y = 0; y < h; y += 12) ctx.fillRect(x + street / 2, y, 1, 6);

	for (let cy = 0; cy < h; cy += cell) {
		for (let cx = 0; cx < w; cx += cell) {
			const x0 = cx + street, y0 = cy + street, size = cell - street;
			const kind = rng.next();
			if (kind < 0.12) {
				ctx.fillStyle = CITY.park;
				ctx.fillRect(x0, y0, size, size);
				ctx.fillStyle = CITY.tree;
				for (let i = 0; i < 9; i++) ctx.fillRect(x0 + rng.range(4, size - 12), y0 + rng.range(4, size - 12), 8, 8);
			} else if (kind < 0.2) {
				ctx.fillStyle = CITY.water;
				ctx.fillRect(x0, y0, size, size);
			} else {
				ctx.fillStyle = CITY.base;
				ctx.fillRect(x0, y0, size, size);
				// 2-4 buildings per block
				const split = rng.next() < 0.5;
				const n = 2 + Math.floor(rng.next() * 3);
				for (let i = 0; i < n; i++) {
					const bw = split ? size / n : size, bh = split ? size : size / n;
					const bx = x0 + (split ? i * bw : 0), by = y0 + (split ? 0 : i * bh);
					ctx.fillStyle = rng.pick(CITY.roofs);
					ctx.fillRect(bx + 2, by + 2, bw - 4, bh - 4);
					ctx.fillStyle = 'rgba(255,255,255,0.06)';
					ctx.fillRect(bx + 2, by + 2, bw - 4, 2);
					ctx.fillStyle = 'rgba(0,0,0,0.18)';
					ctx.fillRect(bx + 2, by + bh - 4, bw - 4, 2);
					if (rng.next() < 0.6) {
						ctx.fillStyle = 'rgba(0,0,0,0.25)';
						ctx.fillRect(bx + rng.range(6, bw - 14), by + rng.range(6, bh - 14), 6, 6);
					}
				}
			}
		}
	}
	tex.refresh();
}
