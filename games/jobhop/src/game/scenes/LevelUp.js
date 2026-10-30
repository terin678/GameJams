// Overlay on a paused Play: pick one of the cards.
import { TUNING } from '../../data/tuning.js';
import { fs } from '../../../../../shared/ui.js';
import { frameKey } from '../textures.js';
import { describeCard } from '../cards.js';

const W = TUNING.width, H = TUNING.height;
const CARD = { w: 220, h: 250, gap: 22 };

export class LevelUp extends Phaser.Scene {
	create({ cards, level, active }) {
		const sfx = this.registry.get('sfx');
		const style = (px, color = '#f4f4f4') => ({ fontFamily: 'monospace', fontSize: fs(this, px), color, fontStyle: 'bold', align: 'center' });
		this.add.rectangle(0, 0, W, H, 0x0b0a10, 0.72).setOrigin(0);
		this.add.text(W / 2, 84, `LEVEL ${level}!`, { ...style(30, '#f2d544'), stroke: '#14121c', strokeThickness: 6 }).setOrigin(0.5);
		this.add.text(W / 2, 120, 'choose one', style(12, '#b8bcc8')).setOrigin(0.5);

		const readyAt = this.time.now + TUNING.cardInputDelayMs;
		let sel = 0, chosen = false;
		const n = cards.length;
		const boxes = cards.map((card, i) => {
			const d = describeCard(card, active);
			const x = W / 2 + (i - (n - 1) / 2) * (CARD.w + CARD.gap), y = H / 2 + 30;
			const box = this.add.rectangle(x, y, CARD.w, CARD.h, 0x1b1a28, 0.95).setStrokeStyle(2, 0x2c3550).setInteractive({ useHandCursor: true });
			this.add.image(x, y - 78, frameKey(d.icon)).setScale(d.icon === 'gem' ? 1.5 : 1.6);
			this.add.text(x, y - 34, d.title, style(16, d.color)).setOrigin(0.5);
			this.add.text(x, y - 12, d.sub, style(10, '#b8bcc8')).setOrigin(0.5);
			this.add.text(x, y + 8, d.level, style(11, '#f4f4f4')).setOrigin(0.5);
			this.add.text(x, y + 30, d.body, { ...style(11, '#e8dcc0'), lineSpacing: 4, wordWrap: { width: CARD.w - 24 } }).setOrigin(0.5, 0);
			this.add.text(x, y + CARD.h / 2 - 16, `[${i + 1}]`, style(10, '#8a93b8')).setOrigin(0.5);
			box.on('pointerover', () => { sel = i; highlight(); });
			box.on('pointerdown', () => choose(i));
			return box;
		});

		const highlight = () => boxes.forEach((b, i) => b.setStrokeStyle(i === sel ? 3 : 2, i === sel ? 0xf2d544 : 0x2c3550));
		const choose = i => {
			if (chosen || this.time.now < readyAt || i < 0 || i >= n) return;
			chosen = true;
			sfx.play('select');
			this.scene.get('Play').chooseCard(cards[i]);
			this.scene.resume('Play');
			this.scene.stop();
		};
		highlight();

		const kb = this.input.keyboard;
		const keys = {
			'keydown-LEFT': () => { sel = (sel + n - 1) % n; highlight(); },
			'keydown-A': () => { sel = (sel + n - 1) % n; highlight(); },
			'keydown-RIGHT': () => { sel = (sel + 1) % n; highlight(); },
			'keydown-D': () => { sel = (sel + 1) % n; highlight(); },
			'keydown-ENTER': () => choose(sel),
			'keydown-SPACE': () => choose(sel),
			'keydown-ONE': () => choose(0),
			'keydown-TWO': () => choose(1),
			'keydown-THREE': () => choose(2),
		};
		for (const [ev, fn] of Object.entries(keys)) kb.on(ev, fn);
		this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
			for (const [ev, fn] of Object.entries(keys)) kb.off(ev, fn);
		});
	}
}
