<!--
	The map's sheet: pick what to add, or edit one thing on a model's map with the
	same generic Fields its form uses, bound to the same inputs in the store.
-->
<script lang="ts">
	import { tick } from 'svelte';
	import { slotOf, type MapAdd, type MapEdit } from '$lib/core/map';
	import { optionLabel } from '$lib/core/util';
	import { store } from '$lib/state.svelte';
	import Fields from './fields/Fields.svelte';
	import Icon from './Icon.svelte';

	/** Set it to open the sheet; it stays the last thing shown once the sheet closes. */
	let { edit = $bindable() }: { edit: MapEdit | null } = $props();

	let dialog: HTMLDialogElement;

	$effect(() => {
		if (edit && !dialog.open) dialog.showModal();
	});

	// The thing being edited, live from the store.
	const item = $derived(edit?.kind === 'item' ? edit.item : null);
	const found = $derived(item ? slotOf(store.inputs, item) : undefined);
	const source = $derived(store.models.find((m) => m.id === item?.model)?.short ?? '');

	async function add(choice: MapAdd) {
		const id = store.addItem(choice);
		if (!id) return;
		edit = { kind: 'item', item: { model: choice.model, path: choice.path, id, fields: choice.list.fields, list: choice.list, kind: choice.kind }, fresh: true };
		await tick();
		dialog.querySelector<HTMLElement>('input[type="text"], textarea')?.focus();
	}

	const touch = () => item && store.touch(item.model);

	function remove() {
		if (!item) return;
		store.removeItem(item);
		dialog.close();
	}

	/** An item added here and left without its words is dropped once the sheet has faded out. */
	async function closed() {
		if (edit?.kind !== 'item' || !edit.fresh || !edit.item.list?.map) return;
		const added = edit.item;
		const words = slotOf(store.inputs, added);
		const text = words?.holder[words.slot]?.[added.list!.map!.label];
		if (typeof text === 'string' && text.trim()) return;
		await Promise.all(dialog.getAnimations().map((a) => a.finished)).catch(() => {});
		store.removeItem(added);
	}
</script>

<!-- A click on the backdrop lands on the dialog itself (its content fills it); Esc closes it natively. -->
<dialog
	class="ss-pop ss-move up sheet"
	aria-labelledby="sheet-title"
	bind:this={dialog}
	onclose={closed}
	onclick={(e) => e.target === dialog && dialog.close()}
>
	<div class="inner">
		{#if edit?.kind === 'add'}
			<h2 id="sheet-title" class="ss-label">
				{edit.option ? `Add to ${optionLabel(store.decision, edit.option)}` : 'Add across options'}
			</h2>
			<div class="ss-menu menu">
				{#each edit.adds as choice (`${choice.path.join('/')}`)}
					<button type="button" disabled={choice.full} onclick={() => add(choice)}>
						<i class="pip {choice.tone ?? ''}"></i>
						<span>
							{choice.kind}
							{#if choice.link || choice.full}
								<span class="from">
									{#if choice.link}{choice.link.label} {optionLabel(store.decision, choice.link.option)}{/if}{#if choice.full}{choice.link ? ' · ' : ''}full{/if}
								</span>
							{/if}
						</span>
					</button>
				{/each}
			</div>
			<div class="actions">
				<button type="button" class="ss-btn small" onclick={() => dialog.close()}>Cancel</button>
			</div>
		{:else if item}
			<h2 id="sheet-title" class="ss-label">{item.kind ? `${item.kind} · ${source}` : source}</h2>
			{#if found}
				<form method="dialog" oninput={touch} onchange={touch}>
					<Fields fields={item.fields} bind:value={found.holder[found.slot]!} decision={store.decision} idPrefix="sheet-{item.path.join('-')}-{item.id ?? ''}" />
					<div class="actions">
						{#if item.list}
							<button type="button" class="ss-btn ghost small remove" onclick={remove}><Icon name="trash" /> Remove</button>
						{/if}
						<button class="ss-btn primary small done">Done</button>
					</div>
				</form>
			{/if}
		{/if}
	</div>
</dialog>

<style>
	.sheet {
		width: min(30rem, 100% - var(--ss-gutter) * 2);
		max-height: min(85dvh, 44rem);
		padding: 0;
		overflow: auto;
		overscroll-behavior: contain;
		color: var(--ss-tx);
	}

	.inner {
		display: grid;
		gap: var(--ss-space-4);
		padding: var(--ss-space-5);
	}

	h2 {
		margin: 0;
	}

	.menu {
		min-width: 0;
		padding: 0;
	}

	.menu button {
		align-items: baseline;
	}

	.menu button:disabled {
		cursor: not-allowed;
		opacity: 0.45;
	}

	.menu .pip {
		translate: 0 -1px;
	}

	.from {
		display: block;
		color: var(--ss-tx-2);
		font-size: var(--ss-text-xs);
	}

	.actions {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--ss-space-2);
		margin-top: var(--ss-space-5);
	}

	.menu + .actions {
		margin-top: 0;
		justify-content: flex-end;
	}

	.done {
		margin-left: auto;
	}
</style>
