<script lang="ts">
	import type { AnyModel } from '$lib/core/model';
	import { NOTES } from '$lib/icons';
	import { store } from '$lib/state.svelte';
	import Fields from './fields/Fields.svelte';
	import Icon from './Icon.svelte';
	import ModelMap from './ModelMap.svelte';

	let { model }: { model: AnyModel } = $props();

	const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
	const estimate = $derived(store.estimates[model.id]);
	const touch = () => store.touch(model.id);

	function reset() {
		if (confirm(`Clear everything entered in ${model.name}?`)) store.resetModel(model.id);
	}
</script>

<div
	id="panel-{model.id}"
	class="panel"
	role="tabpanel"
	aria-labelledby="panel-title-{model.id}"
	tabindex="-1"
>
	<header class="intro">
		<h2 id="panel-title-{model.id}" class="ss-heading">{model.name}</h2>
		<p class="ss-measure">{model.description}</p>
	</header>

	{#if estimate}
		{@const note = NOTES[estimate.confidence]}
		<div class="ss-note {note.type} estimate">
			<p><span class="confidence">{cap(estimate.confidence)} confidence.</span> {estimate.summary}</p>
			<span class="ss-note-icon" aria-hidden="true"><Icon name={note.icon} /></span>
		</div>
	{:else}
		<p class="estimate empty">No estimate yet. Fill in the inputs below.</p>
	{/if}

	{#if store.view === 'map'}
		<ModelMap {model} />
	{:else}
		<form oninput={touch} onchange={touch} onsubmit={(e) => e.preventDefault()}>
			<Fields fields={model.inputsSchema} bind:value={store.inputs[model.id]!} decision={store.decision} idPrefix={model.id} />
		</form>
	{/if}

	<div class="actions">
		<button type="button" class="ss-btn ghost small" onclick={reset}>
			<Icon name="refresh" /> Reset {model.short}
		</button>
	</div>
</div>

<style>
	.panel {
		view-transition-name: panel;
		display: grid;
		gap: var(--ss-space-6);
		padding-block: var(--ss-space-6) var(--ss-section-s);
		scroll-margin-top: var(--ss-space-4);
	}

	.panel:focus {
		outline: none;
	}

	.intro {
		display: grid;
		gap: var(--ss-space-2);
	}

	h2 {
		margin: 0;
		font-size: var(--ss-display-3);
		text-wrap: balance;
	}

	.intro p {
		margin: 0;
		color: var(--ss-tx-2);
	}

	.estimate {
		margin: 0;
	}

	.estimate p {
		margin: 0;
	}

	.confidence {
		color: var(--ss-tx);
		font-weight: 600;
	}

	.empty {
		padding: 0.8em 1.2em 0.8em 0.8em;
		border-left: 0.2em solid var(--ss-ui);
		color: var(--ss-tx-2);
	}

	.actions {
		display: flex;
		justify-content: flex-end;
	}
</style>
