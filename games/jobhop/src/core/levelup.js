// Level-up cards: raise an attack of either equipped job, or take a passive.

export function cardPool({ jobs, JOBS, PASSIVES, attackLevels, passiveLevels, attackMax }) {
	const pool = [];
	const seen = new Set();
	for (const job of jobs) {
		for (const id of JOBS[job].attacks) {
			if (seen.has(id)) continue;
			seen.add(id);
			const lv = attackLevels[id] ?? 1;
			if (lv < attackMax) pool.push({ kind: 'attack', id, job, level: lv + 1 });
		}
	}
	for (const [id, p] of Object.entries(PASSIVES)) {
		const lv = passiveLevels[id] ?? 0;
		if (lv < p.max) pool.push({ kind: 'passive', id, level: lv + 1 });
	}
	return pool;
}

export function offerCards(rng, pool, n) {
	if (!pool.length) return [{ kind: 'heal', id: 'heal' }];
	const left = [...pool];
	const out = [];
	while (out.length < n && left.length) {
		out.push(left.splice(Math.floor(rng.next() * left.length), 1)[0]);
	}
	return out;
}

export function applyCard(card, attackLevels, passiveLevels) {
	if (card.kind === 'attack') attackLevels[card.id] = (attackLevels[card.id] ?? 1) + 1;
	if (card.kind === 'passive') passiveLevels[card.id] = (passiveLevels[card.id] ?? 0) + 1;
}
