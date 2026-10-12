/**
 * The four slot screens' chrome on the Harmony 600, 650 and 700: the bars, the corner, the title,
 * the counter and the bottom word, the corner labels' lines, and a device mode's key map, built and
 * checked against the configuration's own pages. Plan 007's four slot family, cut out of `compose.ts`
 * unchanged.
 */
import { u24 } from '../../bytes.ts';
import { namedContentEnd } from '../../coverage.ts';
import {
  fontsBySize, HARD_KEYS, LABEL_WIDTH, LABEL_WRAP_WIDTH, ladderOf, pageCounter, sizeOfSet, TITLE_RUNG, wrapAtSpaces,
} from '../../devicemode.ts';
import { Writer } from '../../emit.ts';
import { activityKeyedRecords } from '../../families/four-slot/activityscreen.ts';
import { type MenuPart } from '../../families/four-slot/menus.ts';
import { type FontSet, fontSets, glyphOf } from '../../font.ts';
import { archSlot, Container, type Instruction } from '../../gspm.ts';
import {
  ACTIVITY_STATE_NAME, compilerTagOrder, deviceListRows, FOUR_SLOT_ITEMS, FOUR_SLOT_SCREEN_WIDTH, KEY_EVENT_PRESS,
  KEY_EVENT_SHIFT, MAP_VALUE_OPCODE, RUN_SCREEN_PROGRAM, SEND_INFRARED, stateVariables,
} from '../../inventory.ts';
import { irGroups } from '../../ir.ts';
import { irFrame } from '../../irframe.ts';
import {
  bitmapReference, bitmaps, pictureBank, pictureReference, reachablePrograms, SCREEN_DRAW_IMAGE,
  SCREEN_DRAW_IMAGE_AT, SCREEN_END, SCREEN_QUEUE_INSTRUCTION, SCREEN_SELECT_FONT, SCREEN_SWITCH_NARROW,
  SCREEN_TABLE_SLOT, SCREEN_TEXT_AT, SCREEN_TEXT_INLINE, type ScreenInstruction, screenProgram,
} from '../../screen.ts';
import { contentKey } from '../../screencategories.ts';
import { ACTION_LIST_INDEX_OPCODE, handlerSets, modeRecords, type TaggedEntry, taggedList } from '../../sections.ts';
import { STATE_WRITE_BASE } from '../../actions.ts';
import { ComposeError } from '../../shared/core.ts';
import { activityMenus } from '../../shared/menus.ts';
import { codesFor, spellsIn, textWidth } from '../../shared/spelling.ts';
import { characterMap, referencedStringAddress } from '../../text.ts';
import { valueMaps } from '../../valuemap.ts';

/*
 * ---- The screen half, arch 14 (Harmony 600, 650 and 700), section 285 ----
 *
 * An arch 14 screen is not a touch screen. It labels the four buttons around the display, one label
 * per corner, and a page of a device list or a device mode binds those four buttons and nothing
 * else: `FOUR_SLOT_ITEMS` in `inventory.ts`, where the reader lives. Everything below is read off
 * the configuration being composed into, the way the Harmony One's half reads its pictures: the
 * chrome is copied from one of the configuration's own device pages, the two backgrounds from its
 * device mode pages, the key map's shape from one of its device modes, and the row marker from its
 * rows. What is a constant is the geometry, which is the same on all four arch 14 user
 * configurations here.
 *
 * Three differences from the Harmony One's half, each measured rather than assumed:
 *
 * * a mode's pages carry **their own** chrome, background, bars, title and page counter, with no call
 *   to a shared program, so the block is list, then a program and a six byte page record per page,
 *   then the entry, which is how the 650's own modes are laid out;
 * * a device mode's own list binds **every** key: 47 entries on all 21 device modes of the four
 *   configurations, each key either sending that device's command or bound to nothing, 547 of 547
 *   bound keys sending. The Harmony One's composed mode had an empty list, which lets a key fall
 *   through to whatever lies below it; here the key map is composed with the mode;
 * * a row is two instructions, enter the mode and write the marker, with no beep.
 *
 * A menu whose last page is full gets a new page, `openFourSlotMenuPage`, and every page of it then
 * counts to the new total, `paginateFourSlot`, since todo-compile-650 2.3; until then it was refused,
 * because a new page renumbers every page counter of that menu. What is still refused is a tenth page,
 * whose counter would be two digits drawn further left, which nothing here writes. The `0x7F`
 * delay step in front of every arch 14 command is not this function's: `composeDevice` emits it,
 * section 287, with the device's `InterDeviceDelay` variable and its table.
 */

/**
 * Break a corner label the way the compiler does, and where its font cannot hold it, a third line or a
 * line wider than a corner holds, draw it in the first of `smaller` that can, or refuse it. Returns the
 * font and the glyph codes per line, one or two.
 *
 * **The rule is `devicemode.ts`'s**, section 330: a label with no space stays whole, one no wider than
 * `LABEL_WRAP_WIDTH` stays whole, and a wider one is broken by `wrapAtSpaces`, measured here in the
 * configuration's own label font rather than in a size's table. Its two numbers were constants of this
 * file, 58 and 59, measured over the 13 Logitech compiles' corner labels by section 323, until section
 * 330 made them the ones section 325 measured over device mode pages; both measurements are on
 * `LABEL_WRAP_WIDTH`'s docstring. A two line label's lines sit `TWO_LINE_RISE` apart, 25 and 40 in the
 * top row and 75 and 90 in the bottom, on all 880 such labels section 323 counted, which is the label
 * font's line height and also had a copy here.
 *
 * **A label its font cannot hold goes down a size**, `smaller`, `todo-compile-650.md` 8.2.3: the compiler
 * draws `Antenna`, 60 pixels in the page's font, in another font, section 323, the one such corner label
 * in its compiles, and on a device mode page it walks the sizes down by the same test, section 325. It is
 * the case our letters make common, whose `T` and `t` are wider than Logitech's in the largest size, so
 * `Teletext`, 58 pixels in Logitech's letters, is 60 in ours. What the compiler's choice rests on beyond
 * width is not read, section 323's 16 labels drawn smaller that would fit, and no rule here reproduces it.
 */
