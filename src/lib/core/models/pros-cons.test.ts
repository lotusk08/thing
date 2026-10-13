import { describe, expect, it } from 'vitest';
import { decision, run } from '../testing';
import { prosCons } from './pros-cons';

const d = decision('A', 'B');
const items = (...impacts: number[]) => impacts.map((impact, i) => ({ id: String(i), text: '', impact }));

describe('pros/cons + 10-10-10', () => {
	it('returns null when nothing is entered', () => {
		expect(run(prosCons, d, {})).toBeNull();
	});

	it('blends pro/con balance and time-horizon feeling equally', () => {
		const e = run(prosCons, d, {
			options: {
				a: { pros: items(3, 1), cons: items(1), min10: 5, months10: 5, years10: 5 }, // balance .6, horizon 1
				b: { pros: items(1), cons: items(3), min10: -5, months10: 0, years10: 2 } // balance -.5, horizon -.2
			}
		})!;
		expect(e.perOption.a).toBe(50 + 25 * 0.6 + 25); // 90
		expect(e.perOption.b).toBe(50 - 12.5 - 5); // 32.5
		expect(e.lean).toBe('a');
		expect(e.confidence).toBe('high');
	});

	it('uses only the time horizon when an option has no pros or cons', () => {
		const e = run(prosCons, d, { options: { a: { years10: 5 }, b: {} } })!;
		expect(e.perOption.a).toBe(58.3); // 50 + 25 · 5/15
		expect(e.perOption.b).toBe(50);
		expect(e.confidence).toBe('low'); // no pros/cons listed anywhere
	});

	it('caps confidence at medium when an option has no pros/cons listed', () => {
		const e = run(prosCons, d, { options: { a: { pros: items(3, 3, 3), min10: 5, months10: 5, years10: 5 }, b: {} } })!;
		expect(e.perOption.a).toBe(100);
		expect(e.confidence).toBe('medium');
	});
});
