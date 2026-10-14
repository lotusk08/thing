<!--
	Franklin's moral algebra: per option, a T with Pro on the left and Con on the
	right, each reason with its weight in dots that grow bolder, and a beam that tips
	toward the heavier side. Under them, 10-10-10: how each option feels in 10
	minutes, months and years, a line per option over a fading area.
-->
<script lang="ts">
	import type { Add, Ref, Weigh } from '$lib/core/diagram';
	import { figure, sum } from '$lib/core/util';
	import { store } from '$lib/state.svelte';
	import Icon from '../Icon.svelte';
	import Mark from './Mark.svelte';

	let { diagram, onedit, onadd }: { diagram: Weigh; onedit: (ref: Ref) => void; onadd: (add: Add) => void } = $props();
	const uid = $props.id();

	const index = (option: string) => store.decision.options.findIndex((o) => o.id === option);
	const signed = (v: number) => figure(v, { signed: true });

	// The timeline: three horizons across, feelings up the side.
	const W = 600;
	const H = 230;
	const X = [110, 320, 530];
	const top = 24;
	const bottom = 186;
	/** Values beside the points for two lines; more would collide, and the legend has them. */
	const labelled = $derived(diagram.horizons.lines.length <= 2);
	const y = (v: number) => top + ((diagram.horizons.max - v) / (diagram.horizons.max - diagram.horizons.min)) * (bottom - top);
</script>

