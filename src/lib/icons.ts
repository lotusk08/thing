/**
 * Just the SS icons this app draws, from the package's single-file SVGs
 * (`ss/icons/<set>/<name>.svg`), so the bundle doesn't carry both full sets.
 * The single files are SS's `icon()` output without its class and aria
 * attributes; `prepare()` puts them back the way `icon()` writes them.
 */
import check from 'ss/icons/line/check.svg?raw';
import chevronDown from 'ss/icons/line/chevron-down.svg?raw';
import chevronRight from 'ss/icons/line/chevron-right.svg?raw';
import chevronUp from 'ss/icons/line/chevron-up.svg?raw';
import close from 'ss/icons/line/close.svg?raw';
import copy from 'ss/icons/line/copy.svg?raw';
import plus from 'ss/icons/line/plus.svg?raw';
import refresh from 'ss/icons/line/refresh.svg?raw';
import circleExclamation from 'ss/icons/solid/circle-exclamation.svg?raw';
import lightbulb from 'ss/icons/solid/lightbulb.svg?raw';
import triangleExclamation from 'ss/icons/solid/triangle-exclamation.svg?raw';

const prepare = (svg: string, set: 'line' | 'solid') =>
	svg
		.replace(' xmlns="http://www.w3.org/2000/svg"', '')
		.replace(' width="24" height="24"', ' width="1em" height="1em"')
		.replace('<svg ', `<svg class="ss-icon ${set}" aria-hidden="true" focusable="false" `);

const line = { check, 'chevron-down': chevronDown, 'chevron-right': chevronRight, 'chevron-up': chevronUp, close, copy, plus, refresh };

export type IconName = keyof typeof line;

export const icons = Object.fromEntries(
	Object.entries(line).map(([name, svg]) => [name, prepare(svg, 'line')])
) as Record<IconName, string>;

/** SS's note icons (`notes` in `ss/icons`): tip, info and warning are the ones used here. */
const NOTE_ICONS = { tip: lightbulb, info: circleExclamation, warning: triangleExclamation };

export type NoteType = keyof typeof NOTE_ICONS;

export const noteIcons = Object.fromEntries(
	Object.entries(NOTE_ICONS).map(([type, svg]) => [
		type,
		`<span class="ss-note-icon" aria-hidden="true">${prepare(svg, 'solid')}</span>`
	])
) as Record<NoteType, string>;
