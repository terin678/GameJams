// Content lives in src/data/. These tests check it hangs together.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAZE } from '../../games/superposition/src/data/maze.js';
import { TUNING } from '../../games/superposition/src/data/tuning.js';
import { OBSERVERS } from '../../games/superposition/src/data/observers.js';
import { POWERS } from '../../games/superposition/src/data/powers.js';
import { SPRITES, PALETTE } from '../../games/superposition/src/data/sprites.js';
import { SOUNDS } from '../../games/superposition/src/data/sounds.js';
import { parseMaze, isSymmetric, reachable, walkable, isWall, key, charAt } from '../../games/superposition/src/core/maze.js';
import { targetFor } from '../../games/superposition/src/core/chase.js';
import { parsePixelMap } from '../../shared/pixelart.js';
import { validateSfx } from '../../shared/sfx.js';

const maze = parseMaze(MAZE);

test('the maze is symmetric (superposition depends on it)', () => {
	assert.ok(isSymmetric(maze));
});

test('the maze has one start, a door over the pen, an item spawn and four pellets', () => {
	assert.ok(maze.start && maze.door && maze.spawn);
	assert.ok(maze.pen.length >= 1);
	assert.ok(maze.pen.some(p => p.col === maze.door.col && p.row === maze.door.row + 1), 'pen right under the door');
	assert.ok(walkable(maze, maze.door.col, maze.door.row - 1), 'door opens onto the maze');
	assert.equal(maze.pellets.length, 4);
	assert.equal(maze.start.col, (maze.cols - 1) / 2, 'cat starts on the centre line');
});

test('the maze fits the screen', () => {
	assert.ok(maze.cols * TUNING.tile <= TUNING.width);
	assert.ok(TUNING.mazeTop + maze.rows * TUNING.tile <= TUNING.height - 40);
});

test('every quantum, pellet and the item spawn can be reached by the cat', () => {
	const seen = reachable(maze, maze.start, (c, r) => walkable(maze, c, r));
	for (const p of [...maze.dots, ...maze.pellets, maze.spawn]) {
		assert.ok(seen.has(key(maze, p.col, p.row)), `unreachable ${p.col},${p.row}`);
	}
});

test('no dead ends: every open cell has at least two open neighbours', () => {
	for (let r = 0; r < maze.rows; r++) {
		for (let c = 0; c < maze.cols; c++) {
			if (!walkable(maze, c, r)) continue;
			const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => walkable(maze, c + dx, r + dy)).length;
			assert.ok(n >= 2, `dead end at ${c},${r}`);
		}
	}
});

test('the maze is walled in except for side tunnels', () => {
	for (let c = 0; c < maze.cols; c++) {
		assert.ok(isWall(maze, c, 0) && isWall(maze, c, maze.rows - 1), `top/bottom open at col ${c}`);
	}
	for (let r = 0; r < maze.rows; r++) {
		const left = charAt(maze, 0, r) !== '#', right = charAt(maze, maze.cols - 1, r) !== '#';
		assert.equal(left, right, `row ${r}: a side tunnel needs both ends`);
	}
});

test('observers are well-formed and their behaviours compute', () => {
	const ids = OBSERVERS.map(o => o.id);
	assert.equal(new Set(ids).size, ids.length);
	assert.ok(OBSERVERS.some(o => o.start === 'door'), 'someone starts outside');
	const pen = OBSERVERS.filter(o => o.start === 'pen').length;
	assert.ok(pen <= maze.pen.length, 'enough pen cells');
	for (const o of OBSERVERS) {
		assert.ok(['door', 'pen'].includes(o.start), `${o.id}.start`);
		assert.ok(o.releaseMs >= 0, `${o.id}.releaseMs`);
		assert.ok(Number.isInteger(o.color), `${o.id}.color`);
		targetFor(o.behavior, { me: { col: 0, row: 0 }, player: { col: 3, row: 3, dir: { x: 1, y: 0 } }, corner: o.corner });
	}
});

test('powers have tuning, sprites and sounds; items cycle through real powers', () => {
	for (const [k, p] of Object.entries(POWERS)) {
		const t = TUNING.powers[k];
		assert.ok(t && t.ms > 0 && t.min > 0 && t.min <= t.ms, `${k} timing`);
		assert.ok(SPRITES[p.sprite], `${k}.sprite`);
		assert.ok(SOUNDS[p.sfx], `${k}.sfx`);
	}
	for (const k of TUNING.items.cycle) assert.ok(POWERS[k], `item "${k}"`);
});

test('every sprite parses and every sound is valid', () => {
	for (const [k, s] of Object.entries(SPRITES)) {
		const sizes = s.frames.map(f => { const m = parsePixelMap(f, PALETTE); return `${m.width}x${m.height}`; });
		assert.equal(new Set(sizes).size, 1, `${k} frames differ`);
	}
	for (const [k, s] of Object.entries(SOUNDS)) assert.deepEqual(validateSfx(s), [], k);
});

test('the schedule ends with an open-ended phase', () => {
	const s = TUNING.schedule;
	assert.equal(s.at(-1).ms, undefined);
	for (const p of s.slice(0, -1)) assert.ok(p.ms > 0 && ['scatter', 'chase'].includes(p.mode));
});
