<!--
	A model's map (core/map.ts), shown in its panel while the map is on: what sits
	at the top (Fishbone's problem, Coin's regret), what the model shares across
	options with lines to the options it links to, and under each option, with the
	model's score for it, what the model holds about it. Every item opens in the
	sheet. Where the options stack (a phone) the lines go and the links read as text.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { modelMap, type MapEdit, type MapItem } from '$lib/core/map';
	import type { AnyModel } from '$lib/core/model';
	import { optionLabel } from '$lib/core/util';
	import { store } from '$lib/state.svelte';
	import Icon from './Icon.svelte';
	import MapSheet from './MapSheet.svelte';

	let { model }: { model: AnyModel } = $props();

	const map = $derived(modelMap(store.decision, model, store.inputs[model.id]));
	const estimate = $derived(store.estimates[model.id]);
	const empty = $derived(!map.shared.length && Object.values(map.options).every((items) => !items.length));

	let root: HTMLElement;
	let layer: SVGSVGElement;
	/** What the sheet edits; setting it opens the sheet. */
	let sheet = $state<MapEdit | null>(null);

	/** What the pointer or focus is on: an item's key or an option's id. */
	let hot = $state<string | null>(null);
	const lit = (item: MapItem) => hot !== null && (hot === item.key || item.links.includes(hot));
	const linked = (option: string) => hot === option || map.shared.some((item) => item.key === hot && item.links.includes(option));

	/** Lines from each shared item to the options it links to, while the options sit side by side. */
	let lines = $state<{ d: string; item: string; option: string }[]>([]);

	function draw() {
		if (!layer.getClientRects().length) return void (lines = []);
		const box = root.getBoundingClientRect();
		const at = (selector: string) => root.querySelector(selector)?.getBoundingClientRect();
		lines = map.shared.flatMap((item) => {
			const from = at(`[data-node="${item.key}"]`);
			return item.links.flatMap((option) => {
				const to = at(`[data-option="${option}"] .head`);
				if (!from || !to) return [];
				const [x1, y1] = [from.left + from.width / 2 - box.left, from.bottom - box.top];
				const [x2, y2] = [to.left + to.width / 2 - box.left, to.top - box.top];
				const y = (y1 + y2) / 2;
				return [{ d: `M${x1} ${y1}C${x1} ${y} ${x2} ${y} ${x2} ${y2}`, item: item.key, option }];
			});
		});
	}

	$effect(() => {
		void map;
		draw();
	});

	onMount(() => {
		const ro = new ResizeObserver(draw);
		ro.observe(root);
		return () => ro.disconnect();
	});

	const names = (ids: string[]) => ids.map((id) => optionLabel(store.decision, id)).join(', ');
	const value = ({ n, max, signed }: NonNullable<MapItem['value']>) => (signed ? (n > 0 ? `+${n}` : `${n}`) : `${n}/${max}`);

	const heat = (key: string) => ({
		onpointerenter: () => (hot = key),
		onpointerleave: () => (hot = null),
		onfocusin: () => (hot = key),
		onfocusout: () => (hot = null)
	});
</script>

