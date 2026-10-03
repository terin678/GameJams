// Draws Beanstalk's app icons from its own pixel art and writes them as PNGs.
// Run it again if the bean sprite or the colours change:
//
//   node tools/make-icons.mjs
//
// No dependencies: a PNG is a header, one zlib-compressed block of pixels and
// a few checksums, and Node has zlib built in.

import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { SPRITES, PALETTE } from '../games/beanstalk/src/data/sprites.js';
import { parsePixelMap } from '../shared/pixelart.js';

const OUT = new URL('../games/beanstalk/icons/', import.meta.url);
const BACKGROUND = '#10131c';
const SOIL = '#7a5230';

const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));

const CRC = Array.from({ length: 256 }, (_, n) => {
	let c = n;
	for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
	return c >>> 0;
});
const crc32 = bytes => {
	let c = 0xffffffff;
	for (const b of bytes) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
	return (c ^ 0xffffffff) >>> 0;
};
function chunk(type, data) {
	const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
	const out = Buffer.alloc(8 + data.length + 4);
	out.writeUInt32BE(data.length, 0);
	body.copy(out, 4);
	out.writeUInt32BE(crc32(body), 8 + data.length);
	return out;
}

// `pixels` is size*size [r, g, b] triples, row by row.
export function encodePng(size, pixels) {
	const raw = Buffer.alloc(size * (1 + size * 3));
	for (let y = 0; y < size; y++) {
		const row = y * (1 + size * 3);
		raw[row] = 0;   // no filter
		for (let x = 0; x < size; x++) {
			const [r, g, b] = pixels[y * size + x];
			raw.writeUInt8(r, row + 1 + x * 3);
			raw.writeUInt8(g, row + 2 + x * 3);
			raw.writeUInt8(b, row + 3 + x * 3);
		}
	}
	const head = Buffer.alloc(13);
	head.writeUInt32BE(size, 0);
	head.writeUInt32BE(size, 4);
	head.set([8, 2, 0, 0, 0], 8);   // 8 bits, RGB, no interlace
	return Buffer.concat([
		Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
		chunk('IHDR', head), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0)),
	]);
}

// A ripe bean plant on a strip of soil, centred. `fill` is how much of the
// icon the art takes up: maskable icons need a wide margin, since phones crop
// them to a circle or a rounded square.
export function drawIcon(size, fill) {
	const plant = parsePixelMap(SPRITES.bean.frames.at(-1), PALETTE);
	const cells = plant.width + 2;                 // a cell of margin each side
	const scale = Math.floor(size * fill / cells);
	const left = Math.floor((size - plant.width * scale) / 2);
	const top = Math.floor((size - (plant.height + 1) * scale) / 2);
	const pixels = Array.from({ length: size * size }, () => rgb(BACKGROUND));
	const block = (cx, cy, color) => {
		for (let y = 0; y < scale; y++) {
			for (let x = 0; x < scale; x++) pixels[(top + cy * scale + y) * size + left + cx * scale + x] = color;
		}
	};
	for (let x = -1; x <= plant.width; x++) block(x, plant.height - 1, rgb(SOIL));
	for (const p of plant.pixels) block(p.x, p.y, rgb(p.color));
	return pixels;
}

export const ICONS = [
	{ file: 'icon-192.png', size: 192, fill: 0.86 },
	{ file: 'icon-512.png', size: 512, fill: 0.86 },
	{ file: 'icon-maskable-512.png', size: 512, fill: 0.6 },
	{ file: 'apple-touch-icon.png', size: 180, fill: 0.8 },
];

// The Android app's launcher icons (app/android): the same art at each screen
// density. `ic_launcher_foreground` is the layer newer phones mask to their own
// shape, so its art keeps to the middle; the other two are for older phones.
const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
export const ANDROID_ICONS = Object.entries(DENSITIES).flatMap(([name, d]) => [
	{ file: `mipmap-${name}/ic_launcher.png`, size: 48 * d, fill: 0.86 },
	{ file: `mipmap-${name}/ic_launcher_round.png`, size: 48 * d, fill: 0.6 },
	{ file: `mipmap-${name}/ic_launcher_foreground.png`, size: 108 * d, fill: 0.5 },
]);
const ANDROID_RES = new URL('../app/android/app/src/main/res/', import.meta.url);

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
	mkdirSync(OUT, { recursive: true });
	for (const icon of ICONS) {
		writeFileSync(new URL(icon.file, OUT), encodePng(icon.size, drawIcon(icon.size, icon.fill)));
		console.log(`wrote ${icon.file} (${icon.size}x${icon.size})`);
	}
	for (const icon of ANDROID_ICONS) writeFileSync(new URL(icon.file, ANDROID_RES), encodePng(icon.size, drawIcon(icon.size, icon.fill)));
	console.log(`wrote ${ANDROID_ICONS.length} Android launcher icons`);
}
