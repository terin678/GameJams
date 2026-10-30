// The graphics setting as one object in the registry: Menu and Pause cycle
// it, Play feeds it frame times, and Fx asks it for the current preset.
import { GRAPHICS_ORDER, QUALITY_LEVELS, PRESETS, AUTO } from '../data/graphics.js';
import { loadGraphics, nextGraphics, createAutoQuality, sampleFrame, resolvePreset, describeGraphics } from '../core/graphics.js';

export function createQuality(store) {
	return {
		setting: loadGraphics(store.get('graphics'), GRAPHICS_ORDER),
		auto: createAutoQuality(QUALITY_LEVELS),
		get preset() { return resolvePreset(this.setting, this.auto, PRESETS); },
		get label() { return describeGraphics(this.setting, this.auto); },
		cycle() {
			this.setting = nextGraphics(this.setting, GRAPHICS_ORDER);
			store.set('graphics', this.setting);
		},
		// Returns the new level when AUTO steps down, else null.
		sample(ms) {
			return this.setting === 'auto' ? sampleFrame(this.auto, ms, AUTO, QUALITY_LEVELS) : null;
		},
	};
}
