<!-- An option: its letter on a disc of its colour, no outline, its name visible or for screen readers. -->
<script lang="ts">
	import { letter } from '$lib/core/diagram';
	import { optionLabel } from '$lib/core/util';
	import { store } from '$lib/state.svelte';

	let { option, named = false }: { option: string; named?: boolean } = $props();

	const i = $derived(store.decision.options.findIndex((o) => o.id === option));
</script>

<span class="mark opt-{i}" aria-hidden="true">{letter(i)}</span>{#if named}<span class="name">{optionLabel(store.decision, option)}</span>{:else}<span
		class="sr-only">{optionLabel(store.decision, option)}</span
	>{/if}

<style>
	.mark {
		display: inline-grid;
		flex: none;
		place-items: center;
		width: 1.25rem;
		height: 1.25rem;
		border-radius: 50%;
		background: var(--opt-tint);
		color: var(--opt-ink);
		font-size: var(--ss-text-2xs);
		font-weight: 700;
		line-height: 1;
	}

	.name {
		margin-left: 6px;
	}
</style>
