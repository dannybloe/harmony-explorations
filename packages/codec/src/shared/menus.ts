/**
 * What the device list and the activity menu are on every family that has them: the menu marker, finding
 * the menus and their rows, a value map case appended, a menu page's texts, and the types the screen
 * composers take and return. The pages themselves are each family's. Plan 007's shared part, cut out of
 * `compose.ts` unchanged.
 */
import type { FamilyTraits } from '../families/family.ts';
import { familyOf, traitsOf } from '../families/registry.ts';
import { STATE_WRITE_BASE } from '../actions.ts';
import { u24 } from '../bytes.ts';
import { Writer } from '../emit.ts';
import { type FontSet, fontSets, glyphOf } from '../font.ts';
import { Container, type Instruction, parse } from '../gspm.ts';
import {
  BEEP_OPCODE, deviceListRowMode, isDeviceListRowShape, SELECT_BINDING_SET, SELECT_BINDING_SET_MASK,
} from '../inventory.ts';
import { excise, relocate } from '../relocate.ts';
import {
  SCREEN_END, SCREEN_QUEUE_INSTRUCTION, SCREEN_SELECT_FONT, SCREEN_TEXT_AT, SCREEN_TEXT_INLINE, type ScreenInstruction, screenProgram,
} from '../screen.ts';
import { ACTION_LIST_INDEX_OPCODE, modeRecords, taggedList } from '../sections.ts';
import { assertGeneratedRecord, ComposeError, restamped } from '../shared/core.ts';
import { codesFor, fontThatSpells, textGlyphs, textWidth } from '../shared/spelling.ts';
import { menuMarkerVariable } from '../statetables.ts';
import { characterMap, decode, screenStrings } from '../text.ts';
import { VALUE_MAP_COUNT_WIDTH, VALUE_MAP_KEY_WIDTH, valueMaps } from '../valuemap.ts';

/**
 * What an **activity** row writes into the device mode marker, against a device row's 1.
 *
 * The value is ours and the variable is not: section 239 measured eight different variables across
 * fourteen configurations, so `activityMenus` reads the instruction off a row the config already
 * carries and this supplies only the operand. Section 275.
 */
export const ACTIVITY_MENU_MARKER_VALUE = 0;

/** What a **device list** row writes into the same variable, section 239. */
export const DEVICE_MENU_MARKER_VALUE = 1;

// The menu rows are measured on the remotes a family serves, `familyOf`: arch 12 (Harmony One) and
// arch 14 (Harmony 600, 650 and 700). Arch 8, 9 and 10 (Harmony 880 and 885, 525, 890 and 895) are not
// read: they hold no list of the Harmony One's beeped row shape, and they do hold lists of the arch 14
// activity row's unbeeped shape, each writing 0 into one variable per configuration, whether that
// variable is this marker being unread.

/**
 * The variable every menu row writes last, the menu marker, section 329, `todo-compile-650.md` 6.2.8.
 *
 * **Which variable it is differs per configuration**, ten different ones over the eighteen of the
 * marker census, sections 239 and 285, and fifteen over the 27 below, so the index is the configuration's own; in one built from nothing it is the
 * description's, `menuMarkerVariable`. **What is generated is everything else**: a device list row
 * writes `DEVICE_MENU_MARKER_VALUE`, an activity row `ACTIVITY_MENU_MARKER_VALUE`, and the variable is
 * an unnamed 0 of maximum 3 with no transition. Until then the composer copied the whole instruction
 * off the rows, the device rows' by majority in `deviceModeMarker` and the activity rows' off the
 * first activity menu it found, so a configuration with no activity row had no marker for a composed
 * activity's row to write.
 *
 * **The variable is read off every row of both kinds and they must agree**, not off a majority: every
 * list of a device list row's shape, `isDeviceListRowShape`, writes it 1 as its last instruction, and
 * every list of an activity row's shape writes it 0, 2256 and 282 lists on the 27 configurations of
 * a Harmony One, 600, 650 or 700 the marker census and the thirteen arch 14 compiles read together.
 * Rows are not its only writers: outside them it is written 0 once on each of the 27, and 1 a further 2
 * to 9 times on each Harmony One configuration. Either kind alone names it, so a configuration with device rows and no activity
 * row, or the reverse, still has one. Refused with neither, with two variables, with a value other
 * than the generated one, or with a record other than the generated one.
 */
