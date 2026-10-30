import { TUNING, DEFAULT_PICKS } from '../data/tuning.js';
import { SOUNDS } from '../data/sounds.js';
import { JOBS } from '../data/jobs.js';
import { unlockedJobs } from '../core/jobs.js';
import { loadJobXp, loadPicks } from '../core/save.js';
import { createStore, createScoreTable } from '../../../../shared/storage.js';
import { Sfx } from '../../../../shared/sfx.js';
import { createQuality } from './quality.js';
import { Boot } from './scenes/Boot.js';
import { Menu } from './scenes/Menu.js';
import { Jobs } from './scenes/Jobs.js';
import { Play } from './scenes/Play.js';
import { LevelUp } from './scenes/LevelUp.js';
import { Pause } from './scenes/Pause.js';
import { GameOver } from './scenes/GameOver.js';

document.addEventListener('contextmenu', e => e.preventDefault());

window.addEventListener('load', () => {
	const game = new Phaser.Game({
		parent: 'game',
		width: TUNING.width,
		height: TUNING.height,
		type: Phaser.AUTO,
		backgroundColor: '#14121c',
		pixelArt: true,
		scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
		input: { activePointers: 3 },
	});

	window.game = game; // debugging convenience

	const store = createStore('jobhop');
	const jobXp = loadJobXp(store.get('jobXp', {}), JOBS);
	game.registry.set('store', store);
	game.registry.set('scores', createScoreTable(store));
	game.registry.set('sfx', new Sfx(SOUNDS, { muted: store.get('muted', false) }));
	game.registry.set('quality', createQuality(store));
	game.registry.set('jobXp', jobXp);
	game.registry.set('picks', loadPicks(store.get('picks'), unlockedJobs(jobXp, JOBS, TUNING.jobXp), DEFAULT_PICKS));

	// Order matters: later scenes render on top.
	game.scene.add('Boot', Boot);
	game.scene.add('Menu', Menu);
	game.scene.add('Jobs', Jobs);
	game.scene.add('Play', Play);
	game.scene.add('LevelUp', LevelUp);
	game.scene.add('Pause', Pause);
	game.scene.add('GameOver', GameOver);
	game.scene.start('Boot');
});
