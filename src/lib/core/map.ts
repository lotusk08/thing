/**
 * A model's map: what one model holds, laid out around the options.
 *
 * Generic like the panels: a field with a `map` hint puts itself on the map, and
 * where it sits says what it belongs to.
 * - A list's items (Pros, Failures, Causes, Criteria, Flips):
 *   - inside a perOption field: under that option;
 *   - with `at`, a field holding an option id: under that option (where a coin landed);
 *   - with an optionSet field: shared, linked to the options it names;
 *   - with a perOption field: under every option, with that option's first number;
 *   - otherwise: shared, linked to nothing.
 * - A number inside a perOption field: under that option, with its value (the hats).
 * - A top-level text or choice field: at the top (the Problem, the Regret).
 *
 * Each thing on the map is where it lives in the inputs, so the map's sheet edits
 * the same inputs the form does.
 */
import type { AnyModel } from './model';
import {
	choicesOf,
	type ChoiceField,
	type Field,
	type Fields,
	type Item,
	type ListField,
	type NumberField,
	type OptionSetField,
	type PerOptionField,
	type Tone
} from './schema';
import type { Decision, ModelId, OptionId } from './types';
import { isRecord } from './util';

export interface MapItem {
	/** Unique on the map; an item under every option shows once per option. */
	key: string;
	model: ModelId;
	/**
	 * Keys from all the inputs (by model id) to what the sheet edits: with `id`, the
	 * list the item is in; without, the object holding `fields`.
	 */
	path: string[];
	id?: string;
	fields: Fields;
	/** The list it is in, when it is a list's item: it can be removed. */
	list?: ListField;
	/** What it is: Pro, Cause, Flip, or a top field's label. Values say it in their text. */
	kind?: string;
	/** Its words; '' while it has none. */
	text: string;
	tone?: Tone;
	/** Shared items: the options it is linked to, in option order. */
	links: OptionId[];
	/** Shared items with links: what a link means, e.g. "Resolved by". */
	linkLabel?: string;
	value?: { n: number; max: number; signed?: boolean };
}

/** A new item the map can add: to one list, linked to one option when the list links. */
export interface MapAdd {
	model: ModelId;
	path: string[];
	list: ListField;
	kind: string;
	tone?: Tone;
	/** The optionSet the new item is linked through: its key, its label and the option. */
	link?: { key: string; label: string; option: OptionId };
	/** The list is at its `max`. */
	full: boolean;
}

/** What the map's sheet edits: what to add (to an option, or across), or one thing on the map. */
export type MapEdit =
	| { kind: 'add'; option?: OptionId; adds: MapAdd[] }
	| { kind: 'item'; item: Pick<MapItem, 'model' | 'path' | 'id' | 'fields' | 'list' | 'kind'>; fresh?: boolean };

interface ModelMap {
	top: MapItem[];
	shared: MapItem[];
	options: Record<OptionId, MapItem[]>;
	adds: { shared: MapAdd[]; options: Record<OptionId, MapAdd[]> };
}

const words = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const record = (v: unknown): Record<string, unknown> => (isRecord(v) ? v : {});
const chosen = (f: ChoiceField, v: unknown, d: Decision) => choicesOf(f, d).find((c) => c.value === v)?.label ?? '';
const shown = (f: Field | undefined, v: unknown, d: Decision) => (f?.kind === 'choice' ? chosen(f, v, d) : words(v));