export function menuMarkerOf(c: Container): number {
  if (familyOf(c) === undefined) {
    throw new ComposeError('the menu marker is read on the Harmony One, 600, 650 and 700 alone, whose rows are measured');
  }
  const lists = c.actionLists() ?? [];
  const variables = new Set<number>();
  const wrong: string[] = [];
  for (const [index, list] of lists.entries()) {
    const deviceEnd = isDeviceListRowShape(list, c.architecture) ? list.at(-1) : undefined;
    const activityEnd = activityRowEnd(list, traitsOf(c));
    for (const [end, value] of [[deviceEnd, DEVICE_MENU_MARKER_VALUE], [activityEnd, ACTIVITY_MENU_MARKER_VALUE]] as const) {
      if (end === undefined) continue;
      variables.add(end.opcode - STATE_WRITE_BASE);
      if (end.operand !== value) wrong.push(`list ${index} writes ${end.operand} where ${value} is built`);
    }
  }
  // The family's own writer outside the rows, held to the same agreement, and the only one with no row.
  const writer = familyOf(c)?.menuMarkerWriter(c);
  if (writer !== undefined) variables.add(writer);
  if (variables.size !== 1) {
    throw new ComposeError(variables.size === 0
      ? 'no menu row here to read the menu marker variable from'
      : `the menu rows write ${variables.size} different variables last: ${[...variables].join(', ')}`);
  }
  if (wrong.length > 0) throw new ComposeError(`a menu row writes the marker another value: ${wrong[0]}`);
  const marker = [...variables][0] as number;
  assertGeneratedRecord(c, marker, menuMarkerVariable(), 'the menu marker');
  return marker;
}

/** The instruction a menu row ends with, built: the marker variable and the row kind's value. */
function menuMarkerWrite(c: Container, value: number): Instruction {
  return { opcode: STATE_WRITE_BASE + menuMarkerOf(c), operand: value };
}

/** A command as it appears on the device's page: the row's word. */
export interface ComposeRow {
  readonly label: string;
  /** The base slot 10 list the row runs, from `ComposedDevice.lists`. */
  readonly list: number;
}

export interface ComposedScreen {
  bytes: Uint8Array;
  /** The new mode's index in base slot 6's table, which is what a menu row's 0x7e names. */
  mode: number;
  /** The device list modes that gained a row, by table index. */
  menus: readonly number[];
  /** The base slot 10 list the new menu rows run: beep, enter the mode, mark device mode. */
  rowList: number;
  /** The menus whose last page was full, so a new one row page was added to each, section 240. */
  pagesAdded: number[];
  /** Arch 14 only: how many row lists were written, from `rowList` on, one per menu binding and copy. */
  rowLists?: number;
  /** Arch 14 only: how many keys of the new device mode's key map send one of its commands. */
  keys?: number;
  /** Arch 14 only: how many pages the new device mode has. */
  pages?: number;
  /**
   * Arch 14 with `compiled` only: the texts drawn in a font of another size than the compiler's rules
   * pick, because no font of that size in the configuration carries every glyph they need, or because
   * a character has no width in the size that decides them. Each is a page that differs from the
   * compiler's, and a caller reports them rather than discovering them on the remote.
   */
  substituted?: string[];
}

/**
 * The device list menus: the modes whose rows enter a device mode, kept to the ones that list
 * every device. A row is the measured three instruction shape, and a mode qualifies when it
 * reaches as many distinct device modes as any mode does, which is what separates the all device
 * menus from the per activity ones that list two or three. A config with one device cannot tell
 * those apart, and this composer is calibrated on a config with five.
 */
