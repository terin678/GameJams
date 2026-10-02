// Mazes are rows of characters (see data/maze.js for the legend). Columns wrap
// so open cells on the left and right edges form side tunnels.

const LEGEND = {
	'#': 'wall', '.': 'dot', 'o': 'pellet', ' ': 'empty',
	'P': 'start', '-': 'door', 'G': 'pen', 'S': 'spawn',
};

export function parseMaze(rows) {
	const cols = rows[0].length;
	const m = { cols, rows: rows.length, grid: rows, dots: [], pellets: [], pen: [], start: null, door: null, spawn: null };
	rows.forEach((line, row) => {
		if (line.length !== cols) throw new Error(`maze row ${row} is ${line.length} wide, expected width ${cols}`);
		[...line].forEach((ch, col) => {
			const kind = LEGEND[ch];
			if (!kind) throw new Error(`unknown maze character "${ch}" at ${col},${row}`);
			const at = { col, row };
			if (kind === 'dot') m.dots.push(at);
			else if (kind === 'pellet') m.pellets.push(at);
			else if (kind === 'pen') m.pen.push(at);
			else if (kind === 'start') m.start = at;
			else if (kind === 'door') m.door = at;
			else if (kind === 'spawn') m.spawn = at;
		});
	});
	return m;
}

export const key = (m, col, row) => row * m.cols + col;
export const wrapCol = (m, col) => ((col % m.cols) + m.cols) % m.cols;
export const charAt = (m, col, row) => (row < 0 || row >= m.rows ? '#' : m.grid[row][wrapCol(m, col)]);

export const isWall = (m, col, row) => charAt(m, col, row) === '#';
export const isDoor = (m, col, row) => charAt(m, col, row) === '-';
export const isPen = (m, col, row) => charAt(m, col, row) === 'G';

// Where the cat can go normally.
export const walkable = (m, col, row) => !'#-G'.includes(charAt(m, col, row));

export const mirrorCol = (m, col) => m.cols - 1 - col;

// Structural symmetry: walls, door and pen mirror left to right. Superposition
// relies on this, so a mirrored move is always legal for the twin.
const shape = ch => ('#-G'.includes(ch) ? ch : 'path');
export function isSymmetric(m) {
	for (let row = 0; row < m.rows; row++) {
		for (let col = 0; col < m.cols; col++) {
			if (shape(charAt(m, col, row)) !== shape(charAt(m, mirrorCol(m, col), row))) return false;
		}
	}
	return true;
}

export function reachable(m, from, canEnter) {
	const seen = new Set([key(m, from.col, from.row)]);
	const queue = [from];
	while (queue.length) {
		const { col, row } = queue.shift();
		for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
			const c = wrapCol(m, col + dx), r = row + dy;
			const k = key(m, c, r);
			if (r < 0 || r >= m.rows || seen.has(k) || !canEnter(c, r)) continue;
			seen.add(k);
			queue.push({ col: c, row: r });
		}
	}
	return seen;
}
