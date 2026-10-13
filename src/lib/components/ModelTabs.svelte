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

<div class="tabs">
	<div class="ss-segment" role="tablist" aria-label="Decision models" bind:this={list}>
		{#each store.models as m, i (m.id)}
			{@const selected = m.id === store.active}
			<button
				type="button"
				role="tab"
				id="tab-{m.id}"
				title={m.name}
				aria-selected={selected}
				aria-controls={selected ? `panel-${m.id}` : undefined}
				tabindex={selected ? 0 : -1}
				onclick={() => select(m.id)}
				onkeydown={(e) => onkeydown(e, i)}
			>
				{m.short}
				{#if store.estimates[m.id]}
					<span class="filled" aria-hidden="true"></span><span class="sr-only">(filled)</span>
				{/if}
			</button>
		{/each}
	</div>
</div>

<style>
	.tabs {
		margin-inline: calc(var(--ss-space-1) * -1);
		padding: var(--ss-space-1);
		overflow-x: auto;
		scrollbar-width: none;
	}

	.tabs::-webkit-scrollbar {
		display: none;
	}

	.ss-segment button {
		position: relative;
		display: inline-flex;
		flex: none;
		align-items: center;
		justify-content: center;
		gap: 6px;
		white-space: nowrap;
	}

	.ss-segment button {
		transition:
			color var(--ss-dur-hover) var(--ss-ease-hover),
			background var(--ss-dur-hover) var(--ss-ease-hover);
	}

	@media (hover: hover) {
		.ss-segment button:hover {
			color: var(--ss-tx);
		}
	}

	.ss-segment button[aria-selected='true'] {
		background: var(--ss-ui-3);
		color: var(--ss-tx);
	}

	@media (pointer: coarse) {
		.ss-segment button {
			min-height: var(--ss-tap-target);
		}
	}

	.filled {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: var(--ss-tip);
	}
</style>
