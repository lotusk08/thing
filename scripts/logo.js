/**
 * Draws the Things logo, its icons and its social card from the title face,
 * Domaine Display Narrow regular italic (the SS title face).
 *
 * - Wordmark: "Things", kerned as the font sets it. The dot of the i is the one
 *   bright thing: SS's accent, blue by day and ember by night, the option you
 *   end up choosing.
 * - Mark: "T.", its full stop in the same accent.
 * - Icons: the mark on the Desk ground, for a home screen and the web manifest.
 * - Social card (og:image): the wordmark, what the app does in SS's Inter Display,
 *   and a radar of two options in their colours, A blue and B ember, as the maps
 *   draw them. Nothing else, so it reads at a glance.
 *
 * The glyphs are outlined, so no font ships with any of it, and the PNGs are
 * drawn from the same paths (resvg). Domaine is read like scripts/fonts.js reads
 * it: SS_PRIVATE_FONTS=<stevehoang.com>/public/assets/fonts, else fetched from
 * stevehoang.com; Inter Display comes with SS. Colours are SS's roles.
 *
 * Writes src/lib/logo.ts (the wordmark's paths for the app), static/logo.svg,
 * static/favicon.svg, static/apple-touch-icon.png, static/icon-192.png,
 * static/icon-512.png, static/icon-maskable.png, static/manifest.webmanifest and
 * static/og.png. Run with `npm run logo`.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { Resvg } from '@resvg/resvg-js';
import opentype from 'opentype.js';
import { accents, roles } from 'ss';
import wawoff2 from 'wawoff2';

const NAME = 'Things';
const DESCRIPTION = 'Make one hard decision with six classic frameworks and compare their estimates side by side.';

const out = (file) => new URL(`../${file}`, import.meta.url);

async function parse(woff2) {
	const ttf = await wawoff2.decompress(woff2);
	return opentype.parse(ttf.buffer.slice(ttf.byteOffset, ttf.byteOffset + ttf.byteLength));
}

async function domaine() {
	const file = 'domaine-display-narrow/svn-domaine-display-narrow-regular-italic.woff2';
	const local = process.env.SS_PRIVATE_FONTS;
	if (local) return parse(await readFile(`${local}/${file}`));
	const res = await fetch(`https://stevehoang.com/assets/fonts/${file}`, { signal: AbortSignal.timeout(8000) });
	if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
	return parse(Buffer.from(await res.arrayBuffer()));
}

const inter = () => readFile(new URL('../node_modules/ss/fonts/inter-display/inter-display-latin-400-normal.woff2', import.meta.url)).then(parse);

const join = (paths) => {
	const all = new opentype.Path();
	all.commands = paths.flatMap((p) => p.commands);
	return all;
};

/** Contours of a glyph path, each ending at its Z. */
function contours(path) {
	const found = [];
	let current = [];
	for (const command of path.commands) {
		current.push(command);
		if (command.type === 'Z') {
			found.push(join([{ commands: current }]));
			current = [];
		}
	}
	return found;
}

const box = (path, pad) => {
	const b = path.getBoundingBox();
	return { x: b.x1 - pad, y: b.y1 - pad, w: b.x2 - b.x1 + pad * 2, h: b.y2 - b.y1 + pad * 2 };
};

const view = ({ x, y, w, h }) => [x, y, w, h].map((n) => Math.round(n)).join(' ');

const face = await domaine();

/** "Things" at a baseline and size: every glyph in ink, but the i's tittle (its topmost contour) in the accent. */
function wordmarkAt(x, y, size) {
	const text = NAME;
	const glyphs = face.getPaths(text, x, y, size, { kerning: true });
	const ink = [];
	const dot = [];
	[...text].forEach((char, i) => {
		if (char !== 'i') return ink.push(glyphs[i]);
		const [tittle, ...stem] = contours(glyphs[i]).sort((a, b) => a.getBoundingBox().y1 - b.getBoundingBox().y1);
		dot.push(tittle);
		ink.push(...stem);
	});
	return { all: join(glyphs), ink: join(ink), dot: join(dot) };
}

const drawn = wordmarkAt(0, 0, 1000);
const wordmark = { viewBox: view(box(drawn.all, 20)), ink: drawn.ink.toPathData(1), dot: drawn.dot.toPathData(1) };

// Mark: "T." centred in a square with 14% air on the longer side.
const [t, stop] = face.getPaths('T.', 0, 0, 1000, { kerning: true });
const b = box(join([t, stop]), 0);
const side = Math.max(b.w, b.h) * 1.28;
const mark = {
	viewBox: view({ x: b.x - (side - b.w) / 2, y: b.y - (side - b.h) / 2, w: side, h: side }),
	ink: t.toPathData(1),
	dot: stop.toPathData(1)
};

const svg = ({ viewBox, ink, dot }, label) =>
	`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" role="img" aria-label="${label}">` +
	`<style>.ink{fill:${roles.tx.light}}.dot{fill:${roles.accent.light}}` +
	`@media (prefers-color-scheme:dark){.ink{fill:${roles.tx.dark}}.dot{fill:${roles.accent.dark}}}</style>` +
	`<path class="ink" d="${ink}"/><path class="dot" d="${dot}"/></svg>\n`;

