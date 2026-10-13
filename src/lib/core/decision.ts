import { MAX_OPTIONS, MIN_OPTIONS, type Decision, type Option } from './types';
import { isRecord, uid } from './util';

export function newOption(label = ''): Option {
	return { id: uid(), label };
}

export function newDecision(now = Date.now()): Decision {
	return { id: uid(), title: '', options: [newOption('Option A'), newOption('Option B')], notes: '', createdAt: now };
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
