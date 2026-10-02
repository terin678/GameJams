// Score with a kill-chain combo: every `perStep` kills inside the window adds x1.

export function createScore() {
	return { score: 0, combo: 0, bestCombo: 0, lastKillAt: -Infinity };
}

export const multiplier = (s, cfg) => Math.min(cfg.maxMult, 1 + Math.floor(s.combo / cfg.perStep));

export function tickCombo(s, nowMs, cfg) {
	if (s.combo && nowMs - s.lastKillAt > cfg.windowMs) s.combo = 0;
	return s;
}

// Returns the points awarded.
export function registerKill(s, base, nowMs, cfg, { bullseye = false } = {}) {
	tickCombo(s, nowMs, cfg);
	s.combo++;
	s.bestCombo = Math.max(s.bestCombo, s.combo);
	s.lastKillAt = nowMs;
	const points = base * (bullseye ? cfg.bullseyeMult : 1) * multiplier(s, cfg);
	s.score += points;
	return points;
}
