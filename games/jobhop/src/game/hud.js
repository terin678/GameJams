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
import { DEPTH, textStyle } from './kit.js';
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
		this.gfx = hud(scene.add.graphics());
		this.lvText = hud(scene.add.text(12, 16, '', style(14, '#9ff0fa')));
		this.timeText = hud(scene.add.text(W / 2, 16, '', style(22)).setOrigin(0.5, 0));
		this.killText = hud(scene.add.text(W - 12, 40, '', style(13, '#b8bcc8')).setOrigin(1, 0));
		this.hpText = hud(scene.add.text(12 + 100, 44, '', style(10)).setOrigin(0.5, 0));
		this.bossText = hud(scene.add.text(W / 2, 50, '', style(12, '#ff8a80')).setOrigin(0.5, 0).setVisible(false));

		// Bars that animate: HP leaves a white chip that drains after a beat;
		// run XP slides instead of jumping.
		this.chip = 1;
		this.chipHoldUntil = 0;
		this.xpShown = 0;
		this.swapFlashUntil = 0;

		// Job panels: name and level, the action with its charges, and a live job XP bar.
		const top = H - PANEL.h - 12;
		this.panels = play.loadout.jobs.map((id, i) => {
			const x = 12 + i * (PANEL.w + PANEL.gap);
			return {
				id, x, y: top,
				icon: hud(scene.add.image(x + 22, top + PANEL.h / 2, frameKey(JOBS[id].sprite, 0))),
				name: hud(scene.add.text(x + 44, top + 5, '', style(12))),
				act: hud(scene.add.text(x + 44, top + 21, '', style(10, '#b8bcc8'))),
			};
		});
		const touch = isTouch(scene);
		hud(scene.add.text(12, top - 18, touch ? '' : 'TAB swap job    P pause', style(10, '#8a93b8')));

		// The Job Action dial: fills as the next charge builds, a pip per charge.
		this.dialName = hud(scene.add.text(DIAL.x, DIAL.y - DIAL.r - 16, '', style(11)).setOrigin(0.5));
		this.dialIcon = hud(scene.add.image(DIAL.x, DIAL.y, frameKey(play.jobSprite(), 0)));
		hud(scene.add.text(DIAL.x, DIAL.y + DIAL.r + 24, touch ? 'TAP' : 'SPACE', style(10, '#8a93b8')).setOrigin(0.5));
		this.dialNag = hud(scene.add.text(DIAL.x - DIAL.r - 12, DIAL.y, touch ? 'TAP ME! ▶' : 'press SPACE! ▶', style(12, '#f2d544')).setOrigin(1, 0.5).setVisible(false));
		hud(scene.add.circle(DIAL.x, DIAL.y, DIAL.r, 0x000000, 0.001).setInteractive({ useHandCursor: true }))
			.on('pointerdown', (_p, _x, _y, e) => { e.stopPropagation(); play.tryAction(); });
		this.lastReady = Object.fromEntries(play.loadout.jobs.map(id => [id, 0]));

		if (touch) this.buildTouchButtons();
		this.refresh();
	}

	buildTouchButtons() {
		const scene = this.play;
		const button = (x, y, r, label, color, fn) => {
			const c = scene.add.circle(x, y, r, color, 0.35).setStrokeStyle(2, color, 0.9).setScrollFactor(0).setDepth(DEPTH.hud).setInteractive();
			scene.add.text(x, y, label, textStyle(scene, 12)).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.hud);
			c.on('pointerdown', (_p, _x, _y, e) => { e.stopPropagation(); fn(); });
		};
		button(DIAL.x - DIAL.r - 50, H - 50, 30, 'SWAP', 0x9ff0fa, () => scene.trySwap());
		scene.add.text(W - 12, 12, 'II', textStyle(scene, 18, '#8a93b8'))
			.setOrigin(1, 0).setScrollFactor(0).setDepth(DEPTH.hud).setInteractive()
			.on('pointerdown', (_p, _x, _y, e) => { e.stopPropagation(); scene.pause(); });
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
		bar(12, 40, 200, 14, hp, hp < 0.3 && Math.floor(now / 200) % 2 ? 0xff6a5c : 0xd6463c, this.chip);
		this.hpText.setText(`${Math.max(0, Math.ceil(play.hp))} / ${Math.round(play.stats.maxHp)}`);

		const boss = play.boss && !play.boss.dead ? play.boss : null;
		this.bossText.setVisible(!!boss);
		if (boss) {
			this.bossText.setText(boss.def.name.toUpperCase());
			bar(W / 2 - 200, 68, 400, 10, boss.hp / boss.maxHp, 0xb0302a);
		}

		this.panels.forEach((pn, i) => {
			const active = i === play.loadout.active;
			const action = ACTIONS[JOBS[pn.id].action];
			h.fillStyle(0x14121c, active ? 0.85 : 0.6).fillRect(pn.x, pn.y, PANEL.w, PANEL.h);
			const flash = active && now < this.swapFlashUntil;
			h.lineStyle(flash ? 3 : 2, flash ? 0xffffff : active ? 0xf2d544 : 0x2c3550, 1).strokeRect(pn.x, pn.y, PANEL.w, PANEL.h);
			const c = chargeInfo(play.loadout.gauge[pn.id], action.cost, TUNING.gauge.max);
			const label = `${action.name}  ${'●'.repeat(c.ready)}${'○'.repeat(c.total - c.ready)}`;
			if (pn.act.text !== label) pn.act.setText(label);
			const jx = levelFromXp((play.savedXp[pn.id] ?? 0) + (play.runJobXp[pn.id] ?? 0), TUNING.jobXp);
			bar(pn.x + 44, pn.y + 39, PANEL.w - 54, 8, jx.max ? 1 : jx.into / jx.need, jx.max ? 0xf2d544 : 0x4d8fe0);
			if (!active && !canSwap(play.loadout, now)) {
				const left = (play.loadout.swapReadyAt - now) / TUNING.swap.cooldownMs;
				h.fillStyle(0x000000, 0.45).fillRect(pn.x, pn.y, PANEL.w * left, PANEL.h);
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
