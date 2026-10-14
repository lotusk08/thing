<!--
	A short scale as a wheel: its numbers on a strip that scrolls sideways and snaps,
	the pick under a soft lens in the middle, big and bold, its neighbours smaller the
	further they sit, and the strip fading out at both ends. Swipe or scroll it, tap a number, or use the arrow
	keys: under the strip are native radios, so a screen reader hears each step (with
	the end words on the ends). A tick under each number reads like a ruler, fuller
	as the value grows; a two-sided scale (−5…+5) is red below zero and green above,
	and its lens takes the side's colour. Elsewhere the lens is --pick: the accent, or
	the option's colour in an option's row.
	Kept lean, as a form shows a dozen or more: no script per number (the distance
	styles come from the checked radio), and only a settle timer while it scrolls.
-->
<script lang="ts" module>
	/**
	 * One number's width on every wheel (--wheel-item), read once for the page rather
	 * than by each wheel as it mounts, which forced a layout per wheel. Read again when
	 * a wheel resizes, in case the pointer changed (a finger's numbers are wider).
	 */
	let item = 0;
	const measure = (strip: HTMLElement) => (item = strip.firstElementChild?.getBoundingClientRect().width ?? 0);
</script>

<script lang="ts">
	import type { NumberField } from '$lib/core/schema';
	import { figure } from '$lib/core/util';

	interface Props {
		field: NumberField;
		steps: number[];
		value: number;
		/** The radios' name: unique per scale. */
		name: string;
		labelledby: string;
		describedby?: string;
	}

	let { field, steps, value = $bindable(), name, labelledby, describedby }: Props = $props();

	let strip: HTMLElement;
	let settle: ReturnType<typeof setTimeout> | undefined;

	/** On the strip, halves as ½ (1½); to a screen reader, the number as a number (1.5), with the end words on the ends. */
	const show = (n: number) => figure(n, { signed: field.signed, halves: true });
	const spoken = (n: number) => {
		const end = n === field.min ? field.ends?.[0] : n === field.max ? field.ends?.[1] : undefined;
		const said = figure(n, { signed: field.signed });
		return end ? `${said}, ${end}` : said;
	};
	/** Which side of zero a number is on, on a two-sided scale. */
	const side = (n: number) => (!field.signed ? undefined : n < 0 ? 'neg' : n > 0 ? 'pos' : 'zero');
	/** How full its tick is: by value, or by distance from zero on a two-sided scale. */
	const fullness = (n: number) => {
		const top = field.signed ? Math.max(-field.min, field.max) : field.max - field.min;
		return top ? (field.signed ? Math.abs(n) : n - field.min) / top : 1;
	};

	const at = $derived(steps.indexOf(value));
	const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

	/** Bring the pick under the lens. Each step is one item wide, so the pick sits at `at` widths. */
	function centre(behavior: ScrollBehavior) {
		const width = item || measure(strip);
		if (width && at >= 0) strip.scrollTo({ left: at * width, behavior: reduce() ? 'instant' : behavior });
	}

	// Glide to a new pick (a tap, a key, an edit on the map); the first time, and once
	// the strip has a size (a hidden form shown), jump.
	let placed = false;
	$effect(() => {
		void at;
		centre(placed ? 'smooth' : 'instant');
		placed = true;
	});
	$effect(() => {
		let seen = false;
		const ro = new ResizeObserver(() => {
			// The first call is the mount, which the effect above has placed; after that, measure again.
			if (seen) measure(strip);
			seen = true;
			centre('instant');
		});
		ro.observe(strip);
		return () => ro.disconnect();
	});

	/** Once a swipe settles, the number under the lens is the pick. */
	function scrolled() {
		clearTimeout(settle);
		settle = setTimeout(() => {
			const width = item || measure(strip);
			const next = width ? steps[Math.max(0, Math.min(steps.length - 1, Math.round(strip.scrollLeft / width)))] : undefined;
			if (next !== undefined && next !== value) value = next;
		}, 120);
	}

	function pick(e: Event) {
		value = Number((e.target as HTMLInputElement).value);
	}
</script>

