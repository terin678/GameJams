// Builds the phone-app copy of Beanstalk into app/www: one minified script, the
// page, the icons and the privacy page. The website does not use this; it keeps
// serving the readable files in games/beanstalk as they are.
//
//   npm run build:app          the testing build
//   npm run build:app:ship     the shipping build, for the store
//
// The shipping build also leaves out everything that is only there for
// development and testing: the bug and idea links and the "in testing" note
// (anything between <!-- test-only --> markers in the page), the `game`
// console handle, the #perf meter, and any console output. app/www/build.txt
// says which of the two was built; the Android release build refuses to run
// on anything but "ship".
//
// The app copy differs from the website in three ways: the code is bundled and
// minified with no source map, there is no service worker (an app is already
// offline), and nothing is counted (no analytics script is loaded).

import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const game = new URL('games/beanstalk/', root);
const out = new URL('app/www/', root);

// The page for the app: the two module scripts become one bundled script, and
// the things that only make sense on the website (the manifest, the link back
// to the other games) are taken out.
export function appHtml(html, { ship = false } = {}) {
	const scripts = /\t<script type="module" src="src\/game\/main\.js"><\/script>\n\t<script type="module">[\s\S]*?<\/script>\n/;
	if (!scripts.test(html)) throw new Error('the page scripts are not where build-app expects them');
	const testOnly = /[ \t]*<!-- test-only[^>]*-->\n[\s\S]*?<!-- \/test-only -->\n/g;
	return (ship ? html.replace(testOnly, '') : html)
		.replace(scripts, '\t<script type="module" src="app.js"></script>\n')
		.replace(/\t<!-- Installable:[^\n]*-->\n/, '')
		.replace(/\t<link rel="manifest"[^\n]*\n/, '')
		.replace(/\t\t\t<a href="\.\.\/\.\.\/">[^\n]*\n/, '');
}

export async function buildApp({ ship = false } = {}) {
	const { build } = await import('esbuild');
	rmSync(out, { recursive: true, force: true });
	mkdirSync(out, { recursive: true });
	await build({
		entryPoints: [fileURLToPath(new URL('src/game/main.js', game))],
		outfile: fileURLToPath(new URL('app.js', out)),
		bundle: true,
		minify: true,
		format: 'esm',
		target: 'es2020',
		sourcemap: false,
		legalComments: 'none',
		drop: ship ? ['console', 'debugger'] : [],
		// main.js checks these to leave out what only the website, or only testing, needs.
		define: { 'globalThis.BEANSTALK_APP': 'true', 'globalThis.BEANSTALK_SHIP': String(ship) },
	});
	writeFileSync(new URL('index.html', out), appHtml(readFileSync(new URL('index.html', game), 'utf8'), { ship }));
	writeFileSync(new URL('build.txt', out), ship ? 'ship\n' : 'test\n');
	cpSync(new URL('icons/', game), new URL('icons/', out), { recursive: true });
	cpSync(new URL('privacy.html', game), new URL('privacy.html', out));
	return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const ship = process.argv.includes('--ship');
	const where = await buildApp({ ship });
	const size = readFileSync(new URL('app.js', where)).length;
	console.log(`app/www built (${ship ? 'shipping' : 'testing'}): app.js is ${(size / 1024).toFixed(0)} KB`);
}
