import { confidenceFromMargin, defineModel, leanOf, marginOf, minConfidence, ranked, score100 } from '../model';
import { field } from '../schema';
import { optionLabel } from '../util';

const scale = { min: 1, max: 5, step: 1, default: 3 } as const;

export const premortem = defineModel({
	id: 'premortem',
	name: 'Pre-mortem',
	short: 'Pre-mortem',
	description:
		'Imagine it’s a year later and the choice failed. Why? List the failure reasons for each option and rate their likelihood and severity.',
	inputsSchema: [
		field.perOption('options', 'Per option', [
			field.list(
				'failures',
				'Failure reasons',
				[
					field.text('reason', 'Why it failed', { placeholder: 'e.g. Team culture was a bad fit' }),
					field.number('likelihood', 'Likelihood', { ...scale, ends: ['rare', 'likely'] }),
					field.number('severity', 'Severity', { ...scale, ends: ['minor', 'disaster'] })
				],
				{ itemLabel: 'Failure', addLabel: 'Add failure reason', inline: true }
			)
		])
	],
	/**
	 * Each failure is an expected-damage fraction L·S/25 (0.04–1). Exposure compounds:
	 * exposure = 1 − Π(1 − L·S/25), so more and worse risks push it toward 1.
	 * Score = 100 × (1 − exposure).
	 */
	compute(decision, { options }) {
		const all = decision.options.map((o) => ({ id: o.id, failures: options[o.id]?.failures ?? [] }));
		if (all.every((o) => o.failures.length === 0)) return null;

		const perOption: Record<string, number> = {};
		for (const { id, failures } of all) {
			const survival = failures.reduce((p, f) => p * (1 - (f.likelihood * f.severity) / 25), 1);
			perOption[id] = score100(survival * 100);
		}
		const lean = leanOf(perOption);
		const incomplete = all.filter((o) => o.failures.length === 0);
		const confidence = minConfidence(confidenceFromMargin(marginOf(perOption)), incomplete.length ? 'low' : 'high');

		const riskiest = ranked(perOption).at(-1);
		const worst = all
			.find((o) => o.id === riskiest?.id)
			?.failures.slice()
			.sort((a, b) => b.likelihood * b.severity - a.likelihood * a.severity)[0];
		const threat =
			worst && riskiest && riskiest.id !== lean && worst.reason.trim()
				? ` Biggest threat to ${optionLabel(decision, riskiest.id)}: “${worst.reason.trim()}”.`
				: '';
		const gap = incomplete.length ? ` (no failures listed yet for ${incomplete.map((o) => optionLabel(decision, o.id)).join(', ')})` : '';
		return {
			model: 'premortem',
			perOption,
			lean,
			confidence,
			summary: (lean ? `${optionLabel(decision, lean)} carries the least risk${gap}.` : `Risk exposure is even${gap}.`) + threat
		};
	}
});
