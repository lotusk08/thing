/**
 * A one-line text that wraps: a textarea that grows to fit its words, so nothing
 * is ever cut off, and takes no new lines. Enter submits its form, as a one-line
 * input does (the map's sheet closes on it); a pasted break becomes a space.
 * Pass the value so a change from elsewhere (the map's sheet, a reset) refits it.
 */
export function grow(el: HTMLTextAreaElement, _value?: unknown) {
	let width = 0;
	const fit = () => {
		el.style.height = 'auto';
		el.style.height = `${el.scrollHeight + el.offsetHeight - el.clientHeight}px`;
	};
	const unbreak = () => {
		if (!/\n/.test(el.value)) return;
		el.value = el.value.replace(/\s*\n\s*/g, ' ');
		el.dispatchEvent(new Event('input', { bubbles: true }));
	};
	const keydown = (e: KeyboardEvent) => {
		if (e.key !== 'Enter' || e.isComposing) return;
		e.preventDefault();
		el.form?.requestSubmit();
	};
	// Rewrap when the width changes; the height it sets doesn't call it again.
	const ro = new ResizeObserver(([entry]) => {
		const w = entry?.contentRect.width ?? 0;
		if (w === width) return;
		width = w;
		fit();
	});
	el.addEventListener('input', unbreak);
	el.addEventListener('input', fit);
	el.addEventListener('keydown', keydown);
	ro.observe(el);
	fit();
	return {
		update: () => requestAnimationFrame(fit),
		destroy() {
			el.removeEventListener('input', unbreak);
			el.removeEventListener('input', fit);
			el.removeEventListener('keydown', keydown);
			ro.disconnect();
		}
	};
}
