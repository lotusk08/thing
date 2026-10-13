<script lang="ts">
	import { tick } from 'svelte';
	import { store } from '$lib/state.svelte';

	let chips: HTMLElement;

	async function addOption() {
		const id = store.addOption();
		await tick();
		if (id) chips.querySelector<HTMLInputElement>(`[data-option="${id}"]`)?.focus();
	}

	function startOver() {
		if (confirm('Start a new decision? This clears the title, options and every model.')) store.startOver();
	}
</script>

<header class="header">
	<div class="top">
		<h1>Decision Tools</h1>
		<button type="button" class="ghost" onclick={startOver}>New decision</button>
	</div>

	<label for="decision-title" class="sr-only">Decision</label>
	<input
		id="decision-title"
		class="title"
		type="text"
		placeholder="What are you deciding?"
		autocomplete="off"
		bind:value={store.decision.title}
	/>

	<div class="chips" role="group" aria-label="Options" bind:this={chips}>
		{#each store.decision.options as option, i (option.id)}
			<span class="chip">
				<input
					type="text"
					aria-label="Option {i + 1}"
					placeholder="Option {i + 1}"
					autocomplete="off"
					size={Math.max(8, option.label.length + 1)}
					data-option={option.id}
					bind:value={option.label}
				/>
				<button
					type="button"
					class="remove"
					aria-label="Remove option {option.label.trim() || i + 1}"
					disabled={!store.canRemoveOption}
					onclick={() => store.removeOption(option.id)}
				>
					<span aria-hidden="true">×</span>
				</button>
			</span>
		{/each}
		<button type="button" class="add" onclick={addOption} disabled={!store.canAddOption}>+ Option</button>
	</div>

	<details class="notes" open={!!store.decision.notes}>
		<summary>Notes</summary>
		<label for="decision-notes" class="sr-only">Notes</label>
		<textarea id="decision-notes" rows="3" placeholder="Context, constraints, deadline…" bind:value={store.decision.notes}></textarea>
	</details>
</header>

<style>
	.header {
		display: grid;
		gap: 0.75rem;
	}

	.top {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	h1 {
		font-size: 0.95rem;
		font-weight: 700;
		letter-spacing: 0.02em;
		text-transform: uppercase;
		color: var(--muted);
	}

	.title {
		font-size: 1.5rem;
		font-weight: 700;
		padding: 0.5rem 0.75rem;
		background: var(--surface);
	}

	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.chip {
		display: inline-flex;
		align-items: center;
		border: 1px solid var(--border);
		border-radius: 999px;
		background: var(--surface);
		padding-left: 0.25rem;
		max-width: 100%;
	}

	.chip:focus-within {
		border-color: var(--accent);
	}

	.chip input {
		border: 0;
		background: transparent;
		width: auto;
		min-width: 6ch;
		max-width: 100%;
		padding: 0.4rem 0.5rem;
		border-radius: 999px;
		font-weight: 600;
	}

	@supports (field-sizing: content) {
		.chip input {
			field-sizing: content;
			min-width: 8ch;
			max-width: 32ch;
		}
	}

	.chip .remove {
		border: 0;
		background: transparent;
		border-radius: 999px;
		min-width: 2.5rem;
		font-size: 1.15rem;
		color: var(--muted);
	}

	.add {
		border-radius: 999px;
		border-style: dashed;
		color: var(--accent);
		font-weight: 600;
	}

	.notes summary {
		cursor: pointer;
		color: var(--muted);
		font-size: 0.9rem;
		width: fit-content;
		padding: 0.25rem 0;
	}

	.notes textarea {
		margin-top: 0.35rem;
	}
</style>
