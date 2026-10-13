<script lang="ts">
	import { tick } from 'svelte';
	import { createItem, type Item, type ListField } from '$lib/core/schema';
	import type { Decision } from '$lib/core/types';
	import Icon from '../Icon.svelte';
	import Fields from './Fields.svelte';

	interface Props {
		field: ListField;
		items: Item<ListField['fields']>[];
		decision: Decision;
		idPrefix: string;
	}

	let { field, items = $bindable(), decision, idPrefix }: Props = $props();
	let root: HTMLElement;

	const atMax = $derived(field.max !== undefined && items.length >= field.max);
	const noun = $derived(field.itemLabel.toLowerCase());

	/** Let the panel know the user changed something (add/remove don't fire input events). */
	const changed = () => root.dispatchEvent(new Event('change', { bubbles: true }));

	async function add() {
		const item = createItem(field, $state.snapshot(decision), $state.snapshot(items));
		items.push(item);
		changed();
		await tick();
		root.querySelector<HTMLElement>(`[data-item="${item.id}"] :is(input, textarea, select)`)?.focus();
	}

	function remove(index: number) {
		items.splice(index, 1);
		changed();
		root.querySelector<HTMLElement>('.add')?.focus();
	}
</script>

<fieldset class="list" bind:this={root}>
	<legend class="ss-label">{field.label}</legend>
	{#if field.help}<p class="ss-hint">{field.help}</p>{/if}
	{#if items.length}
		<ol>
			{#each items as item, i (item.id)}
				<li data-item={item.id}>
					<span class="n ss-figure" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
					<div class="body">
						<div class="head">
							{#if field.itemTitle}
								<p class="title">{field.itemTitle(item, i, decision)}</p>
							{:else}
								<p class="title sr-only">{field.itemLabel} {i + 1}</p>
							{/if}
							<button type="button" class="ss-btn ghost icon small remove" aria-label="Remove {noun} {i + 1}" onclick={() => remove(i)}>
								<Icon name="close" />
							</button>
						</div>
						<Fields fields={field.fields} bind:value={items[i]!} {decision} idPrefix={`${idPrefix}-${item.id}`} inline={field.inline} />
					</div>
				</li>
			{/each}
		</ol>
	{/if}
	<button type="button" class="ss-btn small add" onclick={add} disabled={atMax}>
		<Icon name="plus" />
		{field.addLabel ?? `Add ${noun}`}
	</button>
</fieldset>

<style>
	.list {
		display: grid;
		gap: var(--ss-space-3);
		min-width: 0;
		margin: 0;
		padding: 0;
		border: 0;
	}

	legend {
		padding: 0;
		margin-bottom: var(--ss-space-2);
	}

	ol {
		display: grid;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	li {
		display: grid;
		grid-template-columns: 1.75rem minmax(0, 1fr);
		padding-block: var(--ss-space-3) var(--ss-space-4);
		border-top: var(--ss-hairline) solid var(--ss-ui);
	}

	li:last-child {
		border-bottom: var(--ss-hairline) solid var(--ss-ui);
	}

	.n {
		padding-top: 0.45rem;
		color: var(--ss-tx-2);
		font-size: var(--ss-text-xs);
	}

	.body {
		display: grid;
		gap: var(--ss-space-1);
		min-width: 0;
	}

	.head {
		display: flex;
		align-items: start;
		justify-content: space-between;
		gap: var(--ss-space-2);
		min-height: 24px;
	}

	.title {
		margin: 0;
		padding-top: 0.2rem;
		color: var(--ss-tx-2);
		font-size: var(--ss-text-sm);
	}

	.remove {
		margin-left: auto;
		color: var(--ss-icon);
		transition: color var(--ss-dur-hover) var(--ss-ease-hover);
	}

	@media (hover: hover) {
		.remove:hover {
			color: var(--ss-danger);
		}
	}

	.remove:active {
		color: var(--ss-danger);
		transition-duration: 0s;
	}

	.add {
		justify-self: start;
	}
</style>
