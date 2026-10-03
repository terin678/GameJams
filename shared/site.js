// Site-wide settings and helpers: the feedback links and visitor counting.
// URL building is pure (tested); install* touch the DOM.

export const SITE = {
	repo: 'terin678/GameJams',
	// GoatCounter site code (https://<code>.goatcounter.com). Empty = no counting.
	// Free, no cookies, no consent banner needed. See README "Visitor counts".
	goatcounter: 'terin-gamejams',
};

// Files in .github/ISSUE_TEMPLATE/.
export const ISSUE_TEMPLATES = { bug: 'bug_report.yml', idea: 'idea.yml' };

export function issueUrl(repo, { kind, game } = {}) {
	if (!kind) return `https://github.com/${repo}/issues/new/choose`;
	const template = ISSUE_TEMPLATES[kind];
	if (!template) throw new Error(`unknown issue kind "${kind}"`);
	const q = new URLSearchParams({ template });
	if (game) q.set('game', game); // pre-fills the form field with id "game"
	return `https://github.com/${repo}/issues/new?${q}`;
}

export const goatcounterEndpoint = code =>
	/^[a-z0-9][a-z0-9-]*$/.test(code ?? '') ? `https://${code}.goatcounter.com/count` : null;

export function installAnalytics(doc = document, site = SITE) {
	const endpoint = goatcounterEndpoint(site.goatcounter);
	if (!endpoint) return false;
	const s = doc.createElement('script');
	s.async = true;
	s.src = 'https://gc.zgo.at/count.js';
	s.dataset.goatcounter = endpoint;
	doc.head.append(s);
	return true;
}

// Every page calls this once: starts counting and points each
// <a data-feedback="bug|idea|"> at the right issue form (with the game filled in).
export function installPage({ game } = {}, doc = document, site = SITE) {
	installAnalytics(doc, site);
	for (const a of doc.querySelectorAll('[data-feedback]')) {
		a.href = issueUrl(site.repo, { kind: a.dataset.feedback || undefined, game });
		a.target = '_blank';
		a.rel = 'noopener';
	}
}