export function fourSlotLabelLines(
  map: NonNullable<ReturnType<typeof characterMap>>, c: Container, set: FontSet, font: number, label: string,
  smaller: readonly number[] = [],
): { font: number; lines: number[][] } {
  let refusal: ComposeError | undefined;
  for (const one of [font, ...smaller]) {
    const oneSet = one === font ? set : (fontSets(c) ?? [])[one] as FontSet;
    // A smaller font that cannot spell the label is passed over, since a set carries only the glyphs its
    // compiler needed: a Harmony 700 compile's next size down has no space, and the label falls to the
    // one below or to the refusal in the page's own font.
    if (one !== font && !spellsIn(map, c, oneSet, label, one)) continue;
    const width = (text: string): number => textWidth(c, oneSet, codesFor(map, c, oneSet, text, one));
    const lines = !label.includes(' ') || width(label) <= LABEL_WRAP_WIDTH
      ? [label]
      : wrapAtSpaces(label, width) as string[];
    const tooWide = lines.find((line) => width(line) > LABEL_WIDTH);
    if (lines.length <= 2 && tooWide === undefined) {
      return { font: one, lines: lines.map((line) => codesFor(map, c, oneSet, line, one)) };
    }
    // The refusal names the page's own font, the one a shorter label would be drawn in.
    refusal ??= lines.length > 2
      ? new ComposeError(`'${label}' breaks onto ${lines.length} lines and a corner holds two in its font: `
        + 'give it a shorter label')
      : new ComposeError(`'${tooWide}' is ${width(tooWide as string)} pixels wide and a corner holds ${LABEL_WIDTH}: `
        + 'give it a shorter label');
  }
  throw refusal as ComposeError;
}

/**
 * The fonts a corner label in `font` may go down to, smallest last: every set of a smaller size of the
 * configuration's ladder, `ladderOf`, drawn in the same colours as `font`, since a set carries its colour
 * in its glyphs and a label in the title's green showed as its shadow alone at the bench, and none of
 * `avoid`. Empty where `font` is of no size the ladder knows.
 */
export function smallerLabelFonts(
  c: Container, map: NonNullable<ReturnType<typeof characterMap>>, font: number, avoid: ReadonlySet<number>,
): number[] {
  const sets = fontSets(c) ?? [];
  const ladder = ladderOf(c, map);
  const rung = sizeOfSet(c, sets[font] as FontSet, map, ladder);
  if (rung === undefined) return [];
  const colours = (set: FontSet): string => {
    const seen = new Set<number>();
    for (const code of map.codes.keys()) {
      for (const row of glyphOf(c, set, code)?.rows ?? []) for (const p of row) if (p !== undefined) seen.add(p);
    }
    return [...seen].sort((a, b) => a - b).join(',');
  };
  const own = colours(sets[font] as FontSet);
  const bySize = fontsBySize(c, map, ladder);
  return [...bySize.keys()].filter((k) => k > rung).sort((a, b) => a - b)
    .flatMap((k) => bySize.get(k) ?? [])
    .filter((one) => !avoid.has(one) && colours(sets[one] as FontSet) === own);
}

/**
 * The page counter's three glyphs, `n`, `/`, `m`, at these x on the title's y: a corner page's, when
 * its mode has two to nine pages, 98 of 98. A two row list's pages draw it at `0x63`, `0x6A`, `0x6F`
 * and a mode of ten pages or more further left, neither of which the composer writes. In Logitech's
 * letters; `fourSlotCounterX` gives the places in a configuration's own.
 */
export const FOUR_SLOT_COUNTER_X: readonly [number, number, number] = [0x6a, 0x71, 0x76];

/**
 * A corner page's counter places in the letters a configuration carries, `ladderOf`: the chain
 * `pageCounter` puts against the right edge, which is `FOUR_SLOT_COUNTER_X` in Logitech's letters and
 * `107, 113, 119` in ours, `todo-compile-650.md` 8.2.3. Measured on `1/2`, which stands for every one
 * digit counter because every digit of the title's size is one width in both ladders, which
 * `devicemode.test.ts` holds.
 */
export function fourSlotCounterX(c: Container): readonly [number, number, number] {
  const map = characterMap(c);
  if (map === undefined) return FOUR_SLOT_COUNTER_X;
  return pageCounter(1, 2, ladderOf(c, map)).map((one) => one.x) as [number, number, number];
}

export const FOUR_SLOT_TITLE_XY: readonly [number, number] = [0, 2];

/** The opcode sequence of a device mode page's chrome, around the part a composer writes. */
export const FOUR_SLOT_PREFIX = [SCREEN_DRAW_IMAGE, SCREEN_QUEUE_INSTRUCTION, SCREEN_DRAW_IMAGE_AT] as const;

export const FOUR_SLOT_SUFFIX_OPCODES = [SCREEN_DRAW_IMAGE_AT, SCREEN_SELECT_FONT] as const;

/** An instruction's bytes, copied, with the address it ends in shifted when it names one. */
function copiedInstruction(
  c: Container, instruction: ScreenInstruction, shift: (address: number) => number,
): Uint8Array {
  const bytes = c.blob.slice(instruction.start, instruction.start + instruction.length);
  if (instruction.opcode === SCREEN_DRAW_IMAGE || instruction.opcode === SCREEN_DRAW_IMAGE_AT
      || instruction.opcode === SCREEN_TEXT_AT) {
    const at = bytes.length - 3;
    bytes.set(new Writer(3).u24(shift(u24(bytes, at))).bytes, at);
  }
  return bytes;
}

