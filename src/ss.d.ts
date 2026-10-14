// Types for the parts of the `ss` design system (github:lotusk08/ss) this app uses.
declare module 'ss/mode' {
	export type Mode = 'light' | 'dark';
	export function initMode(): Mode;
	export function toggleMode(): Mode;
}

declare module 'ss/motion' {
	/** Bring in an element that comes (`.ss-move`), with its motion, from hidden. */
	export function enter(el: Element): void;
	/** Take out an element that goes (`.ss-move`); resolves once its motion has ended. */
	export function leave(el: Element, options?: { remove?: boolean }): Promise<void>;
}

declare module 'ss/icons' {
	/** The mode button's disc-to-crescent SVG; one clip id per button. */
	export function modeIcon(id?: string): string;
}

declare module 'ss/css';
declare module 'ss/fonts.css';
declare module 'ss/base.css';
declare module 'ss/icons.css';
declare module 'ss/ui.css';
declare module 'ss/motion.css';
