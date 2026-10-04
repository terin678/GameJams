// The view on its own: the real index.html and the real view code, run against
// a DOM in Node, with handlers that only record what was pressed. These check
// that the page leaves its buttons alone when nothing has changed, and that
// pressing a button reaches the game. (The game played through the page is in
// page.test.js.)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openPage, midGame, PANELS } from './support/page.js';

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

test('a countdown changes the words on the page and nothing else', () => {
	const page = openPage();
	const state = midGame();
	page.view.update(state, 0);
	page.open('guard', state);
	const buttons = [...page.$('guard').querySelectorAll('button')];
	const heading = page.$('guard').querySelector('h3');
	const before = heading.textContent;
	state.time += 5;
	page.view.update(state, 0);
	assert.notEqual(heading.textContent, before, 'the countdown moved on');
	assert.match(heading.textContent, /Next raid in/);
	assert.equal(page.$('guard').querySelector('h3'), heading, 'in the same heading');
	assert.ok([...page.$('guard').querySelectorAll('button')].every((b, i) => b === buttons[i]), 'beside the same buttons');
});

test('a disabled button does nothing when pressed', () => {
	const page = openPage();
	const state = midGame();
	state.coins = 0;
	page.view.update(state, 0);
	const b = page.$('projects').querySelector('[data-id][disabled]');
	assert.ok(b, 'something unaffordable');
	b.click();
	b.dispatchEvent(new (page.document.defaultView.Event)('click', { bubbles: true }));
	assert.deepEqual(page.called('buy'), []);
});
