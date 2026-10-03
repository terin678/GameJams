// The Exchange: buy crates of beans when they are cheap, sell when they are dear.
//
// The price of a crate follows the year: each season has its own level
// (cheapest at harvest, dearest when the barns are empty) and the price drifts
// smoothly from one to the next. On top of that the weather pushes it about
// (rain means a glut, a dry spell a shortage) and there is a little noise; a
// push fades over a minute or so. The board is repriced every few seconds, and
// all trades are at the price on the board. Selling pays a small fee, so
// trading back and forth for nothing loses money.
//
// `X` is EXCHANGE from data/exchange.js. state.exchange is
//   { open, price, history: [prices], acc, shock, crates, paid, profit }
// where `paid` is what the crates held cost and `profit` is the lifetime total.

export const createExchange = () => ({
	open: false, price: 0, history: [], acc: 0, shock: 0, crates: 0, paid: 0, profit: 0,
});

export const unlockDue = (state, X) => !state.exchange.open && state.phase >= X.unlock.phase && state.grown >= X.unlock.grown;

// How far through the year the clock is, 0 to 1. `t` is TUNING.calendar.
export const yearFrac = (clock, seasons, t) =>
	((clock.day + clock.dayT / t.daySeconds) / (seasons.length * t.daysPerSeason)) % 1;

// The seasonal level at a point in the year: each season's factor holds in
// the middle of that season, with a straight line between one middle and the next.
export function seasonFactor(frac, factors) {
	const n = factors.length;
	const pos = frac * n - 0.5;
	const i = Math.floor(pos);
	const a = factors[((i % n) + n) % n];
	const b = factors[(((i + 1) % n) + n) % n];
	return a + (b - a) * (pos - i);
}

const quote = (state, X, seasons, t) =>
	X.base * seasonFactor(yearFrac(state, seasons, t), seasons.map(s => X.seasons[s.id])) * (1 + state.exchange.shock);

function post(state, X, seasons, t) {
	const ex = state.exchange;
	ex.price = quote(state, X, seasons, t);
	ex.history.push(ex.price);
	if (ex.history.length > X.history) ex.history.splice(0, ex.history.length - X.history);
}

export function openExchange(state, X, seasons, t) {
	state.exchange.open = true;
	post(state, X, seasons, t);
}

const clamp = (v, limit) => Math.max(-limit, Math.min(limit, v));

// A spell of weather pushes the price.
export function kick(state, weatherId, X) {
	const ex = state.exchange;
	if (ex.open) ex.shock = clamp(ex.shock + (X.weather[weatherId] ?? 0), X.maxShock);
}

// Call every tick. Returns true when the board has just been repriced.
export function step(state, dt, X, seasons, t, rng) {
	const ex = state.exchange;
	if (!ex.open) return false;
	ex.shock *= Math.exp(-dt / X.revertSeconds);
	ex.acc += dt;
	if (ex.acc < X.sampleSeconds) return false;
	ex.acc = 0;
	ex.shock = clamp(ex.shock + (rng.next() * 2 - 1) * X.noise, X.maxShock);
	post(state, X, seasons, t);
	return true;
}

// Spends `share` of your coins on crates.
export function buy(state, share, X) {
	const ex = state.exchange;
	const spend = state.coins * share;
	if (!ex.open || !X.shares.includes(share) || !(spend > 0) || !(ex.price > 0)) return false;
	state.coins -= spend;
	ex.crates += spend / ex.price;
	ex.paid += spend;
	return true;
}

// Sells `share` of your crates.
export function sell(state, share, X) {
	const ex = state.exchange;
	if (!ex.open || !X.shares.includes(share) || !(ex.crates > 0)) return false;
	const net = ex.crates * share * ex.price * (1 - X.fee);
	const cost = ex.paid * share;
	state.coins += net;
	ex.profit += net - cost;
	// Selling everything leaves exactly nothing, whatever the rounding.
	ex.crates = share === 1 ? 0 : ex.crates * (1 - share);
	ex.paid = share === 1 ? 0 : ex.paid - cost;
	return true;
}

// What the crates held would fetch at the price on the board, before the fee.
export const valueOf = ex => ex.crates * ex.price;
export const averageCost = ex => (ex.crates > 0 ? ex.paid / ex.crates : 0);

export function validateExchange(X, { seasons, weather, phases }) {
	const errors = [];
	if (!phases.includes(X.unlock?.phase)) errors.push('unlock.phase is not a phase');
	if (!(X.unlock?.grown >= 0)) errors.push('unlock.grown is missing');
	if (!X.log) errors.push('log is missing');
	if (!X.hint) errors.push('hint is missing');
	if (!(X.base > 0)) errors.push('base must be > 0');
	for (const id of seasons) if (!(X.seasons?.[id] > 0)) errors.push(`no price for ${id}`);
	for (const id of Object.keys(X.seasons ?? {})) if (!seasons.includes(id)) errors.push(`unknown season "${id}"`);
	if (new Set(Object.values(X.seasons ?? {})).size < 2) errors.push('the price never changes with the seasons');
	for (const [id, v] of Object.entries(X.weather ?? {})) {
		if (!weather.includes(id)) errors.push(`unknown weather "${id}"`);
		else if (!(Math.abs(v) > 0 && Math.abs(v) < 1)) errors.push(`weather ${id}: push must be between -1 and 1, and not 0`);
	}
	if (!(X.noise >= 0 && X.noise < 1)) errors.push('noise must be in [0, 1)');
	if (!(X.revertSeconds > 0)) errors.push('revertSeconds must be > 0');
	if (!(X.maxShock > 0 && X.maxShock < 1)) errors.push('maxShock must be in (0, 1)');
	if (!(X.sampleSeconds > 0)) errors.push('sampleSeconds must be > 0');
	if (!(X.history >= 2)) errors.push('history must hold at least 2 prices');
	if (!(X.fee >= 0 && X.fee < 1)) errors.push('fee must be in [0, 1)');
	for (const s of X.shares ?? []) if (!(s > 0 && s <= 1)) errors.push(`share ${s} must be in (0, 1]`);
	if (!X.shares?.includes(1)) errors.push('there must be a way to sell everything (a share of 1)');
	return errors;
}
