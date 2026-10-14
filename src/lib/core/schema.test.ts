import { describe, expect, it } from 'vitest';
import { createItem, field, normalizeInputs, scaleSteps } from './schema';
import { decision } from './testing';

const schema = [
	field.number('n', 'N', { min: 1, max: 5, default: 3 }),
	field.text('t', 'T'),
	field.choice(
		'c',
		'C',
		[
			{ value: 'x', label: 'X' },
			{ value: 'y', label: 'Y' }
		],
		{ default: 'x' }
	),
	field.optionSet('set', 'Set'),
	field.hidden('h', { deep: [1] }),
	field.group('g', 'G', [field.number('w', 'W', { min: 0, max: 1, default: 1 })]),
	field.perOption('per', 'Per', [field.number('s', 'S', { min: 0, max: 10, default: 5 })]),
	field.list('items', 'Items', [field.text('name', 'Name')], {
		itemLabel: 'Item',
		max: 2,
		create: ({ items }) => ({ name: `#${items.length + 1}` })
	})
] as const;

const d = decision('A', 'B');

describe('normalizeInputs', () => {
	it('fills defaults for every field and option', () => {
		const v = normalizeInputs(schema, undefined, d);
		expect(v).toEqual({
			n: 3,
			t: '',
			c: 'x',
			set: [],
			h: { deep: [1] },
			g: { w: 1 },
			per: { a: { s: 5 }, b: { s: 5 } },
			items: []
		});
	});

	it('clones hidden defaults instead of sharing them', () => {
		const a = normalizeInputs(schema, undefined, d);
		a.h.deep.push(2);
		expect(normalizeInputs(schema, undefined, d).h).toEqual({ deep: [1] });
	});

	it('repairs invalid values', () => {
		const v = normalizeInputs(
			schema,
			{
				n: 99,
				t: 5,
				c: 'nope',
				set: ['b', 'gone', 'a'],
				g: 'x',
				per: { a: { s: -1 }, gone: { s: 1 } },
				items: [{ id: 'keep', name: 'one' }, { name: 'two' }, { name: 'three' }]
			},
			d
		);
		expect(v.n).toBe(5);
		expect(v.t).toBe('');
		expect(v.c).toBe('x');
		expect(v.set).toEqual(['a', 'b']);
		expect(v.g).toEqual({ w: 1 });
		expect(v.per).toEqual({ a: { s: 0 }, b: { s: 5 } });
		expect(v.items).toHaveLength(2); // max
		expect(v.items[0]).toEqual({ id: 'keep', name: 'one' });
		expect(v.items[1]!.id).toEqual(expect.any(String));
	});

	it("accepts '' as an unanswered choice", () => {
		expect(normalizeInputs(schema, { c: '' }, d).c).toBe('');
	});
});

describe('createItem', () => {
	it('uses the field factory and assigns an id', () => {
		const list = schema[7];
		const first = createItem(list, d, []);
		expect(first.name).toBe('#1');
		expect(createItem(list, d, [first]).name).toBe('#2');
		expect(first.id).toEqual(expect.any(String));
	});
});

describe('scaleSteps', () => {
	const n = (min: number, max: number, step?: number) => field.number('n', 'N', { min, max, step, default: min });

	it('turns short ranges into steps to tap, halves included', () => {
		expect(scaleSteps(n(1, 3))).toEqual([1, 2, 3]);
		expect(scaleSteps(n(1, 10))).toHaveLength(10);
		expect(scaleSteps(n(-5, 5))).toEqual([-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5]);
		expect(scaleSteps(n(0, 10, 2))).toEqual([0, 2, 4, 6, 8, 10]);
		expect(scaleSteps(n(0, 3, 0.5))).toEqual([0, 0.5, 1, 1.5, 2, 2.5, 3]);
		expect(scaleSteps(n(0, 1, 0.1))).toEqual([0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]);
	});

	it('leaves long ranges to a slider', () => {
		expect(scaleSteps(n(0, 100))).toBeUndefined();
		expect(scaleSteps(n(1, 12))).toBeUndefined();
		expect(scaleSteps(n(0, 3, 0.25))).toBeUndefined();
	});

	it('puts a stored number on a step, so a scale always has its pick', () => {
		const half = n(0, 3, 0.5);
		const norm = (v: unknown) => normalizeInputs([half], { n: v }, decision('A', 'B')).n;
		expect([1.3, 1.25, 2.9, 7, -1].map(norm)).toEqual([1.5, 1.5, 3, 3, 0]);
		expect(norm('2')).toBe(0);
	});
});
