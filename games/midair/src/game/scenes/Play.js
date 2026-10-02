// The Phaser glue. Rules live in ../../core, content in ../../data.
import { TUNING } from '../../data/tuning.js';
import { ENEMIES } from '../../data/enemies.js';
import { STAGE } from '../../data/stage1.js';
import { FORMS } from '../../data/forms.js';
import { PICKUPS, EGG_CYCLE } from '../../data/pickups.js';
import { createPower, collect, tickPower, remaining, levelDef } from '../../core/power.js';
import { formationTargets, follow } from '../../core/flock.js';
import { createSquadrons, enlist, recordKill, recordEscape } from '../../core/squadrons.js';import { createMeters, tickMeters, damage, feed, trySpend, isDead } from '../../core/meters.js';
import { reticleFor, charge, bombProgress, splashTargets, isBullseye, bombDamage } from '../../core/bombing.js';
import { createScore, registerKill, tickCombo, multiplier } from '../../core/scoring.js';
import { positionAt, isOffscreen } from '../../core/patterns.js';
import { buildStage, createCursor, takeDue, isDone, difficulty } from '../../core/waves.js';
import { rollDrop } from '../../core/drops.js';
import { circlesOverlap } from '../../core/collide.js';
import { createRng } from '../../../../../shared/rng.js';
import { fs, isTouch } from '../../../../../shared/ui.js';
import { frameKey, frameCount } from '../textures.js';

const W = TUNING.width, H = TUNING.height;
const DEPTH = { ground: 0, groundFx: 4, shadow: 5, low: 10, splatter: 12, clouds: 20, bomb: 25, sky: 30, shots: 35, reticle: 38, bird: 40, fx: 45, hud: 100 };
const FONT = 'monospace';
const STAGE_SPAWNS = buildStage(STAGE);

export class Play extends Phaser.Scene {
	create() {
		this.sfx = this.registry.get('sfx');
		this.scores = this.registry.get('scores');
		this.rng = createRng(Date.now());

		this.clock = 0;            // play-time ms; stops while paused
		this.stageTime = 0;        // seconds; frozen during the boss
		this.loop = 0;
		this.diff = difficulty(0);
		this.cursor = createCursor(STAGE_SPAWNS);
		this.boss = null;
		this.intermissionUntil = 0;
		this.over = false;

		this.meters = createMeters(TUNING.meters);
		this.score = createScore();
		this.power = createPower(TUNING.player.form);
		this.flock = [];           // wingmen: { img, shadow, x, y }
		this.squadrons = createSquadrons();
		this.nextShotAt = 0;
		this.nextWingShotAt = 0;
		this.invulnUntil = 0;
		this.bombHeldSince = null;
		this.chargedCue = false;

		this.splats = [];
		this.enemies = [];
		this.shots = [];
		this.bombs = [];
		this.pickups = [];

		this.buildWorld();
		this.buildBird();
		this.buildInput();
		this.buildHud();
		this.buildFx();

		this.banner('STAGE 1  -  MIDAIR', 2200);
		this.sfx.play('start');
	}

	// ---------- setup ----------

	buildWorld() {
		this.ground = this.add.tileSprite(0, 0, W, H, 'city').setOrigin(0).setDepth(DEPTH.ground);
		this.clouds = [];
		for (let i = 0; i < 5; i++) {
			const c = this.add.image(this.rng.range(0, W), this.rng.range(-100, H), frameKey('cloud'))
				.setDepth(DEPTH.clouds).setAlpha(0.35).setScale(this.rng.range(0.8, 1.6));
			c.speed = TUNING.scroll.clouds * this.rng.range(0.8, 1.2);
			this.clouds.push(c);
		}
	}

	buildBird() {
		const p = TUNING.player;
		this.bird = this.add.image(W / 2, p.startY, frameKey('bird', 0)).setDepth(DEPTH.bird);
		this.birdShadow = this.add.image(0, 0, frameKey('bird', 0))
			.setDepth(DEPTH.shadow).setTintFill(0x000000).setAlpha(0.22).setScale(0.55);
		this.reticle = this.add.graphics().setDepth(DEPTH.reticle);
	}

