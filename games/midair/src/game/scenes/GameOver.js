import { TUNING } from '../../data/tuning.js';
import { fs } from '../../../../../shared/ui.js';

const W = TUNING.width, H = TUNING.height;
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export class GameOver extends Phaser.Scene {
	init(data) {
		this.result = data;
	}

	create() {
		this.sfx = this.registry.get('sfx');
		this.scores = this.registry.get('scores');
		this.style = (px, color = '#f4f4f4') => ({ fontFamily: 'monospace', fontSize: fs(this, px), color, fontStyle: 'bold', align: 'center' });
		this.cleanup = [];
		this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup.forEach(fn => fn()));

		this.add.rectangle(0, 0, W, H, 0x10131c).setOrigin(0);
		this.add.text(W / 2, 80, 'GAME OVER', this.style(38, '#d6463c')).setOrigin(0.5);
		const { score, bestCombo, loop } = this.result;
		this.add.text(W / 2, 140, `SCORE  ${score}\nBEST CHAIN  ${bestCombo}\nLOOP  ${loop + 1}`, { ...this.style(15), lineSpacing: 6 }).setOrigin(0.5, 0);

		if (!this.result.saved && this.scores.qualifies(score)) this.enterInitials();
		else this.showTable();
	}

	on(emitter, event, fn) {
		emitter.on(event, fn);
		this.cleanup.push(() => emitter.off(event, fn));
	}

	enterInitials() {
		this.add.text(W / 2, 250, 'NEW HIGH SCORE!\nENTER YOUR INITIALS', this.style(14, '#f2d544')).setOrigin(0.5);
		this.initials = [0, 0, 0];
		this.slot = 0;
		this.slotTexts = [0, 1, 2].map(i => {
			const x = W / 2 + (i - 1) * 60, y = 340;
			const up = this.add.text(x, y - 40, '▲', this.style(20, '#8a93b8')).setOrigin(0.5).setInteractive({ useHandCursor: true });
			const down = this.add.text(x, y + 40, '▼', this.style(20, '#8a93b8')).setOrigin(0.5).setInteractive({ useHandCursor: true });
			up.on('pointerdown', () => { this.slot = i; this.bump(1); });
			down.on('pointerdown', () => { this.slot = i; this.bump(-1); });
			return this.add.text(x, y, 'A', this.style(34)).setOrigin(0.5).setInteractive().on('pointerdown', () => { this.slot = i; this.refresh(); });
		});
		const ok = this.add.text(W / 2, 440, '[ OK ]', this.style(18, '#9ff0fa')).setOrigin(0.5).setInteractive({ useHandCursor: true });
		ok.on('pointerdown', () => this.submit());
		this.add.text(W / 2, 480, 'type letters, arrows to adjust, ENTER to save', this.style(10, '#8a93b8')).setOrigin(0.5);

		this.on(this.input.keyboard, 'keydown', e => {
			if (e.key === 'Enter') return this.submit();
			if (e.key === 'ArrowUp') return this.bump(1);
			if (e.key === 'ArrowDown') return this.bump(-1);
			if (e.key === 'ArrowLeft' || e.key === 'Backspace') { this.slot = Math.max(0, this.slot - 1); return this.refresh(); }
			if (e.key === 'ArrowRight') { this.slot = Math.min(2, this.slot + 1); return this.refresh(); }
			const idx = LETTERS.indexOf(e.key.toUpperCase());
			if (e.key.length === 1 && idx >= 0) {
				this.initials[this.slot] = idx;
				this.slot = Math.min(2, this.slot + 1);
				this.sfx.play('select');
				this.refresh();
			}
		});
		this.refresh();
	}

	bump(d) {
		this.initials[this.slot] = (this.initials[this.slot] + d + LETTERS.length) % LETTERS.length;
		this.sfx.play('select');
		this.refresh();
	}

	refresh() {
		this.slotTexts.forEach((t, i) => t.setText(LETTERS[this.initials[i]]).setColor(i === this.slot ? '#f2d544' : '#f4f4f4'));
	}

	submit() {
		if (this.submitted) return;
		this.submitted = true;
		const name = this.initials.map(i => LETTERS[i]).join('');
		this.scores.add(name, this.result.score);
		this.cleanup.forEach(fn => fn());
		this.cleanup = [];
		this.scene.restart({ ...this.result, saved: name });
	}

	showTable() {
		const list = this.scores.list();
		const rows = list.map((e, i) => {
			const mine = this.result.saved && e.name === this.result.saved && e.score === this.result.score;
			return `${mine ? '>' : ' '}${i + 1}. ${e.name}  ${String(e.score).padStart(7)}`;
		});
		this.add.text(W / 2, 250, 'HIGH SCORES', this.style(14, '#f2d544')).setOrigin(0.5);
		this.add.text(W / 2, 272, rows.join('\n') || 'no scores yet', { ...this.style(14), lineSpacing: 4 }).setOrigin(0.5, 0);

		const prompt = this.add.text(W / 2, H - 90, 'SPACE / TAP  play again\nESC  menu', { ...this.style(14), lineSpacing: 6 }).setOrigin(0.5);
		this.tweens.add({ targets: prompt, alpha: 0.3, yoyo: true, repeat: -1, duration: 600 });

		// Short delay so a held fire button doesn't skip this screen.
		this.time.delayedCall(600, () => {
			this.on(this.input.keyboard, 'keydown-SPACE', () => this.scene.start('Play'));
			this.on(this.input.keyboard, 'keydown-ENTER', () => this.scene.start('Play'));
			this.on(this.input.keyboard, 'keydown-ESC', () => this.scene.start('Menu'));
			this.on(this.input, 'pointerdown', () => this.scene.start('Play'));
		});
	}
}
