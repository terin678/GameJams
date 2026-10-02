import { TUNING } from '../../data/tuning.js';
import { fs } from '../../../../../shared/ui.js';

const W = TUNING.width, H = TUNING.height;

export class Pause extends Phaser.Scene {
	create() {
		this.add.rectangle(0, 0, W, H, 0x0c0f1a, 0.75).setOrigin(0);
		const style = (px, color = '#f4f4f4') => ({ fontFamily: 'monospace', fontSize: fs(this, px), color, fontStyle: 'bold', align: 'center' });
		this.add.text(W / 2, H * 0.4, 'PAUSED', style(32, '#ff7ad1')).setOrigin(0.5);
		this.add.text(W / 2, H * 0.52, 'P / ESC / tap  to resume\nQ  to quit to menu', style(13)).setOrigin(0.5);

		const resume = () => {
			this.scene.resume('Play');
			this.scene.stop();
		};
		const quit = () => {
			this.scene.stop('Play');
			this.scene.start('Menu');
		};
		this.input.keyboard.once('keydown-P', resume);
		this.input.keyboard.once('keydown-ESC', resume);
		this.input.keyboard.once('keydown-Q', quit);
		this.input.once('pointerdown', resume);
		this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
			this.input.keyboard.off('keydown-P', resume);
			this.input.keyboard.off('keydown-ESC', resume);
			this.input.keyboard.off('keydown-Q', quit);
		});
	}
}
