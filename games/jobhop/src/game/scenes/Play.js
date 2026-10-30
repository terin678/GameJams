// The Phaser glue. Rules live in ../../core, content in ../../data.
// Drawing that isn't a sprite is in ../fx.js, the HUD in ../hud.js.
import { TUNING } from '../../data/tuning.js';
import { JOBS } from '../../data/jobs.js';
import { ATTACKS, ACTIONS } from '../../data/abilities.js';
import { STATS, PASSIVES } from '../../data/passives.js';
import { ENEMIES } from '../../data/enemies.js';
import { STAGE } from '../../data/stage.js';
import { GEM_TINTS } from '../../data/sprites.js';
import { FX } from '../../data/graphics.js';
import { jobLevels, equippedMods, masteryMods, gainJobXp, liveXp, unlockedJobs, awardJobXp, newlyUnlocked, nodesBetween, describeNode } from '../../core/jobs.js';
import { createLoadout, activeJob, swap, addGauge, spendAction, gaugeCap } from '../../core/loadout.js';
import { deriveStats, passiveMods } from '../../core/stats.js';
import { createLevelState, gainXp, addGem, gemTier } from '../../core/xp.js';
import { cardPool, offerCards, applyCard } from '../../core/levelup.js';
import { createSpawner, dueSpawns, dueEvents, ringPosition, enemyHp } from '../../core/spawner.js';
import { seek, separate, knockback, speedAt } from '../../core/steer.js';
import { createGrid, clearGrid, insert, queryCircle } from '../../core/spatial.js';
import { attackAt, aimAt, inArc, inLine, spreadDirections, turnToward, orbitPositions, nearest } from '../../core/attacks.js';
import { planAction } from '../../core/actions.js';
import { createRun, tickRun, startBoss, endRun, runScore } from '../../core/run.js';
import { progress, easeOutBack, bob, squash } from '../../core/anim.js';
import { createRng } from '../../../../../shared/rng.js';
import { frameKey, frameCount } from '../textures.js';
import { DEPTH, unitDepth, bindKeys } from '../kit.js';
import { ImagePool } from '../pool.js';
import { Fx } from '../fx.js';
import { Hud } from '../hud.js';

const W = TUNING.width, H = TUNING.height;
const RING = Math.hypot(W, H) / 2 + TUNING.spawnMargin;

export class Play extends Phaser.Scene {
	create() {
		this.sfx = this.registry.get('sfx');
		this.store = this.registry.get('store');
		this.quality = this.registry.get('quality');
		this.rng = createRng(Date.now());
		this.savedXp = this.registry.get('jobXp');
		const [a, b] = this.registry.get('picks');
		const cap = id => gaugeCap(ACTIONS[JOBS[id].action].cost, TUNING.gauge.max);
		this.loadout = createLoadout(a, b, { [a]: cap(a), [b]: cap(b) });
		// Jobs level up live as the active job earns XP; it is saved at the end.
		this.levels = jobLevels(this.savedXp, JOBS, TUNING.jobXp);
		this.mastery = masteryMods(this.levels, JOBS);
		this.knownUnlocked = new Set(unlockedJobs(this.savedXp, JOBS, TUNING.jobXp));
		this.actionUsed = false;     // until the first Job Action, the dial nags

		this.run = createRun();
		this.runLevel = createLevelState();
		this.runJobXp = {};
		this.attackLevels = {};
		for (const id of this.loadout.jobs) for (const at of JOBS[id].attacks) this.attackLevels[at] = 1;
		this.passiveLevels = {};
		this.pendingLevelUps = 0;

		this.now = 0;              // play-time ms; stops while paused
		this.freezeUntil = 0;      // hit-stop, in real time
		this.readyAt = {};         // attack id -> ms
		this.orbitAngle = 0;
		this.facing = { x: 1, y: 0 };
		this.invulnUntil = 0;
		this.hideUntil = 0;
		this.hurtUntil = 0;
		this.swappedAt = -Infinity;
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
		this.clones = [];
		this.orbitImgs = [];
		this.grid = createGrid(TUNING.gridCell);
		this.spawner = createSpawner(STAGE);

		this.stats = null;
		this.recomputeStats();
		this.hp = this.stats.maxHp;

		this.ground = this.add.tileSprite(0, 0, W, H, 'ground').setOrigin(0).setScrollFactor(0).setDepth(DEPTH.ground);
		this.pool = new ImagePool(this);
		this.fx = new Fx(this, this.quality, this.pool);
		this.buildPlayer();
		this.buildInput();
		this.hud = new Hud(this);

		this.fx.banner(`${JOBS[a].name.toUpperCase()}  +  ${JOBS[b].name.toUpperCase()}`, 2000);
		this.sfx.play('start');
	}

