import type { AnyModel } from '../model';
import { coinFlip } from './coin-flip';
import { fishbone } from './fishbone';
import { matrix } from './matrix';
import { premortem } from './premortem';
import { prosCons } from './pros-cons';
import { sixHats } from './six-hats';

/**
 * The model registry. Order = tab order and scoreboard column order.
 * To add a model: create `my-model.ts` (+ test) in this folder and list it here.
 */
export const models: readonly AnyModel[] = [sixHats, matrix, prosCons, premortem, fishbone, coinFlip];
