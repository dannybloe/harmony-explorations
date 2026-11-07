/**
 * Where Logitech's compiler puts the items of a screen page whose buttons sit at the corners of the display,
 * per architecture: which button is which corner, the order a page stores them in, where a label goes and which
 * corner a drawn line belongs to.
 *
 * **A reader's table**, plan 007's one exception: reading a compiled screen is per architecture by nature, so the
 * architecture is looked up here, once, and never tested inline. Only arch 14 (Harmony 600, 650 and 700) has an
 * entry, every figure measured on its four user configurations, section 285; the Harmony One's screen is a touch
 * screen whose rows are found another way, and every other architecture has none. The Harmony 880 and 885's keys
 * beside the screen are read through a smaller table beside this one, `SIDE_KEY_GRIDS`, which holds only what a
 * reader pairs labels by. The four slot family's builders
 * take the same entry through `families/four-slot/geometry.ts`, so that a page they compose is one the compiler
 * could have written, and so that the layout has one home rather than a reader's copy and a builder's.
 *
 * Moved here out of `inventory.ts` by `todo-compile-one.md` 3.3.3.6, where its names said which family it was.
 */
import type { PerArchitecture } from './gspm.ts';

/** One item of a corner page: the button's scan and the cell it sits in. */
export interface CornerItem {
  readonly scan: number;
  readonly column: 0 | 1;
  readonly row: 0 | 1;
}

/** One architecture's corner layout. */
export interface CornerLayout {
  /**
   * The four items, in the order a page fills them: top left, top right, bottom left, bottom right. Every page of
   * a device list or a device mode binds a prefix of this order, 184 of 184, and holds four but the last of its mode
   * and one page of the 700s' receiver mode. The scans are the buttons' own, the screen being no touch screen.
   */
  readonly items: readonly CornerItem[];
  /**
   * The order a page's tagged list **stores** the scans in, which is not the order they fill: bottom left, top
   * left, bottom right, top right, with a scan the page does not bind left out. All 184 pages store theirs this
   * way, full ones as 9, 8, 34, 2 and a three item one as 9, 8, 2. The firmware searches a list for a tag, so
   * nothing says the order matters to the remote; a composer keeps it so that a page is one the compiler could
   * have written.
   */
  readonly storedOrder: readonly number[];
  /**
   * Where a label sits. A left label starts at `leftX` and a right one **ends** at `rightEnd`, whatever its font,
   * 448 of 448 and 414 of 414 on the corner pages of the device lists and device modes, where the start moves
   * with the width. In the top row a one line label sits at `labelY[0]` whatever its font, and a two line label
   * starts at 25 with its second line one font height below, which is 40 again in the usual font; the bottom row
   * is 50 lower.
   */
  readonly leftX: number;
  readonly rightEnd: number;
  readonly labelY: readonly [number, number];
  /**
   * The second layout a device list takes: **two rows**, a device per row bound to both buttons of that row, its
   * label centred, at `x = floor((screenWidth - width) / 2)` on 21 of 21 such labels, and at these two ys. One
   * device list menu per configuration is drawn this way, beside the corner ones.
   */
  readonly twoRowLabelY: readonly [number, number];
  readonly screenWidth: number;
  /** The scans of each row, top then bottom, as `items` places them. */
  readonly rows: readonly (readonly number[])[];
  /** The vertical bands the two rows' labels fall in: from the title bar's end, between the rows, to the bar. */
  readonly rowBands: readonly [number, number, number];
  /** The x that divides the left column's labels from the right column's. */
  readonly columnSplit: number;
}

/** A layout from its items, the rows derived from them so that the two cannot disagree. */
function layout(spec: Omit<CornerLayout, 'rows'>): CornerLayout {
  return { ...spec, rows: [0, 1].map((row) => spec.items.filter((item) => item.row === row).map((item) => item.scan)) };
}

/** The corner layouts, by architecture. Section 285. */
export const CORNER_LAYOUTS: PerArchitecture<CornerLayout> = {
  14: layout({
    items: [
      { scan: 8, column: 0, row: 0 },
      { scan: 2, column: 1, row: 0 },
      { scan: 9, column: 0, row: 1 },
      { scan: 34, column: 1, row: 1 },
    ],
    storedOrder: [9, 8, 34, 2],
    leftX: 3,
    rightEnd: 125,
    labelY: [40, 90],
    twoRowLabelY: [35, 79],
    screenWidth: 128,
    rowBands: [16, 64, 112],
    columnSplit: 64,
  }),
};

/** The corner layout of an architecture, or undefined for one whose screens are not laid out at corners. */
export function cornerLayoutOf(architecture: number | undefined): CornerLayout | undefined {
  return architecture === undefined ? undefined : CORNER_LAYOUTS[architecture];
}

