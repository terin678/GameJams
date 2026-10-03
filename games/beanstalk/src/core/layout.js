// Small pure helpers for the farm view.

// The order plots appear in the grid: a block that spreads out from the middle
// of the top row, so a small farm looks like a tidy patch, not a thin line.
export function plotOrder(cols, rows) {
	const mid = (cols - 1) / 2;
	const cells = [];
	for (let row = 0; row < rows; row++) {
		for (let col = 0; col < cols; col++) {
			const out = Math.floor(Math.abs(col - mid));   // 0 for the two middle columns
			cells.push({ col, row, ring: Math.max(Math.floor(out / 3), Math.floor(row / 2)), out });
		}
	}
	cells.sort((a, b) => a.ring - b.ring || a.row - b.row || a.out - b.out || a.col - b.col);
	return cells.map(({ col, row }) => ({ col, row }));
}

const channels = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));

export function mixColor(a, b, f) {
	const ca = channels(a);
	const cb = channels(b);
	return '#' + ca.map((v, i) => Math.round(v + (cb[i] - v) * f).toString(16).padStart(2, '0')).join('');
}
