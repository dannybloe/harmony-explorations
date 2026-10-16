/**
 * A device's own screens on the Harmony 600, 650 and 700: its device mode's pages laid out by the
 * compiler's rules, `devicemode.ts`, and a mode added for them. Plan 007's four slot family, cut out of
 * `compose.ts` unchanged.
 */
import { u24 } from '../../bytes.ts';
import {
  deviceModeTitle, fontsBySize, LABEL_WIDTH, labelLayout, ladderOf, pageCounter, placeLabel, TITLE_RUNG,
  TWO_LINE_RISE,
} from '../../devicemode.ts';
import { Writer } from '../../emit.ts';
import {
  DEVICE_PAGE_BACKGROUND_AT, deviceModeKeyMap, FOUR_SLOT_TITLE_XY, fourSlotCounterX, inOurLook, sentFrame,
} from '../../families/four-slot/chrome.ts';
import {
  FOUR_SLOT_MAX_PAGES, fourSlotMenus, fourSlotPageList, type FourSlotTemplate, fourSlotTemplate, growFourSlotMenu,
  menuLayout, openFourSlotMenuPage,
} from '../../families/four-slot/menus.ts';
import { type FontSet, fontSets } from '../../font.ts';
import { archSlot, Container, parse, SCAN_MASK } from '../../gspm.ts';
import {
  ENTER_MODE, FOUR_SLOT_ITEMS, FOUR_SLOT_LABEL_Y, FOUR_SLOT_LEFT_X, FOUR_SLOT_RIGHT_END, FOUR_SLOT_ROWS,
  KEY_EVENT_PRESS, KEY_EVENT_SHIFT,
} from '../../inventory.ts';
import { relocate } from '../../relocate.ts';
import { SCREEN_DRAW_IMAGE, SCREEN_SELECT_FONT, SCREEN_TEXT_INLINE } from '../../screen.ts';
import {
  ACTION_LIST_INDEX_OPCODE, modePages, modeRecords, modeTable, taggedList, taggedListPools,
} from '../../sections.ts';
import { ACTION_TABLE_SLOT, ComposeError, restamped } from '../../shared/core.ts';
import { appendTableEntries } from '../../shared/infrared.ts';
import { appendMode, type ModeProgram } from '../../shared/modes.ts';
import {
  type ComposedScreen, type ComposeRow, type ComposeScreenOptions, deviceListMenus,
} from '../../shared/menus.ts';
import { codesFor, textWidth } from '../../shared/spelling.ts';
import { characterMap } from '../../text.ts';
import { FOUR_SLOT_CHOICES } from './choices.ts';
import { ourStateColours, withStateLook } from './statelook.ts';


/**
 * A four slot page's program: the template's background for one item or none, or for more, the rest
 * of its top chrome, the title, the page counter when there is one, the labels, left ones from the
 * edge and right ones ending at it, and the template's bottom chrome. The background is written by
 * hand and everything else around the middle is copied.
 */