/** An SVG drawn to a PNG this many pixels wide. */
const png = (source, width) => new Resvg(source, { fitTo: { mode: 'width', value: width }, font: { loadSystemFonts: false } }).render().asPng();

/** The mark on the Desk ground, a square `size` px, the mark `inner` of it (less for a maskable icon's safe zone). */
function tile(size, inner) {
	const [x, y, w] = mark.viewBox.split(' ').map(Number);
	const s = (size * inner) / w;
	const at = (size - size * inner) / 2;
	return png(
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="${roles.bg.light}"/>` +
			`<g transform="translate(${at} ${at}) scale(${s}) translate(${-x} ${-y})">` +
			`<path fill="${roles.tx.light}" d="${mark.ink}"/><path fill="${roles.accent.light}" d="${mark.dot}"/></g></svg>`,
		size
	);
}

/** Lines of `text` in `font` at `size`, none wider than `width`. */
function wrap(font, text, size, width) {
	const lines = [];
	for (const word of text.split(' ')) {
		const last = lines.at(-1);
		if (last !== undefined && font.getAdvanceWidth(`${last} ${word}`, size) <= width) lines[lines.length - 1] = `${last} ${word}`;
		else lines.push(word);
	}
	return lines;
}

/** The social card, 1200 × 630: the wordmark and one line of what it does on the left, two options' radar on the right. */
async function card() {
	const regular = await inter();
	const W = 1200;
	const H = 630;
	const x0 = 96;
	const word = wordmarkAt(x0, 300, 220);
	const said = wrap(regular, 'One hard decision, six classic frameworks, side by side.', 44, 600).map((line, i) => regular.getPath(line, x0, 434 + i * 58, 44).toPathData(1));

	// A radar as Six Hats draws it: six axes, rings, two options (the demo's ratings, black as "few risks").
	const [cx, cy, r] = [975, 315, 150];
	const at = (i, v) => {
		const a = -Math.PI / 2 + (i * Math.PI) / 3;
		return `${(cx + Math.cos(a) * r * (v / 5)).toFixed(1)},${(cy + Math.sin(a) * r * (v / 5)).toFixed(1)}`;
	};
	const ring = (v) => `<polygon points="${[0, 1, 2, 3, 4, 5].map((i) => at(i, v)).join(' ')}"/>`;
	const shape = (values, colour, dash) =>
		`<polygon points="${values.map((v, i) => at(i, v)).join(' ')}" fill="${colour}" fill-opacity="0.16" stroke="${colour}" stroke-width="3" stroke-linejoin="round"${dash ? ' stroke-dasharray="10 6"' : ''}/>`;
	const spokes = [0, 1, 2, 3, 4, 5].map((i) => `<line x1="${cx}" y1="${cy}" x2="${at(i, 5).split(',')[0]}" y2="${at(i, 5).split(',')[1]}"/>`).join('');

	return png(
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">` +
			`<rect width="${W}" height="${H}" fill="${roles.bg.light}"/>` +
			`<g fill="none" stroke="${roles['ui-2'].light}" stroke-width="2">${[1, 2, 3, 4, 5].map(ring).join('')}${spokes}</g>` +
			shape([4, 4, 3, 5, 4, 3], accents.blue.light, false) +
			shape([3, 3, 4, 2, 2, 4], accents.ember.light, true) +
			`<path fill="${roles.tx.light}" d="${word.ink.toPathData(1)}"/><path fill="${roles.accent.light}" d="${word.dot.toPathData(1)}"/>` +
			`<path fill="${roles['tx-2'].light}" d="${said.join('')}"/>` +
			`</svg>`,
		W
	);
}

const manifest = {
	name: NAME,
	short_name: NAME,
	description: DESCRIPTION,
	start_url: '/',
	scope: '/',
	display: 'standalone',
	background_color: roles.bg.light,
	theme_color: roles.bg.light,
	icons: [
		{ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
		{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
		{ src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
		{ src: '/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
	]
};

await Promise.all([
	writeFile(out('static/logo.svg'), svg(wordmark, NAME)),
	writeFile(out('static/favicon.svg'), svg(mark, NAME)),
	writeFile(out('static/apple-touch-icon.png'), tile(180, 140 / 180)),
	writeFile(out('static/icon-192.png'), tile(192, 0.8)),
	writeFile(out('static/icon-512.png'), tile(512, 0.8)),
	// Inside the circle every platform's mask keeps (80% across).
	writeFile(out('static/icon-maskable.png'), tile(512, 0.6)),
	writeFile(out('static/manifest.webmanifest'), `${JSON.stringify(manifest, null, '\t')}\n`),
	writeFile(out('static/og.png'), await card()),
	writeFile(
		out('src/lib/logo.ts'),
		`// Generated by scripts/logo.js from Domaine Display Narrow regular italic. Do not edit.\n` +
			`export const wordmark = ${JSON.stringify(wordmark, null, '\t')};\n`
	)
]);
console.log(`logo: wordmark ${wordmark.viewBox}, mark ${mark.viewBox}; icons, manifest and og.png written`);