export function deviceListMenus(
  c: Container,
): { menus: number[]; reach: number; marker: Instruction | undefined } {
  const lists = c.actionLists() ?? [];
  // The row's last instruction, built rather than taken by majority off the rows, section 329; a
  // configuration with no menu row at all has no marker to build, which the callers refuse.
  let marker: Instruction | undefined;
  if (familyOf(c) !== undefined) {
    try {
      marker = menuMarkerWrite(c, DEVICE_MENU_MARKER_VALUE);
    } catch (error) {
      if (!(error instanceof ComposeError) || !/no menu row here/.test(error.message)) throw error;
    }
  }
  const records = modeRecords(c) ?? [];
  let deepest = 0;
  const reached = records.map((record) => {
    const modes = new Set<number>();
    for (const page of record.pages) {
      const list = taggedList(c, page.list);
      for (const entry of list?.entries ?? []) {
        if (entry.opcode !== ACTION_LIST_INDEX_OPCODE) continue;
        const mode = deviceListRowMode(lists[entry.operand], c.architecture, marker);
        if (mode !== undefined) modes.add(mode);
      }
    }
    deepest = Math.max(deepest, modes.size);
    return modes.size;
  });
  const menus: number[] = [];
  reached.forEach((size, index) => {
    if (size === deepest && size > 0) menus.push(index);
  });
  return { menus, reach: deepest, marker };
}

/**
 * Make a screen's paging agree with its page count, after pages were added to it: every page draws
 * its own number, the header draws the total, and a screen of more than one page no longer deadens
 * the two page turn keys. **Arch 12 (Harmony One) only**, which is where all three were measured,
 * section 293. Arch 14's paging is the counter alone and is `paginateFourSlot`, section 312; the two
 * share their text edits through `pageTexts`.
 *
 * **One step shared by both menus that grow pages**, the device list's `composeMenuPage` and the
 * activity menu's `composeActivityMenuPage`, which is decision 17's rule: builders stay separate and
 * what they share is a step. It exists because each of the three is a way to produce a screen the
 * remote accepts and mishandles, and two of them happened:
 *
 * * **The page turn keys.** A one page screen binds both in its mode record's own list, 598 of 598 on
 *   the six Harmony One containers, and a multi page one binds neither, 0 of 58. Grow a one page menu
 *   to two and leave them, and the second page cannot be reached, with every count closing. Every one
 *   page **list** menu binds them to the null instruction, but 67 other one page screens run a list
 *   there, so a binding that does something is refused rather than cut.
 * * **The total.** The header states it, so a page added without restating it leaves "2 pages" on a
 *   screen of three. `composeMenuPage` did exactly that to nine device lists on the spare Harmony One,
 *   which this step now restates.
 * * **The numbers.** A one page screen draws no counter at all, so its first page gains one, and a
 *   page composed from a one page screen's last page has none to copy.
 *
 * What is written is spelled in the fonts `pagingStyle` finds, inline, or in the nearest font of the
 * same height where that one lacks a glyph. A number or total already there is kept when it reads
 * right; otherwise an inline one is drawn again and one drawn by reference is pointed at a string that
 * reads right. A page whose program does not end the way the corpus ends one is refused.
 */
/**
 * The text edits a paging step makes, on a container that is replaced after every one of them: spell a
 * text in a font that has its glyphs, measure it, draw it, insert bytes at an instruction boundary,
 * and restate a text that reads wrong. **One copy for both paging steps**, the Harmony One's `paginate`
 * and arch 14's `paginateFourSlot`, which is decision 17's rule: the builders stay separate and what
 * they share is a step. Lifted out of `paginate` unchanged when the second caller arrived, so the
 * borrower handling section 293 found the hard way is not written twice.
 *
 * `current` is the container as it now is; every edit replaces it, and a caller reads it again after
 * each one, since an address read before an insertion below it is stale by that insertion.
 */
interface PageTexts {
  current: Container;
  spell: (preferred: number, text: string) => { font: number; codes: number[] };
  width: (preferred: number, text: string) => number;
  drawn: (x: number, y: number, text: string, preferred: number, current_: number | undefined) => number[];
  insert: (at: number, bytes: readonly number[]) => void;
  restate: (one: ScreenInstruction, font: number | undefined, want: string, what: string, endsAt?: number) => void;
}

