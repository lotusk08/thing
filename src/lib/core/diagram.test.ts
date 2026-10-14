import { describe, expect, it } from 'vitest';
import { letter, listAt, slotOf, type Add, type Diagram, type Ref } from './diagram';
import { models } from './models';
import { normalizeInputs } from './schema';
import { decision, randomInputs, rng } from './testing';

const model = (id: string) => models.find((m) => m.id === id)!;

/** A model's diagram and all the inputs (by model id) it was drawn from, from partial raw input. */
function draw(id: string, raw: unknown, d = decision('A', 'B')) {
	const m = model(id);
	const inputs = { [id]: normalizeInputs(m.inputsSchema, raw, d) };
	return { d, inputs, diagram: m.diagram!(d, inputs[id] as never) };
}

/** Everything in a diagram the sheet can edit, and everything it can add. */
function parts(diagram: Diagram) {
	const refs: Ref[] = [];
	const adds: Add[] = [];
	const walk = (v: unknown) => {
		if (Array.isArray(v)) return v.forEach(walk);
		if (!v || typeof v !== 'object') return;
		if ('list' in v && 'path' in v) adds.push(v as Add);
		else if ('fields' in v && 'path' in v) refs.push(v as Ref);
		else Object.values(v).forEach(walk);
	};
	walk(diagram);
	return { refs, adds };
}

describe('every model’s diagram', () => {
	it('draws, and everything on it leads back to its inputs, for random inputs and 2–5 options', () => {
		const random = rng(7);
		for (const m of models) {
			expect('diagram' in m, m.id).toBe(true);
			for (const labels of [['A', 'B'], ['A', 'B', 'C'], ['A', 'B', 'C', 'D', 'E']]) {
				for (let run = 0; run < 15; run++) {
					const d = decision(...labels);
					const inputs = { [m.id]: normalizeInputs(m.inputsSchema, randomInputs(m.inputsSchema, d, random), d) };
					const diagram = m.diagram!(d, inputs[m.id] as never);
					const { refs, adds } = parts(diagram);
					expect(refs.length + adds.length, m.id).toBeGreaterThan(0);
					for (const ref of refs) expect(slotOf(inputs, m.id, ref), `${m.id} ${ref.title} ${ref.path.join('/')}`).toBeDefined();
					for (const add of adds) expect(listAt(inputs[m.id], add.path), `${m.id} add ${add.title}`).toBeDefined();
				}
			}
		}
	});
});

describe('Six Hats: a radar', () => {
	const { diagram } = draw('six-hats', { weights: { red: 2, black: 0.5 }, hats: { a: { white: 5, black: 4 } } });

	it('has the six hats, in their colours, black read as few risks', () => {
		if (diagram.kind !== 'radar') throw new Error(diagram.kind);
		expect(diagram.axes.map((a) => [a.label, a.swatch, !!a.inverted])).toEqual([
			['White', 'paper', false],
			['Red', 'danger', false],
			['Black', 'ink', true],
			['Yellow', 'warning', false],
			['Green', 'tip', false],
			['Blue', 'info', false]
		]);
		expect(diagram.series[0]).toMatchObject({ option: 'a', values: [5, 3, 4, 3, 3, 3], edit: { path: ['hats', 'a'] } });
		expect(diagram.notes[0]).toMatchObject({ text: 'Red ×2 · Black ×0.5', edit: { path: ['weights'] } });
	});
});

describe('Matrix: a weighted table', () => {
	const { diagram } = draw('matrix', {
		criteria: [
			{ id: 'c1', name: 'Pay', weight: 9, scores: { a: { score: 9 }, b: { score: 5 } } },
			{ id: 'c2', name: '', weight: 1, scores: { a: { score: 1 }, b: { score: 10 } } }
		]
	});

	it('has each criterion with its weight and scores, and the weighted score per option', () => {
		if (diagram.kind !== 'matrix') throw new Error(diagram.kind);
		expect(diagram.rows.map((r) => [r.label, r.weight, r.scores])).toEqual([
			['Pay', 9, { a: 9, b: 5 }],
			['Criterion 2', 1, { a: 1, b: 10 }]
		]);
		expect(diagram.totals.a).toBeCloseTo(8.2);
		expect(diagram.totals.b).toBeCloseTo(5.5);
		expect(diagram.add).toMatchObject({ path: ['criteria'], full: false });
	});

	it('has no totals without criteria', () => {
		const empty = draw('matrix', {}).diagram;
		expect(empty.kind === 'matrix' && empty.totals).toEqual({ a: null, b: null });
	});
});

