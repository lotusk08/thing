import { leanOf, marginOf, ranked, TIE, type AnyModel } from './model';
import type { Confidence, Decision, Estimate, ModelId, Option, OptionId } from './types';
import { mean, optionLabel } from './util';

export interface Cell {
	model: AnyModel;
	/** 0–100, or null when the model isn't filled in yet. */
	value: number | null;
	/** This option is the model's pick. */
	isLean: boolean;
}

export interface Row {
	option: Option;
	label: string;
	cells: Cell[];
	average: number | null;
	isLeader: boolean;
}

export interface Verdict {
	leader?: OptionId;
	/** Options sharing the top average when there is no single leader. */
	tied: OptionId[];
	filled: number;
	/** Filled models whose lean is the leader. */
	agree: number;
	margin: number;
	confidence: Confidence;
	text: string;
}

export interface Scoreboard {
	rows: Row[];
	verdict: Verdict;
}

/**
 * Overall confidence: high when 3+ models are filled, ≥75% of them agree with the
 * leader and it leads the average by ≥10; medium at 2+ models, ≥50% agreement and
 * a ≥5 lead; otherwise low.
 */
export function overallConfidence(filled: number, agree: number, margin: number): Confidence {
	const share = filled ? agree / filled : 0;
	if (filled >= 3 && share >= 0.75 && margin >= 10) return 'high';
	if (filled >= 2 && share >= 0.5 && margin >= 5) return 'medium';
	return 'low';
}

export function buildScoreboard(
	decision: Decision,
	models: readonly AnyModel[],
	estimates: Record<ModelId, Estimate | null>
): Scoreboard {
	const filled = models.flatMap((m) => {
		const e = estimates[m.id];
		return e ? [e] : [];
	});

	const averages: Record<OptionId, number> = {};
	for (const o of decision.options) {
		const values = filled.map((e) => e.perOption[o.id]).filter((v): v is number => v !== undefined);
		if (values.length) averages[o.id] = mean(values);
	}

	const leader = leanOf(averages);
	const top = ranked(averages)[0]?.score ?? 0;
	const tied = leader ? [] : ranked(averages).filter((r) => top - r.score < TIE).map((r) => r.id);
	const margin = marginOf(averages);
	const agree = leader ? filled.filter((e) => e.lean === leader).length : 0;
	const confidence = overallConfidence(filled.length, agree, margin);

	const rows: Row[] = decision.options.map((option) => ({
		option,
		label: optionLabel(decision, option.id),
		cells: models.map((model) => {
			const e = estimates[model.id];
			return { model, value: e?.perOption[option.id] ?? null, isLean: !!e && e.lean === option.id };
		}),
		average: averages[option.id] ?? null,
		isLeader: option.id === leader
	}));

	let text: string;
	if (filled.length === 0) text = 'Fill in any model to see a verdict.';
	else if (leader)
		text = `${optionLabel(decision, leader)} leads (avg ${Math.round(averages[leader]!)}) · ${agree} of ${filled.length} model${filled.length === 1 ? '' : 's'} agree · ${confidence} confidence`;
	else text = `${tied.map((id) => optionLabel(decision, id)).join(' and ')} are tied · ${filled.length} model${filled.length === 1 ? '' : 's'} filled`;

	return { rows, verdict: { leader, tied, filled: filled.length, agree, margin, confidence, text } };
}
