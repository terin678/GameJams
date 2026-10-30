// The job tree. Saved progress is only { jobId: xp }; levels and unlocks are
// always derived from it, so changing the curve or the tree never breaks a save.
// curve: { base, growth, maxLevel }. Going from level L to L+1 costs
// round(base * growth^(L-1)).

export function xpForLevel(level, curve) {
	let total = 0;
	for (let l = 1; l < level; l++) total += Math.round(curve.base * curve.growth ** (l - 1));
	return total;
}

export function levelFromXp(xp, curve) {
	let level = 1, floor = 0;
	while (level < curve.maxLevel) {
		const need = Math.round(curve.base * curve.growth ** (level - 1));
		if (xp < floor + need) return { level, into: xp - floor, need, max: false };
		floor += need;
		level++;
	}
	return { level, into: 0, need: 0, max: true };
}

export function jobLevels(xpMap, jobs, curve) {
	const out = {};
	for (const id of Object.keys(jobs)) out[id] = levelFromXp(xpMap[id] ?? 0, curve).level;
	return out;
}

export const isUnlocked = (job, levels) => job.unlock.every(r => (levels[r.job] ?? 1) >= r.level);

export function unlockedJobs(xpMap, jobs, curve) {
	const levels = jobLevels(xpMap, jobs, curve);
	return Object.keys(jobs).filter(id => isUnlocked(jobs[id], levels));
}

export function lockReason(job, levels, jobs) {
	return job.unlock
		.filter(r => (levels[r.job] ?? 1) < r.level)
		.map(r => `${jobs[r.job].name} Lv ${r.level} (now ${levels[r.job] ?? 1})`)
		.join(' + ');
}

// While a job is the active one: its base stats plus every node it has reached.
// Mastery nodes are left out here because masteryMods applies them all the time.
export function equippedMods(job, level) {
	const mods = Object.entries(job.stats).map(([stat, add]) => ({ stat, add }));
	for (const n of job.nodes) if (!n.mastery && level >= n.level) mods.push({ stat: n.stat, add: n.add });
	return mods;
}

export function masteryMods(levels, jobs) {
	const mods = [];
	for (const [id, job] of Object.entries(jobs)) {
		for (const n of job.nodes) if (n.mastery && (levels[id] ?? 1) >= n.level) mods.push({ stat: n.stat, add: n.add });
	}
	return mods;
}

// Kills during a run credit only the job active at the time.
export function creditJobXp(runXp, jobId, amount) {
	runXp[jobId] = (runXp[jobId] ?? 0) + amount;
	return runXp;
}

// Saved XP plus what this run has earned so far: what levels jobs mid-run.
export function liveXp(saved, runXp) {
	const out = { ...saved };
	for (const [id, xp] of Object.entries(runXp)) out[id] = (out[id] ?? 0) + xp;
	return out;
}

// Credit the active job and report whether that crossed a level.
export function gainJobXp(saved, runXp, jobId, amount, curve) {
	const before = levelFromXp((saved[jobId] ?? 0) + (runXp[jobId] ?? 0), curve).level;
	creditJobXp(runXp, jobId, amount);
	const after = levelFromXp((saved[jobId] ?? 0) + runXp[jobId], curve).level;
	return { from: before, to: after };
}

export function awardJobXp(saved, runXp, curve) {
	const cap = xpForLevel(curve.maxLevel, curve);
	const out = { ...saved };
	for (const [id, xp] of Object.entries(runXp)) out[id] = Math.min(cap, (out[id] ?? 0) + xp);
	return out;
}

export function newlyUnlocked(beforeXp, afterXp, jobs, curve) {
	const before = new Set(unlockedJobs(beforeXp, jobs, curve));
	return unlockedJobs(afterXp, jobs, curve).filter(id => !before.has(id));
}
