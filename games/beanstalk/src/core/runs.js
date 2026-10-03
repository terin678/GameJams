// New Game+: what changes on later runs. `golden` is the number of runs finished
// (one Golden Bean each); `RUNS` is data/runs.js.
//
// The world remembers: some journal lines have an "again" version.
// A twist each run: run n plays with the first n twists, each of which sets
// one or more rules. The rules and what reads them:
//   cold     multiplies growth in cold seasons without a greenhouse   (core/seasons.js growthMult)
//   crows    multiplies how often crows come                           (core/seasons.js rollWeather)
//   brave    chance a crow ignores the scarecrow                       (core/sim.js)
//   fairBar  added to every bar at the county fair                     (core/seeds.js fairBar)
//   giftWait multiplies how long a neighbour waits between gifts       (core/sim.js)

export const DEFAULT_RULES = { cold: 1, crows: 1, brave: 0, fairBar: 0, giftWait: 1 };

export const twistsFor = (golden, RUNS) => RUNS.twists.slice(0, Math.max(0, golden));

// The twist the next run would add, or null when they are all in play.
export const nextTwist = (golden, RUNS) => RUNS.twists[golden] ?? null;

export const rulesFor = (golden, RUNS) =>
	Object.assign({ ...DEFAULT_RULES }, ...twistsFor(golden, RUNS).map(t => t.rule));

// The usual line on a first run; the "again" line, if there is one, after that.
export const lineFor = (usual, again, golden) => (golden > 0 && again ? again : usual);

// The closing line of a run; the last one repeats once you run out.
export const endingLine = (golden, RUNS) => RUNS.endings[Math.min(golden, RUNS.endings.length - 1)];

export function validateRuns(RUNS, neighbours) {
	const errors = [];
	if (!RUNS.again?.start) errors.push('again.start is missing');
	if (!RUNS.again?.seeds) errors.push('again.seeds is missing');
	for (const n of neighbours) if (!RUNS.again?.neighbours?.[n.id]) errors.push(`again.neighbours.${n.id} is missing`);
	for (const id of Object.keys(RUNS.again?.neighbours ?? {})) {
		if (!neighbours.some(n => n.id === id)) errors.push(`again.neighbours: unknown neighbour "${id}"`);
	}
	if (!RUNS.endings?.length) errors.push('endings is empty');
	const ids = new Set();
	for (const t of RUNS.twists ?? []) {
		for (const k of ['id', 'name', 'text']) if (!t[k]) errors.push(`twist ${t.id}: ${k} is missing`);
		if (ids.has(t.id)) errors.push(`twist ${t.id} is listed twice`);
		ids.add(t.id);
		const keys = Object.keys(t.rule ?? {});
		if (!keys.length) errors.push(`twist ${t.id} changes nothing`);
		for (const k of keys) {
			if (!(k in DEFAULT_RULES)) errors.push(`twist ${t.id}: unknown rule "${k}"`);
			else if (typeof t.rule[k] !== 'number' || t.rule[k] < 0) errors.push(`twist ${t.id}: rule ${k} must be a number >= 0`);
		}
	}
	if (!RUNS.twists?.length) errors.push('twists is empty');
	return errors;
}
