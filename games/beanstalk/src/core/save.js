// Save codes: a farm as a line of text, for moving it between a phone and a computer.

const PREFIX = 'BEAN1.';

// `saved` is what serialize() in core/sim.js returns.
export function encodeSave(saved) {
	const bytes = new TextEncoder().encode(JSON.stringify(saved));
	let binary = '';
	for (const b of bytes) binary += String.fromCharCode(b);
	return PREFIX + btoa(binary);
}

// Returns the saved object, or null if the text is not a save code.
export function decodeSave(code) {
	const text = String(code ?? '').replace(/\s+/g, '');
	if (!text.startsWith(PREFIX)) return null;
	try {
		const binary = atob(text.slice(PREFIX.length));
		const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
		const saved = JSON.parse(new TextDecoder().decode(bytes));
		return saved && typeof saved === 'object' ? saved : null;
	} catch (e) {
		return null;
	}
}
