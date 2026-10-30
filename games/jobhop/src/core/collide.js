export function circlesOverlap(ax, ay, ar, bx, by, br) {
	const dx = ax - bx, dy = ay - by, r = ar + br;
	return dx * dx + dy * dy <= r * r;
}
