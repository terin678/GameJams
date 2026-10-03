// The colour of the light: time of day, season and weather. Pure maths on
// [r, g, b] colours; the farm view eases toward the target a little each frame,
// so every change blends, whatever caused it.
//
// `SKY` is data/sky.js. A key is { at: 0..1 through the day, color, amount, night }:
// the light is `color` at strength `amount`, and `night` (0..1) is how dark it is.

export const toRgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
export const toHex = rgb => '#' + rgb.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
export const mixRgb = (a, b, f) => a.map((v, i) => v + (b[i] - v) * f);

// The light at a moment of the day, interpolated between the keys either side.
export function lightAt(frac, keys) {
	const i = Math.max(1, keys.findIndex(k => k.at >= frac));
	const a = keys[i - 1];
	const b = keys[i];
	const f = b.at === a.at ? 0 : (frac - a.at) / (b.at - a.at);
	return {
		color: mixRgb(toRgb(a.color), toRgb(b.color), f),
		amount: a.amount + (b.amount - a.amount) * f,
		night: a.night + (b.night - a.night) * f,
	};
}

// What the sky and grass should look like right now.
// Returns { sky, grass, light: { color, amount }, night }.
export function skyTarget(frac, season, weather, SKY) {
	const light = lightAt(frac, SKY.keys);
	let sky = mixRgb(toRgb(season.sky), light.color, light.amount);
	let grass = toRgb(season.grass);
	if (weather?.tint) {
		// Weather shows less at night: there is less light for it to change.
		const amount = weather.tint.amount * (1 - light.night * SKY.weatherAtNight);
		sky = mixRgb(sky, toRgb(weather.tint.color), amount);
		grass = mixRgb(grass, toRgb(weather.tint.color), amount * SKY.groundShare);
	}
	return { sky, grass, light: { color: light.color, amount: light.amount * SKY.groundShare }, night: light.night };
}

// Moves a colour (or any list of numbers) toward its target; rate is per second.
export const ease = (current, target, dt, rate) => mixRgb(current, target, 1 - Math.exp(-dt * rate));

export const periodAt = (frac, periods) => (periods.find(p => frac < p.until) ?? periods.at(-1)).name;

export function validateSky(SKY) {
	const errors = [];
	const hex = /^#[0-9a-f]{6}$/i;
	const keys = SKY.keys ?? [];
	if (keys.length < 2) errors.push('needs at least two keys');
	if (keys[0]?.at !== 0 || keys.at(-1)?.at !== 1) errors.push('keys must run from at: 0 to at: 1');
	keys.forEach((k, i) => {
		if (i && k.at < keys[i - 1].at) errors.push(`key ${i} is out of order`);
		if (!hex.test(k.color)) errors.push(`key ${i}: "${k.color}" is not a colour`);
		for (const f of ['amount', 'night']) if (!(k[f] >= 0 && k[f] <= 1)) errors.push(`key ${i}: ${f} must be between 0 and 1`);
	});
	const first = keys[0];
	const last = keys.at(-1);
	if (first && last && (first.color !== last.color || first.amount !== last.amount || first.night !== last.night)) {
		errors.push('the last key must match the first, so midnight joins up');
	}
	if (!(SKY.easeRate > 0)) errors.push('easeRate must be > 0');
	for (const f of ['groundShare', 'weatherAtNight']) if (!(SKY[f] >= 0 && SKY[f] <= 1)) errors.push(`${f} must be between 0 and 1`);
	const periods = SKY.periods ?? [];
	if (!periods.length || periods.at(-1).until !== 1) errors.push('periods must end at until: 1');
	periods.forEach((p, i) => {
		if (!p.name) errors.push(`period ${i} has no name`);
		if (i && p.until <= periods[i - 1].until) errors.push(`period ${i} is out of order`);
	});
	return errors;
}
