// games.json entry: { slug, title, blurb, date: 'YYYY-MM-DD', tags?, path | url }
// `path` is an in-repo game folder (relative, trailing slash); `url` is external.

const REQUIRED = ['slug', 'title', 'blurb', 'date'];

export function validateEntry(e) {
	const errors = [];
	for (const f of REQUIRED) {
		if (typeof e[f] !== 'string' || !e[f].trim()) errors.push(`missing ${f}`);
	}
	if (e.date && !/^\d{4}-\d{2}-\d{2}$/.test(e.date)) errors.push('date must be YYYY-MM-DD');
	if (!!e.path === !!e.url) errors.push('needs exactly one of path or url');
	if (e.url && !/^https?:\/\//.test(e.url)) errors.push('url must be http(s)');
	if (e.path && (e.path.startsWith('/') || e.path.includes('..'))) errors.push('path must be relative');
	if (e.tags !== undefined && !Array.isArray(e.tags)) errors.push('tags must be an array');
	return errors;
}

export const entryHref = e => e.path ?? e.url;

export const sortEntries = list => [...list].sort((a, b) => b.date.localeCompare(a.date));
