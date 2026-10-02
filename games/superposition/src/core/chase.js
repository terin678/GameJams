// Observer AI: at each tile centre pick the legal direction (never reversing
// unless stuck) whose next tile is closest to a target. Behaviours (data)
// choose the target. A null target means wander at random.
import { DIRS, opposite } from './move.js';

const ORDER = [DIRS.up, DIRS.left, DIRS.down, DIRS.right]; // tie-break order
const d2 = (a, b) => (a.col - b.col) ** 2 + (a.row - b.row) ** 2;

export function chooseDir(m, target, canEnter, rng, cols) {
	const wrap = c => (cols ? ((c % cols) + cols) % cols : c);
	const back = opposite(m.dir);
	const legal = d => canEnter(wrap(m.col + d.x), m.row + d.y);
	const opts = ORDER.filter(d => d !== back && legal(d));
	if (!opts.length) return legal(back) ? back : m.dir;
	if (!target) return rng.pick(opts);
	let best = opts[0], bestD = Infinity;
	for (const d of opts) {
		const dist = d2({ col: m.col + d.x, row: m.row + d.y }, target);
		if (dist < bestD) { best = d; bestD = dist; }
	}
	return best;
}

export function targetFor(behavior, { me, player, corner }) {
	switch (behavior.kind) {
		case 'stalker': return { col: player.col, row: player.row };
		case 'trickster': {
			const d = player.dir ?? { x: 0, y: 0 };
			return { col: player.col + d.x * behavior.ahead, row: player.row + d.y * behavior.ahead };
		}
		case 'shy': return d2(me, player) > behavior.range ** 2 ? { col: player.col, row: player.row } : corner;
		case 'drifter': return null;
		default: throw new Error(`unknown behaviour "${behavior.kind}"`);
	}
}

// With two cats in superposition, each observer goes for the closer one.
export function nearest(me, players) {
	let best = players[0];
	for (const p of players) if (d2(me, p) < d2(me, best)) best = p;
	return best;
}

// Scatter/chase phases: [{ mode, ms }...]; the last phase has no end.
export function modeAt(ms, schedule) {
	let t = 0;
	for (const phase of schedule) {
		if (phase.ms === undefined || ms < t + phase.ms) return phase.mode;
		t += phase.ms;
	}
	return schedule.at(-1).mode;
}
