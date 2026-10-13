/** Test helpers (not imported by the app). */
import type { Model } from './model';
import { choicesOf, createItem, normalizeInputs, type Field, type Fields } from './schema';
import type { Decision, Estimate } from './types';

/** A decision whose option ids are their lowercased labels: decision('A', 'B') → ids 'a', 'b'. */
export function decision(...labels: string[]): Decision {
	return {
		id: 'd',
		title: 'Test',
		options: labels.map((label) => ({ id: label.toLowerCase(), label })),
		createdAt: 0
	};
}

/** Run a model on raw (partial) inputs, normalized exactly as the app does. */
export function run<C extends Fields>(model: Model<C>, d: Decision, raw: unknown = {}): Estimate | null {
	return model.compute(d, normalizeInputs(model.inputsSchema, raw, d));
}

/** Deterministic PRNG (mulberry32). */
export function rng(seed: number): () => number {
	return () => {
		seed |= 0;
		seed = (seed + 0x6d2b79f5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** Random but schema-valid inputs, for contract tests that every model must pass. */
export function randomInputs(fields: Fields, d: Decision, random: () => number): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	for (const f of fields) out[f.key] = randomValue(f, d, random);
	return out;
}

function randomValue(f: Field, d: Decision, random: () => number): unknown {
	const pick = <T>(xs: readonly T[]) => xs[Math.floor(random() * xs.length)];
	switch (f.kind) {
		case 'number': {
			const step = f.step ?? 1;
			return f.min + Math.floor(random() * ((f.max - f.min) / step + 1)) * step;
		}
		case 'text':
			return pick(['', 'something', 'a | pipe']);
		case 'choice':
			return pick(['', ...choicesOf(f, d).map((c) => c.value)]);
		case 'optionSet':
			return d.options.filter(() => random() < 0.5).map((o) => o.id);
		case 'hidden':
			return f.default;
		case 'group':
			return randomInputs(f.fields, d, random);
		case 'perOption':
			return Object.fromEntries(d.options.map((o) => [o.id, randomInputs(f.fields, d, random)]));
		case 'list': {
			const items: Record<string, unknown>[] = [];
			const n = Math.floor(random() * Math.min(f.max ?? 6, 6));
			for (let i = 0; i < n; i++) {
				const item = createItem(f, d, items as never, random) as Record<string, unknown>;
				items.push({ ...item, ...randomInputs(f.fields.filter((x) => x.kind !== 'hidden'), d, random) });
			}
			return items;
		}
	}
}
