// Everything Play draws that is not a sprite: swings, thrusts, blasts, fields,
// particles, shadows, floating text, banners, screen flashes and shake.
// Visual only: nothing here changes the game. Sizes and timings come from
// data/graphics.js, and the current quality preset decides how much to draw.
import { TUNING } from '../data/tuning.js';
import { FX } from '../data/graphics.js';
import { progress, easeOutCubic, easeOutBack, swingSpan, thrustReach } from '../core/anim.js';
import { scaleCount } from '../core/graphics.js';
import { DEPTH, textStyle, css } from './kit.js';
import { frameKey } from './textures.js';

const W = TUNING.width, H = TUNING.height;
const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);

export class Fx {
	constructor(scene, quality, pool) {
		this.scene = scene;
		this.quality = quality;
		this.pool = pool;
		this.list = [];        // short-lived vector effects: { kind, born, until, ... }
		this.numbers = [];     // damage numbers: { text, x, y, born, until } (text objects are reused)
		this.spareNumbers = [];
		this.under = scene.add.graphics().setDepth(DEPTH.field);   // fields, telegraphs
		this.gfx = scene.add.graphics().setDepth(DEPTH.fx);

		// One emitter for every burst. Each burst sets these before exploding.
		this.next = { tint: 0xffffff, speed: 1, life: 1, gravity: 0 };
		const p = FX.particle;
		this.emitter = scene.add.particles(0, 0, frameKey('spark'), {
			emitting: false,
			angle: { min: 0, max: 360 },
			speed: { onEmit: () => rand(p.speed[0], p.speed[1]) * this.next.speed },
			lifespan: { onEmit: () => rand(p.lifeMs[0], p.lifeMs[1]) * this.next.life },
			gravityY: 0,
			scale: { start: 1, end: 0 },
			alpha: { start: 1, end: 0.2 },
			tint: { onEmit: () => this.next.tint },
			blendMode: 'ADD',
		}).setDepth(DEPTH.fx);

		const hud = o => o.setScrollFactor(0).setDepth(DEPTH.hud - 1).setAlpha(0);
		this.flashRect = hud(scene.add.rectangle(0, 0, W, H, 0xffffff).setOrigin(0));
		this.vignette = hud(scene.add.image(0, 0, 'vignette').setOrigin(0));
	}

	get preset() {
		return this.quality.preset;
	}

	// ---------- particles ----------

	burst(x, y, color, n, { speed = 1, life = 1 } = {}) {
		const preset = this.preset;
		const count = Math.min(scaleCount(n, preset), preset.maxParticles - this.emitter.getAliveParticleCount());
		if (count <= 0) return;
		this.next.tint = color;
		this.next.speed = speed;
		this.next.life = life;
		this.emitter.explode(count, x, y);
	}

	// One slow spark behind a projectile (HIGH only).
	trail(x, y, color) {
		if (this.preset.trails) this.burst(x, y, color, 1, { speed: 0.15, life: 0.6 });
	}

	// ---------- shadows ----------

	// Keep a ground shadow `width` px wide under `ent` at its feet. Adds or
	// drops the shadow image as the preset turns shadows on and off.
	shadow(ent, x, y, width) {
		if (!this.preset.shadows) { this.dropShadow(ent); return; }
		if (!ent.shadow) ent.shadow = this.pool.get(x, y, 'shadow', DEPTH.shadow);
		ent.shadow.setPosition(x, y).setScale(width / 32, Math.max(0.6, width / 40));
	}

	dropShadow(ent) {
		if (!ent.shadow) return;
		this.pool.release(ent.shadow);
		ent.shadow = null;
	}

	// ---------- one-shot effects ----------

	add(kind, props, ms) {
		const now = this.scene.now;
		this.list.push({ kind, ...props, born: now, until: now + ms });
	}

	swing(x, y, dir, range, arcDeg, color) { this.add('arc', { x, y, dir, range, arcDeg, color }, FX.fxMs); }
	thrust(x, y, dir, length, width, color) { this.add('line', { x, y, dir, length, width, color }, FX.fxMs); }
	ring(x, y, radius, color, ms = FX.ringMs) { this.add('ring', { x, y, radius, color }, ms); }

	blast(x, y, radius, color, big) {
		this.add('blast', { x, y, radius, color }, FX.blastMs);
		this.burst(x, y, color, FX.burst.blast * (big ? 2 : 1), { speed: 1 + radius / 120 });
		if (big) { this.shake('blast'); this.flash(color, 0.22); }
	}

