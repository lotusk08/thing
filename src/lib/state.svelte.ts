import { isBlank, newDecision, newOption, parseDecision } from './core/decision';
import { demo } from './core/demo';
import { decisionMap, listAt, type ListRef, type MapAdd } from './core/map';
import { toMarkdown } from './core/markdown';
import { models } from './core/models';
import { createItem, normalizeInputs } from './core/schema';
import { buildScoreboard } from './core/scoreboard';
import { MAX_OPTIONS, MIN_OPTIONS, type Decision, type Estimate, type ModelId, type OptionId } from './core/types';
import { isRecord } from './core/util';

const STORAGE_KEY = 'things:v1';

type Inputs = Record<string, unknown>;

/** The model panels, or the decision map. */
export type View = 'models' | 'map';

interface Saved {
	decision: Decision;
	inputs: Record<ModelId, Inputs>;
	/** Models the user has interacted with; untouched models show an empty scoreboard column. */
	touched: Record<ModelId, boolean>;
	active: ModelId;
	view: View;
}

/** Every model's inputs, complete and valid for `d`, from anything raw (stored, the demo, nothing). */
const normalized = (raw: Record<string, unknown>, d: Decision): Record<ModelId, Inputs> =>
	Object.fromEntries(models.map((m) => [m.id, normalizeInputs(m.inputsSchema, raw[m.id], d)]));

function fresh(): Saved {
	const decision = newDecision();
	return { decision, inputs: normalized({}, decision), touched: {}, active: models[0]!.id, view: 'models' };
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
			inputs: normalized(inputs, decision),
			touched: Object.fromEntries(models.map((m) => [m.id, touched[m.id] === true])),
			active: models.find((m) => m.id === raw.active)?.id ?? models[0]!.id,
			view: raw.view === 'map' ? 'map' : 'models'
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
	view = $state<View>(initial.view);

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

	/** Nothing entered yet: the topbar offers the demo rather than a new decision. */
	blank = $derived(isBlank(this.decision) && !Object.values(this.touched).some(Boolean));

	map = $derived(decisionMap(this.decision, models, this.inputs));

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
		this.inputs[id] = normalizeInputs(m.inputsSchema, undefined, $state.snapshot(this.decision));
		this.touched[id] = false;
	}

	/** Add an item from the map, linked to its option when the list links; returns its id. */
	addItem(add: MapAdd): string | undefined {
		const list = listAt(this.inputs[add.ref.model], add.ref.path);
		if (!list || list.length >= (add.field.max ?? Infinity)) return;
		const item = createItem(add.field, $state.snapshot(this.decision), $state.snapshot(list));
		list.push(add.link ? { ...item, [add.link.key]: [add.link.option] } : item);
		this.touch(add.ref.model);
		return item.id;
	}

	removeItem(ref: ListRef, id: string) {
		const list = listAt(this.inputs[ref.model], ref.path);
		const i = list?.findIndex((item) => item.id === id) ?? -1;
		if (i < 0) return;
		list!.splice(i, 1);
		this.touch(ref.model);
	}

	startOver() {
		this.#take(fresh());
	}

	/** The demo decision (core/demo.ts), every model it fills marked as entered. */
	loadDemo() {
		const { decision, inputs } = demo();
		this.#take({
			decision,
			inputs: normalized(inputs, decision),
			touched: Object.fromEntries(models.map((m) => [m.id, m.id in inputs])),
			active: models[0]!.id
		});
	}

	/** Put a whole decision in place. The view stays as it is. */
	#take(next: Omit<Saved, 'view'>) {
		this.decision = next.decision;
		this.inputs = next.inputs;
		this.touched = next.touched;
		this.active = next.active;
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
					active: this.active,
					view: this.view
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
		for (const m of models) this.inputs[m.id] = normalizeInputs(m.inputsSchema, $state.snapshot(this.inputs[m.id]), d);
	}
}

export const store = new DecisionStore();
