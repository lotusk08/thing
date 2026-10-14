import { confidenceFromMargin, defineModel, leanOf, marginOf, ranked, score100 } from '../model';
import { field } from '../schema';
import { optionLabel, sum } from '../util';

const rate = { min: 1, max: 5, step: 1, default: 3, map: true } as const;

export const sixHats = defineModel({
	id: 'six-hats',
	name: 'Six Thinking Hats',
	short: 'Hats',
	description:
		'Look at each option through six lenses. Black (risks) counts against an option; tune how much your gut (red) and risks (black) matter.',
	inputsSchema: [
		field.group(
			'weights',
			'Hat weights',
			[
				field.number('red', 'Red hat (gut) weight', { min: 0, max: 3, step: 0.5, default: 1 }),
				field.number('black', 'Black hat (risks) weight', { min: 0, max: 3, step: 0.5, default: 1 })
			],
			{ help: 'The other four hats count ×1.' }
		),
		field.perOption('hats', 'Rate each option', [
			field.number('white', 'White · facts', { ...rate, help: 'How well do facts and data support it?', ends: ['weak', 'strong'] }),
			field.number('red', 'Red · gut feeling', { ...rate, help: 'Your emotional reaction.', ends: ['dread', 'excited'] }),
			field.number('black', 'Black · risks', { ...rate, map: { tone: 'against' }, help: 'How serious are the downsides? Higher counts against it.', ends: ['minor', 'severe'] }),
			field.number('yellow', 'Yellow · benefits', { ...rate, help: 'How big is the upside?', ends: ['small', 'big'] }),
			field.number('green', 'Green · ideas', { ...rate, help: 'Does it open new possibilities?', ends: ['few', 'many'] }),
			field.number('blue', 'Blue · process', { ...rate, help: 'Does it fit your goals, plan and constraints?', ends: ['poorly', 'well'] })
		])
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
	}
});