/** The frame a list sends, as `bits:value`, or undefined for a list with no send or no frame. */
export function sentFrame(c: Container, list: readonly Instruction[] | undefined): string | undefined {
  const send = list?.find((one) => one.opcode === SEND_INFRARED);
  if (send === undefined) return undefined;
  const address = irGroups(c)?.[send.operand >> 8]?.addresses[send.operand & 0xff];
  const frame = address === undefined ? undefined : irFrame(c, address);
  return frame === undefined ? undefined : `${frame.bits}:${frame.value.toString(16)}`;
}

/*
 * ---- A device mode page's chrome and a device mode's key map, built, section 330 ----
 *
 * `todo-compile-650.md` 6.2.6 and 6.2.7. Until then the composer took a device mode page's chrome, its
 * background, the queued program, the two bars and the bottom word, off the first device page of the
 * configuration it extended, the two backgrounds by majority over every device page, and the shape of a
 * new device mode's key map off another device's mode. Each is now built: the instructions from the
 * geometry every device page on the thirteen Logitech compiles shares, the pictures by their content out
 * of the fixed set of section 317, the queued program by a rule over base slot 11, and the key map's
 * tags from section 325's key table in the compiler's hash order. What the configuration holds is then
 * checked against what is built, as sections 319 and 329 did for what they built.
 *
 * What is still read off the configuration and why: the title, counter and label **fonts**, which are
 * the configuration's own numbering of its font sets, `todo-compile-650.md` 6.2.12; the **record** the
 * key under Devices maps through, which is read off the activity menu, since a record's index is the
 * description's order, section 324; and the pictures' and the bottom word's **addresses**, since the
 * bytes are the configuration's until chapter 9 builds them.
 */

/**
 * The fixed pictures a device mode page's chrome draws, by `contentKey`, per look. **A look belongs to
 * the model and the service generation together**, section 317: the Harmony 650 and the 2026 Harmony
 * 700 compiles draw one, the Harmony 700 compiles of 2021 and 2023 another, and the Harmony 600, whose
 * display is monochrome, a third. Every device mode page on the thirteen Logitech compiles for the
 * Harmony 600, 650 and 700 draws one look's five, and which look is the configuration's own is decided
 * by its skin, the low byte of its version word, section 81, and by which looks it holds whole: one of
 * the two Harmony 600 compiles, `h600_config`, holds the 2021 and 2023 colour look's five as well, so
 * the skin is needed and the pictures alone do not decide.
 *
 * Only the skins measured are named: 66 the Harmony 700, 71 and 73 the Harmony 600 and its European
 * model, 72 the Harmony 650. The European 650 and 700, 74 and 69, would take their twins' looks if
 * section 131's pairing carries over to pictures, which nothing here has read, so they are refused.
 *
 * The keys are content hashes and not the pictures; a key names a picture the configuration already
 * carries and nothing here can draw one. That waits for `todo-compile-650.md` chapter 9.
 */
export interface DevicePageLook {
  name: string;
  skins: readonly number[];
  /** The background of a page holding one item or none, and of a page holding more: the corner cross. */
  single: string;
  crossed: string;
  /** The bar along the top, 128 by 16, and the one along the bottom, drawn over the whole screen. */
  topBar: string;
  bottomBar: string;
  /** The corner patch the queued program draws first, which is what ties that program to this look. */
  cornerPatch: string;
  /**
   * The menus' own pictures, section 334, `todo-compile-650.md` 6.2.9: the background every page of the
   * two row device list draws, whatever it holds; the activity menu's background on a page holding two
   * activities and on one holding one; and the corner patch the program the activity menu queues draws.
   * Measured on the thirteen compiles: the two row list's on all 43 pages of its 13 lists, whether they
   * hold one device or two, the activity menu's full page on all 18 of its pages holding two, and its
   * page of one activity on the 4 there are,
   * one per look: `h650_config_region`'s, the Harmony 700 pair's, and `h600_config`'s, which draws the
   * 2021 and 2023 colour look's one item background on a monochrome remote, the picture its activities'
   * own working screens draw too. A look's menu pictures need not all be held: a configuration holds a
   * picture only where one of its programs draws it, so one whose programs draw no page of one activity,
   * neither a menu page nor an activity's working screen, has no such picture and a page needing it is
   * refused. Some pictures are drawn only by programs no mode page reaches, the corner patches among
   * them, which is why it is programs and not pages.
   */
  rows: string;
  activitiesFull: string;
  activitiesSingle: string;
  activitiesPatch: string;
  /**
   * An activity's own two screens, section 336, `todo-compile-650.md` 6.2.10: the picture every start up
   * screen draws, one per look and the same for every activity, 40 of 40 on the thirteen compiles, and
   * the background of a working screen page holding two commands or more, 42 pages of 42. A working page
   * of one command or none draws `activitiesSingle`, the activity menu's page of one activity, 21 of 21,
   * which is the agreement section 316's route rests on. The 2021 and 2023 colour look and the
   * monochrome one share their start up picture, and the monochrome look's working background is the
   * 2021 and 2023 colour look's crossed device page picture, on both Harmony 600 compiles.
   */
  startup: string;
  workingSeveral: string;
}

