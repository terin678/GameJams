// The job tree: three tiers, lines from each job to what it unlocks, and a
// detail panel. Pick two jobs for the next run.
import { TUNING } from '../../data/tuning.js';
import { JOBS, TIERS } from '../../data/jobs.js';
import { ATTACKS, ACTIONS } from '../../data/abilities.js';
import { STATS } from '../../data/passives.js';
import { jobLevels, levelFromXp, isUnlocked, lockReason } from '../../core/jobs.js';
import { togglePick, chargeInfo } from '../../core/loadout.js';
import { formatMod } from '../../core/stats.js';
import { isTouch } from '../../../../../shared/ui.js';
import { frameKey } from '../textures.js';
import { textStyle, bindKeys, stack, stackHeight } from '../kit.js';

const W = TUNING.width, H = TUNING.height;
const CARD = { w: 172, h: 92 };
const ROW_Y = [118, 238, 358];
const charges = action => {
	const n = chargeInfo(0, action.cost, TUNING.gauge.max).total;
	return `holds ${n} charge${n > 1 ? 's' : ''}`;
};
const ROWS = TIERS.map(t => Object.keys(JOBS).filter(id => JOBS[id].tier === t));

export class Jobs extends Phaser.Scene {
	create() {
		this.sfx = this.registry.get('sfx');
		this.store = this.registry.get('store');
		const jobXp = this.registry.get('jobXp');
		this.levels = jobLevels(jobXp, JOBS, TUNING.jobXp);
		this.progress = Object.fromEntries(Object.keys(JOBS).map(id => [id, levelFromXp(jobXp[id] ?? 0, TUNING.jobXp)]));
		this.picks = this.registry.get('picks').filter(id => JOBS[id] && isUnlocked(JOBS[id], this.levels));
		this.cursor = { row: 0, col: 0 };
		const style = (px, color) => textStyle(this, px, color);
		this.style = style;

		this.add.tileSprite(0, 0, W, H, 'ground').setOrigin(0).setAlpha(0.5);
		this.add.rectangle(0, 0, W, H, 0x14121c, 0.6).setOrigin(0);
		const title = this.add.text(W / 2, 8, 'JOBS', style(24, '#f2d544')).setOrigin(0.5, 0);
		this.header = this.add.text(W / 2, title.getBounds().bottom + 2, 'Ag', style(12, '#9ff0fa')).setOrigin(0.5, 0);
		// Push the tree down if bigger phone fonts made the header taller.
		const shift = Math.max(0, Math.ceil(this.header.getBounds().bottom + 16 - (ROW_Y[0] - CARD.h / 2)));
		const rowY = ROW_Y.map(y => y + shift);
		ROWS.forEach((row, r) => this.add.text(30, rowY[r] - CARD.h / 2 - 2, TIERS[r].toUpperCase(), style(9, '#8a93b8')).setOrigin(0, 1));

		this.pos = {};
		ROWS.forEach((row, r) => row.forEach((id, c) => { this.pos[id] = { x: W / 2 + (c - (row.length - 1) / 2) * (CARD.w + 18), y: rowY[r] }; }));

		// Tree lines under the cards: lit when that requirement is met.
		const lines = this.add.graphics();
		for (const [id, job] of Object.entries(JOBS)) {
			for (const req of job.unlock) {
				const a = this.pos[req.job], b = this.pos[id];
				const met = this.levels[req.job] >= req.level;
				lines.lineStyle(met ? 3 : 2, met ? 0x6fe07a : 0x3a3f58, 1);
				lines.lineBetween(a.x, a.y + CARD.h / 2, b.x, b.y - CARD.h / 2);
			}
		}

		this.cards = {};
		for (const id of Object.keys(JOBS)) this.buildCard(id);
		const detailY = rowY.at(-1) + CARD.h / 2 + 14;
		this.detail = this.add.text(30, detailY, '', { ...style(11), lineSpacing: 4, wordWrap: { width: W - 60 } });
		this.nodeText = this.add.text(W - 30, detailY, '', { ...style(11), lineSpacing: 4, align: 'right' }).setOrigin(1, 0);
		this.footer = this.add.text(W / 2, H - 16, isTouch(this) ? 'tap a job to pick it  ·  tap here when done' : 'ARROWS move  ·  ENTER pick / unpick  ·  ESC done', style(11, '#8a93b8'))
			.setOrigin(0.5).setInteractive({ useHandCursor: true });
		this.footer.on('pointerdown', () => this.leave());

		bindKeys(this, {
			'keydown-LEFT': () => this.move(0, -1), 'keydown-A': () => this.move(0, -1),
			'keydown-RIGHT': () => this.move(0, 1), 'keydown-D': () => this.move(0, 1),
			'keydown-UP': () => this.move(-1, 0), 'keydown-W': () => this.move(-1, 0),
			'keydown-DOWN': () => this.move(1, 0), 'keydown-S': () => this.move(1, 0),
			'keydown-ENTER': () => this.toggle(this.current()), 'keydown-SPACE': () => this.toggle(this.current()),
			'keydown-ESC': () => this.leave(), 'keydown-BACKSPACE': () => this.leave(), 'keydown-J': () => this.leave(),
		});
		this.refresh();
	}