	// A column of light for a job level-up.
	pillar(x, y, color) {
		this.add('pillar', { x, y, color }, 700);
		this.burst(x, y, color, FX.burst.joblevel, { speed: 0.8, life: 1.4 });
	}

	// A dying sprite puffs up white and fades; the image goes back to the pool.
	death(img, scale = 1) {
		img.setTintFill(0xffffff);
		this.scene.tweens.add({
			targets: img, scale: scale * 1.5, alpha: 0, duration: FX.deathMs, ease: 'Cubic.easeOut',
			onComplete: () => this.pool.release(img),
		});
	}

	number(x, y, amount, color = 0xffffff) {
		if (!this.preset.damageNumbers || amount < 1 || this.numbers.length >= FX.numbers.max) return;
		const text = this.spareNumbers.pop()
			?? this.scene.add.text(0, 0, '', textStyle(this.scene, 10, '#ffffff', { stroke: '#14121c', strokeThickness: 3 })).setOrigin(0.5).setDepth(DEPTH.text);
		text.setText(String(Math.round(amount))).setColor(css(color)).setVisible(true).setAlpha(1);
		const now = this.scene.now;
		this.numbers.push({ text, x: x + rand(-6, 6), y, born: now, until: now + FX.numbers.ms });
	}

	floatText(text, x, y, color = 0xf4f4f4) {
		const t = this.scene.add.text(x, y, text, textStyle(this.scene, 12, css(color), { stroke: '#14121c', strokeThickness: 4 }))
			.setOrigin(0.5).setDepth(DEPTH.text).setScale(0.6);
		this.scene.tweens.add({ targets: t, scale: 1, duration: 160, ease: 'Back.easeOut' });
		this.scene.tweens.add({ targets: t, y: y - 28, alpha: 0, delay: 120, duration: 800, onComplete: () => t.destroy() });
	}