export function pageTexts(start: Container, menu: number): PageTexts {
  const state = { current: start };
  const map = characterMap(start);
  if (map === undefined) throw new ComposeError('the config carries no character map');
  // A text in `preferred` where that font has the glyphs, and otherwise in the font of nearest height
  // that has them, `fontThatSpells`'s rule for a label: a configuration's font carries only the glyphs
  // it draws, and the spare Harmony One's activity menu header draws its total in font 4, in which no
  // text of that configuration contains a 4, while its one four page screen draws "4" in font 11. The font it lands in is returned, so the caller switches to it and back.
  const spell = (preferred: number, text: string): { font: number; codes: number[] } => {
    const font = fontThatSpells(state.current, map, text, preferred);
    const set = (fontSets(state.current) ?? [])[font];
    if (set === undefined) throw new ComposeError(`the config does not carry font ${font}`);
    return { font, codes: codesFor(map, state.current, set, text, font) };
  };
  const inline = (x: number, y: number, codes: readonly number[]): number[] =>
    [SCREEN_TEXT_INLINE, x, y, ...codes, 0];
  // How wide a text is in the font `spell` puts it in, which is where a right aligned number starts.
  const width = (preferred: number, text: string): number => {
    const { font, codes } = spell(preferred, text);
    return textWidth(state.current, (fontSets(state.current) ?? [])[font] as FontSet, codes);
  };
  // A text drawn at `(x, y)` reading `text`, in the font in effect, `current_`, and back to it after.
  const drawn = (x: number, y: number, text: string, preferred: number, current_: number | undefined): number[] => {
    const { font, codes } = spell(preferred, text);
    const back = font !== current_ && current_ !== undefined ? [SCREEN_SELECT_FONT, current_] : [];
    return [...(font === current_ ? [] : [SCREEN_SELECT_FONT, font]), ...inline(x, y, codes), ...back];
  };
  // Insert `bytes` at blob offset `at`, which must be an instruction boundary the caller chose.
  const insert = (at: number, bytes: readonly number[]): void => {
    const hole = relocate(state.current, at, bytes.length);
    hole.bytes.set(bytes, at);
    state.current = parse(restamped(hole.bytes));
  };
  // Keep a text that reads `want`. Otherwise an inline one is cut and drawn again, in a font that has
  // the glyphs, and one drawn by reference is pointed at a string this configuration already draws
  // reading `want`, since its bytes may be another draw's and a pointer field cannot be cut.
  const restate = (
    one: ScreenInstruction, font: number | undefined, want: string, what: string, endsAt?: number,
  ): void => {
    const glyphs = textGlyphs(state.current, one);
    if (glyphs !== undefined && decode(glyphs, map) === want) {
      // Right text, and a right aligned one also has to sit right: `composeMenuPage` draws a new
      // page's number at x 13, which is right for 1 to 9 except a 4 and wrong for 10 and up. The x
      // is the instruction's own operand, so moving it touches no borrower's glyphs.
      if (endsAt === undefined || font === undefined) return;
      const at = endsAt - width(font, want);
      if (one.operands[0] === at) return;
      const bytes = Uint8Array.from(state.current.blob);
      bytes[one.start + 1] = at;
      state.current = parse(restamped(bytes));
      return;
    }
    if (font === undefined) throw new ComposeError(`menu ${menu}'s ${what} is drawn before any font is chosen`);
    // A right aligned text moves when its width does, which a page number's does going from 9 to 10.
    const x = endsAt === undefined ? one.operands[0] as number : endsAt - width(font, want);
    const y = one.operands[1] as number;
    if (one.opcode === SCREEN_TEXT_INLINE) {
      // Other draws may borrow these glyphs by reference, which the compiler does for any two equal
      // strings: on the spare Harmony One the third page's own "3" is the header's. Each borrower is
      // pointed at another string reading what it reads first, or the cut would take its text away.
      const run = state.current.flashBase + one.start + 3;
      const runEnd = state.current.flashBase + one.start + one.length;
      for (const borrower of screenStrings(state.current, map)) {
        if (borrower.referencedFrom === undefined || borrower.referencedFrom < run
            || borrower.referencedFrom >= runEnd) continue;
        const set = (fontSets(state.current) ?? [])[borrower.font];
        const home = screenStrings(state.current, map).find((other) => other.text === borrower.text
          && other.referencedFrom === undefined && other.at !== one.start && set !== undefined
          && [...(textGlyphs(state.current, screenProgram(state.current, state.current.flashBase + other.at)?.[0] ?? one)
            ?? [])].every((code) => glyphOf(state.current, set, code) !== undefined));
        // Failing a string reading the same, the **tail** of a longer inline string ending in the same
        // codes: a reference reads glyphs from its address up to the terminator, so pointing into
        // another string's run draws exactly that run's end. Needed on arch 14, where a menu's first
        // page draws its total inline and the other pages, and other screens, borrow that one digit:
        // `h650_config_region`'s corner lists draw "2" inline once and reference it everywhere else,
        // so restating the total to "3" had nothing whole to hand the other "2"s to.
        let target = home === undefined ? undefined : state.current.flashBase + home.at + 3;
        if (target === undefined && set !== undefined) {
          const instructionAt = (at: number): ScreenInstruction | undefined =>
            screenProgram(state.current, state.current.flashBase + at)?.[0];
          const wanted = [...(textGlyphs(state.current, instructionAt(borrower.at) ?? one) ?? [])];
          for (const other of screenStrings(state.current, map)) {
            if (other.referencedFrom !== undefined || other.at === one.start || wanted.length === 0) continue;
            const codes = [...(textGlyphs(state.current, instructionAt(other.at) ?? one) ?? [])];
            const from = codes.length - wanted.length;
            if (from < 0 || !wanted.every((code, k) => codes[from + k] === code)) continue;
            if (!wanted.every((code) => glyphOf(state.current, set, code) !== undefined)) continue;
            target = state.current.flashBase + other.at + 3 + from;
            break;
          }
        }
        if (target === undefined) {
          throw new ComposeError(`menu ${menu}'s ${what} is borrowed by a draw of ${borrower.text} that `
            + 'no other string could take over');
        }
        const bytes = Uint8Array.from(state.current.blob);
        bytes.set(new Writer(3).u24(target).bytes, borrower.at + 3);
        state.current = parse(restamped(bytes));
      }
      const cut = excise(state.current, one.start, one.length);
      state.current = parse(restamped(cut.bytes));
      insert(one.start, drawn(x, y, want, font, font));
      return;
    }
    if (one.opcode !== SCREEN_TEXT_AT) throw new ComposeError(`menu ${menu}'s ${what} is not a text`);
    const { font: into } = spell(font, want);
    const set = (fontSets(state.current) ?? [])[into];
    const target = screenStrings(state.current, map).find((other) => {
      if (other.text !== want || set === undefined) return false;
      const codes = textGlyphs(state.current, screenProgram(state.current, state.current.flashBase + other.at)?.[0] ?? one);
      return codes !== undefined && [...codes].every((code) => glyphOf(state.current, set, code) !== undefined);
    });
    if (target === undefined) {
      throw new ComposeError(`menu ${menu}'s ${what} is drawn by reference and no string reads ${want}`);
    }
    const bytes = Uint8Array.from(state.current.blob);
    bytes.set(new Writer(3).u24(target.referencedFrom ?? state.current.flashBase + target.at + 3).bytes, one.start + 3);
    bytes[one.start + 1] = x;
    state.current = parse(restamped(bytes));
    if (into !== font) {
      // The font after the reference first, so the one before it does not move it.
      insert(one.start + one.length, [SCREEN_SELECT_FONT, font]);
      insert(one.start, [SCREEN_SELECT_FONT, into]);
    }
  };

  return {
    get current(): Container { return state.current; },
    set current(next: Container) { state.current = next; },
    spell, width, drawn, insert, restate,
  };
}

