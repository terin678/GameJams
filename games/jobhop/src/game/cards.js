// How a level-up card reads on screen.
import { JOBS } from '../data/jobs.js';
import { ATTACKS } from '../data/abilities.js';
import { STATS, PASSIVES } from '../data/passives.js';
import { TUNING } from '../data/tuning.js';
import { formatMod } from '../core/stats.js';

const PER_LEVEL_TEXT = {
	damage: v => `+${Math.round(v * 100)}% damage`,
	area: v => `+${Math.round(v * 100)}% size`,
	cooldown: v => `${Math.round(v * 100)}% faster`,
	count: v => (v >= 1 ? `+${v} shots` : `+1 shot every ${Math.round(1 / v)} levels`),
};

export function describeCard(card, activeId) {
	if (card.kind === 'attack') {
		const def = ATTACKS[card.id];
		const job = JOBS[card.job];
		const lines = Object.entries(def.perLevel ?? {}).map(([k, v]) => PER_LEVEL_TEXT[k](v));
		return {
			icon: job.sprite,
			title: def.name,
			sub: `${job.name}${card.job === activeId ? '' : ' (benched)'}`,
			level: `Lv ${card.level} / ${TUNING.attackMaxLevel}`,
			body: lines.join('\n'),
			color: '#9ff0fa',
		};
	}
	if (card.kind === 'passive') {
		const p = PASSIVES[card.id];
		return {
			icon: 'gem',
			title: p.name,
			sub: 'Accessory',
			level: `Lv ${card.level} / ${p.max}`,
			body: formatMod(STATS, p.stat, p.perLevel),
			color: '#f2d544',
		};
	}
	return { icon: 'potion', title: 'Hi-Potion', sub: 'Everything is maxed', level: '', body: `Restore ${Math.round(TUNING.gems.potionHeal * 100)}% HP`, color: '#6fe07a' };
}
