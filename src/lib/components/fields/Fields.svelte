<!--
	Generic renderer for any model's inputsSchema. Recursive for group / perOption / list.
	`value` is bound to the store's deep $state, so edits flow straight back.
	Styled with SS: .ss-field labels, .ss-input underlines, .ss-segment / select for choices
	(a segment up to three states, a menu past that), .ss-check boxes, hairlines over cards.
-->
<script lang="ts">
	import { choicesOf, type Fields } from '$lib/core/schema';
	import type { Decision, OptionId } from '$lib/core/types';
	import { optionLabel } from '$lib/core/util';
	import Self from './Fields.svelte';
	import ListInput from './ListInput.svelte';

	/**
	 * Each branch below binds the kind of value its field declares, which a key
	 * only known at run time can't tell TypeScript: hence `any`, read as the
	 * field's type wherever it is shown.
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

	const SEGMENT_MAX = 3;
	const show = (n: number, signed = false) => (signed && n > 0 ? `+${n}` : String(n));
</script>

<div class="fields" class:inline>
	{#each fields as f (f.key)}
		{@const id = `${idPrefix}-${f.key}`}
		{@const helpId = 'help' in f && f.help ? `${id}-help` : undefined}
		{#if f.kind === 'number'}
			<div class="ss-field number">
				<div class="label-row">
					<label for={id}>{f.label}</label>
					<output class="ss-figure" for={id}>{show(value[f.key] as number, f.signed)}</output>
				</div>
				<input
					type="range"
					{id}
					min={f.min}
					max={f.max}
					step={f.step ?? 1}
					bind:value={value[f.key]}
					aria-describedby={helpId}
					aria-valuetext={f.ends ? `${show(value[f.key] as number, f.signed)} (${f.ends[0]} ${show(f.min, f.signed)} to ${f.ends[1]} ${show(f.max, f.signed)})` : undefined}
				/>
				{#if f.ends && !inline}
					<div class="ends" aria-hidden="true"><span>{f.ends[0]}</span><span>{f.ends[1]}</span></div>
				{/if}
				{#if f.help}<p class="ss-hint" id={helpId}>{f.help}</p>{/if}
			</div>
		{:else if f.kind === 'text'}
			<div class="ss-field text">
				<label for={id} class:sr-only={inline}>{f.label}</label>
				{#if f.multiline}
					<textarea class="ss-input" {id} rows="2" placeholder={f.placeholder} bind:value={value[f.key]} aria-describedby={helpId}></textarea>
				{:else}
					<input
						class="ss-input"
						type="text"
						{id}
						placeholder={f.placeholder ?? (inline ? f.label : undefined)}
						autocomplete="off"
						bind:value={value[f.key]}
						aria-describedby={helpId}
					/>
				{/if}
				{#if f.help}<p class="ss-hint" id={helpId}>{f.help}</p>{/if}
			</div>
		{:else if f.kind === 'choice'}
			{@const choices = choicesOf(f, decision)}
			{#if choices.length <= SEGMENT_MAX}
				<fieldset class="ss-field choice" aria-describedby={helpId}>
					<legend>{f.label}</legend>
					<div class="ss-segment segment">
						{#each choices as c (c.value)}
							<label>
								<input type="radio" name={id} value={c.value} bind:group={value[f.key]} />
								<span>{c.label}</span>
							</label>
						{/each}
					</div>
					{#if f.help}<p class="ss-hint" id={helpId}>{f.help}</p>{/if}
				</fieldset>
			{:else}
				<div class="ss-field">
					<label for={id}>{f.label}</label>
					<select class="ss-input" {id} bind:value={value[f.key]} aria-describedby={helpId}>
						{#if f.default === ''}<option value="">Choose…</option>{/if}
						{#each choices as c (c.value)}
							<option value={c.value}>{c.label}</option>
						{/each}
					</select>
					{#if f.help}<p class="ss-hint" id={helpId}>{f.help}</p>{/if}
				</div>
			{/if}
		{:else if f.kind === 'optionSet'}
			<fieldset class="ss-field" aria-describedby={helpId}>
				<legend>{f.label}</legend>
				<div class="checks">
					{#each decision.options as o (o.id)}
						<label class="ss-check">
							<input type="checkbox" value={o.id} bind:group={value[f.key]} />
							<span>{optionLabel(decision, o.id)}</span>
						</label>
					{/each}
				</div>
				{#if f.help}<p class="ss-hint" id={helpId}>{f.help}</p>{/if}
			</fieldset>
		{:else if f.kind === 'group'}
			<fieldset class="group" aria-describedby={helpId}>
				<legend class="ss-label">{f.label}</legend>
				{#if f.help}<p class="ss-hint" id={helpId}>{f.help}</p>{/if}
				<Self fields={f.fields} bind:value={value[f.key]} {decision} idPrefix={id} />
			</fieldset>
		{:else if f.kind === 'perOption'}
			{@const byOption = value[f.key] as Record<OptionId, Bag>}
			<div class="per-option">
				{#each decision.options as o (o.id)}
					<fieldset class="option">
						<legend>{optionLabel(decision, o.id)}</legend>
						<Self fields={f.fields} bind:value={byOption[o.id]!} {decision} idPrefix={`${id}-${o.id}`} />
					</fieldset>
				{/each}
			</div>
		{:else if f.kind === 'list'}
			<ListInput field={f} bind:items={value[f.key]} {decision} idPrefix={id} />
		{/if}
	{/each}
</div>

<style>
	fieldset {
		min-width: 0;
		margin: 0;
		padding: 0;
		border: 0;
	}

	legend {
		padding: 0;
	}

	.fields {
		display: grid;
		gap: var(--ss-space-5);
	}

	.fields.inline {
		display: flex;
		flex-wrap: wrap;
		align-items: end;
		gap: var(--ss-space-2) var(--ss-space-5);
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

	.label-row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--ss-space-2);
	}

	.label-row label,
	.ss-field > legend {
		color: var(--ss-tx-2);
		font-size: var(--ss-text-xs);
		font-weight: 500;
	}

	.ss-field > legend {
		margin-bottom: 6px;
	}

	output {
		min-width: 2ch;
		color: var(--ss-tx);
		font-size: var(--ss-text-sm);
		font-weight: 600;
		text-align: right;
	}

	.ends {
		display: flex;
		justify-content: space-between;
		margin-top: -4px;
		color: var(--ss-tx-2);
		font-size: var(--ss-text-2xs);
	}

	.segment {
		flex-wrap: wrap;
		justify-self: start;
	}

	.segment label {
		position: relative;
		display: inline-flex;
	}

	.segment input {
		position: absolute;
		inset: 0;
		margin: 0;
		opacity: 0;
		cursor: pointer;
	}

	.segment span {
		transition:
			color var(--ss-dur-hover) var(--ss-ease-hover),
			background var(--ss-dur-hover) var(--ss-ease-hover);
		min-width: 54px;
		padding: 3px 12px;
		border-radius: var(--ss-radius-full);
		color: var(--ss-tx-2);
		font-size: var(--ss-text-xs);
		font-weight: 500;
		text-align: center;
		cursor: pointer;
	}

	.segment input:checked + span {
		background: var(--ss-ui-3);
		color: var(--ss-tx);
	}

	@media (hover: hover) {
		.segment input:hover + span {
			color: var(--ss-tx);
		}
	}

	.segment input:focus-visible + span {
		outline: var(--ss-focus-ring);
		outline-offset: var(--ss-focus-offset);
	}

	@media (pointer: coarse) {
		.segment span {
			display: inline-flex;
			align-items: center;
			min-height: var(--ss-tap-target);
		}
	}

	.checks {
		display: flex;
		flex-wrap: wrap;
		gap: var(--ss-space-2) var(--ss-space-5);
	}

	.group {
		display: grid;
		gap: var(--ss-space-3);
		max-width: 36rem;
	}

	.per-option {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr));
		gap: var(--ss-space-8) var(--ss-space-6);
	}

	.option {
		padding-top: var(--ss-space-4);
		border-top: var(--ss-hairline) solid var(--ss-ui-2);
	}

	.option > legend {
		float: left;
		width: 100%;
		margin-bottom: var(--ss-space-4);
		color: var(--ss-tx);
		font-size: var(--ss-text-md);
		font-weight: 600;
	}

	.option > legend + :global(*) {
		clear: both;
	}
</style>
