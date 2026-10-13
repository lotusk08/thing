<!-- The Things wordmark (scripts/logo.js): ink in --ss-tx, the i's dot in --ss-accent. -->
<script lang="ts">
	import { wordmark } from '$lib/logo';
</script>

<svg class="wordmark" viewBox={wordmark.viewBox} aria-hidden="true" focusable="false">
	<path class="ink" d={wordmark.ink} />
	<path class="dot" d={wordmark.dot} />
</svg>

<style>
	.wordmark {
		display: block;
		width: auto;
		height: 1.4rem;
		overflow: visible;
	}

	.ink {
		fill: var(--ss-tx);
	}

	.dot {
		fill: var(--ss-accent);
	}
</style>