{#snippet node(item: MapItem, shared: boolean)}
	{@const pip = `pip ${item.tone ?? ''}`}
	<button
		type="button"
		class="node"
		class:shared
		class:loose={shared && item.linkLabel && !item.links.length}
		class:hot={lit(item)}
		data-node={item.key}
		onclick={() => (sheet = { kind: 'item', item })}
		{...shared ? heat(item.key) : {}}
	>
		{#if item.kind}<span class="kind"><i class={pip}></i>{item.kind}</span>{/if}
		<span class="text" class:none={!item.text}>
			{#if !item.kind}<i class={pip}></i>{/if}{item.text || 'Not filled in yet'}
		</span>
		{#if item.value}
			<span class="meta ss-figure">{value(item.value)}</span>
		{:else if shared && item.linkLabel}
			<span class="meta">{item.links.length ? `${item.linkLabel} ${names(item.links)}` : 'No option yet'}</span>
		{/if}
	</button>
{/snippet}

<section class="map" aria-labelledby="map-{model.id}" bind:this={root}>
	<h3 id="map-{model.id}" class="sr-only">{model.short} map</h3>
	{#if map.top.length || empty}
		<header class="root">
			{#each map.top as item (item.key)}
				<button type="button" class="note" onclick={() => (sheet = { kind: 'item', item })}>
					<span class="ss-label">{item.kind}</span>
					<span class:none={!item.text}>{item.text || 'Not filled in yet'}</span>
				</button>
			{/each}
			{#if empty}
				<p class="ss-hint">Nothing on this map yet. Add here, or fill in the form.</p>
			{/if}
		</header>
	{/if}

	{#if map.shared.length || map.adds.shared.length}
		<div class="shared" role="group" aria-label="Across options">
			{#each map.shared as item (item.key)}
				{@render node(item, true)}
			{/each}
			{#if map.adds.shared.length}
				<button type="button" class="ss-btn ghost small add" onclick={() => (sheet = { kind: 'add', adds: map.adds.shared })}>
					<Icon name="plus" /> Add
				</button>
			{/if}
		</div>
	{/if}

	<div class="options">
		{#each store.decision.options as option (option.id)}
			{@const score = estimate?.perOption[option.id]}
			{@const adds = map.adds.options[option.id] ?? []}
			<section class="option" class:hot={linked(option.id)} data-option={option.id} aria-labelledby="map-{model.id}-{option.id}" {...heat(option.id)}>
				<h4 class="head" id="map-{model.id}-{option.id}">
					<span class="name">{optionLabel(store.decision, option.id)}</span>
					<span class="score ss-figure" class:leader={estimate?.lean === option.id}>
						{score === undefined ? '–' : Math.round(score)}<span class="sr-only"> of 100</span>
					</span>
				</h4>
				{#if map.options[option.id]?.length}
					<ul>
						{#each map.options[option.id] ?? [] as item (item.key)}
							<li>{@render node(item, false)}</li>
						{/each}
					</ul>
				{/if}
				{#if adds.length}
					<button type="button" class="ss-btn ghost small add" onclick={() => (sheet = { kind: 'add', option: option.id, adds })}>
						<Icon name="plus" /> Add
					</button>
				{/if}
			</section>
		{/each}
	</div>

	<svg class="links" class:lit={hot !== null} aria-hidden="true" bind:this={layer}>
		{#each lines as line (`${line.item}>${line.option}`)}
			<path d={line.d} class:hot={hot === line.item || hot === line.option} />
		{/each}
	</svg>
</section>

<MapSheet bind:edit={sheet} />

<style>
	.map {
		position: relative;
		display: grid;
		gap: var(--ss-space-8);
		container: map / inline-size;
	}

	.root {
		display: grid;
		justify-items: center;
		gap: var(--ss-space-3);
		text-align: center;
	}

	.none {
		color: var(--ss-tx-2);
	}

	.note {
		display: grid;
		gap: 2px;
		max-width: 36rem;
		padding: var(--ss-space-2) var(--ss-space-3);
		border: 0;
		border-radius: var(--ss-radius-lg);
		background: none;
		color: var(--ss-tx);
		font: inherit;
		cursor: pointer;
		transition: background var(--ss-dur-hover) var(--ss-ease-hover);
	}

	.root .ss-hint {
		max-width: 32rem;
		margin: 0;
	}

	.shared {
		position: relative;
		z-index: 1;
		display: flex;
		flex-wrap: wrap;
		align-items: start;
		justify-content: center;
		gap: var(--ss-space-3);
	}

	.shared > .add {
		align-self: center;
	}

	.node {
		display: grid;
		gap: 2px;
		padding: var(--ss-space-2) var(--ss-space-1);
		border: 0;
		background: none;
		color: var(--ss-tx);
		font: inherit;
		font-size: var(--ss-text-sm);
		text-align: left;
		cursor: pointer;
		transition:
			background var(--ss-dur-hover) var(--ss-ease-hover),
			border-color var(--ss-dur-hover) var(--ss-ease-hover);
	}

	.node.shared {
		max-width: 16rem;
		padding: var(--ss-space-2) var(--ss-space-3);
		border: var(--ss-hairline) solid var(--ss-ui);
		border-radius: var(--ss-radius-lg);
		background: var(--ss-bg-2);
	}

	.node.loose {
		border-style: dashed;
	}

	.node.hot {
		border-color: var(--ss-accent);
	}

	@media (hover: hover) {
		.note:hover,
		.node:hover {
			background: var(--ss-ui-3);
		}
	}

	.kind {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		color: var(--ss-tx-2);
		font-size: var(--ss-text-xs);
		font-weight: 500;
	}

	.text {
		overflow-wrap: anywhere;
	}

	/* A value's pip sits in its text (it has no kind line to sit in). */
	.text .pip {
		display: inline-block;
		margin-right: 6px;
		vertical-align: 0.1em;
	}

	.meta {
		color: var(--ss-tx-2);
		font-size: var(--ss-text-xs);
	}

	.options {
		position: relative;
		z-index: 1;
		display: grid;
		gap: var(--ss-space-8);
	}

	.option {
		display: grid;
		align-content: start;
		gap: var(--ss-space-2);
	}

	.head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--ss-space-2);
		margin: 0;
		padding-bottom: var(--ss-space-2);
		border-bottom: var(--ss-hairline) solid var(--ss-ui-2);
		font-size: var(--ss-text-md);
		font-weight: 600;
		transition: border-color var(--ss-dur-hover) var(--ss-ease-hover);
	}

	.option.hot .head {
		border-bottom-color: var(--ss-accent);
	}

	.name {
		min-width: 0;
		overflow-wrap: anywhere;
	}

	.score {
		color: var(--ss-tx-2);
		font-weight: 500;
	}

	.score.leader {
		color: var(--ss-tx);
		font-weight: 700;
	}

	ul {
		display: grid;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	li + li {
		border-top: var(--ss-hairline) solid var(--ss-ui);
	}

	ul .node {
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: baseline;
		column-gap: var(--ss-space-2);
		width: 100%;
		border-radius: var(--ss-radius-md);
	}

	ul .kind {
		grid-column: 1 / -1;
	}

	.option > .add {
		justify-self: start;
	}

	.links {
		position: absolute;
		z-index: 0;
		inset: 0;
		display: none;
		width: 100%;
		height: 100%;
		overflow: visible;
		pointer-events: none;
		fill: none;
		stroke: var(--ss-ui-2);
		stroke-width: 1.25;
	}

	.links path {
		transition:
			stroke var(--ss-dur-hover) var(--ss-ease-hover),
			opacity var(--ss-dur-hover) var(--ss-ease-hover);
	}

	.links path.hot {
		stroke: var(--ss-accent);
	}

	.links.lit path:not(.hot) {
		opacity: 0.35;
	}

	/* Room for the options side by side: the lines join them to what they share. */
	@container map (width >= 44rem) {
		.options {
			grid-auto-columns: minmax(0, 1fr);
			grid-auto-flow: column;
			gap: var(--ss-space-5);
		}

		.shared {
			margin-bottom: var(--ss-space-6);
		}

		.links {
			display: block;
		}
	}
</style>