export const DEVICE_PAGE_LOOKS: readonly DevicePageLook[] = [
  {
    name: 'the colour look of 2026', skins: [66, 72],
    single: '0061c06666b425f1', crossed: '45888f139bd13f9c',
    topBar: 'e247f3ff422472de', bottomBar: '9e81b982b33e2ff5', cornerPatch: 'c7d320f981025b68',
    rows: '45888f139bd13f9c', activitiesFull: '711cbbb1a44ca656', activitiesSingle: '21bc4747e696eba8',
    activitiesPatch: '4c42bdc959b5ad48', startup: 'a2368d93e91ee138', workingSeveral: 'a0d49b45e9df025c',
  },
  {
    name: 'the colour look of 2021 and 2023', skins: [66],
    single: 'fb5f49a2ee63c0f9', crossed: '59a6f04d6ba0e90a',
    topBar: 'e247f3ff422472de', bottomBar: '564e0ea2da45a0fd', cornerPatch: '6a7beeb149ddb000',
    rows: '59a6f04d6ba0e90a', activitiesFull: '6ed840035d2f19ba', activitiesSingle: 'adc399032d1d41b0',
    activitiesPatch: '4c42bdc959b5ad48', startup: 'a56cda25b2f115a2', workingSeveral: '5d94a9eb5d7de1de',
  },
  {
    name: 'the monochrome look', skins: [71, 73],
    single: 'b632fecee357d2c7', crossed: '7e1f839276f704c9',
    topBar: 'e247f3ff422472de', bottomBar: '564e0ea2da45a0fd', cornerPatch: '6a7beeb149ddb000',
    rows: 'c442f1b3a81999ec', activitiesFull: '18a044e60240cbd1', activitiesSingle: 'fb5f49a2ee63c0f9',
    activitiesPatch: '6a7beeb149ddb000', startup: 'a56cda25b2f115a2', workingSeveral: '59a6f04d6ba0e90a',
  },
];

/**
 * Where a device mode page draws its chrome: the background at 0, 0; the top bar placed by the six bytes
 * `0, 0, 0, 0, 128, 16` and the bottom bar by `0, 0, 0, 0, 128, 128`; and the bottom word, "Back", on the
 * line at y 114, centred, which is x 49 on every page. All 639 device mode pages of the thirteen.
 */
export const DEVICE_PAGE_BACKGROUND_AT: readonly number[] = [0, 0];

export const DEVICE_PAGE_TOP_BAR_AT: readonly number[] = [0, 0, 0, 0, 128, 16];

export const DEVICE_PAGE_BOTTOM_BAR_AT: readonly number[] = [0, 0, 0, 0, 128, 128];

export const DEVICE_PAGE_BACK_Y = 114;

/** The bottom word: what the key under the display's centre does on a device page, go back. */
export const DEVICE_PAGE_BACK_WORD = 'Back';

/** The firmware's state variable 17, which the corner programs switch on: the sending flag, section 369, which section 317 read as the corner. */
export const SENDING_FLAG_VARIABLE = 17;

/**
 * The chrome a four slot page draws around its middle, every piece built or located: the background by
 * how many items the page holds, the queued program, the two bars and the bottom word. A device mode
 * page's, `DeviceModeChrome`, and an activity's working screen's, `ActivityScreenChrome`, are each one of
 * these, and differ in the word, the two backgrounds and the queued program, section 336.
 */
export interface PageFrame {
  look: string;
  /**
   * The background of a page holding one item or none, and of one holding more, located by content.
   * Undefined where the configuration does not hold the picture, which only a working screen's can be,
   * and then a page needing it is refused.
   */
  single: number | undefined;
  crossed: number | undefined;
  topBar: number;
  bottomBar: number;
  /** The base slot 11 entry the page queues, `0x73`, and the mode's key map runs under tag `0x2D`. */
  corner: number;
  /** The bottom word: the word, its font, its glyph codes there, its x, and the address of an inline copy to point at. */
  word: string;
  backFont: number;
  backCodes: number[];
  backX: number;
  backHome: number | undefined;
}

/** What a device mode page's chrome is made of in one configuration, every piece built or located. */
export interface DeviceModeChrome extends PageFrame {
  /**
   * The pictures' addresses, located by content. The crossed background is always held, since every
   * compile has a device page of several commands. **The one item background need not be**: a compile
   * carries only the pictures its pages draw, and Logitech's compile of the Harmony 650's starting
   * setup, `h650_start_config`, has no device page of one command and so no such picture,
   * `todo-compile-650.md` 3.9. Undefined then, and a page that needs it is refused where it is drawn.
   */
  single: number | undefined;
  crossed: number;
}

/** Every picture of a configuration by its content, the bank's and the ones outside it, as `screenUnits` lists them. */
export function picturesByContent(c: Container): Map<string, number[]> {
  const bank = pictureBank(c, namedContentEnd(c)) ?? [];
  const inBank = new Set(bank.map((one) => one.address));
  const out = new Map<string, number[]>();
  for (const picture of [...bank, ...bitmaps(c).filter((one) => !inBank.has(one.address))]) {
    const off = c.blobOffsetOf(picture.address);
    if (off === undefined || picture.length === undefined) continue;
    const key = contentKey(c.blob.subarray(off, off + picture.length));
    out.set(key, [...(out.get(key) ?? []), picture.address]);
  }
  return out;
}

/**
 * The corner program a device page queues: **the first base slot 11 entry that no base slot 14 case
 * names and that opens with a switch on the firmware's state variable 17**. There are two such programs
 * on the Harmony 600's compiles and three on the others', and every device mode page queues the first,
 * 639 pages of 639 on the 13 compiles; a page of another mode queues one of them or none. No base slot
 * 14 case names any such program on those compiles, so that half of the rule excludes nothing there and
 * is kept because a program a case names is run by a value, not queued by a page. Its index is the
 * configuration's own, 1 on seven compiles and 0 on the six power hold ones. The rule is an order and
 * the check is the picture: the program found has to draw the look's corner patch, which is a closure
 * between base slot 11's order and the picture bank's content.
 */
