import { buildTextures } from '../textures.js';
import { smoothText } from '../kit.js';

export class Boot extends Phaser.Scene {
	create() {
		buildTextures(this);
		smoothText(this.game);
		this.scene.start('Menu');
	}
}
