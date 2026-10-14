import { adding } from '../diagram';
import { confidenceFromMargin, defineModel, leanOf, marginOf, minConfidence, score100 } from '../model';
import { field } from '../schema';
import { optionLabel, sum } from '../util';

const CATEGORIES = [
	{ value: 'people', label: 'People' },
	{ value: 'process', label: 'Process' },
	{ value: 'tools', label: 'Tools' },
	{ value: 'environment', label: 'Environment' },
	{ value: 'information', label: 'Information' },
	{ value: 'money', label: 'Money' }
] as const;

const IMPACT_WEIGHT = { low: 1, medium: 2, high: 3 } as const;

const problem = field.text('problem', 'Problem to solve', { placeholder: 'e.g. I feel stuck in my career', multiline: true });

const causes = field.list(
	'causes',
	'Causes',
	[
		field.text('text', 'Cause', { placeholder: 'e.g. No mentor at work' }),
		field.choice('category', 'Category', CATEGORIES, { default: 'people' }),
		field.choice(
			'impact',
			'Impact',
			[
				{ value: 'low', label: 'Low' },
				{ value: 'medium', label: 'Medium' },
				{ value: 'high', label: 'High' }
			],
			{ default: 'medium' }
		),
		field.optionSet('addressedBy', 'Resolved by')
	],
	{ itemLabel: 'Cause', addLabel: 'Add cause', max: 30 }
);

export const fishbone = defineModel({
	id: 'fishbone',
	name: 'Fishbone (Ishikawa)',
	short: 'Fishbone',
	description:
		'Start from the problem, not the options. Map its causes across six categories, then mark which options would fix each cause.',
	inputsSchema: [problem, causes],
	/**
	 * Score = % of high-impact causes an option resolves. With no high-impact causes yet,
	 * falls back to impact-weighted coverage of all causes (low confidence).
	 */
	compute(decision, { causes }) {
		if (causes.length === 0) return null;
		const high = causes.filter((c) => c.impact === 'high');
		const pool = high.length ? high : causes;
		const weight = (c: (typeof causes)[number]) => (high.length ? 1 : IMPACT_WEIGHT[c.impact || 'medium']);
		const total = sum(pool.map(weight));

		const perOption: Record<string, number> = {};
		for (const o of decision.options) {
			const resolved = sum(pool.filter((c) => c.addressedBy.includes(o.id)).map(weight));
			perOption[o.id] = score100((resolved / total) * 100);
		}
		if (Object.values(perOption).every((v) => v === 0)) return null; // nothing marked as resolved yet
		const lean = leanOf(perOption);
		const confidence = minConfidence(
			confidenceFromMargin(marginOf(perOption)),
			high.length === 0 ? 'low' : high.length < 3 ? 'medium' : 'high'
		);
		const scope = high.length ? `${high.length} high-impact cause${high.length === 1 ? '' : 's'}` : 'all causes (none marked high-impact)';
		const resolvedCount = lean ? pool.filter((c) => c.addressedBy.includes(lean)).length : 0;
		return {
			model: 'fishbone',
			perOption,
			lean,
			confidence,
			summary: lean
				? `${optionLabel(decision, lean)} resolves ${resolvedCount} of ${pool.length} ${high.length ? 'high-impact causes' : 'causes'}.`
				: `No option stands out on ${scope}.`
		};
	},
	diagram(decision, { problem: head, causes: all }) {
		const ids = decision.options.map((o) => o.id);
		return {
			kind: 'fishbone',
			head: { label: problem.label, text: head.trim(), edit: { path: [], fields: [problem], title: 'Problem' } },
			bones: CATEGORIES.map((category) => ({
				label: category.label,
				causes: all
					.filter((c) => (c.category || 'people') === category.value)
					.map((c, i) => ({
						text: c.text.trim() || `Cause ${i + 1}`,
						weight: IMPACT_WEIGHT[c.impact || 'medium'],
						options: ids.filter((id) => c.addressedBy.includes(id)),
						edit: { path: ['causes'], id: c.id, fields: causes.fields, title: 'Cause', removable: true, words: 'text' }
					})),
				add: adding(causes, all, ['causes'], { preset: { category: category.value }, words: 'text' })
			}))
		};
	}
});