export function fourSlotPageProgram(
  c: Container, template: FourSlotTemplate, measuring: FontSet,
  page: {
    titleCodes: readonly number[]; counter?: readonly (readonly number[])[] | undefined; labels: readonly (readonly number[])[];
    /**
     * A label's second line, per label, where it has one, from `fourSlotLabelLines`. The first line
     * then sits one line height higher and the second where a one line label would, each placed on
     * its own, so a right one ends at the edge line by line. Omitted, every label is one line, which
     * is what every caller passed before the activity screen wrapped its labels.
     */
    second?: readonly (readonly number[] | undefined)[];
    /**
     * The font of each label, where `fourSlotLabelLines` took one a size down: a font select goes in
     * front of a label only where the font changes, and its two lines sit its own height apart, as
     * `placeLabel` puts them. Omitted, every label is in the template's label font.
     */
    fonts?: readonly number[];
  },
): ModeProgram {
  const text = (x: number, y: number, codes: readonly number[]): number[] =>
    [SCREEN_TEXT_INLINE, x, y, ...codes, 0];
  const middle: number[] = [SCREEN_SELECT_FONT, template.titleFont,
    ...text(FOUR_SLOT_TITLE_XY[0], FOUR_SLOT_TITLE_XY[1], page.titleCodes)];
  if (page.counter !== undefined) {
    const counterX = fourSlotCounterX(c);
    middle.push(SCREEN_SELECT_FONT, template.counterFont,
      ...page.counter.flatMap((codes, k) => text(counterX[k] as number, FOUR_SLOT_TITLE_XY[1], codes)));
  }
  let selected: number | undefined;
  page.labels.forEach((codes, k) => {
    const item = FOUR_SLOT_ITEMS[k] as (typeof FOUR_SLOT_ITEMS)[number];
    const font = page.fonts?.[k] ?? template.labelFont;
    if (font !== selected) middle.push(SCREEN_SELECT_FONT, font);
    selected = font;
    const set = font === template.labelFont ? measuring : (fontSets(c) ?? [])[font] as FontSet;
    const xOf = (line: readonly number[]): number =>
      item.column === 0 ? FOUR_SLOT_LEFT_X : FOUR_SLOT_RIGHT_END - textWidth(c, set, line);
    const second = page.second?.[k];
    if (second === undefined) {
      middle.push(...text(xOf(codes), FOUR_SLOT_LABEL_Y[item.row], codes));
    } else {
      const top = FOUR_SLOT_LABEL_Y[item.row] - TWO_LINE_RISE;
      middle.push(...text(xOf(codes), top, codes));
      middle.push(...text(xOf(second), font === template.labelFont ? FOUR_SLOT_LABEL_Y[item.row] : top + set.height, second));
    }
  });
  const length = 1 + 5 + template.chrome.headLength + template.chrome.tailLength + middle.length;
  const background = page.labels.length > 1 ? template.crossed : template.single;
  if (background === undefined) {
    throw new ComposeError(`no page here holding ${page.labels.length > 1 ? 'several items' : 'one item or none'} `
      + 'draws a background to copy for one');
  }
  return {
    length,
    build: (shifted) => new Uint8Array([
      SCREEN_DRAW_IMAGE, ...DEVICE_PAGE_BACKGROUND_AT, ...new Writer(3).u24(shifted(background)).bytes,
      ...template.chrome.head(shifted), ...middle, ...template.chrome.tail(shifted),
    ]),
  };
}

/** A text a compiled layout page draws: the glyph codes, where, and in which font. */
interface CompiledText {
  font: number;
  codes: number[];
  x: number;
  y: number;
}

/** One device mode page as the compiler would draw it, ready to be turned into a program. */
interface CompiledPage {
  title: CompiledText;
  counter: CompiledText[];
  /** Per item, in fill order, its one or two lines, all in one font. */
  labels: CompiledText[][];
}

/**
 * The texts of every page of a device mode laid out by the compiler's rules, `devicemode.ts`, spelled in
 * fonts this configuration carries, before anything is inserted: a glyph code and a width do not move
 * with an insertion, and a font number does not either, since nothing here adds a font.
 *
 * **A size is a choice of font only up to which set of that size carries the glyphs**, `sizeOfSet`: the
 * compiler draws one size from several sets, each holding what its own texts use, so a label is drawn in
 * the first set of its size that spells every line of it, the template's own font first. Where none
 * does, it is drawn in the nearest height that spells it; where the rules cannot measure the text at
 * all, a character the character map does not know is dropped and the rest drawn whole or cut with `..`,
 * the template's font first, and a text with nothing left is drawn empty. Either way it is named in
 * `substituted`, so the difference from the compiler's page is reported rather than silent. On the
 * twenty devices of section 325 all three substitutions take the second route. A text that no font
 * spells any part of is refused, as `codesFor` refuses anywhere else.
 */
