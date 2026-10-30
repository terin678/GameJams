// The Phaser glue. Rules live in ../../core, content in ../../data.
import { TUNING } from '../../data/tuning.js';
import { JOBS } from '../../data/jobs.js';
import { ATTACKS, ACTIONS } from '../../data/abilities.js';
import { STATS, PASSIVES } from '../../data/passives.js';
import { ENEMIES } from '../../data/enemies.js';
import { STAGE } from '../../data/stage.js';
import { GEM_TINTS } from '../../data/sprites.js';
import { jobLevels, equippedMods, masteryMods, creditJobXp, awardJobXp, newlyUnlocked } from '../../core/jobs.js';
import { createLoadout, activeJob, canSwap, swap, addGauge, spendAction } from '../../core/loadout.js';
import { deriveStats, passiveMods } from '../../core/stats.js';
import { createLevelState, gainXp, xpToNext, addGem, gemTier } from '../../core/xp.js';
import { cardPool, offerCards, applyCard } from '../../core/levelup.js';
import { createSpawner, dueSpawns, dueEvents, ringPosition, enemyHp } from '../../core/spawner.js';
import { seek, separate, knockback, speedAt } from '../../core/steer.js';
import { createGrid, clearGrid, insert, queryCircle } from '../../core/spatial.js';
import { attackAt, aimAt, inArc, inLine, spreadDirections, turnToward, orbitPositions, nearest } from '../../core/attacks.js';
import { planAction } from '../../core/actions.js';
import { createRun, tickRun, startBoss, endRun, formatTime, runScore } from '../../core/run.js';
import { createRng } from '../../../../../shared/rng.js';
import { fs, isTouch } from '../../../../../shared/ui.js';
import { frameKey, frameCount } from '../textures.js';

const W = TUNING.width, H = TUNING.height;
const DEPTH = { ground: 0, field: 2, gem: 5, enemy: 10, boss: 12, clone: 18, player: 20, shot: 25, fx: 30, text: 35, hud: 100 };
const FONT = 'monospace';
const RING = Math.hypot(W, H) / 2 + TUNING.spawnMargin;
const PANEL = { w: 214, h: 54, gap: 10 };

export class Play extends Phaser.Scene {
	create() {
		this.sfx = this.registry.get('sfx');
		this.store = this.registry.get('store');
		this.rng = createRng(Date.now());
		this.savedXp = this.registry.get('jobXp');
		const [a, b] = this.registry.get('picks');
		this.loadout = createLoadout(a, b);
		// Job levels are fixed for the run; XP earned now is banked at the end.
		this.levels = jobLevels(this.savedXp, JOBS, TUNING.jobXp);
		this.mastery = masteryMods(this.levels, JOBS);

		this.run = createRun();
		this.runLevel = createLevelState();
		this.runJobXp = {};
		this.attackLevels = {};
		for (const id of this.loadout.jobs) for (const at of JOBS[id].attacks) this.attackLevels[at] = 1;
		this.passiveLevels = {};
		this.pendingLevelUps = 0;

		this.now = 0;              // play-time ms; stops while paused
		this.readyAt = {};         // attack id -> ms
		this.orbitAngle = 0;
		this.facing = { x: 1, y: 0 };
		this.invulnUntil = 0;
		this.hideUntil = 0;
		this.hurtUntil = 0;
		this.haste = { mult: 1, until: 0 };
		this.dash = null;
		this.boss = null;
		this.over = false;
		this.lastSfx = {};

		this.enemies = [];
		this.shots = [];
		this.gems = [];
		this.potions = [];
		this.fields = [];
		this.pulses = [];
		this.fx = [];
		this.clones = [];
		this.orbitImgs = [];
		this.grid = createGrid(TUNING.gridCell);
		this.spawner = createSpawner(STAGE);

		this.stats = null;
		this.recomputeStats();
		this.hp = this.stats.maxHp;

		this.buildWorld();
		this.buildPlayer();
		this.buildInput();
		this.buildHud();

		this.banner(`${JOBS[a].name.toUpperCase()}  +  ${JOBS[b].name.toUpperCase()}`, 2000);
		this.sfx.play('start');
	}

	// ---------- setup ----------

	buildWorld() {
		this.ground = this.add.tileSprite(0, 0, W, H, 'ground').setOrigin(0).setScrollFactor(0).setDepth(DEPTH.ground);
		this.fieldGfx = this.add.graphics().setDepth(DEPTH.field);
		this.fxGfx = this.add.graphics().setDepth(DEPTH.fx);
	}

	buildPlayer() {
		this.player = { x: 0, y: 0, radius: TUNING.player.radius };
		this.playerImg = this.add.image(0, 0, frameKey(this.jobSprite(), 0)).setDepth(DEPTH.player);
		this.cameras.main.startFollow(this.playerImg, true);
	}

