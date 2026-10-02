import { TUNING } from '../data/tuning.js';
import { SOUNDS } from '../data/sounds.js';
import { createStore, createScoreTable } from '../../../../shared/storage.js';
import { Sfx } from '../../../../shared/sfx.js';
import { Boot } from './scenes/Boot.js';
import { Menu } from './scenes/Menu.js';
import { Play } from './scenes/Play.js';
import { Pause } from './scenes/Pause.js';
import { GameOver } from './scenes/GameOver.js';

document.addEventListener('contextmenu', e => e.preventDefault());

window.addEventListener('load', () => {
	const game = new Phaser.Game({
		parent: 'game',
		width: TUNING.width,
		height: TUNING.height,
		type: Phaser.AUTO,
		backgroundColor: '#0c0f1a',
		pixelArt: true,
		scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
	});

	window.game = game; // debugging convenience

	const store = createStore('superposition');
	game.registry.set('store', store);
	game.registry.set('scores', createScoreTable(store));
	game.registry.set('sfx', new Sfx(SOUNDS, { muted: store.get('muted', false) }));

	game.scene.add('Boot', Boot);
	game.scene.add('Menu', Menu);
	game.scene.add('Play', Play);
	game.scene.add('Pause', Pause);
	game.scene.add('GameOver', GameOver);
	game.scene.start('Boot');
});