<div class="wheel">
	<div class="strip" role="radiogroup" aria-labelledby={labelledby} aria-describedby={describedby} bind:this={strip} onscroll={scrolled} onchange={pick}>
		{#each steps as n (n)}
			<label class={side(n)} style:--k={fullness(n)}
				><input type="radio" {name} value={n} checked={n === value} aria-label={spoken(n)} />{show(n)}</label
			>
		{/each}
	</div>
</div>

<style>
	/* A colour, so the lens, glow and tick ease from one pick's colour to the next (red, grey, green across zero). */
	@property --pick {
		syntax: '<color>';
		inherits: true;
		initial-value: transparent;
	}

	.wheel {
		--item: var(--wheel-item);
		--pick: var(--opt, var(--ss-accent));
		--tone: var(--pick);

		transition: --pick var(--ss-dur-small) var(--ss-ease-out);

		position: relative;
		width: min(100%, calc(5 * var(--item)));
		/* Its numbers scroll inside; they don't widen the column it sits in. */
		contain: inline-size;
		isolation: isolate;
	}

	/* A two-sided scale's lens takes the side the pick is on. */
	.wheel:has(.neg input:checked) {
		--pick: var(--ss-danger);
	}

	.wheel:has(.pos input:checked) {
		--pick: var(--ss-tip);
	}

	.wheel:has(.zero input:checked) {
		--pick: var(--ss-tx-2);
	}

	/*
	 * No borders: a faint glow under the whole wheel, strongest in the middle and gone
	 * at the ends, and the lens, fixed in the middle as the numbers pass under it, a
	 * soft gradient that fills toward its foot, both in the pick's colour.
	 */
	.wheel {
		border-radius: var(--ss-radius-lg);
		background: linear-gradient(
			to right,
			transparent,
			color-mix(in oklab, var(--pick) 7%, transparent) 30%,
			color-mix(in oklab, var(--pick) 7%, transparent) 70%,
			transparent
		);
	}

	.wheel::before {
		position: absolute;
		z-index: -1;
		top: 0;
		bottom: 0;
		left: 50%;
		width: var(--item);
		border-radius: var(--ss-radius-md);
		background: linear-gradient(to bottom, color-mix(in oklab, var(--pick) 6%, transparent), color-mix(in oklab, var(--pick) 26%, transparent));
		/* Lifted a little: a soft shadow in the pick's colour, over SS's card shadow so it shows on dark too. */
		box-shadow:
			0 2px 6px color-mix(in oklab, var(--pick) 22%, transparent),
			var(--ss-shadow-card);
		content: '';
		translate: -50% 0;
	}

	.strip {
		display: flex;
		padding-inline: calc(50% - var(--item) / 2);
		overflow-x: auto;
		overscroll-behavior-x: contain;
		scroll-snap-type: x mandatory;
		scrollbar-width: none;
		/* The ends fade away, as a wheel turns out of sight; the lens, outside the strip, stays whole. */
		mask-image: linear-gradient(to right, transparent, currentcolor 30%, currentcolor 70%, transparent);
	}

	.strip::-webkit-scrollbar {
		display: none;
	}

	label {
		position: relative;
		display: grid;
		flex: none;
		place-items: center;
		width: var(--item);
		height: 2.5rem;
		scroll-snap-align: center;
		color: var(--ss-tx-2);
		font-size: var(--ss-text-xs);
		font-variant-numeric: tabular-nums;
		cursor: pointer;
		transition: color var(--ss-dur-small) var(--ss-ease-out);
	}

	/* A ruler's tick under each number: fuller as the value grows (or the further from zero). */
	label::after {
		position: absolute;
		bottom: 3px;
		left: 50%;
		width: var(--ss-hairline);
		height: 5px;
		background: color-mix(in oklab, var(--tone) calc(25% + var(--k) * 75%), transparent);
		content: '';
	}

	.neg {
		--tone: var(--ss-danger);
	}

	.pos {
		--tone: var(--ss-tip);
	}

	.zero {
		--tone: var(--ss-tx-3);
	}

	input {
		position: absolute;
		inset: 0;
		margin: 0;
		opacity: 0;
		cursor: pointer;
	}

	/* The pick grows into place and the one it left settles back, where motion is allowed. */
	@media (prefers-reduced-motion: no-preference) {
		label {
			transition:
				color var(--ss-dur-small) var(--ss-ease-out),
				font-size var(--ss-dur-small) var(--ss-ease-out);
		}
	}

	/* One away from the pick, then the pick: bigger and surer toward the lens. */
	label:has(+ label input:checked),
	label:has(input:checked) + label {
		font-size: var(--ss-text-sm);
	}

	label:has(input:checked) {
		color: var(--ss-tx);
		font-size: var(--ss-text-lg);
		font-weight: 700;
	}

	label:has(input:checked)::after {
		height: 8px;
		background: var(--pick);
	}

	@media (hover: hover) {
		label:hover {
			color: var(--ss-tx);
		}
	}

	label:has(input:focus-visible) {
		outline: var(--ss-focus-ring);
		outline-offset: calc(var(--ss-focus-offset) * -1);
		border-radius: var(--ss-radius-md);
	}

	@media (pointer: coarse) {
		label {
			height: var(--ss-tap-target);
		}
	}
</style>
