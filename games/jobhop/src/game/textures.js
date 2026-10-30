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
	buildShadow(scene);
	buildVignette(scene);
}

const canvas = (scene, key, w, h) => {
	if (scene.textures.exists(key)) scene.textures.remove(key);
	return scene.textures.createCanvas(key, w, h);
};

// A soft ground shadow, drawn in chunky rows to match the pixel art.
// 32 px wide; scale it to the unit.
function buildShadow(scene) {
	const tex = canvas(scene, 'shadow', 32, 10);
	const ctx = tex.context;
	ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
	[[8, 0, 16], [3, 2, 26], [0, 4, 32], [3, 6, 26], [8, 8, 16]].forEach(([x, y, w]) => ctx.fillRect(x, y, w, 2));
	tex.refresh();
}

// Red edges for the hurt flash: clear in the middle, glowing at the rim.
function buildVignette(scene) {
	const { width: w, height: h } = TUNING;
	const tex = canvas(scene, 'vignette', w, h);
	const ctx = tex.context;
	const grad = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, Math.hypot(w, h) / 2);
	grad.addColorStop(0, 'rgba(214, 70, 60, 0)');
	grad.addColorStop(1, 'rgba(214, 70, 60, 0.85)');
	ctx.fillStyle = grad;
	ctx.fillRect(0, 0, w, h);
	tex.refresh();
}

// A dark, tiling meadow: tufts, pebbles and the odd flower, in 3px "pixels".
function buildGround(scene) {
	const size = 192, px = 3;
	const tex = canvas(scene, 'ground', size, size);
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
