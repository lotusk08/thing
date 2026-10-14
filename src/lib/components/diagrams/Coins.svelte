<!--
	Coin flips: each flip a coin showing the option it landed on, lit by how that
	felt: bold in the accent when relieved, a wash when neutral, plain when
	disappointed. Then how often your gut sided with each option, and the closing
	question: which choice you'd regret not making.
-->
<script lang="ts">
	import type { Add, Coins, Ref } from '$lib/core/diagram';
	import { optionLabel } from '$lib/core/util';
	import { store } from '$lib/state.svelte';
	import Icon from '../Icon.svelte';
	import Mark from './Mark.svelte';

	let { diagram, onedit, onadd }: { diagram: Coins; onedit: (ref: Ref) => void; onadd: (add: Add) => void } = $props();

	const index = (option: string) => store.decision.options.findIndex((o) => o.id === option);
</script>

<div class="coins">
	<ol class="flips" aria-label="Flips">
		{#each diagram.flips as f, i (f.edit.id)}
			<li>
				<button
					type="button"
					class="coin {f.feeling ?? 'none'}"
					aria-label="Flip {i + 1}: landed on {optionLabel(store.decision, f.landed)}. {f.text}."
					onclick={() => onedit(f.edit)}
				>
					<Mark option={f.landed} />
				</button>
				<span class="feel" aria-hidden="true">{f.text}</span>
			</li>
		{/each}
		<li>
			<button type="button" class="coin flip" aria-label="Flip a coin" title="Flip a coin" disabled={diagram.add.full} onclick={() => onadd(diagram.add)}>
				<Icon name="plus" />
			</button>
			<span class="feel" aria-hidden="true">Flip</span>
		</li>
	</ol>

	<dl class="relief">
		<dt class="ss-label">Your gut sided with</dt>
		{#each diagram.relief as r (r.option)}
			<dd class="opt-{index(r.option)}">
				<span class="who"><Mark option={r.option} named /></span>
				<span class="bar" aria-hidden="true"><span style:width="{r.rate ?? 0}%"></span></span>
				<span class="rate ss-figure">{r.rate === null ? '–' : `${Math.round(r.rate)}%`}</span>
				<span class="of">{r.flips} flip{r.flips === 1 ? '' : 's'}</span>
			</dd>
		{/each}
	</dl>

	<button type="button" class="question" onclick={() => onedit(diagram.question.edit)}>
		<span class="ss-label">{diagram.question.label}</span>
		<span class="answer">
			{#if diagram.question.answer}<Mark option={diagram.question.answer} named />{:else}<span class="none">{diagram.question.text}</span>{/if}
		</span>
	</button>
</div>

<style>
	.coins {
		display: grid;
		gap: var(--ss-space-6);
	}

	.flips {
		display: flex;
		flex-wrap: wrap;
		gap: var(--ss-space-4) var(--ss-space-3);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.flips li {
		display: grid;
		justify-items: center;
		gap: var(--ss-space-1);
		width: 4.5rem;
	}

	.coin {
		display: grid;
		place-items: center;
		width: 3rem;
		height: 3rem;
		padding: 0;
		border: var(--ss-hairline) solid var(--ss-ui-2);
		border-radius: 50%;
		background: var(--ss-bg-2);
		color: var(--ss-tx);
		cursor: pointer;
		font-size: var(--ss-text-md);
		transition:
			border-color var(--ss-dur-hover) var(--ss-ease-hover),
			scale var(--ss-dur-hover) var(--ss-ease-hover);
	}

	/* The letter a little larger inside a coin. */
	.coin :global(.mark) {
		width: 1.6rem;
		height: 1.6rem;
		font-size: var(--ss-text-xs);
	}

	.coin.good {
		border-color: var(--ss-accent);
		background: linear-gradient(to bottom, var(--ramp-1), var(--ramp-3)), var(--ss-bg-2);
	}

	.coin.neutral {
		border-color: var(--ramp-3);
		background: linear-gradient(to bottom, transparent, var(--ramp-1)), var(--ss-bg-2);
	}

	.coin.none,
	.coin.flip {
		border-style: dashed;
	}

	.coin.flip {
		color: var(--ss-icon);
	}

	.coin:disabled {
		cursor: not-allowed;
		opacity: 0.45;
	}

	@media (hover: hover) and (prefers-reduced-motion: no-preference) {
		.coin:hover:not(:disabled) {
			scale: 1.06;
		}
	}

	.feel {
		color: var(--ss-tx-2);
		font-size: var(--ss-text-2xs);
		text-align: center;
	}

	.relief {
		display: grid;
		gap: var(--ss-space-2);
		margin: 0;
	}

	.relief dd {
		display: grid;
		grid-template-columns: minmax(7rem, auto) minmax(0, 1fr) auto auto;
		align-items: center;
		gap: var(--ss-space-3);
		margin: 0;
		font-size: var(--ss-text-sm);
	}

	.bar {
		height: 6px;
		overflow: hidden;
		border-radius: var(--ss-radius-full);
		background: var(--ss-ui);
	}

	.bar span {
		display: block;
		height: 100%;
		border-radius: inherit;
		background: var(--opt-rise);
	}

	@media (prefers-reduced-motion: no-preference) {
		.bar span {
			transition: width var(--ss-dur-small) var(--ss-ease-out);
		}
	}

	.who {
		display: inline-flex;
		align-items: center;
	}

	.rate {
		font-weight: 600;
	}

	.of {
		color: var(--ss-tx-2);
		font-size: var(--ss-text-xs);
	}

	.question {
		display: grid;
		gap: var(--ss-space-2);
		padding: var(--ss-space-4);
		border: var(--ss-hairline) solid var(--ss-ui-2);
		border-radius: var(--ss-radius-lg);
		background: var(--ss-bg-2);
		color: var(--ss-tx);
		font: inherit;
		text-align: left;
		cursor: pointer;
		transition: border-color var(--ss-dur-hover) var(--ss-ease-hover);
	}

	@media (hover: hover) {
		.question:hover {
			border-color: var(--ss-accent);
		}
	}

	.answer {
		display: inline-flex;
		align-items: center;
		font-size: var(--ss-text-md);
		font-weight: 600;
	}

	.none {
		color: var(--ss-tx-2);
		font-weight: 400;
	}
</style>
