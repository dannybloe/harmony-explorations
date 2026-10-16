/**
 * The Harmony One's device mode in our look, decision 24, `todo-compile-one.md` 1.2.11.2: the pads of every
 * device page and the rows of the device list drawn as our flat boxes in `TouchChoices.deviceBox`, and every
 * icon a device list row wears drawn by us for the device's type. Asked for on 16 October 2026, alongside the
 * activity boxes, so that a label's letters can be smoothed against the one colour behind them, which
 * Logitech's gradient boxes do not have.
 *
 * **It repoints and does not rebuild.** Every device page draws Logitech's pad pictures, one per place, and
 * every device list row its row picture and, where it has one, an icon a pixel in from the row's corner. Each
 * of those draws is pointed at a picture of ours added to the bank, which changes the draw's three address
 * bytes and nothing else, so no program moves and the pages composed onto the configuration and the donor's
 * own are recoloured alike. Logitech's pictures are left in the bank, drawn by nothing.
 *
 * Which pictures are pads is read, not tabulated: whatever a device mode's page draws at one of the six pad
 * places, `DEVICE_PAGE_SLOTS`. On the six Harmony One configurations measured those are pictures that nothing
 * but a device page draws, and only at that place, which is refused otherwise, since repointing a picture a
 * help screen also draws would recolour the help screen.
 */
import { u24 } from '../../bytes.ts';
import { Writer } from '../../emit.ts';
import { type Container, parse } from '../../gspm.ts';
import { deviceListRows, deviceModeMaps, devices } from '../../inventory.ts';
import { picturesByContent, withBankPictures } from '../../pictures.ts';
import { contentKey } from '../../screencategories.ts';
import { renderProgram, renderVariants, type TextDrawn } from '../../render.ts';
import { reachablePrograms, SCREEN_CALL, SCREEN_DRAW_IMAGE, type ScreenInstruction, screenProgram } from '../../screen.ts';
import { modeRecords } from '../../sections.ts';
import { ComposeError, restamped } from '../../shared/core.ts';
import {
  ACTIVITY_ROW_SIZE, activityPadBox, activityRowBox, activityRowIcon, colourBehind,
} from './activitypictures.ts';
import { activityPadBehind, activityTitleFont, headerCounterFont } from './activityscreen.ts';
import type { TouchChoices } from './choices.ts';
import {
  DEVICE_PAGE_SLOTS, MENU_COUNTER_XY, MENU_ICON_OFFSET, MENU_ROW1_BG, MENU_ROW_PITCH, MENU_ROW_SCAN, MODE_TITLE_X, MODE_TITLE_Y,
} from './menus.ts';

/** How many appearances of a page are drawn to find its header's selects. */
const HEADER_VARIANTS = 16;

/** How many rows a device list page holds, which is how many row places are looked at. */
const LIST_ROWS = 3;

/** One draw of a picture: where its address field is and what it draws. */
interface Draw {
  /** Blob offset of the instruction. */
  at: number;
  x: number;
  y: number;
  picture: number;
}

/** Every picture draw of every program the configuration reaches, once each. */
function everyDraw(c: Container): Draw[] {
  const out: Draw[] = [];
  for (const program of reachablePrograms(c).values()) {
    for (const one of program) {
      if (one.opcode !== SCREEN_DRAW_IMAGE) continue;
      out.push({ at: one.start, x: one.operands[0] as number, y: one.operands[1] as number, picture: u24(one.operands, 2) });
    }
  }
  return [...new Map(out.map((one) => [one.at, one])).values()];
}

/** The draws of the programs a page runs, its own and the chrome it calls, following its transfers. */
function pageDraws(c: Container, program: number): Draw[] {
  const out: Draw[] = [];
  const roots = [program];
  for (const one of screenProgram(c, program) ?? []) {
    if (one.opcode === SCREEN_CALL && one.targets[0] !== undefined) roots.push(one.targets[0]);
  }
  for (const found of reachablePrograms(c, roots).values()) {
    for (const one of found) {
      if (one.opcode === SCREEN_DRAW_IMAGE) {
        out.push({ at: one.start, x: one.operands[0] as number, y: one.operands[1] as number, picture: u24(one.operands, 2) });
      }
    }
  }
  return out;
}

/** The pixels a page's chrome draws, which is the background the device list's rows sit on. */
function chromePixels(c: Container, program: readonly ScreenInstruction[]): number[][] {
  const call = program.find((one) => one.opcode === SCREEN_CALL);
  const raster = call?.targets[0] === undefined ? undefined : renderProgram(c, call.targets[0])?.raster;
  if (raster === undefined) throw new ComposeError('a device list page calls no chrome to read its background off');
  return Array.from({ length: raster.height }, (_, y) => Array.from({ length: raster.width },
    (__, x) => raster.pixels[y * raster.width + x] as number));
}

/**
 * The configuration with its device mode in our look, per the header. `iconFor` names the icon of the icon
 * font, `icons.ts`, a device's row wears, by the device's name as the configuration states it; a device it
 * returns undefined for wears `TouchChoices.otherDeviceIcon`. A row Logitech drew without an icon stays
 * without one, since drawing one would move its label.
 */
