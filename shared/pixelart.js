// Sprites authored as strings of palette characters, turned into textures at
// boot. '.' is transparent. The parsing is pure; makeTexture needs Phaser.

export function parsePixelMap(rows, palette) {
	if (!rows?.length) throw new Error('pixel map is empty');
	const width = rows[0].length;
	const pixels = [];
	rows.forEach((row, y) => {
		if (row.length !== width) throw new Error(`row ${y} is ${row.length} wide, expected ${width}`);
		[...row].forEach((ch, x) => {
			if (ch === '.') return;
			const color = palette[ch];
			if (!color) throw new Error(`"${ch}" at ${x},${y} is not in the palette`);
			pixels.push({ x, y, color });
		});
	});
	return { width, height: rows.length, pixels };
}

// Author the left half, get a symmetric sprite. odd:true shares the last column.
export function mirror(rows, { odd = false } = {}) {
	return rows.map(r => r + [...r].reverse().slice(odd ? 1 : 0).join(''));
}

// Draws a parsed map into a new Phaser canvas texture, `scale` screen px per pixel.
export function makeTexture(scene, key, rows, palette, scale = 3) {
	const map = parsePixelMap(rows, palette);
	if (scene.textures.exists(key)) scene.textures.remove(key);
	const tex = scene.textures.createCanvas(key, map.width * scale, map.height * scale);
	const ctx = tex.context;
	for (const p of map.pixels) {
		ctx.fillStyle = p.color;
		ctx.fillRect(p.x * scale, p.y * scale, scale, scale);
	}
	tex.refresh();
	return tex;
}
