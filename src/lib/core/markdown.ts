import type { AnyModel } from './model';
import type { Scoreboard } from './scoreboard';
import type { Decision, Estimate, ModelId } from './types';

const cell = (s: string) => s.replace(/\|/g, '\\|').replace(/\s*\n\s*/g, ' ').trim();
const num = (v: number | null) => (v === null ? '–' : String(Math.round(v)));

/** The scoreboard as a Markdown document: title, table, verdict, per-model notes. */
export function toMarkdown(
	decision: Decision,
	models: readonly AnyModel[],
	estimates: Record<ModelId, Estimate | null>,
	board: Scoreboard
): string {
	const header = ['Option', ...models.map((m) => m.short), 'Avg'];
	const align = [':--', ...models.map(() => '--:'), '--:'];
	const rows = board.rows.map((r) => {
		const avg = num(r.average);
		return [
			cell(r.label),
			...r.cells.map((c) => (c.isLean ? `**${num(c.value)}**` : num(c.value))),
			r.isLeader ? `**${avg}**` : avg
		];
	});
	const table = [header, align, ...rows].map((cols) => `| ${cols.join(' | ')} |`).join('\n');

	const notes = models.flatMap((m) => {
		const e = estimates[m.id];
		return e ? [`- **${m.name}** (${e.confidence} confidence): ${e.summary}`] : [];
	});

	return [
		`## ${decision.title.trim() || 'Untitled decision'}`,
		decision.notes?.trim() ? `\n${decision.notes.trim()}` : '',
		'',
		table,
		'',
		`**Verdict:** ${board.verdict.text}`,
		notes.length ? `\n${notes.join('\n')}` : '',
		'',
		'_Scores are 0–100; bold marks each model’s pick._'
	]
		.filter((line, i, all) => !(line === '' && all[i - 1] === ''))
		.join('\n')
		.trim();
}
