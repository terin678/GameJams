// The run's clock and outcome. Phases: play -> boss -> won | lost.

export const createRun = () => ({ t: 0, phase: 'play', kills: 0 });

export function tickRun(run, dt) {
	if (run.phase === 'play' || run.phase === 'boss') run.t += dt;
}

export function startBoss(run) {
	if (run.phase === 'play') run.phase = 'boss';
}

export function endRun(run, won) {
	if (run.phase === 'won' || run.phase === 'lost') return;
	run.phase = won ? 'won' : 'lost';
}

export const isOver = run => run.phase === 'won' || run.phase === 'lost';

export function formatTime(s) {
	const total = Math.floor(s);
	return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export const runScore = (run, winBonus) => Math.floor(run.t) + (run.phase === 'won' ? winBonus : 0);
