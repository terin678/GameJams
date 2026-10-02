// The Phaser glue. Rules live in ../../core, content in ../../data.
import { TUNING } from '../../data/tuning.js';
import { MAZE } from '../../data/maze.js';
import { OBSERVERS } from '../../data/observers.js';
import { POWERS } from '../../data/powers.js';
import { parseMaze, key, walkable, isWall, isDoor, isPen } from '../../core/maze.js';
import { DIRS, opposite, mirrorDir, createMover, step, position } from '../../core/move.js';
import { chooseDir, targetFor, nearest, modeAt } from '../../core/chase.js';
import { createPowers, activate, isActive, remaining, splitOff, collapseTo, observe, nextItem, eatChainScore } from '../../core/quantum.js';
import { createRng } from '../../../../../shared/rng.js';
import { fs, isTouch } from '../../../../../shared/ui.js';
import { frameKey } from '../textures.js';

const W = TUNING.width, H = TUNING.height;
const M = parseMaze(MAZE);
const T = TUNING.tile;
const OX = (W - M.cols * T) / 2, OY = TUNING.mazeTop;
const px = x => OX + (x + 0.5) * T;
const py = y => OY + (y + 0.5) * T;
const FONT = 'monospace';
const DEPTH = { walls: 1, dots: 2, items: 3, observers: 10, cats: 20, hud: 100 };
const KEYMAP = {
	ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
	ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
};
const COLORS = { wall: 0x4d6fe0, wallFill: 0x121833, door: 0xff7ad1, quantum: 0x9ff0fa, twin: 0xff9ad8, tunnel: 0x7ad7ff };

export class Play extends Phaser.Scene {
	create() {
		this.sfx = this.registry.get('sfx');
		this.scores = this.registry.get('scores');
		this.rng = createRng(Date.now());
		this.clock = 0;
		this.level = 1;
		this.score = 0;
		this.lives = TUNING.lives;
		this.nextLifeAt = TUNING.extraLifeAt;
		this.hi = this.scores.best();
		this.over = false;

		this.drawWalls();
		this.dotsGfx = this.add.graphics().setDepth(DEPTH.dots);
		this.fxGfx = this.add.graphics().setDepth(DEPTH.cats - 1);
		this.buildHud();
		this.buildInput();
		this.startLevel();
		this.sfx.play('start');
	}

	// ---------- setup ----------

	drawWalls() {
		const g = this.add.graphics().setDepth(DEPTH.walls);
		g.fillStyle(0x161c34, 0.5);
		for (let c = 0; c <= M.cols; c++) g.fillRect(OX + c * T, OY, 1, M.rows * T); // faint lab grid
		for (let r = 0; r <= M.rows; r++) g.fillRect(OX, OY + r * T, M.cols * T, 1);
		for (let r = 0; r < M.rows; r++) {
			for (let c = 0; c < M.cols; c++) {
				const x = OX + c * T, y = OY + r * T;
				if (isDoor(M, c, r)) {
					g.fillStyle(COLORS.door, 1).fillRect(x, y + T / 2 - 2, T, 4);
					continue;
				}
				if (!isWall(M, c, r)) continue;
				g.fillStyle(COLORS.wallFill, 1).fillRect(x, y, T, T);
				// Neon edges wherever a wall meets open floor.
				g.lineStyle(2, COLORS.wall, 1);
				const open = (dc, dr) => {
					const cc = c + dc, rr = r + dr;
					return cc >= 0 && cc < M.cols && rr >= 0 && rr < M.rows && !isWall(M, cc, rr);
				};
				if (open(0, -1)) g.lineBetween(x, y + 1, x + T, y + 1);
				if (open(0, 1)) g.lineBetween(x, y + T - 1, x + T, y + T - 1);
				if (open(-1, 0)) g.lineBetween(x + 1, y, x + 1, y + T);
				if (open(1, 0)) g.lineBetween(x + T - 1, y, x + T - 1, y + T);
			}
		}
	}

