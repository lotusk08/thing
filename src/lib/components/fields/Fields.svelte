<!--
	Generic renderer for any model's inputsSchema. Recursive for group / perOption / list.
	`value` is bound to the store's deep $state, so edits flow straight back.
	Styled with SS: labels over controls, .ss-input underlines, .ss-segment / select for
	choices (a segment up to three states, a menu past that), .ss-check boxes, hairlines.
	A short whole-number range is a Scale of steps to tap; a one-line text wraps and
	grows; numbers rated per option are one grid, each question once with a row per
	option. `compact` (a list's item) puts each control on one row with its label.
-->
<script lang="ts">
	import { choicesOf, scaleSteps, type Field, type Fields, type NumberField } from '$lib/core/schema';
	import type { Decision, OptionId } from '$lib/core/types';
	import { figure, optionLabel } from '$lib/core/util';
	import { grow } from '$lib/grow';
	import Mark from '../diagrams/Mark.svelte';
	import Self from './Fields.svelte';
	import ListInput from './ListInput.svelte';
	import Scale from './Scale.svelte';

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
		/** A list's item: each control on one row with its label, the words full width. */
		compact?: boolean;
	}

	let { fields, value = $bindable(), decision, idPrefix, compact = false }: Props = $props();

	const SEGMENT_MAX = 3;
	const allNumbers = (fs: readonly Field[]): fs is readonly NumberField[] => fs.every((q) => q.kind === 'number');
	const allScales = (fs: readonly Field[]): fs is readonly NumberField[] => allNumbers(fs) && fs.every((q) => scaleSteps(q));
	/** The end words every field shares, to write once under them all. */
	const sharedEnds = (fs: readonly NumberField[]) => {
		const [first] = fs;
		return first?.ends && fs.every((q) => q.ends?.[0] === first.ends?.[0] && q.ends?.[1] === first.ends?.[1]) ? first : undefined;
	};
</script>

