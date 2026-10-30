import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describeCard } from '../../games/jobhop/src/game/cards.js';
import { JOBS } from '../../games/jobhop/src/data/jobs.js';
import { ATTACKS } from '../../games/jobhop/src/data/abilities.js';
import { PASSIVES } from '../../games/jobhop/src/data/passives.js';

// A new perLevel key without card text would crash the level-up screen mid-run.
test('every attack of every job reads as a card', () => {
	for (const [jobId, job] of Object.entries(JOBS)) {
		for (const id of job.attacks) {
			const d = describeCard({ kind: 'attack', id, job: jobId, level: 2 }, jobId);
			assert.equal(d.title, ATTACKS[id].name);
			assert.ok(d.body.length > 0, `${id} has no upgrade text`);
			assert.ok(!d.body.includes('undefined') && !d.body.includes('NaN'), d.body);
		}
	}
});

test('benched jobs say so; passives and the potion read cleanly', () => {
	assert.match(describeCard({ kind: 'attack', id: 'slash', job: 'swordsman', level: 2 }, 'mage').sub, /benched/);
	for (const id of Object.keys(PASSIVES)) {
		const d = describeCard({ kind: 'passive', id, level: 1 }, 'mage');
		assert.match(d.body, /^[+-]\d/);
	}
	assert.match(describeCard({ kind: 'heal' }, 'mage').body, /HP/);
});
