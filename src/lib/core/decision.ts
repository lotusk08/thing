import { MAX_OPTIONS, MIN_OPTIONS, type Decision, type Option } from './types';
import { isRecord, uid } from './util';

export function newOption(label = ''): Option {
	return { id: uid(), label };
}

const STARTING_OPTIONS = ['Option A', 'Option B'];

export function newDecision(now = Date.now()): Decision {
	return { id: uid(), title: '', options: STARTING_OPTIONS.map((label) => newOption(label)), notes: '', createdAt: now };
}

/** Nothing written yet: no title or notes, and the starting options as they came. */
export function isBlank(d: Decision): boolean {
	return (
		!d.title.trim() &&
		!d.notes?.trim() &&
		d.options.length === STARTING_OPTIONS.length &&
		d.options.every((o, i) => o.label === STARTING_OPTIONS[i])
	);
}

/** Validate untrusted data (e.g. from localStorage). Returns null if unusable. */
export function parseDecision(raw: unknown): Decision | null {
	if (!isRecord(raw) || !Array.isArray(raw.options)) return null;
	const seen = new Set<string>();
	const options = raw.options.flatMap((o): Option[] => {
		if (!isRecord(o) || typeof o.id !== 'string' || !o.id || seen.has(o.id)) return [];
		seen.add(o.id);
		return [{ id: o.id, label: typeof o.label === 'string' ? o.label : '' }];
	});
	if (options.length < MIN_OPTIONS || options.length > MAX_OPTIONS) return null;
	return {
		id: typeof raw.id === 'string' ? raw.id : uid(),
		title: typeof raw.title === 'string' ? raw.title : '',
		options,
		notes: typeof raw.notes === 'string' ? raw.notes : '',
		createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : Date.now()
	};
}