export function withTouchDeviceLook(
  c: Container, choices: TouchChoices, iconFor: (name: string | undefined) => string | undefined,
): Container {
  // 1. Our pictures, in the bank first, so every draw below is read where it now is: the bank sits in front
  // of the programs and growing it moves them.
  const found = deviceLookDraws(c, choices, iconFor);
  const pad = activityPadBox(choices.deviceBox, activityPadBehind(c));
  const behind = found.rowBehind ?? activityPadBehind(c);
  const rowBox = activityRowBox(choices.deviceBox, behind);
  const icons = new Map([...new Set(found.rows.flatMap((one) => (one.icon === undefined ? [] : [one.icon])))]
    .map((icon) => [icon, activityRowIcon(choices.deviceBox, behind, icon, choices.activityIconGrid.row)] as const));
  const grown = withBankPictures(c, [pad, rowBox, ...icons.values()]).container;
  const held = picturesByContent(grown);
  const addressOf = (bytes: Uint8Array): number => {
    const address = held.get(contentKey(bytes))?.[0];
    if (address === undefined) throw new ComposeError('a picture of ours left the bank');
    return address;
  };

  // 2. Every draw pointed at its own, read again off the grown configuration.
  const again = deviceLookDraws(grown, choices, iconFor);
  const bytes = Uint8Array.from(grown.blob);
  const point = (draw: Draw, to: number): void => { bytes.set(new Writer(3).u24(to).bytes, draw.at + 3); };
  for (const draw of again.pads) point(draw, addressOf(pad));
  for (const one of again.rows) point(one.draw, one.icon === undefined ? addressOf(rowBox) : addressOf(icons.get(one.icon) as Uint8Array));
  // The header's title in the activity title's font and its page count in the copy of the count's font in
  // that colour, where the font step added one, `headerCounterFont`.
  const fonts = { title: activityTitleFont(grown), counter: headerCounterFont(grown) };
  for (const select of again.headerSelects) {
    const font = fonts[select.role];
    if (font !== undefined) bytes[select.at + 1] = font;
  }
  return parse(restamped(bytes));
}

/**
 * The draws `withTouchDeviceLook` points at pictures of ours: every pad a device page draws, every device list
 * row's background and icon with the icon its device wears, and the colour the rows sit on.
 */
function deviceLookDraws(
  c: Container, choices: TouchChoices, iconFor: (name: string | undefined) => string | undefined,
): {
  pads: Draw[]; rows: { draw: Draw; icon?: string }[]; rowBehind: number | undefined;
  headerSelects: { at: number; role: 'title' | 'counter' }[];
} {
  const records = modeRecords(c) ?? [];
  const deviceModes = new Set(deviceModeMaps(c).map((one) => one.mode));
  const slots = new Set(DEVICE_PAGE_SLOTS.map(([x, y]) => `${x},${y}`));

  const padPictures = new Set<number>();
  for (const mode of deviceModes) {
    for (const page of records[mode]?.pages ?? []) {
      for (const draw of pageDraws(c, page.program)) if (slots.has(`${draw.x},${draw.y}`)) padPictures.add(draw.picture);
    }
  }
  const pads = everyDraw(c).filter((draw) => padPictures.has(draw.picture));
  for (const draw of pads) {
    if (!slots.has(`${draw.x},${draw.y}`)) {
      throw new ComposeError(`a device pad picture is also drawn at (${draw.x}, ${draw.y}), which repointing would recolour`);
    }
  }

  const named = new Map(devices(c).filter((one) => one.mode !== undefined).map((one) => [one.mode as number, one.name]));
  const rows: { draw: Draw; icon?: string }[] = [];
  let rowBehind: number | undefined;
  for (const row of deviceListRows(c)) {
    const page = records[row.menu]?.pages[row.page];
    const rank = row.scan - MENU_ROW_SCAN;
    if (page === undefined || rank < 0 || rank >= LIST_ROWS) continue;
    const y = MENU_ROW1_BG[1] + MENU_ROW_PITCH * rank;
    const draws = pageDraws(c, page.program);
    const background = draws.find((one) => one.x === MENU_ROW1_BG[0] && one.y === y);
    if (background === undefined) throw new ComposeError(`the device list row of ${row.label ?? 'a device'} draws no background`);
    rows.push({ draw: background });
    const icon = draws.find((one) => one.x === MENU_ROW1_BG[0] + MENU_ICON_OFFSET[0] && one.y === y + MENU_ICON_OFFSET[1]);
    if (icon !== undefined) rows.push({ draw: icon, icon: iconFor(named.get(row.mode)) ?? choices.otherDeviceIcon });
    rowBehind ??= colourBehind(chromePixels(c, screenProgram(c, page.program) ?? []),
      [[MENU_ROW1_BG[0], y, ...ACTIVITY_ROW_SIZE] as const]);
  }
  // The header's title and page count, on every device page and every device list page: the selects that choose
  // their fonts, each read off a rendering of the page, and refused where one also chooses another text's.
  const roleOf = (text: TextDrawn): 'title' | 'counter' | undefined => {
    if (text.x === MODE_TITLE_X && text.y === MODE_TITLE_Y) return 'title';
    return text.y === MENU_COUNTER_XY[1] ? 'counter' : undefined;
  };
  const roles = new Map<number, Set<'title' | 'counter' | undefined>>();
  const listMenus = new Set(deviceListRows(c).map((row) => row.menu));
  for (const mode of [...deviceModes, ...listMenus]) {
    for (const page of records[mode]?.pages ?? []) {
      renderVariants(c, page.program, HEADER_VARIANTS, (text) => {
        if (text.selectAt === undefined) return;
        const had = roles.get(text.selectAt) ?? new Set();
        had.add(roleOf(text));
        roles.set(text.selectAt, had);
      });
    }
  }
  const headerSelects: { at: number; role: 'title' | 'counter' }[] = [];
  for (const [at, set] of roles) {
    const [only] = [...set];
    if (set.size === 1 && only !== undefined) headerSelects.push({ at, role: only });
    else if ([...set].some((one) => one !== undefined)) {
      throw new ComposeError('a font select chooses the font of a header text and of another text, so it cannot be recoloured alone');
    }
  }
  return { pads, rows, rowBehind, headerSelects };
}
