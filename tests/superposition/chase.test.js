import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DIRS, createMover } from '../../games/superposition/src/core/move.js';
import { chooseDir, targetFor, modeAt, nearest } from '../../games/superposition/src/core/chase.js';

const OPEN = (c, r) => c >= 0 && c < 9 && r >= 0 && r < 9;
const rng = { next: () => 0, pick: l => l[0] };

test('chooseDir heads toward the target without reversing', () => {
	const m = createMover(4, 4, DIRS.right);
	assert.deepEqual(chooseDir(m, { col: 4, row: 0 }, OPEN, rng), DIRS.up);
	// target behind: still may not reverse while other ways exist
	assert.notDeepEqual(chooseDir(m, { col: 0, row: 4 }, OPEN, rng), DIRS.left);
});

test('chooseDir reverses only at a dead end', () => {
	const m = createMover(1, 1, DIRS.right);
	const corridor = (c, r) => r === 1 && c <= 1;
	assert.deepEqual(chooseDir(m, { col: 8, row: 8 }, corridor, rng), DIRS.left);
});

test('random mode picks among legal moves with the rng', () => {
	const m = createMover(4, 4, DIRS.right);
	const d = chooseDir(m, null, OPEN, rng);
	assert.ok([DIRS.up, DIRS.down, DIRS.right].includes(d));
});

test('targets by behaviour', () => {
	const player = { col: 5, row: 5, dir: DIRS.left };
	const me = { col: 0, row: 0 };
	const corner = { col: 8, row: 0 };
	assert.deepEqual(targetFor({ kind: 'stalker' }, { me, player, corner }), { col: 5, row: 5 });
	assert.deepEqual(targetFor({ kind: 'trickster', ahead: 3 }, { me, player, corner }), { col: 2, row: 5 });
	assert.deepEqual(targetFor({ kind: 'shy', range: 4 }, { me, player, corner }), { col: 5, row: 5 }, 'far: chase');
	assert.deepEqual(targetFor({ kind: 'shy', range: 4 }, { me: { col: 4, row: 5 }, player, corner }), corner, 'close: back off');
	assert.equal(targetFor({ kind: 'drifter' }, { me, player, corner }), null);
});

test('nearest picks the closest of several players (superposition)', () => {
	const a = { col: 0, row: 0 }, b = { col: 8, row: 0 };
	assert.equal(nearest({ col: 7, row: 1 }, [a, b]), b);
});

test('modeAt walks the scatter/chase schedule; the last phase lasts forever', () => {
	const s = [{ mode: 'scatter', ms: 5000 }, { mode: 'chase', ms: 10000 }, { mode: 'scatter', ms: 3000 }, { mode: 'chase' }];
	assert.equal(modeAt(0, s), 'scatter');
	assert.equal(modeAt(5000, s), 'chase');
	assert.equal(modeAt(16000, s), 'scatter');
	assert.equal(modeAt(1e9, s), 'chase');
});