function compiledDeviceModePages(
  c: Container, template: FourSlotTemplate, title: string, rows: readonly ComposeRow[], pageCount: number,
): { pages: CompiledPage[]; substituted: string[] } {
  const map = characterMap(c);
  if (map === undefined) throw new ComposeError('the config draws no text this can spell from');
  const sets = fontSets(c) ?? [];
  // Our letters are measured in our widths, Logitech's in theirs, `ladderOf`.
  const ladder = ladderOf(c, map);
  const bySize = fontsBySize(c, map, ladder);
  const substituted: string[] = [];
  const spell = (font: number, text: string): number[] | undefined => {
    const set = sets[font];
    if (set === undefined) return undefined;
    try { return codesFor(map, c, set, text, font); } catch { return undefined; }
  };
  // The fonts the page's chrome draws in: the title, the counter and the bottom word. A font set carries
  // its colour in its glyphs, so one of these has the size of a label and the colour of a title: on the
  // Harmony 650 the title's font is green, and a label put in it showed on the remote as its shadow
  // alone, `Direct TVRecord` on the TX-P42GT30E's third page, at the bench. Logitech's own pages on that
  // configuration draw 13 titles in font 5, 25 counters in font 6 and 7 bottom words in font 1, and none
  // of the 511 lines between the title and the bottom bar in any of the three, so a label never borrows one.
  const chromeFonts = new Set([template.titleFont, template.counterFont, template.device.backFont]);
  // The font a group of lines is drawn in: a set of the wanted size spelling all of them, the preferred
  // one first; else the nearest height that does, which is a substitution. `avoid` is left out of both.
  const pick = (rung: number | undefined, texts: readonly string[], preferred: number, what: string,
      avoid: ReadonlySet<number> = new Set()): { font: number; codes: number[][] } => {
    const wanted = (rung === undefined ? [] : bySize.get(rung) ?? []).filter((font) => !avoid.has(font));
    const order = [...new Set([...(wanted.includes(preferred) ? [preferred] : []), ...wanted])];
    for (const font of order) {
      const codes = texts.map((text) => spell(font, text));
      if (codes.every((one) => one !== undefined)) return { font, codes: codes as number[][] };
    }
    const height = rung === undefined ? sets[preferred]?.height ?? 0 : (ladder[rung]?.height ?? 0);
    const able = sets.map((_, font) => font)
      .filter((font) => !avoid.has(font) && texts.every((text) => spell(font, text) !== undefined))
      .sort((a, b) => Math.abs((sets[a] as FontSet).height - height) - Math.abs((sets[b] as FontSet).height - height));
    const font = able[0];
    if (font === undefined) {
      throw new ComposeError(`no font in this config spells ${texts.map((one) => `'${one}'`).join(' and ')}`);
    }
    substituted.push(what);
    return { font, codes: texts.map((text) => spell(font, text) as number[]) };
  };
  const width = (font: number, codes: readonly number[]): number => textWidth(c, sets[font] as FontSet, codes);
  // A text the rules could not measure: drawn whole or cut with `..` to `limit` by the widths of the
  // font it ends up in, the preferred font first and then the nearest height that spells the result.
  const unruled = (text: string, preferred: number, limit: number, what: string):
      { font: number; codes: number[] } => {
    substituted.push(what);
    // A character the configuration's character map has no code for cannot be drawn by anything here,
    // `J` on every arch 14 configuration, section 325, so it is left out rather than refusing the page.
    const known = new Set(map.codes.values());
    text = [...text].filter((ch) => known.has(ch)).join('');
    // Nothing left to draw, a label of `#` alone: the item is bound and drawn without a label.
    if (text === '') return { font: preferred, codes: [] };
    const height = sets[preferred]?.height ?? 0;
    const order = [preferred, ...sets.map((_, font) => font).filter((font) => font !== preferred && !chromeFonts.has(font))
      .sort((a, b) => Math.abs((sets[a] as FontSet).height - height) - Math.abs((sets[b] as FontSet).height - height))];
    for (const font of order) {
      for (let n = text.length; n > 0; n -= 1) {
        const candidate = n === text.length ? text : `${text.slice(0, n)}..`;
        const codes = spell(font, candidate);
        if (codes !== undefined && width(font, codes) <= limit) return { font, codes };
      }
    }
    throw new ComposeError(`no font in this config spells any part of '${text}'`);
  };

  // The title, the same on every page.
  const titleRung = TITLE_RUNG;
  const ruled = deviceModeTitle(title, pageCount, ladder);
  let titleText: CompiledText;
  if (ruled !== undefined) {
    const one = pick(titleRung, [ruled], template.titleFont, `title '${title}'`);
    titleText = { font: one.font, codes: one.codes[0] as number[], x: FOUR_SLOT_TITLE_XY[0], y: FOUR_SLOT_TITLE_XY[1] };
  } else {
    // The limit `deviceModeTitle` would have applied, left of the widest counter less its gap.
    const limit = pageCount < 2 ? FOUR_SLOT_RIGHT_END
      : (pageCounter(pageCount, pageCount, ladder)[0] as { x: number }).x - 3;
    const one = unruled(title, template.titleFont, limit, `title '${title}'`);
    titleText = { font: one.font, codes: one.codes, x: FOUR_SLOT_TITLE_XY[0], y: FOUR_SLOT_TITLE_XY[1] };
  }

  // Every row's lines and font, measured once. **The labels of one size on one page share a font
  // where one set spells them all**, chosen before any of them is drawn: a page selects a font only
  // where the size changes, which two sets of one size side by side would break, and the set the first
  // label happens to fit need not spell the second.
  const perPageOf = FOUR_SLOT_ITEMS.length;
  const layouts = rows.map((row) => labelLayout(row.label, ladder));
  const shared = new Map<string, number>();
  layouts.forEach((layout, index) => {
    if (layout === undefined) return;
    const key = `${Math.floor(index / perPageOf)}:${layout.size}`;
    if (shared.has(key)) return;
    const lines = layouts.flatMap((one, k) => (one !== undefined && one.size === layout.size
      && Math.floor(k / perPageOf) === Math.floor(index / perPageOf) ? one.lines : []));
    const all = (bySize.get(layout.size) ?? []).find((font) => lines.every((text) => spell(font, text) !== undefined));
    if (all !== undefined) shared.set(key, all);
  });
  const labels = rows.map((row, index): CompiledText[] => {
    const item = FOUR_SLOT_ITEMS[index % FOUR_SLOT_ITEMS.length] as (typeof FOUR_SLOT_ITEMS)[number];
    const layout = layouts[index];
    if (layout === undefined) {
      // Not measurable by the rules: one line, the template's label font first, cut to the corner.
      const one = unruled(row.label, template.labelFont, LABEL_WIDTH, `label '${row.label}'`);
      const x = item.column === 0 ? FOUR_SLOT_LEFT_X : FOUR_SLOT_RIGHT_END - width(one.font, one.codes);
      return [{ font: one.font, codes: one.codes, x, y: FOUR_SLOT_LABEL_Y[item.row] }];
    }
    const placed = placeLabel(layout, item.column, item.row, ladder);
    const chosen = pick(layout.size, layout.lines,
                        shared.get(`${Math.floor(index / perPageOf)}:${layout.size}`) ?? template.labelFont,
                        `label '${row.label}'`, chromeFonts);
    const height = (sets[chosen.font] as FontSet).height;
    // Placed by the font actually drawn, which is the table's widths and height unless substituted.
    return chosen.codes.map((codes, k) => ({
      font: chosen.font,
      codes,
      x: item.column === 0 ? FOUR_SLOT_LEFT_X : FOUR_SLOT_RIGHT_END - width(chosen.font, codes),
      y: (placed[0] as { y: number }).y + k * height,
    }));
  });

  const perPage = FOUR_SLOT_ITEMS.length;
  const pages = Array.from({ length: pageCount }, (_, p): CompiledPage => {
    const counter = pageCounter(p + 1, pageCount, ladder);
    const counterFont = counter.length === 0 ? undefined
      : pick(titleRung, counter.map((one) => one.text), template.counterFont, 'the page counter');
    return {
      title: titleText,
      counter: counter.map((one, k) => ({
        font: (counterFont as { font: number }).font,
        codes: (counterFont as { codes: number[][] }).codes[k] as number[],
        x: one.x, y: one.y,
      })),
      labels: labels.slice(p * perPage, (p + 1) * perPage),
    };
  });
  return { pages, substituted: [...new Set(substituted)] };
}

