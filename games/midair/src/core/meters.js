// Energy (health, drains like 1943's fuel) and gut (bomb ammo, regenerates).
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export function createMeters(cfg) {
	return { energy: cfg.energyMax, gut: cfg.gutMax, energyMax: cfg.energyMax, gutMax: cfg.gutMax };
}

export function tickMeters(m, dtSec, cfg) {
	m.energy = clamp(m.energy - cfg.energyDrain * dtSec, 0, m.energyMax);
	m.gut = clamp(m.gut + cfg.gutRegen * dtSec, 0, m.gutMax);
	return m;
}

export function damage(m, amount) {
	m.energy = clamp(m.energy - amount, 0, m.energyMax);
	return m;
}

export function feed(m, { energy = 0, gut = 0 }) {
	m.energy = clamp(m.energy + energy, 0, m.energyMax);
	m.gut = clamp(m.gut + gut, 0, m.gutMax);
	return m;
}

export function trySpend(m, cost) {
	if (m.gut < cost) return false;
	m.gut -= cost;
	return true;
}

export const isDead = m => m.energy <= 0;
