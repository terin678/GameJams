// Drop tables: [{ pickup, chance }], rolled once per kill against an rng.
export function rollDrop(table, rng, luck = 1) {
	if (!table?.length) return null;
	const roll = rng.next();
	let acc = 0;
	for (const d of table) {
		acc += d.chance * luck;
		if (roll < acc) return d.pickup;
	}
	return null;
}
