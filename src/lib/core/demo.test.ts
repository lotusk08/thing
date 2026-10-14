import { describe, expect, it } from 'vitest';
import { isBlank } from './decision';
import { demo } from './demo';
import { decisionMap } from './map';
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

	it('gives the map its links: causes resolved by one option, both, or none', () => {
		const map = decisionMap(decision, models, inputs);
		const [sg, hcm] = decision.options.map((o) => o.id);
		expect(map.shared.map((i) => i.links.length).sort()).toEqual([0, 1, 1, 1, 1, 2]);
		expect(map.shared.find((i) => i.links.length === 2)?.links).toEqual([sg, hcm]);
		expect(map.options[sg!]!.length).toBeGreaterThan(5);
		expect(map.options[hcm!]!.length).toBeGreaterThan(5);
		expect(map.notes[0]?.text).toBe('I feel stuck in my career.');
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
