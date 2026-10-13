/** Contract every registered model must satisfy — new models are covered automatically. */
import { describe, expect, it } from 'vitest';
import { normalizeInputs } from '../schema';
import { decision, randomInputs, rng } from '../testing';
import { models } from './index';

describe('model registry', () => {
	it('has unique ids', () => {
		expect(new Set(models.map((m) => m.id)).size).toBe(models.length);
	});

	describe.each(models)('$name', (model) => {
		it('has a name, short label and description', () => {
			expect(model.name.trim()).not.toBe('');
			expect(model.short.trim()).not.toBe('');
			expect(model.description.trim()).not.toBe('');
		});

		it('produces valid estimates (or null) for random valid inputs', () => {
			const random = rng(model.id.length * 7919);
			for (const n of [2, 3, 5]) {
				const d = decision(...['A', 'B', 'C', 'D', 'E'].slice(0, n));
				for (let i = 0; i < 100; i++) {
					const inputs = normalizeInputs(model.inputsSchema, randomInputs(model.inputsSchema, d, random), d);
					const e = model.compute(d, inputs);
					if (e === null) continue;
					expect(e.model).toBe(model.id);
					expect(Object.keys(e.perOption).sort()).toEqual(d.options.map((o) => o.id).sort());
					for (const v of Object.values(e.perOption)) {
						expect(Number.isFinite(v)).toBe(true);
						expect(v).toBeGreaterThanOrEqual(0);
						expect(v).toBeLessThanOrEqual(100);
					}
					if (e.lean !== undefined) expect(d.options.map((o) => o.id)).toContain(e.lean);
					expect(['low', 'medium', 'high']).toContain(e.confidence);
					expect(e.summary.trim()).not.toBe('');
				}
			}
		});

		it('survives garbage inputs', () => {
			const d = decision('A', 'B');
			for (const raw of [undefined, null, 42, 'x', [], { foo: 1 }]) {
				expect(() => model.compute(d, normalizeInputs(model.inputsSchema, raw, d))).not.toThrow();
			}
		});
	});
});
