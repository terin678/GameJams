import { test } from 'node:test';
import assert from 'node:assert/strict';
import { attackAt, aimAt, inArc, inLine, spreadDirections, turnToward, orbitPositions, nearest } from '../../games/jobhop/src/core/attacks.js';

const STATS = { might: 1.5, area: 2, haste: 2 };
const near = (a, b) => Math.abs(a - b) < 1e-9;

test('attackAt scales by level and stats', () => {
	const def = { shape: 'arc', damage: 10, cooldownMs: 1000, range: 50, arcDeg: 90, perLevel: { damage: 0.5, count: 0.5 } };
	const a = attackAt(def, 3, STATS);
	assert.equal(a.damage, 10 * 2 * 1.5);
	assert.equal(a.cooldownMs, 500);
	assert.equal(a.range, 100);
	assert.equal(a.count, 2);
	assert.equal(def.damage, 10, 'def untouched');
});

test('aimAt points at a target, else falls back to facing', () => {
	const d = aimAt(0, 0, { x: 0, y: 10 }, { x: 1, y: 0 });
	assert.ok(near(d.x, 0) && near(d.y, 1));
	assert.deepEqual(aimAt(0, 0, null, { x: 1, y: 0 }), { x: 1, y: 0 });
});

test('inArc respects range and angle', () => {
	assert.equal(inArc(0, 0, 1, 0, 50, 90, 40, 10, 2), true);
	assert.equal(inArc(0, 0, 1, 0, 50, 90, -40, 0, 2), false, 'behind');
	assert.equal(inArc(0, 0, 1, 0, 50, 90, 60, 0, 2), false, 'too far');
	assert.equal(inArc(0, 0, 1, 0, 50, 90, 1, 0, 2), true, 'overlapping the player always hits');
});

test('inLine is a rectangle ahead of the origin', () => {
	assert.equal(inLine(0, 0, 1, 0, 100, 20, 80, 8, 3), true);
	assert.equal(inLine(0, 0, 1, 0, 100, 20, 80, 20, 3), false);
	assert.equal(inLine(0, 0, 1, 0, 100, 20, -10, 0, 3), false);
});

test('spreadDirections fans evenly around the aim', () => {
	assert.deepEqual(spreadDirections({ x: 1, y: 0 }, 1, 30), [{ x: 1, y: 0 }]);
	const ds = spreadDirections({ x: 1, y: 0 }, 3, 90);
	const angles = ds.map(d => Math.round(Math.atan2(d.y, d.x) * 180 / Math.PI));
	assert.deepEqual(angles, [-45, 0, 45]);
	const two = spreadDirections({ x: 1, y: 0 }, 2, undefined);
	assert.equal(two.length, 2);
	assert.notDeepEqual(two[0], two[1], 'a default spread keeps extra shots apart');
});

test('turnToward rotates velocity by at most turnRate*dt and keeps speed', () => {
	const p = { x: 0, y: 0, vx: 100, vy: 0 };
	turnToward(p, 0, 100, 1, 0.5);
	assert.ok(near(Math.atan2(p.vy, p.vx), 0.5));
	assert.ok(near(Math.hypot(p.vx, p.vy), 100));
});

test('orbitPositions spaces items evenly', () => {
	const ps = orbitPositions(0, 0, 4, 10, 0);
	assert.equal(ps.length, 4);
	assert.ok(near(ps[1].x, 0) && near(ps[1].y, 10));
});

test('nearest finds the closest live item within range', () => {
	const items = [{ x: 10, y: 0 }, { x: 5, y: 0, dead: true }, { x: -3, y: 0 }];
	assert.equal(nearest(items, 0, 0), items[2]);
	assert.equal(nearest(items, 0, 0, 2), null);
});

test('nearest can skip items (a homing shot ignores what it already hit)', () => {
	const items = [{ x: 10, y: 0 }, { x: -3, y: 0 }];
	const hit = new Set([items[1]]);
	assert.equal(nearest(items, 0, 0, Infinity, it => hit.has(it)), items[0]);
});
