// The graphics quality setting. The player picks AUTO, HIGH, MEDIUM or LOW;
// AUTO starts at the top level and steps down while frames run slow. It never
// steps back up during a session, so it cannot flicker between levels.

export const loadGraphics = (raw, order) => (order.includes(raw) ? raw : order[0]);

export const nextGraphics = (current, order) => order[(order.indexOf(current) + 1) % order.length];

export const createAutoQuality = levels => ({ level: levels[0], ms: 0, frames: 0, slow: 0 });

// Feed it every frame's delta. Frames are averaged over windows of
// cfg.windowMs; after cfg.windows slow windows in a row (average above
// cfg.slowMs) the level drops one step. Deltas above cfg.ignoreMs are a tab
// switch or a hitch, not a slow device, and are skipped.
// Returns the new level when it changes, else null.
export function sampleFrame(s, ms, cfg, levels) {
	if (ms > cfg.ignoreMs) return null;
	s.ms += ms;
	s.frames++;
	if (s.ms < cfg.windowMs) return null;
	const avg = s.ms / s.frames;
	s.ms = 0;
	s.frames = 0;
	s.slow = avg > cfg.slowMs ? s.slow + 1 : 0;
	const i = levels.indexOf(s.level);
	if (s.slow < cfg.windows || i >= levels.length - 1) return null;
	s.slow = 0;
	s.level = levels[i + 1];
	return s.level;
}

export const resolvePreset = (setting, auto, presets) => presets[setting === 'auto' ? auto.level : setting];

export const describeGraphics = (setting, auto) => (setting === 'auto' ? `AUTO (${auto.level})` : setting.toUpperCase());

// How many particles a burst of `n` gets at this preset.
export const scaleCount = (n, preset) => Math.round(n * preset.particles);
