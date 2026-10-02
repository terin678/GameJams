// Duck forms (weapon power-ups), 1943-style: timed, level up on repeat pickups.

export function createPower(defaultForm) {
	return { form: defaultForm, level: 1, until: Infinity };
}

// Returns 'swap' | 'levelup' | 'max'. Your level carries over when you swap.
export function collect(p, form, nowMs, cfg) {
	let result;
	if (form === p.form) {
		result = p.level < cfg.maxLevel ? 'levelup' : 'max';
		p.level = Math.min(cfg.maxLevel, p.level + 1);
	} else {
		p.form = form;
		result = 'swap';
	}
	p.until = nowMs + cfg.durationMs;
	return result;
}

// Returns true the moment a form runs out (and reverts to the default).
export function tickPower(p, nowMs, defaultForm) {
	if (nowMs < p.until) return false;
	p.form = defaultForm;
	p.level = 1;
	p.until = Infinity;
	return true;
}

export const remaining = (p, nowMs) => (p.until === Infinity ? Infinity : Math.max(0, p.until - nowMs));

export const levelDef = (form, level) => form.levels[Math.min(Math.max(level, 1), form.levels.length) - 1];
