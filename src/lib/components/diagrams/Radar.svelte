<!--
	A radar: one axis per dimension (the six hats, in their colours), one shape per
	option in its shade of the accent, light at the middle and bold at the rim.
	Bigger is better on every axis; an inverted axis (black: risks) is drawn as its
	opposite. Each option's legend opens its values; notes open the rest.
-->
<script lang="ts">
	import type { Radar, Ref } from '$lib/core/diagram';
	import { optionLabel } from '$lib/core/util';
	import { store } from '$lib/state.svelte';
	import Mark from './Mark.svelte';

	let { diagram, onedit }: { diagram: Radar; onedit: (ref: Ref) => void } = $props();
	const uid = $props.id();

	const R = 100;
	const n = $derived(diagram.axes.length);
	const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
	const at = (i: number, r: number) => [Math.cos(angle(i)) * r, Math.sin(angle(i)) * r] as const;
	const radius = (i: number, v: number) => (R * (diagram.axes[i]!.inverted ? diagram.max + diagram.min - v : v)) / diagram.max;
	const shape = (values: number[]) => values.map((v, i) => at(i, radius(i, v)).join(',')).join(' ');
	const ring = (v: number) => diagram.axes.map((_, i) => at(i, (R * v) / diagram.max).join(',')).join(' ');
	const levels = $derived(Array.from({ length: diagram.max - diagram.min + 1 }, (_, k) => diagram.min + k));
	const index = (option: string) => store.decision.options.findIndex((o) => o.id === option);
	const score = (option: string) => store.estimates[store.active]?.perOption[option];
	/** Labels sit past the outer ring, anchored away from the middle. */
	const anchor = (i: number) => {
		const x = Math.cos(angle(i));
		return Math.abs(x) < 0.2 ? 'middle' : x > 0 ? 'start' : 'end';
	};
</script>

<div class="radar">
	<svg viewBox="-190 -150 380 300" aria-hidden="true">
		<g class="grid">
			{#each levels as v (v)}
				<polygon points={ring(v)} />
			{/each}
			{#each diagram.axes as _, i (i)}
				<line x1="0" y1="0" x2={at(i, R)[0]} y2={at(i, R)[1]} />
			{/each}
		</g>
		{#each diagram.series as s (s.option)}
			{@const k = index(s.option)}
			<g class="series opt-{k}">
				<!-- Light at the middle, bold at the rim: in the option's shade, so it inherits --opt. -->
				<radialGradient id="{uid}-{k}" gradientUnits="userSpaceOnUse" cx="0" cy="0" r={R}>
					<stop offset="0" />
					<stop offset="1" />
				</radialGradient>
				<polygon points={shape(s.values)} fill="url(#{uid}-{k})" />
				{#each s.values as v, i (i)}
					<circle cx={at(i, radius(i, v))[0]} cy={at(i, radius(i, v))[1]} r="2.5" />
				{/each}
			</g>
		{/each}
		{#each diagram.axes as axis, i (axis.label)}
			{@const [x, y] = at(i, R + 22)}
			<circle class="swatch {axis.swatch ?? ''}" cx={at(i, R + 9)[0]} cy={at(i, R + 9)[1]} r="5" />
			<text {x} y={y - 2} text-anchor={anchor(i)} dominant-baseline="middle">
				<tspan class="axis">{axis.label}</tspan>
				<tspan class="detail" {x} dy="15">{axis.detail}</tspan>
			</text>
		{/each}
	</svg>

	<table class="sr-only">
		<caption>Ratings by option, {diagram.min} to {diagram.max}</caption>
		<thead>
			<tr>
				<th scope="col">Hat</th>
				{#each diagram.series as s (s.option)}<th scope="col">{optionLabel(store.decision, s.option)}</th>{/each}
			</tr>
		</thead>
		<tbody>
			{#each diagram.axes as axis, i (axis.label)}
				<tr>
					<th scope="row">{axis.label} · {axis.detail}</th>
					{#each diagram.series as s (s.option)}<td>{s.values[i]}</td>{/each}
				</tr>
			{/each}
		</tbody>
	</table>

	<div class="legend">
		{#each diagram.series as s (s.option)}
			{@const value = score(s.option)}
			<button type="button" class="key opt-{index(s.option)}" onclick={() => onedit(s.edit)}>
				<svg class="line" viewBox="0 0 24 8" aria-hidden="true"><line x1="0" y1="4" x2="24" y2="4" /></svg>
				<Mark option={s.option} named />
				<span class="score ss-figure">{value === undefined ? '–' : Math.round(value)}</span>
			</button>
		{/each}
		{#each diagram.notes as note (note.label)}
			<button type="button" class="key note" onclick={() => onedit(note.edit)}>
				<span class="ss-label">{note.label}</span>
				{note.text}
			</button>
		{/each}
	</div>
</div>

<style>
	.radar {
		display: grid;
		justify-items: center;
		gap: var(--ss-space-4);
	}

	svg {
		width: min(100%, 30rem);
		height: auto;
		overflow: visible;
	}

	/* Hairlines at any size the radar is drawn. */
	line,
	polygon,
	circle {
		vector-effect: non-scaling-stroke;
	}

	.grid {
		fill: none;
		stroke: var(--ss-ui);
		stroke-width: 1;
	}

	.grid line {
		stroke: var(--ss-ui-2);
		stroke-dasharray: 1 3;
	}

	.grid polygon:last-of-type {
		stroke: var(--ss-ui-2);
	}

	.series polygon {
		stroke: var(--opt);
		stroke-dasharray: var(--opt-dash);
		stroke-linejoin: round;
		stroke-width: 1;
	}

	.series stop {
		stop-color: var(--opt);
		stop-opacity: 0.02;
	}

	.series stop:last-child {
		stop-opacity: 0.2;
	}

	.series circle {
		fill: var(--opt);
	}

	.swatch {
		stroke: var(--ss-ui-2);
		stroke-width: 1;
	}

	.swatch.paper {
		fill: var(--ss-bg-2);
	}

	.swatch.ink {
		fill: var(--ss-tx);
	}

	.swatch.danger {
		fill: var(--ss-danger);
	}

	.swatch.warning {
		fill: var(--ss-warning);
	}

	.swatch.tip {
		fill: var(--ss-tip);
	}

	.swatch.info {
		fill: var(--ss-info);
	}

	text {
		font-size: 13px;
	}

	.axis {
		fill: var(--ss-tx);
		font-weight: 600;
	}

	.detail {
		fill: var(--ss-tx-2);
		font-size: 11px;
	}

	.legend {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
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

	@media (hover: hover) {
		.key:hover {
			background: var(--ss-ui-3);
		}
	}

	.key .line {
		width: 1.5rem;
		stroke: var(--opt);
		stroke-dasharray: var(--opt-dash);
		stroke-width: 1;
	}

	.score {
		color: var(--ss-tx-2);
		font-weight: 600;
	}

	.note {
		color: var(--ss-tx-2);
	}
</style>
