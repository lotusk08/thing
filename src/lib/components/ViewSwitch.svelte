<script lang="ts">
	import { store } from '$lib/state.svelte';
	import { switchView } from '$lib/switch';
	import Icon from './Icon.svelte';
</script>

<div class="ss-segment" role="group" aria-label="View">
	<button type="button" aria-pressed={store.view === 'models'} onclick={() => switchView('models')}>
		<Icon name="bullet-list" /> Models
	</button>
	<button type="button" aria-pressed={store.view === 'map'} onclick={() => switchView('map')}>
		<Icon name="mindmap" /> Map
	</button>
</div>

<style>
	.ss-segment {
		margin-bottom: var(--ss-space-3);
	}
</style>
