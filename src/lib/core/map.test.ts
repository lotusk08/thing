import { describe, expect, it } from 'vitest';
import { listAt, modelMap, slotOf } from './map';
import type { AnyModel } from './model';
import { models } from './models';
import { field, normalizeInputs } from './schema';
import { decision } from './testing';

const d = decision('A', 'B');
const model = (id: string) => models.find((m) => m.id === id)!;

/** All the inputs, by model id, normalized as the app keeps them, from partial raw input. */
const all = (raw: Record<string, unknown>) =>
	Object.fromEntries(models.map((m) => [m.id, normalizeInputs(m.inputsSchema, raw[m.id], d)]));

const inputs = all({
	'pros-cons': {
		options: {
			a: { pros: [{ id: 'p1', text: ' Higher pay ', impact: 3 }], cons: [{ id: 'c1', text: 'Rent' }], years10: 4 },
			b: { cons: [{ id: 'c2', text: '' }], min10: -2 }
		}
	},
	premortem: { options: { a: { failures: [{ id: 'f1', reason: 'Lonely' }] } } },
	fishbone: {
		problem: 'Stuck at work',
		causes: [
			{ id: 'k1', text: 'No growth path', addressedBy: ['b', 'a', 'gone'] },
			{ id: 'k2', text: 'No mentor', addressedBy: [] }
		]
	},
	matrix: { criteria: [{ id: 'm1', name: 'Salary', weight: 8, scores: { a: { score: 9 }, b: { score: 4 } } }] },
	'six-hats': { hats: { a: { white: 4, black: 5 } } },
	'coin-flip': {
		flips: [
			{ id: 'x1', heads: 'a', tails: 'b', landed: 'a', reaction: 'relieved' },
			{ id: 'x2', heads: 'b', tails: 'a', landed: 'b', reaction: 'disappointed' },
			{ id: 'x3', heads: 'a', tails: 'b', landed: 'b', reaction: '' }
		],
		regret: 'a'
	}
});
const mapOf = (id: string) => modelMap(d, model(id), inputs[id]);
const shown = (items: { kind?: string; text: string }[]) => items.map((i) => [i.kind, i.text]);

