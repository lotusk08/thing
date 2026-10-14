<script lang="ts">
	import { onMount } from 'svelte';
	import { store } from '$lib/state.svelte';
	import { switchModel, switchView } from '$lib/switch';
	import Icon from './Icon.svelte';

	let list: HTMLElement;
	const map = $derived(store.view === 'map');

	// The pill under the selected tab is one element that slides and resizes from
	// tab to tab (the list's ::before), placed from the selected tab's box.
	let x = $state(0);
	let w = $state(0);
	let measured = $state(false);
	let ready = $state(false);

	function measure() {
		const tab = list.querySelector<HTMLElement>('[aria-selected="true"]');
		if (!tab) return;
		x = tab.offsetLeft;
		w = tab.offsetWidth;
		measured = true;
		return tab;
	}

	/** Bring a tab wholly into the strip, sideways only: the page never scrolls for it. */
	function reveal(tab: HTMLElement) {
		const strip = list.parentElement!;
		const t = tab.getBoundingClientRect();
		const s = strip.getBoundingClientRect();
		strip.scrollLeft += Math.min(0, t.left - s.left) || Math.max(0, t.right - s.right);
	}

	// Again whenever the selection moves or a tab's width changes (its "filled" dot);
	// a new selection, from a tab or the scoreboard, is also brought into view.
	let shown = store.active;
	$effect(() => {
		const now = store.active;
		void store.models.map((m) => store.estimates[m.id] !== null);
		const tab = measure();
		if (!tab || now === shown) return;
		shown = now;
		reveal(tab);
	});

	onMount(() => {
		const ro = new ResizeObserver(measure);
		ro.observe(list);
		// Only after the first placement, so the pill doesn't slide in from the left on load.
		requestAnimationFrame(() => requestAnimationFrame(() => (ready = true)));
		return () => ro.disconnect();
	});

	function select(id: string, focus = false) {
		void switchModel(id);
		if (focus) list.querySelector<HTMLElement>(`#tab-${id}`)?.focus();
	}

	function onkeydown(e: KeyboardEvent, i: number) {
		const n = store.models.length;
		const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: n - 1 }[e.key];
		if (next === undefined) return;
		e.preventDefault();
		select(store.models[(next + n) % n]!.id, true);
	}
</script>

<div class="bar">
	<!-- Each model's map instead of its form, on for every tab until turned off. -->
	<div class="ss-segment map-toggle">
		<button
			type="button"
			title={map ? 'Show the form' : 'Show the map'}
			aria-label="Map"
			aria-pressed={map}
			aria-controls="panel-{store.active}"
			onclick={() => switchView(map ? 'form' : 'map')}
		>
			<Icon name="mindmap" />
		</button>
	</div>

	<div class="tabs">
		<div
			class="ss-segment strip"
			class:measured
			class:ready
			role="tablist"
			aria-label="Decision models"
			style:--x="{x}px"
			style:--w="{w}px"
			bind:this={list}
		>
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
</div>

<style>
	/* The toggle and the tabs stay live through a switch: one group, drawn once. */
	.bar {
		view-transition-name: tabs;
		display: flex;
		align-items: center;
		gap: var(--ss-space-1);
	}

	/* The map's toggle: SS's pressed segment, its icon alone at the size of the tabs' text. */
	.map-toggle {
		flex: none;
	}

	.map-toggle button {
		min-width: 0;
		padding-inline: 10px;
		font-size: var(--ss-text-sm);
	}

	.tabs {
		flex: 1;
		min-width: 0;
		margin-inline-end: calc(var(--ss-space-1) * -1);
		padding: var(--ss-space-1);
		overflow-x: auto;
		scroll-behavior: smooth;
		scrollbar-width: none;
	}

	.tabs::-webkit-scrollbar {
		display: none;
	}

	.strip {
		position: relative;
		isolation: isolate;
	}

	.strip::before {
		position: absolute;
		z-index: -1;
		top: 2px;
		bottom: 2px;
		left: 0;
		width: var(--w);
		border-radius: var(--ss-radius-full);
		background: var(--ss-ui-3);
		content: '';
		opacity: 0;
		translate: var(--x) 0;
	}

	.strip.measured::before {
		opacity: 1;
	}

	@media (prefers-reduced-motion: no-preference) {
		.strip.ready::before {
			transition:
				translate var(--ss-dur-small) var(--ss-ease-out),
				width var(--ss-dur-small) var(--ss-ease-out);
		}
	}

	.strip button {
		position: relative;
		flex: none;
		white-space: nowrap;
	}

	.strip button[aria-selected='true'] {
		background: var(--ss-ui-3);
		color: var(--ss-tx);
	}

	/* Once the sliding pill is placed it is the highlight; the button's own fill is the no-script look. */
	.strip.measured button[aria-selected='true'] {
		background: none;
	}

	.filled {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: var(--ss-tip);
	}
</style>
