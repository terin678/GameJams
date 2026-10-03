// Takes the Play Store pictures from the Android app running on an emulator:
// phone screenshots of a few good moments, and the 1024x500 feature graphic.
// They are written to app/store/.
//
// Needs Node 22 (for WebSocket), the debug app installed on a running
// emulator, and adb. From the repository root:
//
//   npx --yes node@22 tools/store-shots.mjs
//
// It drives the game through the WebView's debugging port: sets up a farm,
// lets the app save and reload it, poses the scene, and asks adb for the screen.
// The emulator's screen is set to 1080x1920 for the session, because Play
// does not accept screenshots more than twice as tall as they are wide.

import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ADB = join(process.env.LOCALAPPDATA ?? '', 'Android/Sdk/platform-tools/adb.exe');
const APP = 'com.veracity.beanstalk';
const OUT = new URL('../app/store/', import.meta.url);
const adb = (...args) => execFileSync(ADB, args, { maxBuffer: 64 * 1024 * 1024 });
const sleep = ms => new Promise(r => setTimeout(r, ms));

// One connection to the page; reconnects after a reload.
async function page() {
	const pid = adb('shell', 'pidof', APP).toString().trim();
	adb('forward', 'tcp:9222', `localabstract:webview_devtools_remote_${pid}`);
	const targets = await (await fetch('http://127.0.0.1:9222/json')).json();
	const ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
	await new Promise((ok, fail) => { ws.onopen = ok; ws.onerror = fail; });
	let id = 0;
	const waiting = new Map();
	ws.onmessage = e => {
		const msg = JSON.parse(e.data);
		waiting.get(msg.id)?.(msg);
		waiting.delete(msg.id);
	};
	return {
		async run(code) {
			const msg = await new Promise(ok => {
				waiting.set(++id, ok);
				ws.send(JSON.stringify({ id, method: 'Runtime.evaluate', params: { expression: `(() => { ${code} })()`, returnByValue: true, awaitPromise: true } }));
			});
			if (msg.result?.exceptionDetails) throw new Error(JSON.stringify(msg.result.exceptionDetails.exception?.description ?? msg.result.exceptionDetails));
			return msg.result?.result?.value;
		},
		close: () => ws.close(),
	};
}

// A farm is set up in two steps: what is owned (saved, then reloaded so the
// game works out what it all adds up to), then the pose for the picture.
const OWN_1 = { plot: 11, farmhand: 6, watering_can: 1, scarecrow: 1, rain_barrel: 1, market_stall: 1, accountant: 1, compost: 1, bean_cart: 1, sprinkler: 1, greenhouse: 1, road_sign: 1 };
const OWN_2 = { ...OWN_1, farmhand: 8, adding_machine: 1, heirloom: 1, heated_beds: 1, county_fair: 1, library: 1, scholar: 3, field: 6, drone_design: 1, drone: 8, jingle: 1, billboard: 1, gene_pods: 1 };
const OWN_3 = { ...OWN_2, field: 9, drone: 12, canopy_solar: 1, seed_probe: 1, self_planting: 1, lunar_soil: 1, orbital_greenhouse: 1, solar_trellis: 1 };
const friends = hearts => `for (const [id, n] of Object.entries(${JSON.stringify(hearts)})) if (s.friends[id]) s.friends[id].points = n * 100;`;
const tab = id => `[...document.querySelectorAll('#tabs button')].find(b => b.dataset.tab === '${id}')?.click();`;
const SCENES = [
	{
		name: '1-first-farm',
		setup: `s.grown = 900; s.coins = 310; s.owned = { plot: 5, farmhand: 2, watering_can: 1, scarecrow: 1, rain_barrel: 1, market_stall: 1 };`,
		pose: `s.day = 1; s.dayT = 14; s.weather = null; ${friends({ marigold: 3, bram: 1 })} scrollTo(0, 0);`,
	},
	{
		name: '2-raid',
		setup: `s.grown = 9000; s.coins = 5200; s.owned = ${JSON.stringify(OWN_1)};`,
		pose: `s.day = 4; s.dayT = 30; s.weather = null; ${friends({ marigold: 5, bram: 3, wren: 2 })}
			Object.assign(s.guard, { open: true, posts: 4, wins: 5, losses: 1, roster: { duck: 2, cat: 2 }, wave: { slug: 4, mouse: 2 },
				fight: { foes: { slug: 3, mouse: 2 }, up: { duck: 2, cat: 1 }, t: 0 }, acc: -1e6, said: '' });
			${tab('guard')} scrollTo(0, 0);`,
	},
	{
		name: '3-guard-tab',
		setup: null,
		pose: `document.getElementById('tabs').scrollIntoView({ block: 'start' }); scrollBy(0, -70);`,
	},
	{
		name: '4-into-the-clouds',
		setup: `s.grown = 9e5; s.coins = 2.4e6; s.pages = 640; s.owned = ${JSON.stringify(OWN_2)};`,
		pose: `s.day = 7; s.dayT = 44; s.weather = null; ${friends({ marigold: 7, bram: 5, wren: 4, pell: 3, quill: 2 })}
			s.guard.fight = null; s.guard.acc = 0; s.guard.nextAt = s.time + 95; s.seeds.ribbons = { size: 1, vigour: 1, flavour: 1 };
			Object.assign(s.climb, { open: true, ledge: 3, waiting: true, climbing: null, finds: ['sun_cuttings', 'goose'], anger: 0, said: '' });
			${tab('climb')} scrollTo(0, 0);`,
	},
	{
		name: '5-the-climb',
		setup: null,
		pose: `document.getElementById('tabs').scrollIntoView({ block: 'start' }); scrollBy(0, -70);`,
	},
	{
		name: '6-night-in-space',
		setup: `s.grown = 4e13; s.coins = 9e8; s.pages = 5200; s.matter = 3e9; s.probes = 6e9; s.owned = ${JSON.stringify(OWN_3)};`,
		pose: `s.day = 10; s.dayT = 57; s.weather = null; s.guard.fight = null; s.guard.nextAt = s.time + 120;
			Object.assign(s.blight, { open: true, amount: 2.4e8, share: 0.1, level: 0 });
			${tab('projects')} scrollTo(0, 0);`,
	},
];

