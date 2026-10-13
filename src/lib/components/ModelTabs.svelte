<script lang="ts">
	import { store } from '$lib/state.svelte';

	let list: HTMLElement;

	function select(id: string, focus = false) {
		store.active = id;
		const tab = list.querySelector<HTMLElement>(`#tab-${id}`);
		tab?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
		if (focus) tab?.focus();
	}

	function onkeydown(e: KeyboardEvent, i: number) {
		const n = store.models.length;
		const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: n - 1 }[e.key];
		if (next === undefined) return;
		e.preventDefault();
		select(store.models[(next + n) % n]!.id, true);
	}
</script>

<div class="tabs" role="tablist" aria-label="Decision models" bind:this={list}>
	{#each store.models as m, i (m.id)}
		{@const selected = m.id === store.active}
		<button
			type="button"
			role="tab"
			id="tab-{m.id}"
			aria-selected={selected}
			aria-controls={selected ? `panel-${m.id}` : undefined}
			tabindex={selected ? 0 : -1}
			onclick={() => select(m.id)}
			onkeydown={(e) => onkeydown(e, i)}
		>
			{m.name}
			{#if store.estimates[m.id]}
				<span class="dot" aria-hidden="true"></span><span class="sr-only">(filled)</span>
			{/if}
		</button>
	{/each}
</div>

<style>
	.tabs {
		display: flex;
		gap: 0.25rem;
		overflow-x: auto;
		scrollbar-width: thin;
		border-bottom: 1px solid var(--border);
		margin-inline: -1rem;
		padding-inline: 1rem;
	}

	[role='tab'] {
		position: relative; /* contain the sr-only label inside the scroller */
		flex: none;
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		border: 0;
		border-bottom: 3px solid transparent;
		border-radius: 8px 8px 0 0;
		background: transparent;
		color: var(--muted);
		font-weight: 600;
		white-space: nowrap;
		padding: 0.6rem 0.75rem;
		min-height: 2.75rem;
	}

	[role='tab']:hover {
		color: var(--text);
	}

	[role='tab'][aria-selected='true'] {
		color: var(--accent);
		border-bottom-color: var(--accent);
	}

	[role='tab']:focus-visible {
		outline-offset: -3px;
	}

	.dot {
		width: 0.45rem;
		height: 0.45rem;
		border-radius: 50%;
		background: var(--good);
	}
</style>
