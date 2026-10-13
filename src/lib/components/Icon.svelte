<script lang="ts">
	import { icons, type IconName } from '$lib/icons';

	let { name }: { name: IconName } = $props();
</script>

{@html icons[name]}