mkdirSync(OUT, { recursive: true });
adb('shell', 'wm', 'size', '1080x1920');
try {
	adb('shell', 'am', 'force-stop', APP);
	adb('shell', 'pm', 'clear', APP);
	adb('shell', 'am', 'start', '-n', `${APP}/.MainActivity`);
	await sleep(6000);
	let p = await page();
	for (const scene of SCENES) {
		if (scene.setup) {
			await p.run(`const s = game.state; ${scene.setup} dispatchEvent(new Event('pagehide')); location.reload();`);
			p.close();
			await sleep(4000);
			p = await page();
			await p.run(`document.getElementById('away-ok').click(); game.skip(3);`);
		}
		await p.run(`const s = game.state; ${scene.pose}`);
		await sleep(1500);
		await p.run(`const s = game.state; ${scene.pose.includes('dayT') ? scene.pose.match(/s\.day = \d+; s\.dayT = \d+;/)[0] : ''}`);
		await sleep(700);
		writeFileSync(new URL(`${scene.name}.png`, OUT), adb('exec-out', 'screencap', '-p'));
		console.log(`wrote ${scene.name}.png`);
		if (scene.name.startsWith('4')) {
			// The feature graphic: the farm at dusk on the right, the name on the left.
			const data = await p.run(`
				const farm = document.getElementById('farm');
				const c = document.createElement('canvas');
				c.width = 1024; c.height = 500;
				const g = c.getContext('2d');
				g.imageSmoothingEnabled = false;
				g.fillStyle = '#10131c';
				g.fillRect(0, 0, 1024, 500);
				g.drawImage(farm, 0, 70, 240, 250, 544, 0, 480, 500);
				const fade = g.createLinearGradient(544, 0, 610, 0);
				fade.addColorStop(0, '#10131c');
				fade.addColorStop(1, 'rgba(16, 19, 28, 0)');
				g.fillStyle = fade;
				g.fillRect(544, 0, 70, 500);
				g.fillStyle = '#e8ecf4';
				g.font = 'bold 76px monospace';
				g.fillText('BEANSTALK', 56, 230);
				g.fillStyle = '#6fdc55';
				g.font = '30px monospace';
				g.fillText('Plant one bean.', 60, 292);
				g.fillText('Keep going.', 60, 332);
				return c.toDataURL('image/png').split(',')[1];`);
			writeFileSync(new URL('feature-graphic.png', OUT), Buffer.from(data, 'base64'));
			console.log('wrote feature-graphic.png');
		}
	}
	p.close();
} finally {
	adb('shell', 'wm', 'size', 'reset');
	adb('forward', '--remove-all');
}
