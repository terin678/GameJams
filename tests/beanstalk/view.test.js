// The page itself: the real index.html and the real view code, run against a
// DOM in Node. These are the tests that would have caught the unclickable
// buttons (games/beanstalk/docs/unclickable-buttons.md): they check that the
// page leaves its buttons alone when nothing has changed, and that pressing a
// button reaches the game.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';
import { createView } from '../../games/beanstalk/src/game/view.js';
import { createState, tick } from '../../games/beanstalk/src/core/sim.js';
import { DATA, SKY } from '../../games/beanstalk/src/data/index.js';
import { createRng } from '../../shared/rng.js';

const html = readFileSync(new URL('../../games/beanstalk/index.html', import.meta.url), 'utf8');
export const PANELS = ['projects', 'neighbours', 'seeds', 'guard', 'climb', 'exchange'];

// A page with the view attached. `calls` records every handler the page invokes.
export function openPage() {
	// The chart asks for a canvas, which this DOM does not draw; that is fine, and need not be reported.
	const dom = new JSDOM(html, { virtualConsole: new VirtualConsole() });
	const { document } = dom.window;
	const calls = [];
	const handlers = new Proxy({}, { get: (_, name) => (...args) => { calls.push([name, ...args]); } });
	const view = createView(document, { ...DATA, SKY }, handlers);
	const $ = id => document.getElementById(id);
	return {
		document, view, calls, $,
		// Shows a tab the way a player would, then lets the page catch up.
		open(tab, state) {
			[...$('tabs').querySelectorAll('button')].find(b => b.dataset.tab === tab).click();
			view.update(state, 0);
		},
		called: name => calls.filter(c => c[0] === name),
	};
}

// A farm far enough along that every tab is open and there is something to press in each.
export function midGame() {
	const rng = createRng(1);
	const state = createState(DATA);
	state.grown = 6e5;
	state.height = 3000;
	state.phase = 2;
	state.coins = 5e6;
	state.pages = 5000;
	for (let t = 0; t < 2; t += 0.1) tick(state, 0.1, DATA, rng);
	return state;
}

test('every tab is there to open in the middle of the game', () => {
	const page = openPage();
	const state = midGame();
	page.view.update(state, 0);
	const tabs = [...page.$('tabs').querySelectorAll('button')].map(b => b.dataset.tab);
	assert.deepEqual([...tabs].sort(), [...PANELS].sort());
});

test('when nothing has changed, the page leaves every button where it is', () => {
	const page = openPage();
	const state = midGame();
	page.view.update(state, 0);
	for (const id of PANELS) {
		page.open(id, state);
		const before = [...page.$(id).querySelectorAll('button')];
		assert.ok(before.length > 0, `${id} has buttons`);
		for (let i = 0; i < 5; i++) page.view.update(state, 0);
		const after = [...page.$(id).querySelectorAll('button')];
		assert.equal(after.length, before.length, id);
		assert.ok(after.every((b, i) => b === before[i]), `${id}: the buttons were replaced though nothing changed`);
	}
	const tabs = [...page.$('tabs').querySelectorAll('button')];
	for (let i = 0; i < 5; i++) page.view.update(state, 0);
	assert.ok([...page.$('tabs').querySelectorAll('button')].every((b, i) => b === tabs[i]), 'the tabs were replaced');
});

test('pressing a button reaches the game, once', () => {
	const page = openPage();
	const state = midGame();
	page.view.update(state, 0);
	const press = (panel, selector) => {
		page.open(panel, state);
		const b = page.$(panel).querySelector(`${selector}:not([disabled])`);
		assert.ok(b, `${panel}: something to press matching ${selector}`);
		b.click();
		return b;
	};

	const project = press('projects', '[data-id]');
	assert.deepEqual(page.called('buy'), [['buy', project.dataset.id]]);

	const gift = press('neighbours', '[data-gift]');
	assert.deepEqual(page.called('gift'), [['gift', gift.dataset.friend, gift.dataset.gift]]);

	press('seeds', '[data-cross]');
	assert.equal(page.called('cross').length, 1);

	press('guard', '[data-post][data-delta="1"]');
	assert.deepEqual(page.called('post'), [['post', 'duck', 1]]);
	press('guard', '[data-build]');
	assert.equal(page.called('build').length, 1);

	press('climb', '[data-climb]');
	assert.equal(page.called('climb').length, 1);

	press('exchange', '[data-buy="0.5"]');
	assert.deepEqual(page.called('trade'), [['trade', 'buy', 0.5]]);

	page.$('tend').click();
	assert.equal(page.called('tend').length, 1);
	page.$('price-up').click();
	assert.deepEqual(page.called('price'), [['price', 1]]);
});

test('when the money changes from coins to beans, every price is redrawn, once', () => {
	const page = openPage();
	const state = midGame();
	page.view.update(state, 0);
	page.open('guard', state);
	const build = () => page.$('guard').querySelector('[data-build]');
	assert.match(build().textContent, /coins/);
	state.rate = 2;
	page.view.update(state, 0);
	assert.match(build().textContent, /beans/);
	assert.doesNotMatch(build().textContent, /coins/);
	const b = build();
	page.view.update(state, 0);
	assert.equal(build(), b, 'and then it is left alone again');
	assert.equal(page.$('wallet-label').textContent, 'Beans');
});

test('a panel is not rebuilt under a finger: the rebuild waits until the press ends', () => {
	const page = openPage();
	const state = midGame();
	page.view.update(state, 0);
	page.open('guard', state);
	const { Event } = page.document.defaultView;
	const plus = () => page.$('guard').querySelector('[data-post="duck"][data-delta="1"]');
	const pressed = plus();
	pressed.dispatchEvent(new Event('pointerdown', { bubbles: true }));
	// The raid countdown moves on while the finger is down, which would normally rebuild the panel.
	state.time += 5;
	page.view.update(state, 0);
	assert.equal(plus(), pressed, 'still the same button under the finger');
	pressed.dispatchEvent(new Event('pointerup', { bubbles: true }));
	pressed.click();
	assert.deepEqual(page.called('post'), [['post', 'duck', 1]]);
	page.view.update(state, 0);
	assert.notEqual(plus(), pressed, 'and it catches up afterwards');
	assert.match(page.$('guard').textContent, /Next raid in/);
});
