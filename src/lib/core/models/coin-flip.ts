import { bumpConfidence, confidenceFromMargin, defineModel, leanOf, marginOf, ranked, score100, TIE } from '../model';
import { field } from '../schema';
import { optionLabel, pairs, sum } from '../util';

const REACTIONS = [
	{ value: 'relieved', label: 'Relieved' },
	{ value: 'neutral', label: 'Neutral' },
	{ value: 'disappointed', label: 'Disappointed' }
] as const;

const MIN_FLIPS = 3;

export const coinFlip = defineModel({
	id: 'coin-flip',
	name: 'Regret / Coin Flip',
	short: 'Coin',
	description:
		'Flip a coin between two options and notice your gut reaction to the result. Do 3–5 flips (with 3+ options, flips rotate through every pair).',
	inputsSchema: [
		field.list(
			'flips',
			'Flips',
			[
				field.hidden('heads', ''),
				field.hidden('tails', ''),
				field.hidden('landed', ''),
				field.choice('reaction', 'Your gut reaction', REACTIONS, { default: '' })
			],
			{
				itemLabel: 'Flip',
				addLabel: 'Flip a coin',
				max: 10,
				create({ decision, items, random }) {
					// Pick the least-flipped pair so every pair gets a turn.
					const used = (a: string, b: string) =>
						items.filter((f) => (f.heads === a && f.tails === b) || (f.heads === b && f.tails === a)).length;
					const [a, b] = pairs(decision.options.map((o) => o.id)).reduce((best, p) =>
						used(...p) < used(...best) ? p : best
					);
					const [heads, tails] = random() < 0.5 ? [a, b] : [b, a];
					return { heads, tails, landed: random() < 0.5 ? heads : tails };
				},
				itemTitle(f, i, d) {
					return `Flip ${i + 1}: heads ${optionLabel(d, f.heads)}, tails ${optionLabel(d, f.tails)} — it landed on ${optionLabel(d, f.landed)}.`;
				}
			}
		),
		field.choice(
			'regret',
			'Five years from now, which choice would you regret NOT making?',
			(d) => [...d.options.map((o) => ({ value: o.id, label: optionLabel(d, o.id) })), { value: 'unsure', label: 'Not sure' }],
			{ default: '' }
		)
	],
	/**
	 * Per option: share of its flips where your gut sided with it — relieved when it won,
	 * disappointed when it lost; neutral counts half. The regret answer breaks ties and
	 * raises (agrees) or lowers (disagrees) confidence.
	 */
	compute(decision, { flips, regret }) {
		const ids = new Set(decision.options.map((o) => o.id));
		const valid = flips.filter(
			(f) =>
				f.reaction !== '' &&
				ids.has(f.heads) &&
				ids.has(f.tails) &&
				f.heads !== f.tails &&
				(f.landed === f.heads || f.landed === f.tails)
		);
		if (valid.length === 0) return null;

		const perOption: Record<string, number> = {};
		for (const o of decision.options) {
			const involved = valid.filter((f) => f.heads === o.id || f.tails === o.id);
			const sided = sum(
				involved.map((f) => (f.reaction === 'neutral' ? 0.5 : (f.landed === o.id) === (f.reaction === 'relieved') ? 1 : 0))
			);
			perOption[o.id] = score100(involved.length ? (sided / involved.length) * 100 : 50);
		}

		const regretPick = ids.has(regret) ? regret : undefined;
		const top = ranked(perOption)[0]!.score;
		const tiedTop = ranked(perOption).filter((r) => top - r.score < TIE);
		const lean = leanOf(perOption) ?? (regretPick && tiedTop.some((r) => r.id === regretPick) ? regretPick : undefined);

		let confidence = valid.length < MIN_FLIPS ? 'low' : confidenceFromMargin(marginOf(perOption));
		if (regretPick && lean && valid.length >= MIN_FLIPS)
			confidence = regretPick === lean ? bumpConfidence(confidence) : 'low';

		const n = `${valid.length} flip${valid.length === 1 ? '' : 's'}`;
		const head = lean
			? `Your gut sided with ${optionLabel(decision, lean)} (${Math.round(perOption[lean]!)}% relief over ${n})`
			: `No clear gut reaction yet over ${n}`;
		const tail = !regretPick
			? '.'
			: regretPick === lean
				? `, and you'd regret not choosing it.`
				: `, but you'd regret not choosing ${optionLabel(decision, regretPick)}.`;
		return { model: 'coin-flip', perOption, lean, confidence, summary: head + tail };
	}
});
