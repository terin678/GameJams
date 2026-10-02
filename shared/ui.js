// Text scaling for fixed-size, FIT-scaled Phaser canvases (from Teron2).
// On a phone the canvas shrinks, so we scale text back up to stay legible.
// Capped, because on very narrow phones the raw inverse blows layouts apart.

let cachedScale = null;

export function textScale(scene) {
	if (scene.sys.game.device.os.desktop) return 1;
	if (cachedScale !== null) return cachedScale;
	const width = scene.game.canvas.getBoundingClientRect().width;
	if (!width) return 1; // not laid out yet; don't cache a bad value
	cachedScale = Math.min(1.6, Math.max(1, scene.scale.width / width));
	return cachedScale;
}

// Scaled font size as a Phaser style string: fs(this, 14) -> "22px" on mobile.
export function fs(scene, basePx) {
	return Math.round(basePx * textScale(scene)) + 'px';
}

export function isTouch(scene) {
	return scene.sys.game.device.input.touch && !scene.sys.game.device.os.desktop;
}