/**
 * Compose the screen half of a device: its own mode with one page drawing its label and its
 * commands, and one new row on every device list menu, entering that mode.
 *
 * Harmony One (arch 12) only, deliberately: a page's hit rectangles, its lead byte and every
 * position here are that model's, section 125, and the checklist's goal is a device on the spare
 * One. The hit rectangles themselves are reused rather than inserted: the page declares hit page
 * 10, the standard six slot device layout, and a page may bind any subset of what its hit page
 * offers, which is the closure section 125 measured at 268 of 268.
 *
 * What is deliberately not composed, each a difference for phase 7 to explain: the device icon on a
 * menu row **grown** on to an existing page (a row on a **new** page wears one, section 241, copied
 * from the row `iconLike` names), the page's bottom bar switch on state variable 35, the record
 * list's keypad bindings, and the per mode housekeeping lists the corpus chrome queues with opcode
 * 0x73.
 */
export interface ComposeScreenOptions {
  /**
   * A device list row whose icon a new page's row wears, by its drawn label, so a television gets
   * the television icon. Without it the first row's icon is copied, whatever it shows.
   */
  iconLike?: string;
  /**
   * Arch 14 only: the device list row whose device mode the new one takes its key map from, by its
   * drawn label. Every key that mode binds is bound in the new one too, to the new device's command
   * sending the same frame where exactly one does and to nothing otherwise, so a key never falls
   * through to another device's map. Without it the first row's mode is the template and no key
   * matches unless the numbers happen to agree.
   */
  keysLike?: string;
  /**
   * Lay the device mode out the way Logitech's compiler does, `devicemode.ts`, section
   * 325, rather than with one label font and a key map copied from another device. The rows' labels
   * are then sized, split and cut by the compiler's rules and drawn in a font of the size those rules
   * pick, the title is `title` cut to what the page counter leaves, a counter of two digits is drawn
   * where the compiler draws one, and the key map is `keys`, a list per scan, with every other key
   * bound to nothing. On the Harmony 600, 650 and 700 `keysLike` is still the mode whose key map's shape
   * is copied, its 47 tags and its two navigation entries, but none of its bindings. On the Harmony One the
   * rows are laid out by the touch family's own rules, section 394, and of this only `keys` is read, into
   * the shape of an existing device mode of as many pages, `todo-compile-one.md` 1.2.10.
   */
  compiled?: { title: string; keys: ReadonlyMap<number, number> };
}