function deviceCornerProgram(c: Container, look: DevicePageLook, pictures: Map<string, number[]>): number {
  const index = cornerPrograms(c)[0];
  if (index === undefined) throw new ComposeError('no base slot 11 program switches on the sending flag, so a device page has nothing to queue');
  if (!programDraws(c, index, pictures.get(look.cornerPatch) ?? [])) {
    throw new ComposeError(`base slot 11 entry ${index}, the first corner program, does not draw ${look.name}'s corner patch`);
  }
  return index;
}

/**
 * Every base slot 11 entry that no base slot 14 case names and that opens with a switch on the sending flag,
 * state variable 17, in table order: two on the Harmony 600's compiles and three on the others', each
 * drawing one common picture and one corner patch of its own, section 334. `deviceCornerProgram` takes the
 * first and the activity menu's queued program is the one drawing its look's `activitiesPatch`.
 */
export function cornerPrograms(c: Container): number[] {
  const table = c.pointerArray(archSlot(c.architecture as number, SCREEN_TABLE_SLOT)) ?? [];
  const named = new Set<number>();
  for (const map of valueMaps(c) ?? []) {
    for (const [, target] of map.entries) named.add(target);
    for (const [, , target] of map.ranges) named.add(target);
  }
  const out: number[] = [];
  table.forEach((address, index) => {
    if (named.has(address)) return;
    const first = screenProgram(c, address)?.[0];
    if (first?.opcode === SCREEN_SWITCH_NARROW && first.operands[0] === SENDING_FLAG_VARIABLE) out.push(index);
  });
  return out;
}

/** Whether base slot 11 entry `index`, or a program it reaches, draws one of the pictures at `addresses`. */
export function programDraws(c: Container, index: number, addresses: readonly number[]): boolean {
  const address = c.pointerArray(archSlot(c.architecture as number, SCREEN_TABLE_SLOT))?.[index];
  if (address === undefined) return false;
  const icons = new Set(addresses);
  return [...reachablePrograms(c, [address]).values()].some((program) =>
    program.some((one) => icons.has(pictureReference(one) ?? -1)));
}

/**
 * A word on a screen's bottom line, as the compiler draws it on every device mode page and every menu
 * page of the thirteen compiles: in the first font of the title's size that spells it, which is font 1
 * on all thirteen, centred, `floor((128 - width) / 2)`. "Back" at 49, "Activities" at 35, "Activity" at
 * 39 and "Devices" at 40. One copy for the device mode chrome and the menus' since section 334.
 */
export function bottomWord(c: Container, word: string): { font: number; codes: number[]; x: number } {
  const map = characterMap(c);
  if (map === undefined) throw new ComposeError('the config draws no text this can spell from');
  const sets = fontSets(c) ?? [];
  for (const font of fontsBySize(c, map, ladderOf(c, map)).get(TITLE_RUNG) ?? []) {
    let codes: number[];
    try {
      codes = codesFor(map, c, sets[font] as FontSet, word, font);
    } catch (error) {
      if (!(error instanceof ComposeError)) throw error;
      continue;
    }
    return { font, codes, x: Math.floor((FOUR_SLOT_SCREEN_WIDTH - textWidth(c, sets[font] as FontSet, codes)) / 2) };
  }
  throw new ComposeError(`no font of the title's size spells '${word}'`);
}

/**
 * A screen's bottom line as parts: the bottom bar placed by `0, 0, 0, 0, 128, 128` over the picture
 * `bar`, and `word` on the line at y 114, centred in `bottomWord`'s font, which the caller selects
 * between the two where another is in effect. What every device mode page and menu page draws at the
 * bottom, and since section 357 what the firmware's screens with an "Exit" draw: 22 of 22 compiles
 * place it there.
 */
export function bottomLineParts(c: Container, bar: number, word: string): { bar: MenuPart; font: number; text: MenuPart } {
  const bottom = bottomWord(c, word);
  return {
    bar: { op: 'bar', at: DEVICE_PAGE_BOTTOM_BAR_AT, address: bar },
    font: bottom.font,
    text: { op: 'text', x: bottom.x, y: DEVICE_PAGE_BACK_Y, codes: bottom.codes, role: 'bottom' },
  };
}

/**
 * Where the compiler keeps the one copy of each text that other texts point at: for every run of glyph
 * codes some program draws inline, the lowest address it is drawn inline at, keyed by the codes joined.
 * Every text a menu page or a device mode page of the thirteen compiles draws by reference points at
 * exactly this copy, and every one drawn inline is this copy, section 334, so a page built here points
 * at it and a configuration's own pages are checked against it. The menu pages' half is checked, 164
 * of 164; the device mode pages' half was measured by that section's review, 4613 texts by reference
 * and 2336 inline on 639 pages with no exception, and only their bottom word is checked.
 */
export function inlineHomes(c: Container): Map<string, number> {
  const homes = new Map<string, number>();
  for (const [, program] of reachablePrograms(c)) {
    for (const one of program) {
      if (one.opcode !== SCREEN_TEXT_INLINE || one.glyphs === undefined) continue;
      const key = [...one.glyphs].join(',');
      const at = c.flashBase + one.start + 3;
      const was = homes.get(key);
      if (was === undefined || at < was) homes.set(key, at);
    }
  }
  return homes;
}

/**
 * Whether the configuration holds one of Logitech's device page looks whole, the artwork `deviceModeChrome`
 * finds by content. A configuration in our look, section 366's state colours, holds none, so a reader
 * checking against Logitech's artwork has nothing to check against there, section 375.
 */
export function holdsLogitechLook(c: Container): boolean {
  const skin = (c.versionWord ?? -1) & 0xff;
  const pictures = picturesByContent(c);
  return DEVICE_PAGE_LOOKS.some((look) => look.skins.includes(skin)
    && (['crossed', 'topBar', 'bottomBar', 'cornerPatch'] as const).every((role) => (pictures.get(look[role])?.length ?? 0) > 0));
}

