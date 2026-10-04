// The few DOM helpers every part of the page uses.
//
// The important one is morph(). A panel describes what it should look like by
// building fresh nodes, and morph() changes the nodes already on the page to
// match, instead of swapping them out. A button that is still wanted stays the
// very same node: its text and `disabled` change in place. That matters because
// a press that starts on a node which is then replaced never becomes a click on
// an iPhone (docs/unclickable-buttons.md).

// What makes two elements "the same thing": the same tag and the same data-*
// attributes (a project's id, a gift and its neighbour, and so on).
const keyOf = node => (node.nodeType === 1
	? [...node.attributes].filter(a => a.name.startsWith('data-')).map(a => `${a.name}=${a.value}`).sort().join('|')
	: '');

// A canvas holds pixels, which cannot be copied across, so it is never reused
// for a different one; pass the same canvas again to keep it.
const same = (a, b) => a === b || (a.nodeType === b.nodeType
	&& (a.nodeType !== 1 || (a.tagName === b.tagName && a.tagName !== 'CANVAS' && keyOf(a) === keyOf(b))));

function patch(old, want) {
	if (old.nodeType !== 1) {
		if (old.data !== want.data) old.data = want.data;
		return;
	}
	for (const a of [...old.attributes]) if (!want.hasAttribute(a.name)) old.removeAttribute(a.name);
	for (const a of [...want.attributes]) if (old.getAttribute(a.name) !== a.value) old.setAttribute(a.name, a.value);
	morph(old, [...want.childNodes]);
}

// Makes `parent`'s children match `wanted` (nodes, or strings for text; null,
// undefined and false are skipped), reusing the children it already has.
export function morph(parent, wanted) {
	const doc = parent.ownerDocument;
	const nodes = wanted.filter(w => w !== null && w !== undefined && w !== false)
		.map(w => (typeof w === 'string' ? doc.createTextNode(w) : w));
	let at = parent.firstChild;
	for (const want of nodes) {
		if (at === want) {
			at = at.nextSibling;
			continue;
		}
		let match = null;
		if (at && same(at, want)) match = at;
		else if (keyOf(want)) {
			// Something with an identity may be further along, if what was before it has gone.
			for (let n = at; n; n = n.nextSibling) {
				if (same(n, want)) {
					match = n;
					break;
				}
			}
		}
		if (!match) {
			parent.insertBefore(want, at);
			continue;
		}
		while (at !== match) {
			const gone = at;
			at = at.nextSibling;
			gone.remove();
		}
		patch(match, want);
		at = match.nextSibling;
	}
	while (at) {
		const gone = at;
		at = at.nextSibling;
		gone.remove();
	}
}

export function createDom(doc) {
	const $ = id => doc.getElementById(id);
	// The text last written to each element, by id, so the page is only touched when it changes.
	const written = new Map();
	return {
		doc,
		$,
		el(tag, props = {}, ...children) {
			const node = Object.assign(doc.createElement(tag), props);
			node.append(...children);
			return node;
		},
		set(id, text) {
			if (written.get(id) === text) return;
			written.set(id, text);
			$(id).textContent = text;
		},
		show(id, on) {
			$(id).hidden = !on;
		},
		morph,
	};
}
