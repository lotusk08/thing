<!--
	The map's sheet: pick what to add, or edit one item or note with the same
	generic Fields its model panel uses, bound to the same inputs in the store.
-->
<script lang="ts">
	import { tick } from 'svelte';
	import { listAt, type MapAdd, type MapEdit } from '$lib/core/map';
	import { optionLabel } from '$lib/core/util';
	import { store } from '$lib/state.svelte';
	import { switchModel } from '$lib/switch';
	import Fields from './fields/Fields.svelte';
	import Icon from './Icon.svelte';

	/** Set it to open the sheet; it stays the last thing shown once the sheet closes. */
	let { edit = $bindable() }: { edit: MapEdit | null } = $props();

	let dialog: HTMLDialogElement;

	$effect(() => {
		if (edit && !dialog.open) dialog.showModal();
	});

	const adds = $derived(
		edit?.kind !== 'add' ? [] : edit.option ? (store.map.adds.options[edit.option] ?? []) : store.map.adds.shared
	);

	// The item being edited, live from the store.
	const item = $derived(edit?.kind === 'item' ? edit.item : null);
	const list = $derived(item ? (listAt(store.inputs[item.ref.model], item.ref.path) ?? []) : []);
	const index = $derived(item ? list.findIndex((x) => x.id === item.id) : -1);
	const model = $derived(item ? item.ref.model : edit?.kind === 'note' ? edit.note.model : null);

	async function add(choice: MapAdd) {
		const id = store.addItem(choice);
		if (!id) return;
		edit = { kind: 'item', item: { ...choice, id }, fresh: true };
		await tick();
		dialog.querySelector<HTMLElement>('input[type="text"], textarea')?.focus();
	}

	const touch = () => model && store.touch(model);

	function remove() {
		if (!item) return;
		store.removeItem(item.ref, item.id);
		dialog.close();
	}

	async function openModel() {
		dialog.close();
		if (model) await switchModel(model);
	}

	/** An item added here and left without text is dropped once the sheet has faded out. */
	async function closed() {
		if (edit?.kind !== 'item' || !edit.fresh) return;
		const { ref, id, field } = edit.item;
		const text = field.map && listAt(store.inputs[ref.model], ref.path)?.find((x) => x.id === id)?.[field.map.label];
		if (typeof text === 'string' && text.trim()) return;
		await Promise.all(dialog.getAnimations().map((a) => a.finished)).catch(() => {});
		store.removeItem(ref, id);
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
				{#each adds as choice (`${choice.ref.model}/${choice.ref.path.join('/')}`)}
					<button type="button" disabled={choice.full} onclick={() => add(choice)}>
						<i class="pip {choice.tone ?? ''}"></i>
						<span>
							{choice.kind}
							<span class="from">
								{choice.source}{#if choice.link}&nbsp;· {choice.link.label} {optionLabel(store.decision, choice.link.option)}{/if}{#if choice.full}&nbsp;· full{/if}
							</span>
						</span>
					</button>
				{/each}
			</div>
			<div class="actions">
				<button type="button" class="ss-btn small" onclick={() => dialog.close()}>Cancel</button>
			</div>
		{:else if item}
			<h2 id="sheet-title" class="ss-label">{item.kind} · {item.source}</h2>
			{#if index >= 0}
				<form method="dialog" oninput={touch} onchange={touch}>
					<Fields fields={item.field.fields} bind:value={list[index]!} decision={store.decision} idPrefix="sheet-{item.id}" />
					<div class="actions">
						<button type="button" class="ss-btn ghost small remove" onclick={remove}><Icon name="trash" /> Remove</button>
						<span class="end">
							<button type="button" class="ss-btn ghost small" onclick={openModel}>Open {item.source}</button>
							<button class="ss-btn primary small">Done</button>
						</span>
					</div>
				</form>
			{/if}
		{:else if edit?.kind === 'note'}
			<h2 id="sheet-title" class="ss-label">{edit.note.field.label} · {edit.note.source}</h2>
			<form method="dialog" oninput={touch} onchange={touch}>
				<Fields fields={[edit.note.field]} bind:value={store.inputs[edit.note.model]!} decision={store.decision} idPrefix="sheet-{edit.note.model}" />
				<div class="actions">
					<span class="end">
						<button type="button" class="ss-btn ghost small" onclick={openModel}>Open {edit.note.source}</button>
						<button class="ss-btn primary small">Done</button>
					</span>
				</div>
			</form>
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

	.from {
		display: block;
		color: var(--ss-tx-2);
		font-size: var(--ss-text-xs);
	}

	.menu .pip {
		translate: 0 -1px;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--ss-space-2);
		margin-top: var(--ss-space-5);
	}

	.menu + .actions {
		margin-top: 0;
	}

	.end {
		display: flex;
		gap: var(--ss-space-2);
		margin-left: auto;
	}
</style>
