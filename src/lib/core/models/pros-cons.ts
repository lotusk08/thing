import { confidenceFromMargin, defineModel, leanOf, marginOf, minConfidence, score100 } from '../model';
import { field } from '../schema';
import { optionLabel, sum } from '../util';

const impact = { min: 1, max: 3, step: 1, default: 2, ends: ['low', 'high'] } as const;
const feel = { min: -5, max: 5, step: 1, default: 0, signed: true, ends: ['awful', 'great'] } as const;

export const prosCons = defineModel({
	id: 'pros-cons',
	name: 'Pros/Cons + 10-10-10',
	short: 'Pros/Cons',
	description:
		'Weigh pros against cons (impact 1–3), then imagine how you will feel about each choice in 10 minutes, 10 months and 10 years.',
	inputsSchema: [
		field.perOption('options', 'Per option', [
			field.list('pros', 'Pros', [field.text('text', 'Pro'), field.number('impact', 'Impact', impact)], {
				itemLabel: 'Pro',
				addLabel: 'Add pro',
				inline: true,
				map: { label: 'text', tone: 'for' }
			}),
			field.list('cons', 'Cons', [field.text('text', 'Con'), field.number('impact', 'Impact', impact)], {
				itemLabel: 'Con',
				addLabel: 'Add con',
				inline: true,
				map: { label: 'text', tone: 'against' }
			}),
			field.number('min10', 'In 10 minutes I’ll feel', feel),
			field.number('months10', 'In 10 months I’ll feel', feel),
			field.number('years10', 'In 10 years I’ll feel', feel)
		])
	],
	compute(decision, { options }) {
		const rows = decision.options.flatMap((o) => {
			const v = options[o.id];
			return v ? [{ id: o.id, v }] : [];
		});
		const listed = (r: (typeof rows)[number]) => r.v.pros.length + r.v.cons.length;
		const felt = (r: (typeof rows)[number]) => r.v.min10 !== 0 || r.v.months10 !== 0 || r.v.years10 !== 0;
		if (!rows.some((r) => listed(r) > 0 || felt(r))) return null;

		const perOption: Record<string, number> = {};
		for (const { id, v } of rows) {
			const pros = sum(v.pros.map((p) => p.impact));
			const cons = sum(v.cons.map((c) => c.impact));
			const balance = pros + cons ? (pros - cons) / (pros + cons) : 0; // −1..1
			const horizon = (v.min10 + v.months10 + v.years10) / 15; // −1..1
			perOption[id] = score100(50 + 25 * balance + 25 * horizon);
		}
		const lean = leanOf(perOption);
		const confidence = minConfidence(
			confidenceFromMargin(marginOf(perOption)),
			rows.every((r) => listed(r) > 0) ? 'high' : rows.some((r) => listed(r) > 0) ? 'medium' : 'low'
		);
		return {
			model: 'pros-cons',
			perOption,
			lean,
			confidence,
			summary: lean
				? `${optionLabel(decision, lean)} has the best mix of pros vs cons and how you expect to feel over time.`
				: 'Pros, cons and time horizons balance out evenly.'
		};
	}
});
