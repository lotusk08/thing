/**
 * Diagrams: how a model draws its map. A model's `diagram()` turns its inputs into
 * one of a few kinds, each drawn by one component in components/diagrams, the way
 * each schema field kind is drawn by Fields. Every mark that can be edited carries
 * a Ref: where it lives in the model's inputs, and which fields the sheet shows.
 */
import type { Fields, Item, ListField } from './schema';
import type { ModelId, OptionId } from './types';
import { isRecord } from './util';

/** Where something lives in a model's inputs, and what the sheet shows for it. */
export interface Ref {
	/** Keys from the model's inputs: with `id`, the list it is in; without, the object holding `fields`. */
	path: string[];
	id?: string;
	fields: Fields;
	/** What it is, for the sheet's title: "Cause", "Pro", "10-10-10". */
	title: string;
	/** A list's item: the sheet can remove it. */
	removable?: boolean;
	/** The field holding its words: one added from the map and left without them is dropped. */
	words?: string;
}

/** A new item a diagram can add to a list, some of its fields set in advance. */
export interface Add {
	path: string[];
	list: ListField;
	title: string;
	preset?: Record<string, unknown>;
	words?: string;
	/** The list is at its `max`. */
	full: boolean;
}

/** SS roles a diagram may colour a mark with. */
export type Swatch = 'paper' | 'ink' | 'danger' | 'warning' | 'tip' | 'info';

/** A score per option on a few axes (Six Hats). */
export interface Radar {
	kind: 'radar';
	min: number;
	max: number;
	axes: { label: string; detail: string; swatch?: Swatch; inverted?: boolean }[];
	series: { option: OptionId; values: number[]; edit: Ref }[];
	notes: { label: string; text: string; edit: Ref }[];
}

/** Criteria by options: weights, scores and the weighted total (a decision matrix). */
export interface Matrix {
	kind: 'matrix';
	max: number;
	weightMax: number;
	rows: { label: string; weight: number; scores: Record<OptionId, number>; edit: Ref }[];
	/** Weighted average per option, on the scores' scale; null with no rows. */
	totals: Record<OptionId, number | null>;
	add: Add;
}

export interface Weighed {
	text: string;
	weight: number;
	edit: Ref;
}

/** What speaks for and against each option (Franklin's T), and how it feels over time. */
export interface Weigh {
	kind: 'weigh';
	weightMax: number;
	sides: { option: OptionId; for: Weighed[]; against: Weighed[]; add: { for: Add; against: Add } }[];
	horizons: { labels: string[]; min: number; max: number; lines: { option: OptionId; values: number[]; edit: Ref }[] };
}

/** Things that could go wrong, by likelihood and severity (a risk matrix). */
export interface Risk {
	kind: 'risk';
	max: number;
	x: { label: string; ends: [string, string] };
	y: { label: string; ends: [string, string] };
	points: { option: OptionId; n: number; text: string; x: number; y: number; edit: Ref }[];
	add: Record<OptionId, Add>;
}

/** A problem and its causes by category, each marked with the options that resolve it. */
export interface Fishbone {
	kind: 'fishbone';
	head: { label: string; text: string; edit: Ref };
	bones: { label: string; causes: { text: string; weight: 1 | 2 | 3; options: OptionId[]; edit: Ref }[]; add: Add }[];
}

/** Coin flips: where each landed and how it felt, relief per option, and a closing question. */
export interface Coins {
	kind: 'coins';
	flips: { landed: OptionId; feeling?: 'good' | 'bad' | 'neutral'; text: string; edit: Ref }[];
	relief: { option: OptionId; rate: number | null; flips: number }[];
	question: { label: string; answer?: OptionId; text: string; edit: Ref };
	add: Add;
}

export type Diagram = Radar | Matrix | Weigh | Risk | Fishbone | Coins;

/** What the map's sheet edits: one Ref of a model, maybe one just added from the map. */
export interface Edit {
	model: ModelId;
	ref: Ref;
	fresh?: boolean;
}

/** What a diagram adds to a list, and whether there is room for it. */
export function adding(list: ListField, items: readonly unknown[], path: string[], more: Partial<Add> = {}): Add {
	return { path, list, title: list.itemLabel, full: items.length >= (list.max ?? Infinity), ...more };
}

/** Options are A, B, C… on every map. */
export const letter = (i: number) => String.fromCharCode(65 + i);

/** The live value at `path`, if it is there. */
function at(root: unknown, path: readonly string[]): unknown {
	let here = root;
	for (const key of path) here = isRecord(here) ? here[key] : undefined;
	return here;
}

/** The live list a path points at, if it is there. */
export function listAt(root: unknown, path: readonly string[]): Item<Fields>[] | undefined {
	const here = at(root, path);
	return Array.isArray(here) ? (here as Item<Fields>[]) : undefined;
}

/**
 * Where the sheet binds a Ref's fields, from all the inputs by model id: the live
 * object or list holding it, and its key or index there. Undefined once it is gone.
 */
export function slotOf(
	inputs: unknown,
	model: string,
	ref: Pick<Ref, 'path' | 'id'>
): { holder: Record<string | number, Record<string, unknown>>; slot: string | number } | undefined {
	const path = [model, ...ref.path];
	if (ref.id !== undefined) {
		const items = listAt(inputs, path);
		const slot = items?.findIndex((x) => x.id === ref.id) ?? -1;
		// A list holds its items by index as an object holds its fields by key; binding treats them alike.
		return items && slot >= 0 ? { holder: items as unknown as Record<number, Record<string, unknown>>, slot } : undefined;
	}
	const holder = at(inputs, path.slice(0, -1));
	const slot = path.at(-1)!;
	return isRecord(holder) && isRecord(holder[slot]) ? { holder: holder as Record<string, Record<string, unknown>>, slot } : undefined;
}
