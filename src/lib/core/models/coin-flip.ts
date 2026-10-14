import { adding } from '../diagram';
import { bumpConfidence, confidenceFromMargin, defineModel, leanOf, marginOf, ranked, score100, TIE } from '../model';
import { field, type Item } from '../schema';
import type { Decision, OptionId } from '../types';
import { optionLabel, pairs, sum } from '../util';

const REACTIONS = [
	{ value: 'relieved', label: 'Relieved' },
	{ value: 'neutral', label: 'Neutral' },
	{ value: 'disappointed', label: 'Disappointed' }
] as const;

const MIN_FLIPS = 3;

const flips = field.list(
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
);

const regret = field.choice(
	'regret',
	'Five years from now, which choice would you regret NOT making?',
	(d) => [...d.options.map((o) => ({ value: o.id, label: optionLabel(d, o.id) })), { value: 'unsure', label: 'Not sure' }],
	{ default: '' }
);

type Flip = Item<(typeof flips)['fields']>;

/** Flips that count: answered, between two current options, landed on one of them. */
function counted(decision: Decision, all: readonly Flip[]): Flip[] {
	const ids = new Set(decision.options.map((o) => o.id));
	return all.filter(
		(f) => f.reaction !== '' && ids.has(f.heads) && ids.has(f.tails) && f.heads !== f.tails && (f.landed === f.heads || f.landed === f.tails)
	);
}

/**
 * Relief per option, 0–100: your gut sided with it when you were relieved it won or
 * disappointed it lost; neutral counts half. Null for an option no flip involved.
 */
function relief(decision: Decision, valid: readonly Flip[]): Record<OptionId, { rate: number | null; flips: number }> {
	return Object.fromEntries(
		decision.options.map((o) => {
			const involved = valid.filter((f) => f.heads === o.id || f.tails === o.id);
			const sided = sum(
				involved.map((f) => (f.reaction === 'neutral' ? 0.5 : (f.landed === o.id) === (f.reaction === 'relieved') ? 1 : 0))
			);
			return [o.id, { rate: involved.length ? (sided / involved.length) * 100 : null, flips: involved.length }];
		})
	);
}

const FEELING = { relieved: 'good', disappointed: 'bad', neutral: 'neutral' } as const;

export const coinFlip = defineModel({
	id: 'coin-flip',
	name: 'Regret / Coin Flip',
	short: 'Coin',
	description:
		'Flip a coin between two options and notice your gut reaction to the result. Do 3–5 flips (with 3+ options, flips rotate through every pair).',
	inputsSchema: [flips, regret],
	compute(decision, inputs) {
		const valid = counted(decision, inputs.flips);
		if (valid.length === 0) return null;

		const perOption: Record<string, number> = {};
		for (const [id, r] of Object.entries(relief(decision, valid))) perOption[id] = score100(r.rate ?? 50);

		const ids = new Set(decision.options.map((o) => o.id));
		const regretPick = ids.has(inputs.regret) ? inputs.regret : undefined;
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
	},
	diagram(decision, inputs) {
		const ids = decision.options.map((o) => o.id);
		const rates = relief(decision, counted(decision, inputs.flips));
		const answer = ids.includes(inputs.regret) ? inputs.regret : undefined;
		return {
			kind: 'coins',
			flips: inputs.flips.flatMap((f, i) =>
				ids.includes(f.landed)
					? [
							{
								landed: f.landed,
								feeling: f.reaction ? FEELING[f.reaction] : undefined,
								text: REACTIONS.find((r) => r.value === f.reaction)?.label ?? 'No reaction yet',
								edit: { path: ['flips'], id: f.id, fields: flips.fields, title: `Flip ${i + 1}`, removable: true, words: 'reaction' }
							}
						]
					: []
			),
			relief: ids.map((id) => ({ option: id, ...rates[id]! })),
			question: {
				label: regret.label,
				answer,
				text: answer ? optionLabel(decision, answer) : inputs.regret === 'unsure' ? 'Not sure' : 'Not answered yet',
				edit: { path: [], fields: [regret], title: 'Regret' }
			},
			add: adding(flips, inputs.flips, ['flips'], { words: 'reaction' })
		};
	}
});
