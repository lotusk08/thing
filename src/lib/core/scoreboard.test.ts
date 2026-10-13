import { describe, expect, it } from 'vitest';
import { toMarkdown } from './markdown';
import { defineModel } from './model';
import { buildScoreboard, overallConfidence } from './scoreboard';
import { decision } from './testing';
import type { Estimate } from './types';

const stub = (id: string) => defineModel({ id, name: `Model ${id}`, short: id.toUpperCase(), description: 'x', inputsSchema: [], compute: () => null });
const models = [stub('m1'), stub('m2'), stub('m3'), stub('m4')];
const d = decision('A', 'B | C');
const est = (model: string, a: number, b: number, lean?: string): Estimate => ({
	model,
	perOption: { a, 'b | c': b },
	lean,
	confidence: 'medium',
	summary: `${model} says hi`
});

describe('buildScoreboard', () => {
	it('has an empty verdict when nothing is filled', () => {
		const board = buildScoreboard(d, models, {});
		expect(board.verdict.filled).toBe(0);
		expect(board.verdict.leader).toBeUndefined();
		expect(board.verdict.text).toBe('Fill in any model to see a verdict.');
		expect(board.rows[0]!.cells.every((c) => c.value === null)).toBe(true);
		expect(board.rows[0]!.average).toBeNull();
	});

	it('averages filled models and counts agreement', () => {
		const estimates = {
			m1: est('m1', 80, 40, 'a'),
			m2: est('m2', 70, 50, 'a'),
			m3: est('m3', 40, 60, 'b | c'),
			m4: null
		};
		const board = buildScoreboard(d, models, estimates);
		const [a, b] = board.rows;
		expect(a!.average).toBeCloseTo(63.33, 2);
		expect(b!.average).toBe(50);
		expect(a!.isLeader).toBe(true);
		expect(a!.cells.map((c) => c.value)).toEqual([80, 70, 40, null]);
		expect(a!.cells.map((c) => c.isLean)).toEqual([true, true, false, false]);
		expect(board.verdict).toMatchObject({ leader: 'a', filled: 3, agree: 2, confidence: 'medium' });
		expect(board.verdict.text).toBe('A leads (avg 63) · 2 of 3 models agree · medium confidence');
	});

	it('reports ties', () => {
		const board = buildScoreboard(d, models, { m1: est('m1', 60, 60) });
		expect(board.verdict.leader).toBeUndefined();
		expect(board.verdict.tied).toEqual(['a', 'b | c']);
		expect(board.verdict.text).toBe('A and B | C are tied · 1 model filled');
	});
});

describe('overallConfidence', () => {
	it('needs breadth, agreement and margin for high', () => {
		expect(overallConfidence(3, 3, 10)).toBe('high');
		expect(overallConfidence(4, 3, 12)).toBe('high');
		expect(overallConfidence(2, 2, 30)).toBe('medium');
		expect(overallConfidence(4, 2, 30)).toBe('medium');
		expect(overallConfidence(4, 4, 4)).toBe('low');
		expect(overallConfidence(1, 1, 50)).toBe('low');
		expect(overallConfidence(0, 0, 0)).toBe('low');
	});
});

describe('toMarkdown', () => {
	it('renders a table with escaped labels, verdict and notes', () => {
		const estimates = { m1: est('m1', 80, 40, 'a'), m2: est('m2', 70.6, 50, 'a') };
		const md = toMarkdown({ ...d, title: 'Move?' }, models, estimates, buildScoreboard(d, models, estimates));
		expect(md).toBe(
			[
				'## Move?',
				'',
				'| Option | M1 | M2 | M3 | M4 | Avg |',
				'| :-- | --: | --: | --: | --: | --: |',
				'| A | **80** | **71** | – | – | **75** |',
				'| B \\| C | 40 | 50 | – | – | 45 |',
				'',
				'**Verdict:** A leads (avg 75) · 2 of 2 models agree · medium confidence',
				'',
				'- **Model m1** (medium confidence): m1 says hi',
				'- **Model m2** (medium confidence): m2 says hi',
				'',
				'_Scores are 0–100; bold marks each model’s pick._'
			].join('\n')
		);
	});
});
