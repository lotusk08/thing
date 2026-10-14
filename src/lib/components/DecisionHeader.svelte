<script lang="ts">
	import { tick } from 'svelte';
	import { store } from '$lib/state.svelte';
	import Icon from './Icon.svelte';

	let chips: HTMLElement;

	async function addOption() {
		const id = store.addOption();
		await tick();
		if (id) chips.querySelector<HTMLInputElement>(`[data-option="${id}"]`)?.focus();
	}

	/** Grow the title with its text (it wraps at display size on phones). */
	function autosize(node: HTMLTextAreaElement, _value: string) {
		const fit = () => {
			node.style.height = 'auto';
			node.style.height = `${node.scrollHeight}px`;
		};
		requestAnimationFrame(fit);
		window.addEventListener('resize', fit);
		return {
			update: fit,
			destroy: () => window.removeEventListener('resize', fit)
		};
	}

	function oneLine(e: Event & { currentTarget: HTMLTextAreaElement }) {
		const v = e.currentTarget.value;
		if (v.includes('\n')) store.decision.title = v.replace(/\s*\n\s*/g, ' ');
	}
</script>

<section class="decision ss-enter" aria-label="Decision">
	<label for="decision-title" class="sr-only">Decision</label>
	<textarea
		id="decision-title"
		class="title"
		rows="1"
		placeholder="What are you deciding?"
		autocomplete="off"
		spellcheck="true"
		bind:value={store.decision.title}
		use:autosize={store.decision.title}
		oninput={oneLine}
		onkeydown={(e) => e.key === 'Enter' && e.preventDefault()}
	></textarea>

	<div class="options" role="group" aria-label="Options" bind:this={chips}>
		{#each store.decision.options as option, i (option.id)}
			<span class="ss-chip option">
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
					class="ss-btn ghost icon small remove"
					aria-label="Remove option {option.label.trim() || i + 1}"
					disabled={!store.canRemoveOption}
					onclick={() => store.removeOption(option.id)}
				>
					<Icon name="close" />
				</button>
			</span>
		{/each}
		<button type="button" class="ss-btn small add-option" onclick={addOption} disabled={!store.canAddOption}>
			<Icon name="plus" /> Option
		</button>
	</div>

	<details class="notes" open={!!store.decision.notes}>
		<summary><Icon name="chevron-right" /> Notes</summary>
		<label for="decision-notes" class="sr-only">Notes</label>
		<textarea id="decision-notes" class="ss-input" rows="3" placeholder="Context, constraints, deadline…" bind:value={store.decision.notes}></textarea>
	</details>
</section>

<style>
	.decision {
		display: grid;
		gap: var(--ss-space-5);
		padding-block: var(--ss-space-8) var(--ss-space-6);
	}

	.title {
		display: block;
		width: 100%;
		margin: 0;
		padding: 0 0 0.15em;
		overflow: hidden;
		border: 0;
		border-bottom: var(--ss-hairline) solid transparent;
		border-radius: 0;
		background: transparent;
		color: var(--ss-tx);
		font-family: var(--ss-font-title);
		font-size: var(--ss-display-1);
		font-style: italic;
		font-weight: 400;
		line-height: 1.15;
		letter-spacing: var(--ss-tracking-display);
		text-wrap: balance;
		resize: none;
		transition: border-color var(--ss-dur-hover) var(--ss-ease-hover);
	}

	.title::placeholder {
		color: var(--ss-tx-3);
	}

	@media (hover: hover) {
		.title:hover {
			border-bottom-color: var(--ss-ui-2);
		}
	}

	.title:focus {
		border-bottom-color: var(--ss-accent);
		outline: none;
	}

	.options {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--ss-space-2);
	}

	.option {
		gap: 0;
		max-width: 100%;
		padding: 0 2px 0 var(--ss-space-3);
		color: var(--ss-tx);
		font-size: var(--ss-text-base);
		transition:
			border-color var(--ss-dur-hover) var(--ss-ease-hover),
			box-shadow var(--ss-dur-hover) var(--ss-ease-hover);
	}

	.option:focus-within {
		border-color: var(--ss-accent);
		box-shadow: 0 0 0 3px var(--ss-ring);
	}

	.option input {
		width: auto;
		min-width: 6ch;
		max-width: 100%;
		padding: 0.3rem 0;
		border: 0;
		background: transparent;
		font-weight: 500;
	}

	.option input::placeholder {
		color: var(--ss-tx-3);
	}

	.option input:focus {
		outline: none;
	}

	@supports (field-sizing: content) {
		.option input {
			field-sizing: content;
			min-width: 6ch;
			max-width: 30ch;
		}
	}

	.remove {
		border-radius: var(--ss-radius-full);
	}

	.add-option {
		border-radius: var(--ss-radius-full);
	}

	.notes summary {
		display: inline-flex;
		align-items: center;
		gap: var(--ss-space-1);
		color: var(--ss-tx-2);
		font-size: var(--ss-text-sm);
		list-style: none;
		cursor: pointer;
		transition: color var(--ss-dur-hover) var(--ss-ease-hover);
	}

	.notes summary::-webkit-details-marker {
		display: none;
	}

	@media (hover: hover) {
		.notes summary:hover {
			color: var(--ss-tx);
		}
	}

	@media (prefers-reduced-motion: no-preference) {
		.notes summary :global(.ss-icon) {
			transition: transform var(--ss-dur-small) var(--ss-ease-out);
		}
	}

	.notes[open] summary :global(.ss-icon) {
		transform: rotate(90deg);
	}

	.notes textarea {
		margin-top: var(--ss-space-2);
		min-height: 4.5rem;
	}
</style>