{#snippet column(side: Weigh['sides'][number], key: 'for' | 'against')}
	{@const items = side[key]}
	<div class="col {key}">
		<h4>
			{key === 'for' ? 'Pro' : 'Con'}
			<span class="sum ss-figure">{sum(items.map((i) => i.weight))}</span>
		</h4>
		<ul>
			{#each items as item (item.edit.id)}
				<li>
					<button type="button" onclick={() => onedit(item.edit)}>
						<span class="dots" aria-label="weight {item.weight} of {diagram.weightMax}">
							{#each Array.from({ length: diagram.weightMax }, (_, k) => k) as k (k)}<i class:on={k < item.weight} style:--k={(k + 1) / diagram.weightMax}></i>{/each}
						</span>
						<span class="text">{item.text}</span>
					</button>
				</li>
			{/each}
		</ul>
		<button type="button" class="ss-btn ghost small add" disabled={side.add[key].full} onclick={() => onadd(side.add[key])}>
			<Icon name="plus" />
			{key === 'for' ? 'Pro' : 'Con'}
		</button>
	</div>
{/snippet}

<div class="weigh">
	<div class="sides">
		{#each diagram.sides as side (side.option)}
			{@const pro = sum(side.for.map((i) => i.weight))}
			{@const con = sum(side.against.map((i) => i.weight))}
			{@const tilt = Math.max(-14, Math.min(14, (pro - con) * 4))}
			<section class="side opt-{index(side.option)}">
				<header>
					<h3><Mark option={side.option} named /></h3>
					<span class="balance">
						<svg viewBox="0 0 72 34" aria-hidden="true">
							<path class="stand" d="M36 14 L30 32 H42 Z" />
							<g class="beam" style:rotate="{-tilt}deg">
								<line x1="6" y1="14" x2="66" y2="14" />
								<path class="pan" d="M0 14 Q6 24 12 14" />
								<path class="pan" d="M60 14 Q66 24 72 14" />
							</g>
						</svg>
						<span class="says">{pro === con ? 'even' : pro > con ? `leans pro +${pro - con}` : `leans con −${con - pro}`}</span>
					</span>
				</header>
				<div class="t">
					{@render column(side, 'for')}
					{@render column(side, 'against')}
				</div>
			</section>
		{/each}
	</div>

	<section class="horizons" aria-labelledby="ten-ten-ten">
		<h3 id="ten-ten-ten" class="ss-label">10-10-10 · how it will feel</h3>
		<svg class="chart" viewBox="0 0 {W} {H}" aria-hidden="true">
			<line class="zero" x1="70" x2={W - 30} y1={y(0)} y2={y(0)} />
			{#each [diagram.horizons.max, 0, diagram.horizons.min] as v (v)}
				<text class="tick" x="58" y={y(v)} text-anchor="end" dominant-baseline="middle">{signed(v)}</text>
			{/each}
			{#each X as x, i (x)}
				<line class="guide" x1={x} x2={x} y1={top} y2={bottom} />
				<text class="when" {x} y={H - 14} text-anchor="middle">{diagram.horizons.labels[i]}</text>
			{/each}
			{#each diagram.horizons.lines as line (line.option)}
				{@const k = index(line.option)}
				{@const points = line.values.map((v, i) => `${X[i]},${y(v)}`).join(' ')}
				<g class="line opt-{k}">
					<!-- The area between the line and zero, in the option's hue: faint at zero, fuller the further it feels. -->
					<linearGradient id="{uid}-{k}" gradientUnits="userSpaceOnUse" x1="0" y1={top} x2="0" y2={bottom}>
						<stop offset="0" />
						<stop class="mid" offset={(y(0) - top) / (bottom - top)} />
						<stop offset="1" />
					</linearGradient>
					<polygon class="area" points="{points} {X[2]},{y(0)} {X[0]},{y(0)}" fill="url(#{uid}-{k})" />
					<polyline points={points} />
					{#each line.values as v, i (i)}
						<circle cx={X[i]} cy={y(v)} r="3" />
						{#if labelled}<text class="value" x={X[i]! + (k % 2 ? -10 : 10)} y={y(v) + (k % 2 ? 16 : -10)} text-anchor={k % 2 ? 'end' : 'start'}>{signed(v)}</text>{/if}
					{/each}
				</g>
			{/each}
		</svg>
		<div class="legend">
			{#each diagram.horizons.lines as line (line.option)}
				<button type="button" class="key opt-{index(line.option)}" onclick={() => onedit(line.edit)}>
					<svg class="swatch" viewBox="0 0 24 8" aria-hidden="true"><line x1="0" y1="4" x2="24" y2="4" /></svg>
					<Mark option={line.option} named />
					<span class="values ss-figure">{line.values.map(signed).join(' → ')}</span>
				</button>
			{/each}
		</div>
	</section>
</div>

<style>
	.weigh {
		display: grid;
		gap: var(--ss-space-8);
	}

	.sides {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 22rem), 1fr));
		gap: var(--ss-space-8) var(--ss-space-6);
	}

	.side header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--ss-space-3);
		margin-bottom: var(--ss-space-3);
	}

	h3 {
		margin: 0;
		font-size: var(--ss-text-md);
		font-weight: 600;
	}

	.balance {
		display: inline-flex;
		align-items: center;
		gap: var(--ss-space-2);
		color: var(--ss-tx-2);
		font-size: var(--ss-text-xs);
	}

	.balance svg {
		width: 4.5rem;
		overflow: visible;
	}

	.stand {
		fill: var(--ramp-3);
	}

	.beam {
		transform-origin: 36px 14px;
		fill: none;
		stroke: var(--ss-tx-2);
		stroke-linecap: round;
		stroke-width: 1;
	}

	@media (prefers-reduced-motion: no-preference) {
		.beam {
			transition: rotate var(--ss-dur-small) var(--ss-ease-out);
		}
	}

	/* The T: a rule under the headings and one between the columns. */
	.t {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
	}

	.col {
		display: grid;
		align-content: start;
		gap: var(--ss-space-2);
		min-width: 0;
		padding-inline: var(--ss-space-3);
	}

	.col.for {
		padding-left: 0;
	}

	.col.against {
		border-left: var(--ss-hairline) solid var(--ss-ui-2);
	}

	h4 {
		display: flex;
		justify-content: space-between;
		margin: 0 calc(var(--ss-space-3) * -1) 0 0;
		padding: 0 var(--ss-space-3) var(--ss-space-2) 0;
		border-bottom: var(--ss-hairline) solid var(--ss-ui-2);
		color: var(--ss-tx-2);
		font-size: var(--ss-text-xs);
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.against h4 {
		margin: 0 calc(var(--ss-space-3) * -1);
		padding-left: var(--ss-space-3);
	}

	.sum {
		color: var(--ss-tx);
	}

	ul {
		display: grid;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	li button {
		display: flex;
		align-items: baseline;
		gap: var(--ss-space-2);
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
		li button:hover,
		.key:hover {
			background: var(--ss-ui-3);
		}
	}

	.text {
		min-width: 0;
		overflow-wrap: anywhere;
	}

	.dots {
		display: inline-flex;
		flex: none;
		gap: 2px;
	}

	.dots i {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: var(--ss-ui);
	}

	/* Each dot a step bolder: pros in the accent, cons in the ink. */
	.dots i.on {
		background: color-mix(in oklab, var(--dot) calc(20% + var(--k) * 60%), transparent);
	}

	.for {
		--dot: var(--ss-accent);
	}

	.against {
		--dot: var(--ss-tx);
	}

	.add {
		justify-self: start;
	}

	.horizons {
		display: grid;
		gap: var(--ss-space-3);
	}

	/* Drawn at its own size up to the measure, so its words stay the text's size. */
	.chart {
		width: min(100%, 40rem);
		height: auto;
		overflow: visible;
	}

	/* Hairlines at any size the chart is drawn. */
	.chart :is(line, polyline, circle) {
		vector-effect: non-scaling-stroke;
	}

	.zero {
		stroke: var(--ss-tx-3);
		stroke-dasharray: 1 3;
	}

	.guide {
		stroke: var(--ss-ui);
	}

	text {
		fill: var(--ss-tx-2);
		font-size: 13px;
	}

	.when {
		fill: var(--ss-tx);
		font-weight: 600;
	}

	.line stop {
		stop-color: var(--opt);
		stop-opacity: 0.14;
	}

	.line stop.mid {
		stop-opacity: 0.01;
	}

	.line polyline {
		fill: none;
		stroke: var(--opt);
		stroke-dasharray: var(--opt-dash);
		stroke-linejoin: round;
		stroke-width: 1;
	}

	.line circle {
		fill: var(--ss-bg);
		stroke: var(--opt);
		stroke-width: 1;
	}

	.line .value {
		fill: var(--ss-tx);
		font-weight: 600;
	}

	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: var(--ss-space-2) var(--ss-space-4);
	}

	.key {
		display: inline-flex;
		align-items: center;
		gap: var(--ss-space-2);
		min-height: 2rem;
		padding: 2px var(--ss-space-2);
		border: 0;
		border-radius: var(--ss-radius-md);
		background: none;
		color: var(--ss-tx);
		font: inherit;
		font-size: var(--ss-text-sm);
		cursor: pointer;
		transition: background var(--ss-dur-hover) var(--ss-ease-hover);
	}

	.swatch {
		flex: none;
		width: 1.5rem;
		stroke: var(--opt);
		stroke-dasharray: var(--opt-dash);
		stroke-width: 1;
	}

	.values {
		color: var(--ss-tx-2);
	}
</style>
