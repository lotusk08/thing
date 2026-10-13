import type { Fields, Values } from './schema';
import type { Confidence, Decision, Estimate, ModelId, OptionId } from './types';
import { clamp } from './util';

/** A decision framework plugin. */
export interface Model<C extends Fields = Fields> {
	id: ModelId;
	name: string;
	/** Column header in the scoreboard. */
	short: string;
	description: string;
	inputsSchema: C;
	/** Inputs arrive normalized. Return null while there is not enough input to say anything. */
	compute(decision: Decision, inputs: Values<C>): Estimate | null;
}

export type AnyModel = Model<Fields>;

/** Identity helper that infers `inputs` from `inputsSchema`. */
export function defineModel<const C extends Fields>(model: Model<C>): Model<C> {
	return model;
}

const LEVELS: Confidence[] = ['low', 'medium', 'high'];

export const minConfidence = (...cs: Confidence[]): Confidence =>
	LEVELS[Math.min(...cs.map((c) => LEVELS.indexOf(c)))]!;

export const bumpConfidence = (c: Confidence): Confidence => LEVELS[Math.min(2, LEVELS.indexOf(c) + 1)]!;

/** Options sorted by score, best first (stable for ties). */
export function ranked(perOption: Record<OptionId, number>): { id: OptionId; score: number }[] {
	return Object.entries(perOption)
		.map(([id, score]) => ({ id, score }))
		.sort((a, b) => b.score - a.score);
}

/** Scores closer than this are treated as a tie. */
export const TIE = 0.5;

/** The unique top option, or undefined on a tie / no options. */
export function leanOf(perOption: Record<OptionId, number>): OptionId | undefined {
	const [a, b] = ranked(perOption);
	if (!a) return undefined;
	if (b && a.score - b.score < TIE) return undefined;
	return a.id;
}

/** Gap between the top two options. */
export function marginOf(perOption: Record<OptionId, number>): number {
	const [a, b] = ranked(perOption);
	return a && b ? a.score - b.score : 0;
}

/** Confidence from the gap between the top two (0–100 scale). */
export function confidenceFromMargin(margin: number): Confidence {
	return margin >= 20 ? 'high' : margin >= 8 ? 'medium' : 'low';
}

/** Clamp to 0–100 and round to one decimal. */
export const score100 = (n: number) => Math.round(clamp(n, 0, 100) * 10) / 10;
