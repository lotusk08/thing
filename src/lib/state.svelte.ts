import { newDecision, newOption, parseDecision } from './core/decision';
import { toMarkdown } from './core/markdown';
import type { AnyModel } from './core/model';
import { models } from './core/models';
import { normalizeInputs } from './core/schema';
import { buildScoreboard } from './core/scoreboard';
import { MAX_OPTIONS, MIN_OPTIONS, type Decision, type Estimate, type ModelId, type OptionId } from './core/types';
import { isRecord } from './core/util';

const STORAGE_KEY = 'things:v1';

type Inputs = Record<string, unknown>;

interface Saved {
	decision: Decision;
	inputs: Record<ModelId, Inputs>;
	/** Models the user has interacted with; untouched models show an empty scoreboard column. */
	touched: Record<ModelId, boolean>;
	active: ModelId;
}

const defaults = (m: AnyModel, d: Decision) => normalizeInputs(m.inputsSchema, undefined, d) as Inputs;

function fresh(): Saved {
	const decision = newDecision();
	return {
		decision,
		inputs: Object.fromEntries(models.map((m) => [m.id, defaults(m, decision)])),
		touched: {},
		active: models[0]!.id
	};
}

function load(): Saved {
	try {
		const raw: unknown = JSON.parse(globalThis.localStorage?.getItem(STORAGE_KEY) ?? 'null');
		const decision = isRecord(raw) ? parseDecision(raw.decision) : null;
		if (!isRecord(raw) || !decision) return fresh();
		const inputs = isRecord(raw.inputs) ? raw.inputs : {};
		const touched = isRecord(raw.touched) ? raw.touched : {};
		return {
			decision,
			inputs: Object.fromEntries(
				models.map((m) => [m.id, normalizeInputs(m.inputsSchema, inputs[m.id], decision) as Inputs])
			),
			touched: Object.fromEntries(models.map((m) => [m.id, touched[m.id] === true])),
			active: models.find((m) => m.id === raw.active)?.id ?? models[0]!.id
		};
	} catch {
		return fresh();
	}
}

const initial = load();

class DecisionStore {
	decision = $state<Decision>(initial.decision);
	inputs = $state<Record<ModelId, Inputs>>(initial.inputs);
	touched = $state<Record<ModelId, boolean>>(initial.touched);
	active = $state<ModelId>(initial.active);

	readonly models = models;

	activeModel = $derived(models.find((m) => m.id === this.active) ?? models[0]!);

	estimates = $derived.by(() => {
		const d = $state.snapshot(this.decision);
		const out: Record<ModelId, Estimate | null> = {};
		for (const m of models) {
			out[m.id] = this.touched[m.id]
				? m.compute(d, normalizeInputs(m.inputsSchema, $state.snapshot(this.inputs[m.id]), d))
				: null;
		}
		return out;
	});

	board = $derived(buildScoreboard(this.decision, models, this.estimates));

	canAddOption = $derived(this.decision.options.length < MAX_OPTIONS);
	canRemoveOption = $derived(this.decision.options.length > MIN_OPTIONS);

	/** Returns the new option's id, or undefined at the limit. */
	addOption(): OptionId | undefined {
		if (!this.canAddOption) return;
		const option = newOption();
		this.decision.options.push(option);
		this.#syncInputs();
		return option.id;
	}

	removeOption(id: OptionId) {
		if (!this.canRemoveOption) return;
		this.decision.options = this.decision.options.filter((o) => o.id !== id);
		this.#syncInputs();
	}

	touch(id: ModelId) {
		if (!this.touched[id]) this.touched[id] = true;
	}

	resetModel(id: ModelId) {
		const m = models.find((x) => x.id === id);
		if (!m) return;
		this.inputs[id] = defaults(m, $state.snapshot(this.decision));
		this.touched[id] = false;
	}

	startOver() {
		const f = fresh();
		this.decision = f.decision;
		this.inputs = f.inputs;
		this.touched = f.touched;
		this.active = f.active;
	}

	markdown(): string {
		return toMarkdown($state.snapshot(this.decision), models, this.estimates, this.board);
	}

	/** Save to localStorage whenever anything changes. Returns a cleanup function. */
	persist(): () => void {
		return $effect.root(() => {
			$effect(() => {
				const json = JSON.stringify({
					decision: this.decision,
					inputs: this.inputs,
					touched: this.touched,
					active: this.active
				});
				try {
					localStorage.setItem(STORAGE_KEY, json);
				} catch {
					// Storage full or unavailable (private mode): keep working in memory.
				}
			});
		});
	}

	/** Re-shape every model's inputs after options change (adds per-option entries, drops stale ones). */
	#syncInputs() {
		const d = $state.snapshot(this.decision);
		for (const m of models) this.inputs[m.id] = normalizeInputs(m.inputsSchema, $state.snapshot(this.inputs[m.id]), d) as Inputs;
	}
}

export const store = new DecisionStore();
