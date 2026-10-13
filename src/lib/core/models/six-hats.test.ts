import { describe, expect, it } from 'vitest';
import { decision, run } from '../testing';
import { sixHats } from './six-hats';

const d = decision('A', 'B');
const all = (v: number) => ({ white: v, red: v, black: v, yellow: v, green: v, blue: v });

describe('six hats', () => {
	it('scores neutral ratings at 50 and ties', () => {
		const e = run(sixHats, d, {})!;
		expect(e.perOption).toEqual({ a: 50, b: 50 });
		expect(e.lean).toBeUndefined();
		expect(e.confidence).toBe('low');
	});

	it('maps the best and worst possible ratings to 100 and 0 (black is inverted)', () => {
		const e = run(sixHats, d, { hats: { a: { ...all(5), black: 1 }, b: { ...all(1), black: 5 } } })!;
		expect(e.perOption).toEqual({ a: 100, b: 0 });
		expect(e.lean).toBe('a');
		expect(e.confidence).toBe('high');
		expect(e.summary).toContain('A comes out ahead');
	});

	it('treats a high black rating as a penalty', () => {
		const e = run(sixHats, d, { hats: { a: { black: 5 }, b: { black: 1 } } })!;
		// 6 hats ×1, A: black contributes 1 (vs 3 neutral) → (16 - 6)/24 ≈ 41.7
		expect(e.perOption.a).toBeCloseTo(41.7, 1);
		expect(e.perOption.b).toBeCloseTo(58.3, 1);
		expect(e.lean).toBe('b');
	});

	it('applies the editable red and black weights', () => {
		const hats = { a: { red: 5 }, b: { yellow: 5 } };
		const plain = run(sixHats, d, { hats })!;
		expect(plain.lean).toBeUndefined(); // one point each at weight 1

		const gutHeavy = run(sixHats, d, { hats, weights: { red: 3 } })!;
		expect(gutHeavy.lean).toBe('a');
		// total weight 8; A raw = 3·5 (red) + 5·3 (others) = 30 → (30 - 8) / 32 = 68.75
		expect(gutHeavy.perOption.a).toBe(68.8);

		const noRisk = run(sixHats, d, { hats: { a: { black: 5 } }, weights: { black: 0 } })!;
		expect(noRisk.perOption.a).toBe(noRisk.perOption.b);
	});
});