	buildInput() {
		const kb = this.input.keyboard;
		this.keys = kb.addKeys('UP,DOWN,LEFT,RIGHT,W,A,S,D,Z,J,SPACE,X,K,SHIFT');
		const onPause = () => this.pause();
		const onMute = () => this.toggleMute();
		kb.on('keydown-P', onPause);
		kb.on('keydown-ESC', onPause);
		kb.on('keydown-M', onMute);
		const bombDown = () => this.startBomb();
		const bombUp = () => this.releaseBomb();
		const bombKeys = [this.keys.X, this.keys.K, this.keys.SHIFT];
		for (const k of bombKeys) {
			k.on('down', bombDown);
			k.on('up', bombUp);
		}

		// Auto-pause when the tab/window loses focus.
		const onBlur = () => this.pause();
		this.game.events.on(Phaser.Core.Events.BLUR, onBlur);
		const onResume = () => {
			kb.resetKeys();
			this.drag = null;
			this.bombHeldSince = null;
			this.mouseFire = false;
			this.mouseBomb = false;
		};
		this.events.on(Phaser.Scenes.Events.RESUME, onResume);
		// Phaser reuses emitters and Key objects across restarts, so remove
		// everything we added or handlers stack up on every new game.
		this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
			this.game.events.off(Phaser.Core.Events.BLUR, onBlur);
			this.events.off(Phaser.Scenes.Events.RESUME, onResume);
			kb.off('keydown-P', onPause);
			kb.off('keydown-ESC', onPause);
			kb.off('keydown-M', onMute);
			for (const k of bombKeys) { k.off('down', bombDown); k.off('up', bombUp); }
			this.input.off('pointerdown');
			this.input.off('pointermove');
			this.input.off('pointerup');
			this.input.off('pointerupoutside');
		});

		// Keyboard + mouse and touch are separate schemes:
		// - KBM: keys move; the mouse is buttons only (left splat, right bomb,
		//   hold to charge). The cursor never moves the bird.
		// - Touch: drag anywhere to move (relative), auto-fire while dragging,
		//   hold the on-screen bomb button to charge.
		this.touch = isTouch(this);
		this.drag = null;
		this.input.setDefaultCursor('crosshair');
		this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.input.setDefaultCursor('default'));
		this.mouseFire = false;
		this.mouseBomb = false;
		if (this.touch) {
			const r = 46;
			this.bombBtn = this.add.circle(W - 64, H - 78, r, 0x3e2814, 0.55)
				.setStrokeStyle(3, 0xe8dcc0, 0.8).setDepth(DEPTH.hud).setInteractive();
			this.add.image(W - 64, H - 78, frameKey('bomb')).setDepth(DEPTH.hud).setScale(1.6);
			this.bombBtn.on('pointerdown', p => { this.bombPointer = p.id; this.startBomb(); });
		}
		this.input.on('pointerdown', (p, over) => {
			this.sfx.unlock();
			if (!p.wasTouch) {
				if (p.rightButtonDown()) {
					this.mouseBomb = true;
					this.startBomb();
				}
				if (p.leftButtonDown()) {
					this.mouseFire = true;
					this.fireTap = true; // a click shorter than a frame still fires
				}
				return;
			}
			if (over.includes(this.bombBtn)) return;
			if (!this.drag) this.drag = { id: p.id, px: p.x, py: p.y, bx: this.bird.x, by: this.bird.y };
		});
		this.input.on('pointermove', p => {
			if (this.over || !p.wasTouch || !this.drag || this.drag.id !== p.id) return;
			const k = TUNING.player.touchFollow;
			this.bird.x = this.drag.bx + (p.x - this.drag.px) * k;
			this.bird.y = this.drag.by + (p.y - this.drag.py) * k;
			this.clampBird();
		});
		const onUp = p => {
			if (!p.wasTouch) {
				if (p.button === 2 && this.mouseBomb) {
					this.mouseBomb = false;
					this.releaseBomb();
				}
				if (p.button === 0) this.mouseFire = false;
				return;
			}
			if (p.id === this.bombPointer) { this.bombPointer = null; this.releaseBomb(); }
			if (this.drag?.id === p.id) this.drag = null;
		};
		this.input.on('pointerup', onUp);
		this.input.on('pointerupoutside', onUp);
	}

	buildHud() {
		const style = (px, color = '#f4f4f4') => ({ fontFamily: FONT, fontSize: fs(this, px), color, fontStyle: 'bold' });
		this.hudScore = this.add.text(10, 26, '', style(16)).setDepth(DEPTH.hud);
		this.hudHi = this.add.text(W - 10, 26, '', style(12, '#f2d544')).setOrigin(1, 0).setDepth(DEPTH.hud);
		this.hudCombo = this.add.text(10, 48, '', style(12, '#9ff0fa')).setDepth(DEPTH.hud);
		this.hudPower = this.add.text(W - 10, 44, '', style(11, '#ef6fb0')).setOrigin(1, 0).setDepth(DEPTH.hud);
		this.hudBars = this.add.graphics().setDepth(DEPTH.hud);
		this.hudLabels = [
			this.add.text(10, H - 44, 'ENERGY', style(10)).setDepth(DEPTH.hud),
			this.add.text(10, H - 24, 'GUT', style(10, '#e8dcc0')).setDepth(DEPTH.hud),
		];
		this.bannerText = this.add.text(W / 2, H * 0.38, '', { ...style(26, '#f2d544'), stroke: '#1b1b2a', strokeThickness: 6, align: 'center' })
			.setOrigin(0.5).setDepth(DEPTH.hud).setVisible(false);
		this.hi = this.scores.best();
	}

	buildFx() {
		const burst = (tint) => this.add.particles(0, 0, frameKey('spark'), {
			lifespan: { min: 250, max: 650 }, speed: { min: 60, max: 260 }, scale: { start: 1.6, end: 0 },
			tint, emitting: false,
		}).setDepth(DEPTH.fx);
		this.fxBoom = burst([0xffd23f, 0xff8a3d, 0xd6463c, 0xf4f4f4]);
		this.fxFeathers = burst([0x9aa3c8, 0x5d6690, 0xf4f4f4]);
		this.fxPoop = burst([0x6b4a2a, 0xe8dcc0]);
	}

	// ---------- loop ----------

	update(_time, deltaMs) {
		const dtMs = Math.min(deltaMs, 50);
		const dt = dtMs / 1000;
		this.clock += dtMs;

		this.scrollWorld(dt);
		if (!this.over) {
			this.advanceStage(dt);
			this.moveBird(dt);
			this.updatePower();
			this.updateFlock(dt);
			this.fire();
		}
		this.updateSplats(dt);
		this.updateBombs();
		this.updateEnemies(dt);
		this.updateShots(dt);
		this.updatePickups(dt);
		this.updateReticle();

		if (!this.over) {
			tickMeters(this.meters, dt, TUNING.meters);
			tickCombo(this.score, this.clock, TUNING.combo);
			if (isDead(this.meters)) this.die();
		}
		this.updateHud();
	}

	scrollWorld(dt) {
		this.ground.tilePositionY -= TUNING.scroll.ground * dt;
		for (const c of this.clouds) {
			c.y += c.speed * dt;
			if (c.y > H + 80) {
				c.y = -80;
				c.x = this.rng.range(0, W);
			}
		}
	}

	advanceStage(dt) {
		if (this.clock < this.intermissionUntil) return;
		if (this.pendingLoop) {
			this.pendingLoop = false;
			this.loop++;
			this.diff = difficulty(this.loop);
			this.cursor = createCursor(STAGE_SPAWNS);
			this.stageTime = 0;
			this.banner(`LOOP ${this.loop + 1}\nTHEY'RE ANGRIER`, 2200);
		}
		if (!this.boss) this.stageTime += dt;
		for (const s of takeDue(this.cursor, this.stageTime)) this.spawnEnemy(s);
	}

	moveBird(dt) {
		const k = this.keys;
		let dx = (k.RIGHT.isDown || k.D.isDown) - (k.LEFT.isDown || k.A.isDown);
		let dy = (k.DOWN.isDown || k.S.isDown) - (k.UP.isDown || k.W.isDown);
		if (dx && dy) { dx *= Math.SQRT1_2; dy *= Math.SQRT1_2; }
		const form = FORMS[this.power.form];
		this.bird.x += dx * form.speed * dt;
		this.bird.y += dy * form.speed * dt;
		this.clampBird();

		const key = frameKey(form.sprite, Math.floor(this.clock / 110) % 2);
		this.bird.setTexture(key);
		this.birdShadow.setTexture(key).setPosition(this.bird.x + 26, this.bird.y + 40);
		this.bird.setAlpha(this.clock < this.invulnUntil && Math.floor(this.clock / 80) % 2 ? 0.35 : 1);
	}

	clampBird() {
		const m = TUNING.player.margin;
		// Keep the whole V on screen: each row of wingmen trails 0.8 spacing.
		const rows = Math.ceil(this.flock.length / 2);
		const trail = rows * TUNING.flock.spacing * 0.8;
		this.bird.x = Phaser.Math.Clamp(this.bird.x, m, W - m);
		this.bird.y = Phaser.Math.Clamp(this.bird.y, H * 0.3, H - m - 10 - trail);
	}

	// ---------- ducks and the flock ----------

	updatePower() {
		if (tickPower(this.power, this.clock, TUNING.player.form)) {
			this.sfx.play('powerdown');
			this.floatText(this.bird.x, this.bird.y - 30, 'BACK TO PIGEON', '#9aa3c8');
		}
	}

	collectForm(form) {
		const result = collect(this.power, form, this.clock, TUNING.power);
		const name = FORMS[form].name.toUpperCase();
		const lv = this.power.level;
		if (result === 'swap') {
			this.sfx.play('swap');
			this.floatText(this.bird.x, this.bird.y - 30, `${name}!`, '#f2d544');
		} else {
			this.sfx.play('levelup');
			this.floatText(this.bird.x, this.bird.y - 30, result === 'max' ? `${name} MAX` : `${name} LV${lv}`, '#f2d544');
		}
		this.fxFeathers.explode(10, this.bird.x, this.bird.y);
	}

	cycleEgg(p) {
		if (this.clock < (p.cycleAt ?? 0)) return;
		p.cycleAt = this.clock + TUNING.eggs.cycleCooldownMs;
		const next = EGG_CYCLE[(EGG_CYCLE.indexOf(p.kind) + 1) % EGG_CYCLE.length];
		p.kind = next;
		p.def = PICKUPS[next];
		p.img.setTexture(frameKey(p.def.sprite));
		this.sfx.play('eggcycle');
	}

	addWingman() {
		if (this.flock.length >= TUNING.flock.max) return false;
		const key = frameKey(FORMS[this.power.form].sprite);
		const s = TUNING.flock.scale;
		// Fly in from below the screen to take their slot.
		const m = { x: this.bird.x, y: H + 30 };
		m.img = this.add.image(m.x, m.y, key).setDepth(DEPTH.bird - 1).setScale(s);
		m.shadow = this.add.image(m.x, m.y, key).setDepth(DEPTH.shadow).setTintFill(0x000000).setAlpha(0.2).setScale(s * 0.55);
		this.flock.push(m);
		return true;
	}

	loseWingman(m) {
		this.fxFeathers.explode(16, m.x, m.y);
		this.sfx.play('wingmanDown');
		m.img.destroy();
		m.shadow.destroy();
		this.flock = this.flock.filter(o => o !== m); // the rest close ranks
	}

	updateFlock(dt) {
		if (!this.flock.length) return;
		const f = TUNING.flock;
		const targets = formationTargets(this.bird, this.flock.length, f.spacing);
		const key = frameKey(FORMS[this.power.form].sprite, Math.floor((this.clock + 55) / 110) % 2);
		this.flock.forEach((m, i) => {
			const p = follow(m, targets[i], dt, f.follow);
			m.x = p.x; m.y = p.y;
			m.img.setPosition(m.x, m.y).setTexture(key);
			m.shadow.setPosition(m.x + 18, m.y + 28).setTexture(key);
		});
	}

	// ---------- player weapons ----------

	fire() {
		const k = this.keys;
		const firing = k.Z.isDown || k.J.isDown || k.SPACE.isDown || this.drag || this.mouseFire || this.fireTap;
		if (!firing) return;
		if (this.clock >= this.nextShotAt) {
			this.fireTap = false;
			const w = levelDef(FORMS[this.power.form], this.power.level);
			this.nextShotAt = this.clock + w.cooldownMs;
			w.angles.forEach((deg, i) => this.spawnSplat(this.bird.x + (w.offsets?.[i] ?? 0), this.bird.y - 18, deg, w));
			this.sfx.play('splat');
		}
		// Wingmen fire a plain splat at the pigeon's rate, whatever you are.
		if (this.flock.length && this.clock >= this.nextWingShotAt) {
			const base = FORMS[TUNING.player.form].levels[0];
			const f = TUNING.flock;
			this.nextWingShotAt = this.clock + base.cooldownMs;
			for (const m of this.flock) this.spawnSplat(m.x, m.y - 12, 0, { ...base, damage: f.damage, speed: f.shotSpeed }, 0.8);
		}
	}

	spawnSplat(x, y, deg, w, scale = 1) {
		const rad = Phaser.Math.DegToRad(deg);
		const img = this.add.image(x, y, frameKey(w.sprite)).setDepth(DEPTH.shots).setRotation(rad).setScale(scale);
		this.splats.push({
			img, x, y, r: w.sprite === 'shell' ? 6 : 4,
			vx: Math.sin(rad) * w.speed, vy: -Math.cos(rad) * w.speed,
			damage: w.damage, pierce: w.pierce ?? 0, hit: new Set(),
		});
	}

	updateSplats(dt) {
		const sky = this.enemies.filter(e => e.layer === 'sky' && !e.dead);
		const eggs = this.pickups.filter(p => p.def.form);
		this.splats = this.splats.filter(s => {
			s.x += s.vx * dt;
			s.y += s.vy * dt;
			s.img.setPosition(s.x, s.y);
			for (const e of sky) {
				if (e.dead || s.hit.has(e) || !circlesOverlap(s, e)) continue;
				this.hitEnemy(e, s.damage);
				this.fxPoop.explode(4, s.x, s.y);
				s.hit.add(e);
				if (s.pierce-- > 0) continue;
				s.img.destroy();
				return false;
			}
			// Shooting an egg cycles which duck is inside (1943's POW trick).
			for (const p of eggs) {
				if (!circlesOverlap(s, p)) continue;
				this.cycleEgg(p);
				s.img.destroy();
				return false;
			}
			if (s.y < -20 || s.x < -20 || s.x > W + 20) { s.img.destroy(); return false; }
			return true;
		});
	}

	startBomb() {
		if (this.over || this.bombHeldSince !== null) return;
		this.sfx.unlock();
		this.bombHeldSince = this.clock;
		this.chargedCue = false;
	}

	currentCharge() {
		if (this.bombHeldSince === null) return null;
		return charge(this.clock - this.bombHeldSince, TUNING.bomb);
	}

	releaseBomb() {
		const c = this.currentCharge();
		this.bombHeldSince = null;
		if (!c || this.over) return;
		// Can't afford the full charge? Drop the biggest bomb we can.
		let spend = c;
		if (this.meters.gut < c.cost) {
			const b = TUNING.bomb;
			const t = Math.max(0, (this.meters.gut - b.baseCost) / (b.maxCost - b.baseCost));
			spend = charge(t * b.chargeMs, b);
		}
		if (!trySpend(this.meters, spend.cost)) { this.sfx.play('empty'); return; }
		const target = reticleFor(this.bird, TUNING.bomb);
		const img = this.add.image(this.bird.x, this.bird.y, frameKey('bomb')).setDepth(DEPTH.bomb).setScale(1 + spend.t * 0.6);
		this.bombs.push({ img, from: { x: this.bird.x, y: this.bird.y }, target, start: this.clock, charge: spend });
		this.sfx.play('drop');
	}

	updateBombs() {
		this.bombs = this.bombs.filter(b => {
			const t = bombProgress(this.clock - b.start, TUNING.bomb);
			b.img.setPosition(Phaser.Math.Linear(b.from.x, b.target.x, t), Phaser.Math.Linear(b.from.y, b.target.y, t));
			b.img.setScale((1 + b.charge.t * 0.6) * (1 - 0.5 * t));
			if (t < 1) return true;
			b.img.destroy();
			this.landBomb(b);
			return false;
		});
	}

	landBomb(b) {
		const { radius, t } = b.charge;
		const splat = this.add.image(b.target.x, b.target.y, frameKey('splatter'))
			.setDepth(DEPTH.splatter).setScale((radius * 2) / 48).setRotation(this.rng.range(0, Math.PI * 2));
		this.tweens.add({ targets: splat, alpha: 0, y: splat.y + 60, delay: 400, duration: 1400, onComplete: () => splat.destroy() });
		this.fxPoop.explode(10 + Math.round(t * 14), b.target.x, b.target.y);
		this.sfx.play('impact');

		const low = this.enemies.filter(e => e.layer === 'low' && !e.dead);
		const hits = splashTargets(b.target, radius, low);
		const dmg = bombDamage(t, TUNING.bomb);
		hits.forEach((h, i) => {
			const bullseye = i === 0 && isBullseye(h.dist, radius, TUNING.bomb);
			this.hitEnemy(h.target, dmg, { bullseye });
		});
		if (hits.length) this.cameras.main.shake(80, 0.004 + t * 0.006);
	}

	updateReticle() {
		const g = this.reticle;
		g.clear();
		if (this.over) return;
		const c = this.currentCharge() ?? charge(0, TUNING.bomb);
		if (c.t >= 1 && !this.chargedCue && this.bombHeldSince !== null) { this.chargedCue = true; this.sfx.play('charged'); }
		const { x, y } = reticleFor(this.bird, TUNING.bomb);
		const affordable = this.meters.gut >= TUNING.bomb.baseCost;
		const color = !affordable ? 0x6b7080 : c.t >= 1 ? 0xf2d544 : 0xe8dcc0;
		const alpha = this.bombHeldSince !== null ? 0.9 : 0.45;
		g.lineStyle(2, color, alpha);
		g.strokeCircle(x, y, c.radius);
		g.lineStyle(1, color, alpha);
		g.lineBetween(x - 6, y, x + 6, y);
		g.lineBetween(x, y - 6, x, y + 6);
		if (this.touch && this.bombHeldSince !== null) {
			g.lineStyle(4, color, 0.9);
			g.beginPath();
			g.arc(W - 64, H - 78, 52, -Math.PI / 2, -Math.PI / 2 + c.t * Math.PI * 2);
			g.strokePath();
		}
	}

	// ---------- enemies ----------

	spawnEnemy(s) {
		const def = ENEMIES[s.type];
		const params = {
			...s.params,
			x0: s.x,
			speed: (s.params.speed ?? def.speed) * this.diff.speed,
			width: W,
			height: H,
		};
		const pos = positionAt(s.pattern, 0, params);
		const low = def.layer === 'low';
		const img = this.add.image(pos.x, pos.y, frameKey(def.sprite)).setDepth(low ? DEPTH.low : DEPTH.sky);
		const shadow = this.add.image(pos.x, pos.y, frameKey(def.sprite)).setDepth(DEPTH.shadow).setTintFill(0x000000).setAlpha(0.2);
		const e = {
			def, img, shadow, params, pattern: s.pattern,
			layer: def.layer, age: 0, x: pos.x, y: pos.y,
			hp: Math.ceil(def.hp * this.diff.hp),
			r: def.radius,
			dead: false,
			fireAt: this.clock + (def.fire ? def.fire.everyMs * this.rng.range(0.3, 0.9) : 0),
			escortAt: this.clock + 1500,
		};
		e.maxHp = e.hp;
		if (s.reward) {
			e.squad = `${this.loop}:${s.wave}`;
			enlist(this.squadrons, e.squad, s.waveSize, s.reward);
			img.setTint(0xff9a8a); // marked squadrons glow red, like 1943's
		}
		this.setLayerLook(e);
		this.enemies.push(e);
		if (def.boss) {
			this.boss = e;
			this.banner(`WARNING\n${def.name.toUpperCase()}`, 2600);
			this.sfx.play('boss');
		}
		return e;
	}

	setLayerLook(e) {
		const low = e.layer === 'low';
		const s = low ? TUNING.layers.lowScale : 1;
		e.img.setScale(s);
		if (low) e.img.setTint(TUNING.layers.lowTint);
		else if (e.squad) e.img.setTint(0xff9a8a);
		else e.img.clearTint();
		e.shadow.setScale(s * (low ? 0.85 : 0.55));
		e.shadowOffset = low ? { x: 8, y: 12 } : { x: 26, y: 40 };
		e.r = e.def.radius * s;
	}

	updateEnemies(dt) {
		const margin = TUNING.layers.offscreenMargin;
		for (const e of this.enemies) {
			if (e.dead) continue;
			e.age += dt;
			const pos = positionAt(e.pattern, e.age, e.params);
			e.x = pos.x; e.y = pos.y;
			e.img.setPosition(e.x, e.y);
			e.shadow.setPosition(e.x + e.shadowOffset.x, e.y + e.shadowOffset.y);
			const frames = frameCount(e.def.sprite);
			if (frames > 1) {
				const key = frameKey(e.def.sprite, Math.floor(this.clock / 90) % frames);
				e.img.setTexture(key);
				e.shadow.setTexture(key);
			}

			if (e.def.climbAt !== undefined && e.layer === 'low' && !e.climbing && e.age >= e.def.climbAt) this.climb(e);
			if (!this.over) this.enemyFire(e);
			if (e.def.escorts && !this.over && this.clock >= e.escortAt) this.spawnEscort(e);

			if (e.layer === 'sky' && !this.over) {
				if (this.clock >= this.invulnUntil && circlesOverlap(e, { x: this.bird.x, y: this.bird.y, r: TUNING.player.radius })) {
					this.hurtBird(TUNING.damage.collide);
					this.hitEnemy(e, e.def.boss ? 0 : e.hp, { noScore: true });
				}
				const wing = !e.dead && this.flock.find(m => circlesOverlap(e, { x: m.x, y: m.y, r: TUNING.flock.radius }));
				if (wing) {
					this.loseWingman(wing);
					this.hitEnemy(e, 2);
				}
			}

			if (!e.dead && !e.def.boss && e.age > 1 && isOffscreen(e, W, H, margin)) {
				if (e.squad) recordEscape(this.squadrons, e.squad);
				this.removeEnemy(e);
			}
		}
		this.enemies = this.enemies.filter(e => !e.dead);
	}

	climb(e) {
		e.climbing = true;
		e.img.clearTint();
		this.tweens.add({
			targets: e.img, scale: 1, duration: 500, ease: 'Sine.easeInOut',
			onComplete: () => {
				if (e.dead) return;
				e.climbing = false;
				e.layer = 'sky';
				e.img.setDepth(DEPTH.sky);
				this.setLayerLook(e);
			},
		});
		e.layer = 'climbing'; // untouchable mid-climb
	}

	spawnEscort(boss) {
		const esc = boss.def.escorts;
		boss.escortAt = this.clock + esc.everyMs / this.diff.fire;
		const x = this.rng.range(80, W - 80);
		this.spawnEnemy({ type: esc.type, pattern: esc.pattern, x, params: { ...esc.params, dir: x < W / 2 ? 1 : -1 } });
	}

	enemyFire(e) {
		const f = e.def.fire;
		if (!f || this.clock < e.fireAt || e.layer === 'climbing') return;
		const zone = TUNING.fireZone;
		if (e.y < zone.top || e.y > H * zone.bottom) return;
		e.fireAt = this.clock + (f.everyMs / this.diff.fire) * this.rng.range(0.8, 1.2);
		const aim = Math.atan2(this.bird.y - e.y, this.bird.x - e.x);
		if (f.kind === 'aimed') this.spawnShot(e, aim, f.speed, 'bullet');
		else if (f.kind === 'spread') {
			const step = Phaser.Math.DegToRad(f.spreadDeg) / Math.max(1, f.count - 1);
			for (let i = 0; i < f.count; i++) this.spawnShot(e, aim - (step * (f.count - 1)) / 2 + step * i, f.speed, 'bullet');
		} else if (f.kind === 'flak') this.spawnShot(e, aim, f.speed, 'flak');
		this.sfx.play('enemyShot');
	}

	spawnShot(e, angle, speed, kind) {
		const flak = kind === 'flak';
		const img = this.add.image(e.x, e.y, frameKey(kind)).setDepth(flak ? DEPTH.low + 1 : DEPTH.shots);
		if (flak) img.setScale(0.4).setAlpha(0.7);
		this.shots.push({
			img, kind, x: e.x, y: e.y, age: 0,
			vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
			r: flak ? TUNING.flak.radius : TUNING.enemyShot.radius,
		});
	}

	updateShots(dt) {
		const fl = TUNING.flak;
		const bird = { x: this.bird.x, y: this.bird.y, r: TUNING.player.radius };
		this.shots = this.shots.filter(s => {
			s.age += dt * 1000;
			s.x += s.vx * dt;
			s.y += s.vy * dt;
			s.img.setPosition(s.x, s.y);
			let armed = true;
			if (s.kind === 'flak') {
				const rise = Math.min(1, s.age / fl.riseMs);
				armed = rise >= 1;
				if (armed && !s.armed) { s.armed = true; s.img.setDepth(DEPTH.shots).setAlpha(1); }
				s.img.setScale(0.4 + 0.6 * rise);
				if (s.age > fl.riseMs + fl.armedMs) {
					this.fxBoom.explode(5, s.x, s.y);
					s.img.destroy();
					return false;
				}
			}
			if (armed && !this.over && this.clock >= this.invulnUntil && circlesOverlap(s, bird)) {
				this.hurtBird(s.kind === 'flak' ? TUNING.damage.flak : TUNING.damage.shot);
				s.img.destroy();
				return false;
			}
			// Wingmen take bullets for you.
			const wing = armed && !this.over && this.flock.find(m => circlesOverlap(s, { x: m.x, y: m.y, r: TUNING.flock.radius }));
			if (wing) {
				this.loseWingman(wing);
				s.img.destroy();
				return false;
			}
			if (s.x < -20 || s.x > W + 20 || s.y < -20 || s.y > H + 20) { s.img.destroy(); return false; }
			return true;
		});
	}

	hitEnemy(e, amount, { bullseye = false, noScore = false } = {}) {
		if (e.dead) return;
		e.hp -= amount;
		if (e.hp > 0) {
			e.img.setTintFill(0xffffff);
			this.time.delayedCall(60, () => { if (!e.dead) this.setLayerLook(e); });
			return;
		}
		this.killEnemy(e, { bullseye, noScore });
	}

	killEnemy(e, { bullseye, noScore }) {
		e.dead = true;
		const big = e.def.boss;
		this.fxBoom.explode(big ? 60 : 14, e.x, e.y);
		this.sfx.play(e.def.sfx ?? 'pop');
		if (!noScore) {
			const pts = registerKill(this.score, e.def.score * (1 + this.loop * 0.5), this.clock, TUNING.combo, { bullseye });
			this.floatText(e.x, e.y, bullseye ? `BULLSEYE! ${pts}` : `${pts}`, bullseye ? '#f2d544' : '#f4f4f4');
			if (bullseye) this.sfx.play('bullseye');
			const drop = rollDrop(e.def.drops, this.rng);
			if (drop) this.spawnPickup(drop, e.x, e.y);
		}
		if (e.squad) {
			const reward = recordKill(this.squadrons, e.squad);
			if (reward) {
				this.spawnPickup(reward, e.x, e.y);
				this.floatText(e.x, e.y - 20, 'SQUADRON DOWN!', '#ff9a8a');
				this.sfx.play('squadron');
			}
		}
		if (big) this.bossDown(e);
		this.removeEnemy(e);
	}

	removeEnemy(e) {
		e.dead = true;
		e.img.destroy();
		e.shadow.destroy();
	}

	bossDown(e) {
		this.boss = null;
		this.cameras.main.shake(700, 0.015);
		for (let i = 1; i <= 5; i++) {
			this.time.delayedCall(i * 160, () => this.fxBoom.explode(30, e.x + this.rng.range(-60, 60), e.y + this.rng.range(-80, 80)));
		}
		for (const s of this.shots) s.img.destroy();
		this.shots = [];
		const bonus = 5000 * (this.loop + 1);
		this.score.score += bonus;
		this.banner(`ZEPPELIN DOWN!\nBONUS ${bonus}`, 3000);
		this.intermissionUntil = this.clock + 5000;
		this.pendingLoop = true;
	}

	// ---------- pickups ----------

	spawnPickup(kind, x, y) {
		const def = PICKUPS[kind];
		const img = this.add.image(x, y, frameKey(def.sprite)).setDepth(DEPTH.sky - 1);
		this.tweens.add({ targets: img, scale: { from: 0.6, to: 1.15 }, yoyo: true, repeat: -1, duration: 400 });
		this.pickups.push({ kind, def, img, x, y, r: TUNING.pickup.radius });
	}

	updatePickups(dt) {
		const bird = { x: this.bird.x, y: this.bird.y, r: TUNING.player.radius * 2 };
		this.pickups = this.pickups.filter(p => {
			p.y += (p.def.form ? TUNING.eggs.fall : TUNING.pickup.fall) * dt;
			p.img.setPosition(p.x, p.y);
			if (!this.over && circlesOverlap(p, bird)) {
				feed(this.meters, p.def);
				this.score.score += TUNING.pickup.score;
				if (p.def.form) this.collectForm(p.def.form);
				else if (p.def.wingman) {
					if (this.addWingman()) {
						this.sfx.play('wingman');
						this.floatText(p.x, p.y, `WINGMAN! V${this.flock.length}`, '#9ff0fa');
					} else {
						this.score.score += 1000;
						this.sfx.play('pickup');
						this.floatText(p.x, p.y, 'FULL FLOCK +1000', '#9ff0fa');
					}
				} else {
					this.sfx.play('pickup');
					this.floatText(p.x, p.y, p.def.name.toUpperCase(), '#e8dcc0');
				}
				p.img.destroy();
				return false;
			}
			if (p.y > H + 20) { p.img.destroy(); return false; }
			return true;
		});
	}

	// ---------- the bird gets hurt ----------

	hurtBird(amount) {
		damage(this.meters, amount);
		this.invulnUntil = this.clock + TUNING.player.invulnMs;
		this.fxFeathers.explode(12, this.bird.x, this.bird.y);
		this.cameras.main.shake(120, 0.008);
		this.sfx.play('hurt');
		this.score.combo = 0;
	}

	die() {
		this.over = true;
		this.bombHeldSince = null;
		this.fxFeathers.explode(40, this.bird.x, this.bird.y);
		this.fxBoom.explode(20, this.bird.x, this.bird.y);
		this.bird.setVisible(false);
		this.birdShadow.setVisible(false);
		for (const m of [...this.flock]) this.loseWingman(m);
		this.sfx.play('gameover');
		this.banner('PLUCKED!', 2000);
		this.time.delayedCall(2200, () => {
			this.scene.start('GameOver', { score: Math.round(this.score.score), bestCombo: this.score.bestCombo, loop: this.loop });
		});
	}

	// ---------- HUD / misc ----------

	updateHud() {
		const score = Math.round(this.score.score);
		this.hudScore.setText(`${score}`);
		this.hudHi.setText(`HI ${Math.max(this.hi, score)}`);
		const mult = multiplier(this.score, TUNING.combo);
		this.hudCombo.setText(this.score.combo > 1 ? `${this.score.combo} CHAIN  x${mult}` : '');
		const left = remaining(this.power, this.clock);
		const form = FORMS[this.power.form];
		const flock = this.flock.length ? `  V${this.flock.length}` : '';
		if (left === Infinity) {
			this.hudPower.setText(flock.trim()).setVisible(true);
		} else {
			const stars = '*'.repeat(this.power.level);
			this.hudPower.setText(`${form.name.toUpperCase()} ${stars} ${Math.ceil(left / 1000)}s${flock}`);
			// Blink as the form runs out.
			this.hudPower.setVisible(left > TUNING.power.warnMs || Math.floor(this.clock / 150) % 2 === 0);
		}

		const g = this.hudBars;
		g.clear();
		const bar = (y, frac, color) => {
			g.fillStyle(0x000000, 0.5).fillRect(64, y, 150, 10);
			g.fillStyle(color, 1).fillRect(64, y, 150 * frac, 10);
			g.lineStyle(1, 0xf4f4f4, 0.5).strokeRect(64, y, 150, 10);
		};
		const m = this.meters;
		const e = m.energy / m.energyMax;
		bar(H - 42, e, e < 0.25 && Math.floor(this.clock / 200) % 2 ? 0xffffff : 0xd6463c);
		bar(H - 22, m.gut / m.gutMax, m.gut >= TUNING.bomb.baseCost ? 0x9a6a3b : 0x5a3a1a);
		const c = TUNING.bomb.baseCost / m.gutMax;
		g.lineStyle(1, 0xf2d544, 0.8).lineBetween(64 + 150 * c, H - 24, 64 + 150 * c, H - 10);

		if (this.boss) {
			g.fillStyle(0x000000, 0.5).fillRect(60, 10, W - 120, 8);
			g.fillStyle(TUNING.bossBar.color, 1).fillRect(60, 10, (W - 120) * Math.max(0, this.boss.hp / this.boss.maxHp), 8);
		}
	}

	floatText(x, y, text, color) {
		const t = this.add.text(x, y, text, { fontFamily: FONT, fontSize: fs(this, 11), color, fontStyle: 'bold', stroke: '#1b1b2a', strokeThickness: 3 })
			.setOrigin(0.5).setDepth(DEPTH.hud - 1);
		this.tweens.add({ targets: t, y: y - 36, alpha: 0, duration: 900, onComplete: () => t.destroy() });
	}

	banner(text, ms) {
		this.bannerText.setText(text).setVisible(true).setAlpha(1);
		this.tweens.killTweensOf(this.bannerText);
		this.tweens.add({ targets: this.bannerText, alpha: 0, delay: ms - 400, duration: 400, onComplete: () => this.bannerText.setVisible(false) });
	}

	pause() {
		if (this.over || !this.scene.isActive()) return;
		this.scene.launch('Pause');
		this.scene.pause();
	}

	toggleMute() {
		this.sfx.muted = !this.sfx.muted;
		this.registry.get('store').set('muted', this.sfx.muted);
		this.floatText(W / 2, 80, this.sfx.muted ? 'MUTED' : 'SOUND ON', '#9ff0fa');
	}
}
