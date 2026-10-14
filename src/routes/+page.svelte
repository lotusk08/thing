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
	import { onMount } from 'svelte';
	import DecisionHeader from '$lib/components/DecisionHeader.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import ModelPanel from '$lib/components/ModelPanel.svelte';
	import ModelTabs from '$lib/components/ModelTabs.svelte';
	import Scoreboard from '$lib/components/Scoreboard.svelte';
	import Wordmark from '$lib/components/Wordmark.svelte';
	import { store } from '$lib/state.svelte';
	import { replace, switchModel } from '$lib/switch';

	onMount(() => {
		initMode();
		return store.persist();
	});

	const title = $derived(store.decision.title.trim());

	// One button, by what's on screen: nothing yet offers the demo; anything else, a new decision.
	function fresh() {
		if (store.blank) return void replace(() => store.loadDemo());
		if (confirm('Start a new decision? This clears the title, options and every model.')) void replace(() => store.startOver());
	}

	async function jump(modelId: string) {
		await switchModel(modelId);
		const panel = document.getElementById(`panel-${modelId}`);
		const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
		panel?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
		panel?.focus({ preventScroll: true });
	}
</script>

<svelte:head>
	<title>{title ? `${title} · Things` : 'Things · Decide with six frameworks'}</title>
</svelte:head>

<div class="page">
	<header class="ss-topbar wrap">
		<h1 class="mark"><Wordmark /><span class="sr-only">Things</span></h1>
		<div class="ss-topbar-end">
			<button type="button" class="ss-btn ghost small" onclick={fresh}>
				<Icon name={store.blank ? 'lightbulb' : 'plus'} />
				<span class:shimmer={store.blank}>{store.blank ? 'Load demo' : 'New decision'}</span>
			</button>
			<span class="ss-dot"></span>
			<button class="ss-mode" type="button" aria-label="Switch light and dark" onclick={toggleMode}>
				<!-- eslint-disable-next-line svelte/no-at-html-tags -- SS's own SVG, never user input -->
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
		line-height: 1;
	}

	.ss-topbar-end {
		gap: var(--ss-space-1);
	}

	main {
		min-width: 0;
	}

	/*
	 * "Load demo" invites a first try: a soft accent sheen drifts through the label
	 * and rests. The ink stays currentcolor, so the button's own hover still shows.
	 * Still under reduced motion, and plain text in forced colours.
	 */
	@media (prefers-reduced-motion: no-preference) and (forced-colors: none) {
		.shimmer {
			background: linear-gradient(100deg, currentcolor 35%, var(--ss-accent) 50%, currentcolor 65%) 100% 0 / 300% 100%;
			-webkit-background-clip: text;
			background-clip: text;
			-webkit-text-fill-color: transparent;
			animation: shimmer 3.6s var(--ss-ease-hover) infinite;
		}
	}

	@keyframes shimmer {
		55%,
		100% {
			background-position: 0 0;
		}
	}
</style>
