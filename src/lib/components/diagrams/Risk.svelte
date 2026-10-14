<!--
	A risk matrix: likelihood across, severity up, each cell shaded by their product
	in the accent, light at low risk to bold at the worst. Every failure sits in its
	cell as its option's letter and number; the list under it names them, worst
	first, with its band (low, medium, high, extreme).
-->
<script lang="ts">
	import { letter, type Add, type Ref, type Risk } from '$lib/core/diagram';
	import { optionLabel } from '$lib/core/util';
	import { store } from '$lib/state.svelte';
	import Icon from '../Icon.svelte';
	import Mark from './Mark.svelte';

	let { diagram, onedit, onadd }: { diagram: Risk; onedit: (ref: Ref) => void; onadd: (add: Add) => void } = $props();

	const steps = $derived(Array.from({ length: diagram.max }, (_, i) => i + 1));
	const index = (option: string) => store.decision.options.findIndex((o) => o.id === option);
	const tag = (p: Risk['points'][number]) => `${letter(index(p.option))}${p.n}`;
	const level = (score: number) => (score >= 15 ? 'extreme' : score >= 10 ? 'high' : score >= 5 ? 'medium' : 'low');
	const ranked = $derived([...diagram.points].sort((a, b) => b.x * b.y - a.x * a.y));
	const describe = (p: Risk['points'][number]) =>
		`${tag(p)}, ${optionLabel(store.decision, p.option)}: ${p.text}. ${diagram.x.label} ${p.x}, ${diagram.y.label.toLowerCase()} ${p.y}.`;
</script>

<div class="risk">
	<div class="plot">
		<span class="y-label">{diagram.y.label} <span class="ends">{diagram.y.ends[0]} → {diagram.y.ends[1]}</span></span>
		<div class="grid" style:--n={diagram.max}>
			{#each [...steps].reverse() as sy (sy)}
				<span class="tick">{sy}</span>
				{#each steps as sx (sx)}
					<div class="cell" style:--s={(sx * sy) / diagram.max ** 2}>
						{#each diagram.points.filter((p) => p.x === sx && p.y === sy) as p (p.edit.id)}
							<button type="button" class="dot opt-{index(p.option)}" title={p.text} aria-label={describe(p)} onclick={() => onedit(p.edit)}>
								{tag(p)}
							</button>
						{/each}
					</div>
				{/each}
			{/each}
			<span></span>
			{#each steps as sx (sx)}<span class="tick">{sx}</span>{/each}
		</div>
		<span class="x-label">{diagram.x.label} <span class="ends">{diagram.x.ends[0]} → {diagram.x.ends[1]}</span></span>
	</div>

	<p class="scale"><span>low risk</span><i aria-hidden="true"></i><span>extreme</span></p>

	<ol class="list">
		{#each ranked as p (p.edit.id)}
			<li>
				<button type="button" onclick={() => onedit(p.edit)}>
					<span class="dot opt-{index(p.option)}" aria-hidden="true">{tag(p)}</span>
					<span class="text">{p.text}<span class="sr-only">, {optionLabel(store.decision, p.option)}</span></span>
					<span class="score ss-figure {level(p.x * p.y)}">{p.x} × {p.y} = {p.x * p.y} · {level(p.x * p.y)}</span>
				</button>
			</li>
		{:else}
			<li class="empty">No failures yet.</li>
		{/each}
	</ol>

	<div class="adds">
		{#each store.decision.options as o (o.id)}
			{@const add = diagram.add[o.id]}
			{#if add}
				<button type="button" class="ss-btn ghost small" disabled={add.full} onclick={() => onadd(add)}>
					<Icon name="plus" /> Failure for <Mark option={o.id} />
				</button>
			{/if}
		{/each}
	</div>
</div>

<style>
	.risk {
		display: grid;
		gap: var(--ss-space-4);
	}

	.plot {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		grid-template-areas: 'y grid' '. x';
		gap: var(--ss-space-2);
		max-width: 30rem;
	}

	.y-label {
		grid-area: y;
		writing-mode: vertical-rl;
		rotate: 180deg;
		text-align: center;
	}

	.x-label {
		grid-area: x;
		text-align: center;
	}

	.y-label,
	.x-label {
		color: var(--ss-tx-2);
		font-size: var(--ss-text-xs);
		font-weight: 600;
	}

	.ends {
		font-weight: 400;
	}

	.grid {
		grid-area: grid;
		display: grid;
		grid-template-columns: 1rem repeat(var(--n), minmax(0, 1fr));
		gap: 3px;
	}

	.tick {
		display: grid;
		place-items: center;
		color: var(--ss-tx-2);
		font-size: var(--ss-text-2xs);
	}

	.cell {
		display: flex;
		flex-wrap: wrap;
		align-content: center;
		justify-content: center;
		gap: 2px;
		aspect-ratio: 1;
		padding: 2px;
		border-radius: var(--ss-radius-sm);
		/* The accent by likelihood × severity: a wash at 1, bold at the top of the scale. */
		background: color-mix(in oklab, var(--ss-accent) calc(4% + var(--s) * 30%), transparent);
	}

	.dot {
		display: inline-grid;
		place-items: center;
		min-width: 1.75rem;
		height: 1.25rem;
		padding: 0 3px;
		border: 0;
		border-radius: var(--ss-radius-sm);
		background: var(--opt-tint);
		color: var(--opt-ink);
		font: inherit;
		font-size: var(--ss-text-2xs);
		font-weight: 700;
		line-height: 1;
		cursor: pointer;
	}

	button.dot {
		transition: scale var(--ss-dur-hover) var(--ss-ease-hover);
	}

	@media (hover: hover) and (prefers-reduced-motion: no-preference) {
		button.dot:hover {
			scale: 1.12;
		}
	}

	.scale {
		display: flex;
		align-items: center;
		gap: var(--ss-space-2);
		margin: 0;
		color: var(--ss-tx-2);
		font-size: var(--ss-text-xs);
	}

	.scale i {
		width: 6rem;
		height: 6px;
		border-radius: var(--ss-radius-full);
		background: linear-gradient(
			to right,
			color-mix(in oklab, var(--ss-accent) 5%, transparent),
			color-mix(in oklab, var(--ss-accent) 34%, transparent)
		);
	}

	.list {
		display: grid;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.list li + li {
		border-top: var(--ss-hairline) solid var(--ss-ui);
	}

	.list button {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		align-items: baseline;
		gap: var(--ss-space-3);
		width: 100%;
		padding: var(--ss-space-2) var(--ss-space-1);
		border: 0;
		border-radius: var(--ss-radius-md);
		background: none;
		color: var(--ss-tx);
		font: inherit;
		font-size: var(--ss-text-sm);
		text-align: left;
		cursor: pointer;
		transition: background var(--ss-dur-hover) var(--ss-ease-hover);
	}

	@media (hover: hover) {
		.list button:hover {
			background: var(--ss-ui-3);
		}
	}

	.text {
		overflow-wrap: anywhere;
	}

	.score {
		color: var(--ss-tx-2);
		font-size: var(--ss-text-xs);
		white-space: nowrap;
	}

	.score.high,
	.score.extreme {
		color: var(--ss-tx);
		font-weight: 600;
	}

	.empty {
		padding: var(--ss-space-2) 0;
		color: var(--ss-tx-2);
	}

	.adds {
		display: flex;
		flex-wrap: wrap;
		gap: var(--ss-space-2);
	}
</style>
