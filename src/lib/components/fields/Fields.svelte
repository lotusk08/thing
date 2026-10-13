<!--
	Generic renderer for any model's inputsSchema. Recursive for group / perOption / list.
	`value` is bound to the store's deep $state, so edits flow straight back.
-->
<script lang="ts">
	import { choicesOf, type Fields } from '$lib/core/schema';
	import type { Decision } from '$lib/core/types';
	import { optionLabel } from '$lib/core/util';
	import Self from './Fields.svelte';
	import ListInput from './ListInput.svelte';

	type Bag = Record<string, any>;

	interface Props {
		fields: Fields;
		value: Bag;
		decision: Decision;
		/** Unique per instance; used for ids and radio names. */
		idPrefix: string;
		/** Compact one-row layout (list items). */
		inline?: boolean;
	}

	let { fields, value = $bindable(), decision, idPrefix, inline = false }: Props = $props();

	const show = (n: number, signed = false) => (signed && n > 0 ? `+${n}` : String(n));
</script>

<div class="fields" class:inline>
	{#each fields as f (f.key)}
		{@const id = `${idPrefix}-${f.key}`}
		{@const helpId = 'help' in f && f.help ? `${id}-help` : undefined}
		{#if f.kind === 'number'}
			<div class="field number">
				<div class="label-row">
					<label for={id}>{f.label}</label>
					<output for={id}>{show(value[f.key], f.signed)}</output>
				</div>
				<input
					type="range"
					{id}
					min={f.min}
					max={f.max}
					step={f.step ?? 1}
					bind:value={value[f.key]}
					aria-describedby={helpId}
					aria-valuetext={f.ends ? `${show(value[f.key], f.signed)} (${f.ends[0]} ${show(f.min, f.signed)} to ${f.ends[1]} ${show(f.max, f.signed)})` : undefined}
				/>
				{#if f.ends && !inline}
					<div class="ends" aria-hidden="true"><span>{f.ends[0]}</span><span>{f.ends[1]}</span></div>
				{/if}
				{#if f.help}<p class="help" id={helpId}>{f.help}</p>{/if}
			</div>
		{:else if f.kind === 'text'}
			<div class="field text">
				<label for={id} class:sr-only={inline}>{f.label}</label>
				{#if f.multiline}
					<textarea {id} rows="2" placeholder={f.placeholder} bind:value={value[f.key]} aria-describedby={helpId}></textarea>
				{:else}
					<input
						type="text"
						{id}
						placeholder={f.placeholder ?? (inline ? f.label : undefined)}
						bind:value={value[f.key]}
						aria-describedby={helpId}
					/>
				{/if}
				{#if f.help}<p class="help" id={helpId}>{f.help}</p>{/if}
			</div>
		{:else if f.kind === 'choice'}
			<fieldset class="field choice" aria-describedby={helpId}>
				<legend>{f.label}</legend>
				<div class="segmented">
					{#each choicesOf(f, decision) as c (c.value)}
						<label>
							<input type="radio" name={id} value={c.value} bind:group={value[f.key]} />
							<span>{c.label}</span>
						</label>
					{/each}
				</div>
				{#if f.help}<p class="help" id={helpId}>{f.help}</p>{/if}
			</fieldset>
		{:else if f.kind === 'optionSet'}
			<fieldset class="field choice" aria-describedby={helpId}>
				<legend>{f.label}</legend>
				<div class="segmented">
					{#each decision.options as o (o.id)}
						<label>
							<input type="checkbox" value={o.id} bind:group={value[f.key]} />
							<span>{optionLabel(decision, o.id)}</span>
						</label>
					{/each}
				</div>
				{#if f.help}<p class="help" id={helpId}>{f.help}</p>{/if}
			</fieldset>
		{:else if f.kind === 'group'}
			<fieldset class="field group" aria-describedby={helpId}>
				<legend>{f.label}</legend>
				{#if f.help}<p class="help" id={helpId}>{f.help}</p>{/if}
				<Self fields={f.fields} bind:value={value[f.key]} {decision} idPrefix={id} />
			</fieldset>
		{:else if f.kind === 'perOption'}
			<div class="per-option">
				{#each decision.options as o (o.id)}
					<fieldset class="card">
						<legend>{optionLabel(decision, o.id)}</legend>
						<Self fields={f.fields} bind:value={value[f.key][o.id]} {decision} idPrefix={`${id}-${o.id}`} />
					</fieldset>
				{/each}
			</div>
		{:else if f.kind === 'list'}
			<ListInput field={f} bind:items={value[f.key]} {decision} idPrefix={id} />
		{/if}
	{/each}
</div>

<style>
	.fields {
		display: grid;
		gap: 1rem;
	}

	.fields.inline {
		display: flex;
		flex-wrap: wrap;
		align-items: end;
		gap: 0.5rem 0.75rem;
	}

	.inline > .text {
		flex: 2 1 12rem;
	}

	.inline > .number {
		flex: 1 1 7rem;
	}

	.inline > .choice {
		flex: 1 1 100%;
	}

	.field {
		display: grid;
		gap: 0.25rem;
	}

	.label-row {
		display: flex;
		justify-content: space-between;
		gap: 0.5rem;
		align-items: baseline;
	}

	label,
	legend {
		font-weight: 550;
		font-size: 0.95rem;
	}

	.inline label,
	.inline legend {
		font-size: 0.85rem;
		font-weight: 500;
		color: var(--muted);
	}

	output {
		font-variant-numeric: tabular-nums;
		font-weight: 650;
		min-width: 2ch;
		text-align: right;
	}

	.ends {
		display: flex;
		justify-content: space-between;
		font-size: 0.75rem;
		color: var(--muted);
		margin-top: -0.25rem;
	}

	.help {
		font-size: 0.85rem;
		color: var(--muted);
	}

	.choice legend {
		margin-bottom: 0.35rem;
	}

	.segmented {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}

	.segmented label {
		position: relative;
		font-weight: 500;
		font-size: 0.9rem;
	}

	.segmented input {
		position: absolute;
		opacity: 0;
		inset: 0;
		margin: 0;
		cursor: pointer;
	}

	.segmented span {
		display: inline-flex;
		align-items: center;
		min-height: 2.5rem;
		padding: 0.35rem 0.8rem;
		border: 1px solid var(--border);
		border-radius: 999px;
		background: var(--surface);
		cursor: pointer;
	}

	.segmented input:checked + span {
		background: var(--accent);
		border-color: var(--accent);
		color: var(--on-accent);
	}

	.segmented input:focus-visible + span {
		outline: 3px solid var(--accent);
		outline-offset: 2px;
	}

	.group {
		padding: 0.75rem;
		border: 1px dashed var(--border);
		border-radius: var(--radius);
	}

	.group legend {
		padding: 0 0.25rem;
	}

	.per-option {
		display: grid;
		gap: 0.75rem;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 17rem), 1fr));
	}

	.card {
		padding: 0.9rem;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
	}

	.card > legend {
		float: left;
		width: 100%;
		margin-bottom: 0.75rem;
		font-size: 1.05rem;
		font-weight: 700;
		color: var(--text);
	}

	.card > legend + :global(*) {
		clear: both;
	}
</style>