/**
 * A device mode page's program as the compiler writes it: the template's background and top chrome,
 * the title, the counter, every label line at its own place, a font select only where the font changes,
 * and the template's bottom chrome. `fourSlotPageProgram` with the layout made explicit, since here every
 * text carries its own font and position.
 */
function compiledPageProgram(c: Container, template: FourSlotTemplate, page: CompiledPage): ModeProgram {
  const middle: number[] = [];
  let inEffect: number | undefined;
  const draw = (one: CompiledText): void => {
    if (one.codes.length === 0) return;
    if (one.font !== inEffect) { middle.push(SCREEN_SELECT_FONT, one.font); inEffect = one.font; }
    middle.push(SCREEN_TEXT_INLINE, one.x, one.y, ...one.codes, 0);
  };
  draw(page.title);
  page.counter.forEach(draw);
  page.labels.flat().forEach(draw);
  const length = 1 + 5 + template.chrome.headLength + template.chrome.tailLength + middle.length;
  const background = page.labels.length > 1 ? template.crossed : template.single;
  if (background === undefined) throw new ComposeError('no page here draws the background a page needs');
  return {
    length,
    build: (shifted) => new Uint8Array([
      SCREEN_DRAW_IMAGE, ...DEVICE_PAGE_BACKGROUND_AT, ...new Writer(3).u24(shifted(background)).bytes,
      ...template.chrome.head(shifted), ...middle, ...template.chrome.tail(shifted),
    ]),
  };
}

