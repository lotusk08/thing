import type { Decision, OptionId } from './types';

export const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export const sum = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0);

export const mean = (xs: readonly number[]) => (xs.length ? sum(xs) / xs.length : 0);

export function uid(): string {
	return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function isRecord(v: unknown): v is Record<string, unknown> {
	return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Display label for an option; falls back to "Option N" when blank or unknown. */
export function optionLabel(decision: Decision, id: OptionId): string {
	const i = decision.options.findIndex((o) => o.id === id);
	if (i < 0) return '(removed option)';
	return decision.options[i]!.label.trim() || `Option ${i + 1}`;
}

/** All unordered pairs, in option order: [a,b], [a,c], [b,c], … */
export function pairs<T>(xs: readonly T[]): [T, T][] {
	const out: [T, T][] = [];
	for (let i = 0; i < xs.length; i++) for (let j = i + 1; j < xs.length; j++) out.push([xs[i]!, xs[j]!]);
	return out;
}
