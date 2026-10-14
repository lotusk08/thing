<!--
	An Ishikawa diagram. Where there is room: the problem is the head on the right,
	the spine runs into it, and the six categories are bones slanting into the spine,
	three above and three below, all hairlines in the accent, light at the tail and
	bold at the head. Each cause is a rib ending on its bone, as bold as its impact,
	with the options that resolve it; dashed when none does. On a phone
	it turns top to bottom: the head, then the spine down the left with the bones
	off it. Tap a rib, the head, or a bone's + to edit.
-->
<script lang="ts">
	import type { Add, Fishbone, Ref } from '$lib/core/diagram';
	import Icon from '../Icon.svelte';
	import Mark from './Mark.svelte';

	let { diagram, onedit, onadd }: { diagram: Fishbone; onedit: (ref: Ref) => void; onadd: (add: Add) => void } = $props();
	const uid = $props.id();

	const IMPACT = ['', 'low', 'medium', 'high'] as const;
	const half = $derived(Math.ceil(diagram.bones.length / 2));
	const top = $derived(diagram.bones.slice(0, half));
	const bottom = $derived(diagram.bones.slice(half));
	/** Causes on a side's fullest bone (two at least, so a lone cause sits near the spine): every bone on that side is drawn that tall. */
	const most = (bones: Fishbone['bones']) => Math.max(2, ...bones.map((b) => b.causes.length));
	/** Where a bone starts across its column (the CSS's --x0, as a percentage). */
	const X0 = 38;
</script>

