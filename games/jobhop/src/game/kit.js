// Small helpers every scene was repeating.
import { fs } from '../../../../shared/ui.js';

export const FONT = 'monospace';

// Draw order in Play. Units (enemies, clones, the player) sort by height
// inside [unit, unitTop) so whoever stands lower on screen is drawn in front.
export const DEPTH = { ground: 0, shadow: 1, field: 2, gem: 5, unit: 10, unitTop: 20, shot: 25, fx: 30, text: 35, hud: 100 };

// Depth for a unit at world y, relative to the player at py.
export const unitDepth = (y, py) => DEPTH.unit + (DEPTH.unitTop - DEPTH.unit) * Math.max(0, Math.min(0.999, (y - py + 600) / 1200));

// Bold monospace at a phone-friendly size. `extra` overrides or adds fields.
export const textStyle = (scene, px, color = '#f4f4f4', extra = {}) => ({
	fontFamily: FONT, fontSize: fs(scene, px), color, fontStyle: 'bold', resolution: textResolution(scene), ...extra,
});

// The canvas is 800x600 stretched to fit the window, usually by an uneven
// factor. Text drawn at 1x then stretched comes out blocky and smeared, so
// draw it at the screen's real pixel density instead (capped at 4x).
export function textResolution(scene) {
	const s = scene.scale;
	const stretch = s.displaySize.width / s.width || 1;
	return Math.min(4, Math.max(1, Math.ceil(stretch * (window.devicePixelRatio || 1))));
}

// pixelArt keeps sprites crisp with nearest-neighbour sampling; text looks
// better smoothed. Call once at boot: every scene's text gets linear filtering.
export function smoothText(game) {
	for (const scene of game.scene.scenes) {
		scene.sys.events.on(Phaser.Scenes.Events.ADDED_TO_SCENE, obj => {
			if (obj.type === 'Text') obj.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
		});
	}
}

// Bind { 'keydown-X': fn } on the scene's keyboard and unbind on shutdown.
// The keyboard plugin outlives a scene restart, so leftover handlers would
// fire twice the next time round.
export function bindKeys(scene, map) {
	const kb = scene.input.keyboard;
	for (const [ev, fn] of Object.entries(map)) kb.on(ev, fn);
	scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
		for (const [ev, fn] of Object.entries(map)) kb.off(ev, fn);
	});
}

// Lay objects out top to bottom starting at y, using their measured heights,
// so text never collides when fonts scale up on phones. Each entry is an
// object or [object, gapAbove]. Objects should have origin y 0. Returns the
// bottom edge.
export function stack(y, entries) {
	for (const entry of entries) {
		const [obj, gap = 0] = Array.isArray(entry) ? entry : [entry, 0];
		y += gap;
		obj.setY(y);
		y += obj.displayHeight;
	}
	return y;
}

// Total height stack() would use, for centring a stack in a box.
export const stackHeight = entries => entries.reduce((h, e) => {
	const [obj, gap = 0] = Array.isArray(e) ? e : [e, 0];
	return h + gap + obj.displayHeight;
}, 0);

// 0xrrggbb as a CSS colour string.
export const css = color => `#${color.toString(16).padStart(6, '0')}`;
