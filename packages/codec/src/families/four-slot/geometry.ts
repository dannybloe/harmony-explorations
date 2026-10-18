/**
 * The four slot family's screen layout: the corner layout Logitech's compiler uses on the Harmony 600, 650 and
 * 700, under the names the family's builders use. The figures themselves live once, in the reader's table
 * `CORNER_LAYOUTS` in `cornerlayout.ts`, which reads Logitech's pages with them; these are handles onto that
 * entry and hold nothing of their own. `todo-compile-one.md` 3.3.3.6.
 */
import { CORNER_LAYOUTS, cornerCellAt } from '../../cornerlayout.ts';
import type { CornerLayout } from '../../cornerlayout.ts';

/** The family's architecture's entry; the table is a reader's, keyed by architecture, and this family is arch 14's. */
export const FOUR_SLOT_LAYOUT: CornerLayout = CORNER_LAYOUTS[14] as CornerLayout;

/** The four items in the order a page fills them, `CornerLayout.items`. */
export const FOUR_SLOT_ITEMS = FOUR_SLOT_LAYOUT.items;
/** The order a page's tagged list stores the scans in, `CornerLayout.storedOrder`. */
export const FOUR_SLOT_STORED_ORDER = FOUR_SLOT_LAYOUT.storedOrder;
/** Where a left label starts, a right one ends, and the two rows' label ys, `CornerLayout`. */
export const FOUR_SLOT_LEFT_X = FOUR_SLOT_LAYOUT.leftX;
export const FOUR_SLOT_RIGHT_END = FOUR_SLOT_LAYOUT.rightEnd;
export const FOUR_SLOT_LABEL_Y = FOUR_SLOT_LAYOUT.labelY;
/** The two row device list's label ys, `CornerLayout.twoRowLabelY`. */
export const TWO_ROW_LABEL_Y = FOUR_SLOT_LAYOUT.twoRowLabelY;
export const FOUR_SLOT_SCREEN_WIDTH = FOUR_SLOT_LAYOUT.screenWidth;
/** The two scans of each row, top then bottom. */
export const FOUR_SLOT_ROWS = FOUR_SLOT_LAYOUT.rows;

/** The corner a line drawn at `(x, y)` belongs to, `cornerCellAt` on this family's layout. */
export function fourSlotCellAt(x: number, y: number): number | undefined {
  return cornerCellAt(FOUR_SLOT_LAYOUT, x, y);
}
