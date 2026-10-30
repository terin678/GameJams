// Play's heads-up display: run XP and HP bars, timer, boss bar, the two job
// panels and the Job Action dial. Reads the Play scene's state every frame.
import { TUNING } from '../data/tuning.js';
import { JOBS } from '../data/jobs.js';
import { ACTIONS } from '../data/abilities.js';
import { FX } from '../data/graphics.js';
import { levelFromXp } from '../core/jobs.js';
import { activeJob, canSwap, chargeInfo } from '../core/loadout.js';
import { xpToNext } from '../core/xp.js';
import { formatTime } from '../core/run.js';
import { chase } from '../core/anim.js';
import { isTouch } from '../../../../shared/ui.js';
import { DEPTH, textStyle, stack } from './kit.js';
import { frameKey } from './textures.js';

const W = TUNING.width, H = TUNING.height;
const PANEL = { w: 214, h: 54, gap: 10 };
export const DIAL = { x: W - 64, y: H - 84, r: 34 };   // the Job Action charge dial

export class Hud {
	constructor(play) {
		this.play = play;
		const scene = play;
		const style = (px, color) => textStyle(scene, px, color);
		const hud = o => o.setScrollFactor(0).setDepth(DEPTH.hud);
		const touch = isTouch(scene);
		this.gfx = hud(scene.add.graphics());

		// Everything is placed from measured text sizes, because phones draw
		// text up to 1.6x larger and fixed offsets would collide.
		// Top row: run level, timer, KOs (and the pause button on touch).
		this.lvText = hud(scene.add.text(12, 0, 'LV 1', style(14, '#9ff0fa')).setOrigin(0, 0.5));
		this.timeText = hud(scene.add.text(W / 2, 0, '00:00', style(22)).setOrigin(0.5));
		const row = 12 + Math.max(this.lvText.height, this.timeText.height) / 2;
		this.lvText.setY(row);
		this.timeText.setY(row);
		let koRight = W - 12;
		if (touch) {
			const pauseBtn = hud(scene.add.text(W - 12, row, 'II', style(18, '#8a93b8')).setOrigin(1, 0.5).setInteractive())
				.on('pointerdown', (_p, _x, _y, e) => { e.stopPropagation(); scene.pause(); });
			koRight = pauseBtn.getBounds().left - 14;
		}
		this.killText = hud(scene.add.text(koRight, row, 'KO 0', style(13, '#b8bcc8')).setOrigin(1, 0.5));

		// HP bar under the level, tall enough for its numbers, which sit centred in it.
		this.hpText = hud(scene.add.text(0, 0, '100 / 100', style(10)).setOrigin(0.5));
		this.hpBar = { x: 12, y: Math.max(40, this.lvText.getBounds().bottom + 6), w: 200, h: Math.max(14, Math.ceil(this.hpText.height) + 2) };
		this.hpText.setPosition(this.hpBar.x + this.hpBar.w / 2, this.hpBar.y + this.hpBar.h / 2);

		// Boss name under the timer, its bar under the name.
		this.bossText = hud(scene.add.text(W / 2, this.timeText.getBounds().bottom + 2, 'BOSS', style(12, '#ff8a80')).setOrigin(0.5, 0).setVisible(false));
		this.bossBarY = Math.ceil(this.bossText.getBounds().bottom) + 2;

		// Bars that animate: HP leaves a white chip that drains after a beat;
		// run XP slides instead of jumping.
		this.chip = 1;
		this.chipHoldUntil = 0;
		this.xpShown = 0;
		this.swapFlashUntil = 0;

		// Job panels: name and level, the action with its charges, and a live
		// job XP bar, stacked and centred in a panel tall enough to hold them.
		const label = (x, px, color) => hud(scene.add.text(x, 0, 'Ag', style(px, color)));
		this.panels = play.loadout.jobs.map((id, i) => {
			const x = 12 + i * (PANEL.w + PANEL.gap);
			return { id, x, name: label(x + 44, 12), act: label(x + 44, 10, '#b8bcc8') };
		});
		const { name, act } = this.panels[0];
		const content = name.height + act.height + 3 + 8;   // name, action, gap, XP bar
		this.panelH = Math.max(PANEL.h, Math.ceil(content) + 10);
		const top = H - this.panelH - 12;
		for (const pn of this.panels) {
			pn.y = top;
			pn.barY = stack(top + (this.panelH - content) / 2, [pn.name, pn.act]) + 3;
			pn.icon = hud(scene.add.image(pn.x + 22, top + this.panelH / 2, frameKey(JOBS[pn.id].sprite, 0)));
		}
		hud(scene.add.text(12, top - 4, touch ? '' : 'TAB swap job    P pause', style(10, '#8a93b8')).setOrigin(0, 1));

		// The Job Action dial: fills as the next charge builds, a pip per charge.
		this.dialName = hud(scene.add.text(DIAL.x, DIAL.y - DIAL.r - 4, '', style(11)).setOrigin(0.5, 1));
		this.dialIcon = hud(scene.add.image(DIAL.x, DIAL.y, frameKey(play.jobSprite(), 0)));
		hud(scene.add.text(DIAL.x, DIAL.y + DIAL.r + 17, touch ? 'TAP' : 'SPACE', style(10, '#8a93b8')).setOrigin(0.5, 0));
		// The first-use prompt: left of the dial, or above it on touch where the SWAP button is.
		this.dialNag = touch
			? hud(scene.add.text(DIAL.x, 0, 'TAP ME! ▼', style(12, '#f2d544')).setOrigin(0.5, 1).setVisible(false))
			: hud(scene.add.text(DIAL.x - DIAL.r - 12, DIAL.y, 'press SPACE! ▶', style(12, '#f2d544')).setOrigin(1, 0.5).setVisible(false));
		hud(scene.add.circle(DIAL.x, DIAL.y, DIAL.r, 0x000000, 0.001).setInteractive({ useHandCursor: true }))
			.on('pointerdown', (_p, _x, _y, e) => { e.stopPropagation(); play.tryAction(); });
		this.lastReady = Object.fromEntries(play.loadout.jobs.map(id => [id, 0]));

		if (touch) this.buildSwapButton();
		this.refresh();
		this.dialNag.setX(Math.min(this.dialNag.x, W - 6 - this.dialNag.width / 2));
		if (touch) this.dialNag.setY(this.dialName.getBounds().top - 2);
	}

