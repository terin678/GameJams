import { TUNING } from '../../data/tuning.js';
import { CHALLENGES, TIERS } from '../../data/challenges.js';
import { describe, tierTotals } from '../../core/challenges.js';
import { fs, isTouch } from '../../../../../shared/ui.js';

const W = TUNING.width, H = TUNING.height;
const EMPTY = 0x2c3550;

export class Challenges extends Phaser.Scene {
	create() {
		const progress = this.registry.get('challenges');
		const style = (px, color = '#f4f4f4') => ({ fontFamily: 'monospace', fontSize: fs(this, px), color, fontStyle: 'bold' });

		this.add.rectangle(0, 0, W, H, 0x10131c).setOrigin(0);
		this.add.text(W / 2, 30, 'CHALLENGES', { ...style(28, '#f2d544'), stroke: '#1b1b2a', strokeThickness: 6 }).setOrigin(0.5);
		const totals = tierTotals(CHALLENGES, progress);
		const summary = TIERS.map((t, i) => `${t.name} ${totals[i]}`).join('   ');
		this.add.text(W / 2, 60, summary, style(11, '#9ff0fa')).setOrigin(0.5);

		const g = this.add.graphics();
		const top = 84, row = 31;
		CHALLENGES.forEach((def, i) => {
			const y = top + i * row;
			const d = describe(def, progress[def.id]);
			// Three medal pips: bronze, silver, gold.
			TIERS.forEach((t, k) => {
				g.fillStyle(k < d.tier ? t.tint : EMPTY, 1).fillCircle(20 + k * 13, y + 8, 5);
			});
			const color = d.tier ? TIERS[d.tier - 1].color : '#f4f4f4';
			this.add.text(56, y, d.title, style(11, d.done ? color : '#f4f4f4'));
			// Progress toward the next tier.
			const frac = Math.min(1, d.value / d.goal);
			g.fillStyle(0x000000, 0.6).fillRect(56, y + 17, W - 160, 5);
			g.fillStyle(d.done ? TIERS[2].tint : 0x9ff0fa, 1).fillRect(56, y + 17, (W - 160) * frac, 5);
			const shown = d.done ? 'DONE' : `${Math.min(d.value, d.goal)}/${d.goal}`;
			this.add.text(W - 14, y + 10, shown, style(10, d.done ? TIERS[2].color : '#b8bcc8')).setOrigin(1, 0.5);
		});

		this.add.text(W / 2, H - 22, isTouch(this) ? 'TAP TO GO BACK' : 'ESC / C / click  to go back', style(12, '#8a93b8')).setOrigin(0.5);

		const back = () => this.scene.start('Menu');
		const kb = this.input.keyboard;
		kb.once('keydown-ESC', back);
		kb.once('keydown-C', back);
		kb.once('keydown-SPACE', back);
		this.input.once('pointerdown', back);
		this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
			kb.off('keydown-ESC', back);
			kb.off('keydown-C', back);
			kb.off('keydown-SPACE', back);
			this.input.off('pointerdown', back);
		});
	}
}