{#snippet bone(b: Fishbone['bones'][number], side: 'top' | 'bottom', n: number)}
	<!-- A bone: a label row, then a row per cause, half a row from the spine. -->
	{@const label = 100 / (n + 1.5)}
	{@const [y0, y1] = side === 'top' ? [label, 100] : [100 - label, 0]}
	<section class="bone {side}" aria-label="{b.label}, {b.causes.length} cause{b.causes.length === 1 ? '' : 's'}">
		<svg class="line" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
			<!-- Light where the bone starts, bold where it meets the spine. -->
			<linearGradient id="{uid}-{b.label}" gradientUnits="userSpaceOnUse" x1={X0} y1={y0} x2="100" y2={y1}>
				<stop offset="0" />
				<stop offset="1" />
			</linearGradient>
			<line x1={X0} y1={y0} x2="100" y2={y1} stroke="url(#{uid}-{b.label})" vector-effect="non-scaling-stroke" />
		</svg>
		<h3 class="label">
			{b.label}
			<button type="button" class="add" aria-label="Add a cause under {b.label}" title="Add a cause" disabled={b.add.full} onclick={() => onadd(b.add)}>
				<Icon name="plus" />
			</button>
		</h3>
		<ul>
			{#each b.causes as c, j (c.edit.id)}
				<li style:--m={side === 'top' ? n - j : j + 1}>
					<button type="button" class="rib w{c.weight}" class:loose={!c.options.length} title={c.text} onclick={() => onedit(c.edit)}>
						<span class="text">{c.text}<span class="sr-only">, {IMPACT[c.weight]} impact, resolved by</span></span>
						<span class="marks">
							{#each c.options as o (o)}<Mark option={o} />{:else}<span class="none">no option<span class="sr-only"> yet</span></span>{/each}
						</span>
					</button>
				</li>
			{/each}
		</ul>
	</section>
{/snippet}

<div class="fish">
	<div class="layout">
		<button type="button" class="head" onclick={() => onedit(diagram.head.edit)}>
			<span class="ss-label">{diagram.head.label}</span>
			<span class="problem" class:none={!diagram.head.text}>{diagram.head.text || 'Not written yet'}</span>
		</button>
		<div class="bones top" style:--n={most(top)}>
			{#each top as b (b.label)}{@render bone(b, 'top', most(top))}{/each}
		</div>
		<div class="spine" aria-hidden="true"></div>
		<div class="bones bottom" style:--n={most(bottom)}>
			{#each bottom as b (b.label)}{@render bone(b, 'bottom', most(bottom))}{/each}
		</div>
	</div>
</div>

<style>
	.fish {
		--row: 2rem;
		container: fish / inline-size;
	}

	/* A phone: the head on top, the spine down the left, each bone off it. */
	.layout {
		display: grid;
	}

	.head {
		display: grid;
		gap: 2px;
		margin-bottom: var(--ss-space-4);
		padding: var(--ss-space-3) var(--ss-space-4);
		border: var(--ss-hairline) solid var(--ss-accent);
		border-radius: var(--ss-radius-lg);
		background: linear-gradient(135deg, transparent, var(--ramp-2)), var(--ss-bg-2);
		color: var(--ss-tx);
		font: inherit;
		text-align: left;
		cursor: pointer;
		transition: border-color var(--ss-dur-hover) var(--ss-ease-hover);
	}

	@media (hover: hover) {
		.head:hover {
			border-color: var(--ss-accent);
		}
	}

	.problem {
		font-size: var(--ss-text-md);
		font-weight: 600;
		text-wrap: balance;
	}

	.problem.none,
	.none {
		color: var(--ss-tx-2);
		font-weight: 400;
	}

	.spine,
	.line {
		display: none;
	}

	.bones {
		display: grid;
		gap: var(--ss-space-4);
		margin-left: var(--ss-space-2);
		padding: 0 0 var(--ss-space-4) var(--ss-space-4);
		border-left: var(--ss-hairline) solid;
		border-image: linear-gradient(to bottom, var(--ramp-5), var(--ramp-3)) 1;
	}

	/* Down the spine away from the head, lighter as it goes. */
	.bones.bottom {
		padding-bottom: 0;
		border-image: linear-gradient(to bottom, var(--ramp-3), var(--ramp-1)) 1;
	}

	.bone {
		min-width: 0;
	}

	.label {
		display: flex;
		align-items: center;
		gap: var(--ss-space-1);
		margin: 0 0 var(--ss-space-1);
		font-size: var(--ss-text-sm);
		font-weight: 600;
	}

	.label::before {
		width: var(--ss-space-3);
		margin-left: calc(var(--ss-space-4) * -1);
		border-top: var(--ss-hairline) solid var(--ramp-4);
		content: '';
	}

	.add {
		display: inline-grid;
		place-items: center;
		width: 1.5rem;
		height: 1.5rem;
		padding: 0;
		border: 0;
		border-radius: 50%;
		background: none;
		color: var(--ss-icon);
		cursor: pointer;
		transition:
			color var(--ss-dur-hover) var(--ss-ease-hover),
			background var(--ss-dur-hover) var(--ss-ease-hover);
	}

	@media (hover: hover) {
		.add:hover:not(:disabled) {
			background: var(--ss-ui-3);
			color: var(--ss-tx);
		}
	}

	.add:disabled {
		cursor: not-allowed;
		opacity: 0.45;
	}

	ul {
		display: grid;
		margin: 0;
		padding: 0 0 0 var(--ss-space-3);
		list-style: none;
	}

	.rib {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: var(--ss-space-2);
		width: 100%;
		min-height: var(--row);
		padding: 2px 0 3px;
		border: 0;
		border-bottom: var(--ss-hairline) solid var(--rib);
		background: none;
		color: var(--ss-tx);
		font: inherit;
		font-size: var(--ss-text-sm);
		text-align: left;
		cursor: pointer;
		transition: color var(--ss-dur-hover) var(--ss-ease-hover);
	}

	.rib.loose {
		border-bottom-style: dashed;
	}

	@media (hover: hover) {
		.rib:hover {
			color: var(--ss-accent);
		}
	}

	/* Bolder ribs for bigger causes. */
	.rib.w1 {
		--rib: var(--ramp-3);

		color: var(--ss-tx-2);
	}

	.rib.w2 {
		--rib: var(--ramp-4);
	}

	.rib.w3 {
		--rib: var(--ramp-5);

		font-weight: 600;
	}

	.text {
		min-width: 0;
		overflow-wrap: anywhere;
	}

	.marks {
		display: inline-flex;
		flex: none;
		gap: 2px;
	}

	.none {
		font-size: var(--ss-text-2xs);
	}

	/*
	 * Room for the fish: head on the right, the spine into it, bones slanting in.
	 * A side is n causes tall (its fullest bone), plus a row for the labels and half
	 * a row off the spine. Each bone runs from --x0 across its column, under its
	 * label, to the spine; a cause's rib runs from the column's edge to where its row
	 * meets the bone, so the nearer the spine, the longer.
	 */
	@container fish (width >= 46rem) {
		/* Set on .layout: a container query styles what is inside the container, not the container. */
		.layout {
			--row: 3rem;
			--x0: 0.38;

			grid-template-columns: minmax(0, 1fr) minmax(9rem, 13rem);
			grid-template-areas: 'top head' 'spine head' 'bottom head';
			column-gap: var(--ss-space-4);
		}

		.head {
			grid-area: head;
			align-self: center;
			margin: 0;
		}

		.bones {
			grid-template-columns: repeat(3, minmax(0, 1fr));
			gap: var(--ss-space-4);
			margin: 0;
			padding: 0;
			border: 0;
		}

		.bones.top {
			grid-area: top;
		}

		.bones.bottom {
			grid-area: bottom;
		}

		.spine {
			grid-area: spine;
			position: relative;
			display: block;
			margin-right: calc(var(--ss-space-4) * -1 + 2px);
			border-top: var(--ss-hairline) solid;
			border-image: linear-gradient(to right, var(--ramp-2), var(--ramp-5)) 1;
		}

		/* The arrowhead into the head. */
		.spine::after {
			position: absolute;
			top: calc(var(--ss-hairline) / 2 - 4px);
			right: -2px;
			border-block: 4px solid transparent;
			border-left: 7px solid var(--ss-accent);
			content: '';
		}

		.bone {
			position: relative;
			height: calc((var(--n) + 1.5) * var(--row));
		}

		.line {
			position: absolute;
			inset: 0;
			display: block;
			width: 100%;
			height: 100%;
			overflow: visible;
			stroke-width: 1;
		}

		.line stop {
			stop-color: var(--ss-accent);
			stop-opacity: 0.25;
		}

		.line stop:last-child {
			stop-opacity: 1;
		}

		.label {
			position: absolute;
			left: calc(var(--x0) * 100%);
			z-index: 1;
			height: var(--row);
			margin: 0;
			white-space: nowrap;
			translate: -50% 0;
		}

		.label::before {
			display: none;
		}

		.top .label {
			top: 0;
		}

		.bottom .label {
			bottom: 0;
		}

		ul {
			display: block;
			padding: 0;
		}

		li {
			position: absolute;
			left: 0;
			height: var(--row);
		}

		.top li {
			top: calc(var(--m) * var(--row));
			right: calc((1 - var(--x0)) * (1 - var(--m) / (var(--n) + 0.5)) * 100%);
		}

		.bottom li {
			top: calc((var(--m) - 1) * var(--row));
			right: calc((1 - var(--x0)) * var(--m) / (var(--n) + 0.5) * 100%);
		}

		.rib {
			align-items: flex-end;
			justify-content: flex-end;
			height: 100%;
			min-height: 0;
			padding-right: 2px;
			text-align: right;
		}

		/* Three lines at most on a rib, a size down; the sheet has the rest. */
		.rib {
			font-size: var(--ss-text-xs);
		}

		.text {
			display: -webkit-box;
			overflow: hidden;
			-webkit-box-orient: vertical;
			-webkit-line-clamp: 3;
			line-clamp: 3;
			line-height: 1.25;
		}
	}
</style>
