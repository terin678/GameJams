import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planAction } from '../../games/jobhop/src/core/actions.js';

const ctx = { now: 1000, x: 10, y: 20, dir: { x: 1, y: 0 }, target: { x: 100, y: 0 } };

test('a pulse at self lands now', () => {
	const p = planAction({ pulse: { radius: 50, damage: 10 } }, ctx);
	assert.deepEqual(p.pulses, [{ at: 1000, x: 10, y: 20, radius: 50, damage: 10, knockback: 0, follow: false }]);
});

test('delayed, repeated and targeted pulses', () => {
	const p = planAction({ pulse: { radius: 50, damage: 10, delayMs: 500, at: 'target', repeat: { count: 3, everyMs: 100 } } }, ctx);
	assert.deepEqual(p.pulses.map(x => x.at), [1500, 1600, 1700]);
	assert.deepEqual([p.pulses[0].x, p.pulses[0].y], [100, 0]);
	assert.equal(p.pulses[0].follow, false);
});

test('targeted pulses fall back to self without a target', () => {
	const p = planAction({ pulse: { radius: 5, damage: 1, at: 'target' } }, { ...ctx, target: null });
	assert.deepEqual([p.pulses[0].x, p.pulses[0].y], [10, 20]);
});

test('self pulses that land later follow the player', () => {
	const p = planAction({ pulse: { radius: 5, damage: 1, delayMs: 300 } }, ctx);
	assert.equal(p.pulses[0].follow, true);
});

test('timers, heal, dash, field and clones', () => {
	const p = planAction({
		invulnMs: 200, hideMs: 100, heal: 0.25,
		haste: { mult: 1.5, ms: 3000 },
		dash: { distance: 100, ms: 200, damage: 5, width: 20 },
		field: { radius: 60, ms: 4000, tickMs: 500, damage: 2, slow: 0.5 },
		clones: { count: 2, ms: 5000, radius: 40 },
	}, ctx);
	assert.equal(p.invulnUntil, 1200);
	assert.equal(p.hideUntil, 1100);
	assert.equal(p.heal, 0.25);
	assert.deepEqual(p.haste, { mult: 1.5, until: 4000 });
	assert.deepEqual(p.dash, { vx: 500, vy: 0, until: 1200, damage: 5, width: 20 });
	assert.deepEqual(p.field, { x: 10, y: 20, radius: 60, until: 5000, tickMs: 500, damage: 2, slow: 0.5, heal: 0, follow: false });
	assert.deepEqual(p.clones, { count: 2, until: 6000, radius: 40 });
});

test('an empty action plans nothing', () => {
	const p = planAction({}, ctx);
	assert.deepEqual(p, { pulses: [], invulnUntil: 0, hideUntil: 0, heal: 0, haste: null, dash: null, field: null, clones: null });
});
