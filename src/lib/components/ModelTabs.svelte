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

	// Each end of the strip fades while tabs are scrolled out of sight past it.
	let before = $state(false);
	let after = $state(false);

	function edges() {
		before = list.scrollLeft > 1;
		after = list.scrollLeft + list.clientWidth < list.scrollWidth - 1;
	}

	function measure() {
		edges();
		const tab = list.querySelector<HTMLElement>('[aria-selected="true"]');
		if (!tab) return;
		x = tab.offsetLeft;
		w = tab.offsetWidth;
		measured = true;
		return tab;
	}

	/** Bring a tab to the middle of the strip, sideways only: the page never scrolls for it. */
	function centre(tab: HTMLElement, behavior: ScrollBehavior = 'auto') {
		list.scrollTo({ left: tab.offsetLeft + tab.offsetWidth / 2 - list.clientWidth / 2, behavior });
	}

	// Again whenever the selection moves or a tab's width changes (its "filled" dot);
	// a new selection, from a tab or the scoreboard, glides to the middle of the strip.
	let shown = store.active;
	$effect(() => {
		const now = store.active;
		void store.models.map((m) => store.estimates[m.id] !== null);
		const tab = measure();
		if (!tab || now === shown) return;
		shown = now;
		centre(tab);
	});

	onMount(() => {
		const ro = new ResizeObserver(measure);
		ro.observe(list);
		// A model kept from last time starts in the middle, without the glide.
		const tab = measure();
		if (tab) centre(tab, 'instant');
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

<div class="tabs">
	<!-- One pill: the map switch first, then the model tabs. -->
	<div class="ss-segment">
		<!-- The icon says what is on screen: the form (a list) or the map. -->
		<button
			type="button"
			role="switch"
			class="view"
			aria-label="Map"
			aria-checked={map}
			title={map ? 'Map · show the form' : 'Form · show the map'}
			onclick={() => switchView(map ? 'form' : 'map')}
		>
			<span class="ss-swap" aria-hidden="true">
				<span data-state="form" class:on={!map}><Icon name="bullet-list" /></span>
				<span data-state="map" class:on={map}><Icon name="mindmap" /></span>
			</span>
		</button>
		<div class="edges" class:before class:after>
			<div
				class="strip"
				class:measured
				class:ready
				role="tablist"
				aria-label="Decision models"
				style:--x="{x}px"
				style:--w="{w}px"
				onscroll={edges}
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
</div>

<style>
	.tabs {
		padding-block: var(--ss-space-1);
	}

	/*
	 * The switch and the tabs stay live through a switch: one group, drawn once. The
	 * pill is never wider than the screen: on a phone the tabs scroll inside it.
	 */
	.ss-segment {
		view-transition-name: tabs;
		align-items: center;
		max-width: 100%;
	}

	/*
	 * The map switch: SS's swap of two icons, before the tabs. No rule between them:
	 * where tabs scroll away under it, the strip's fade sets it apart.
	 */
	.view {
		display: grid;
		flex: none;
		place-items: center;
		min-width: 0;
		padding: 0 2px;
	}

	.view[aria-checked='true'] .ss-swap {
		color: var(--ss-accent);
	}

	/*
	 * Where tabs run on out of sight, the strip's end fades into the pill: a gradient
	 * of the pill's own ground over them, eased so it has no hard edge, and rounded
	 * at the pill's end so it never covers its border.
	 */
	.edges {
		position: relative;
		display: flex;
		min-width: 0;
	}

	.edges::before,
	.edges::after {
		position: absolute;
		z-index: 1;
		top: 0;
		bottom: 0;
		width: var(--ss-space-12);
		background: linear-gradient(
			var(--to),
			var(--ss-bg-2) 10%,
			color-mix(in oklab, var(--ss-bg-2) 70%, transparent) 35%,
			color-mix(in oklab, var(--ss-bg-2) 30%, transparent) 65%,
			transparent
		);
		content: '';
		opacity: 0;
		pointer-events: none;
		transition: opacity var(--ss-dur-small) var(--ss-ease-out);
	}

	.edges::before {
		--to: to right;

		left: 0;
	}

	.edges::after {
		--to: to left;

		right: 0;
		border-radius: 0 var(--ss-radius-full) var(--ss-radius-full) 0;
	}

	.edges.before::before,
	.edges.after::after {
		opacity: 1;
	}

	/*
	 * The tabs, which scroll sideways when the pill runs out of room. The padding is
	 * room for a tab's focus ring, which the scroll would otherwise clip; the margin
	 * gives the height back.
	 */
	.strip {
		position: relative;
		isolation: isolate;
		display: inline-flex;
		min-width: 0;
		margin-block: calc(var(--ss-space-1) * -1);
		padding: var(--ss-space-1);
		overflow-x: auto;
		scrollbar-width: none;
	}

	.strip::-webkit-scrollbar {
		display: none;
	}

	@media (prefers-reduced-motion: no-preference) {
		.strip {
			scroll-behavior: smooth;
		}
	}

	.strip::before {
		position: absolute;
		z-index: -1;
		top: var(--ss-space-1);
		bottom: var(--ss-space-1);
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