/**
 * The corner a line drawn at `(x, y)` belongs to, as an index into the layout's `items`, or undefined for a line
 * above or below the two label rows, which is the title, the page counter and the bottom word. One place, because
 * the reader pairs labels with rows by it and a composer moves a label from one corner to another by it.
 */
export function cornerCellAt(of: CornerLayout, x: number, y: number): number | undefined {
  return gridCellAt(of, x, y);
}

/**
 * What a reader needs to pair a page's drawn labels with the keys its rows are bound to, and nothing a builder
 * needs: which key sits in which cell, the vertical bands the rows' labels fall in, and the x dividing the two
 * columns. A corner layout is one, with two rows; the Harmony 880 and 885's keys beside the screen are another,
 * with four, `SIDE_KEY_GRIDS`.
 *
 * **Why a second shape rather than a second corner layout.** `CornerLayout` carries what the four slot family's
 * builders place labels by, a label's x and y, the two row list's centring and the screen width, and every one of
 * those is measured on the Harmony 600, 650 and 700 alone. Filling them in for the 885 would state builder facts
 * nobody has measured there; the reader needs only the cells, so the reader's table holds only the cells.
 */
export interface LabelGrid {
  /** Every key of the grid with its cell, column 0 the left, row 0 the top. */
  readonly items: readonly { readonly scan: number; readonly column: number; readonly row: number }[];
  /** The bands the rows' labels fall in, top to bottom: one more boundary than there are rows. */
  readonly rowBands: readonly number[];
  /** The x that divides the left column's labels from the right column's. */
  readonly columnSplit: number;
}

/**
 * The cell a line drawn at `(x, y)` belongs to, as an index into the grid's `items`, or undefined for a line
 * outside every row band, which is the title, the page counter and the bottom word. `cornerCellAt` is this on a
 * corner layout, whose three boundaries make two rows, so the one rule serves both shapes.
 */
export function gridCellAt(of: LabelGrid, x: number, y: number): number | undefined {
  const last = of.rowBands.length - 1;
  const row = of.rowBands.findIndex((top, k) => k < last && y >= top && y < (of.rowBands[k + 1] as number));
  if (row < 0) return undefined;
  const column = x < of.columnSplit ? 0 : 1;
  return of.items.findIndex((one) => one.row === row && one.column === column);
}

/**
 * The keys beside the screen, for an architecture whose screen keys are not at its corners: the Harmony 880 and
 * 885, arch 8, eight keys in two columns of four.
 *
 * **Every figure is a measurement, and none is fitted to the device list it serves.** The scans and their cells are
 * the reference's, `reference/remotes/harmony-885/keys.md` "The keys beside the screen": the left column 5, 6, 7
 * and 8 and the right column 45, 46, 48 and 44, top to bottom, read off one configuration's activity menu, section
 * 128, and pressed on a unit in that order. The bands follow from the label rows the same section measured, a one
 * line label at y 42, 74, 106 and 138 and a two line label starting 13 higher: each band runs from 16, below the
 * title at 10, in steps of the 32 pixel row pitch, so the last ends at 144, above the page counter at 152. The
 * split is the middle of the 128 pixel panel, the left labels starting at 3 and the right ones at 66 or beyond on
 * every arch 8 device list page in the corpus, `packages/codec/test/arch8devicelist.test.ts`, which also holds that
 * every line those pages draw falls in a band or is the title or the counter.
 *
 * Measured on the Harmony 885's keys and on the configurations of both the 880 and the 885, which run one
 * application; the 880's keys were not pressed, and its compiles lay their lists out the same way.
 */
export const SIDE_KEY_GRIDS: PerArchitecture<LabelGrid> = {
  8: {
    items: [
      { scan: 5, column: 0, row: 0 },
      { scan: 45, column: 1, row: 0 },
      { scan: 6, column: 0, row: 1 },
      { scan: 46, column: 1, row: 1 },
      { scan: 7, column: 0, row: 2 },
      { scan: 48, column: 1, row: 2 },
      { scan: 8, column: 0, row: 3 },
      { scan: 44, column: 1, row: 3 },
    ],
    rowBands: [16, 48, 80, 112, 144],
    columnSplit: 64,
  },
};

/**
 * The grid a reader pairs a key page's labels by, for an architecture whose screen keys sit in cells: its side key
 * grid where it has one, else its corner layout, else undefined, the Harmony One's touch rows among them, which
 * pair by rank instead. A lookup in two tables rather than a test of the architecture, plan 007.
 */
export function labelGridOf(architecture: number | undefined): LabelGrid | undefined {
  if (architecture === undefined) return undefined;
  return SIDE_KEY_GRIDS[architecture] ?? CORNER_LAYOUTS[architecture];
}
