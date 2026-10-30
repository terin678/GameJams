// Overlay on a paused Play: pick one of the cards. Cards deal in one after
// another; the selected card lifts.
import { TUNING } from '../../data/tuning.js';
import { frameKey } from '../textures.js';
import { describeCard } from '../cards.js';
import { textStyle, bindKeys, stack, stackHeight, fitCamera } from '../kit.js';

const W = TUNING.width, H = TUNING.height;
const CARD = { w: 220, h: 250, gap: 22 };

export class LevelUp extends Phaser.Scene {
	create({ cards, level, active }) {
		fitCamera(this);
		const sfx = this.registry.get('sfx');
		const style = (px, color) => textStyle(this, px, color, { align: 'center' });
		const shade = this.add.rectangle(0, 0, W, H, 0x0b0a10, 0.72).setOrigin(0).setAlpha(0);
		this.tweens.add({ targets: shade, alpha: 1, duration: 150 });
		const title = this.add.text(W / 2, 84, `LEVEL ${level}!`, { ...style(30, '#f2d544'), stroke: '#14121c', strokeThickness: 6 }).setOrigin(0.5).setScale(1.6);
		this.tweens.add({ targets: title, scale: 1, duration: 280, ease: 'Back.easeOut' });
		this.add.text(W / 2, title.y + title.height / 2 + 4, 'choose one', style(12, '#b8bcc8')).setOrigin(0.5, 0);

		const readyAt = this.time.now + TUNING.cardInputDelayMs;
		let sel = 0, chosen = false;
		const n = cards.length;
		// Each card is a container, so it moves and scales as one. Cards are
		// built first, then all sized to the tallest so phone fonts always fit.
		const built = cards.map((card, i) => {
			const d = describeCard(card, active);
			const text = (str, px, color, extra = {}) => this.add.text(0, 0, str, { ...style(px, color), ...extra }).setOrigin(0.5, 0);
			const body = [
				this.add.image(0, 0, frameKey(d.icon)).setScale(d.icon === 'gem' ? 1.5 : 1.6).setOrigin(0.5, 0),
				[text(d.title, 16, d.color), 8],
				[text(d.sub, 10, '#b8bcc8'), 2],
				[text(d.level, 11, '#f4f4f4'), 4],
				[text(d.body, 11, '#e8dcc0', { lineSpacing: 4, wordWrap: { width: CARD.w - 24 } }), 12],
			];
			const key = this.add.text(0, 0, `[${i + 1}]`, style(10, '#8a93b8')).setOrigin(0.5, 1);
			return { body, key, need: 18 + stackHeight(body) + 12 + key.height + 8 };
		});
		const cardH = Math.max(CARD.h, ...built.map(b => Math.ceil(b.need)));
		const boxes = built.map(({ body, key }, i) => {
			const x = W / 2 + (i - (n - 1) / 2) * (CARD.w + CARD.gap), y = H / 2 + 30;
			const box = this.add.rectangle(0, 0, CARD.w, cardH, 0x1b1a28, 0.95).setStrokeStyle(2, 0x2c3550);
			stack(-cardH / 2 + 18, body);
			key.setY(cardH / 2 - 8);
			const parts = [box, ...body.map(e => (Array.isArray(e) ? e[0] : e)), key];
			const c = this.add.container(x, y + 60, parts).setAlpha(0).setSize(CARD.w, cardH).setInteractive({ useHandCursor: true });
			this.tweens.add({ targets: c, y, alpha: 1, delay: 60 + i * 70, duration: 260, ease: 'Back.easeOut' });
			c.on('pointerover', () => { sel = i; highlight(); });
			c.on('pointerdown', () => choose(i));
			return { c, box };
		});

		const highlight = () => boxes.forEach(({ c, box }, i) => {
			const on = i === sel;
			box.setStrokeStyle(on ? 3 : 2, on ? 0xf2d544 : 0x2c3550);
			this.tweens.add({ targets: c, scale: on ? 1.05 : 1, duration: 120, ease: 'Quad.easeOut' });
		});
		const choose = i => {
			if (chosen || this.time.now < readyAt || i < 0 || i >= n) return;
			chosen = true;
			sfx.play('select');
			// The pick flashes and the rest fall away before play resumes.
			boxes.forEach(({ c }, j) => this.tweens.add({ targets: c, alpha: 0, y: c.y + (j === i ? -30 : 40), scale: j === i ? 1.12 : 0.9, duration: 180 }));
			this.time.delayedCall(190, () => {
				this.scene.get('Play').chooseCard(cards[i]);
				this.scene.resume('Play');
				this.scene.stop();
			});
		};
		highlight();

		const left = () => { sel = (sel + n - 1) % n; highlight(); };
		const right = () => { sel = (sel + 1) % n; highlight(); };
		bindKeys(this, {
			'keydown-LEFT': left, 'keydown-A': left,
			'keydown-RIGHT': right, 'keydown-D': right,
			'keydown-ENTER': () => choose(sel), 'keydown-SPACE': () => choose(sel),
			'keydown-ONE': () => choose(0), 'keydown-TWO': () => choose(1), 'keydown-THREE': () => choose(2),
		});
	}
}
