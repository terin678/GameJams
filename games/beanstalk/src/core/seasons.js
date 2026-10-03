// Days, seasons and weather. `t` is TUNING.calendar.

export function calendar(day, seasons, t) {
	const perYear = seasons.length * t.daysPerSeason;
	const d = day % perYear;
	return {
		season: seasons[Math.floor(d / t.daysPerSeason)],
		dayOfSeason: d % t.daysPerSeason + 1,
		year: Math.floor(day / perYear) + 1,
	};
}

// Moves the clock on and returns how many new days began.
export function advance(clock, dt, t) {
	clock.dayT += dt;
	let days = 0;
	while (clock.dayT >= t.daySeconds) {
		clock.dayT -= t.daySeconds;
		clock.day++;
		days++;
	}
	return days;
}

// Each kind of weather has its own chance per day; the rest of the time it's fair.
// `crows` multiplies the chance of weather that eats (a New Game+ rule).
export function rollWeather(rng, weather, crows = 1) {
	let r = rng.next();
	for (const w of weather) {
		const chance = w.eats ? w.chance * crows : w.chance;
		if (r < chance) return w;
		r -= chance;
	}
	return null;
}

// One line for the farm panel: what the season is doing to growth right now.
export function seasonNote(season, mods, cold = 1) {
	if (season.cold && mods.greenhouse) return `${season.name}: the greenhouse keeps the beans warm`;
	const pct = Math.round((season.growth * (season.cold ? cold : 1) - 1) * 100);
	if (pct === 0) return `${season.name}: beans grow at their usual pace`;
	return `${season.name}: beans grow ${Math.abs(pct)}% ${pct > 0 ? 'faster' : 'slower'}`;
}

// `cold` multiplies growth in a cold season with no greenhouse (a New Game+ rule).
export function growthMult(season, weather, mods, cold = 1) {
	const s = !season.cold ? season.growth : mods.greenhouse ? 1 : season.growth * cold;
	return s * (weather?.growth ?? 1);
}
