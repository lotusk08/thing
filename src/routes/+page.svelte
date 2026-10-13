<script lang="ts">
	import 'ss/css';
	import 'ss/fonts.css';
	import 'ss/base.css';
	import 'ss/icons.css';
	import 'ss/ui.css';
	import 'ss/motion.css';
	import '../app.css';
	import { modeIcon } from 'ss/icons';
	import { initMode, toggleMode } from 'ss/mode';
	import { onMount, tick } from 'svelte';
	import DecisionHeader from '$lib/components/DecisionHeader.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import ModelPanel from '$lib/components/ModelPanel.svelte';
	import ModelTabs from '$lib/components/ModelTabs.svelte';
	import Scoreboard from '$lib/components/Scoreboard.svelte';
	import { store } from '$lib/state.svelte';

	onMount(() => {
		initMode();
		return store.persist();
	});

	const title = $derived(store.decision.title.trim());

	function startOver() {
		if (confirm('Start a new decision? This clears the title, options and every model.')) store.startOver();
	}

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
	<title>{title ? `${title} · Things` : 'Things'}</title>
</svelte:head>

<div class="page">
	<header class="ss-topbar wrap">
		<h1 class="mark">Things</h1>
		<div class="ss-topbar-end">
			<button type="button" class="ss-btn ghost small" onclick={startOver}>
				<Icon name="plus" /> New decision
			</button>
			<span class="ss-dot"></span>
			<button class="ss-mode" type="button" aria-label="Switch light and dark" onclick={toggleMode}>
				{@html modeIcon('mode-clip')}
			</button>
		</div>
	</header>

	<main class="wrap">
		<DecisionHeader />
		<ModelTabs />
		{#key store.active}
			<ModelPanel model={store.activeModel} />
		{/key}
	</main>
</div>
<Scoreboard onjump={jump} />

<style>
	.page {
		min-height: calc(100dvh - 4rem);
	}

	.mark {
		margin: 0;
		color: var(--ss-tx);
		font-family: var(--ss-font-title);
		font-size: 1.35rem;
		font-style: italic;
		font-weight: 400;
		line-height: 1;
		white-space: nowrap;
	}

	.ss-topbar-end {
		gap: var(--ss-space-1);
	}

	main {
		min-width: 0;
	}
</style>