/**
 * A device mode page's chrome in this configuration, built, `todo-compile-650.md` 6.2.6: the look its
 * skin and its pictures decide, the five pictures located by content, the corner program by
 * `deviceCornerProgram`, and the bottom word spelled in the first font of the title's size, which is the
 * font it is drawn in on every device page here, centred on its line, and pointed at the inline copy
 * of the same codes, which is where the compiler's own pages point, 13 of 13. Each compile holds exactly
 * one such copy, so taking the lowest addressed never has to choose; on six of them it sits on the first
 * page of the lowest numbered device mode, the one page that draws the word inline, and on the other
 * seven on the delay settings screen. Where a configuration holds no inline copy, a composed page draws
 * the word inline, which no compile exercises. **Then every device mode page the configuration holds is
 * checked against it**, `checkPageFrames`, so a configuration whose own pages disagree is refused
 * rather than extended.
 */
export function deviceModeChrome(c: Container): DeviceModeChrome {
  if (c.architecture !== 14) throw new ComposeError('a device page\'s chrome is built for the Harmony 600, 650 and 700 only');
  const skin = (c.versionWord ?? -1) & 0xff;
  const pictures = picturesByContent(c);
  // The look is the one whose pictures the configuration holds, the one item background aside, which
  // a compile without a device page of one command leaves out; it is located below if it is held.
  const roles = ['crossed', 'topBar', 'bottomBar', 'cornerPatch'] as const;
  const whole = DEVICE_PAGE_LOOKS.filter((look) => look.skins.includes(skin)
    && roles.every((role) => (pictures.get(look[role])?.length ?? 0) > 0));
  if (whole.length !== 1) {
    throw new ComposeError(`skin ${skin} holds ${whole.length} device page looks whole, `
      + `${whole.map((one) => one.name).join(' and ') || 'none of the measured ones'}, not one`);
  }
  const look = whole[0] as DevicePageLook;
  const one = (role: (typeof roles)[number] | 'single'): number => {
    const found = pictures.get(look[role]) ?? [];
    if (found.length !== 1) throw new ComposeError(`${look.name}'s ${role} picture is stored ${found.length} times`);
    return found[0] as number;
  };

  // The bottom word, in the first font of the title's size that spells it, and the inline copy to point
  // at: the lowest addressed run of exactly these codes any program draws inline.
  const back = bottomWord(c, DEVICE_PAGE_BACK_WORD);
  const backFont = back.font;
  const backCodes = back.codes;
  const backX = back.x;
  const backHome = inlineHomes(c).get(backCodes.join(','));

  const chrome: DeviceModeChrome = {
    look: look.name,
    single: (pictures.get(look.single)?.length ?? 0) === 0 ? undefined : one('single'),
    crossed: one('crossed'), topBar: one('topBar'), bottomBar: one('bottomBar'),
    corner: deviceCornerProgram(c, look, pictures),
    word: DEVICE_PAGE_BACK_WORD, backFont, backCodes, backX, backHome,
  };
  checkPageFrames(c, chrome, [...new Set(deviceListRows(c).map((row) => row.mode))], 'device mode');
  return chrome;
}

/**
 * The chrome above a page's title, after its background: the queued corner program and the top bar.
 * `shifted` maps an address in the container as it is to where it lands once the page is inserted.
 */
function deviceChromeHead(chrome: PageFrame, shifted: (address: number) => number): number[] {
  return [
    SCREEN_QUEUE_INSTRUCTION, chrome.corner & 0xff, chrome.corner >> 8, RUN_SCREEN_PROGRAM,
    SCREEN_DRAW_IMAGE_AT, ...DEVICE_PAGE_TOP_BAR_AT, ...new Writer(3).u24(shifted(chrome.topBar)).bytes,
  ];
}

/** The bottom bar and the bottom word's font select, the part of a page's tail before the word. */
function deviceChromeBottom(chrome: PageFrame, shifted: (address: number) => number): number[] {
  return [
    SCREEN_DRAW_IMAGE_AT, ...DEVICE_PAGE_BOTTOM_BAR_AT, ...new Writer(3).u24(shifted(chrome.bottomBar)).bytes,
    SCREEN_SELECT_FONT, chrome.backFont,
  ];
}

/** The chrome below a page's labels: the bottom bar, the bottom word's font and the word, and the end. */
function deviceChromeTail(chrome: PageFrame, shifted: (address: number) => number): number[] {
  const word = chrome.backHome === undefined
    ? [SCREEN_TEXT_INLINE, chrome.backX, DEVICE_PAGE_BACK_Y, ...chrome.backCodes, 0]
    : [SCREEN_TEXT_AT, chrome.backX, DEVICE_PAGE_BACK_Y, ...new Writer(3).u24(shifted(chrome.backHome)).bytes];
  return [...deviceChromeBottom(chrome, shifted), ...word, SCREEN_END];
}

/**
 * Every page of the given modes against the built chrome: its background the one item picture when it
 * holds one item or none and the crossed one when it holds more, the head and the tail byte for byte,
 * and the bottom word either pointing at the built home or being that home. A disagreement is refused
 * with the page it is on. The device mode pages' check of section 330, and since section 336 the working
 * screens' too, with the working screen's own frame.
 */
