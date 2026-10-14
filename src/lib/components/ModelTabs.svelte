<script lang="ts">
	import { onMount } from 'svelte';
	import { store } from '$lib/state.svelte';
	import { switchModel, switchView } from '$lib/switch';
	import Icon from './Icon.svelte';

	// The first tab is the decision map; the rest are the models.
	const MAP = 'map';
	const current = $derived(store.view === 'map' ? MAP : store.active);
	const ids = $derived([MAP, ...store.models.map((m) => m.id)]);

	let list: HTMLElement;

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
	let shown = store.view === 'map' ? MAP : store.active;
	$effect(() => {
		const now = current;
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
		void (id === MAP ? switchView('map') : switchModel(id));
		if (focus) list.querySelector<HTMLElement>(`#tab-${id}`)?.focus();
	}

	function onkeydown(e: KeyboardEvent, i: number) {
		const n = ids.length;
		const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: n - 1 }[e.key];
		if (next === undefined) return;
		e.preventDefault();
		select(ids[(next + n) % n]!, true);
	}
</script>

<div class="tabs">
	<div
		class="ss-segment"
		class:measured
		class:ready
		role="tablist"
		aria-label="Map and models"
		style:--x="{x}px"
		style:--w="{w}px"
		bind:this={list}
	>
		<button
			type="button"
			role="tab"
			id="tab-{MAP}"
			class="map"
			title="Map"
			aria-label="Map"
			aria-selected={current === MAP}
			aria-controls={current === MAP ? `panel-${MAP}` : undefined}
			tabindex={current === MAP ? 0 : -1}
			onclick={() => select(MAP)}
			onkeydown={(e) => onkeydown(e, 0)}
		>
			<Icon name="mindmap" />
		</button>
		{#each store.models as m, i (m.id)}
			{@const selected = m.id === current}
			<button
				type="button"
				role="tab"
				id="tab-{m.id}"
				title={m.name}
				aria-selected={selected}
				aria-controls={selected ? `panel-${m.id}` : undefined}
				tabindex={selected ? 0 : -1}
				onclick={() => select(m.id)}
				onkeydown={(e) => onkeydown(e, i + 1)}
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
		scroll-behavior: smooth;
		scrollbar-width: none;
	}

	.tabs::-webkit-scrollbar {
		display: none;
	}

	.ss-segment {
		position: relative;
		isolation: isolate;
		view-transition-name: tabs;
	}

	.ss-segment::before {
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

	.ss-segment.measured::before {
		opacity: 1;
	}

	@media (prefers-reduced-motion: no-preference) {
		.ss-segment.ready::before {
			transition:
				translate var(--ss-dur-small) var(--ss-ease-out),
				width var(--ss-dur-small) var(--ss-ease-out);
		}
	}

	.ss-segment button {
		position: relative;
		flex: none;
		white-space: nowrap;
	}

	/* The map's tab is its icon alone, at the size of the tabs' text. */
	.ss-segment .map {
		min-width: 0;
		padding-inline: 10px;
		font-size: var(--ss-text-sm);
	}

	.ss-segment button[aria-selected='true'] {
		background: var(--ss-ui-3);
		color: var(--ss-tx);
	}

	/* Once the sliding pill is placed it is the highlight; the button's own fill is the no-script look. */
	.ss-segment.measured button[aria-selected='true'] {
		background: none;
	}

	.filled {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: var(--ss-tip);
	}
</style>