export function composeFourSlotDeviceScreen(
  c: Container, label: string, rows: readonly ComposeRow[], options: ComposeScreenOptions,
): ComposedScreen {
  if (rows.length === 0) throw new ComposeError('a device mode needs at least one command on its screen');
  // A configuration of ours draws its device pages in the device state's look, which an empty one does not
  // hold until its first device, section 377.
  if (inOurLook(c)) c = withStateLook(c, ourStateColours(c).device ?? FOUR_SLOT_CHOICES.stateColours.device);
  const perPage = FOUR_SLOT_ITEMS.length;
  const pageCount = Math.ceil(rows.length / perPage);
  // The compiler's layout draws a counter of two digits where the compiler does, `pageCounter`; the
  // plain one has only the one digit positions.
  if (pageCount > 9 && options.compiled === undefined) {
    throw new ComposeError('a page counter of two digits is not composed');
  }
  const map = characterMap(c);
  if (map === undefined) throw new ComposeError('the config draws no text this can spell from');
  const template = fourSlotTemplate(c, options.keysLike);
  const sets = fontSets(c) ?? [];
  const setOf = (font: number): FontSet => {
    const set = sets[font];
    if (set === undefined) throw new ComposeError(`the config does not carry font ${font}`);
    return set;
  };
  const compiled = options.compiled;
  // Under the compiler's layout the title and the rows are spelled by `compiledDeviceModePages`, in the
  // fonts its rules pick, and only the device list row is spelled here.
  const titleCodes = compiled !== undefined ? []
    : codesFor(map, c, setOf(template.titleFont), label, template.titleFont);
  const menuCodes = codesFor(map, c, setOf(template.labelFont), label, template.labelFont);
  const rowCodes = compiled !== undefined ? []
    : rows.map((row) => codesFor(map, c, setOf(template.labelFont), row.label, template.labelFont));
  const digitCodes = (n: number): number[] =>
    codesFor(map, c, setOf(template.counterFont), String(n), template.counterFont);
  const slashCodes = compiled !== undefined ? []
    : codesFor(map, c, setOf(template.counterFont), '/', template.counterFont);
  const laidOut = compiled === undefined ? undefined
    : compiledDeviceModePages(c, template, compiled.title, rows, pageCount);
  [label, ...(compiled === undefined ? rows.map((row) => row.label) : [])].forEach((text, k) => {
    const wide = textWidth(c, setOf(template.labelFont), k === 0 ? menuCodes : rowCodes[k - 1] as number[]);
    if (wide > LABEL_WIDTH) {
      throw new ComposeError(`'${text}' is ${wide} pixels wide and a corner holds ${LABEL_WIDTH}: `
        + 'give it a shorter label');
    }
  });

  // The device lists as `fourSlotMenus` finds them, which finds the idle one with no row too, the only one an
  // empty configuration has, section 375; on a configuration with a device they are `deviceListMenus`'.
  const { marker } = deviceListMenus(c);
  const menus = fourSlotMenus(c);
  const found = { menus: menus.filter((one) => one.kind !== 'activity menu').map((one) => one.menu), marker };
  if (found.menus.length === 0 || found.marker === undefined) {
    throw new ComposeError('no device list menu found to grow');
  }
  // Which kind each device list is, which decides the bottom word and the background its pages draw,
  // section 334. Read before anything moves; a mode's number does not move when another is added.
  const kinds = new Map(menus.map((one) => [one.menu, one.kind]));
  // Counted before anything moves: how many buttons the new device takes on each menu, one corner or
  // a row's two, which is how many row lists step 1 writes for that menu's list and as many again for
  // its copy. A menu whose last page is full gets a new page, `openFourSlotMenuPage`, where the device
  // takes the first place, which is one corner or the top row's two buttons all the same. A menu that
  // would need a tenth page is refused here, before anything moves, rather than inside the loop.
  let rowBindings = 0;
  for (const menu of found.menus) {
    const record = modeRecords(c)?.[menu];
    const page = record?.pages.at(-1);
    const layout = menuLayout(c, taggedList(c, page?.list ?? 0)?.entries ?? []);
    if (record === undefined || layout === undefined) {
      throw new ComposeError(`menu ${menu}'s last page is neither of the two arch 14 layouts`);
    }
    const full = layout.used >= layout.capacity;
    if (full && record.pages.length + 1 > FOUR_SLOT_MAX_PAGES) {
      throw new ComposeError(`menu ${menu} would need page ${record.pages.length + 1}, and a counter of `
        + 'two digits is not composed');
    }
    const place = full ? 0 : layout.used;
    rowBindings += 2 * (layout.rows ? (FOUR_SLOT_ROWS[place] as readonly number[]).length : 1);
  }
  const table = modeTable(c);
  if (table === undefined) throw new ComposeError('base slot 6 states no table');
  const mode = table.addresses.length;

  // The key map, from the template mode's own list: same keys in the same order, each bound to the
  // command sending the same frame when exactly one does, and to nothing when none does. The two
  // bindings that are not keys but the mode's own navigation, the list and the map through base slot
  // 14 that every device mode carries, are copied as they are, and the four corners are nothing
  // because a page binds them.
  const lists = c.actionLists() ?? [];
  // The shape is built, `deviceModeKeyMap`, 6.2.7; under the plain layout which command a key sends is
  // still matched by frame against `keysLike`'s device, or the first row's, entry by entry with the tag.
  const shape = deviceModeKeyMap(c, template.device);
  if (template.keyMode === undefined && compiled === undefined) {
    throw new ComposeError('a plain composition binds its keys like another device\'s, and the configuration holds none');
  }
  const keyTemplate = template.keyMode === undefined ? [] : modeRecords(c)?.[template.keyMode]?.entries ?? [];
  const likeByTag = new Map(keyTemplate.map((entry) => [entry.tag, entry]));
  // By frame, and a set rather than a list: two items running one command are one command.
  const ours = new Map<string, Set<number>>();
  rows.forEach((row) => {
    const frame = sentFrame(c, lists[row.list]);
    if (frame !== undefined) ours.set(frame, (ours.get(frame) ?? new Set()).add(row.list));
  });
  const slotScans = new Set(FOUR_SLOT_ITEMS.map((item) => item.scan));
  let keys = 0;
  // Under the compiler's layout the key map is the caller's, scan by scan, `deviceModeLayout`: a press
  // of a key the caller names runs its list, every other key and every corner is nothing, and the
  // template's navigation entries are kept as they are.
  const press = (tag: number): boolean => tag >> KEY_EVENT_SHIFT === KEY_EVENT_PRESS;
  const own = shape.map((entry) => {
    // The key under Devices and the program tag are built whole; a corner is the page's to bind.
    if (entry.opcode !== 0) return entry;
    const scan = entry.tag & SCAN_MASK;
    if (!press(entry.tag) || slotScans.has(scan)) return entry;
    if (compiled !== undefined) {
      const list = compiled.keys.get(scan);
      if (list === undefined) return entry;
      keys += 1;
      return { tag: entry.tag, operand: list, opcode: ACTION_LIST_INDEX_OPCODE };
    }
    const like = likeByTag.get(entry.tag);
    const frame = like?.opcode === ACTION_LIST_INDEX_OPCODE ? sentFrame(c, lists[like.operand]) : undefined;
    const match = frame === undefined ? undefined : ours.get(frame);
    if (match?.size === 1) {
      keys += 1;
      return { tag: entry.tag, operand: [...match][0] as number, opcode: ACTION_LIST_INDEX_OPCODE };
    }
    return entry;
  });
  if (keyTemplate.some((entry) => entry.flags !== undefined)) {
    throw new ComposeError('the template key map is not the narrow form every device mode uses');
  }

  // 1. The row lists: enter the new mode, write the marker. **One per button bound, and another for
  // each copy**, identical, because that is what the compiler writes: on the four arch 14 user
  // configurations 300 row lists are bound 300 times, none twice and none shared between a page and
  // its copy. The Harmony One composer shares one, and that is measured to work there; here the
  // compiler's own shape is the one with nothing left to find out.
  const actionSlot = archSlot(c.architecture as number, ACTION_TABLE_SLOT);
  const actionTable = c.pointerArrayAt(actionSlot);
  if (actionTable === undefined) throw new ComposeError('base slot 10 does not read as a table');
  const rowList = actionTable.values.length;
  const oneRow = new Writer(1 + 3 * 2).u8(2)
    .u16(mode).u8(ENTER_MODE)
    .u16(found.marker.operand).u8(found.marker.opcode).bytes;
  const rowAt = actionTable.start;
  const rowHole = relocate(c, rowAt, oneRow.length * rowBindings);
  for (let k = 0; k < rowBindings; k += 1) rowHole.bytes.set(oneRow, rowAt + k * oneRow.length);
  let current = parse(appendTableEntries(parse(rowHole.bytes), actionSlot,
    Array.from({ length: rowBindings }, (_, k) => c.flashBase + rowAt + k * oneRow.length)));
  let nextRow = rowList;

  // 2 to 6. The mode itself, through the step every arch 14 mode composer shares. Filled in
  // `FOUR_SLOT_ITEMS` order and stored in `FOUR_SLOT_STORED_ORDER`, as every page is.
  const pageRows = Array.from({ length: pageCount }, (_, p) => rows.slice(p * perPage, (p + 1) * perPage));
  const pageListBytes = pageRows.map((onPage) => fourSlotPageList(onPage.map((row) => row.list)));
  current = appendMode(current, mode, own, pageListBytes, (now) => {
    // Read again: every address and offset the first reading holds is stale by the insertions above.
    const fresh = fourSlotTemplate(now, options.keysLike);
    if (laidOut !== undefined) return laidOut.pages.map((page) => compiledPageProgram(now, fresh, page));
    const measuring = (fontSets(now) ?? [])[template.labelFont];
    if (measuring === undefined) throw new ComposeError('the label font stopped reading');
    return pageRows.map((onPage, p) => fourSlotPageProgram(now, fresh, measuring, {
      titleCodes,
      counter: pageCount > 1 ? [digitCodes(p + 1), slashCodes, digitCodes(pageCount)] : undefined,
      labels: onPage.map((_, k) => rowCodes[p * perPage + k] as number[]),
    }));
  });

  // 7. One more item on each menu's last page, which is a step `composeFourSlotActivityRow` shares,
  // or a new page where the last one is full, every page of it then counting to the new total. Each
  // page is the one built for its menu's kind, section 334: the idle list, an activity's own list or the
  // two row list, read before anything moved.
  const pagesAdded: number[] = [];
  for (const menu of found.menus) {
    const kind = kinds.get(menu);
    if (kind === undefined) throw new ComposeError(`device list ${menu} has no kind`);
    const last = modeRecords(current)?.[menu]?.pages.at(-1);
    const layout = menuLayout(current, taggedList(current, last?.list ?? 0)?.entries ?? []);
    if (layout === undefined) throw new ComposeError(`menu ${menu} changed layout while being grown`);
    const grown = layout.used < layout.capacity
      ? growFourSlotMenu(current, menu, kind, nextRow, menuCodes, template.labelFont)
      : openFourSlotMenuPage(current, menu, kind, nextRow, menuCodes, template.labelFont, template.counterFont);
    if (layout.used >= layout.capacity) pagesAdded.push(menu);
    current = grown.container;
    nextRow += grown.bound;
  }

  if (nextRow !== rowList + rowBindings) {
    throw new ComposeError(`${nextRow - rowList} row lists bound against the ${rowBindings} written`);
  }
  return {
    bytes: restamped(current.blob), mode, menus: found.menus, rowList, pagesAdded, keys,
    pages: pageCount, rowLists: rowBindings,
    ...(laidOut === undefined ? {} : { substituted: laidOut.substituted }),
  };
}
