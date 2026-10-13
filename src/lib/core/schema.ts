/**
 * A tiny declarative schema for model inputs.
 *
 * A model describes its inputs with the `field.*` builders; the UI renders any
 * schema generically, and `Values<typeof schema>` gives `compute()` fully typed
 * inputs. `normalizeInputs()` turns anything (stale localStorage, partial edits,
 * removed options) into a complete, valid value for the current decision.
 */
import type { Decision, OptionId } from './types';
import { clamp, isRecord, uid } from './util';

interface Base<K extends string> {
	key: K;
	label: string;
	help?: string;
}

export interface NumberField<K extends string = string> extends Base<K> {
	kind: 'number';
	min: number;
	max: number;
	step?: number;
	default: number;
	/** Captions under the slider ends, e.g. ['weak', 'strong']. */
	ends?: readonly [string, string];
	/** Show "+" on positive values (signed scales like −5..+5). */
	signed?: boolean;
}

export interface TextField<K extends string = string> extends Base<K> {
	kind: 'text';
	default?: string;
	placeholder?: string;
	multiline?: boolean;
}

export interface Choice<V extends string = string> {
	value: V;
	label: string;
}

export interface ChoiceField<K extends string = string, V extends string = string> extends Base<K> {
	kind: 'choice';
	choices: readonly Choice<V>[] | ((decision: Decision) => readonly Choice<V>[]);
	/** '' means "not answered yet". */
	default: V | '';
}

/** Multi-select over the decision's options. Value: OptionId[]. */
export interface OptionSetField<K extends string = string> extends Base<K> {
	kind: 'optionSet';
}

/** Stored but never rendered (e.g. a coin-flip result). */
export interface HiddenField<K extends string = string, T = unknown> {
	kind: 'hidden';
	key: K;
	default: T;
}

export interface GroupField<K extends string = string, C extends Fields = Fields> extends Base<K> {
	kind: 'group';
	fields: C;
}

/** The same sub-form repeated once per decision option. Value: Record<OptionId, …>. */
export interface PerOptionField<K extends string = string, C extends Fields = Fields> extends Base<K> {
	kind: 'perOption';
	fields: C;
}

export interface ListContext<C extends Fields = Fields> {
	decision: Decision;
	items: readonly Item<C>[];
	random: () => number;
}

/** A user-extensible list of items. Value: Array<{ id } & …>. */
export interface ListField<K extends string = string, C extends Fields = Fields> extends Base<K> {
	kind: 'list';
	fields: C;
	itemLabel: string;
	addLabel?: string;
	max?: number;
	/** Lay item fields out in one wrapping row instead of stacked. */
	inline?: boolean;
	/** Initial values for a new item (may be random — `ctx.random` is injectable for tests). */
	create?(ctx: ListContext<C>): Partial<Values<C>>;
	/** Heading for an item; defaults to "{itemLabel} {n}". */
	itemTitle?(item: Item<C>, index: number, decision: Decision): string;
}

export type Field =
	| NumberField
	| TextField
	| ChoiceField
	| OptionSetField
	| HiddenField
	| GroupField
	| PerOptionField
	| ListField;

export type Fields = readonly Field[];

export type Item<C extends Fields> = { id: string } & Values<C>;

export type Values<C extends Fields> = { -readonly [F in C[number] as F['key']]: ValueOf<F> };

export type ValueOf<F> =
	F extends NumberField<string> ? number
	: F extends TextField<string> ? string
	: F extends ChoiceField<string, infer V> ? V | ''
	: F extends OptionSetField<string> ? OptionId[]
	: F extends HiddenField<string, infer T> ? T
	: F extends GroupField<string, infer C> ? Values<C>
	: F extends PerOptionField<string, infer C> ? Record<OptionId, Values<C>>
	: F extends ListField<string, infer C> ? Item<C>[]
	: never;

type Opts<F, Omitted extends string = never> = Omit<F, 'kind' | 'key' | 'label' | Omitted>;

