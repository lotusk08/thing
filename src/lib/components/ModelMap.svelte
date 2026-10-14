<!--
	A model's map, shown in its panel while the map is on: the diagram its
	`diagram()` describes (core/diagram.ts), drawn by the component for that kind.
	Tap anything to edit it in the sheet; each diagram adds where it makes sense.
-->
<script lang="ts">
	import type { Add, Edit, Ref } from '$lib/core/diagram';
	import type { AnyModel } from '$lib/core/model';
	import { store } from '$lib/state.svelte';
	import Coins from './diagrams/Coins.svelte';
	import Fishbone from './diagrams/Fishbone.svelte';
	import Matrix from './diagrams/Matrix.svelte';
	import Radar from './diagrams/Radar.svelte';
	import Risk from './diagrams/Risk.svelte';
	import Weigh from './diagrams/Weigh.svelte';
	import MapSheet from './MapSheet.svelte';

	let { model }: { model: AnyModel } = $props();

	const diagram = $derived(store.diagram);
	/** What the sheet edits; setting it opens the sheet. */
	let sheet = $state<Edit | null>(null);

	const onedit = (ref: Ref) => (sheet = { model: model.id, ref });

	function onadd(add: Add) {
		const id = store.addItem(model.id, add);
		if (id) sheet = { model: model.id, ref: { path: add.path, id, fields: add.list.fields, title: add.title, removable: true, words: add.words }, fresh: true };
	}
</script>

<section class="map" aria-label="{model.short} map">
	{#if diagram?.kind === 'radar'}
		<Radar {diagram} {onedit} />
	{:else if diagram?.kind === 'matrix'}
		<Matrix {diagram} {onedit} {onadd} />
	{:else if diagram?.kind === 'weigh'}
		<Weigh {diagram} {onedit} {onadd} />
	{:else if diagram?.kind === 'risk'}
		<Risk {diagram} {onedit} {onadd} />
	{:else if diagram?.kind === 'fishbone'}
		<Fishbone {diagram} {onedit} {onadd} />
	{:else if diagram?.kind === 'coins'}
		<Coins {diagram} {onedit} {onadd} />
	{:else}
		<p class="ss-hint">{model.short} has no map yet.</p>
	{/if}
</section>

<MapSheet edit={sheet} />

<style>
	.map {
		min-width: 0;
	}
</style>