/**
 * The activity menu's mode, as its family finds it, `Family.activityMenu`, and the marker its rows write.
 *
 * The shape of an activity row is the device list row's with one instruction swapped: beep, then
 * **select a base slot 9 entry** where a device row enters a mode, then the same per configuration
 * marker variable, written **0** where a device row writes 1. Section 275. On arch 14 (Harmony 600,
 * 650 and 700) there is no beep, as on that architecture's device rows, section 289.
 *
 * Read rather than tabulated for the same reason `deviceModeMarker` is: which variable marks the
 * top level screen differs per configuration, so a composer carrying a number would write a menu row
 * that parses, renders, and points the remote at the wrong screen.
 *
 * **The marker it returns is built**, section 329: `menuMarkerOf`'s variable with
 * `ACTIVITY_MENU_MARKER_VALUE`, checked against every row of both kinds, rather than the last
 * instruction of the last row this walk met. A configuration no family serves is read by its rows,
 * `activityMenuByRows`, and gets no marker.
 */
export function activityMenus(c: Container): { menu: number | undefined; marker: Instruction | undefined } {
  const family = familyOf(c);
  const menu = family === undefined ? activityMenuByRows(c) : family.activityMenu(c);
  return { menu, marker: menu === undefined || family === undefined ? undefined : menuMarkerWrite(c, ACTIVITY_MENU_MARKER_VALUE) };
}

/**
 * The activity menu found by its rows: the mode whose rows select the most base slot 9 entries,
 * `todo-compile-650.md` 6.2.9. The touch family's rule, and the four slot family's before section 375,
 * kept there as its calibration. A menu with no row is not found.
 */
export function activityMenuByRows(c: Container): number | undefined {
  const lists = c.actionLists() ?? [];
  const records = modeRecords(c) ?? [];
  let menu: number | undefined;
  let most = 0;
  records.forEach((record, index) => {
    const sets = new Set<number>();
    for (const page of record.pages) {
      for (const entry of taggedList(c, page.list)?.entries ?? []) {
        if (entry.opcode !== ACTION_LIST_INDEX_OPCODE) continue;
        const list = lists[entry.operand];
        if (activityRowEnd(list, traitsOf(c)) === undefined) continue;
        sets.add((activityRowBody(list, traitsOf(c))?.[0] as Instruction).operand & 0xff);
      }
    }
    if (sets.size > most) { most = sets.size; menu = index; }
  });
  return menu;
}

/**
 * An activity row without its beep: a Harmony 600, 650 and 700 row carries none and a Harmony One row
 * opens with one, section 289, which is `FamilyTraits.screenItemsBeep`.
 */
function activityRowBody(
  list: readonly Instruction[] | undefined, traits: FamilyTraits,
): readonly Instruction[] | undefined {
  if (list === undefined) return undefined;
  if (!traits.screenItemsBeep) return list;
  return list[0]?.opcode === BEEP_OPCODE ? list.slice(1) : undefined;
}

