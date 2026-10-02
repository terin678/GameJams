// Tile-to-tile movement. A mover sits on tile (col,row) and is t (0..1) of the
// way to the next tile in dir. Turns happen at tile centres (t === 0); want is
// the buffered turn. Distances are in tiles.

export const DIRS = {
	up: { x: 0, y: -1, name: 'up' },
	down: { x: 0, y: 1, name: 'down' },
	left: { x: -1, y: 0, name: 'left' },
	right: { x: 1, y: 0, name: 'right' },
};
const OPPOSITE = { up: DIRS.down, down: DIRS.up, left: DIRS.right, right: DIRS.left };
const MIRROR = { up: DIRS.up, down: DIRS.down, left: DIRS.right, right: DIRS.left };

export const opposite = d => OPPOSITE[d.name];
// Mirrored left to right, for the superposition twin.
export const mirrorDir = d => (d ? MIRROR[d.name] : d);

export const createMover = (col, row, dir) => ({ col, row, t: 0, dir, want: null, moving: true });

const wrap = (c, cols) => ((c % cols) + cols) % cols;

// Advances m by dist tiles. canEnter(col, row) gets wrapped columns.
// decide(m), if given, runs at each tile centre before moving on (AI turns).
// Returns the tiles entered, in order.
export function step(m, dist, canEnter, cols, decide) {
	const entered = [];
	if (m.want && m.t > 0 && m.want === opposite(m.dir)) {
		m.col = wrap(m.col + m.dir.x, cols);
		m.row += m.dir.y;
		m.t = 1 - m.t;
		m.dir = m.want;
	}
	while (dist > 1e-9) {
		if (m.t === 0) {
			decide?.(m);
			if (m.want && m.want !== m.dir && canEnter(wrap(m.col + m.want.x, cols), m.row + m.want.y)) m.dir = m.want;
			if (!canEnter(wrap(m.col + m.dir.x, cols), m.row + m.dir.y)) {
				m.moving = false;
				break;
			}
			m.moving = true;
		}
		const d = Math.min(dist, 1 - m.t);
		m.t += d;
		dist -= d;
		if (m.t >= 1 - 1e-9) {
			m.col = wrap(m.col + m.dir.x, cols);
			m.row += m.dir.y;
			m.t = 0;
			entered.push({ col: m.col, row: m.row });
		}
	}
	return entered;
}

// Position in tile units (may run past an edge while wrapping).
export const position = m => ({ x: m.col + m.dir.x * m.t, y: m.row + m.dir.y * m.t });
