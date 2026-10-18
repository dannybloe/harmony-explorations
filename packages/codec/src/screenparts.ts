/**
 * A built screen program as parts, before it is spelled as bytes, and the one encoder that spells them: a picture
 * filling the screen, a queued program, a bar, a font, a text inline or by reference, and the end.
 *
 * Shared, since `todo-compile-one.md` 3.3.3.2: every instruction is `screen.ts`' own, the same on every
 * architecture a screen program is read on, and the one place is the picture filling the screen, drawn from the
 * top left corner. The parts are the four slot family's menus' and screens' (the Harmony 600, 650 and 700), and
 * `recordBuilding` in `screenrecords.ts` spells a record's programs through it for any family; it lived in that
 * family's `menus.ts`, which kept `screenrecords.ts` importing a family to build any record.
 */
import {
  SCREEN_DRAW_IMAGE, SCREEN_DRAW_IMAGE_AT, SCREEN_END, SCREEN_QUEUE_INSTRUCTION, SCREEN_SELECT_FONT, SCREEN_TEXT_AT,
  SCREEN_TEXT_INLINE,
} from './screen.ts';
import { RUN_SCREEN_PROGRAM } from './inventory.ts';

/** Where a picture the size of the screen is drawn from: its top left corner. */
export const WHOLE_SCREEN_AT: readonly number[] = [0, 0];

/** One instruction of a built menu page, before it is spelled as bytes. */
export type MenuPart =
  | { op: 'image'; address: number }
  | { op: 'queue'; program: number }
  | { op: 'bar'; at: readonly number[]; address: number }
  | { op: 'font'; font: number }
  | { op: 'text'; x: number; y: number; codes: number[]; role: 'title' | 'counter' | 'label' | 'bottom' | 'fixed' }
  | { op: 'end' };

/**
 * The one encoder of a built page's parts, which the four slot family's `menuPageBytes` and the
 * screen records of `screenrecords.ts`, section 356, both spell through. `home` gives the value a text is drawn by
 * reference to, or undefined to draw it inline; `address` spells a three byte address field for a
 * value at byte `at` of the program, for the part it belongs to, which is how a caller that writes addresses itself and a caller
 * that leaves them to the frame as references share it; `inline`, where given, is told where an inline
 * text's glyph codes start, which is the address a later text drawing the same codes points at.
 */
export function menuPartsBytes(
  parts: readonly MenuPart[],
  home: (part: Extract<MenuPart, { op: 'text' }>) => number | undefined,
  address: (value: number, at: number, part: MenuPart) => readonly number[],
  inline?: (part: Extract<MenuPart, { op: 'text' }>, at: number) => void,
): Uint8Array {
  const out: number[] = [];
  for (const part of parts) {
    if (part.op === 'image') {
      out.push(SCREEN_DRAW_IMAGE, ...WHOLE_SCREEN_AT);
      out.push(...address(part.address, out.length, part));
    } else if (part.op === 'queue') {
      out.push(SCREEN_QUEUE_INSTRUCTION, part.program & 0xff, part.program >> 8, RUN_SCREEN_PROGRAM);
    } else if (part.op === 'bar') {
      out.push(SCREEN_DRAW_IMAGE_AT, ...part.at);
      out.push(...address(part.address, out.length, part));
    } else if (part.op === 'font') {
      out.push(SCREEN_SELECT_FONT, part.font);
    } else if (part.op === 'end') {
      out.push(SCREEN_END);
    } else {
      const target = home(part);
      if (target === undefined) {
        out.push(SCREEN_TEXT_INLINE, part.x, part.y);
        inline?.(part, out.length);
        out.push(...part.codes, 0);
      } else {
        out.push(SCREEN_TEXT_AT, part.x, part.y);
        out.push(...address(target, out.length, part));
      }
    }
  }
  return new Uint8Array(out);
}