	// Big centred text that pops in, holds for `ms`, then fades.
	banner(text, ms, y = H * 0.3) {
		const t = this.scene.add.text(W / 2, y, text, textStyle(this.scene, 26, '#f2d544', { stroke: '#14121c', strokeThickness: 6, align: 'center' }))
			.setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.hud + 1).setScale(1.6).setAlpha(0);
		this.scene.tweens.add({ targets: t, scale: 1, alpha: 1, duration: FX.bannerPopMs, ease: 'Back.easeOut' });
		this.scene.tweens.add({ targets: t, alpha: 0, y: y - 12, delay: ms, duration: 400, onComplete: () => t.destroy() });
	}

	// ---------- screen ----------

	shake(kind) {
		const [ms, amount] = FX.shake[kind];
		this.scene.cameras.main.shake(ms, amount);
	}

	flash(color, alpha) {
		if (!this.preset.flashes) return;
		this.scene.tweens.killTweensOf(this.flashRect);
		this.flashRect.setFillStyle(color).setAlpha(alpha);
		this.scene.tweens.add({ targets: this.flashRect, alpha: 0, duration: FX.flashMs });
	}

	hurt() {
		if (!this.preset.flashes) return;
		this.scene.tweens.killTweensOf(this.vignette);
		this.vignette.setAlpha(0.9);
		this.scene.tweens.add({ targets: this.vignette, alpha: 0, duration: FX.vignetteMs });
	}

	// ---------- per frame ----------

	draw(now, { fields, pulses, player, dash }) {
		const g = this.gfx, u = this.under;
		g.clear();
		u.clear();

		// Fields breathe and their dashed rim turns; blizzard and sanctuary shed sparks.
		for (const f of fields) {
			const breathe = 0.11 + 0.05 * Math.sin(now / 220);
			u.fillStyle(f.color, breathe).fillCircle(f.x, f.y, f.radius);
			u.lineStyle(2, f.color, 0.6);
			const dashes = 18, spin = now / 1400;
			for (let i = 0; i < dashes; i++) {
				const a = spin + (TAU * i) / dashes;
				u.beginPath();
				u.arc(f.x, f.y, f.radius, a, a + TAU / dashes / 2, false);
				u.strokePath();
			}
			if (Math.random() < 0.35) {
				const a = Math.random() * TAU, r = Math.sqrt(Math.random()) * f.radius;
				this.burst(f.x + Math.cos(a) * r, f.y + Math.sin(a) * r, f.color, 1, { speed: 0.1, life: 1.6 });
			}
		}

		// Delayed pulses (Jump, Meteor): a blinking rim, and a disc filling in
		// as the hit approaches.
		for (const p of pulses) {
			const x = p.follow ? player.x : p.x, y = p.follow ? player.y : p.y;
			const blink = Math.floor(now / 90) % 2 ? 0.75 : 0.35;
			u.lineStyle(2, p.color, blink).strokeCircle(x, y, p.radius);
			const k = progress(now, p.born ?? now, p.at);
			u.fillStyle(p.color, 0.18).fillCircle(x, y, p.radius * k);
		}

		this.list = this.list.filter(f => f.until > now);
		for (const f of this.list) {
			const t = progress(now, f.born, f.until), fade = 1 - t;
			if (f.kind === 'arc') {
				const center = Math.atan2(f.dir.y, f.dir.x), arc = (f.arcDeg * Math.PI) / 180;
				const { from, to } = swingSpan(center, arc, t);
				g.fillStyle(f.color, 0.42 * fade);
				g.beginPath();
				g.moveTo(f.x, f.y);
				g.arc(f.x, f.y, f.range, from, to, false);
				g.closePath();
				g.fillPath();
				// The blade's leading edge, bright, and the tip's path along the rim.
				g.lineStyle(3, 0xffffff, 0.9 * fade);
				g.lineBetween(f.x + Math.cos(to) * f.range * 0.35, f.y + Math.sin(to) * f.range * 0.35, f.x + Math.cos(to) * f.range, f.y + Math.sin(to) * f.range);
				g.lineStyle(2, f.color, 0.8 * fade);
				g.beginPath();
				g.arc(f.x, f.y, f.range, from, to, false);
				g.strokePath();
			} else if (f.kind === 'line') {
				const { x, y, dir } = f;
				const len = f.length * thrustReach(t), w = f.width * (0.5 + 0.5 * fade);
				const nx = (-dir.y * w) / 2, ny = (dir.x * w) / 2;
				const tx = x + dir.x * len, ty = y + dir.y * len;
				g.fillStyle(f.color, 0.5 * fade);
				g.fillPoints([{ x: x + nx, y: y + ny }, { x: tx + nx * 0.4, y: ty + ny * 0.4 }, { x: tx + dir.x * w * 0.6, y: ty + dir.y * w * 0.6 }, { x: tx - nx * 0.4, y: ty - ny * 0.4 }, { x: x - nx, y: y - ny }], true);
				g.fillStyle(0xffffff, 0.9 * fade).fillCircle(tx, ty, 3);
			} else if (f.kind === 'ring') {
				g.lineStyle(3 * fade + 1, f.color, fade).strokeCircle(f.x, f.y, f.radius * (0.6 + 0.6 * easeOutCubic(t)));
			} else if (f.kind === 'blast') {
				const e = easeOutCubic(t);
				g.fillStyle(f.color, 0.38 * fade).fillCircle(f.x, f.y, f.radius * (0.5 + 0.5 * e));
				g.fillStyle(0xffffff, 0.5 * Math.max(0, 1 - t * 3)).fillCircle(f.x, f.y, f.radius * 0.45);
				g.lineStyle(5 * fade + 1, f.color, fade).strokeCircle(f.x, f.y, f.radius * (0.4 + 0.75 * e));
			} else if (f.kind === 'pillar') {
				const w = 26 * (1 - easeOutCubic(t)) + 2, top = f.y - 260;
				g.fillStyle(f.color, 0.45 * fade).fillRect(f.x - w / 2, top, w, f.y - top + 6);
				g.fillStyle(0xffffff, 0.6 * fade).fillRect(f.x - w / 6, top, w / 3, f.y - top + 6);
			}
		}

		if (dash) g.fillStyle(0xffffff, 0.3).fillCircle(player.x, player.y, dash.width / 2);

		this.numbers = this.numbers.filter(n => {
			if (n.until <= now) { n.text.setVisible(false); this.spareNumbers.push(n.text); return false; }
			const t = progress(now, n.born, n.until);
			n.text.setPosition(n.x, n.y - FX.numbers.rise * easeOutCubic(t)).setAlpha(1 - t * t).setScale(t < 0.15 ? easeOutBack(t / 0.15) : 1);
			return true;
		});
	}
}
