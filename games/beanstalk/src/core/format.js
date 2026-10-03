// Turning very large numbers into something readable.

const SUFFIXES = ['', 'k', 'M', 'B', 'T'];
const AU = 1.496e11;
const LY = 9.461e15;

// Three significant figures, truncated so 999.9 never rounds up to "1000".
function three(v) {
	const d = v < 10 ? 2 : v < 100 ? 1 : 0;
	const f = 10 ** d;
	return (Math.floor(v * f + 1e-6) / f).toFixed(d);
}

function compact(n) {
	if (!Number.isFinite(n)) return '∞';
	if (n < 1000) return three(n);
	let e = Math.floor(Math.log10(n));
	if (n / 10 ** e >= 10) e++;
	if (n / 10 ** e < 1) e--;
	const i = Math.floor(e / 3);
	if (i < SUFFIXES.length) return three(n / 1000 ** i) + SUFFIXES[i];
	return `${three(n / 10 ** e)}e${e}`;
}

export const formatNumber = n => (n < 1000 ? String(Math.floor(n)) : compact(n));

export const formatMoney = n => (n < 1000 ? (Math.floor(n * 100 + 1e-6) / 100).toFixed(2) : compact(n));

export function formatHeight(m) {
	if (m < 100) return `${(Math.floor(m * 10 + 1e-6) / 10).toFixed(1)} m`;
	if (m < 1000) return `${Math.floor(m)} m`;
	if (m < 0.1 * AU) return `${compact(m / 1000)} km`;
	if (m < 0.1 * LY) return `${compact(m / AU)} AU`;
	return `${compact(m / LY)} ly`;
}

export function formatDuration(seconds) {
	const s = Math.floor(seconds);
	const two = n => String(n).padStart(2, '0');
	if (s < 60) return `${s}s`;
	if (s < 3600) return `${Math.floor(s / 60)}m ${two(s % 60)}s`;
	return `${Math.floor(s / 3600)}h ${two(Math.floor(s % 3600 / 60))}m`;
}