/** Builders keep literal keys so `Values<>` can infer input types. */
export const field = {
	number: <const K extends string>(key: K, label: string, o: Opts<NumberField>): NumberField<K> => ({
		kind: 'number',
		key,
		label,
		...o
	}),
	text: <const K extends string>(key: K, label: string, o: Opts<TextField> = {}): TextField<K> => ({
		kind: 'text',
		key,
		label,
		...o
	}),
	choice: <const K extends string, const V extends string>(
		key: K,
		label: string,
		choices: readonly Choice<V>[] | ((decision: Decision) => readonly Choice<V>[]),
		o: { default: NoInfer<V> | ''; help?: string }
	): ChoiceField<K, V> => ({ kind: 'choice', key, label, choices, ...o }),
	optionSet: <const K extends string>(key: K, label: string, o: { help?: string } = {}): OptionSetField<K> => ({
		kind: 'optionSet',
		key,
		label,
		...o
	}),
	hidden: <const K extends string, T>(key: K, def: T): HiddenField<K, T> => ({ kind: 'hidden', key, default: def }),
	group: <const K extends string, const C extends Fields>(
		key: K,
		label: string,
		fields: C,
		o: { help?: string } = {}
	): GroupField<K, C> => ({ kind: 'group', key, label, fields, ...o }),
	perOption: <const K extends string, const C extends Fields>(
		key: K,
		label: string,
		fields: C,
		o: { help?: string } = {}
	): PerOptionField<K, C> => ({ kind: 'perOption', key, label, fields, ...o }),
	list: <const K extends string, const C extends Fields>(
		key: K,
		label: string,
		fields: C,
		o: Opts<ListField<K, C>, 'fields'>
	): ListField<K, C> => ({ kind: 'list', key, label, fields, ...o })
};

export function choicesOf(f: ChoiceField, decision: Decision): readonly Choice[] {
	return typeof f.choices === 'function' ? f.choices(decision) : f.choices;
}

/** Complete, valid inputs for `fields` given anything stored in `raw`. Pure. */
export function normalizeInputs<C extends Fields>(fields: C, raw: unknown, decision: Decision): Values<C> {
	const src = isRecord(raw) ? raw : {};
	const out: Record<string, unknown> = {};
	for (const f of fields) out[f.key] = normalizeField(f, src[f.key], decision);
	return out as Values<C>;
}

function normalizeField(f: Field, v: unknown, d: Decision): unknown {
	switch (f.kind) {
		case 'number':
			return typeof v === 'number' && Number.isFinite(v) ? clamp(v, f.min, f.max) : f.default;
		case 'text':
			return typeof v === 'string' ? v : (f.default ?? '');
		case 'choice':
			return typeof v === 'string' && (v === '' || choicesOf(f, d).some((c) => c.value === v)) ? v : f.default;
		case 'optionSet':
			return Array.isArray(v) ? d.options.map((o) => o.id).filter((id) => v.includes(id)) : [];
		case 'hidden':
			return v === undefined ? structuredClone(f.default) : v;
		case 'group':
			return normalizeInputs(f.fields, v, d);
		case 'perOption': {
			const src = isRecord(v) ? v : {};
			return Object.fromEntries(d.options.map((o) => [o.id, normalizeInputs(f.fields, src[o.id], d)]));
		}
		case 'list':
			return (Array.isArray(v) ? v : []).slice(0, f.max ?? Infinity).map((item) => ({
				...normalizeInputs(f.fields, item, d),
				id: isRecord(item) && typeof item.id === 'string' ? item.id : uid()
			}));
	}
}

/** A fresh, normalized item for a list field. */
export function createItem<C extends Fields>(
	f: ListField<string, C>,
	decision: Decision,
	items: readonly Item<C>[],
	random: () => number = Math.random
): Item<C> {
	const seed = f.create?.({ decision, items, random }) ?? {};
	return { ...normalizeInputs(f.fields, seed, decision), id: uid() };
}
