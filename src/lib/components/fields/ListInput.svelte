<script lang="ts">
	import { enter, leave } from 'ss/motion';
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

	const row = (id: string) => root.querySelector<HTMLElement>(`[data-item="${id}"]`);

	/** A new item comes in with SS's motion (it opens in place, the items below make room), then takes the focus. */
	async function add() {
		const item = createItem(field, $state.snapshot(decision), $state.snapshot(items));
		items.push(item);
		changed();
		await tick();
		const li = row(item.id);
		if (!li) return;
		enter(li);
		// It comes in from hidden, which takes no focus: focus it once it shows, two frames on.
		const words = li.querySelector<HTMLElement>(':is(input, textarea, select)');
		requestAnimationFrame(() => requestAnimationFrame(() => words?.focus()));
	}

	/** A removed item goes out with SS's motion, closing its gap, before it leaves the list. */
	async function remove(id: string) {
		const li = row(id);
		// Already on its way out (a second click on its ×): let it go.
		if (li && !li.classList.contains('show')) return;
		if (li) await leave(li);
		const index = items.findIndex((x) => x.id === id);
		if (index >= 0) items.splice(index, 1);
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
				{@const title = field.itemTitle?.(item, i, decision)}
				<!-- The item's words full width beside its ×, its other inputs on a row under them. -->
				<li class="ss-move tall up show" data-item={item.id}>
					<div class="body">
						<p class="title" class:sr-only={title === undefined}>{title ?? `${field.itemLabel} ${i + 1}`}</p>
						<Fields fields={field.fields} bind:value={items[i]!} {decision} idPrefix={`${idPrefix}-${item.id}`} compact />
					</div>
					<button type="button" class="ss-btn ghost icon small remove" aria-label="Remove {noun} {i + 1}" onclick={() => remove(item.id)}>
						<Icon name="close" />
					</button>
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
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: start;
		gap: var(--ss-space-2);
		padding-block: var(--ss-space-3);
		border-top: var(--ss-hairline) solid var(--ss-ui);
	}

	li:last-child {
		border-bottom: var(--ss-hairline) solid var(--ss-ui);
	}

	.body {
		display: grid;
		gap: var(--ss-space-2);
		min-width: 0;
	}

	.title {
		margin: 0;
		color: var(--ss-tx-2);
		font-size: var(--ss-text-sm);
	}

	.add {
		justify-self: start;
	}
</style>
