import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	xpForLevel, levelFromXp, jobLevels, isUnlocked, unlockedJobs, lockReason,
	equippedMods, masteryMods, creditJobXp, awardJobXp, newlyUnlocked, liveXp, gainJobXp,
} from '../../games/jobhop/src/core/jobs.js';
import { JOBS as REAL } from '../../games/jobhop/src/data/jobs.js';
import { TUNING } from '../../games/jobhop/src/data/tuning.js';

const CURVE = { base: 10, growth: 2, maxLevel: 4 };
// Levels need 10, 20, 40 more xp: cumulative 0, 10, 30, 70.
const JOBS = {
	a: { name: 'A', tier: 'basic', unlock: [], stats: { might: 0.1 }, nodes: [
		{ level: 2, stat: 'area', add: 0.1 },
		{ level: 4, stat: 'maxHp', add: 20, mastery: true },
	] },
	b: { name: 'B', tier: 'basic', unlock: [], stats: {}, nodes: [] },
	c: { name: 'C', tier: 'advanced', unlock: [{ job: 'a', level: 3 }], stats: {}, nodes: [] },
	d: { name: 'D', tier: 'advanced', unlock: [{ job: 'b', level: 3 }], stats: {}, nodes: [] },
	e: { name: 'E', tier: 'expert', unlock: [{ job: 'c', level: 4 }, { job: 'd', level: 4 }], stats: {}, nodes: [] },
};

test('xpForLevel is cumulative and level 1 is free', () => {
	assert.deepEqual([1, 2, 3, 4].map(l => xpForLevel(l, CURVE)), [0, 10, 30, 70]);
});

test('levelFromXp reports progress into the level and caps at max', () => {
	assert.deepEqual(levelFromXp(0, CURVE), { level: 1, into: 0, need: 10, max: false });
	assert.deepEqual(levelFromXp(15, CURVE), { level: 2, into: 5, need: 20, max: false });
	assert.deepEqual(levelFromXp(30, CURVE), { level: 3, into: 0, need: 40, max: false });
	assert.deepEqual(levelFromXp(999, CURVE), { level: 4, into: 0, need: 0, max: true });
});

test('basic jobs are always unlocked; others need every requirement', () => {
	assert.deepEqual(unlockedJobs({}, JOBS, CURVE), ['a', 'b']);
	assert.deepEqual(unlockedJobs({ a: 30 }, JOBS, CURVE), ['a', 'b', 'c']);
	assert.deepEqual(unlockedJobs({ a: 70, b: 70, c: 70 }, JOBS, CURVE), ['a', 'b', 'c', 'd']);
	assert.deepEqual(unlockedJobs({ a: 70, b: 70, c: 70, d: 70 }, JOBS, CURVE), ['a', 'b', 'c', 'd', 'e']);
});

test('isUnlocked reads levels, missing jobs count as level 1', () => {
	assert.equal(isUnlocked(JOBS.c, {}), false);
	assert.equal(isUnlocked(JOBS.c, { a: 3 }), true);
});

test('lockReason names what is missing, with current level', () => {
	assert.equal(lockReason(JOBS.e, { c: 4, d: 2 }, JOBS), 'D Lv 4 (now 2)');
	assert.equal(lockReason(JOBS.e, {}, JOBS), 'C Lv 4 (now 1) + D Lv 4 (now 1)');
	assert.equal(lockReason(JOBS.a, {}, JOBS), '');
});

test('equippedMods: job stats plus reached non-mastery nodes', () => {
	assert.deepEqual(equippedMods(JOBS.a, 1), [{ stat: 'might', add: 0.1 }]);
	assert.deepEqual(equippedMods(JOBS.a, 4), [{ stat: 'might', add: 0.1 }, { stat: 'area', add: 0.1 }]);
});

test('masteryMods apply from any job that reached them', () => {
	assert.deepEqual(masteryMods({ a: 3 }, JOBS), []);
	assert.deepEqual(masteryMods({ a: 4 }, JOBS), [{ stat: 'maxHp', add: 20 }]);
});

test('job XP is credited only to the job named', () => {
	const run = {};
	creditJobXp(run, 'a', 3);
	creditJobXp(run, 'a', 2);
	assert.deepEqual(run, { a: 5 });
});

test('liveXp adds run XP on top of the save without mutating it', () => {
	const saved = { a: 5 };
	assert.deepEqual(liveXp(saved, { a: 3, b: 2 }), { a: 8, b: 2 });
	assert.deepEqual(saved, { a: 5 });
});

test('gainJobXp credits the job and reports a level crossed mid-run', () => {
	const saved = { a: 8 }, run = {};
	assert.deepEqual(gainJobXp(saved, run, 'a', 1, CURVE), { from: 1, to: 1 });
	assert.deepEqual(gainJobXp(saved, run, 'a', 25, CURVE), { from: 1, to: 3 });
	assert.deepEqual(run, { a: 26 });
	assert.deepEqual(gainJobXp(saved, run, 'a', 500, CURVE), { from: 3, to: 4 }, 'stops at max level');
});

test('awardJobXp adds run XP to saved XP without mutating, capped at max level', () => {
	const saved = { a: 5, b: 60 };
	const after = awardJobXp(saved, { a: 10, b: 50 }, CURVE);
	assert.deepEqual(after, { a: 15, b: 70 });
	assert.deepEqual(saved, { a: 5, b: 60 });
});

test('newlyUnlocked lists jobs unlocked by this run', () => {
	assert.deepEqual(newlyUnlocked({ a: 20 }, { a: 30 }, JOBS, CURVE), ['c']);
	assert.deepEqual(newlyUnlocked({ a: 30 }, { a: 40 }, JOBS, CURVE), []);
});

test('jobLevels maps every job', () => {
	assert.deepEqual(jobLevels({ a: 30 }, JOBS, CURVE), { a: 3, b: 1, c: 1, d: 1, e: 1 });
});

test('real tree: Swordsman 5 unlocks Knight; Knight 8 + Black Mage 8 unlocks Paladin only', () => {
	const c = TUNING.jobXp;
	const at = l => xpForLevel(l, c);
	assert.ok(!unlockedJobs({ swordsman: at(4) }, REAL, c).includes('knight'));
	assert.ok(unlockedJobs({ swordsman: at(5) }, REAL, c).includes('knight'));
	const xp = { swordsman: at(5), mage: at(5), knight: at(8), blackmage: at(8) };
	const got = unlockedJobs(xp, REAL, c);
	assert.ok(got.includes('paladin'));
	assert.ok(!got.includes('ninja'));
});
