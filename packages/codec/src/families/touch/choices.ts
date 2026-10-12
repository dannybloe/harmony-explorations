/**
 * Every choice of ours the touch family makes, the Harmony One, with the value it had as a constant before
 * `todo-compile-650.md` 10.7.3 as its default. The rule that sorts a constant here rather than into the
 * module using it is `four-slot/choices.ts`'s: nothing on a remote or in Logitech's compiles fixes it.
 *
 * One survives the sort. The row fonts `menus.ts` keeps are the corpus's own, font 9 for a device page's
 * rows and font 7 for a menu's; the title is where this project departs from it.
 */
import type { CommonChoices } from '../family.ts';

export interface TouchChoices extends CommonChoices {
  /**
   * The font a composed device page's title is drawn in, as a base slot 7 index. The corpus titles its
   * device modes with font 10, which carries only the glyphs the existing titles use, so a new title would
   * be refused for most words; font 9, the row font, is the same height and the one set that carries the
   * whole alphabet the configuration draws anywhere.
   */
  readonly deviceTitleFont: number;
}

export const TOUCH_CHOICES: TouchChoices = { deviceTitleFont: 9 };
