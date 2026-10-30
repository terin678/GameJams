// Reuses Images instead of creating and destroying hundreds a second
// (enemies, shots, gems, shadows). get() hands back an image reset to plain.
export class ImagePool {
	constructor(scene) {
		this.scene = scene;
		this.free = [];
	}

	get(x, y, key, depth) {
		const img = this.free.pop() ?? this.scene.add.image(0, 0, key);
		return img
			.setActive(true).setVisible(true)
			.setTexture(key).setPosition(x, y).setDepth(depth)
			.setAlpha(1).setScale(1).setRotation(0).setFlip(false, false).setOrigin(0.5)
			.clearTint();
	}

	release(img) {
		if (!img) return;
		this.scene.tweens.killTweensOf(img);
		img.setActive(false).setVisible(false);
		this.free.push(img);
	}
}