export function checkPageFrames(c: Container, chrome: PageFrame, modes: readonly number[], what: string): number {
  const same = (address: number): number => address;
  const head = deviceChromeHead(chrome, same).join(',');
  const bottom = deviceChromeBottom(chrome, same).join(',');
  const records = modeRecords(c) ?? [];
  let checked = 0;
  for (const mode of modes) {
    (records[mode]?.pages ?? []).forEach((page, p) => {
      const where = `${what} ${mode}'s page ${p + 1}`;
      const program = screenProgram(c, page.program) ?? [];
      const items = taggedList(c, page.list)?.entries.length ?? 0;
      const first = program[0];
      const bytes = (from: number, to: number): string => [...c.blob.subarray(from, to)].join(',');
      const background = items > 1 ? chrome.crossed : chrome.single;
      if (background === undefined) {
        throw new ComposeError(`${where} holds ${items} items and the configuration holds no such background of ${chrome.look}`);
      }
      if (first?.opcode !== SCREEN_DRAW_IMAGE || bitmapReference(first) !== background
          || [...first.operands.subarray(0, 2)].join(',') !== DEVICE_PAGE_BACKGROUND_AT.join(',')) {
        throw new ComposeError(`${where} does not draw the ${items > 1 ? 'crossed' : 'one item'} background of ${chrome.look} at 0, 0`);
      }
      const third = program[3];
      if (third === undefined || bytes(first.start + first.length, third.start) !== head) {
        throw new ComposeError(`${where}'s queued program and top bar are not the ones built`);
      }
      const tail = program.slice(-4);
      const word = tail[2];
      if (tail.length !== 4 || word === undefined || bytes((tail[0] as ScreenInstruction).start, word.start) !== bottom
          || tail[3]?.opcode !== SCREEN_END) {
        throw new ComposeError(`${where}'s bottom bar and the bottom word's font are not the ones built`);
      }
      const at = [word.operands[0], word.operands[1]].join(',');
      const isHome = word.opcode === SCREEN_TEXT_INLINE && c.flashBase + word.start + 3 === chrome.backHome
        && [...(word.glyphs ?? [])].join(',') === chrome.backCodes.join(',');
      const pointsHome = word.opcode === SCREEN_TEXT_AT && referencedStringAddress(word) === chrome.backHome;
      if (at !== [chrome.backX, DEVICE_PAGE_BACK_Y].join(',') || !(isHome || pointsHome)) {
        throw new ComposeError(`${where}'s bottom word is not '${chrome.word}' at ${chrome.backX}, `
          + `${DEVICE_PAGE_BACK_Y} drawn from its inline copy at the lowest address`);
      }
      checked += 1;
    });
  }
  return checked;
}

/**
 * The chrome of a page around its middle, as `fourSlotPageProgram` and `compiledPageProgram` write it,
 * built from a frame: a device mode page's, and since section 336 an activity's working screen's.
 */
export interface PageChrome {
  headLength: number;
  tailLength: number;
  head: (shifted: (address: number) => number) => number[];
  tail: (shifted: (address: number) => number) => number[];
}

export function builtChrome(chrome: PageFrame): PageChrome {
  const same = (address: number): number => address;
  return {
    headLength: deviceChromeHead(chrome, same).length,
    tailLength: deviceChromeTail(chrome, same).length,
    head: (shifted) => deviceChromeHead(chrome, shifted),
    tail: (shifted) => deviceChromeTail(chrome, shifted),
  };
}

/**
 * The tag a press of the key under Devices carries, scan 25, which a device mode maps through a base slot
 * 14 record on the activity counter back to the device list, and the tag with no event bits, scan 45,
 * under which a device mode runs the corner program its pages queue. What the second tag is a press
 * of, if anything, is not read.
 */
export const DEVICES_KEY_TAG = (KEY_EVENT_PRESS << KEY_EVENT_SHIFT) | 25;

export const DEVICE_MODE_PROGRAM_TAG = 0x2d;

/**
 * The press of scan 4, which the reference names More Activities without having measured it. The
 * activity menu maps it through the same record a device list's centre key maps through, back to the
 * running activity, section 352's 151 entries.
 */
export const SCAN_FOUR_TAG = (KEY_EVENT_PRESS << KEY_EVENT_SHIFT) | 4;

/**
 * The activity menu of a Harmony 600, 650 or 700 configuration, by structure, section 375: **the one mode
 * whose own key map maps the key under Devices through a base slot 14 record on the activity counter and
 * binds the press of scan 4**. A device list maps that key through a record on the location and binds no
 * scan 4; a working screen maps it through the counter and binds no scan 4 either. On all 23 compiles with
 * activities it is the mode `activityMenuByRows` finds, and it also finds the menu on Logitech's compile
 * with no activity, where scan 4 calls a list, and on ours, which has no row to find it by. Undefined
 * where no mode has that shape; refused where two do.
 */
/**
 * The menu marker as the wiring writes it, section 375: the list base slot 9 entry 1 runs on the press of
 * More Activities, scan 4, opens by writing the marker 0, `wiring.ts`'s entry 1. The same variable the
 * rows write on 24 of 24 compiles, Logitech's with no activity included, and on our empty configuration
 * the only writer there is. Undefined where that list does not open with a write of 0.
 */
export function fourSlotMenuMarkerWriter(c: Container): number | undefined {
  const entry = handlerSets(c)?.addresses[1];
  const binding = entry === undefined ? undefined : taggedList(c, entry)?.entries.find((one) => one.tag === SCAN_FOUR_TAG);
  if (binding?.opcode !== ACTION_LIST_INDEX_OPCODE) return undefined;
  const first = c.actionLists()?.[binding.operand]?.[0];
  if (first === undefined || first.opcode < STATE_WRITE_BASE || first.operand !== 0) return undefined;
  return first.opcode - STATE_WRITE_BASE;
}

