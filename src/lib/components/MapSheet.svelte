<!--
	The map's sheet: edit one thing on a model's map with the same generic Fields its
	form uses, bound to the same inputs in the store.
-->
<script lang="ts">
	import { tick } from 'svelte';
	import { slotOf, type Edit } from '$lib/core/diagram';
	import { store } from '$lib/state.svelte';
	import Fields from './fields/Fields.svelte';
	import Icon from './Icon.svelte';

	/** Set it to open the sheet; it stays the last thing shown once the sheet closes. */
	let { edit }: { edit: Edit | null } = $props();

	let dialog: HTMLDialogElement;

	$effect(() => {
		if (!edit || dialog.open) return;
		dialog.showModal();
		// Something just added from the map: straight to its words.
		if (edit.fresh) void tick().then(() => dialog.querySelector<HTMLElement>('input[type="text"], textarea')?.focus());
	});

	const found = $derived(edit ? slotOf(store.inputs, edit.model, edit.ref) : undefined);
	const touch = () => edit && store.touch(edit.model);

	function remove() {
		if (!edit) return;
		store.removeItem(edit.model, edit.ref);
		dialog.close();
	}

	/** Something added from the map and left without its words is dropped once the sheet has faded out. */
	async function closed() {
		if (!edit?.fresh || !edit.ref.words) return;
		const { model, ref } = edit;
		const here = slotOf(store.inputs, model, ref);
		const words = here?.holder[here.slot]?.[ref.words!];
		if (typeof words === 'string' && words.trim()) return;
		await Promise.all(dialog.getAnimations().map((a) => a.finished)).catch(() => {});
		store.removeItem(model, ref);
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
		{#if edit}
			<h2 id="sheet-title" class="ss-label">{edit.ref.title}</h2>
			{#if found}
				<form method="dialog" oninput={touch} onchange={touch}>
					<Fields fields={edit.ref.fields} bind:value={found.holder[found.slot]!} decision={store.decision} idPrefix="sheet-{edit.ref.path.join('-')}-{edit.ref.id ?? ''}" />
					<div class="actions">
						{#if edit.ref.removable}
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

	.actions {
		display: flex;
		align-items: center;
		gap: var(--ss-space-2);
		margin-top: var(--ss-space-5);
	}

	.done {
		margin-left: auto;
	}
</style>