	buildHud() {
		const style = (px, color = '#f4f4f4') => ({ fontFamily: FONT, fontSize: fs(this, px), color, fontStyle: 'bold' });
		this.hudScore = this.add.text(12, 30, '', style(16)).setDepth(DEPTH.hud);
		this.hudLevel = this.add.text(W / 2, 30, '', style(12, '#9ff0fa')).setOrigin(0.5, 0).setDepth(DEPTH.hud);
		this.hudHi = this.add.text(W - 12, 30, '', style(12, '#f2d544')).setOrigin(1, 0).setDepth(DEPTH.hud);
		this.hudPowers = this.add.text(W - 12, H - 30, '', { ...style(11), align: 'right' }).setOrigin(1, 0.5).setDepth(DEPTH.hud);
		this.lifeIcons = [];
		this.banner = this.add.text(W / 2, py(M.spawn.row), '', { ...style(20, '#f2d544'), stroke: '#0c0f1a', strokeThickness: 6, align: 'center' })
			.setOrigin(0.5).setDepth(DEPTH.hud).setVisible(false);
	}

	buildInput() {
		const kb = this.input.keyboard;
		const onKey = e => {
			const d = KEYMAP[e.code];
			if (d) { this.want = DIRS[d]; e.preventDefault?.(); }
		};
		const onPause = () => this.pause();
		const onMute = () => this.toggleMute();
		kb.on('keydown', onKey);
		kb.on('keydown-P', onPause);
		kb.on('keydown-ESC', onPause);
		kb.on('keydown-M', onMute);
		kb.addCapture('UP,DOWN,LEFT,RIGHT,SPACE');
		const onBlur = () => this.pause();
		this.game.events.on(Phaser.Core.Events.BLUR, onBlur);

		// Touch: swipe anywhere to turn.
		this.swipe = null;
		const onDown = p => { this.sfx.unlock(); this.swipe = { x: p.x, y: p.y }; };
		const onMove = p => {
			if (!this.swipe || !p.isDown) return;
			const dx = p.x - this.swipe.x, dy = p.y - this.swipe.y;
			if (Math.hypot(dx, dy) < 18) return;
			this.want = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? DIRS.right : DIRS.left) : (dy > 0 ? DIRS.down : DIRS.up);
			this.swipe = { x: p.x, y: p.y };
		};
		const onUp = () => { this.swipe = null; };
		this.input.on('pointerdown', onDown);
		this.input.on('pointermove', onMove);
		this.input.on('pointerup', onUp);

