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
export function rollWeather(rng, weather) {
	let r = rng.next();
	for (const w of weather) {
		if (r < w.chance) return w;
		r -= w.chance;
	}
	return null;
}

export function growthMult(season, weather, mods) {
	const s = season.cold && mods.greenhouse ? 1 : season.growth;
	return s * (weather?.growth ?? 1);
}
