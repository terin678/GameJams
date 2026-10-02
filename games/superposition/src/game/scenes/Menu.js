import { TUNING } from '../../data/tuning.js';
import { OBSERVERS } from '../../data/observers.js';
import { POWERS } from '../../data/powers.js';
import { fs, isTouch } from '../../../../../shared/ui.js';
import { frameKey } from '../textures.js';

const W = TUNING.width, H = TUNING.height;

export class Menu extends Phaser.Scene {
	create() {
		const sfx = this.registry.get('sfx');
		const scores = this.registry.get('scores');
		const style = (px, color = '#f4f4f4') => ({ fontFamily: 'monospace', fontSize: fs(this, px), color, fontStyle: 'bold', align: 'center' });

		this.add.text(W / 2, 54, 'SUPERPOSITION', { ...style(40, '#ff7ad1'), stroke: '#0c0f1a', strokeThickness: 8 }).setOrigin(0.5);
		this.add.text(W / 2, 92, "Schrödinger's cat vs. the Observers", style(13, '#9ff0fa')).setOrigin(0.5);

		this.cat = this.add.image(W / 2 - 22, 138, frameKey('cat')).setScale(2);
		this.twin = this.add.image(W / 2 + 22, 138, frameKey('cat')).setScale(2).setFlipX(true).setTint(0xff9ad8);

		this.add.rectangle(W / 2, 330, W - 40, 270, 0x121833, 0.85).setStrokeStyle(1, 0x4d6fe0);
		this.add.text(W / 2, 212, 'EAT EVERY QUANTUM.  DON\'T GET OBSERVED.', style(11, '#e8e8f0')).setOrigin(0.5);
		OBSERVERS.forEach((o, i) => {
			const x = W / 2 + (i - 1.5) * 100;
			this.add.image(x, 244, `eye_${o.id}`).setScale(1.2);
			this.add.text(x, 272, o.name, style(10, '#' + o.color.toString(16).padStart(6, '0'))).setOrigin(0.5);
		});
		Object.values(POWERS).forEach((p, i) => {
			const y = 306 + i * 34;
			this.add.image(50, y + 6, frameKey(p.sprite)).setScale(1.3);
			this.add.text(78, y, p.name, style(12, p.color)).setOrigin(0, 0);
			this.add.text(78, y + 14, p.blurb, style(10, '#b8bcc8')).setOrigin(0, 0);
		});
		const controls = isTouch(this) ? 'SWIPE to turn' : 'ARROWS / WASD move    P pause    M mute';
		this.add.text(W / 2, 438, controls, style(11)).setOrigin(0.5);

		const list = scores.list();
		const table = list.length ? list.map((e, i) => `${i + 1}. ${e.name}  ${String(e.score).padStart(7)}`).join('\n') : 'no scores yet';
		this.add.text(W / 2, 480, 'HIGH SCORES', style(12, '#f2d544')).setOrigin(0.5);
		this.add.text(W / 2, 494, table, { ...style(11), lineSpacing: 2 }).setOrigin(0.5, 0);

		const prompt = this.add.text(W / 2, H - 30, isTouch(this) ? 'TAP TO START' : 'PRESS SPACE TO START', style(16)).setOrigin(0.5);
		this.tweens.add({ targets: prompt, alpha: 0.2, yoyo: true, repeat: -1, duration: 600 });

		const mute = this.add.text(W - 10, 14, '', style(10, '#8a93b8')).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
		const showMute = () => mute.setText(sfx.muted ? '[M] sound: off' : '[M] sound: on');
		showMute();
		const toggleMute = () => {
			sfx.unlock();
			sfx.muted = !sfx.muted;
			this.registry.get('store').set('muted', sfx.muted);
			showMute();
		};
		mute.on('pointerdown', (_p, _x, _y, e) => { e.stopPropagation(); toggleMute(); });
		this.input.keyboard.on('keydown-M', toggleMute);

		let started = false;
		const start = () => {
			if (started) return;
			started = true;
			sfx.unlock();
			this.scene.start('Play');
		};
		this.input.keyboard.on('keydown-SPACE', start);
		this.input.keyboard.on('keydown-ENTER', start);
		this.input.on('pointerdown', start);
		this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
			this.input.keyboard.off('keydown-SPACE', start);
			this.input.keyboard.off('keydown-ENTER', start);
			this.input.keyboard.off('keydown-M', toggleMute);
			this.input.off('pointerdown', start);
		});
	}

	update(time) {
		// The pair drifts apart and back together, out of phase.
		const s = Math.sin(time / 500) * 30;
		this.cat.x = W / 2 - 22 - s;
		this.twin.x = W / 2 + 22 + s;
		this.cat.setAlpha(0.75 + 0.25 * Math.sin(time / 90));
		this.twin.setAlpha(0.75 - 0.25 * Math.sin(time / 90));
		this.cat.setTexture(frameKey('cat', Math.floor(time / 200) % 2));
		this.twin.setTexture(frameKey('cat', Math.floor(time / 200) % 2));
	}
}
