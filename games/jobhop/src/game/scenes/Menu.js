import { TUNING } from '../../data/tuning.js';
import { JOBS } from '../../data/jobs.js';
import { jobLevels, unlockedJobs } from '../../core/jobs.js';
import { isTouch } from '../../../../../shared/ui.js';
import { frameKey } from '../textures.js';
import { textStyle, bindKeys, fitCamera } from '../kit.js';

const W = TUNING.width, H = TUNING.height;

export class Menu extends Phaser.Scene {
	create() {
		fitCamera(this);
		const sfx = this.registry.get('sfx');
		const store = this.registry.get('store');
		const scores = this.registry.get('scores');
		const quality = this.registry.get('quality');
		const jobXp = this.registry.get('jobXp');
		const picks = this.registry.get('picks');
		const levels = jobLevels(jobXp, JOBS, TUNING.jobXp);
		const style = (px, color) => textStyle(this, px, color, { align: 'center' });

		this.ground = this.add.tileSprite(0, 0, W, H, 'ground').setOrigin(0);
		this.add.rectangle(0, 0, W, H, 0x14121c, 0.45).setOrigin(0);

		const title = this.add.text(W / 2, 60, 'JOB HOP', { ...style(56, '#f2d544'), stroke: '#14121c', strokeThickness: 10 }).setOrigin(0.5);
		this.tweens.add({ targets: title, scale: 1.05, yoyo: true, repeat: -1, duration: 1400, ease: 'Sine.easeInOut' });
		this.add.text(W / 2, title.getBounds().bottom + 4, 'SURVIVE TEN MINUTES.  MASTER EVERY JOB.', style(13, '#9ff0fa')).setOrigin(0.5, 0);

		// The loadout: first pick starts active. They march on the spot.
		this.heroes = picks.map((id, i) => {
			const x = W / 2 + (i ? 110 : -110);
			const img = this.add.image(x, 190, frameKey(JOBS[id].sprite, 0)).setScale(2).setFlipX(i === 1);
			this.add.text(x, 238, `${JOBS[id].name}\nLv ${levels[id]}`, { ...style(13), lineSpacing: 4 }).setOrigin(0.5, 0);
			return { img, sprite: JOBS[id].sprite, y: 190 };
		});
		this.add.text(W / 2, 190, `${isTouch(this) ? 'SWAP' : 'TAB'}\n<->`, { ...style(14, '#8a93b8'), lineSpacing: 2 }).setOrigin(0.5);

		const unlocked = unlockedJobs(jobXp, JOBS, TUNING.jobXp).length;
		const jobsBtn = this.add.text(W / 2, 300, `${isTouch(this) ? '' : '[J] '}CHANGE JOBS   ${unlocked} / ${Object.keys(JOBS).length} unlocked`, {
			...style(13, '#9ff0fa'), backgroundColor: '#1b2238', padding: { x: 10, y: 6 },
		}).setOrigin(0.5).setInteractive({ useHandCursor: true });

		const controls = isTouch(this)
			? 'DRAG to move, attacks are automatic\nSWAP changes job, ACTION spends the gauge'
			: 'ARROWS / WASD  move (attacks are automatic)\nTAB / SHIFT  swap job      SPACE  job action\nP  pause      M  mute';
		this.add.text(W / 2, 360, controls, { ...style(12), lineSpacing: 6 }).setOrigin(0.5);
		this.add.text(W / 2, 418, 'Kills level up the job you are playing, mid-run. Level jobs to unlock more.\nThe JOB ACTION dial (bottom right) charges over time and with kills.', { ...style(11, '#b8bcc8'), lineSpacing: 4 }).setOrigin(0.5);

		const list = scores.list();
		const table = list.length ? list.map((e, i) => `${i + 1}. ${e.name}  ${String(e.score).padStart(5)}`).join('\n') : 'no runs yet';
		this.add.text(W / 2, 458, 'BEST RUNS  (seconds survived, +300 for a win)', style(10, '#f2d544')).setOrigin(0.5);
		this.add.text(W / 2, 472, table, { ...style(11), lineSpacing: 2 }).setOrigin(0.5, 0);

		const prompt = this.add.text(W / 2, H - 30, isTouch(this) ? 'TAP TO START' : 'PRESS SPACE TO START', style(16)).setOrigin(0.5);
		this.tweens.add({ targets: prompt, alpha: 0.2, yoyo: true, repeat: -1, duration: 600 });

		const mute = this.add.text(W - 10, H - 14, '', style(10, '#8a93b8')).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
		const showMute = () => mute.setText(sfx.muted ? '[M] sound: off' : '[M] sound: on');
		showMute();
		const toggleMute = () => {
			sfx.unlock();
			sfx.muted = !sfx.muted;
			store.set('muted', sfx.muted);
			showMute();
		};

		const gfx = this.add.text(10, H - 14, '', style(10, '#8a93b8')).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
		const showGfx = () => gfx.setText(`[G] graphics: ${quality.label}`);
		showGfx();
		const cycleGfx = () => {
			quality.cycle();
			sfx.play('select');
			showGfx();
		};

		let leaving = false;
		const go = scene => {
			if (leaving) return;
			leaving = true;
			sfx.unlock();
			this.scene.start(scene);
		};
		const start = () => go('Play');
		const openJobs = () => go('Jobs');
		mute.on('pointerdown', (_p, _x, _y, e) => { e.stopPropagation(); toggleMute(); });
		gfx.on('pointerdown', (_p, _x, _y, e) => { e.stopPropagation(); cycleGfx(); });
		jobsBtn.on('pointerdown', (_p, _x, _y, e) => { e.stopPropagation(); openJobs(); });

		bindKeys(this, { 'keydown-SPACE': start, 'keydown-ENTER': start, 'keydown-J': openJobs, 'keydown-M': toggleMute, 'keydown-G': cycleGfx });
		this.input.on('pointerdown', start);
		this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.input.off('pointerdown', start));
	}

	update(time, delta) {
		this.ground.tilePositionX += 0.02 * delta;
		this.ground.tilePositionY += 0.01 * delta;
		this.heroes.forEach((h, i) => {
			const step = Math.floor(time / 180 + i) % 2;
			h.img.setTexture(frameKey(h.sprite, step)).setY(h.y - step * 3);
		});
	}
}