{#snippet slider(f: NumberField, v: Bag, id: string, labelledby: string | undefined, helpId: string | undefined)}
	<div class="slide">
		<input
			type="range"
			{id}
			min={f.min}
			max={f.max}
			step={f.step ?? 1}
			bind:value={v[f.key]}
			aria-labelledby={labelledby}
			aria-describedby={helpId}
			aria-valuetext={f.ends ? `${figure(v[f.key] as number, { signed: f.signed })} (${f.ends[0]} ${figure(f.min, { signed: f.signed })} to ${f.ends[1]} ${figure(f.max, { signed: f.signed })})` : undefined}
		/>
		<output class="ss-figure" for={id}>{figure(v[f.key] as number, { signed: f.signed })}</output>
	</div>
{/snippet}

{#snippet ends(f: NumberField)}
	{#if f.ends && !compact}
		<div class="ends" aria-hidden="true"><span>{f.ends[0]}</span><span>{f.ends[1]}</span></div>
	{/if}
{/snippet}

<div class="fields" class:compact>
	{#each fields as f (f.key)}
		{@const id = `${idPrefix}-${f.key}`}
		{@const labelId = `${id}-label`}
		{@const helpId = 'help' in f && f.help ? `${id}-help` : undefined}
		{#if f.kind === 'number'}
			{@const steps = scaleSteps(f)}
			<div class="ss-field number" class:row={compact}>
				{#if steps}
					<span class="label" id={labelId}>{f.label}</span>
					<div class="control">
						<Scale field={f} {steps} bind:value={value[f.key]} name={id} labelledby={labelId} describedby={helpId} />
						{@render ends(f)}
					</div>
				{:else}
					<label class="label" for={id}>{f.label}</label>
					<div class="control wide">
						{@render slider(f, value, id, undefined, helpId)}
						{@render ends(f)}
					</div>
				{/if}
				{#if f.help}<p class="ss-hint" id={helpId}>{f.help}</p>{/if}
			</div>
		{:else if f.kind === 'text'}
			<div class="ss-field text">
				<label class="label" for={id} class:sr-only={compact}>{f.label}</label>
				{#if f.multiline}
					<textarea class="ss-input" {id} rows="2" placeholder={f.placeholder} bind:value={value[f.key]} aria-describedby={helpId}></textarea>
				{:else}
					<textarea
						class="ss-input line"
						{id}
						rows="1"
						placeholder={f.placeholder ?? (compact ? f.label : undefined)}
						autocomplete="off"
						bind:value={value[f.key]}
						aria-describedby={helpId}
						use:grow={value[f.key]}
					></textarea>
				{/if}
				{#if f.help}<p class="ss-hint" id={helpId}>{f.help}</p>{/if}
			</div>
		{:else if f.kind === 'choice'}
			{@const choices = choicesOf(f, decision)}
			{#if choices.length <= SEGMENT_MAX}
				<div class="ss-field choice" class:row={compact} role="radiogroup" aria-labelledby={labelId} aria-describedby={helpId}>
					<span class="label" id={labelId}>{f.label}</span>
					<div class="ss-segment segment">
						{#each choices as c (c.value)}
							<label>
								<input type="radio" name={id} value={c.value} bind:group={value[f.key]} />
								<span>{c.label}</span>
							</label>
						{/each}
					</div>
					{#if f.help}<p class="ss-hint" id={helpId}>{f.help}</p>{/if}
				</div>
			{:else}
				<div class="ss-field" class:row={compact}>
					<label class="label" for={id}>{f.label}</label>
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
			<div class="ss-field" class:row={compact} role="group" aria-labelledby={labelId} aria-describedby={helpId}>
				<span class="label" id={labelId}>{f.label}</span>
				<div class="checks">
					{#each decision.options as o (o.id)}
						<label class="ss-check">
							<input type="checkbox" value={o.id} bind:group={value[f.key]} />
							<span>{optionLabel(decision, o.id)}</span>
						</label>
					{/each}
				</div>
				{#if f.help}<p class="ss-hint" id={helpId}>{f.help}</p>{/if}
			</div>
		{:else if f.kind === 'group'}
			<fieldset class="group" aria-describedby={helpId}>
				<legend class="ss-label">{f.label}</legend>
				{#if f.help}<p class="ss-hint" id={helpId}>{f.help}</p>{/if}
				{#if allScales(f.fields)}
					<!-- Scales side by side as rows, as in the score grid: each label, then its scale. -->
					{@const shared = sharedEnds(f.fields)}
					{@const group = value[f.key] as Bag}
					<div class="rows">
						{#each f.fields as q (q.key)}
							{@const qid = `${id}-${q.key}`}
							{@const steps = scaleSteps(q)!}
							{@const qHelp = q.help ? `${qid}-help` : undefined}
							<div class="row-grid">
								<span class="who" id="{qid}-label">{q.label}</span>
								<div class="control">
									<Scale field={q} {steps} bind:value={group[q.key]} name={qid} labelledby="{qid}-label" describedby={qHelp} />
									{#if !shared}{@render ends(q)}{/if}
									{#if q.help}<p class="ss-hint" id={qHelp}>{q.help}</p>{/if}
								</div>
							</div>
						{/each}
						{#if shared}
							<div class="row-grid" aria-hidden="true">
								<span class="who"></span>
								<div class="control">{@render ends(shared)}</div>
							</div>
						{/if}
					</div>
				{:else}
					<Self fields={f.fields} bind:value={value[f.key]} {decision} idPrefix={id} />
				{/if}
			</fieldset>
		{:else if f.kind === 'perOption'}
			{@const byOption = value[f.key] as Record<OptionId, Bag>}
			{#if allNumbers(f.fields)}
				<!-- Every option rated on the same questions: each question once, a row per option. -->
				{@const solo = f.fields.length === 1}
				<div class="scores" role="group" aria-labelledby={labelId}>
					<p class="ss-label" id={labelId} class:sr-only={solo || compact}>{f.label}</p>
					<div class="questions">
						{#each f.fields as q (q.key)}
							{@const qid = `${id}-${q.key}`}
							{@const steps = scaleSteps(q)}
							{@const qHelp = q.help ? `${qid}-help` : undefined}
							{@const named = solo ? labelId : `${qid}-label`}
							<div class="question">
								{#if !solo}<p class="q" id="{qid}-label">{q.label}</p>{/if}
								{#if q.help}<p class="ss-hint" id={qHelp}>{q.help}</p>{/if}
								{#each decision.options as o, i (o.id)}
									{@const rid = `${qid}-${o.id}`}
									<div class="row-grid opt-{i}">
										<span class="who" id="{rid}-who"><Mark option={o.id} named /></span>
										{#if steps}
											<div class="control">
												<Scale field={q} {steps} bind:value={byOption[o.id]![q.key]} name={rid} labelledby="{rid}-who {named}" describedby={qHelp} />
											</div>
										{:else}
											<div class="control wide">{@render slider(q, byOption[o.id]!, rid, `${rid}-who ${named}`, qHelp)}</div>
										{/if}
									</div>
								{/each}
								{#if q.ends && !compact}
									<div class="row-grid" aria-hidden="true">
										<span class="who"></span>
										<div class="control">{@render ends(q)}</div>
									</div>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			{:else}
				<!-- A column per option, in the option's colour. -->
				<div class="per-option">
					{#each decision.options as o, i (o.id)}
						<fieldset class="option opt-{i}">
							<legend><Mark option={o.id} named /></legend>
							<Self fields={f.fields} bind:value={byOption[o.id]!} {decision} idPrefix={`${id}-${o.id}`} />
						</fieldset>
					{/each}
				</div>
			{/if}
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

	.ss-field {
		display: grid;
		gap: 6px;
		min-width: 0;
	}

	.label {
		color: var(--ss-tx-2);
		font-size: var(--ss-text-xs);
		font-weight: 500;
	}

	/*
	 * A scale is its wheel's width (five numbers), never wider than the column. Set
	 * outright: the wheel's numbers scroll inside it and lend it no width of their own.
	 */
	.control {
		width: calc(5 * var(--wheel-item));
		max-width: 100%;
	}

	.control.wide {
		width: min(100%, 36rem);
	}

	.slide {
		display: flex;
		align-items: center;
		gap: var(--ss-space-3);
	}

	output {
		min-width: 3ch;
		color: var(--ss-tx);
		font-size: var(--ss-text-sm);
		font-weight: 600;
		text-align: right;
	}

	.ends {
		display: flex;
		justify-content: space-between;
		margin-top: 4px;
		padding-inline: var(--ss-space-2);
		color: var(--ss-tx-2);
		font-size: var(--ss-text-2xs);
	}

	/* One line of words that wraps as it grows, never cut off: not SS's 6rem notes box. */
	.line {
		min-height: 0;
		overflow: hidden;
		resize: none;
	}

	/*
	 * A list's item: the words full width, then each control on one row with its
	 * label, wrapping side by side where there is room.
	 */
	.fields.compact {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--ss-space-2) var(--ss-space-6);
	}

	.compact > .text,
	.compact > .scores,
	.compact > .per-option {
		flex: 1 1 100%;
	}

	.row {
		display: flex;
		flex: 0 1 auto;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--ss-space-1) var(--ss-space-3);
	}

	/* Labels one width, so the controls of an item line up under each other. */
	.row > .label {
		flex: none;
		min-width: 4.75rem;
	}

	.row > select {
		width: auto;
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

	.rows {
		display: grid;
		gap: var(--ss-space-2);
	}

	/* Rated per option: each question once, a row per option, the questions side by side where there is room. */
	.scores {
		display: grid;
		gap: var(--ss-space-3);
	}

	.questions {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 22rem), 1fr));
		gap: var(--ss-space-6) var(--ss-space-8);
	}

	.compact .questions {
		grid-template-columns: minmax(0, 1fr);
	}

	.question {
		display: grid;
		align-content: start;
		gap: var(--ss-space-2);
	}

	.q {
		margin: 0;
		color: var(--ss-tx);
		font-size: var(--ss-text-sm);
		font-weight: 600;
	}

	.question > .ss-hint {
		margin: -4px 0 var(--ss-space-1);
	}

	/* The option's name, then its scale; the scale drops under the name where there isn't room for both. */
	.row-grid {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--ss-space-1) var(--ss-space-3);
	}

	.row-grid > .control {
		flex: none;
	}

	.row-grid .ends {
		margin-top: -2px;
	}

	.who {
		display: inline-flex;
		flex: 1 0 7rem;
		align-items: center;
		max-width: 9rem;
		min-width: 0;
		overflow: hidden;
		color: var(--ss-tx);
		font-size: var(--ss-text-sm);
		text-overflow: ellipsis;
		white-space: nowrap;
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
		display: flex;
		align-items: center;
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