describe('modelMap', () => {
	it('Pros/Cons: pros, cons, then the 10-10-10 feelings under each option, in schema order', () => {
		const map = mapOf('pros-cons');
		expect(shown(map.options.a!)).toEqual([
			['Pro', 'Higher pay'],
			['Con', 'Rent'],
			[undefined, 'In 10 minutes I’ll feel'],
			[undefined, 'In 10 months I’ll feel'],
			[undefined, 'In 10 years I’ll feel']
		]);
		expect(map.options.a![0]).toMatchObject({ tone: 'for', id: 'p1', path: ['pros-cons', 'options', 'a', 'pros'] });
		expect(map.options.a![1]).toMatchObject({ tone: 'against' });
		expect(map.options.a![4]).toMatchObject({ value: { n: 4, max: 5, signed: true }, path: ['pros-cons', 'options', 'a'] });
		expect(map.options.b![0]).toMatchObject({ kind: 'Con', text: '' });
		expect(map.shared).toEqual([]);
		expect(map.adds.options.a!.map((a) => a.kind)).toEqual(['Pro', 'Con']);
	});

	it('Pre-mortem: failure reasons under their option', () => {
		const map = mapOf('premortem');
		expect(shown(map.options.a!)).toEqual([['Failure', 'Lonely']]);
		expect(map.options.b).toEqual([]);
	});

	it('Fishbone: the problem on top, causes shared and linked to the options that resolve them', () => {
		const map = mapOf('fishbone');
		expect(map.top).toMatchObject([{ kind: 'Problem to solve', text: 'Stuck at work', path: ['fishbone'] }]);
		expect(map.shared.map((i) => [i.text, i.links, i.linkLabel])).toEqual([
			['No growth path', ['a', 'b'], 'Resolved by'],
			['No mentor', [], 'Resolved by']
		]);
		expect(map.adds.shared.map((a) => [a.kind, a.link])).toEqual([['Cause', undefined]]);
		expect(map.adds.options.b![0]!.link).toEqual({ key: 'addressedBy', label: 'Resolved by', option: 'b' });
	});

	it('Matrix: each criterion under every option, with that option’s score', () => {
		const map = mapOf('matrix');
		expect(map.options.a).toMatchObject([{ kind: 'Criterion', text: 'Salary', value: { n: 9, max: 10 } }]);
		expect(map.options.b).toMatchObject([{ text: 'Salary', value: { n: 4, max: 10 } }]);
		expect(map.options.a![0]!.key).not.toBe(map.options.b![0]!.key);
		expect(map.adds.shared.map((a) => [a.kind, a.full])).toEqual([['Criterion', false]]);
	});

	it('Matrix: a list at its max is full', () => {
		const criteria = Array.from({ length: 7 }, (_, i) => ({ id: `m${i}`, name: `C${i}` }));
		const full = modelMap(d, model('matrix'), all({ matrix: { criteria } }).matrix);
		expect(full.adds.shared[0]!.full).toBe(true);
	});

	it('Six Hats: each option’s six ratings, the black hat against it', () => {
		const map = mapOf('six-hats');
		expect(map.options.a!.map((i) => [i.text, i.value?.n, i.tone])).toEqual([
			['White · facts', 4, undefined],
			['Red · gut feeling', 3, undefined],
			['Black · risks', 5, 'against'],
			['Yellow · benefits', 3, undefined],
			['Green · ideas', 3, undefined],
			['Blue · process', 3, undefined]
		]);
		expect(map.options.a![0]).toMatchObject({ fields: [{ key: 'white' }], path: ['six-hats', 'hats', 'a'] });
		expect(map.top).toEqual([]);
		expect(map.adds.shared).toEqual([]);
	});

	it('Coin: each flip under where it landed, coloured by the reaction; the regret on top', () => {
		const map = mapOf('coin-flip');
		expect(map.options.a!.map((i) => [i.kind, i.text, i.tone])).toEqual([['Flip', 'Relieved', 'for']]);
		expect(map.options.b!.map((i) => [i.text, i.tone])).toEqual([
			['Disappointed', 'against'],
			['', undefined]
		]);
		expect(map.top).toMatchObject([{ text: 'A', fields: [{ key: 'regret' }] }]);
		expect(map.adds.shared.map((a) => a.kind)).toEqual(['Flip']);
		expect(map.adds.options.a).toEqual([]);
	});

	it('Coin: a flip whose option is gone is shared', () => {
		const raw = { flips: [{ id: 'x', heads: 'a', tails: 'z', landed: 'z', reaction: 'neutral' }] };
		const map = modelMap(d, model('coin-flip'), { ...raw, regret: '' });
		expect(map.shared.map((i) => i.text)).toEqual(['Neutral']);
	});

	it('gives every item a unique key', () => {
		for (const m of models) {
			const map = mapOf(m.id);
			const keys = [...map.top, ...map.shared, ...Object.values(map.options).flat()].map((i) => i.key);
			expect(new Set(keys).size, m.id).toBe(keys.length);
		}
	});

	it('maps nothing a model does not mark', () => {
		const bare: AnyModel = { ...model('matrix'), id: 'bare', inputsSchema: [field.text('note', 'Note'), field.list('xs', 'Xs', [field.text('t', 'T')], { itemLabel: 'X' })] };
		const map = modelMap(d, bare, { note: 'hi', xs: [{ id: '1', t: 'x' }] });
		expect([...map.top, ...map.shared, ...Object.values(map.options).flat()]).toEqual([]);
	});
});

describe('slotOf', () => {
	it('finds a list item by its id: the live list and its index', () => {
		const item = mapOf('pros-cons').options.a![0]!;
		const found = slotOf(inputs, item)!;
		expect(found.holder).toBe(listAt(inputs, ['pros-cons', 'options', 'a', 'pros']));
		expect(found.slot).toBe(0);
	});

	it('finds a value’s object and a top field’s model inputs', () => {
		const hat = slotOf(inputs, mapOf('six-hats').options.b![0]!)!;
		expect(hat.slot).toBe('b');
		expect(hat.holder[hat.slot]).toBe((inputs['six-hats'] as { hats: Record<string, unknown> }).hats.b);
		const problem = slotOf(inputs, mapOf('fishbone').top[0]!)!;
		expect(problem.holder[problem.slot]).toBe(inputs.fishbone);
	});

	it('is undefined once the thing is gone', () => {
		expect(slotOf(inputs, { path: ['pros-cons', 'options', 'a', 'pros'], id: 'nope' })).toBeUndefined();
		expect(slotOf(inputs, { path: ['six-hats', 'hats', 'z'] })).toBeUndefined();
	});
});

it('only lets a map label name a text or choice field, and `at` a hidden one', () => {
	field.list('ok', 'Ok', [field.text('name', 'Name'), field.hidden('where', '')], { itemLabel: 'Ok', map: { label: 'name', at: 'where' } });
	// @ts-expect-error: 'weight' is a number field
	field.list('bad', 'Bad', [field.number('weight', 'W', { min: 0, max: 1, default: 0 })], { itemLabel: 'Bad', map: { label: 'weight' } });
	// @ts-expect-error: 'name' is not a hidden field
	field.list('bad', 'Bad', [field.text('name', 'Name')], { itemLabel: 'Bad', map: { label: 'name', at: 'name' } });
});
