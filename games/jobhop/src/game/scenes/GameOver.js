// Run summary: time, kills, job XP banked per job, nodes reached, unlocks.
import { TUNING } from '../../data/tuning.js';
import { JOBS } from '../../data/jobs.js';
import { STATS } from '../../data/passives.js';
import { levelFromXp, nodesBetween, describeNode } from '../../core/jobs.js';
import { formatTime } from '../../core/run.js';
import { isTouch } from '../../../../../shared/ui.js';
import { frameKey } from '../textures.js';
import { textStyle, bindKeys, stack } from '../kit.js';

const W = TUNING.width, H = TUNING.height;

export class GameOver extends Phaser.Scene {
	create(r) {
		const sfx = this.registry.get('sfx');
		const style = (px, color) => textStyle(this, px, color, { align: 'center' });
		this.add.tileSprite(0, 0, W, H, 'ground').setOrigin(0).setAlpha(0.4);
		this.add.rectangle(0, 0, W, H, 0x14121c, 0.65).setOrigin(0);

		// The header lines stack by measured height, so phone fonts never collide.
		const line = (str, px, color, extra = {}) => this.add.text(W / 2, 0, str, { ...style(px, color), ...extra }).setOrigin(0.5, 0);
		const title = line(r.won ? 'VICTORY' : 'FALLEN', 44, r.won ? '#f2d544' : '#d6463c', { stroke: '#14121c', strokeThickness: 8 });
		const rankText = r.rank === 0 ? `NEW BEST: ${r.score}` : r.rank > 0 ? `#${r.rank + 1} best run: ${r.score}` : `score ${r.score}`;
		const headerBottom = stack(14, [
			title,
			[line(`survived ${formatTime(r.time)}    level ${r.level}    ${r.kills} KOs`, 14), 2],
			[line(rankText, 12, r.rank === 0 ? '#f2d544' : '#b8bcc8'), 4],
			[line('JOB XP  (earned by the job you were playing)', 12, '#9ff0fa'), 18],
		]);
		title.setScale(1.8).setAlpha(0);
		this.tweens.add({ targets: title, scale: 1, alpha: 1, duration: 360, ease: 'Back.easeOut' });
		const rowsTop = Math.max(196, Math.ceil(headerBottom) + 30);
		const curve = TUNING.jobXp;
		r.picks.forEach((id, i) => {
			const job = JOBS[id];
			const y = rowsTop + i * 78;
			const before = levelFromXp(r.before[id] ?? 0, curve), after = levelFromXp(r.after[id] ?? 0, curve);
			const gained = Math.round(r.runJobXp[id] ?? 0);
			this.add.image(150, y + 14, frameKey(job.sprite, 0));
			const lvl = after.level > before.level ? `Lv ${before.level} -> ${after.level}  LEVEL UP!` : `Lv ${after.level}`;
			const head = this.add.text(180, y - 6, `${job.name}   +${gained} xp   ${lvl}`, { ...style(13, after.level > before.level ? '#f2d544' : '#f4f4f4'), align: 'left' });
			const barY = Math.ceil(head.getBounds().bottom) + 4;   // under the heading at any font size
			// The bar fills from where the job started this run; a level-up fills
			// it to the end first, then refills from empty.
			const frac = p => (p.max ? 1 : p.into / p.need);
			const levels = after.level - before.level;
			const bar = this.add.graphics();
			const draw = t => {
				const pos = frac(before) + t * (levels + frac(after) - frac(before));
				const lapped = pos >= 1 && t < 1 ? pos % 1 || 1 : t >= 1 ? frac(after) : pos;
				bar.clear();
				bar.fillStyle(0x0b0a10, 1).fillRect(180, barY, 440, 10);
				bar.fillStyle(after.max && t >= 1 ? 0xf2d544 : 0x4d8fe0, 1).fillRect(181, barY + 1, 438 * Math.min(1, lapped), 8);
			};
			draw(0);
			const fill = { t: 0 };
			this.tweens.add({ targets: fill, t: 1, delay: 300 + i * 250, duration: 700 + levels * 300, ease: 'Cubic.easeOut', onUpdate: () => draw(fill.t) });
			const nodes = nodesBetween(job, before.level, after.level);
			if (nodes.length) {
				this.add.text(180, barY + 14, `new: ${nodes.map(n => describeNode(STATS, n)).join(', ')}`, { ...style(10, '#6fe07a'), align: 'left' });
			}
		});

		r.unlocked.forEach((id, i) => {
			const y = Math.max(370, rowsTop + r.picks.length * 78 + 18) + i * 54;
			const t = this.add.text(W / 2 + 20, y, `NEW JOB UNLOCKED: ${JOBS[id].name.toUpperCase()}`, { ...style(18, '#f2d544'), stroke: '#14121c', strokeThickness: 5 }).setOrigin(0.5);
			this.add.image(t.getBounds().left - 18, y, frameKey(JOBS[id].sprite, 0));
			this.tweens.add({ targets: t, alpha: 0.4, yoyo: true, repeat: -1, duration: 500 });
		});
		if (r.unlocked.length) this.time.delayedCall(500, () => sfx.play('unlock'));

		const touch = isTouch(this);
		const buttons = [
			['AGAIN', touch ? '' : '[SPACE] ', 'Play'],
			['JOBS', touch ? '' : '[J] ', 'Jobs'],
			['MENU', touch ? '' : '[ESC] ', 'Menu'],
		];
		let leaving = false;
		const go = scene => {
			if (leaving || this.time.now < readyAt) return;
			leaving = true;
			sfx.unlock();
			this.scene.start(scene);
		};
		const readyAt = this.time.now + 600;
		buttons.forEach(([label, key, scene], i) => {
			this.add.text(W / 2 + (i - 1) * 190, H - 50, `${key}${label}`, { ...style(14, '#9ff0fa'), backgroundColor: '#1b2238', padding: { x: 12, y: 6 } })
				.setOrigin(0.5).setInteractive({ useHandCursor: true })
				.on('pointerdown', () => go(scene));
		});
		bindKeys(this, { 'keydown-SPACE': () => go('Play'), 'keydown-ENTER': () => go('Play'), 'keydown-J': () => go('Jobs'), 'keydown-ESC': () => go('Menu') });
	}
}
