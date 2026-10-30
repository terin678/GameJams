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
	fontFamily: FONT, fontSize: fs(scene, px), color, fontStyle: 'bold', ...extra,
});

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

// 0xrrggbb as a CSS colour string.
export const css = color => `#${color.toString(16).padStart(6, '0')}`;