/**
 * The instruction an activity row ends with, if `list` has an activity row's shape: select a base
 * slot 9 entry, then a state write, the menu marker's, section 275.
 */
function activityRowEnd(
  list: readonly Instruction[] | undefined, traits: FamilyTraits,
): Instruction | undefined {
  const body = activityRowBody(list, traits);
  if (body === undefined || body.length !== 2) return undefined;
  const select = body[0] as Instruction;
  const end = body[1] as Instruction;
  if (select.opcode !== SELECT_BINDING_SET) return undefined;
  if ((select.operand & SELECT_BINDING_SET_MASK) !== SELECT_BINDING_SET_MASK) return undefined;
  return end.opcode >= STATE_WRITE_BASE ? end : undefined;
}

/** What `composeActivityMenuRow` put on the screen, for a caller that has to find it again. */
export interface ComposedActivityRow {
  bytes: Uint8Array;
  /** The mode the activity menu is, which the row was added to. */
  menu: number;
  /** Which page of that menu gained the row, counting from zero. */
  page: number;
  /**
   * The base slot 10 list the row runs: beep, select the entry, clear the device mode marker, and on
   * arch 14 (Harmony 600, 650 and 700) the first of `rowLists`, which carry no beep.
   */
  rowList: number;
  /** The scan code the new row answers to, which is its position in the page's hit rectangles. */
  scan: number;
  /**
   * Every scan the row answers to: `scan` alone on arch 12 (Harmony One), and on arch 14 (Harmony
   * 600, 650 and 700) both buttons of the row, top or bottom, section 273.
   */
  scans: number[];
  /**
   * How many row lists were written from `rowList` on: one on arch 12, where every binding shares
   * it, and on arch 14 one per button on the page and another per button on its copy, as the compiler
   * writes them, section 285.
   */
  rowLists: number;
}

export interface ComposeActivityRowOptions {
  /**
   * An existing activity menu row whose icon the new row wears, by its drawn label, so a television
   * activity gets the television icon. Without it the first row's icon is copied, whatever it shows,
   * which is `composeDeviceScreen`'s behaviour and its documented wart: on the spare Harmony One the
   * first row is a music activity, so an unqualified television activity comes out wearing a disc.
   */
  iconLike?: string;
}

export interface ComposeActivityScreenOptions {
  /**
   * An existing activity, by its drawn menu label, whose start up screen the new activity shows.
   * That screen draws the activity's icon, so a television activity wants a television one. Without
   * it, on the Harmony One, the start up screen of the activity whose working screen served as the
   * template is used. **Harmony One only**: on a Harmony 600, 650 or 700 every start up screen draws one picture and is
   * built, section 336, so it is refused there rather than ignored.
   */
  startupLike?: string;
}

export interface ComposedActivityScreen {
  bytes: Uint8Array;
  /** The activity value the screen was composed for, which `composeActivity` must then produce. */
  activity: number;
  /** The new working screen, base slot 6. */
  mode: number;
  /** The start up screen the enter list should open with: an existing one on the Harmony One, the one composed with it on arch 14. */
  startupMode: number;
  /** The existing list every activity's enter list calls to say an activity is running. Harmony One only. */
  activeList?: number;
  /** The base slot 14 record that gained the activity's case: on arch 14, the working screen's. */
  map: number;
  /** The list the page's "Devices" key runs: beep, enter the device list. Harmony One only. */
  devicesList?: number;
  /** The scan codes the pads answer to, in row order. Empty on arch 14, whose pads are the corners. */
  scans: number[];
  /** Arch 14 only: the variable the start sequence holds at 1, and the one it writes before deferring. */
  startVariable?: number;
  flagVariable?: number;
  /** Arch 14 only: the base slot 9 entry the keypad map case selects, which `composeActivity` must add. */
  set?: number;
  /** Arch 14 only: the base slot 14 records that gained a case, working screen's first. */
  maps?: number[];
  /** Arch 14 only: how many pages the working screen has. */
  pages?: number;
}

