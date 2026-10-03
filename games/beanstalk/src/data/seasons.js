// The year, in order. `growth` multiplies how fast beans grow; `cold` seasons
// are ignored once you own a greenhouse. `sky` tints the top of the farm view.
export const SEASONS = [
	{ id: 'spring', name: 'Spring', growth: 1, sky: '#7ec8f2', grass: '#5fae4a', log: 'Spring. Everything smells of wet soil.' },
	{ id: 'summer', name: 'Summer', growth: 1.3, sky: '#58b4f5', grass: '#6cbf3f', log: 'Summer. The beans like it.' },
	{ id: 'autumn', name: 'Autumn', growth: 1, sky: '#e8a868', grass: '#b08a3a', log: 'Autumn. The valley turns orange.' },
	{ id: 'winter', name: 'Winter', growth: 0.2, cold: true, fx: 'snow', sky: '#b9c6d8', grass: '#dfe6ee', log: 'Winter. The ground is hard and the beans sulk.' },
];

// Rolled once at dawn. `chance` is per day; what's left over is a fair day.
//   growth:   multiplies growth for the day
//   eats:     takes one planted plot (a scarecrow stops it)
//   summoned: the weather a rainmaker project orders every day
//   fx:       'rain' or 'snow' falling in the farm view (seasons can have one too)
export const WEATHER = [
	{ id: 'rain', name: 'Rain', chance: 0.15, growth: 1.5, summoned: true, fx: 'rain', log: 'Rain. Free water.' },
	{ id: 'drought', name: 'Dry spell', chance: 0.07, growth: 0.5, log: 'A dry spell. The beans droop.' },
	{ id: 'crow', name: 'Crow', chance: 0.08, eats: true, log: 'A crow ate one of your beans and looked you in the eye.' },
];
