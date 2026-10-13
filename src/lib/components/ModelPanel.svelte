<script lang="ts">
	import type { AnyModel } from '$lib/core/model';
	import { store } from '$lib/state.svelte';
	import Fields from './fields/Fields.svelte';

	let { model }: { model: AnyModel } = $props();

	const estimate = $derived(store.estimates[model.id]);
	const touch = () => store.touch(model.id);

	function reset() {
		if (confirm(`Clear everything entered in ${model.name}?`)) store.resetModel(model.id);
	}
</script>

<div id="panel-{model.id}" class="panel" role="tabpanel" aria-labelledby="tab-{model.id}" tabindex="-1">
	<div class="intro">
		<h2>{model.name}</h2>
		<p>{model.description}</p>
	</div>

	<p class="estimate" class:empty={!estimate}>
		{#if estimate}
			<span class="badge" data-level={estimate.confidence}>{estimate.confidence}</span>
			{estimate.summary}
		{:else}
			No estimate yet — fill in the inputs below.
		{/if}
	</p>

	<form oninput={touch} onchange={touch} onsubmit={(e) => e.preventDefault()}>
		<Fields fields={model.inputsSchema} bind:value={store.inputs[model.id]!} decision={store.decision} idPrefix={model.id} />
	</form>

	<div class="actions">
		<button type="button" class="ghost" onclick={reset}>Reset {model.short}</button>
	</div>
</div>

<style>
	.panel {
		display: grid;
		gap: 1rem;
		padding-block: 1rem 2rem;
		scroll-margin-top: 1rem;
	}

	.panel:focus {
		outline: none;
	}

	.intro {
		display: grid;
		gap: 0.25rem;
	}

	h2 {
		font-size: 1.25rem;
	}

	.intro p {
		color: var(--muted);
		max-width: 65ch;
	}

	.estimate {
		padding: 0.65rem 0.8rem;
		border-radius: var(--radius);
		background: var(--accent-soft);
		font-weight: 500;
	}

	.estimate.empty {
		background: var(--surface-2);
		color: var(--muted);
		font-weight: 400;
	}

	.badge {
		display: inline-block;
		margin-right: 0.35rem;
		padding: 0 0.5rem;
		border-radius: 999px;
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		border: 1px solid currentColor;
		vertical-align: 0.1em;
	}

	.badge[data-level='high'] {
		color: var(--good);
	}

	.badge[data-level='medium'] {
		color: var(--warn);
	}

	.badge[data-level='low'] {
		color: var(--bad);
	}

	.actions {
		display: flex;
		justify-content: flex-end;
	}
</style>
