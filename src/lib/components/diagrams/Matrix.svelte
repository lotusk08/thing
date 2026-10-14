<!--
	A weighted decision matrix: criteria down, options across. Each cell is a flat
	wash of its option's colour, as strong as its score, and shows score × weight;
	the last row is the weighted score, the lead marked in its option's colour. Any
	cell or criterion opens that criterion.
-->
<script lang="ts">
	import type { Add, Matrix, Ref } from '$lib/core/diagram';
	import { store } from '$lib/state.svelte';
	import Icon from '../Icon.svelte';
	import Mark from './Mark.svelte';

	let { diagram, onedit, onadd }: { diagram: Matrix; onedit: (ref: Ref) => void; onadd: (add: Add) => void } = $props();

	const options = $derived(store.decision.options);
	const best = $derived(Math.max(...Object.values(diagram.totals).map((t) => t ?? -Infinity)));
</script>

<div class="matrix">
	<div class="wrap">
		<table>
			<thead>
				<tr>
					<th scope="col" class="name">Criterion</th>
					<th scope="col" class="weight">Weight</th>
					{#each options as o (o.id)}
						<th scope="col"><Mark option={o.id} named /></th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each diagram.rows as row (row.edit.id)}
					<tr>
						<th scope="row" class="name">
							<button type="button" onclick={() => onedit(row.edit)}>{row.label}</button>
						</th>
						<td class="weight">
							<span class="ss-figure">{row.weight}</span>
							<span class="bar" aria-hidden="true"><span style:width="{(row.weight / diagram.weightMax) * 100}%"></span></span>
						</td>
						{#each options as o, i (o.id)}
							{@const score = row.scores[o.id] ?? 0}
							<td class="cell opt-{i}" style:--heat={score / diagram.max}>
								<button type="button" onclick={() => onedit(row.edit)} aria-label="{row.label}: {score} of {diagram.max}, times {row.weight} is {score * row.weight}">
									<span class="score ss-figure">{score}</span>
									<span class="product ss-figure">× {row.weight} = {score * row.weight}</span>
								</button>
							</td>
						{/each}
					</tr>
				{:else}
					<tr>
						<td colspan={options.length + 2} class="empty">No criteria yet.</td>
					</tr>
				{/each}
			</tbody>
			<tfoot>
				<tr>
					<th scope="row" class="name" colspan="2">Weighted score <span class="of">of {diagram.max}</span></th>
					{#each options as o, i (o.id)}
						{@const total = diagram.totals[o.id]}
						<td class="total ss-figure opt-{i}" class:lead={total !== null && total !== undefined && total === best && diagram.rows.length > 0}>
							{total === null || total === undefined ? '–' : total.toFixed(1)}
						</td>
					{/each}
				</tr>
			</tfoot>
		</table>
	</div>
	<button type="button" class="ss-btn ghost small add" disabled={diagram.add.full} onclick={() => onadd(diagram.add)}>
		<Icon name="plus" /> Criterion
	</button>
</div>

<style>
	.matrix {
		display: grid;
		gap: var(--ss-space-3);
	}

	.wrap {
		overflow-x: auto;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--ss-text-sm);
	}

	th,
	td {
		padding: 0;
		border-bottom: var(--ss-hairline) solid var(--ss-ui);
		text-align: center;
		vertical-align: middle;
	}

	thead th {
		padding: var(--ss-space-2);
		border-bottom-color: var(--ss-ui-2);
		color: var(--ss-tx-2);
		font-size: var(--ss-text-xs);
		font-weight: 500;
		white-space: nowrap;
	}

	.name {
		text-align: left;
	}

	thead .name {
		padding-left: 0;
	}

	tbody .name button {
		width: 100%;
		min-height: var(--ss-tap-target);
		padding: var(--ss-space-2) var(--ss-space-2) var(--ss-space-2) 0;
		border: 0;
		background: none;
		color: var(--ss-tx);
		font: inherit;
		font-weight: 500;
		text-align: left;
		cursor: pointer;
	}

	.weight {
		width: 4.5rem;
		padding: var(--ss-space-2);
		color: var(--ss-tx-2);
	}

	.bar {
		display: block;
		height: 3px;
		margin-top: 4px;
		overflow: hidden;
		border-radius: var(--ss-radius-full);
		background: var(--ss-ui);
	}

	.bar span {
		display: block;
		height: 100%;
		border-radius: inherit;
		background: var(--rise);
	}

	/* One flat wash per cell, in its option's colour: nothing at 0, a light wash at the top of the scale. */
	.cell {
		min-width: 5.5rem;
		background: color-mix(in oklab, var(--opt) calc(var(--heat) * 18%), transparent);
	}

	.cell button {
		display: grid;
		justify-items: center;
		width: 100%;
		min-height: var(--ss-tap-target);
		padding: var(--ss-space-2);
		border: 0;
		background: none;
		color: var(--ss-tx);
		font: inherit;
		cursor: pointer;
		transition: background var(--ss-dur-hover) var(--ss-ease-hover);
	}

	@media (hover: hover) {
		tbody .name button:hover,
		.cell button:hover {
			background: color-mix(in srgb, var(--ss-tx) 6%, transparent);
		}
	}

	.score {
		font-size: var(--ss-text-md);
		font-weight: 600;
	}

	/* --ss-tx: on the boldest cells --ss-tx-2 falls under AA. */
	.product {
		color: var(--ss-tx);
		font-size: var(--ss-text-2xs);
	}

	tfoot th,
	tfoot td {
		padding: var(--ss-space-3) var(--ss-space-2);
		border-bottom: 0;
		border-top: var(--ss-hairline) solid var(--ss-ui-2);
	}

	tfoot .name {
		padding-left: 0;
		font-weight: 600;
	}

	.of {
		color: var(--ss-tx-2);
		font-size: var(--ss-text-xs);
		font-weight: 400;
	}

	.total {
		color: var(--ss-tx-2);
		font-size: var(--ss-text-md);
		font-weight: 600;
	}

	.total.lead {
		background: color-mix(in oklab, var(--opt) 8%, transparent);
		box-shadow: inset 0 calc(var(--ss-hairline) * -1) 0 var(--opt);
		color: var(--ss-tx);
		font-weight: 700;
	}

	.empty {
		padding: var(--ss-space-4) 0;
		color: var(--ss-tx-2);
	}

	.add {
		justify-self: start;
	}
</style>
