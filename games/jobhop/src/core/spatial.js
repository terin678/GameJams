// A uniform grid hash so "what is near this point" stays cheap with hundreds
// of enemies. Rebuilt every frame. Items are { x, y, radius? }; an item is
// filed under every cell its circle touches, so big bosses are never missed.

export const createGrid = cell => ({ cell, cells: new Map(), stamp: 0 });

const key = (cx, cy) => (cx + 0x8000) * 0x10000 + (cy + 0x8000);

export function clearGrid(g) {
	g.cells.clear();
}

export function insert(g, item) {
	const r = item.radius ?? 0;
	const x0 = Math.floor((item.x - r) / g.cell), x1 = Math.floor((item.x + r) / g.cell);
	const y0 = Math.floor((item.y - r) / g.cell), y1 = Math.floor((item.y + r) / g.cell);
	for (let cx = x0; cx <= x1; cx++) {
		for (let cy = y0; cy <= y1; cy++) {
			const k = key(cx, cy);
			let list = g.cells.get(k);
			if (!list) g.cells.set(k, list = []);
			list.push(item);
		}
	}
}

// Every item whose circle overlaps the query circle, each once.
export function queryCircle(g, x, y, r, out = []) {
	const stamp = ++g.stamp;
	const x0 = Math.floor((x - r) / g.cell), x1 = Math.floor((x + r) / g.cell);
	const y0 = Math.floor((y - r) / g.cell), y1 = Math.floor((y + r) / g.cell);
	for (let cx = x0; cx <= x1; cx++) {
		for (let cy = y0; cy <= y1; cy++) {
			const list = g.cells.get(key(cx, cy));
			if (!list) continue;
			for (const item of list) {
				if (item._q === stamp) continue;
				item._q = stamp;
				const dx = item.x - x, dy = item.y - y, rr = r + (item.radius ?? 0);
				if (dx * dx + dy * dy <= rr * rr) out.push(item);
			}
		}
	}
	return out;
}