/**
 * A base slot 14 case's program as the compiler writes every one an activity keyed record holds: queue
 * one action, `0x11` and its operand and opcode, then the end, five bytes. Every case of the working
 * screen, key under Devices and keypad map records has this shape on the thirteen compiles but the
 * working screen record's idle case, which queues a further record, section 336; one derivation for the
 * composer and the check. The Harmony One's and the Harmony 525's cases have it too, which is why it is
 * shared since section 376.
 */
export function caseProgram(opcode: number, operand: number): Uint8Array {
  return new Writer(5).u8(SCREEN_QUEUE_INSTRUCTION).u16(operand).u8(opcode).u8(SCREEN_END).bytes;
}

/**
 * One more case in an existing base slot 14 record: `key` runs `program`, a screen language program
 * ending in its own `0x00`. The step both architectures' activity screen composers share.
 *
 * The case goes on the end of the record, pointing at an existing case's program so the census can
 * see it, then the program is inserted in front of the lowest one the record names, then the case is
 * swapped onto it. Moved out of the Harmony One's `composeActivityScreen` unchanged, section 279, with
 * one refusal added: a key the record already has a case for, since the walk stops at the first match
 * and a second case for the same key would never run. **A record with no case** points its first at the
 * lowest program any record names, and the program goes in front of that one, section 376.
 */
export function appendValueMapCase(start: Container, map: number, key: number, program: Uint8Array): Container {
  // A record is a byte, a count of `VALUE_MAP_COUNT_WIDTH` bytes, then the cases: the count is one
  // byte on the Harmony One and two on the Harmony 600, 650 and 700, which is where the cases start.
  const width = VALUE_MAP_COUNT_WIDTH[start.architecture as number];
  const record = valueMaps(start)?.[map];
  const recordAt = record === undefined ? undefined : start.blobOffsetOf(record.address);
  if (width === undefined || record === undefined || recordAt === undefined
      || record.entries.length >= 2 ** (8 * width) - 1) {
    throw new ComposeError(`base slot 14 record ${map} does not read, or is full`);
  }
  if (record.entries.some(([one]) => one === key)) {
    throw new ComposeError(`base slot 14 record ${map} already has a case for ${key}`);
  }
  const stride = VALUE_MAP_KEY_WIDTH + 3;
  const anchor = record.entries[0]?.[1]
    ?? Math.min(...(valueMaps(start) ?? []).flatMap((one) => [...one.entries.map(([, to]) => to), ...one.ranges.map(([, , to]) => to)]));
  if (!Number.isFinite(anchor)) throw new ComposeError(`no base slot 14 record names a program for record ${map}'s first case to go in front of`);
  const caseAt = recordAt + 1 + width + stride * record.entries.length;
  const caseHole = relocate(start, caseAt, stride);
  // Written after the hole is made, so an anchor above it has moved by the case's length.
  const anchorAt = start.blobOffsetOf(anchor);
  const moved = anchorAt !== undefined && anchorAt >= caseAt ? anchor + stride : anchor;
  caseHole.bytes.set(new Writer(stride).u16(key).u24(moved).bytes, caseAt);
  const count = new Writer(width);
  if (width === 1) count.u8(record.entries.length + 1); else count.u16(record.entries.length + 1);
  caseHole.bytes.set(count.bytes, recordAt + 1);
  const current = parse(caseHole.bytes);
  const grownRecord = valueMaps(current)?.[map];
  const lowest = Math.min(...(grownRecord?.entries ?? []).map(([, target]) => target));
  const programAt = current.blobOffsetOf(lowest);
  if (grownRecord === undefined || programAt === undefined) {
    throw new ComposeError(`base slot 14 record ${map} stopped reading`);
  }
  const programHole = relocate(current, programAt, program.length);
  programHole.bytes.set(program, programAt);
  const placed = parse(programHole.bytes);
  const finalRecord = valueMaps(placed)?.[map];
  const finalAt = finalRecord === undefined ? undefined : placed.blobOffsetOf(finalRecord.address);
  if (finalRecord === undefined || finalAt === undefined) {
    throw new ComposeError(`base slot 14 record ${map} stopped reading`);
  }
  placed.blob.set(new Writer(3).u24(placed.flashBase + programAt).bytes,
                  finalAt + 1 + width + stride * (finalRecord.entries.length - 1) + VALUE_MAP_KEY_WIDTH);
  return parse(placed.blob);
}
