import { buildTextures } from '../textures.js';

export class Boot extends Phaser.Scene {
	create() {
		buildTextures(this);
		this.scene.start('Menu');
	}
}
