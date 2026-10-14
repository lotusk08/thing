<!--
	The decision map (core/map.ts): the problem, the items the
	models share across options with lines to the options they link to, and each
	option with what speaks for and against it. Every item opens in the sheet.
	Where the options stack (a phone) the lines go and the links read as text.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import type { MapEdit, MapItem } from '$lib/core/map';
	import { optionLabel } from '$lib/core/util';
	import { store } from '$lib/state.svelte';
	import Icon from './Icon.svelte';
	import MapSheet from './MapSheet.svelte';

	const map = $derived(store.map);
	const title = $derived(store.decision.title.trim());
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

	const average = (option: string) => store.board.rows.find((row) => row.option.id === option);
	const names = (ids: string[]) => ids.map((id) => optionLabel(store.decision, id)).join(', ');

	const heat = (key: string) => ({
		onpointerenter: () => (hot = key),
		onpointerleave: () => (hot = null),
		onfocusin: () => (hot = key),
		onfocusout: () => (hot = null)
	});
</script>

{#snippet node(item: MapItem, shared: boolean)}
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
		<span class="kind"><i class="pip {item.tone ?? ''}"></i>{item.kind}</span>
		<span class="text" class:none={!item.text}>{item.text || `Untitled ${item.kind.toLowerCase()}`}</span>
		{#if item.value}
			<span class="meta ss-figure">{item.value.n}/{item.value.max}</span>
		{:else if shared && item.linkLabel}
			<span class="meta">{item.links.length ? `${item.linkLabel} ${names(item.links)}` : 'No option yet'}</span>
		{/if}
	</button>
{/snippet}

<div id="panel-map" class="map" role="tabpanel" aria-labelledby="tab-map" tabindex="-1" bind:this={root}>
	<header class="root">
		<!-- The decision's own title is right above, in the header. -->
		<h2 class="sr-only">Map of {title || 'the decision'}</h2>
		{#each map.notes as note (`${note.model}/${note.field.key}`)}
			<button type="button" class="note" onclick={() => (sheet = { kind: 'note', note })}>
				<span class="ss-label">{note.field.label}</span>
				<span class:none={!note.text}>{note.text || 'Not written yet'}</span>
			</button>
		{/each}
		{#if empty}
			<p class="ss-hint">Pros, cons, risks, causes and criteria from the models show here, linked to their options. Add them here or in the models.</p>
		{/if}
	</header>

	{#if map.shared.length || map.adds.shared.length}
		<div class="shared" role="group" aria-label="Across options">
			{#each map.shared as item (item.key)}
				{@render node(item, true)}
			{/each}
			<button type="button" class="ss-btn ghost small add" onclick={() => (sheet = { kind: 'add' })}><Icon name="plus" /> Add</button>
		</div>
	{/if}

	<div class="options">
		{#each store.decision.options as option (option.id)}
			{@const row = average(option.id)}
			<section class="option" class:hot={linked(option.id)} data-option={option.id} aria-labelledby="map-option-{option.id}" {...heat(option.id)}>
				<h3 class="head" id="map-option-{option.id}">
					<span class="name">{optionLabel(store.decision, option.id)}</span>
					<span class="score ss-figure" class:leader={row?.isLeader}>
						{row?.average == null ? '–' : Math.round(row.average)}<span class="sr-only"> average</span>
					</span>
				</h3>
				{#if map.options[option.id]?.length}
					<ul>
						{#each map.options[option.id] ?? [] as item (item.key)}
							<li>{@render node(item, false)}</li>
						{/each}
					</ul>
				{/if}
				<button type="button" class="ss-btn ghost small add" onclick={() => (sheet = { kind: 'add', option: option.id })}><Icon name="plus" /> Add</button>
			</section>
		{/each}
	</div>

	<svg class="links" class:lit={hot !== null} aria-hidden="true" bind:this={layer}>
		{#each lines as line (`${line.item}>${line.option}`)}
			<path d={line.d} class:hot={hot === line.item || hot === line.option} />
		{/each}
	</svg>
</div>

<MapSheet bind:edit={sheet} />

<style>
	.map {
		view-transition-name: map;
		outline: none;
		position: relative;
		display: grid;
		gap: var(--ss-space-8);
		padding-block: var(--ss-space-6) var(--ss-section-s);
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