		this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
			kb.off('keydown', onKey);
			kb.off('keydown-P', onPause);
			kb.off('keydown-ESC', onPause);
			kb.off('keydown-M', onMute);
			this.game.events.off(Phaser.Core.Events.BLUR, onBlur);
			this.input.off('pointerdown', onDown);
			this.input.off('pointermove', onMove);
			this.input.off('pointerup', onUp);
		});
	}

	// ---------- levels and lives ----------

	startLevel() {
		this.dots = new Set(M.dots.map(d => key(M, d.col, d.row)));
		this.pellets?.forEach(p => p.img.destroy());
		this.pellets = new Map(M.pellets.map(p => {
			const img = this.add.image(px(p.col), py(p.row), frameKey('pellet')).setDepth(DEPTH.items);
			this.tweens.add({ targets: img, scale: { from: 0.8, to: 1.3 }, yoyo: true, repeat: -1, duration: 350 });
			return [key(M, p.col, p.row), { img }];
		}));
		this.eaten = 0;
		this.itemState = { spawned: 0 };
		this.dotsDirty = true;
		this.clearing = false;
		this.resetActors();
	}

	resetActors() {
		this.cats?.forEach(c => c.img.destroy());
		this.observers?.forEach(o => { o.img.destroy(); o.pupil.destroy(); });
		this.item?.img.destroy();
		this.item = null;
		this.powers = createPowers();
		this.want = DIRS.left;
		this.cats = [this.makeCat(createMover(M.start.col, M.start.row, DIRS.left))];
		this.modeClock = 0;
		this.lastMode = modeAt(0, TUNING.schedule);
		this.eatChain = 0;
		const penCells = M.pen.slice().sort((a, b) => Math.abs(a.col - M.door.col) - Math.abs(b.col - M.door.col));
		let penIdx = 0;
		this.observers = OBSERVERS.map(def => {
			const outside = def.start === 'door';
			const cell = outside ? { col: M.door.col, row: M.door.row - 1 } : penCells[penIdx++ % penCells.length];
			const o = {
				def,
				m: createMover(cell.col, cell.row, outside ? DIRS.left : DIRS.up),
				mode: outside ? 'active' : 'pen',
				releaseAt: this.clock + TUNING.readyMs + def.releaseMs,
			};
			o.img = this.add.image(0, 0, `eye_${def.id}`).setDepth(DEPTH.observers);
			o.pupil = this.add.image(0, 0, frameKey('pupil')).setDepth(DEPTH.observers + 1);
			return o;
		});
		this.readyUntil = this.clock + TUNING.readyMs;
		this.dying = false;
		this.say('READY?', TUNING.readyMs);
	}

	makeCat(m) {
		m.img = this.add.image(0, 0, frameKey('cat')).setDepth(DEPTH.cats);
		return m;
	}

	boost() {
		const s = TUNING.speed;
		return 1 + Math.min(s.maxBoost, (this.level - 1) * s.perLevel);
	}

	powerMs(kind) {
		const p = TUNING.powers[kind];
		return Math.max(p.min, p.ms - (this.level - 1) * p.perLevel);
	}

	// ---------- loop ----------

	update(_t, deltaMs) {
		const dtMs = Math.min(deltaMs, 50);
		const dt = dtMs / 1000;
		this.clock += dtMs;
		const live = !this.over && !this.dying && !this.clearing && this.clock >= this.readyUntil;
		if (live) {
			if (!isActive(this.powers, 'measure', this.clock)) this.modeClock += dtMs;
			this.updatePowers();
			this.moveCats(dt);
			this.moveObservers(dt);
			this.checkCatches();
			this.updateItem();
			if (!this.dots.size && !this.pellets.size) this.levelClear();
		}
		this.render();
	}

	moveCats(dt) {
		const [first, twin] = this.cats;
		first.want = this.want;
		if (twin) twin.want = mirrorDir(this.want);
		for (const cat of this.cats) {
			const inWall = isWall(M, cat.col, cat.row);
			const speed = (inWall ? TUNING.speed.tunnelling : TUNING.speed.cat) * this.boost();
			for (const cell of step(cat, speed * dt, this.catCanEnter(cat), M.cols)) this.eatAt(cell);
		}
	}

	// Tunnelling lets the cat into interior walls (never the outer wall or the
	// pen). A cat still inside a wall when it wears off may keep going until out.
	catCanEnter(cat) {
		const tunnel = isActive(this.powers, 'tunnel', this.clock) || isWall(M, cat.col, cat.row);
		return (c, r) => {
			if (walkable(M, c, r)) return true;
			if (!tunnel || isPen(M, c, r) || isDoor(M, c, r)) return false;
			return r > 0 && r < M.rows - 1 && c > 0 && c < M.cols - 1;
		};
	}

	eatAt({ col, row }) {
		const k = key(M, col, row);
		if (this.dots.delete(k)) {
			this.addScore(TUNING.score.quantum);
			this.eaten++;
			this.dotsDirty = true;
			this.sfx.play(this.eaten % 2 ? 'eatA' : 'eatB');
			const kind = nextItem(this.itemState, this.eaten, TUNING.items);
			if (kind) this.spawnItem(kind);
		}
		const pellet = this.pellets.get(k);
		if (pellet) {
			pellet.img.destroy();
			this.pellets.delete(k);
			this.addScore(TUNING.score.pellet);
			this.measure();
		}
		if (this.item && this.item.col === col && this.item.row === row) {
			const kind = this.item.kind;
			this.item.img.destroy();
			this.item = null;
			this.addScore(TUNING.score.item);
			this.gainPower(kind, col, row);
		}
	}

	// ---------- quantum powers ----------

	measure() {
		activate(this.powers, 'measure', this.clock, this.powerMs('measure'));
		this.eatChain = 0;
		this.sfx.play('measure');
		for (const o of this.observers) {
			if (o.mode !== 'active' && o.mode !== 'measured') continue;
			if (o.mode === 'active') o.m.want = opposite(o.m.dir);
			o.mode = 'measured';
		}
	}

	gainPower(kind, col, row) {
		const p = POWERS[kind];
		activate(this.powers, kind, this.clock, this.powerMs(kind));
		this.sfx.play(p.sfx);
		this.floatText(px(col), py(row) - 16, p.name, p.color);
		if (kind === 'split' && this.cats.length === 1) {
			this.cats.push(this.makeCat(splitOff(this.cats[0], M.cols)));
		}
	}

	updatePowers() {
		if (this.cats.length > 1 && !isActive(this.powers, 'split', this.clock)) {
			const real = observe(this.cats, this.rng);
			this.collapse(real, 'OBSERVED!', 'observed');
		}
		if (this.powers.tunnel && !isActive(this.powers, 'tunnel', this.clock)) {
			delete this.powers.tunnel;
			this.sfx.play('powerdown');
		}
		if (this.powers.measure && !isActive(this.powers, 'measure', this.clock)) {
			delete this.powers.measure;
			for (const o of this.observers) if (o.mode === 'measured') o.mode = 'active';
		}
	}

	collapse(survivor, text, sound) {
		for (const c of this.cats) {
			if (c === survivor) continue;
			const p = position(c);
			this.burst(px(p.x), py(p.y), COLORS.twin);
			c.img.destroy();
		}
		// If the twin is real, keep it on its course: it was steering mirrored.
		if (survivor !== this.cats[0]) this.want = mirrorDir(this.want);
		this.cats = collapseTo(this.cats, survivor);
		delete this.powers.split;
		this.sfx.play(sound);
		const p = position(survivor);
		this.floatText(px(p.x), py(p.y) - 18, text, '#ff7ad1');
	}

	spawnItem(kind) {
		this.item?.img.destroy();
		const p = POWERS[kind];
		const img = this.add.image(px(M.spawn.col), py(M.spawn.row), frameKey(p.sprite)).setDepth(DEPTH.items);
		this.tweens.add({ targets: img, y: img.y - 3, yoyo: true, repeat: -1, duration: 400 });
		this.item = { kind, img, col: M.spawn.col, row: M.spawn.row, until: this.clock + TUNING.items.lifeMs };
		this.sfx.play('item');
	}

	updateItem() {
		if (!this.item) return;
		const left = this.item.until - this.clock;
		this.item.img.setVisible(left > 2000 || Math.floor(this.clock / 120) % 2 === 0);
		if (left <= 0) { this.item.img.destroy(); this.item = null; }
	}

	// ---------- observers ----------

	ghostCanEnter(o) {
		const passDoor = o.mode === 'leaving' || o.mode === 'returning';
		return (c, r) => !isWall(M, c, r) && (passDoor || (!isDoor(M, c, r) && !isPen(M, c, r)));
	}

	ghostTarget(o) {
		if (o.mode === 'leaving') return { col: M.door.col, row: M.door.row - 1 };
		if (o.mode === 'returning') return { col: M.door.col, row: M.door.row + 1 };
		if (o.mode === 'measured') return null;
		if (modeAt(this.modeClock, TUNING.schedule) === 'scatter') return o.def.corner;
		const player = nearest(o.m, this.cats);
		return targetFor(o.def.behavior, { me: o.m, player, corner: o.def.corner });
	}

	moveObservers(dt) {
		const mode = modeAt(this.modeClock, TUNING.schedule);
		const flipped = mode !== this.lastMode;
		this.lastMode = mode;
		const s = TUNING.speed;
		for (const o of this.observers) {
			if (o.mode === 'pen') {
				if (this.clock >= o.releaseAt) o.mode = 'leaving';
				continue;
			}
			if (flipped && o.mode === 'active') o.m.want = opposite(o.m.dir);
			const speed = (o.mode === 'returning' ? s.returning : o.mode === 'measured' ? s.measured : s.observer)
				* (o.mode === 'returning' ? 1 : this.boost());
			const canEnter = this.ghostCanEnter(o);
			step(o.m, speed * dt, canEnter, M.cols, m => {
				// Arrivals: out of the pen, or home after being eaten.
				if (o.mode === 'leaving' && m.col === M.door.col && m.row === M.door.row - 1) {
					o.mode = 'active';
				}
				if (o.mode === 'returning' && m.col === M.door.col && m.row === M.door.row + 1) o.mode = 'leaving';
				m.want = chooseDir(m, this.ghostTarget(o), this.ghostCanEnter(o), this.rng, M.cols);
			});
		}
	}

	checkCatches() {
		const r2 = TUNING.catchRadius ** 2;
		for (const o of this.observers) {
			if (o.mode === 'pen' || o.mode === 'returning') continue;
			const op = position(o.m);
			for (const cat of [...this.cats]) {
				const cp = position(cat);
				if ((cp.x - op.x) ** 2 + (cp.y - op.y) ** 2 > r2) continue;
				if (o.mode === 'measured') {
					this.eatObserver(o, cp);
					break;
				}
				this.caught(cat);
				if (this.dying) return;
			}
		}
	}

	eatObserver(o, at) {
		const pts = eatChainScore(this.eatChain++, TUNING.score.observer);
		this.addScore(pts);
		o.mode = 'returning';
		this.sfx.play('eatObserver');
		this.floatText(px(at.x), py(at.y) - 14, `${pts}`, '#9ff0fa');
	}

	caught(cat) {
		if (this.cats.length > 1) {
			const survivor = this.cats.find(c => c !== cat);
			this.collapse(survivor, 'COLLAPSED!', 'collapse');
			return;
		}
		this.die(cat);
	}

	die(cat) {
		this.dying = true;
		this.lives--;
		this.sfx.play('death');
		const p = position(cat);
		this.tweens.add({ targets: cat.img, alpha: 0, scale: 2.2, angle: 360, duration: TUNING.deathMs - 300 });
		this.burst(px(p.x), py(p.y), 0xf29d38);
		this.time.delayedCall(TUNING.deathMs, () => {
			if (this.lives > 0) return this.resetActors();
			this.over = true;
			this.say('WAVE FUNCTION\nCOLLAPSED', 2000);
			this.time.delayedCall(2200, () => this.scene.start('GameOver', { score: this.score, level: this.level }));
		});
	}

	levelClear() {
		this.clearing = true;
		this.addScore(TUNING.score.levelClear * this.level);
		this.sfx.play('levelClear');
		this.say(`LEVEL ${this.level} CLEAR!`, 2000);
		this.cameras.main.flash(400, 30, 60, 110);
		this.time.delayedCall(2200, () => {
			this.level++;
			this.startLevel();
		});
	}

	addScore(n) {
		this.score += n;
		if (this.score >= this.nextLifeAt) {
			this.nextLifeAt += TUNING.extraLifeAt;
			this.lives++;
			this.sfx.play('extraLife');
			this.floatText(W / 2, 64, '1UP', '#f2d544');
		}
	}

	// ---------- drawing ----------

	render() {
		if (this.dotsDirty) {
			this.dotsDirty = false;
			const g = this.dotsGfx.clear();
			g.fillStyle(COLORS.quantum, 0.9);
			for (const k of this.dots) g.fillCircle(px(k % M.cols), py(Math.floor(k / M.cols)), 2.5);
		}

		const tunnel = isActive(this.powers, 'tunnel', this.clock);
		const split = this.cats.length > 1;
		const fx = this.fxGfx.clear();
		this.cats.forEach((cat, i) => {
			const p = position(cat);
			const x = px(p.x), y = py(p.y);
			if (this.dying) { cat.img.setPosition(x, y); return; }
			const chomp = cat.moving ? Math.floor(this.clock / 110) % 2 : 0;
			cat.img.setTexture(frameKey('cat', chomp)).setPosition(x, y).setFlipX(cat.dir === DIRS.left);
			const inWall = isWall(M, cat.col, cat.row) || isWall(M, cat.col + cat.dir.x, cat.row + cat.dir.y) && cat.t > 0.4;
			let alpha = 1;
			if (split) alpha = 0.7 + 0.3 * Math.sin(this.clock / 90 + i * Math.PI);
			if (inWall) alpha *= 0.5;
			cat.img.setAlpha(alpha);
			if (i === 1) cat.img.setTint(COLORS.twin); else cat.img.clearTint();
			if (tunnel) {
				const r = 12 + ((this.clock / 12) % 10);
				fx.lineStyle(2, COLORS.tunnel, 0.6 - (r - 12) / 20).strokeCircle(x, y, r);
			}
		});
		if (split) {
			// The entangled pair: a faint thread across the centre line.
			const [a, b] = this.cats.map(position);
			fx.lineStyle(1, COLORS.twin, 0.25).lineBetween(px(a.x), py(a.y), px(b.x), py(b.y));
		}

		const measureLeft = remaining(this.powers, 'measure', this.clock);
		const flash = measureLeft < TUNING.powers.measure.warnMs && Math.floor(this.clock / 160) % 2;
		for (const o of this.observers) {
			const p = position(o.m);
			let x = px(p.x), y = py(p.y);
			if (o.mode === 'pen') y += Math.sin(this.clock / 200 + o.def.releaseMs) * 3;
			const tex = o.mode === 'returning' ? `iris_${o.def.id}`
				: o.mode === 'measured' ? frameKey(flash ? 'eye_flash' : 'eye_measured')
					: `eye_${o.def.id}`;
			o.img.setTexture(tex).setPosition(x, y + Math.sin(this.clock / 160 + o.def.color) * 1.5).setAlpha(o.mode === 'returning' ? 0.7 : 1);
			// The pupil looks where it's going (and at you, when measured it rolls).
			const d = o.m.dir;
			const spin = o.mode === 'measured' ? this.clock / 120 : null;
			const ox = spin === null ? d.x * 3 : Math.cos(spin) * 3, oy = spin === null ? d.y * 3 : Math.sin(spin) * 3;
			o.pupil.setPosition(x + ox, y - 2 + oy).setVisible(o.mode !== 'returning');
		}

		this.updateHud();
	}

	updateHud() {
		this.hudScore.setText(`${this.score}`);
		this.hudHi.setText(`HI ${Math.max(this.hi, this.score)}`);
		this.hudLevel.setText(`LEVEL ${this.level}`);
		const lines = [];
		for (const kind of Object.keys(POWERS)) {
			const left = remaining(this.powers, kind, this.clock);
			if (!left) continue;
			const warn = left < TUNING.powers[kind].warnMs && Math.floor(this.clock / 150) % 2;
			if (!warn) lines.push(`${POWERS[kind].name} ${Math.ceil(left / 1000)}s`);
			else lines.push(' ');
		}
		this.hudPowers.setText(lines.join('\n'));
		const shown = Math.max(0, this.lives - 1); // the one in play isn't shown
		while (this.lifeIcons.length < shown) this.lifeIcons.push(this.add.image(0, 0, frameKey('cat')).setDepth(DEPTH.hud).setScale(0.8));
		this.lifeIcons.forEach((img, i) => img.setPosition(24 + i * 26, H - 30).setVisible(i < shown));
	}

	// ---------- misc ----------

	burst(x, y, color) {
		const g = this.add.graphics().setDepth(DEPTH.hud - 1);
		const ring = { r: 4, a: 1 };
		this.tweens.add({
			targets: ring, r: 30, a: 0, duration: 450,
			onUpdate: () => g.clear().lineStyle(3, color, ring.a).strokeCircle(x, y, ring.r),
			onComplete: () => g.destroy(),
		});
	}

	floatText(x, y, text, color) {
		const t = this.add.text(x, y, text, { fontFamily: FONT, fontSize: fs(this, 11), color, fontStyle: 'bold', stroke: '#0c0f1a', strokeThickness: 3 })
			.setOrigin(0.5).setDepth(DEPTH.hud - 1);
		this.tweens.add({ targets: t, y: y - 30, alpha: 0, duration: 1000, onComplete: () => t.destroy() });
	}

	say(text, ms) {
		this.banner.setText(text).setVisible(true).setAlpha(1);
		this.tweens.killTweensOf(this.banner);
		this.tweens.add({ targets: this.banner, alpha: 0, delay: ms - 300, duration: 300, onComplete: () => this.banner.setVisible(false) });
	}

	pause() {
		if (this.over || !this.scene.isActive()) return;
		this.scene.launch('Pause');
		this.scene.pause();
	}

	toggleMute() {
		this.sfx.muted = !this.sfx.muted;
		this.registry.get('store').set('muted', this.sfx.muted);
		this.floatText(W / 2, 64, this.sfx.muted ? 'MUTED' : 'SOUND ON', '#9ff0fa');
	}
}