	buildSwapButton() {
		const scene = this.play, x = DIAL.x - DIAL.r - 50, y = H - 50, r = 30, color = 0x9ff0fa;
		const c = scene.add.circle(x, y, r, color, 0.35).setStrokeStyle(2, color, 0.9).setScrollFactor(0).setDepth(DEPTH.hud).setInteractive();
		scene.add.text(x, y, 'SWAP', textStyle(scene, 12)).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.hud);
		c.on('pointerdown', (_p, _x, _y, e) => { e.stopPropagation(); scene.trySwap(); });
	}

	// After a swap or a job level: names, levels, which panel is lit.
	refresh() {
		const play = this.play;
		this.panels.forEach((pn, i) => {
			const active = i === play.loadout.active;
			pn.name.setText(`${JOBS[pn.id].name}  Lv ${play.levels[pn.id]}`);
			pn.icon.setAlpha(active ? 1 : 0.5);
			pn.name.setAlpha(active ? 1 : 0.55);
			pn.act.setAlpha(active ? 1 : 0.55);
		});
		this.dialName.setText(ACTIONS[JOBS[activeJob(play.loadout)].action].name);
		this.dialIcon.setTexture(frameKey(play.jobSprite(), 0));
	}

	onSwap() {
		this.swapFlashUntil = this.play.now + 220;
		this.refresh();
		this.pop(this.dialIcon, 1.4);
	}

	onHurt() {
		this.chipHoldUntil = this.play.now + FX.chip.holdMs;
	}

	onRunLevel() {
		this.pop(this.lvText, 1.6);
	}

	// The dial has one charge fewer: don't chime for it coming back.
	onActionSpent(id) {
		this.lastReady[id] -= 1;
	}

	pop(obj, from) {
		this.play.tweens.killTweensOf(obj);
		obj.setScale(from);
		this.play.tweens.add({ targets: obj, scale: 1, duration: 260, ease: 'Back.easeOut' });
	}

	update(dt) {
		const play = this.play, h = this.gfx, now = play.now;
		h.clear();
		const bar = (x, y, w, ht, frac, color, chip = null) => {
			h.fillStyle(0x0b0a10, 0.85).fillRect(x, y, w, ht);
			if (chip !== null) h.fillStyle(0xf4f4f4, 0.85).fillRect(x + 1, y + 1, Math.max(0, (w - 2) * Math.min(1, chip)), ht - 2);
			h.fillStyle(color, 1).fillRect(x + 1, y + 1, Math.max(0, (w - 2) * Math.min(1, frac)), ht - 2);
		};

		const xp = play.runLevel.xp / xpToNext(play.runLevel.level, TUNING.runXp);
		this.xpShown = xp < this.xpShown ? xp : this.xpShown + (xp - this.xpShown) * Math.min(1, dt * 12);
		bar(0, 0, W, 10, this.xpShown, 0x4d8fe0);
		this.lvText.setText(`LV ${play.runLevel.level}`);
		this.timeText.setText(formatTime(play.run.t)).setColor(play.run.phase === 'boss' ? '#ff8a80' : '#f4f4f4');
		this.killText.setText(`KO ${play.run.kills}`);

		const hp = Math.max(0, play.hp / play.stats.maxHp);
		this.chip = now < this.chipHoldUntil ? Math.max(this.chip, hp) : chase(this.chip, hp, dt, FX.chip.perSecond);
		bar(this.hpBar.x, this.hpBar.y, this.hpBar.w, this.hpBar.h, hp, hp < 0.3 && Math.floor(now / 200) % 2 ? 0xff6a5c : 0xd6463c, this.chip);
		this.hpText.setText(`${Math.max(0, Math.ceil(play.hp))} / ${Math.round(play.stats.maxHp)}`);

		const boss = play.boss && !play.boss.dead ? play.boss : null;
		this.bossText.setVisible(!!boss);
		if (boss) {
			this.bossText.setText(boss.def.name.toUpperCase());
			bar(W / 2 - 200, this.bossBarY, 400, 10, boss.hp / boss.maxHp, 0xb0302a);
		}

		this.panels.forEach((pn, i) => {
			const active = i === play.loadout.active;
			const action = ACTIONS[JOBS[pn.id].action];
			h.fillStyle(0x14121c, active ? 0.85 : 0.6).fillRect(pn.x, pn.y, PANEL.w, this.panelH);
			const flash = active && now < this.swapFlashUntil;
			h.lineStyle(flash ? 3 : 2, flash ? 0xffffff : active ? 0xf2d544 : 0x2c3550, 1).strokeRect(pn.x, pn.y, PANEL.w, this.panelH);
			const c = chargeInfo(play.loadout.gauge[pn.id], action.cost, TUNING.gauge.max);
			const label = `${action.name}  ${'●'.repeat(c.ready)}${'○'.repeat(c.total - c.ready)}`;
			if (pn.act.text !== label) pn.act.setText(label);
			const jx = levelFromXp((play.savedXp[pn.id] ?? 0) + (play.runJobXp[pn.id] ?? 0), TUNING.jobXp);
			bar(pn.x + 44, pn.barY, PANEL.w - 54, 8, jx.max ? 1 : jx.into / jx.need, jx.max ? 0xf2d544 : 0x4d8fe0);
			if (!active && !canSwap(play.loadout, now)) {
				const left = (play.loadout.swapReadyAt - now) / TUNING.swap.cooldownMs;
				h.fillStyle(0x000000, 0.45).fillRect(pn.x, pn.y, PANEL.w * left, this.panelH);
			}
		});
		this.drawDial(h);
	}

	// The dial for the active job's action, plus a chime when a charge fills.
	drawDial(h) {
		const play = this.play;
		const id = activeJob(play.loadout);
		const action = ACTIONS[JOBS[id].action];
		const c = chargeInfo(play.loadout.gauge[id], action.cost, TUNING.gauge.max);
		const { x, y, r } = DIAL;
		const top = -Math.PI / 2;
		h.fillStyle(0x14121c, 0.88).fillCircle(x, y, r);
		if (c.progress > 0 && c.ready < c.total) {
			h.fillStyle(action.color, 0.3);
			h.beginPath();
			h.slice(x, y, r - 3, top, top + Math.PI * 2 * c.progress, false);
			h.fillPath();
		}
		if (c.ready > 0) h.fillStyle(action.color, c.ready >= c.total ? 0.45 : 0.18).fillCircle(x, y, r - 3);
		const pulse = 0.55 + 0.45 * Math.sin(play.now / 140);
		h.lineStyle(c.ready ? 4 : 2, c.ready ? action.color : 0x3a3f58, c.ready ? pulse : 1).strokeCircle(x, y, r);
		for (let k = 0; k < c.total; k++) {
			const px = x + (k - (c.total - 1) / 2) * 16, py = y + r + 10;
			if (k < c.ready) h.fillStyle(action.color, 1).fillCircle(px, py, 5);
			else h.lineStyle(2, 0x6b7080, 1).strokeCircle(px, py, 4);
		}
		this.dialIcon.setAlpha(c.ready ? 1 : 0.45);

		if (c.ready > this.lastReady[id]) {
			play.sfx.play('ready');
			play.fx.ring(play.player.x, play.player.y, 30, action.color);
			play.fx.burst(play.player.x, play.player.y, action.color, FX.burst.ready, { speed: 0.6 });
			this.pop(this.dialIcon, 1.5);
		}
		this.lastReady[id] = c.ready;
		this.dialNag.setVisible(!play.actionUsed && c.ready > 0).setAlpha(pulse);
	}
}
