// Beanstalk is developed in a private repository; only its built copy is
// published here. These checks stop source being put back by accident.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';

const dir = new URL('../../games/beanstalk/', import.meta.url);

test('the published Beanstalk is the built copy: one bundled script and no source', () => {
	const page = readFileSync(new URL('index.html', dir), 'utf8');
	assert.match(page, /<script type="module" src="app\.js"><\/script>/);
	assert.doesNotMatch(page, /src\/game\/main\.js/);
	for (const gone of ['src', 'docs', 'ROADMAP.md']) assert.ok(!existsSync(new URL(gone, dir)), `${gone} must not be published`);
	const scripts = readdirSync(dir).filter(f => f.endsWith('.js')).sort();
	assert.deepEqual(scripts, ['app.js', 'sw.js']);
	const bundle = readFileSync(new URL('app.js', dir), 'utf8');
	assert.ok(bundle.split('\n').length < 50, 'the bundle is minified');
	assert.doesNotMatch(bundle, /sourceMappingURL/);
});

test('the pieces the page needs from this site are still here', () => {
	const page = readFileSync(new URL('index.html', dir), 'utf8');
	assert.match(page, /import \{ installPage \} from '\.\.\/\.\.\/shared\/site\.js'/);
	assert.ok(existsSync(new URL('../../shared/site.js', dir)));
	for (const f of ['manifest.webmanifest', 'sw.js', 'privacy.html', 'icons/icon-192.png']) assert.ok(existsSync(new URL(f, dir)), f);
});
