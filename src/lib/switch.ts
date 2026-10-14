import { tick } from 'svelte';
import type { ModelId } from './core/types';
import { store, type View } from './state.svelte';

interface Screen {
	view: View;
	active: ModelId;
}

/** What a switch still in flight will show; the screen lags it by a frame or two. */
let next: Screen | null = null;

/**
 * Show another screen. Where the browser has View Transitions (SS: native motion
 * first), what leaves fades out as what comes fades in (app.css); elsewhere it
 * switches at once. Resolves once the new screen is up and the fade has finished.
 */
async function show(to: Screen): Promise<void> {
	const at = next ?? store;
	if (to.view === at.view && to.active === at.active) return;
	next = to;
	const update = async () => {
		store.view = to.view;
		store.active = to.active;
		await tick();
	};
	try {
		if (document.startViewTransition) await document.startViewTransition(update).finished.catch(() => {});
		else await update();
	} finally {
		if (next === to) next = null;
	}
}

/** Show a model's panel, from the tabs, the scoreboard or the map. */
export const switchModel = (id: ModelId) => show({ view: 'models', active: id });

/** Show the model panels or the decision map. */
export const switchView = (view: View) => show({ view, active: (next ?? store).active });
