// The Observers: floating lab eyes. If one sees you, your wave function
// collapses. behavior.kind: 'stalker' (goes for you), 'trickster' (aims
// `ahead` tiles in front of you), 'shy' (chases until within `range`, then
// backs off to its corner), 'drifter' (wanders). corner: scatter target.
// releaseMs: how long it waits in the pen at the start of a life.
export const OBSERVERS = [
	{ id: 'gaze', name: 'Dr. Gaze', color: 0x6ee06e, behavior: { kind: 'stalker' }, corner: { col: 17, row: -2 }, releaseMs: 0, start: 'door' },
	{ id: 'lens', name: 'The Lens', color: 0xb98cff, behavior: { kind: 'trickster', ahead: 4 }, corner: { col: 1, row: -2 }, releaseMs: 3000, start: 'pen' },
	{ id: 'peep', name: 'Peeper', color: 0xffc04d, behavior: { kind: 'shy', range: 6 }, corner: { col: 1, row: 22 }, releaseMs: 7000, start: 'pen' },
	{ id: 'iris', name: 'Iris', color: 0xf4f4f4, behavior: { kind: 'drifter' }, corner: { col: 17, row: 22 }, releaseMs: 12000, start: 'pen' },
];
