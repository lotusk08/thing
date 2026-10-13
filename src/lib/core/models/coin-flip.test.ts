import { describe, expect, it } from 'vitest';
import { createItem, type Item } from '../schema';
import { decision, rng, run } from '../testing';
import { coinFlip } from './coin-flip';

const d = decision('A', 'B');
const flip = (heads: string, tails: string, landed: string, reaction: string) => ({ heads, tails, landed, reaction });

describe('coin flip', () => {
	it('returns null until a reaction is recorded', () => {
		expect(run(coinFlip, d, { flips: [flip('a', 'b', 'a', '')] })).toBeNull();
	});

	it('scores relief rate: relieved when it won, disappointed when it lost', () => {
		const e = run(coinFlip, d, {
			flips: [
				flip('a', 'b', 'a', 'relieved'), // → A
				flip('b', 'a', 'b', 'disappointed'), // → A
				flip('a', 'b', 'a', 'neutral'), // → half each
				flip('a', 'b', 'b', 'relieved') // → B
			]
		})!;
		expect(e.perOption.a).toBe(62.5);
		expect(e.perOption.b).toBe(37.5);
		expect(e.lean).toBe('a');
		expect(e.confidence).toBe('high'); // 25-point margin
		expect(e.summary).toBe('Your gut sided with A (63% relief over 4 flips).');
	});

	it('uses the regret answer to adjust confidence and break ties', () => {
		const flips = [flip('a', 'b', 'a', 'relieved'), flip('a', 'b', 'a', 'relieved'), flip('a', 'b', 'b', 'disappointed')];
		const agrees = run(coinFlip, d, { flips, regret: 'a' })!;
		expect(agrees.confidence).toBe('high');
		expect(agrees.summary).toContain("and you'd regret not choosing it");

		const disagrees = run(coinFlip, d, { flips, regret: 'b' })!;
		expect(disagrees.lean).toBe('a');
		expect(disagrees.confidence).toBe('low');
		expect(disagrees.summary).toContain("but you'd regret not choosing B");

		const tie = run(coinFlip, d, { flips: [flip('a', 'b', 'a', 'neutral')], regret: 'b' })!;
		expect(tie.perOption).toEqual({ a: 50, b: 50 });
		expect(tie.lean).toBe('b');
	});

	it('is low confidence with fewer than 3 flips', () => {
		const e = run(coinFlip, d, { flips: [flip('a', 'b', 'a', 'relieved')] })!;
		expect(e.perOption).toEqual({ a: 100, b: 0 });
		expect(e.confidence).toBe('low');
	});

	it('ignores flips that reference removed options; uninvolved options stay at 50', () => {
		const three = decision('A', 'B', 'C');
		const e = run(coinFlip, three, { flips: [flip('a', 'b', 'a', 'relieved'), flip('a', 'gone', 'a', 'relieved')] })!;
		expect(e.perOption).toEqual({ a: 100, b: 0, c: 50 });
	});

	it('creates flips that rotate through every pair, with a random result', () => {
		const list = coinFlip.inputsSchema[0];
		const three = decision('A', 'B', 'C');
		const random = rng(1);
		const items: Item<typeof list.fields>[] = [];
		for (let i = 0; i < 3; i++) items.push(createItem(list, three, items, random));
		const pairs = items.map((f) => [f.heads, f.tails].sort().join(''));
		expect(pairs.sort()).toEqual(['ab', 'ac', 'bc']);
		for (const f of items) expect([f.heads, f.tails]).toContain(f.landed);
		expect(items[0]!.reaction).toBe('');
	});
});
