<script lang="ts">
	import { icons, type IconName } from '$lib/icons';

	let { name }: { name: IconName } = $props();
</script>

<!-- eslint-disable-next-line svelte/no-at-html-tags -- SS's own SVG (icons.ts), never user input -->
{@html icons[name]}
