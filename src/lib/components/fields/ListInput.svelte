<script lang="ts">
	import { tick } from 'svelte';
	import { createItem, type Item, type ListField } from '$lib/core/schema';
	import type { Decision } from '$lib/core/types';
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
		root.querySelector<HTMLElement>(`[data-item="${item.id}"] :is(input, textarea)`)?.focus();
	}

	function remove(index: number) {
		items.splice(index, 1);
		changed();
		root.querySelector<HTMLElement>('.add')?.focus();
	}
</script>

<fieldset class="list" bind:this={root}>
	<legend>{field.label}</legend>
	{#if field.help}<p class="help">{field.help}</p>{/if}
	{#if items.length}
		<ol>
			{#each items as item, i (item.id)}
				<li data-item={item.id}>
					<div class="head">
						<span class="title">{field.itemTitle ? field.itemTitle(item, i, decision) : `${field.itemLabel} ${i + 1}`}</span>
						<button type="button" class="remove ghost" aria-label="Remove {noun} {i + 1}" onclick={() => remove(i)}>
							<span aria-hidden="true">×</span>
						</button>
					</div>
					<Fields fields={field.fields} bind:value={items[i]!} {decision} idPrefix={`${idPrefix}-${item.id}`} inline={field.inline} />
				</li>
			{/each}
		</ol>
	{/if}
	<button type="button" class="add" onclick={add} disabled={atMax}>
		+ {field.addLabel ?? `Add ${noun}`}
	</button>
</fieldset>

<style>
	.list {
		display: grid;
		gap: 0.5rem;
	}

	legend {
		font-weight: 650;
		margin-bottom: 0.25rem;
	}

	.help {
		font-size: 0.85rem;
		color: var(--muted);
	}

	ol {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.5rem;
	}

	li {
		padding: 0.6rem 0.75rem 0.75rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface-2);
	}

	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		margin-bottom: 0.35rem;
	}

	.title {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--muted);
	}

	.remove {
		min-width: 2.5rem;
		font-size: 1.25rem;
		padding: 0 0.5rem;
	}

	.add {
		justify-self: start;
		border-style: dashed;
		color: var(--accent);
		font-weight: 600;
	}
</style>