	buildInput() {
		const kb = this.input.keyboard;
		this.keys = kb.addKeys('UP,DOWN,LEFT,RIGHT,W,A,S,D');
		kb.addCapture('TAB,SPACE,SHIFT');
		const onSwap = () => this.trySwap();
		const onAction = () => this.tryAction();
		const onPause = () => this.pause();
		const onMute = () => this.toggleMute();
		const bindings = [
			['keydown-TAB', onSwap], ['keydown-SHIFT', onSwap], ['keydown-E', onSwap],
			['keydown-SPACE', onAction], ['keydown-K', onAction],
			['keydown-P', onPause], ['keydown-ESC', onPause], ['keydown-M', onMute],
		];
		for (const [ev, fn] of bindings) kb.on(ev, fn);

		// Touch: drag anywhere is a floating stick.
		this.stick = null;
		const down = p => { if (!this.stick) this.stick = { id: p.id, ox: p.x, oy: p.y, x: p.x, y: p.y }; };
		const move = p => { if (this.stick?.id === p.id) { this.stick.x = p.x; this.stick.y = p.y; } };
		const up = p => { if (this.stick?.id === p.id) this.stick = null; };
		this.input.on('pointerdown', down);
		this.input.on('pointermove', move);
		this.input.on('pointerup', up);
		this.input.on('pointerupoutside', up);

		const onBlur = () => this.pause();
		this.game.events.on(Phaser.Core.Events.BLUR, onBlur);
		const onResume = () => { kb.resetKeys(); this.stick = null; };
		this.events.on(Phaser.Scenes.Events.RESUME, onResume);
		// Phaser reuses emitters across restarts, so remove what we added.
		this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
			this.game.events.off(Phaser.Core.Events.BLUR, onBlur);
			this.events.off(Phaser.Scenes.Events.RESUME, onResume);
			for (const [ev, fn] of bindings) kb.off(ev, fn);
			this.input.off('pointerdown', down);
			this.input.off('pointermove', move);
			this.input.off('pointerup', up);
			this.input.off('pointerupoutside', up);
		});
	}

	buildHud() {
		const style = (px, color = '#f4f4f4') => ({ fontFamily: FONT, fontSize: fs(this, px), color, fontStyle: 'bold' });
		const hud = o => o.setScrollFactor(0).setDepth(DEPTH.hud);
		this.hudGfx = hud(this.add.graphics());
		this.lvText = hud(this.add.text(12, 16, '', style(14, '#9ff0fa')));
		this.timeText = hud(this.add.text(W / 2, 16, '', style(22)).setOrigin(0.5, 0));
		this.killText = hud(this.add.text(W - 12, 40, '', style(13, '#b8bcc8')).setOrigin(1, 0));
		this.hpText = hud(this.add.text(12 + 100, 44, '', style(10)).setOrigin(0.5, 0));
		this.bossText = hud(this.add.text(W / 2, 50, '', style(12, '#ff8a80')).setOrigin(0.5, 0).setVisible(false));

		const top = H - PANEL.h - 12;
		this.panels = this.loadout.jobs.map((id, i) => {
			const x = 12 + i * (PANEL.w + PANEL.gap);
			const job = JOBS[id];
			const action = ACTIONS[job.action];
			return {
				id, x, y: top,
				icon: hud(this.add.image(x + 22, top + PANEL.h / 2, frameKey(job.sprite, 0))),
				name: hud(this.add.text(x + 44, top + 6, `${job.name}  Lv ${this.levels[id]}`, style(12))),
				act: hud(this.add.text(x + 44, top + 22, `${action.name} (${action.cost})`, style(10, '#b8bcc8'))),
			};
		});
		const hint = isTouch(this) ? '' : 'TAB swap job    SPACE job action    P pause';
		this.hintText = hud(this.add.text(12, top - 18, hint, style(10, '#8a93b8')));

		if (isTouch(this)) this.buildTouchButtons();
		this.refreshPanels();
	}

	buildTouchButtons() {
		const button = (x, y, r, label, color, fn) => {
			const c = this.add.circle(x, y, r, color, 0.35).setStrokeStyle(2, color, 0.9).setScrollFactor(0).setDepth(DEPTH.hud).setInteractive();
			this.add.text(x, y, label, { fontFamily: FONT, fontSize: fs(this, 12), color: '#f4f4f4', fontStyle: 'bold' }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.hud);
			c.on('pointerdown', (_p, _x, _y, e) => { e.stopPropagation(); fn(); });
		};
		button(W - 70, H - 90, 40, 'ACTION', 0xf2d544, () => this.tryAction());
		button(W - 170, H - 60, 30, 'SWAP', 0x9ff0fa, () => this.trySwap());
		this.add.text(W - 12, 12, 'II', { fontFamily: FONT, fontSize: fs(this, 18), color: '#8a93b8', fontStyle: 'bold' })
			.setOrigin(1, 0).setScrollFactor(0).setDepth(DEPTH.hud).setInteractive()
			.on('pointerdown', (_p, _x, _y, e) => { e.stopPropagation(); this.pause(); });
	}

	// ---------- helpers ----------

	jobSprite() {
		return JOBS[activeJob(this.loadout)].sprite;
	}

	hasteMult() {
		return this.now < this.haste.until ? this.haste.mult : 1;
	}

	// grow: max HP rose from a level-up, so the new HP comes filled.
	// Otherwise (a job swap) HP keeps its fraction, so swapping never costs HP.
	recomputeStats({ grow = false } = {}) {
		const id = activeJob(this.loadout);
		const mods = [...equippedMods(JOBS[id], this.levels[id]), ...this.mastery, ...passiveMods(PASSIVES, this.passiveLevels)];
		const prevMax = this.stats?.maxHp;
		this.stats = deriveStats(STATS, mods);
		if (prevMax === undefined) return;
		if (grow) this.hp += Math.max(0, this.stats.maxHp - prevMax);
		else this.hp *= this.stats.maxHp / prevMax;
		this.hp = Math.min(this.hp, this.stats.maxHp);
	}

	heal(amount) {
		this.hp = Math.min(this.stats.maxHp, this.hp + amount);
	}

	playThrottled(key, ms) {
		if (this.now - (this.lastSfx[key] ?? -Infinity) < ms) return;
		this.lastSfx[key] = this.now;
		this.sfx.play(key);
	}

	banner(text, ms) {
		const t = this.add.text(W / 2, H * 0.3, text, {
			fontFamily: FONT, fontSize: fs(this, 26), color: '#f2d544', fontStyle: 'bold', stroke: '#14121c', strokeThickness: 6, align: 'center',
		}).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.hud + 1);
		this.tweens.add({ targets: t, alpha: 0, delay: ms, duration: 400, onComplete: () => t.destroy() });
	}

	floatText(text, x, y, color = 0xf4f4f4) {
		const t = this.add.text(x, y, text, {
			fontFamily: FONT, fontSize: fs(this, 12), color: `#${color.toString(16).padStart(6, '0')}`, fontStyle: 'bold', stroke: '#14121c', strokeThickness: 4,
		}).setOrigin(0.5).setDepth(DEPTH.text);
		this.tweens.add({ targets: t, y: y - 26, alpha: 0, duration: 900, onComplete: () => t.destroy() });
	}

	pause() {
		if (this.over || !this.scene.isActive()) return;
		this.scene.launch('Pause');
		this.scene.pause();
	}

	toggleMute() {
		this.sfx.muted = !this.sfx.muted;
		this.store.set('muted', this.sfx.muted);
	}

	// ---------- the loop ----------

	update(_time, delta) {
		const ms = Math.min(delta, 50), dt = ms / 1000;
		if (this.over) { this.drawFx(); return; }
		this.now += ms;
		tickRun(this.run, dt);

		this.spawnTick(ms);
		this.rebuildGrid();
		this.moveEnemies(dt);
		this.rebuildGrid();
		this.movePlayer(dt);
		this.tickClones(dt);
		this.fireAttacks();
		this.tickOrbits(dt);
		this.tickShots(dt);
		this.tickFields();
		this.tickPulses();
		this.tickBurns(dt);
		this.tickContact();
		this.tickPickups(dt);
		if (this.stats.regen > 0) this.heal(this.stats.regen * dt);
		addGauge(this.loadout, TUNING.gauge.perSecond * dt, TUNING.gauge.max);
		this.enemies = this.enemies.filter(e => !e.dead);

		this.ground.setTilePosition(Math.round(this.player.x - W / 2), Math.round(this.player.y - H / 2));
		this.drawFx();
		this.updateHud();

		if (this.over) return;
		if (this.hp <= 0) { this.finish(false); return; }
		if (this.pendingLevelUps > 0) this.openLevelUp();
	}

	rebuildGrid() {
		clearGrid(this.grid);
		for (const e of this.enemies) if (!e.dead) insert(this.grid, e);
	}

	// ---------- player ----------

	movePlayer(dt) {
		const p = this.player, k = this.keys;
		let mx = 0, my = 0;
		if (k.LEFT.isDown || k.A.isDown) mx -= 1;
		if (k.RIGHT.isDown || k.D.isDown) mx += 1;
		if (k.UP.isDown || k.W.isDown) my -= 1;
		if (k.DOWN.isDown || k.S.isDown) my += 1;
		if (this.stick) {
			const dx = this.stick.x - this.stick.ox, dy = this.stick.y - this.stick.oy, d = Math.hypot(dx, dy);
			if (d > 6) { mx = dx / Math.max(d, 40); my = dy / Math.max(d, 40); }
		}
		const len = Math.hypot(mx, my);
		if (len > 1) { mx /= len; my /= len; }
		const moving = len > 0.1;
		if (moving) {
			const m = Math.hypot(mx, my);
			this.facing = { x: mx / m, y: my / m };
		}

		if (this.dash && this.now < this.dash.until) {
			p.x += this.dash.vx * dt;
			p.y += this.dash.vy * dt;
			for (const e of queryCircle(this.grid, p.x, p.y, this.dash.width / 2)) {
				if (this.dash.hit.has(e)) continue;
				this.dash.hit.add(e);
				this.damageEnemy(e, this.dash.damage, p, 24);
			}
		} else {
			this.dash = null;
			const speed = TUNING.player.speed * this.stats.speed * this.hasteMult();
			p.x += mx * speed * dt;
			p.y += my * speed * dt;
		}

		const img = this.playerImg;
		img.setPosition(p.x, p.y);
		if (Math.abs(this.facing.x) > 0.1) img.setFlipX(this.facing.x < 0);
		img.setTexture(frameKey(this.jobSprite(), moving ? Math.floor(this.now / 140) % 2 : 0));
		const hidden = this.now < this.hideUntil;
		const blink = this.now < this.invulnUntil && Math.floor(this.now / 70) % 2;
		img.setAlpha(hidden ? 0.25 : blink ? 0.45 : 1);
		img.setScale(hidden ? 1.4 : 1);
		if (this.now < this.hurtUntil) img.setTintFill(0xff5050); else img.clearTint();
	}

	trySwap() {
		if (this.over || !this.scene.isActive()) return;
		if (!swap(this.loadout, this.now, TUNING.swap, TUNING.gauge.max)) return;
		const to = activeJob(this.loadout);
		this.recomputeStats();
		this.invulnUntil = Math.max(this.invulnUntil, this.now + TUNING.swap.invulnMs);
		// The incoming job swings straight away: swapping is an attack.
		for (const id of JOBS[to].attacks) this.readyAt[id] = Math.min(this.readyAt[id] ?? 0, this.now);
		this.fx.push({ kind: 'ring', x: this.player.x, y: this.player.y, radius: 44, color: 0xffffff, born: this.now, until: this.now + 260 });
		this.floatText(JOBS[to].name, this.player.x, this.player.y - 30, 0x9ff0fa);
		this.sfx.play('swap');
		this.refreshPanels();
	}

	tryAction() {
		if (this.over || !this.scene.isActive()) return;
		const def = ACTIONS[JOBS[activeJob(this.loadout)].action];
		if (!spendAction(this.loadout, def.cost)) { this.sfx.play('empty'); return; }
		const p = this.player;
		const target = nearest(this.enemies, p.x, p.y, TUNING.player.aimRange);
		const plan = planAction(def, { now: this.now, x: p.x, y: p.y, dir: aimAt(p.x, p.y, target, this.facing), target });
		const { might, area } = this.stats;
		for (const pulse of plan.pulses) this.pulses.push({ ...pulse, radius: pulse.radius * area, damage: pulse.damage * might, color: def.color });
		this.invulnUntil = Math.max(this.invulnUntil, plan.invulnUntil);
		this.hideUntil = Math.max(this.hideUntil, plan.hideUntil);
		if (plan.heal) { this.heal(this.stats.maxHp * plan.heal); this.floatText('+HP', p.x, p.y - 44, 0x6fe07a); }
		if (plan.haste) this.haste = plan.haste;
		if (plan.dash) this.dash = { ...plan.dash, damage: plan.dash.damage * might, hit: new Set() };
		if (plan.field) this.fields.push({ ...plan.field, radius: plan.field.radius * area, damage: plan.field.damage * might, nextTick: this.now, color: def.color });
		if (plan.clones) this.spawnClones(plan.clones);
		this.floatText(def.name, p.x, p.y - 30, def.color);
		this.sfx.play('action');
	}

	spawnClones({ count, until, radius }) {
		for (const c of this.clones) c.img.destroy();
		this.clones = Array.from({ length: count }, (_, i) => ({
			x: this.player.x, y: this.player.y, radius: 8, until, offset: radius, angle: (Math.PI * 2 * i) / count,
			img: this.add.image(this.player.x, this.player.y, frameKey(this.jobSprite(), 0)).setDepth(DEPTH.clone).setAlpha(0.55).setTint(0x8060c0),
		}));
	}

	tickClones(dt) {
		if (!this.clones.length) return;
		if (this.now >= this.clones[0].until) {
			for (const c of this.clones) c.img.destroy();
			this.clones = [];
			return;
		}
		for (const c of this.clones) {
			c.angle += dt * 1.6;
			c.x = this.player.x + Math.cos(c.angle) * c.offset;
			c.y = this.player.y + Math.sin(c.angle) * c.offset;
			c.img.setPosition(c.x, c.y).setTexture(frameKey(this.jobSprite(), Math.floor(this.now / 140) % 2));
		}
	}

	tickContact() {
		if (this.now < this.invulnUntil || this.now < this.hideUntil) return;
		let worst = 0;
		for (const e of queryCircle(this.grid, this.player.x, this.player.y, this.player.radius)) {
			if (!e.dead) worst = Math.max(worst, e.def.damage);
		}
		if (!worst) return;
		const scaled = worst * (1 + TUNING.difficulty.damagePerMinute * this.run.t / 60);
		this.hp -= Math.max(1, scaled - this.stats.armor);
		this.invulnUntil = this.now + TUNING.player.invulnMs;
		this.hurtUntil = this.now + 90;
		this.cameras.main.shake(90, 0.004);
		this.sfx.play('hurt');
	}

	// ---------- enemies ----------

	spawnTick(ms) {
		const alive = {};
		for (const e of this.enemies) alive[e.type] = (alive[e.type] ?? 0) + 1;
		for (const type of dueSpawns(this.spawner, STAGE, this.run.t, ms, alive, this.enemies.length, TUNING.maxEnemies)) this.spawnEnemy(type);
		for (const ev of dueEvents(this.spawner, STAGE, this.run.t)) {
			const def = ENEMIES[ev.type];
			for (let i = 0; i < ev.count; i++) this.spawnEnemy(ev.type);
			if (def.boss) {
				startBoss(this.run);
				this.banner(`${def.name.toUpperCase()} HAS COME`, 2500);
				this.sfx.play('boss');
			} else if (def.elite) {
				this.banner(`${ev.count > 1 ? `${ev.count} ` : ''}${def.name.toUpperCase()}${ev.count > 1 ? 'S' : ''}!`, 1600);
				this.sfx.play('elite');
			}
		}
	}

	spawnEnemy(type, at = null) {
		const def = ENEMIES[type];
		const pos = at ?? ringPosition(this.rng, this.player.x, this.player.y, RING + def.radius);
		const hp = enemyHp(def, this.run.t, TUNING.difficulty);
		const e = {
			type, def, x: pos.x, y: pos.y, radius: def.radius, hp, maxHp: hp,
			born: this.now, anim: this.rng.next() * 1000, dead: false,
			flashUntil: 0, slowUntil: 0, slowMult: 1, burn: null, orbitNext: 0,
			nextSummon: this.now + (def.summon?.everyMs ?? 0),
			img: this.add.image(pos.x, pos.y, frameKey(def.sprite, 0)).setDepth(def.boss ? DEPTH.boss : DEPTH.enemy),
		};
		this.enemies.push(e);
		if (def.boss) this.boss = e;
		return e;
	}

	moveEnemies(dt) {
		const p = this.player;
		const targets = this.clones.length ? [p, ...this.clones] : null;
		for (const e of this.enemies) {
			if (e.dead) continue;
			const t = targets ? nearest(targets, e.x, e.y) : p;
			const slow = e.slowUntil > this.now ? e.slowMult : 1;
			seek(e, t.x, t.y, e.def.speed * speedAt(e.def, this.now - e.born) * slow, dt);
			separate(e, queryCircle(this.grid, e.x, e.y, e.radius), TUNING.separation);
			if (!e.def.boss && Math.hypot(e.x - p.x, e.y - p.y) > TUNING.despawnDistance) {
				const pos = ringPosition(this.rng, p.x, p.y, RING + e.radius);
				e.x = pos.x;
				e.y = pos.y;
			}
			const img = e.img;
			img.setPosition(e.x, e.y);
			if (Math.abs(t.x - e.x) > 2) img.setFlipX(t.x < e.x);
			const fc = frameCount(e.def.sprite);
			if (fc > 1) img.setTexture(frameKey(e.def.sprite, Math.floor((this.now + e.anim) / 160) % fc));
			if (e.flashUntil > this.now) continue;
			img.setTint(e.burn ? 0xffa060 : slow < 1 ? 0x9fd8ff : 0xffffff);

			if (e.def.summon && this.now >= e.nextSummon) {
				e.nextSummon = this.now + e.def.summon.everyMs;
				const n = e.def.summon.count;
				for (let i = 0; i < n; i++) {
					const a = (Math.PI * 2 * i) / n;
					this.spawnEnemy(e.def.summon.type, { x: e.x + Math.cos(a) * (e.radius + 30), y: e.y + Math.sin(a) * (e.radius + 30) });
				}
			}
		}
	}

	damageEnemy(e, amount, from, knock = 0, quiet = false) {
		if (e.dead || amount <= 0) return;
		e.hp -= amount;
		if (this.stats.lifesteal > 0) this.heal(amount * this.stats.lifesteal);
		if (!quiet) {
			e.img.setTintFill(0xffffff);
			e.flashUntil = this.now + TUNING.hitFlashMs;
			this.playThrottled('hit', 45);
		}
		if (knock && from && !e.def.boss) knockback(e, from.x, from.y, e.def.elite ? knock * 0.25 : knock);
		if (e.hp <= 0) this.killEnemy(e);
	}

	killEnemy(e) {
		e.dead = true;
		e.img.destroy();
		this.run.kills++;
		// Job XP goes only to the job you are playing right now.
		creditJobXp(this.runJobXp, activeJob(this.loadout), e.def.xp * TUNING.jobXp.perEnemyXp);
		addGauge(this.loadout, TUNING.gauge.perKill, TUNING.gauge.max);
		this.dropGem(e.x, e.y, e.def.xp);
		if (e.def.potion && this.rng.next() < e.def.potion) this.dropPotion(e.x + 10, e.y);
		this.fx.push({ kind: 'pop', x: e.x, y: e.y, radius: e.radius, color: 0xffffff, born: this.now, until: this.now + 200 });
		this.playThrottled('kill', 40);
		if (e.def.boss) {
			this.boss = null;
			this.cameras.main.shake(400, 0.01);
			this.finish(true);
		}
	}

	tickBurns(dt) {
		for (const e of this.enemies) {
			if (!e.burn || e.dead) continue;
			if (this.now > e.burn.until) { e.burn = null; continue; }
			this.damageEnemy(e, e.burn.dps * dt, null, 0, true);
		}
	}

	// ---------- attacks ----------

	fireAttacks() {
		const job = JOBS[activeJob(this.loadout)];
		for (const id of job.attacks) {
			const def = ATTACKS[id];
			if (def.shape === 'orbit' || this.now < (this.readyAt[id] ?? 0)) continue;
			const a = attackAt(def, this.attackLevels[id] ?? 1, this.stats);
			this.readyAt[id] = this.now + a.cooldownMs / this.hasteMult();
			this.performAttack(a, this.player);
			for (const c of this.clones) this.performAttack(a, c);
		}
	}

	performAttack(a, o) {
		const target = nearest(this.enemies, o.x, o.y, TUNING.player.aimRange);
		const dir = aimAt(o.x, o.y, target, this.facing);
		if (a.shape === 'arc') {
			for (const e of queryCircle(this.grid, o.x, o.y, a.range)) {
				if (inArc(o.x, o.y, dir.x, dir.y, a.range, a.arcDeg, e.x, e.y, e.radius)) this.damageEnemy(e, a.damage, o, a.knockback);
			}
			this.fx.push({ kind: 'arc', x: o.x, y: o.y, dir, range: a.range, arcDeg: a.arcDeg, color: a.color, born: this.now, until: this.now + TUNING.fxMs });
			this.playThrottled('swing', 90);
		} else if (a.shape === 'line') {
			for (const e of queryCircle(this.grid, o.x, o.y, a.length)) {
				if (inLine(o.x, o.y, dir.x, dir.y, a.length, a.width, e.x, e.y, e.radius)) this.damageEnemy(e, a.damage, o, a.knockback);
			}
			this.fx.push({ kind: 'line', x: o.x, y: o.y, dir, length: a.length, width: a.width, color: a.color, born: this.now, until: this.now + TUNING.fxMs });
			this.playThrottled('swing', 90);
		} else if (a.shape === 'projectile') {
			for (const d of spreadDirections(dir, a.count, a.spreadDeg)) this.spawnShot(a, o, d, target);
		}
	}

	spawnShot(a, o, d, target) {
		const img = this.add.image(o.x, o.y, frameKey(a.sprite)).setDepth(DEPTH.shot).setRotation(Math.atan2(d.y, d.x) + Math.PI / 2);
		this.shots.push({
			x: o.x, y: o.y, vx: d.x * a.speed, vy: d.y * a.speed, radius: a.radius, damage: a.damage,
			pierce: a.pierce ?? 0, homing: a.homing ?? 0, burn: a.burn ?? null, spin: a.spin ?? 0,
			until: this.now + a.lifeMs, hit: new Set(), target, img, dead: false,
		});
	}

	tickShots(dt) {
		for (const s of this.shots) {
			if (s.homing) {
				if (!s.target || s.target.dead || s.hit.has(s.target)) s.target = nearest(this.enemies.filter(e => !s.hit.has(e)), s.x, s.y, 300);
				if (s.target) turnToward(s, s.target.x, s.target.y, s.homing, dt);
			}
			s.x += s.vx * dt;
			s.y += s.vy * dt;
			s.img.setPosition(s.x, s.y);
			if (s.spin) s.img.rotation += s.spin * dt;
			else s.img.setRotation(Math.atan2(s.vy, s.vx) + Math.PI / 2);
			for (const e of queryCircle(this.grid, s.x, s.y, s.radius)) {
				if (e.dead || s.hit.has(e)) continue;
				s.hit.add(e);
				this.damageEnemy(e, s.damage, s, 4);
				if (s.burn && !e.dead) e.burn = { dps: s.burn.dps * this.stats.might, until: this.now + s.burn.ms };
				if (s.pierce-- <= 0) { s.dead = true; break; }
			}
			if (this.now > s.until) s.dead = true;
			if (s.dead) s.img.destroy();
		}
		this.shots = this.shots.filter(s => !s.dead);
	}

	tickOrbits(dt) {
		const p = this.player;
		let used = 0;
		for (const id of JOBS[activeJob(this.loadout)].attacks) {
			const def = ATTACKS[id];
			if (def.shape !== 'orbit') continue;
			const a = attackAt(def, this.attackLevels[id] ?? 1, this.stats);
			this.orbitAngle += a.spin * dt * this.hasteMult();
			for (const pos of orbitPositions(p.x, p.y, a.count, a.orbit, this.orbitAngle)) {
				if (!this.orbitImgs[used]) this.orbitImgs[used] = this.add.image(0, 0, frameKey(def.sprite)).setDepth(DEPTH.shot);
				this.orbitImgs[used++].setVisible(true).setPosition(pos.x, pos.y).setRotation(pos.a + Math.PI);
				for (const e of queryCircle(this.grid, pos.x, pos.y, a.hitRadius)) {
					if (e.dead || e.orbitNext > this.now) continue;
					e.orbitNext = this.now + a.hitEveryMs;
					this.damageEnemy(e, a.damage, p, 6);
				}
			}
		}
		for (let i = used; i < this.orbitImgs.length; i++) this.orbitImgs[i].setVisible(false);
	}

	tickFields() {
		for (const f of this.fields) {
			if (f.follow) { f.x = this.player.x; f.y = this.player.y; }
			if (this.now < f.nextTick) continue;
			f.nextTick = this.now + f.tickMs;
			for (const e of queryCircle(this.grid, f.x, f.y, f.radius)) {
				if (f.slow) { e.slowUntil = this.now + f.tickMs + 100; e.slowMult = 1 - f.slow; }
				if (f.damage) this.damageEnemy(e, f.damage, null, 0);
			}
			if (f.heal) this.heal(f.heal);
		}
		this.fields = this.fields.filter(f => this.now < f.until);
	}

	tickPulses() {
		for (const p of this.pulses) {
			if (this.now < p.at) continue;
			if (p.follow) { p.x = this.player.x; p.y = this.player.y; }
			for (const e of queryCircle(this.grid, p.x, p.y, p.radius)) this.damageEnemy(e, p.damage, p, p.knockback);
			this.fx.push({ kind: 'blast', x: p.x, y: p.y, radius: p.radius, color: p.color, born: this.now, until: this.now + 300 });
			if (p.damage > 50) { this.cameras.main.shake(160, 0.006); this.sfx.play('boom'); }
			p.done = true;
		}
		this.pulses = this.pulses.filter(p => !p.done);
	}

	// ---------- pickups ----------

	dropGem(x, y, value) {
		const gem = { x, y, value, pulled: false, img: null };
		const merged = addGem(this.gems, gem, TUNING.gems.cap);
		if (merged) { merged.img.setTint(GEM_TINTS[gemTier(merged.value)]); return; }
		gem.img = this.add.image(x, y, frameKey('gem')).setDepth(DEPTH.gem).setTint(GEM_TINTS[gemTier(value)]);
	}

	dropPotion(x, y) {
		this.potions.push({ x, y, pulled: false, img: this.add.image(x, y, frameKey('potion')).setDepth(DEPTH.gem) });
	}

	tickPickups(dt) {
		const p = this.player;
		const reach = TUNING.player.pickupRadius * this.stats.magnet;
		const pull = (list, collect) => {
			for (const g of list) {
				const dx = p.x - g.x, dy = p.y - g.y, d = Math.hypot(dx, dy);
				if (!g.pulled && d < reach) g.pulled = true;
				if (g.pulled && d > 0) {
					const step = Math.min(d, TUNING.player.magnetSpeed * dt);
					g.x += (dx / d) * step;
					g.y += (dy / d) * step;
					g.img.setPosition(g.x, g.y);
				}
				if (d < p.radius + 8) { g.taken = true; g.img.destroy(); collect(g); }
			}
			return list.filter(g => !g.taken);
		};
		this.gems = pull(this.gems, g => {
			const levels = gainXp(this.runLevel, g.value, TUNING.runXp);
			this.pendingLevelUps += levels;
			this.playThrottled('gem', 50);
		});
		this.potions = pull(this.potions, () => {
			this.heal(this.stats.maxHp * TUNING.gems.potionHeal);
			this.floatText('+HP', p.x, p.y - 30, 0x6fe07a);
			this.sfx.play('potion');
		});
	}

	// ---------- level-ups ----------

	openLevelUp() {
		const pool = cardPool({
			jobs: this.loadout.jobs, JOBS, PASSIVES,
			attackLevels: this.attackLevels, passiveLevels: this.passiveLevels, attackMax: TUNING.attackMaxLevel,
		});
		const cards = offerCards(this.rng, pool, TUNING.cards);
		this.sfx.play('levelup');
		this.scene.launch('LevelUp', { cards, level: this.runLevel.level - this.pendingLevelUps + 1, active: activeJob(this.loadout) });
		this.scene.pause();
	}

	// Called by the LevelUp scene.
	chooseCard(card) {
		applyCard(card, this.attackLevels, this.passiveLevels);
		if (card.kind === 'heal') this.heal(this.stats.maxHp * TUNING.gems.potionHeal);
		if (card.kind === 'passive') this.recomputeStats({ grow: true });
		this.pendingLevelUps = Math.max(0, this.pendingLevelUps - 1);
	}

	// ---------- the end ----------

	finish(won, { immediate = false } = {}) {
		if (this.over) return;
		this.over = true;
		endRun(this.run, won);
		const before = this.savedXp;
		const after = awardJobXp(before, this.runJobXp, TUNING.jobXp);
		this.store.set('jobXp', after);
		this.registry.set('jobXp', after);
		const score = runScore(this.run, TUNING.winBonus);
		const scores = this.registry.get('scores');
		const rank = scores.qualifies(score) ? scores.add(JOBS[this.loadout.jobs[0]].abbr, score).rank : -1;
		const result = {
			won, score, rank,
			time: this.run.t, kills: this.run.kills, level: this.runLevel.level,
			picks: [...this.loadout.jobs], before, after, runJobXp: { ...this.runJobXp },
			unlocked: newlyUnlocked(before, after, JOBS, TUNING.jobXp),
		};
		if (immediate) { this.scene.start('GameOver', result); return; }
		this.sfx.play(won ? 'win' : 'gameover');
		this.banner(won ? 'VICTORY' : 'FALLEN', 1400);
		if (!won) this.playerImg.setTintFill(0x6b7080);
		this.time.delayedCall(1700, () => this.scene.start('GameOver', result));
	}

	// ---------- drawing ----------

	drawFx() {
		const g = this.fxGfx, fg = this.fieldGfx;
		g.clear();
		fg.clear();
		for (const f of this.fields) {
			fg.fillStyle(f.color, 0.14).fillCircle(f.x, f.y, f.radius);
			fg.lineStyle(2, f.color, 0.55).strokeCircle(f.x, f.y, f.radius);
		}
		// Telegraph delayed pulses (Jump, Meteor).
		for (const p of this.pulses) {
			const x = p.follow ? this.player.x : p.x, y = p.follow ? this.player.y : p.y;
			const blink = Math.floor(this.now / 90) % 2 ? 0.7 : 0.35;
			g.lineStyle(2, p.color, blink).strokeCircle(x, y, p.radius);
		}
		this.fx = this.fx.filter(f => f.until > this.now);
		for (const f of this.fx) {
			const k = (f.until - this.now) / (f.until - f.born);
			if (f.kind === 'arc') {
				const ang = Math.atan2(f.dir.y, f.dir.x), half = (f.arcDeg / 2) * Math.PI / 180;
				g.fillStyle(f.color, 0.45 * k);
				g.beginPath();
				g.moveTo(f.x, f.y);
				g.arc(f.x, f.y, f.range, ang - half, ang + half, false);
				g.closePath();
				g.fillPath();
			} else if (f.kind === 'line') {
				const { x, y, dir, length, width } = f;
				const nx = -dir.y * width / 2, ny = dir.x * width / 2;
				g.fillStyle(f.color, 0.5 * k);
				g.fillPoints([
					{ x: x + nx, y: y + ny }, { x: x + dir.x * length + nx, y: y + dir.y * length + ny },
					{ x: x + dir.x * length - nx, y: y + dir.y * length - ny }, { x: x - nx, y: y - ny },
				], true);
			} else if (f.kind === 'ring') {
				g.lineStyle(3, f.color, k).strokeCircle(f.x, f.y, f.radius * (1.2 - 0.4 * k));
			} else if (f.kind === 'blast') {
				g.fillStyle(f.color, 0.35 * k).fillCircle(f.x, f.y, f.radius);
				g.lineStyle(3, f.color, k).strokeCircle(f.x, f.y, f.radius);
			} else if (f.kind === 'pop') {
				g.fillStyle(f.color, 0.6 * k).fillCircle(f.x, f.y, f.radius * (1.6 - 0.6 * k));
			}
		}
		if (this.dash) g.fillStyle(0xffffff, 0.3).fillCircle(this.player.x, this.player.y, this.dash.width / 2);
	}

	refreshPanels() {
		this.panels.forEach((pn, i) => {
			const active = i === this.loadout.active;
			pn.icon.setAlpha(active ? 1 : 0.5);
			pn.name.setAlpha(active ? 1 : 0.55);
			pn.act.setAlpha(active ? 1 : 0.55);
		});
	}

	updateHud() {
		const h = this.hudGfx;
		h.clear();
		const bar = (x, y, w, ht, frac, color) => {
			h.fillStyle(0x0b0a10, 0.85).fillRect(x, y, w, ht);
			h.fillStyle(color, 1).fillRect(x + 1, y + 1, Math.max(0, (w - 2) * Math.min(1, frac)), ht - 2);
		};

		const need = xpToNext(this.runLevel.level, TUNING.runXp);
		bar(0, 0, W, 10, this.runLevel.xp / need, 0x4d8fe0);
		this.lvText.setText(`LV ${this.runLevel.level}`);
		this.timeText.setText(formatTime(this.run.t)).setColor(this.run.phase === 'boss' ? '#ff8a80' : '#f4f4f4');
		this.killText.setText(`KO ${this.run.kills}`);
		bar(12, 40, 200, 14, this.hp / this.stats.maxHp, 0xd6463c);
		this.hpText.setText(`${Math.max(0, Math.ceil(this.hp))} / ${Math.round(this.stats.maxHp)}`);

		const boss = this.boss && !this.boss.dead ? this.boss : null;
		this.bossText.setVisible(!!boss);
		if (boss) {
			this.bossText.setText(boss.def.name.toUpperCase());
			bar(W / 2 - 200, 68, 400, 10, boss.hp / boss.maxHp, 0xb0302a);
		}

		this.panels.forEach((pn, i) => {
			const active = i === this.loadout.active;
			const action = ACTIONS[JOBS[pn.id].action];
			h.fillStyle(0x14121c, active ? 0.85 : 0.6).fillRect(pn.x, pn.y, PANEL.w, PANEL.h);
			h.lineStyle(2, active ? 0xf2d544 : 0x2c3550, 1).strokeRect(pn.x, pn.y, PANEL.w, PANEL.h);
			const g = this.loadout.gauge[pn.id];
			bar(pn.x + 44, pn.y + 38, PANEL.w - 54, 9, g / TUNING.gauge.max, g >= action.cost ? 0xf2d544 : 0x8a93b8);
			if (!active && !canSwap(this.loadout, this.now)) {
				const left = (this.loadout.swapReadyAt - this.now) / TUNING.swap.cooldownMs;
				h.fillStyle(0x000000, 0.45).fillRect(pn.x, pn.y, PANEL.w * left, PANEL.h);
			}
		});
	}
}
