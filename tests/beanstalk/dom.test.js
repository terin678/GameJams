import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createDom, morph } from '../../games/beanstalk/src/game/view/dom.js';

const page = () => {
	const { document } = new JSDOM('<div id="root"></div><p id="line"></p>').window;
	const dom = createDom(document);
	const button = (id, text, props = {}) => {
		const b = dom.el('button', { type: 'button', ...props }, dom.el('b', {}, id), ` ${text}`);
		b.dataset.id = id;
		return b;
	};
	return { document, dom, root: dom.$('root'), button };
};

test('morph builds what is wanted, strings and all, and skips nothing-values', () => {
	const { dom, root } = page();
	morph(root, [dom.el('h3', {}, 'Title'), 'loose text', null, false, undefined, dom.el('p', { className: 'muted' }, 'body')]);
	assert.equal(root.innerHTML, '<h3>Title</h3>loose text<p class="muted">body</p>');
});

test('a button that is still wanted stays the same node; its text and state change in place', () => {
	const { root, button } = page();
	morph(root, [button('plot', '(5 coins)'), button('hand', '(25 coins)', { disabled: true })]);
	const [plot, hand] = root.children;
	morph(root, [button('plot', '(9 coins)', { disabled: true }), button('hand', '(25 coins)')]);
	assert.equal(root.children[0], plot);
	assert.equal(root.children[1], hand);
	assert.equal(plot.textContent, 'plot (9 coins)');
	assert.equal(plot.disabled, true);
	assert.equal(hand.disabled, false);
});

test('when one thing goes, the others keep their nodes; new things are slotted in', () => {
	const { dom, root, button } = page();
	morph(root, [dom.el('h3', {}, 'One-off'), button('a', '1'), button('b', '2'), button('c', '3')]);
	const [, a, , c] = root.children;
	morph(root, [dom.el('h3', {}, 'One-off'), button('a', '1'), button('c', '3')]);
	assert.deepEqual([...root.children].map(n => n.dataset.id ?? n.tagName), ['H3', 'a', 'c']);
	assert.equal(root.children[1], a);
	assert.equal(root.children[2], c);
	morph(root, [dom.el('h3', {}, 'Buy more'), button('z', '0'), dom.el('h3', {}, 'One-off'), button('a', '1'), button('c', '3')]);
	assert.deepEqual([...root.children].map(n => n.dataset.id ?? n.textContent), ['Buy more', 'z', 'One-off', 'a', 'c']);
	assert.equal(root.children[3], a);
	assert.equal(root.children[4], c);
	morph(root, []);
	assert.equal(root.childNodes.length, 0);
});

test('attributes that are no longer wanted are taken away, and nested content follows', () => {
	const { dom, root } = page();
	const bar = pct => {
		const fill = dom.el('i');
		fill.style.width = `${pct}%`;
		return dom.el('div', { className: 'bar', title: `${pct}%` }, fill);
	};
	morph(root, [bar(20)]);
	const fill = root.querySelector('i');
	morph(root, [bar(60)]);
	assert.equal(root.querySelector('i'), fill);
	assert.equal(fill.style.width, '60%');
	assert.equal(root.firstChild.title, '60%');
	morph(root, [dom.el('div', {}, dom.el('i'))]);
	assert.equal(root.firstChild.hasAttribute('class'), false);
	assert.equal(root.firstChild.hasAttribute('title'), false);
	assert.equal(fill.hasAttribute('style'), false);
});

test('a different kind of thing in the same place replaces what was there', () => {
	const { dom, root, button } = page();
	morph(root, [dom.el('p', {}, 'Growing... 5s')]);
	const p = root.firstChild;
	morph(root, [button('cross', 'Cross seeds')]);
	assert.equal(root.children.length, 1);
	assert.notEqual(root.firstChild, p);
	assert.equal(root.firstChild.tagName, 'BUTTON');
});

test('a canvas is kept only if it is handed back; a new canvas replaces the old', () => {
	const { dom, root } = page();
	const first = dom.el('canvas');
	morph(root, [dom.el('h3', {}, 'Chart'), first]);
	morph(root, [dom.el('h3', {}, 'Chart, later'), first]);
	assert.equal(root.children[1], first);
	const second = dom.el('canvas');
	morph(root, [dom.el('h3', {}, 'Chart'), second]);
	assert.equal(root.children[1], second);
	assert.equal(root.children.length, 2);
});

test('set only touches the page when the text is new; show hides and shows', () => {
	const { dom } = page();
	dom.set('line', 'one');
	const node = dom.$('line').firstChild;
	dom.set('line', 'one');
	assert.equal(dom.$('line').firstChild, node, 'left alone');
	dom.set('line', 'two');
	assert.equal(dom.$('line').textContent, 'two');
	dom.show('line', false);
	assert.equal(dom.$('line').hidden, true);
});
