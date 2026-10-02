import { TUNING } from '../../data/tuning.js';
import { ENEMIES } from '../../data/enemies.js';
import { fs, isTouch } from '../../../../../shared/ui.js';
import { frameKey } from '../textures.js';
import { CHALLENGES, TIERS } from '../../data/challenges.js';
import { tierTotals } from '../../core/challenges.js';
const W = TUNING.width, H = TUNING.height;

export class Menu extends Phaser.Scene {
	create() {
		const sfx = this.registry.get('sfx');
		const scores = this.registry.get('scores');
		const style = (px, color = '#f4f4f4') => ({ fontFamily: 'monospace', fontSize: fs(this, px), color, fontStyle: 'bold', align: 'center' });

		this.ground = this.add.tileSprite(0, 0, W, H, 'city').setOrigin(0).setAlpha(0.6);
		this.add.rectangle(0, 0, W, H, 0x10131c, 0.35).setOrigin(0);
		this.add.rectangle(W / 2, 386, W - 40, 310, 0x10131c, 0.75).setStrokeStyle(1, 0x2c3550);

		this.add.text(W / 2, 60, 'FOWL PLAY', { ...style(46, '#f2d544'), stroke: '#1b1b2a', strokeThickness: 8 }).setOrigin(0.5);
		this.add.text(W / 2, 100, 'THE BATTLE OF MIDAIR', style(15, '#9ff0fa')).setOrigin(0.5);

		// Just the pigeon. Ducks and the flock are found in play.
		this.bird = this.add.image(W / 2, 165, frameKey('bird', 0)).setScale(1.5);

		// Field guide: what to splat, what to bomb.
		const sky = Object.values(ENEMIES).filter(e => e.layer === 'sky').slice(0, 3);
		const low = Object.values(ENEMIES).filter(e => e.layer === 'low' && !e.boss).slice(0, 3);
		this.add.text(W * 0.27, 238, 'SPLAT  (your altitude)', style(10, '#e8dcc0')).setOrigin(0.5);
		this.add.text(W * 0.73, 238, 'BOMB  (below you)', style(10, '#e8dcc0')).setOrigin(0.5);
		sky.forEach((e, i) => this.add.image(W * 0.27 + (i - 1) * 50, 270, frameKey(e.sprite)));
		low.forEach((e, i) => this.add.image(W * 0.73 + (i - 1) * 46, 270, frameKey(e.sprite)).setScale(TUNING.layers.lowScale).setTint(TUNING.layers.lowTint));

		const controls = isTouch(this)
			? 'DRAG to fly (auto-splat)\nHOLD the poop button to charge a bomb'
			: 'ARROWS / WASD  fly\nSPLAT  Z / SPACE / left click\nBOMB  X / SHIFT / right click  (hold to charge)\nP  pause     M  mute';
		this.add.text(W / 2, 324, controls, { ...style(11), lineSpacing: 6 }).setOrigin(0.5);
		this.add.text(W / 2, 394, 'FOOD refills ENERGY and GUT.\nGrab whatever falls. Some of it is... special.\nRED squadrons: get them all for a prize.\nHear a horn? Bomb the MONSTER TRUCK.', { ...style(10, '#b8bcc8'), lineSpacing: 3 }).setOrigin(0.5);

		const list = scores.list();
		const table = list.length
			? list.map((e, i) => `${i + 1}. ${e.name}  ${String(e.score).padStart(7)}`).join('\n')
			: 'no scores yet';
		this.add.text(W / 2, 434, 'HIGH SCORES', style(12, '#f2d544')).setOrigin(0.5);
		this.add.text(W / 2, 450, table, { ...style(12), lineSpacing: 3 }).setOrigin(0.5, 0);

		const medals = tierTotals(CHALLENGES, this.registry.get('challenges'));
		const chLabel = `${isTouch(this) ? '' : '[C] '}CHALLENGES  ${TIERS.map((t, i) => `${t.name[0]}${medals[i]}`).join(' ')}`;
		const chBtn = this.add.text(W / 2, H - 86, chLabel, { ...style(12, '#9ff0fa'), backgroundColor: '#1b2238', padding: { x: 10, y: 5 } })
			.setOrigin(0.5).setInteractive({ useHandCursor: true });
		let leaving = false;
		const openChallenges = () => {
			if (leaving) return;
			leaving = true;
			sfx.unlock();
			this.scene.start('Challenges');
		};
		chBtn.on('pointerdown', (_p, _x, _y, e) => { e.stopPropagation(); openChallenges(); });
		this.input.keyboard.on('keydown-C', openChallenges);

		const prompt = this.add.text(W / 2, H - 50, isTouch(this) ? 'TAP TO START' : 'PRESS SPACE TO START', style(16)).setOrigin(0.5);
		this.tweens.add({ targets: prompt, alpha: 0.2, yoyo: true, repeat: -1, duration: 600 });

		const mute = this.add.text(W - 10, H - 18, '', style(10, '#8a93b8')).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
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
			if (started || leaving) return;
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
			this.input.keyboard.off('keydown-C', openChallenges);
			this.input.off('pointerdown', start);
		});
	}

	update(time, delta) {
		this.ground.tilePositionY -= 0.03 * delta;
		this.bird.setTexture(frameKey('bird', Math.floor(time / 140) % 2));
		this.bird.y = 165 + Math.sin(time / 300) * 5;
	}
}
