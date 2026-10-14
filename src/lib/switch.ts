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
 * Change what is on screen. Where the browser has View Transitions (SS: native
 * motion first), what leaves fades out as what comes fades in (app.css); elsewhere
 * it changes at once. Resolves once the change is up and the fade has finished.
 */
async function transition(change: () => void): Promise<void> {
	const update = async () => {
		change();
		await tick();
	};
	if (document.startViewTransition) await document.startViewTransition(update).finished.catch(() => {});
	else await update();
}

async function show(to: Screen): Promise<void> {
	const at = next ?? store;
	if (to.view === at.view && to.active === at.active) return;
	next = to;
	try {
		await transition(() => {
			store.view = to.view;
			store.active = to.active;
		});
	} finally {
		if (next === to) next = null;
	}
}

/** Show a model's panel, from the tabs, the scoreboard or the map. */
export const switchModel = (id: ModelId) => show({ view: 'models', active: id });

/** Show the model panels or the decision map. */
export const switchView = (view: View) => show({ view, active: (next ?? store).active });

/** Put another decision in place (a new one, or the demo), fading like a switch. */
export const replace = transition;
