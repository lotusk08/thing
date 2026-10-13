import { describe, expect, it } from 'vitest';
import { decision, run } from '../testing';
import { fishbone } from './fishbone';

const d = decision('A', 'B', 'C');
const cause = (impact: string, addressedBy: string[], category = 'people') => ({ text: 'x', category, impact, addressedBy });

describe('fishbone', () => {
	it('returns null without causes', () => {
		expect(run(fishbone, d, { problem: 'Stuck' })).toBeNull();
	});

	it('returns null until some option resolves a cause', () => {
		expect(run(fishbone, d, { causes: [cause('high', [])] })).toBeNull();
	});

	it('scores the % of high-impact causes each option resolves', () => {
		const e = run(fishbone, d, {
			causes: [
				cause('high', ['a', 'b']),
				cause('high', ['a']),
				cause('high', ['a'], 'money'),
				cause('high', ['c']),
				cause('low', ['b', 'c']) // ignored: not high-impact
			]
		})!;
		expect(e.perOption).toEqual({ a: 75, b: 25, c: 25 });
		expect(e.lean).toBe('a');
		expect(e.confidence).toBe('high');
		expect(e.summary).toBe('A resolves 3 of 4 high-impact causes.');
	});

	it('falls back to impact-weighted coverage when nothing is high-impact', () => {
		const e = run(fishbone, d, { causes: [cause('medium', ['a']), cause('low', ['b'])] })!;
		expect(e.perOption.a).toBeCloseTo(66.7, 1);
		expect(e.perOption.b).toBeCloseTo(33.3, 1);
		expect(e.perOption.c).toBe(0);
		expect(e.confidence).toBe('low');
	});

	it('ignores options that no longer exist', () => {
		const e = run(fishbone, d, { causes: [cause('high', ['a', 'gone'])] })!;
		expect(e.perOption).toEqual({ a: 100, b: 0, c: 0 });
		expect(e.confidence).toBe('medium'); // fewer than 3 high-impact causes
	});
});