describe('Pros/Cons: Franklin’s T and 10-10-10', () => {
	const { diagram } = draw('pros-cons', {
		options: { a: { pros: [{ id: 'p', text: 'Pay', impact: 3 }], cons: [{ id: 'c', text: '', impact: 1 }], years10: 4 } }
	});

	it('weighs each option’s pros against its cons', () => {
		if (diagram.kind !== 'weigh') throw new Error(diagram.kind);
		const a = diagram.sides[0]!;
		expect(a.for).toMatchObject([{ text: 'Pay', weight: 3, edit: { path: ['options', 'a', 'pros'], id: 'p' } }]);
		expect(a.against).toMatchObject([{ text: 'Con 1', weight: 1 }]);
		expect(a.add.against.path).toEqual(['options', 'a', 'cons']);
		expect(diagram.sides[1]).toMatchObject({ option: 'b', for: [], against: [] });
	});

	it('follows each option over 10 minutes, months and years', () => {
		if (diagram.kind !== 'weigh') throw new Error(diagram.kind);
		expect(diagram.horizons.labels).toEqual(['10 minutes', '10 months', '10 years']);
		expect(diagram.horizons.lines[0]).toMatchObject({ values: [0, 0, 4], edit: { path: ['options', 'a'] } });
	});
});

describe('Pre-mortem: a risk matrix', () => {
	const { diagram } = draw('premortem', {
		options: { a: { failures: [{ id: 'f1', reason: 'Lonely', likelihood: 2, severity: 5 }, { id: 'f2', reason: '' }] } }
	});

	it('plots each failure by likelihood and severity, numbered per option', () => {
		if (diagram.kind !== 'risk') throw new Error(diagram.kind);
		expect(diagram.points.map((p) => [p.option, p.n, p.text, p.x, p.y])).toEqual([
			['a', 1, 'Lonely', 2, 5],
			['a', 2, 'Failure 2', 3, 3]
		]);
		expect(diagram.x).toEqual({ label: 'Likelihood', ends: ['rare', 'likely'] });
		expect(Object.keys(diagram.add)).toEqual(['a', 'b']);
	});
});

describe('Fishbone: the problem and its causes by category', () => {
	const { diagram } = draw('fishbone', {
		problem: ' Stuck ',
		causes: [
			{ id: 'k1', text: 'No mentor', category: 'people', impact: 'high', addressedBy: ['b', 'a', 'gone'] },
			{ id: 'k2', text: 'Low pay', category: 'money', impact: 'low', addressedBy: [] }
		]
	});

	it('has the problem as its head and all six categories as bones', () => {
		if (diagram.kind !== 'fishbone') throw new Error(diagram.kind);
		expect(diagram.head).toMatchObject({ text: 'Stuck', edit: { path: [] } });
		expect(diagram.bones.map((b) => b.label)).toEqual(['People', 'Process', 'Tools', 'Environment', 'Information', 'Money']);
	});

	it('puts each cause on its bone, weighted by impact, with the options that resolve it', () => {
		if (diagram.kind !== 'fishbone') throw new Error(diagram.kind);
		expect(diagram.bones[0]!.causes).toMatchObject([{ text: 'No mentor', weight: 3, options: ['a', 'b'] }]);
		expect(diagram.bones[5]!.causes).toMatchObject([{ text: 'Low pay', weight: 1, options: [] }]);
		expect(diagram.bones[5]!.add.preset).toEqual({ category: 'money' });
	});
});

describe('Coin: flips, relief and the regret', () => {
	const raw = {
		flips: [
			{ id: 'x1', heads: 'a', tails: 'b', landed: 'a', reaction: 'relieved' },
			{ id: 'x2', heads: 'a', tails: 'b', landed: 'b', reaction: '' },
			{ id: 'x3', heads: 'a', tails: 'z', landed: 'z', reaction: 'neutral' }
		],
		regret: 'b'
	};
	const { d, inputs, diagram } = draw('coin-flip', raw);

	it('shows each flip on the option it landed on, with how it felt', () => {
		if (diagram.kind !== 'coins') throw new Error(diagram.kind);
		expect(diagram.flips.map((f) => [f.landed, f.feeling, f.text])).toEqual([
			['a', 'good', 'Relieved'],
			['b', undefined, 'No reaction yet']
		]);
		expect(diagram.question).toMatchObject({ answer: 'b', text: 'B' });
	});

	it('gives the same relief compute() scores', () => {
		if (diagram.kind !== 'coins') throw new Error(diagram.kind);
		const estimate = model('coin-flip').compute(d, inputs['coin-flip'] as never)!;
		for (const r of diagram.relief) expect(r.rate).toBeCloseTo(estimate.perOption[r.option]!);
		expect(diagram.relief.map((r) => r.flips)).toEqual([1, 1]);
	});
});

describe('slotOf', () => {
	const { inputs } = draw('matrix', { criteria: [{ id: 'c1', name: 'Pay' }] });

	it('finds a list item by id, an object by its path, and a model’s own inputs', () => {
		const item = slotOf(inputs, 'matrix', { path: ['criteria'], id: 'c1' })!;
		expect(item.holder).toBe(listAt(inputs.matrix, ['criteria']));
		expect(item.slot).toBe(0);
		const own = slotOf(inputs, 'matrix', { path: [] })!;
		expect(own.holder[own.slot]).toBe(inputs.matrix);
	});

	it('is undefined once it is gone', () => {
		expect(slotOf(inputs, 'matrix', { path: ['criteria'], id: 'nope' })).toBeUndefined();
		expect(slotOf(inputs, 'matrix', { path: ['nothing', 'here'] })).toBeUndefined();
	});
});

it('letters the options A, B, C…', () => {
	expect([0, 1, 4].map(letter)).toEqual(['A', 'B', 'E']);
});
