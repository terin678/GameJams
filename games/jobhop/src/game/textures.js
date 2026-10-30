// Turns src/data/sprites.js into Phaser textures, and paints the ground tile.
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
	buildGround(scene);
}

// A dark, tiling meadow: tufts, pebbles and the odd flower, in 3px "pixels".
function buildGround(scene) {
	const size = 192, px = 3;
	if (scene.textures.exists('ground')) scene.textures.remove('ground');
	const tex = scene.textures.createCanvas('ground', size, size);
	const ctx = tex.context;
	const rng = createRng(2026);
	ctx.fillStyle = '#1d2a22';
	ctx.fillRect(0, 0, size, size);
	const dot = (x, y, color) => { ctx.fillStyle = color; ctx.fillRect(x * px, y * px, px, px); };
	const cells = size / px;
	for (let i = 0; i < 90; i++) {
		const x = Math.floor(rng.next() * cells), y = Math.floor(rng.next() * cells);
		const c = rng.pick(['#243427', '#28392b', '#213025']);
		dot(x, y, c);
		dot((x + 1) % cells, y, c);
	}
	for (let i = 0; i < 26; i++) {
		const x = Math.floor(rng.next() * (cells - 2)), y = Math.floor(rng.next() * (cells - 2));
		dot(x, y + 1, '#33503a');
		dot(x + 1, y, '#3c5e42');
		dot(x + 2, y + 1, '#33503a');
	}
	for (let i = 0; i < 6; i++) dot(Math.floor(rng.next() * cells), Math.floor(rng.next() * cells), '#3a3f4a');
	for (let i = 0; i < 4; i++) dot(Math.floor(rng.next() * cells), Math.floor(rng.next() * cells), rng.pick(['#7a5a8a', '#8a7a4a']));
	tex.refresh();
}
