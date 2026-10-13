import { confidenceFromMargin, defineModel, leanOf, marginOf, minConfidence, score100 } from '../model';
import { field } from '../schema';
import { optionLabel, sum } from '../util';

export const MIN_CRITERIA = 3;

export const matrix = defineModel({
	id: 'matrix',
	name: 'Weighted Decision Matrix',
	short: 'Matrix',
	description:
		'List 3–7 criteria that matter, weight each 1–10, then score every option 1–10 per criterion.',
	inputsSchema: [
		field.list(
			'criteria',
			'Criteria',
			[
				field.text('name', 'Criterion', { placeholder: 'e.g. Salary, Family, Growth' }),
				field.number('weight', 'Weight', { min: 1, max: 10, step: 1, default: 5, ends: ['minor', 'critical'] }),
				field.perOption('scores', 'Scores', [
					field.number('score', 'Score', { min: 1, max: 10, step: 1, default: 5, ends: ['poor', 'excellent'] })
				])
			],
			{ itemLabel: 'Criterion', addLabel: 'Add criterion', max: 7 }
		)
	],
	compute(decision, { criteria }) {
		if (criteria.length === 0) return null;
		const totalWeight = sum(criteria.map((c) => c.weight)); // weights are ≥ 1
		const perOption: Record<string, number> = {};
		for (const o of decision.options) {
			const weighted = sum(criteria.map((c) => c.weight * (c.scores[o.id]?.score ?? 1))) / totalWeight; // 1–10
			perOption[o.id] = score100(((weighted - 1) / 9) * 100);
		}
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
	}
});
