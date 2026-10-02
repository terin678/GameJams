// The lab. Authored as the left half and mirrored (the centre column is shared),
// so it is always left-right symmetric, which superposition needs.
//   # wall   . quantum (dot)   o measurement pellet   (space) empty floor
//   P cat start   - pen door   G observer pen   S where tunnel/split items appear
// Open cells on the left/right edge are side tunnels that wrap around.
import { mirror } from '../../../../shared/pixelart.js';

export const MAZE = mirror([
	'##########',
	'#........#',
	'#o##.###.#',
	'#.........',
	'#.##.#.###',
	'#....#...#',
	'####.### #',
	'####.#    ',
	'####.# ##-',
	'    .  #GG',
	'####.# ###',
	'####.#   S',
	'####.# ###',
	'#........#',
	'#.##.###.#',
	'#o.#.....P',
	'##.#.#.###',
	'#....#...#',
	'#.######.#',
	'#.........',
	'##########',
], { odd: true });
