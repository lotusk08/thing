<script lang="ts">
	import '../app.css';
	import { onMount, tick } from 'svelte';
	import DecisionHeader from '$lib/components/DecisionHeader.svelte';
	import ModelPanel from '$lib/components/ModelPanel.svelte';
	import ModelTabs from '$lib/components/ModelTabs.svelte';
	import Scoreboard from '$lib/components/Scoreboard.svelte';
	import { store } from '$lib/state.svelte';

	onMount(() => store.persist());

	const title = $derived(store.decision.title.trim());

	async function jump(modelId: string) {
		store.active = modelId;
		await tick();
		const panel = document.getElementById(`panel-${modelId}`);
		const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
		document.getElementById(`tab-${modelId}`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
		panel?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
		panel?.focus({ preventScroll: true });
	}
</script>

<svelte:head>
	<title>{title ? `${title} · Decision Tools` : 'Decision Tools'}</title>
</svelte:head>

<div class="page">
	<DecisionHeader />
	<main>
		<ModelTabs />
		{#key store.active}
			<ModelPanel model={store.activeModel} />
		{/key}
	</main>
</div>
<Scoreboard onjump={jump} />

<style>
	.page {
		max-width: var(--max);
		margin-inline: auto;
		padding: 1rem 1rem 0;
		display: grid;
		gap: 1.25rem;
		min-height: calc(100dvh - 8rem);
	}

	main {
		min-width: 0;
	}
</style>