/** One model's map, from its normalized inputs. */
export function modelMap(decision: Decision, model: AnyModel, inputs: unknown): ModelMap {
	const ids = decision.options.map((o) => o.id);
	const byOption = <T>() => Object.fromEntries(ids.map((id) => [id, [] as T[]])) as Record<OptionId, T[]>;
	const map: ModelMap = { top: [], shared: [], options: byOption(), adds: { shared: [], options: byOption() } };
	const keyOf = (path: string[], tail: string) => `${path.join('/')}#${tail}`;

	const place = (field: ListField, raw: unknown, path: string[], option?: OptionId) => {
		const hint = field.map!;
		const items = list(raw).filter(isRecord);
		const label = field.fields.find((f) => f.key === hint.label);
		const add: MapAdd = { model: model.id, path, list: field, kind: field.itemLabel, tone: hint.tone, full: items.length >= (field.max ?? Infinity) };
		const item = (raw: Record<string, unknown>, more: Partial<MapItem> = {}): MapItem => ({
			key: keyOf(path, String(raw.id)),
			model: model.id,
			path,
			id: String(raw.id),
			fields: field.fields,
			list: field,
			kind: field.itemLabel,
			text: shown(label, raw[hint.label], decision),
			tone: hint.toneOf?.(raw as Item<Fields>) ?? hint.tone,
			links: [],
			...more
		});
		const linkSet = field.fields.find((f): f is OptionSetField => f.kind === 'optionSet');
		const each = field.fields.find((f): f is PerOptionField => f.kind === 'perOption');

		if (option !== undefined) {
			for (const raw of items) map.options[option]!.push(item(raw));
			map.adds.options[option]!.push(add);
		} else if (hint.at) {
			for (const raw of items) {
				const at = raw[hint.at];
				(typeof at === 'string' && ids.includes(at) ? map.options[at]! : map.shared).push(item(raw));
			}
			map.adds.shared.push(add);
		} else if (linkSet) {
			for (const raw of items) {
				const linked = list(raw[linkSet.key]);
				map.shared.push(item(raw, { links: ids.filter((id) => linked.includes(id)), linkLabel: linkSet.label }));
			}
			map.adds.shared.push(add);
			for (const id of ids) map.adds.options[id]!.push({ ...add, link: { key: linkSet.key, label: linkSet.label, option: id } });
		} else if (each) {
			const number = each.fields.find((f): f is NumberField => f.kind === 'number');
			for (const raw of items) {
				const values = record(raw[each.key]);
				for (const id of ids) {
					const n = number && record(values[id])[number.key];
					const value = number && typeof n === 'number' ? { n, max: number.max } : undefined;
					map.options[id]!.push(item(raw, { key: keyOf(path, `${String(raw.id)}/${id}`), value }));
				}
			}
			map.adds.shared.push(add);
		} else {
			for (const raw of items) map.shared.push(item(raw));
			map.adds.shared.push(add);
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
			else if (f.kind === 'number' && f.map && option !== undefined) {
				const n = bag[f.key];
				map.options[option]!.push({
					key: keyOf(path, f.key),
					model: model.id,
					path,
					fields: [f],
					text: f.label,
					tone: f.map === true ? undefined : f.map.tone,
					links: [],
					value: { n: typeof n === 'number' ? n : f.default, max: f.max, signed: f.signed }
				});
			} else if ((f.kind === 'text' || f.kind === 'choice') && f.map && path.length === 1)
				map.top.push({ key: keyOf(path, f.key), model: model.id, path, fields: [f], kind: f.label, text: shown(f, bag[f.key], decision), links: [] });
		}
	};

	visit(model.inputsSchema, inputs, [model.id]);
	return map;
}

/** The live value at `path` in all the inputs (by model id), if it is there. */
function at(inputs: unknown, path: readonly string[]): unknown {
	let here = inputs;
	for (const key of path) here = isRecord(here) ? here[key] : undefined;
	return here;
}

/** The live list a path points at, if it is there. */
export function listAt(inputs: unknown, path: readonly string[]): Item<Fields>[] | undefined {
	const here = at(inputs, path);
	return Array.isArray(here) ? (here as Item<Fields>[]) : undefined;
}

/**
 * Where the sheet binds an item's fields: the live object or list holding it, and
 * its key or index there. Undefined once it is gone.
 */
export function slotOf(
	inputs: unknown,
	item: Pick<MapItem, 'path' | 'id'>
): { holder: Record<string | number, Record<string, unknown>>; slot: string | number } | undefined {
	if (item.id !== undefined) {
		const items = listAt(inputs, item.path);
		const slot = items?.findIndex((x) => x.id === item.id) ?? -1;
		// A list holds its items by index as an object holds its fields by key; binding treats them alike.
		return items && slot >= 0 ? { holder: items as unknown as Record<number, Record<string, unknown>>, slot } : undefined;
	}
	const holder = at(inputs, item.path.slice(0, -1));
	const slot = item.path.at(-1);
	return isRecord(holder) && slot !== undefined && isRecord(holder[slot]) ? { holder: holder as Record<string, Record<string, unknown>>, slot } : undefined;
}
