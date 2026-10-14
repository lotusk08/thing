// Types for the parts of the `ss` design system (github:lotusk08/ss) this app uses.
declare module 'ss/mode' {
	export type Mode = 'light' | 'dark';
	export function initMode(): Mode;
	export function toggleMode(): Mode;
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
