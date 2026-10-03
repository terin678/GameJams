// How tall the stalk is, and what that means.

// Metres of stalk from lifetime beans grown. `h` is TUNING.height: a list of
// [beans, metres] points, joined by straight lines on a log-log chart, so each
// stretch of the game can be given its own length. Flat past the last point.
export function heightFor(grown, h) {
	const pts = h.points;
	if (grown <= 0) return 0;
	if (grown <= pts[0][0]) return pts[0][1] * grown / pts[0][0];
	for (let i = 1; i < pts.length; i++) {
		const [g0, m0] = pts[i - 1];
		const [g1, m1] = pts[i];
		if (grown <= g1) return m0 * (m1 / m0) ** (Math.log(grown / g0) / Math.log(g1 / g0));
	}
	return pts.at(-1)[1];
}

export function phaseAt(height, phases) {
	let current = phases[0];
	for (const p of phases) if (height >= p.height) current = p;
	return current;
}

// Milestones with prev < height <= next.
export const crossed = (prev, next, milestones) =>
	milestones.filter(m => m.height > prev && m.height <= next);

// Where the top of the stalk sits in the sky, 0 (ground) to 1 (top of the screen).
// Landmarks pin heights to screen positions; between them the scale is logarithmic.
export function stalkFrac(height, landmarks) {
	if (height <= landmarks[0].height) return landmarks[0].y;
	for (let i = 1; i < landmarks.length; i++) {
		const a = landmarks[i - 1];
		const b = landmarks[i];
		if (height <= b.height) {
			const f = Math.log(height / a.height) / Math.log(b.height / a.height);
			return a.y + (b.y - a.y) * f;
		}
	}
	return landmarks.at(-1).y;
}
