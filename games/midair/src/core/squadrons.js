// 1943's red squadrons: kill every plane in a marked wave to earn its reward.

export const createSquadrons = () => new Map();

export function enlist(sq, id, size, reward) {
	if (!sq.has(id)) sq.set(id, { size, kills: 0, broken: false, paid: false, reward });
}

export function recordKill(sq, id) {
	const s = sq.get(id);
	if (!s || s.broken || s.paid) return null;
	s.kills++;
	if (s.kills < s.size) return null;
	s.paid = true;
	return s.reward;
}

export function recordEscape(sq, id) {
	const s = sq.get(id);
	if (s) s.broken = true;
}
