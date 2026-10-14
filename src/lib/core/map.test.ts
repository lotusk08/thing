import { describe, expect, it } from 'vitest';
import { decisionMap, listAt } from './map';
import { models } from './models';
import { field, normalizeInputs } from './schema';
import { decision } from './testing';

const d = decision('A', 'B');

/** Every model's inputs, normalized as the app keeps them, from partial raw input. */
function inputs(raw: Record<string, unknown>) {
	return Object.fromEntries(models.map((m) => [m.id, normalizeInputs(m.inputsSchema, raw[m.id], d)]));
}

const filled = inputs({
	'pros-cons': {
		options: {
			a: { pros: [{ id: 'p1', text: ' Higher pay ', impact: 4 }], cons: [{ id: 'c1', text: 'Cost', impact: 2 }] },
			b: { cons: [{ id: 'c2', text: '', impact: 3 }] }
		}
	},
	premortem: { options: { a: { failures: [{ id: 'f1', reason: 'Lonely', likelihood: 3, severity: 3 }] } } },
	fishbone: {
		problem: 'Stuck at work',
		causes: [
			{ id: 'k1', text: 'No growth path', addressedBy: ['b', 'a', 'gone'] },
			{ id: 'k2', text: 'No mentor', addressedBy: [] }
		]
	},
	matrix: { criteria: [{ id: 'm1', name: 'Salary', weight: 8, scores: { a: { score: 9 }, b: { score: 4 } } }] }
});

describe('decisionMap', () => {
	const map = decisionMap(d, models, filled);

	it('puts per-option items under their option, for before against before scores', () => {
		const a = map.options.a!;
		expect(a.map((i) => [i.kind, i.text])).toEqual([
			['Pro', 'Higher pay'],
			['Con', 'Cost'],
			['Failure', 'Lonely'],
			['Criterion', 'Salary']
		]);
		expect(a[0]).toMatchObject({ tone: 'for', source: 'Pros/Cons', id: 'p1', ref: { model: 'pros-cons', path: ['options', 'a', 'pros'] } });
		expect(a[2]).toMatchObject({ tone: 'against', ref: { model: 'premortem', path: ['options', 'a', 'failures'] } });
		expect(map.options.b!.map((i) => [i.kind, i.text])).toEqual([
			['Con', ''],
			['Criterion', 'Salary']
		]);
	});

	it('shares items with an optionSet, linked to the options it names, in option order', () => {
		expect(map.shared.map((i) => [i.text, i.links, i.linkLabel])).toEqual([
			['No growth path', ['a', 'b'], 'Resolved by'],
			['No mentor', [], 'Resolved by']
		]);
	});

	it('shows an item with a perOption field under every option, with that option’s value', () => {
		const salary = (id: string) => map.options[id]!.find((i) => i.kind === 'Criterion');
		expect(salary('a')).toMatchObject({ value: { n: 9, max: 10 }, ref: { model: 'matrix', path: ['criteria'] } });
		expect(salary('b')).toMatchObject({ value: { n: 4, max: 10 } });
		expect(salary('a')!.key).not.toBe(salary('b')!.key);
	});

	it('gives every item a unique key', () => {
		const keys = [...map.shared, ...Object.values(map.options).flat()].map((i) => i.key);
		expect(new Set(keys).size).toBe(keys.length);
	});

	it('shows the top-level text fields marked for the map', () => {
		expect(map.notes).toMatchObject([{ model: 'fishbone', text: 'Stuck at work', field: { key: 'problem' } }]);
	});

	it('leaves out models with nothing marked for the map', () => {
		const sources = [...map.shared, ...Object.values(map.options).flat(), ...map.adds.shared].map((i) => i.ref.model);
		expect(sources).not.toContain('six-hats');
		expect(sources).not.toContain('coin-flip');
	});

	it('offers what can be added where', () => {
		const kinds = (adds: { kind: string; link?: unknown }[]) => adds.map((a) => (a.link ? `${a.kind}+link` : a.kind));
		expect(kinds(map.adds.options.a!)).toEqual(['Pro', 'Con', 'Failure', 'Cause+link']);
		expect(map.adds.options.b!.find((a) => a.link)?.link).toEqual({ key: 'addressedBy', label: 'Resolved by', option: 'b' });
		expect(kinds(map.adds.shared)).toEqual(['Criterion', 'Cause']);
		expect(map.adds.shared.every((a) => !a.full)).toBe(true);
	});

	it('marks a list at its max as full', () => {
		const criteria = Array.from({ length: 7 }, (_, i) => ({ id: `m${i}`, name: `C${i}` }));
		const full = decisionMap(d, models, inputs({ matrix: { criteria } }));
		expect(full.adds.shared.find((a) => a.kind === 'Criterion')?.full).toBe(true);
	});

	it('is empty but for what can be added when nothing is entered', () => {
		const empty = decisionMap(d, models, inputs({}));
		expect(empty.shared).toEqual([]);
		expect(Object.values(empty.options).flat()).toEqual([]);
		expect(empty.notes).toMatchObject([{ text: '' }]);
		expect(empty.adds.options.a!.length).toBe(4);
	});
});

describe('listAt', () => {
	it('returns the live list a path points at', () => {
		const list = listAt(filled['pros-cons'], ['options', 'a', 'pros']);
		expect(list).toBe((filled['pros-cons'] as { options: { a: { pros: unknown } } }).options.a.pros);
	});

	it('is undefined for a path that leads nowhere', () => {
		expect(listAt(filled['pros-cons'], ['options', 'z', 'pros'])).toBeUndefined();
		expect(listAt(undefined, ['x'])).toBeUndefined();
		expect(listAt(filled.fishbone, ['problem'])).toBeUndefined();
	});
});

it('only lets a map label name one of the item’s text fields', () => {
	field.list('ok', 'Ok', [field.text('name', 'Name')], { itemLabel: 'Ok', map: { label: 'name' } });
	// @ts-expect-error: 'weight' is not a text field
	field.list('bad', 'Bad', [field.number('weight', 'W', { min: 0, max: 1, default: 0 })], { itemLabel: 'Bad', map: { label: 'weight' } });
});
