/**
 * The title face, Domaine Display Narrow regular italic (the SVN cut, with
 * Vietnamese), is commercial: like SS's own site (ss/scripts/site.js), it is fetched from
 * stevehoang.com at build time, served from this app's static files, and never
 * committed.
 *
 * SS_PRIVATE_FONTS=<stevehoang.com>/public/assets/fonts reads it from a local
 * checkout instead. A failed fetch is a warning, not a stop: an earlier copy is
 * kept, or the file becomes Newsreader italic (the SS fallback), so the page
 * never asks for a missing font.
 */
import { access, copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';

const FONTS = [['regular-italic.woff2', 'domaine-display-narrow/svn-domaine-display-narrow-regular-italic.woff2']];
const FALLBACK = new URL('../node_modules/ss/fonts/newsreader/newsreader-latin-400-italic.woff2', import.meta.url);
const OUT = new URL('../static/fonts/domaine/', import.meta.url);

async function get(from) {
	const local = process.env.SS_PRIVATE_FONTS;
	if (local) return readFile(`${local}/${from}`);
	const res = await fetch(`https://stevehoang.com/assets/fonts/${from}`, { signal: AbortSignal.timeout(8000) });
	if (!res.ok || res.headers.get('content-type') !== 'font/woff2') throw new Error(`HTTP ${res.status}`);
	return Buffer.from(await res.arrayBuffer());
}

await mkdir(OUT, { recursive: true });
for (const [to, from] of FONTS) {
	const dest = new URL(to, OUT);
	try {
		await writeFile(dest, await get(from));
	} catch (error) {
		const kept = await access(dest).then(
			() => true,
			() => false
		);
		console.warn(`title font ${from} not available (${error.message}); ${kept ? 'keeping the earlier copy' : 'Newsreader italic is used'}`);
		if (!kept) await copyFile(FALLBACK, dest);
	}
}
