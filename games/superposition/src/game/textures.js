// Turns src/data/sprites.js into Phaser textures. Each observer gets its own
// eye and iris with the placeholder 'i' painted in its colour.
import { SPRITES, PALETTE } from '../data/sprites.js';
import { OBSERVERS } from '../data/observers.js';
import { TUNING } from '../data/tuning.js';
import { makeTexture } from '../../../../shared/pixelart.js';

export const frameKey = (key, i = 0) => `${key}_${i}`;
const hex = n => '#' + n.toString(16).padStart(6, '0');

export function buildTextures(scene) {
	const scale = s => s.scale ?? TUNING.spriteScale;
	for (const [key, sprite] of Object.entries(SPRITES)) {
		sprite.frames.forEach((rows, i) => makeTexture(scene, frameKey(key, i), rows, PALETTE, scale(sprite)));
	}
	for (const o of OBSERVERS) {
		const palette = { ...PALETTE, i: hex(o.color) };
		makeTexture(scene, `eye_${o.id}`, SPRITES.eye.frames[0], palette, scale(SPRITES.eye));
		makeTexture(scene, `iris_${o.id}`, SPRITES.iris.frames[0], palette, scale(SPRITES.iris));
	}
}
