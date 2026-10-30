import { TUNING } from '../../data/tuning.js';
import { textStyle, bindKeys, fitCamera } from '../kit.js';

const W = TUNING.width, H = TUNING.height;

export class Pause extends Phaser.Scene {
	create() {
		fitCamera(this);
		const quality = this.registry.get('quality');
		const sfx = this.registry.get('sfx');
		const style = (px, color) => textStyle(this, px, color, { align: 'center' });
		this.add.rectangle(0, 0, W, H, 0x14121c, 0.7).setOrigin(0);
		const title = this.add.text(W / 2, H * 0.4, 'PAUSED', style(32, '#f2d544')).setOrigin(0.5).setScale(1.3).setAlpha(0);
		this.tweens.add({ targets: title, scale: 1, alpha: 1, duration: 200, ease: 'Back.easeOut' });
		this.add.text(W / 2, H * 0.53, 'P / ESC / tap  to resume\nQ  to give up (job XP is kept)', { ...style(13), lineSpacing: 6 }).setOrigin(0.5);
		const gfx = this.add.text(W / 2, H * 0.66, '', style(12, '#9ff0fa')).setOrigin(0.5).setInteractive({ useHandCursor: true });
		const showGfx = () => gfx.setText(`[G] graphics: ${quality.label}`);
		showGfx();
		const cycleGfx = () => {
			quality.cycle();
			sfx.play('select');
			showGfx();
		};
		gfx.on('pointerdown', (_p, _x, _y, e) => { e.stopPropagation(); cycleGfx(); });

		let done = false;
		const resume = () => {
			if (done) return;
			done = true;
			this.scene.resume('Play');
			this.scene.stop();
		};
		const quit = () => {
			if (done) return;
			done = true;
			this.scene.get('Play').finish(false, { immediate: true });
			this.scene.stop();
		};
		bindKeys(this, { 'keydown-P': resume, 'keydown-ESC': resume, 'keydown-Q': quit, 'keydown-G': cycleGfx });
		this.input.once('pointerdown', resume);
	}
}
