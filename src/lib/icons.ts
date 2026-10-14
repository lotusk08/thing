/**
 * Just the SS icons this app draws, from the package's single-file SVGs
 * (`ss/icons/<set>/<name>.svg`), so the bundle doesn't carry both full sets.
 * The single files are SS's `icon()` output without its class and aria
 * attributes; `prepare()` puts them back the way `icon()` writes them.
 */
import type { Confidence } from './core/types';
import bulletList from 'ss/icons/line/bullet-list.svg?raw';
import check from 'ss/icons/line/check.svg?raw';
import chevronDown from 'ss/icons/line/chevron-down.svg?raw';
import chevronRight from 'ss/icons/line/chevron-right.svg?raw';
import chevronUp from 'ss/icons/line/chevron-up.svg?raw';
import close from 'ss/icons/line/close.svg?raw';
import copy from 'ss/icons/line/copy.svg?raw';
import lightbulb from 'ss/icons/line/lightbulb.svg?raw';
import mindmap from 'ss/icons/line/mindmap.svg?raw';
import plus from 'ss/icons/line/plus.svg?raw';
import refresh from 'ss/icons/line/refresh.svg?raw';
import trash from 'ss/icons/line/trash.svg?raw';
import noteInfo from 'ss/icons/solid/circle-exclamation.svg?raw';
import noteTip from 'ss/icons/solid/lightbulb.svg?raw';
import noteWarning from 'ss/icons/solid/triangle-exclamation.svg?raw';

const prepare = (svg: string, set: 'line' | 'solid') =>
	svg
		.replace(' xmlns="http://www.w3.org/2000/svg"', '')
		.replace(' width="24" height="24"', ' width="1em" height="1em"')
		.replace('<svg ', `<svg class="ss-icon ${set}" aria-hidden="true" focusable="false" `);

const line = {
	'bullet-list': bulletList,
	check,
	'chevron-down': chevronDown,
	'chevron-right': chevronRight,
	'chevron-up': chevronUp,
	close,
	copy,
	lightbulb,
	mindmap,
	plus,
	refresh,
	trash
};
/** SS's note icons (`notes` in `ss/icons`), by note type. */
const solid = { 'note-tip': noteTip, 'note-info': noteInfo, 'note-warning': noteWarning };

export type IconName = keyof typeof line | keyof typeof solid;

export const icons = Object.fromEntries([
	...Object.entries(line).map(([name, svg]) => [name, prepare(svg, 'line')]),
	...Object.entries(solid).map(([name, svg]) => [name, prepare(svg, 'solid')])
]) as Record<IconName, string>;

/** A confidence reads as one of SS's note families, with that note's icon. */
export const NOTES = {
	high: { type: 'tip', icon: 'note-tip' },
	medium: { type: 'info', icon: 'note-info' },
	low: { type: 'warning', icon: 'note-warning' }
} as const satisfies Record<Confidence, { type: string; icon: IconName }>;
