import { describe, expect, it } from 'vitest';
import { isBlank } from './decision';
import { demo } from './demo';
import { models } from './models';
import { normalizeInputs } from './schema';
import { buildScoreboard } from './scoreboard';

/** The demo as the app loads it: every model's inputs normalized. */
function load() {
	const { decision, inputs } = demo();
	const normalized = Object.fromEntries(models.map((m) => [m.id, normalizeInputs(m.inputsSchema, inputs[m.id], decision)]));
	return { decision, raw: inputs, inputs: normalized };
}

describe('demo', () => {
	const { decision, raw, inputs } = load();
	const estimates = Object.fromEntries(models.map((m) => [m.id, m.compute(decision, inputs[m.id] as never)]));

	it('is a real decision, not a blank one', () => {
		expect(decision.title).toBe('Take the job in Singapore?');
		expect(decision.options.map((o) => o.label)).toEqual(['Singapore', 'Stay in HCMC']);
		expect(isBlank(decision)).toBe(false);
	});

	it('fills every model', () => {
		expect(Object.keys(raw).sort()).toEqual(models.map((m) => m.id).sort());
		for (const m of models) expect(estimates[m.id], m.id).not.toBeNull();
	});

	it('survives normalization whole', () => {
		const sizes = (id: string, key: string) => [((raw[id] as Record<string, unknown[]>)[key] ?? []).length, ((inputs[id] as Record<string, unknown[]>)[key] ?? []).length];
		for (const [id, key] of [['matrix', 'criteria'], ['fishbone', 'causes'], ['coin-flip', 'flips']] as const) {
			const [before, after] = sizes(id, key);
			expect(after, `${id}.${key}`).toBe(before);
		}
		expect(JSON.stringify(inputs)).toContain('Pay more than triples');
	});

	it('draws every model’s map: the diagrams carry the demo', () => {
		const [sg, hcm] = decision.options.map((o) => o.id);
		const diagram = (id: string) => models.find((m) => m.id === id)!.diagram!(decision, inputs[id] as never);
		const fish = diagram('fishbone');
		expect(fish.kind === 'fishbone' && fish.head.text).toBe('I feel stuck in my career.');
		if (fish.kind === 'fishbone') {
			const causes = fish.bones.flatMap((b) => b.causes);
			expect(causes.length).toBe(6);
			expect(causes.map((c) => c.options.length).sort()).toEqual([0, 1, 1, 1, 1, 2]);
			expect(causes.find((c) => c.options.length === 2)?.options).toEqual([sg, hcm]);
		}
		const risk = diagram('premortem');
		expect(risk.kind === 'risk' && risk.points.length).toBe(7);
		const matrix = diagram('matrix');
		expect(matrix.kind === 'matrix' && matrix.rows.length).toBe(5);
		const coins = diagram('coin-flip');
		expect(coins.kind === 'coins' && coins.question.answer).toBe(sg);
	});

	it('makes the models disagree, as a real decision does', () => {
		const [sg, hcm] = decision.options.map((o) => o.id);
		expect(estimates.matrix?.lean).toBe(hcm);
		expect(estimates.premortem?.lean).toBe(hcm);
		const { verdict } = buildScoreboard(decision, models, estimates);
		expect(verdict).toMatchObject({ leader: sg, filled: 6, agree: 4, confidence: 'medium' });
	});

	it('gives every load fresh ids', () => {
		expect(demo().decision.options[0]!.id).not.toBe(decision.options[0]!.id);
	});
});