	// ---------- setup ----------

	buildPlayer() {
		this.player = { x: 0, y: 0, radius: TUNING.player.radius, shadow: null };
		this.playerImg = this.add.image(0, 0, frameKey(this.jobSprite(), 0)).setDepth(DEPTH.unit);
		this.player.foot = this.playerImg.height / 2 - 3;
		this.cameras.main.startFollow(this.playerImg, true);
	}

	buildInput() {
		this.keys = this.input.keyboard.addKeys('UP,DOWN,LEFT,RIGHT,W,A,S,D');
		this.input.keyboard.addCapture('TAB,SPACE,SHIFT');
		const onSwap = () => this.trySwap();
		const onAction = () => this.tryAction();
		const onPause = () => this.pause();
		bindKeys(this, {
			'keydown-TAB': onSwap, 'keydown-SHIFT': onSwap, 'keydown-E': onSwap,
			'keydown-SPACE': onAction, 'keydown-K': onAction,
			'keydown-P': onPause, 'keydown-ESC': onPause, 'keydown-M': () => this.toggleMute(),
		});

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
		const onResume = () => { this.input.keyboard.resetKeys(); this.stick = null; };
		this.events.on(Phaser.Scenes.Events.RESUME, onResume);
		// Phaser reuses emitters across restarts, so remove what we added.
		this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
			this.game.events.off(Phaser.Core.Events.BLUR, onBlur);
			this.events.off(Phaser.Scenes.Events.RESUME, onResume);
			this.input.off('pointerdown', down);
			this.input.off('pointermove', move);
			this.input.off('pointerup', up);
			this.input.off('pointerupoutside', up);
		});
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

	// Freeze the action for a beat so a big kill lands.
	hitStop(ms) {
		this.freezeUntil = Math.max(this.freezeUntil, this.time.now + ms);
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

	update(time, delta) {
		if (this.quality.sample(delta)) this.fx.floatText(`graphics: ${this.quality.label}`, this.player.x, this.player.y - 50, 0x8a93b8);
		if (time < this.freezeUntil) return;
		const ms = Math.min(delta, 50), dt = ms / 1000;
		this.now += ms;              // runs on after the end so effects finish
		if (this.over) { this.drawFrame(dt); return; }
		tickRun(this.run, dt);

		this.spawnTick(ms);
		this.rebuildGrid();          // for separation while enemies move
		this.moveEnemies(dt);
		this.rebuildGrid();          // and again where they ended up, for hits
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
		this.drawFrame(dt);

		if (this.over) return;
		if (this.hp <= 0) { this.finish(false); return; }
		if (this.pendingLevelUps > 0) this.openLevelUp();
	}

	drawFrame(dt) {
		this.fx.draw(this.now, { fields: this.fields, pulses: this.pulses, player: this.player, dash: this.dash });
		this.hud.update(dt);
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
				this.damageEnemy(e, this.dash.damage, p, TUNING.knockback.dash);
			}
			if (Math.random() < 0.6) this.fx.burst(p.x, p.y, 0xa8f0a0, 1, { speed: 0.2, life: 0.7 });
		} else {
			this.dash = null;
			const speed = TUNING.player.speed * this.stats.speed * this.hasteMult();
			p.x += mx * speed * dt;
			p.y += my * speed * dt;
		}
		this.drawPlayer(moving);
	}

	// Walk bounce and lean, a spin on swap, squash when hit, a shadow underfoot.
	drawPlayer(moving) {
		const p = this.player, img = this.playerImg, now = this.now, preset = this.quality.preset;
		const lift = moving && preset.bob ? bob(now, 0, FX.bob.periodMs, FX.bob.player) : 0;
		const hidden = now < this.hideUntil;
		img.setPosition(p.x, p.y - lift - (hidden ? 40 : 0)).setDepth(unitDepth(p.y, p.y));
		if (Math.abs(this.facing.x) > 0.1) img.setFlipX(this.facing.x < 0);
		img.setTexture(frameKey(this.jobSprite(), moving ? Math.floor(now / 140) % 2 : 0));
		img.setRotation(moving ? this.facing.x * 0.08 : 0);
		const sq = squash(now, this.hurtUntil, TUNING.hurtFlashMs, FX.squash.amt);
		const spin = progress(now, this.swappedAt, this.swappedAt + FX.swapSpinMs);
		const turn = spin < 1 ? Math.abs(Math.cos(spin * Math.PI)) : 1;
		const big = hidden ? 1.4 : 1;
		img.setScale(big * sq.x * turn, big * sq.y);
		const blink = now < this.invulnUntil && Math.floor(now / 70) % 2;
		img.setAlpha(hidden ? 0.25 : blink ? 0.45 : 1);
		if (now < this.hurtUntil) img.setTintFill(0xff5050);
		else if (this.haste.until > now) img.setTint(0xffe0a0);
		else img.clearTint();
		this.fx.shadow(p, p.x, p.y + p.foot, hidden ? 30 : 22);
	}

	trySwap() {
		if (this.over || !this.scene.isActive()) return;
		if (!swap(this.loadout, this.now, TUNING.swap, TUNING.gauge.max)) return;
		const to = activeJob(this.loadout);
		this.recomputeStats();
		this.invulnUntil = Math.max(this.invulnUntil, this.now + TUNING.swap.invulnMs);
		this.swappedAt = this.now;
		// The incoming job swings straight away: swapping is an attack.
		for (const id of JOBS[to].attacks) this.readyAt[id] = Math.min(this.readyAt[id] ?? 0, this.now);
		const color = ACTIONS[JOBS[to].action].color;
		this.fx.ring(this.player.x, this.player.y, 44, 0xffffff, 260);
		this.fx.burst(this.player.x, this.player.y, color, FX.burst.swap, { speed: 0.7 });
		this.fx.floatText(JOBS[to].name, this.player.x, this.player.y - 30, 0x9ff0fa);
		this.sfx.play('swap');
		this.hud.onSwap();
	}

	tryAction() {
		if (this.over || !this.scene.isActive()) return;
		const id = activeJob(this.loadout);
		const def = ACTIONS[JOBS[id].action];
		if (!spendAction(this.loadout, def.cost)) { this.sfx.play('empty'); return; }
		this.actionUsed = true;
		this.hud.onActionSpent(id);
		const p = this.player;
		const target = nearest(this.enemies, p.x, p.y, TUNING.player.aimRange);
		const plan = planAction(def, { now: this.now, x: p.x, y: p.y, dir: aimAt(p.x, p.y, target, this.facing), target });
		const { might, area } = this.stats;
		for (const pulse of plan.pulses) this.pulses.push({ ...pulse, born: this.now, radius: pulse.radius * area, damage: pulse.damage * might, color: def.color });
		this.invulnUntil = Math.max(this.invulnUntil, plan.invulnUntil);
		this.hideUntil = Math.max(this.hideUntil, plan.hideUntil);
		if (plan.heal) { this.heal(this.stats.maxHp * plan.heal); this.fx.floatText('+HP', p.x, p.y - 44, 0x6fe07a); }
		if (plan.haste) this.haste = plan.haste;
		if (plan.dash) this.dash = { ...plan.dash, damage: plan.dash.damage * might, hit: new Set() };
		if (plan.field) this.fields.push({ ...plan.field, radius: plan.field.radius * area, damage: plan.field.damage * might, nextTick: this.now, color: def.color });
		if (plan.clones) this.spawnClones(plan.clones);
		this.fx.ring(p.x, p.y, 36, def.color);
		this.fx.burst(p.x, p.y, def.color, FX.burst.swap);
		this.fx.floatText(def.name, p.x, p.y - 30, def.color);
		this.sfx.play('action');
	}

	clearClones() {
		for (const c of this.clones) {
			this.fx.burst(c.x, c.y, 0x8060c0, 6, { speed: 0.5 });
			this.fx.dropShadow(c);
			this.pool.release(c.img);
		}
		this.clones = [];
	}

	spawnClones({ count, until, radius }) {
		this.clearClones();
		this.clones = Array.from({ length: count }, (_, i) => ({
			x: this.player.x, y: this.player.y, radius: 8, until, offset: radius, angle: (Math.PI * 2 * i) / count, shadow: null,
			img: this.pool.get(this.player.x, this.player.y, frameKey(this.jobSprite(), 0), DEPTH.unit).setAlpha(0.55).setTint(0x8060c0),
		}));
	}

	tickClones(dt) {
		if (!this.clones.length) return;
		if (this.now >= this.clones[0].until) { this.clearClones(); return; }
		for (const c of this.clones) {
			c.angle += dt * 1.6;
			c.x = this.player.x + Math.cos(c.angle) * c.offset;
			c.y = this.player.y + Math.sin(c.angle) * c.offset;
			c.img.setPosition(c.x, c.y).setDepth(unitDepth(c.y, this.player.y)).setTexture(frameKey(this.jobSprite(), Math.floor(this.now / 140) % 2));
			this.fx.shadow(c, c.x, c.y + this.player.foot, 18);
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
		this.hurtUntil = this.now + TUNING.hurtFlashMs;
		this.fx.shake('hurt');
		this.fx.hurt();
		this.fx.burst(this.player.x, this.player.y, 0xd6463c, 6, { speed: 0.6 });
		this.hud.onHurt();
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
				this.fx.banner(`${def.name.toUpperCase()} HAS COME`, 2500);
				this.fx.flash(0xd6463c, 0.35);
				this.fx.shake('boss');
				this.sfx.play('boss');
			} else if (def.elite) {
				this.fx.banner(`${ev.count > 1 ? `${ev.count} ` : ''}${def.name.toUpperCase()}${ev.count > 1 ? 'S' : ''}!`, 1600);
				this.sfx.play('elite');
			}
		}
	}

	spawnEnemy(type, at = null) {
		const def = ENEMIES[type];
		const pos = at ?? ringPosition(this.rng, this.player.x, this.player.y, RING + def.radius);
		const hp = enemyHp(def, this.run.t, TUNING.difficulty);
		const img = this.pool.get(pos.x, pos.y, frameKey(def.sprite, 0), DEPTH.unit);
		const e = {
			type, def, x: pos.x, y: pos.y, radius: def.radius, hp, maxHp: hp,
			born: this.now, anim: this.rng.next() * 1000, dead: false, foot: img.height / 2 - 3, shadow: null,
			flashUntil: 0, squashUntil: 0, slowUntil: 0, slowMult: 1, burn: null, orbitNext: 0,
			nextSummon: this.now + (def.summon?.everyMs ?? 0),
			img,
		};
		this.enemies.push(e);
		if (def.boss) this.boss = e;
		return e;
	}

	moveEnemies(dt) {
		const p = this.player, now = this.now, preset = this.quality.preset;
		const targets = this.clones.length ? [p, ...this.clones] : null;
		for (const e of this.enemies) {
			if (e.dead) continue;
			const t = targets ? nearest(targets, e.x, e.y) : p;
			const slow = e.slowUntil > now ? e.slowMult : 1;
			seek(e, t.x, t.y, e.def.speed * speedAt(e.def, now - e.born) * slow, dt);
			separate(e, queryCircle(this.grid, e.x, e.y, e.radius), TUNING.separation);
			if (!e.def.boss && Math.hypot(e.x - p.x, e.y - p.y) > TUNING.despawnDistance) {
				const pos = ringPosition(this.rng, p.x, p.y, RING + e.radius);
				e.x = pos.x;
				e.y = pos.y;
			}

			if (e.def.summon && now >= e.nextSummon) {
				e.nextSummon = now + e.def.summon.everyMs;
				const n = e.def.summon.count;
				for (let i = 0; i < n; i++) {
					const a = (Math.PI * 2 * i) / n;
					const s = this.spawnEnemy(e.def.summon.type, { x: e.x + Math.cos(a) * (e.radius + 30), y: e.y + Math.sin(a) * (e.radius + 30) });
					this.fx.burst(s.x, s.y, e.def.color, 4, { speed: 0.4 });
				}
			}
			this.drawEnemy(e, t, slow, preset);
		}
	}

	// Grow in on spawn, bounce while walking, squash when hit, flash white.
	drawEnemy(e, target, slow, preset) {
		const now = this.now, img = e.img;
		const lift = preset.bob ? bob(now, e.anim, FX.bob.periodMs * 1.4, FX.bob.enemy) : 0;
		img.setPosition(e.x, e.y - lift).setDepth(unitDepth(e.y, this.player.y));
		if (Math.abs(target.x - e.x) > 2) img.setFlipX(target.x < e.x);
		const fc = frameCount(e.def.sprite);
		if (fc > 1) img.setTexture(frameKey(e.def.sprite, Math.floor((now + e.anim) / 160) % fc));
		const grow = easeOutBack(progress(now, e.born, e.born + FX.spawnMs));
		const sq = squash(now, e.squashUntil, FX.squash.ms, FX.squash.amt);
		img.setScale(grow * sq.x, grow * sq.y);
		if (e.flashUntil > now) img.setTintFill(0xffffff);
		else img.setTint(e.burn ? 0xffa060 : slow < 1 ? 0x9fd8ff : 0xffffff);
		this.fx.shadow(e, e.x, e.y + e.foot, e.radius * 2.4 * grow);
	}

	damageEnemy(e, amount, from, knock = 0, quiet = false) {
		if (e.dead || amount <= 0) return;
		e.hp -= amount;
		if (this.stats.lifesteal > 0) this.heal(amount * this.stats.lifesteal);
		if (!quiet) {
			e.flashUntil = this.now + TUNING.hitFlashMs;
			e.squashUntil = this.now + FX.squash.ms;
			this.fx.number(e.x, e.y - e.foot - 4, amount);
			this.playThrottled('hit', 45);
		}
		if (knock && from && !e.def.boss) knockback(e, from.x, from.y, e.def.elite ? knock * 0.25 : knock);
		if (e.hp <= 0) this.killEnemy(e);
	}

	killEnemy(e) {
		e.dead = true;
		this.fx.dropShadow(e);
		this.fx.death(e.img, e.img.scaleX);
		this.run.kills++;
		// Job XP goes only to the job you are playing right now, and levels it on the spot.
		const id = activeJob(this.loadout);
		const { from, to } = gainJobXp(this.savedXp, this.runJobXp, id, e.def.xp * TUNING.jobXp.perEnemyXp, TUNING.jobXp);
		if (to > from) this.jobLevelUp(id, from, to);
		addGauge(this.loadout, TUNING.gauge.perKill, TUNING.gauge.max);
		this.dropGem(e.x, e.y, e.def.xp);
		if (e.def.potion && this.rng.next() < e.def.potion) this.dropPotion(e.x + 10, e.y);
		this.playThrottled('kill', 40);
		if (e.def.boss) {
			this.boss = null;
			this.fx.burst(e.x, e.y, e.def.color, FX.burst.boss, { speed: 2, life: 1.6 });
			this.fx.burst(e.x, e.y, 0xffffff, FX.burst.boss / 2, { speed: 1.4 });
			this.fx.shake('boss');
			this.fx.flash(0xffffff, 0.6);
			this.hitStop(FX.hitStopMs.boss);
			this.finish(true);
		} else if (e.def.elite) {
			this.fx.burst(e.x, e.y, e.def.color, FX.burst.elite, { speed: 1.5, life: 1.3 });
			this.fx.ring(e.x, e.y, e.radius * 2.5, 0xffffff, 400);
			this.fx.shake('elite');
			this.hitStop(FX.hitStopMs.elite);
		} else {
			this.fx.burst(e.x, e.y, e.def.color, FX.burst.kill);
		}
	}

	// A job levelled mid-run: its new nodes (and any mastery) apply right away,
	// and anything it unlocks is announced.
	jobLevelUp(id, from, to) {
		const job = JOBS[id];
		this.levels[id] = to;
		this.mastery = masteryMods(this.levels, JOBS);
		this.recomputeStats({ grow: true });
		const nodes = nodesBetween(job, from, to).map(n => describeNode(STATS, n));
		this.fx.banner(`${job.name.toUpperCase()}  LV ${to}${nodes.length ? `\n${nodes.join('   ')}` : ''}`, 1500, H * 0.22);
		this.fx.pillar(this.player.x, this.player.y + this.player.foot, 0xf2d544);
		this.sfx.play('joblevel');
		const fresh = unlockedJobs(liveXp(this.savedXp, this.runJobXp), JOBS, TUNING.jobXp).filter(j => !this.knownUnlocked.has(j));
		for (const j of fresh) {
			this.knownUnlocked.add(j);
			this.time.delayedCall(700, () => {
				this.fx.banner(`NEW JOB UNLOCKED: ${JOBS[j].name.toUpperCase()}`, 2200, H * 0.36);
				this.sfx.play('unlock');
			});
		}
		this.hud.refresh();
	}

	tickBurns(dt) {
		for (const e of this.enemies) {
			if (!e.burn || e.dead) continue;
			if (this.now > e.burn.until) { e.burn = null; continue; }
			this.damageEnemy(e, e.burn.dps * dt, null, 0, true);
			if (Math.random() < dt * 6) this.fx.burst(e.x, e.y - e.foot, 0xff9040, 1, { speed: 0.2 });
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
			this.fx.swing(o.x, o.y, dir, a.range, a.arcDeg, a.color);
			this.playThrottled('swing', 90);
		} else if (a.shape === 'line') {
			for (const e of queryCircle(this.grid, o.x, o.y, a.length)) {
				if (inLine(o.x, o.y, dir.x, dir.y, a.length, a.width, e.x, e.y, e.radius)) this.damageEnemy(e, a.damage, o, a.knockback);
			}
			this.fx.thrust(o.x, o.y, dir, a.length, a.width, a.color);
			this.playThrottled('swing', 90);
		} else if (a.shape === 'projectile') {
			for (const d of spreadDirections(dir, a.count, a.spreadDeg)) this.spawnShot(a, o, d, target);
		}
	}

	spawnShot(a, o, d, target) {
		const img = this.pool.get(o.x, o.y, frameKey(a.sprite), DEPTH.shot).setRotation(Math.atan2(d.y, d.x) + Math.PI / 2);
		this.shots.push({
			x: o.x, y: o.y, vx: d.x * a.speed, vy: d.y * a.speed, radius: a.radius, damage: a.damage, color: a.color,
			pierce: a.pierce ?? 0, homing: a.homing ?? 0, burn: a.burn ?? null, spin: a.spin ?? 0,
			until: this.now + a.lifeMs, hit: new Set(), target, img, dead: false, trailAt: 0,
		});
	}

	tickShots(dt) {
		for (const s of this.shots) {
			if (s.homing) {
				if (!s.target || s.target.dead || s.hit.has(s.target)) s.target = nearest(this.enemies, s.x, s.y, TUNING.homingRange, e => s.hit.has(e));
				if (s.target) turnToward(s, s.target.x, s.target.y, s.homing, dt);
			}
			s.x += s.vx * dt;
			s.y += s.vy * dt;
			s.img.setPosition(s.x, s.y);
			if (s.spin) s.img.rotation += s.spin * dt;
			else s.img.setRotation(Math.atan2(s.vy, s.vx) + Math.PI / 2);
			if (this.now >= s.trailAt) {
				s.trailAt = this.now + FX.trailEveryMs;
				this.fx.trail(s.x, s.y, s.color);
			}
			for (const e of queryCircle(this.grid, s.x, s.y, s.radius)) {
				if (e.dead || s.hit.has(e)) continue;
				s.hit.add(e);
				this.damageEnemy(e, s.damage, s, TUNING.knockback.shot);
				if (s.burn && !e.dead) e.burn = { dps: s.burn.dps * this.stats.might, until: this.now + s.burn.ms };
				if (s.pierce-- <= 0) { s.dead = true; break; }
			}
			if (this.now > s.until) s.dead = true;
			if (s.dead) {
				this.fx.burst(s.x, s.y, s.color, 3, { speed: 0.5, life: 0.5 });
				this.pool.release(s.img);
			}
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
					this.damageEnemy(e, a.damage, p, TUNING.knockback.orbit);
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
			const big = p.damage > TUNING.bigHit;
			this.fx.blast(p.x, p.y, p.radius, p.color, big);
			if (big) this.sfx.play('boom');
			p.done = true;
		}
		this.pulses = this.pulses.filter(p => !p.done);
	}

	// ---------- pickups ----------

	dropGem(x, y, value) {
		const gem = { x, y, value, pulled: false, img: null, phase: this.rng.next() * 1000 };
		const merged = addGem(this.gems, gem, TUNING.gems.cap);
		if (merged) { merged.img.setTint(GEM_TINTS[gemTier(merged.value)]); return; }
		gem.img = this.pool.get(x, y, frameKey('gem'), DEPTH.gem).setTint(GEM_TINTS[gemTier(value)]);
	}

	dropPotion(x, y) {
		this.potions.push({ x, y, pulled: false, phase: 0, img: this.pool.get(x, y, frameKey('potion'), DEPTH.gem) });
	}

	tickPickups(dt) {
		const p = this.player, now = this.now;
		const reach = TUNING.player.pickupRadius * this.stats.magnet;
		const floaty = this.quality.preset.bob;
		const pull = (list, collect) => {
			for (const g of list) {
				const dx = p.x - g.x, dy = p.y - g.y, d = Math.hypot(dx, dy);
				if (!g.pulled && d < reach) g.pulled = true;
				if (g.pulled && d > 0) {
					const step = Math.min(d, TUNING.player.magnetSpeed * dt);
					g.x += (dx / d) * step;
					g.y += (dy / d) * step;
				}
				// Resting pickups hover; pulled ones stretch toward you.
				const hover = floaty && !g.pulled ? bob(now, g.phase, 600, 3) : 0;
				g.img.setPosition(g.x, g.y - hover).setScale(g.pulled ? 1.25 : 1, g.pulled ? 0.8 : 1);
				if (d < p.radius + TUNING.grabRadius) { g.taken = true; this.pool.release(g.img); collect(g); }
			}
			return list.filter(g => !g.taken);
		};
		this.gems = pull(this.gems, g => {
			const levels = gainXp(this.runLevel, g.value, TUNING.runXp);
			this.pendingLevelUps += levels;
			if (levels) this.hud.onRunLevel();
			this.playThrottled('gem', 50);
		});
		this.potions = pull(this.potions, () => {
			this.heal(this.stats.maxHp * TUNING.gems.potionHeal);
			this.fx.floatText('+HP', p.x, p.y - 30, 0x6fe07a);
			this.fx.burst(p.x, p.y, 0x6fe07a, FX.burst.potion, { speed: 0.6 });
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
		this.fx.ring(this.player.x, this.player.y, 40, 0xf2d544);
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
		this.fx.banner(won ? 'VICTORY' : 'FALLEN', 1400);
		if (!won) {
			// Topple over and grey out.
			this.playerImg.setTintFill(0x6b7080);
			this.tweens.add({ targets: this.playerImg, angle: this.facing.x < 0 ? -90 : 90, y: this.playerImg.y + 6, duration: 500, ease: 'Bounce.easeOut' });
		}
		this.time.delayedCall(1700, () => this.scene.start('GameOver', result));
	}
}
