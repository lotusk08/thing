import { tick } from 'svelte';
import { store } from './state.svelte';

/** The model a switch still in flight will show; the screen lags it by a frame or two. */
let next: string | null = null;

/**
 * Show another model. Where the browser has View Transitions (SS: native motion
 * first), the old panel fades out as the new one fades in (app.css); elsewhere
 * it switches at once. Resolves once the new panel is on screen and the fade
 * has finished.
 */
export async function switchModel(id: string): Promise<void> {
	if (id === (next ?? store.active)) return;
	next = id;
	const update = async () => {
		store.active = id;
		await tick();
	};
	try {
		if (document.startViewTransition) await document.startViewTransition(update).finished.catch(() => {});
		else await update();
	} finally {
		if (next === id) next = null;
	}
}
