/**
 * The decision map: what the models hold, laid out around the options.
 *
 * Generic like the panels: a list field with a `map` hint puts its items on the
 * map, and where the list sits says what an item belongs to.
 * - Inside a perOption field: under that option (Pros, Cons, Failures).
 * - With an optionSet field: shared, linked to the options it names (Causes).
 * - With a perOption field: under every option, with that option's value (Criteria).
 * - Otherwise: shared, linked to nothing.
 * A top-level text field with `map: true` is shown under the decision (the Problem).
 *
 * Every item is the model's own item: the map edits the same inputs the panels do.
 */
import type { AnyModel } from './model';
import type { Fields, Item, ListField, NumberField, OptionSetField, PerOptionField, TextField } from './schema';
import type { Decision, ModelId, OptionId } from './types';
import { isRecord } from './util';

/** A list in a model's inputs: the keys from the inputs down to it. */
export interface ListRef {
	model: ModelId;
	path: string[];
}

interface Listed {
	ref: ListRef;
	field: ListField;
	/** The model's short name, as its tab shows it. */
	source: string;
	/** The list's item label: Pro, Cause, Criterion… */
	kind: string;
	tone?: 'for' | 'against';
}

export interface MapItem extends Listed {
	/** Unique on the map; an item under every option shows once per option. */
	key: string;
	/** The item's own id in its list. */
	id: string;
	/** The item's text; '' while it has none. */
	text: string;
	/** Shared items: the options it is linked to, in option order. */
	links: OptionId[];
	/** Shared items with links: what a link means, e.g. "Resolved by". */
	linkLabel?: string;
	/** Under every option: that option's value, e.g. a criterion's score. */
	value?: { n: number; max: number };
}

interface MapNote {
	model: ModelId;
	field: TextField;
	source: string;
	text: string;
}

/** A new item the map can add: to one list, linked to one option when the list links. */
export interface MapAdd extends Listed {
	/** The optionSet the new item is linked through: its key, its label and the option. */
	link?: { key: string; label: string; option: OptionId };
	/** The list is at its `max`. */
	full: boolean;
}

/** What the map's sheet edits: what to add (to an option, or across options), an item, or a note. */
export type MapEdit =
	| { kind: 'add'; option?: OptionId }
	| { kind: 'item'; item: Pick<MapItem, 'ref' | 'id' | 'field' | 'kind' | 'source'>; fresh?: boolean }
	| { kind: 'note'; note: MapNote };

interface DecisionMap {
	notes: MapNote[];
	shared: MapItem[];
	options: Record<OptionId, MapItem[]>;
	adds: { shared: MapAdd[]; options: Record<OptionId, MapAdd[]> };
}

const TONES = { for: 0, against: 1 } as const;
const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const record = (v: unknown): Record<string, unknown> => (isRecord(v) ? v : {});
const toneRank = (item: MapItem) => (item.tone ? TONES[item.tone] : 2);

export function decisionMap(
	decision: Decision,
	models: readonly AnyModel[],
	inputs: Readonly<Record<ModelId, unknown>>
): DecisionMap {
	const ids = decision.options.map((o) => o.id);
	const byOption = <T>() => Object.fromEntries(ids.map((id) => [id, [] as T[]])) as Record<OptionId, T[]>;
	const map: DecisionMap = { notes: [], shared: [], options: byOption(), adds: { shared: [], options: byOption() } };

	for (const model of models) {
		const place = (field: ListField, raw: unknown, path: string[], option?: OptionId) => {
			const hint = field.map!;
			const items = list(raw).filter(isRecord);
			const listed: Listed = { ref: { model: model.id, path }, field, source: model.short, kind: field.itemLabel, tone: hint.tone };
			const full = items.length >= (field.max ?? Infinity);
			const item = (raw: Record<string, unknown>, more: Partial<MapItem> = {}): MapItem => ({
				...listed,
				key: `${model.id}:${String(raw.id)}`,
				id: String(raw.id),
				text: text(raw[hint.label]),
				links: [],
				...more
			});
			const linkSet = field.fields.find((f): f is OptionSetField => f.kind === 'optionSet');
			const each = field.fields.find((f): f is PerOptionField => f.kind === 'perOption');

			if (option !== undefined) {
				for (const raw of items) map.options[option]!.push(item(raw));
				map.adds.options[option]!.push({ ...listed, full });
			} else if (linkSet) {
				for (const raw of items) {
					const linked = list(raw[linkSet.key]);
					map.shared.push(item(raw, { links: ids.filter((id) => linked.includes(id)), linkLabel: linkSet.label }));
				}
				map.adds.shared.push({ ...listed, full });
				for (const id of ids) map.adds.options[id]!.push({ ...listed, full, link: { key: linkSet.key, label: linkSet.label, option: id } });
			} else if (each) {
				const number = each.fields.find((f): f is NumberField => f.kind === 'number');
				for (const raw of items) {
					const values = record(raw[each.key]);
					for (const id of ids) {
						const n = number && record(values[id])[number.key];
						map.options[id]!.push(
							item(raw, {
								key: `${model.id}:${String(raw.id)}:${id}`,
								value: number && typeof n === 'number' ? { n, max: number.max } : undefined
							})
						);
					}
				}
				map.adds.shared.push({ ...listed, full });
			} else {
				for (const raw of items) map.shared.push(item(raw));
				map.adds.shared.push({ ...listed, full });
			}
		};

		const visit = (fields: Fields, raw: unknown, path: string[], option?: OptionId) => {
			const bag = record(raw);
			for (const f of fields) {
				if (f.kind === 'group') visit(f.fields, bag[f.key], [...path, f.key], option);
				else if (f.kind === 'perOption') {
					const each = record(bag[f.key]);
					for (const id of ids) visit(f.fields, each[id], [...path, f.key, id], id);
				} else if (f.kind === 'list' && f.map) place(f, bag[f.key], [...path, f.key], option);
				else if (f.kind === 'text' && f.map && path.length === 0)
					map.notes.push({ model: model.id, field: f, source: model.short, text: text(bag[f.key]) });
			}
		};

		visit(model.inputsSchema, inputs[model.id], []);
	}

	// Within an option: what speaks for it, then against it, then the rest (scores).
	for (const id of ids) map.options[id]!.sort((a, b) => toneRank(a) - toneRank(b));
	return map;
}

/** The live list a ref points at inside a model's inputs, if it is there. */
export function listAt(inputs: unknown, path: readonly string[]): Item<Fields>[] | undefined {
	let at = inputs;
	for (const key of path) at = isRecord(at) ? at[key] : undefined;
	return Array.isArray(at) ? (at as Item<Fields>[]) : undefined;
}