	buildCard(id) {
		const job = JOBS[id], { x, y } = this.pos[id], style = this.style;
		const unlocked = isUnlocked(job, this.levels);
		const bg = this.add.rectangle(x, y, CARD.w, CARD.h, 0x1b1a28, 0.95).setInteractive({ useHandCursor: true });
		const icon = this.add.image(x - CARD.w / 2 + 26, y + 2, frameKey(job.sprite, 0));
		if (!unlocked) icon.setTintFill(0x000000).setAlpha(0.6);
		// Name, level, XP bar and XP numbers, stacked by measured height and
		// centred in the card so bigger phone fonts never overlap.
		const tx = x - CARD.w / 2 + 50, bw = CARD.w - 62;
		const name = this.add.text(tx, 0, job.name, style(12, unlocked ? '#f4f4f4' : '#6b7080'));
		const p = this.progress[id];
		const sub = unlocked ? (p.max ? `Lv ${p.level}  MASTERED` : `Lv ${p.level}`) : 'LOCKED';
		const lvl = this.add.text(tx, 0, sub, style(11, unlocked ? (p.max ? '#f2d544' : '#9ff0fa') : '#8f2a24'));
		const bar = this.add.graphics();
		const barSlot = { displayHeight: 7, setY(v) { this.y = v; return this; } };
		const parts = [name, lvl];
		if (unlocked) {
			parts.push([barSlot, 4]);
			if (!p.max) parts.push([this.add.text(tx, 0, `${Math.floor(p.into)} / ${p.need} xp`, style(9, '#8a93b8')), 3]);
		}
		stack(y - stackHeight(parts) / 2, parts);
		if (unlocked) {
			bar.fillStyle(0x0b0a10, 1).fillRect(tx, barSlot.y, bw, 7);
			bar.fillStyle(p.max ? 0xf2d544 : 0x4d8fe0, 1).fillRect(tx + 1, barSlot.y + 1, (bw - 2) * (p.max ? 1 : p.into / p.need), 5);
		}
		// The pick number sits on the card's top edge like a tab, clear of the name.
		const badge = this.add.text(x + CARD.w / 2 - 8, y - CARD.h / 2, '', { ...style(12, '#14121c'), backgroundColor: '#f2d544', padding: { x: 5, y: 2 } }).setOrigin(1, 0.5);
		bg.on('pointerover', () => { const r = ROWS.findIndex(row => row.includes(id)); this.cursor = { row: r, col: ROWS[r].indexOf(id) }; this.refresh(); });
		bg.on('pointerdown', () => this.toggle(id));
		this.cards[id] = { bg, badge, unlocked, name, lvl, bar };
	}

	current() {
		return ROWS[this.cursor.row][this.cursor.col];
	}

	move(dr, dc) {
		let { row, col } = this.cursor;
		if (dr) {
			const x = this.pos[this.current()].x;
			row = Math.max(0, Math.min(ROWS.length - 1, row + dr));
			// Land on the card closest in x on the new row.
			col = ROWS[row].reduce((best, id, i) => (Math.abs(this.pos[id].x - x) < Math.abs(this.pos[ROWS[row][best]].x - x) ? i : best), 0);
		}
		if (dc) col = (col + dc + ROWS[row].length) % ROWS[row].length;
		this.cursor = { row, col };
		this.sfx.play('select');
		this.refresh();
	}

	toggle(id) {
		if (!this.cards[id].unlocked) { this.sfx.play('empty'); return; }
		this.picks = togglePick(this.picks, id);
		this.sfx.play('select');
		this.refresh();
	}

	leave() {
		if (this.picks.length !== 2) {
			this.sfx.play('empty');
			this.header.setColor('#ff8a80');
			this.time.delayedCall(500, () => this.header.setColor('#9ff0fa'));
			return;
		}
		this.registry.set('picks', this.picks);
		this.store.set('picks', this.picks);
		this.scene.start('Menu');
	}

	refresh() {
		const names = this.picks.map(id => JOBS[id].name);
		this.header.setText(this.picks.length === 2
			? `LOADOUT: ${names[0]} (starts) + ${names[1]}`
			: `pick ${2 - this.picks.length} more job${this.picks.length ? '' : 's'}${names.length ? `  (${names[0]})` : ''}`);
		const cur = this.current();
		for (const [id, c] of Object.entries(this.cards)) {
			const slot = this.picks.indexOf(id);
			c.badge.setText(slot >= 0 ? String(slot + 1) : '').setVisible(slot >= 0);
			const selected = id === cur;
			c.bg.setStrokeStyle(selected ? 3 : slot >= 0 ? 2 : 1, selected ? 0xf2d544 : slot >= 0 ? 0x9ff0fa : 0x2c3550);
		}
		this.showDetail(cur);
	}

	showDetail(id) {
		const job = JOBS[id];
		const level = this.levels[id];
		const action = ACTIONS[job.action];
		const stats = Object.entries(job.stats).map(([s, v]) => formatMod(STATS, s, v)).join(', ');
		const lock = lockReason(job, this.levels, JOBS);
		this.detail.setText([
			`${job.name.toUpperCase()}  ·  ${job.tier}${lock ? `   LOCKED: needs ${lock}` : ''}`,
			job.blurb,
			`Attack: ${job.attacks.map(a => ATTACKS[a].name).join(' + ')}    Action: ${action.name} (${charges(action)})`,
			`While active: ${stats || 'no bonus'}`,
		].join('\n'));
		this.nodeText.setText(['JOB TREE', ...job.nodes.map(n => {
			const got = level >= n.level ? '■' : '□';
			return `${got} Lv${String(n.level).padStart(2)} ${formatMod(STATS, n.stat, n.add)}${n.mastery ? ' ★ all jobs' : ''}`;
		})].join('\n'));
		this.detail.setWordWrapWidth(W - 60 - this.nodeText.width - 20);
	}
}