export function fourSlotActivityMenu(c: Container): number | undefined {
  const counter = stateVariables(c).find((one) => one.label.startsWith(ACTIVITY_STATE_NAME))?.index;
  if (counter === undefined) return undefined;
  const found: number[] = [];
  (modeRecords(c) ?? []).forEach((record, mode) => {
    const devices = record.entries.find((one) => one.tag === DEVICES_KEY_TAG);
    if (devices?.opcode !== MAP_VALUE_OPCODE || (devices.operand & 0xff) !== counter) return;
    if (record.entries.some((one) => one.tag === SCAN_FOUR_TAG)) found.push(mode);
  });
  if (found.length > 1) throw new ComposeError(`modes ${found.join(' and ')} both have the activity menu's own key map`);
  return found[0];
}

/** One entry of a mode's own key map as a composer writes it: always the narrow form, so no flags. */
export type KeyMapEntry = Pick<TaggedEntry, 'tag' | 'operand' | 'opcode'>;

/**
 * A device mode's own key map before any key is bound, built, `todo-compile-650.md` 6.2.7: **47
 * entries**, a press of every hard key section 325's `HARD_KEYS` lists, of the four corners and of the
 * key under Devices, and the program tag, stored in `compilerTagOrder`'s order. The key under Devices
 * maps the activity counter through the record the activity menu maps it through, the program tag runs
 * the chrome's corner program, and every other entry is bound to nothing until a caller binds a key.
 *
 * Then every device mode the configuration holds is checked against it: the same tags in the same
 * order, the same two entries, and every other entry a list or nothing, on all 83 device modes of the
 * thirteen compiles. **The record is read and not built**: the compiler emits two records for the key
 * under Devices, section 329, with the same keys and byte identical target programs at different
 * addresses, and modes name one of them while no mode or page names the other, 13 of 13; its one
 * reference is a base slot 11 program reached through a further base slot 14 record. Which of the two is named is the
 * lower index on seven compiles and the higher on the six power hold ones. The activity menu
 * names the one the device modes name on every compile here, so it is read there, checked to be one of
 * the two `activityKeyedRecords` finds and keyed on the counter, and checked against every device mode.
 */
export function deviceModeKeyMap(c: Container, chrome: DeviceModeChrome): KeyMapEntry[] {
  const press = (scan: number): number => (KEY_EVENT_PRESS << KEY_EVENT_SHIFT) | scan;
  const tags = compilerTagOrder([
    ...HARD_KEYS.map((key) => press(key.scan)), ...FOUR_SLOT_ITEMS.map((item) => press(item.scan)),
    DEVICES_KEY_TAG, DEVICE_MODE_PROGRAM_TAG,
  ]);

  const devicesKey = devicesKeyOperand(c);
  const built: KeyMapEntry[] = tags.map((tag) => {
    if (tag === DEVICES_KEY_TAG) return { tag, operand: devicesKey, opcode: MAP_VALUE_OPCODE };
    if (tag === DEVICE_MODE_PROGRAM_TAG) return { tag, operand: chrome.corner, opcode: RUN_SCREEN_PROGRAM };
    return { tag, operand: 0, opcode: 0 };
  });
  checkDeviceModeKeyMaps(c, built);
  return built;
}

/**
 * The operand the key under Devices is mapped with, `0x72` on `(record << 8) | counter`, read off the
 * activity menu, checked to be keyed on the activity counter and to name one of the two records
 * `activityKeyedRecords` finds under that key. Section 330 for a device mode, and since section 336 an
 * activity's working screen maps the key with the same operand, 40 of 40 on the thirteen compiles.
 */
export function devicesKeyOperand(c: Container): number {
  const menu = activityMenus(c).menu;
  const menuEntry = menu === undefined ? undefined
    : modeRecords(c)?.[menu]?.entries.find((one) => one.tag === DEVICES_KEY_TAG);
  if (menuEntry === undefined || menuEntry.opcode !== MAP_VALUE_OPCODE) {
    throw new ComposeError('the activity menu does not map the key under Devices, so there is no record to map it through');
  }
  const counter = stateVariables(c).find((one) => one.label.startsWith(ACTIVITY_STATE_NAME));
  const record = menuEntry.operand >> 8;
  if (counter === undefined || (menuEntry.operand & 0xff) !== counter.index
      || !activityKeyedRecords(c).devices.includes(record)) {
    throw new ComposeError(`the activity menu maps the key under Devices through record ${record}, which is not `
      + 'one of the activity counter\'s records under that key');
  }
  return menuEntry.operand;
}

/** Every device mode's own list against the built key map, refused with the mode and the entry it differs at. */
function checkDeviceModeKeyMaps(c: Container, built: readonly KeyMapEntry[]): void {
  const records = modeRecords(c) ?? [];
  for (const mode of [...new Set(deviceListRows(c).map((row) => row.mode))]) {
    const entries = records[mode]?.entries ?? [];
    if (entries.length !== built.length) {
      throw new ComposeError(`device mode ${mode}'s key map holds ${entries.length} entries, and ${built.length} are built`);
    }
    entries.forEach((entry, k) => {
      const want = built[k] as KeyMapEntry;
      const fixed = want.opcode !== 0;
      const fits = entry.tag === want.tag && entry.flags === undefined && (fixed
        ? entry.opcode === want.opcode && entry.operand === want.operand
        : entry.opcode === ACTION_LIST_INDEX_OPCODE || (entry.opcode === 0 && entry.operand === 0));
      if (!fits) {
        throw new ComposeError(`device mode ${mode}'s key map entry ${k}, tag 0x${entry.tag.toString(16)}, `
          + `is not the built one, tag 0x${want.tag.toString(16)}`
          + (fixed ? ` running 0x${want.opcode.toString(16)} ${want.operand}` : ' bound to a list or to nothing'));
      }
    });
  }
}

/** The line a menu page's title and counter sit on, and the bottom word's. */
export const MENU_TOP_LINE_Y = FOUR_SLOT_TITLE_XY[1];

export const MENU_BOTTOM_LINE_Y = DEVICE_PAGE_BACK_Y;

