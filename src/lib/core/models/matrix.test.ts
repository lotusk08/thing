import { describe, expect, it } from 'vitest';
import { decision, run } from '../testing';
import { matrix } from './matrix';

const d = decision('A', 'B', 'C');
const criterion = (weight: number, a: number, b: number, c: number) => ({
	name: 'x',
	weight,
	scores: { a: { score: a }, b: { score: b }, c: { score: c } }
});

describe('weighted decision matrix', () => {
	it('returns null without criteria', () => {
		expect(run(matrix, d, { criteria: [] })).toBeNull();
	});

	it('normalizes the weighted 1–10 total to 0–100', () => {
		const e = run(matrix, d, { criteria: [criterion(5, 10, 1, 5.5), criterion(5, 10, 1, 5.5), criterion(5, 10, 1, 5.5)] })!;
		expect(e.perOption).toEqual({ a: 100, b: 0, c: 50 });
		expect(e.lean).toBe('a');
		expect(e.confidence).toBe('high');
		expect(e.summary).toBe('A scores 10.0/10 weighted across 3 criteria.');
	});

	it('weights criteria', () => {
		// A wins the heavy criterion, B wins two light ones.
		const e = run(matrix, d, { criteria: [criterion(10, 10, 1, 1), criterion(1, 1, 10, 1), criterion(1, 1, 10, 1)] })!;
		// A: (100+1+1)/12 = 8.5 → 83.3; B: (10+10+10)/12 = 2.5 → 16.7
		expect(e.perOption.a).toBeCloseTo(83.3, 1);
		expect(e.perOption.b).toBeCloseTo(16.7, 1);
		expect(e.lean).toBe('a');
	});

	it('is low confidence with fewer than 3 criteria', () => {
		const e = run(matrix, d, { criteria: [criterion(5, 10, 1, 1)] })!;
		expect(e.lean).toBe('a');
		expect(e.confidence).toBe('low');
	});

	it('scores new criteria at the default 5 for every option (tie)', () => {
		const e = run(matrix, d, { criteria: [{ name: 'x' }] })!;
		expect(new Set(Object.values(e.perOption)).size).toBe(1);
		expect(e.lean).toBeUndefined();
	});
});
