import { adding } from '../diagram';
import { confidenceFromMargin, defineModel, leanOf, marginOf, minConfidence, score100 } from '../model';
import { field } from '../schema';
import { optionLabel, sum } from '../util';

const MIN_CRITERIA = 3;

const weight = { min: 1, max: 10, step: 1, default: 5, ends: ['minor', 'critical'] } as const;
const score = { min: 1, max: 10, step: 1, default: 5, ends: ['poor', 'excellent'] } as const;

const criteria = field.list(
	'criteria',
	'Criteria',
	[
		field.text('name', 'Criterion', { placeholder: 'e.g. Salary, Family, Growth' }),
		field.number('weight', 'Weight', weight),
		field.perOption('scores', 'Scores', [field.number('score', 'Score', score)])
	],
	{ itemLabel: 'Criterion', addLabel: 'Add criterion', max: 7 }
);

/** Score per option, weighted across criteria, on the scores' own 1–10 scale. */
const weighted = (rows: { weight: number; scores: Record<string, { score: number } | undefined> }[], option: string) =>
	sum(rows.map((c) => c.weight * (c.scores[option]?.score ?? 1))) / sum(rows.map((c) => c.weight));

export const matrix = defineModel({
	id: 'matrix',
	name: 'Weighted Decision Matrix',
	short: 'Matrix',
	description:
		'List 3–7 criteria that matter, weight each 1–10, then score every option 1–10 per criterion.',
	inputsSchema: [criteria],
	compute(decision, { criteria }) {
		if (criteria.length === 0) return null;
		const perOption: Record<string, number> = {};
		for (const o of decision.options) perOption[o.id] = score100(((weighted(criteria, o.id) - 1) / 9) * 100); // weights are ≥ 1

		const lean = leanOf(perOption);
		const confidence = minConfidence(
			confidenceFromMargin(marginOf(perOption)),
			criteria.length < MIN_CRITERIA ? 'low' : 'high'
		);
		const n = `${criteria.length} criteri${criteria.length === 1 ? 'on' : 'a'}`;
		return {
			model: 'matrix',
			perOption,
			lean,
			confidence,
			summary: lean
				? `${optionLabel(decision, lean)} scores ${(1 + (perOption[lean]! / 100) * 9).toFixed(1)}/10 weighted across ${n}.`
				: `Options tie across ${n}.`
		};
	},
	diagram(decision, { criteria: rows }) {
		return {
			kind: 'matrix',
			max: score.max,
			weightMax: weight.max,
			rows: rows.map((c, i) => ({
				label: c.name.trim() || `Criterion ${i + 1}`,
				weight: c.weight,
				scores: Object.fromEntries(decision.options.map((o) => [o.id, c.scores[o.id]?.score ?? score.min])),
				edit: { path: ['criteria'], id: c.id, fields: criteria.fields, title: 'Criterion', removable: true, words: 'name' }
			})),
			totals: Object.fromEntries(decision.options.map((o) => [o.id, rows.length ? weighted(rows, o.id) : null])),
			add: adding(criteria, rows, ['criteria'], { words: 'name' })
		};
	}
});
