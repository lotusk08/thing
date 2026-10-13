import { describe, expect, it } from 'vitest';
import { decision, run } from '../testing';
import { premortem } from './premortem';

const d = decision('A', 'B');
const fail = (likelihood: number, severity: number, reason = '') => ({ reason, likelihood, severity });

describe('pre-mortem', () => {
	it('returns null when no failures are listed', () => {
		expect(run(premortem, d, {})).toBeNull();
	});

	it('scores 100 minus compounded risk exposure', () => {
		const e = run(premortem, d, {
			options: {
				a: { failures: [fail(2, 2)] }, // 1 - 4/25 = .84
				b: { failures: [fail(3, 3), fail(4, 3, 'Burnout')] } // (1 - 9/25)(1 - 12/25) = .3328
			}
		})!;
		expect(e.perOption.a).toBe(84);
		expect(e.perOption.b).toBe(33.3);
		expect(e.lean).toBe('a');
		expect(e.confidence).toBe('high');
		expect(e.summary).toBe('A carries the least risk. Biggest threat to B: “Burnout”.');
	});

	it('scores a certain, catastrophic failure at 0', () => {
		const e = run(premortem, d, { options: { a: { failures: [fail(5, 5)] }, b: { failures: [fail(1, 1)] } } })!;
		expect(e.perOption.a).toBe(0);
		expect(e.perOption.b).toBe(96);
	});

	it('has low confidence while an option has no failures listed', () => {
		const e = run(premortem, d, { options: { a: { failures: [fail(5, 4)] } } })!;
		expect(e.perOption.b).toBe(100);
		expect(e.lean).toBe('b');
		expect(e.confidence).toBe('low');
		expect(e.summary).toContain('no failures listed yet for B');
	});
});
