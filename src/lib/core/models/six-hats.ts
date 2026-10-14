import type { Swatch } from '../diagram';
import { confidenceFromMargin, defineModel, leanOf, marginOf, ranked, score100 } from '../model';
import { field } from '../schema';
import { optionLabel, sum } from '../util';

const rate = { min: 1, max: 5, step: 1, default: 3 } as const;

const weightFields = [
	field.number('red', 'Red hat (gut)', { min: 0, max: 3, step: 0.5, default: 1, ends: ['ignore', 'triple'] }),
	field.number('black', 'Black hat (risks)', { min: 0, max: 3, step: 0.5, default: 1, ends: ['ignore', 'triple'] })
] as const;

const hatFields = [
	field.number('white', 'White · facts', { ...rate, help: 'How well do facts and data support it?', ends: ['weak', 'strong'] }),
	field.number('red', 'Red · gut feeling', { ...rate, help: 'Your emotional reaction.', ends: ['dread', 'excited'] }),
	field.number('black', 'Black · risks', { ...rate, help: 'How serious are the downsides? Higher counts against it.', ends: ['minor', 'severe'] }),
	field.number('yellow', 'Yellow · benefits', { ...rate, help: 'How big is the upside?', ends: ['small', 'big'] }),
	field.number('green', 'Green · ideas', { ...rate, help: 'Does it open new possibilities?', ends: ['few', 'many'] }),
	field.number('blue', 'Blue · process', { ...rate, help: 'Does it fit your goals, plan and constraints?', ends: ['poorly', 'well'] })
] as const;

/** The radar's axes, in hat order and the hats' own colours; black reads as "few risks" so bigger is better. */
const AXES: { label: string; detail: string; swatch: Swatch; inverted?: boolean }[] = [
	{ label: 'White', detail: 'facts', swatch: 'paper' },
	{ label: 'Red', detail: 'gut', swatch: 'danger' },
	{ label: 'Black', detail: 'few risks', swatch: 'ink', inverted: true },
	{ label: 'Yellow', detail: 'benefits', swatch: 'warning' },
	{ label: 'Green', detail: 'ideas', swatch: 'tip' },
	{ label: 'Blue', detail: 'process', swatch: 'info' }
];

export const sixHats = defineModel({
	id: 'six-hats',
	name: 'Six Thinking Hats',
	short: 'Hats',
	description:
		'Look at each option through six lenses. Black (risks) counts against an option; tune how much your gut (red) and risks (black) matter.',
	inputsSchema: [
		field.group('weights', 'Hat weights', weightFields, { help: 'The other four hats count ×1.' }),
		field.perOption('hats', 'Rate each option', hatFields)
	],
	compute(decision, { weights, hats }) {
		const w = { white: 1, red: weights.red, black: weights.black, yellow: 1, green: 1, blue: 1 };
		const total = sum(Object.values(w)); // ≥ 4: four hats are fixed at ×1
		const perOption: Record<string, number> = {};
		for (const o of decision.options) {
			const h = hats[o.id];
			if (!h) continue;
			const raw =
				w.white * h.white +
				w.red * h.red +
				w.black * (6 - h.black) + // invert: high risk → low contribution
				w.yellow * h.yellow +
				w.green * h.green +
				w.blue * h.blue;
			perOption[o.id] = score100(((raw - total) / (4 * total)) * 100);
		}
		const lean = leanOf(perOption);
		const [first, second] = ranked(perOption);
		return {
			model: 'six-hats',
			perOption,
			lean,
			confidence: confidenceFromMargin(marginOf(perOption)),
			summary:
				lean && first && second
					? `${optionLabel(decision, lean)} comes out ahead under the hats (${Math.round(first.score)} vs ${Math.round(second.score)}).`
					: "The hats don't separate the options yet."
		};
	},
	diagram(decision, { weights, hats }) {
		return {
			kind: 'radar',
			min: rate.min,
			max: rate.max,
			axes: AXES,
			series: decision.options.map((o) => {
				const h = hats[o.id]!;
				return {
					option: o.id,
					values: [h.white, h.red, h.black, h.yellow, h.green, h.blue],
					edit: { path: ['hats', o.id], fields: hatFields, title: 'Hats' }
				};
			}),
			notes: [
				{
					label: 'Weights',
					text: `Red ×${weights.red} · Black ×${weights.black}`,
					edit: { path: ['weights'], fields: weightFields, title: 'Hat weights' }
				}
			]
		};
	}
});
