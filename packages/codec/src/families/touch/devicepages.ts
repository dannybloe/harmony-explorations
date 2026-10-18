/**
 * The Harmony One's device pages built whole from a description: `todo-compile-one.md` 4.2, findings section 420,
 * through the template engine of sections 411 to 415, `screentemplate.ts`, and the hit page rules of section 417,
 * `hitpages.ts`, as the activity menu is built, `activitymenu.ts`, section 419.
 *
 * **What it is.** Device mode, `docs/how-a-harmony-works.md`: picking a device off the Devices list points every
 * key at that device, and the screen shows its commands as pads, six to a page, a touch sending the command. One
 * mode per device, its **own key map** being the device's map of the hard keys, section 271, and its pages the
 * screen half. The modes are found the way the inventory finds a device's mode, `devices`, which names none for
 * `harvest_one_families_1`'s two devices though its mode 73 is a device page this template rebuilds when named; so
 * that one stays as it was, and the reader's gap is open.
 *
 * **One shape, measured on the eighteen English Harmony One compiles in the lab** (section 420), 89 device modes of
 * one to 22 pages; the Dutch nineteenth's two modes agree in their own key map, and their pages are not compared:
 *
 * * **its own key map**: the 46 key codes of `DEVICE_MODE_SCANS`, 37 keypad keys and 9 touch codes, each bound straight to a list of the
 *   configuration's (the command the key sends in device mode) or to nothing; on a mode of one page the page
 *   arrows' presses swallowed too, section 275; entering it starts the header timer and calls the lists lighting
 *   keys 4 and 6 and, where there are several pages, the page keys' pair 2 and 0 (section 400); leaving it cancels
 *   the timer and calls the three off lists, on a mode of one page too; its header handler runs three base slot 11 programs. Section 397's two shapes, 49
 *   and 51 entries;
 * * **its chrome**, `screentemplate.ts`' `chrome`, titled with the device's name, with the page total and "pages"
 *   where there are several pages;
 * * **its pages**, six pads to a page in reading order, two to a row, the last page short: a pad is its picture at
 *   one of `DEVICE_PAGE_SLOTS` and the command's label inside it, each line centred on the pad by its width and
 *   the block on the pad's label row, section 394's placement; the pad font selected once a page, after the first
 *   pad's picture; then a switch on whether an activity runs drawing "Activities" or "Current" over "Activity" on
 *   the left key, both arms joining a tail that draws "Devices" on the right key and, on a mode of several pages,
 *   the page's own number ending at x 18 and "/" at 18, row 18, in the counter's font;
 * * **its pages' lists**: a pad clicks and calls its command's list, section 404; the left key maps the running
 *   activity through a value map, bound straight; the right key clicks and maps through another, which enters the
 *   device list, section 401. Each page list's copy runs lists of its own, the same instructions, section 69;
 * * **its hit pages**, one per page shape, by section 417's rules: the pads in reading order, then the left and the
 *   right key, then the edges, so the codes are 48 to 53 for six pads and 43 and 44 for the keys, and on a short
 *   page the keys take the next codes after its pads.
 *
 * **What the description carries**: per device its name, read off the chrome's title, every pad's label as the
 * lines it is drawn in, read off the pads, and which hard keys its own key map binds; and the numbering: the mode,
 * every list index (the command each key and each pad runs among them), the timer, the light lists, the value maps,
 * the variable the switch reads, the header and chrome programs, the pictures (the full screen background and each
 * pad's), the five fonts, each page's hit page index and the homes of texts drawn by reference. **What is
 * generated**: every opcode and constant, the tags and their stored order, every list's instructions, the words
 * "Activities", "Current", "Activity", "Devices", "pages" and the page numbers and where each goes, where every
 * label line goes, which text is inline, the records, and the hit pages' rectangles and codes.
 *
 * **A label is described as the lines it is drawn in**, not as the command's name: a Harmony One configuration
 * holds no command name a page could be checked against (section 394 named 558 pads by the record they send), and
 * a name cut with `..` cannot be read back whole. A composer lays a name out with `touchLabelLines` and hands the
 * lines in.
 *
 * **Our look is a choice of the same template**, decision 24 and `todo-compile-one.md` 1.2.11.2.7: the pad and
 * background pictures and the fonts are the description's, and one structural difference is the touch family's,
 * `selectEach`: our pages select the pad font before every pad rather than once a page, so that a colour button's
 * word, which sits on its circle and not on the box, can be smoothed against its own background,
 * `colourbuttons.ts`. It is read off a page as it stands, so a description reads both.
 *
 * **On the composed path**, `withTouchDevicePage`: a composed device's pages are built by this template, numbered
 * from the configuration's own device modes by role, so nothing of the frame is copied off the donor's page, and
 * the builder on the path, `builders.ts`, rebuilds every device mode the configuration holds, the donor's too.
 *
 * English only, skin 54 and the European skin 59; the Dutch compile is refused by its words. The Harmony One
 * alone, the touch family's; the Harmony 600, 650 and 700 draw their device pages with `screenrecords.ts`.
 * Read only towards hardware: the result is pieces.
 */
import { u24 } from '../../bytes.ts';
import { type Container, parse } from '../../gspm.ts';
import { type ContainerLayout, type ContainerPiece, layOutContainer, takeApart } from '../../frame.ts';
import type { PieceTarget } from '../../statetables.ts';
import { devices } from '../../inventory.ts';
import {
  SCREEN_CALL, SCREEN_DRAW_IMAGE, SCREEN_END, SCREEN_JUMP, SCREEN_RETURN, SCREEN_SELECT_FONT, SCREEN_SWITCH_NARROW,
  SCREEN_TEXT_AT, SCREEN_TEXT_INLINE, screenProgram,
} from '../../screen.ts';
import {
  type BuiltScreen, type ModeRecordsPlace, ScreenRecordError, assertRebuilt, recordReading, withModeRecords,
} from '../../screenrecords.ts';
import { modeRecords } from '../../sections.ts';
import { appendActionLists, ComposeError } from '../../shared/core.ts';
import { appendMode } from '../../shared/modes.ts';
import { type ValueReader, blobReader, fontThatSpells, textGlyphs } from '../../shared/spelling.ts';
import { TOUCH_AREA_LENGTH, touchPages } from '../../tables.ts';
import { characterMap, decode } from '../../text.ts';
import { type HitPart, hitPageAreasOf, hitPageRunOf, touchHitPagesPlace, withTouchHitPages } from './hitpages.ts';
import { TOUCH_LABEL_PITCH, TOUCH_PAD_HEIGHT, TOUCH_PAD_WIDTH } from './labels.ts';
import { DEVICE_LABEL_DROP, DEVICE_PAGE_SLOTS, pagingStyle, withHitPage } from './menus.ts';
import { pageKeysOn } from './activitymenu.ts';
import {
  ARROWS, type BuiltTemplateScreens, CLICK, type Entry, HEADER, LIST, MAP, lightOff,
  type Part, type Step, SWALLOW, TAG_ENTER, TAG_HEADER, TAG_LEAVE, TIMER_CANCEL, TIMER_START, type TemplateScreen,
  type TemplateScreensDescribed, type TemplateScreensSpec, buildTemplateScreens, chrome, describeTemplateScreens,
  font, leftHalf, named, owns, picture, press, rightHalf, templateNumberSlots, text,
} from './screentemplate.ts';

// ---------------------------------------------------------------------------------------------------------
// The shape, section 420.

/** Pads to a page, the last page short. */
export const DEVICE_PAGE_PADS = DEVICE_PAGE_SLOTS.length;

/**
 * The key codes a device mode's own key map holds, each bound to a list or to nothing, on all 89 device modes of
 * the eighteen English compiles (section 397's 46 keys): the keypad's scans 1 to 40 but 34, 37 and 38, the
 * Activities, Off and Help keys by section 412's reading, and the touch codes 43 to 45 and 48 to 53. Not the page
 * arrows 46 and 47, which only a mode of one page holds, swallowed. Only keypad keys are ever bound: the two keys
 * below the screen (43, 44), 45 and the pads' codes (48 to 53) are bound to nothing, since the page list binds
 * those.
 */
export const DEVICE_MODE_SCANS: readonly number[] = [
  ...Array.from({ length: 31 }, (_, k) => k + 1), 32, 33, 35, 36, 39, 40, 43, 44, 45, 48, 49, 50, 51, 52, 53,
];

/** The words of the keys below the screen, Logitech's English on every English compile. */
const IDLE_WORD = 'Activities';
const RUNNING_WORDS = ['Current', 'Activity'] as const;
const RIGHT_WORD = 'Devices';
/** The rows the key words sit on: one line at 202, two lines at 196 and 207. */
const KEY_WORD_Y = 202;
const RUNNING_WORD_Y = [196, 207] as const;

/** A page's own number ends where the "/" starts, both on the counter's row, section 293. */
const COUNTER_Y = 18;
const SLASH_X = 18;

/** The fonts a device page selects, by role. */
export type DevicePageFont = `title ${string}` | 'count' | 'row' | 'left' | 'right';

/**
 * A device's title font is a role of its own, named by the device, where every other role is one font across the
 * device pages: on Logitech's compiles every device mode's title is in one font, so a description reads the same
 * font under each device's role, and a device composed onto a configuration whose title font cannot spell its name,
 * a Logitech compile that is not lettered in ours, takes another of that height that can, `withTouchDevicePage`.
 */
export const titleRole = (name: string): DevicePageFont => `title ${name}`;

/** One device as a description gives it: what is not a number. */
export interface DevicePageDevice {
  /** Its name, the chrome's title. */
  name: string;
  /** Per page, per pad, the lines its label is drawn in; a pad with no lines draws its picture alone. */
  pages: string[][][];
  /** The hard keys its own key map binds to a list, ascending. */
  keys: number[];
  /** Whether every pad selects the pad font, our look, or the first pad alone, Logitech's. */
  selectEach: boolean;
}

/** The font roles a device of `pages` pages selects: the counter's only on a mode of several. */
function fontRoles(device: DevicePageDevice): DevicePageFont[] {
  return [titleRole(device.name), 'row', 'left', 'right', ...(device.pages.length > 1 ? ['count' as const] : [])];
}

/**
 * Which number of the configuration's each step of the template takes, its role, as in `activitymenu.ts`: a number
 * step's own, `named`, and every list step by this table. A list of the device's own is walked twice on a page, in
 * the page list and in its copy, and the copy's takes the role with " copy" after it. Module local, since the
 * constant steps tagged here are shared with other modules, which never see this table.
 */
const ROLE = new WeakMap<Step, string>();
const roled = <S extends Step>(step: S, role: string): S => {
  ROLE.set(step, role);
  return step;
};
/** An off list's state write, the last step of `[3F C0a0, 3F C0b0, write 0]` and of the one light form. */
const offWrite = (list: Step): Step => {
  if (list.kind !== 'owns') throw new ScreenRecordError('an off list is a list of its own');
  return list.steps[list.steps.length - 1] as Step;
};

/**
 * The roles a composed device takes from the configuration's own device modes rather than numbering afresh: the
 * remote's lists, timers, value maps, programs and variables, the same on every device mode of a compile. Every
 * other list is the device's own.
 */
const SHARED_ROLES = new Set([
  'timer', 'page keys on', 'light 4 on', 'light 6 on', 'header 1', 'header 2', 'header 3', 'chrome 1', 'chrome 2', 'chrome 3',
  'activities', 'devices', 'running', 'page keys off', 'page keys variable', 'light 4 off', 'light 4 variable',
  'light 6 off', 'light 6 variable',
]);

/**
 * The lists switching off the key lights a device mode lights, section 400's form: keys 4 and 6 alone and the pair
 * 2 and 0, which on a mode of several pages is lit too, the page keys of device mode; the activity menu's are 3 and
 * 1, 5 and 7, `screentemplate.ts`. Measured on all 89 device modes, which call them in this order on leaving and
 * the matching on lists in this order on entering. One copy each, roled once, so a list two device modes reach is
 * built by each alike.
 */
const LIGHT_4_OFF = lightOff(4);
const LIGHT_6_OFF = lightOff(6);
const PAGE_KEYS_OFF = lightOff(2, 0);
const OFF_LISTS = (() => {
  roled(LIGHT_4_OFF, 'light 4 off');
  roled(offWrite(LIGHT_4_OFF), 'light 4 variable');
  roled(LIGHT_6_OFF, 'light 6 off');
  roled(offWrite(LIGHT_6_OFF), 'light 6 variable');
  roled(PAGE_KEYS_OFF, 'page keys off');
  roled(offWrite(PAGE_KEYS_OFF), 'page keys variable');
  return [LIGHT_4_OFF, LIGHT_6_OFF, PAGE_KEYS_OFF];
})();

/** Where pad `k` of a page sits, and where each line of a label of `n` lines starts in y, section 394. */
function padPlace(k: number): readonly [number, number] {
  return DEVICE_PAGE_SLOTS[k] as readonly [number, number];
}
function lineY(padY: number, n: number, line: number): number {
  return padY + DEVICE_LABEL_DROP - Math.floor((TOUCH_LABEL_PITCH * (n - 1)) / 2) + TOUCH_LABEL_PITCH * line;
}

/**
 * The device as a template screen: section 420's shape, every number a step with its role. A device with no pad
 * at all still has a page, as every mode does: one is in the corpus, `compiled_protocols_3`'s Wii, mode 219, and
 * its page draws the keys alone.
 */
export function devicePageScreen(device: DevicePageDevice): TemplateScreen<DevicePageFont> {
  const pages = Math.max(1, device.pages.length);
  const bound = new Set(device.keys);
  // In the order inserted, which settles the tags that share a bucket, `keyListOrderInserted`: tag 0x06 shares one
  // with scan 15's 0x8F, 0x07 with scan 14's 0x8E and 0x2D with scan 36's 0xA4. On a mode of several pages each
  // handler is stored after its key; on a mode of one page, laid out in the same 128 buckets, 0x06 and 0x07
  // are stored before theirs and 0x2D still after, on all 89 device modes, which is section 397's "orders the
  // handlers otherwise". Head insertion gives that if the handlers went in before the keys on the first, and on the
  // second the header handler before them and the other two after: the stored order is measured, and this
  // insertion order is one that reproduces it, inferred, section 420.
  const handlers: Entry[] = [
    [TAG_ENTER, roled(owns(named(TIMER_START, 'timer'), named(LIST, 'light 4 on'), named(LIST, 'light 6 on'),
      ...(pages > 1 ? [named(LIST, 'page keys on')] : [])), 'enter')],
    [TAG_LEAVE, roled(owns(named(TIMER_CANCEL, 'timer'), ...OFF_LISTS), 'leave')],
    [TAG_HEADER, roled(HEADER, 'header')],
  ];
  const keys: Entry[] = [
    // A mode of one page swallows the page arrows, section 275's rail; one of several leaves them to the firmware.
    ...(pages === 1 ? ARROWS : []),
    ...DEVICE_MODE_SCANS.map((scan): Entry => [press(scan), bound.has(scan) ? named(LIST, `key ${scan}`) : SWALLOW]),
  ];
  const own = pages === 1 ? [handlers[2] as Entry, ...keys, handlers[0] as Entry, handlers[1] as Entry] : [...handlers, ...keys];
  const head = chrome<DevicePageFont>(device.name, pages, { title: titleRole(device.name), count: 'count' });
  // The chrome queues a list of the device's own, made inside `chrome`, so its role is given here.
  for (const part of head) if (part.op === 'queue' && part.step.kind === 'owns') roled(part.step, 'chrome list');
  const padsOf = (p: number): string[][] => device.pages[p] ?? [];
  return {
    name: `Device ${device.name}`,
    own,
    ownInserted: true,
    chrome: head,
    pages: Array.from({ length: pages }, (_, p) => {
      const pads = padsOf(p);
      const codes = [48, 49, 50, 51, 52, 53, 43, 44];
      const list: Entry[] = [
        ...pads.map((_, k): Entry => [press(codes[k] as number), roled(owns(CLICK, named(LIST, `command ${p} ${k}`)), `pad ${p} ${k}`)]),
        // The left key bound straight to the value map that says which screen it goes back to, section 401.
        [press(codes[pads.length] as number), named(MAP, 'activities')],
        [press(codes[pads.length + 1] as number), roled(owns(CLICK, named(MAP, 'devices')), `devices key ${p}`)],
      ];
      const padParts: Part<DevicePageFont>[] = pads.flatMap((lines, k) => {
        const [x, y] = padPlace(k);
        return [
          picture(x, y),
          ...(k === 0 || device.selectEach ? [font<DevicePageFont>('row')] : []),
          ...lines.map((line, j) => text(line, { in: [x, TOUCH_PAD_WIDTH] }, lineY(y, lines.length, j))),
        ];
      });
      const tail: Part<DevicePageFont>[] = [
        font('right'), rightHalf(RIGHT_WORD, KEY_WORD_Y),
        ...(pages > 1 ? [font<DevicePageFont>('count'), text(String(p + 1), { endAt: SLASH_X }, COUNTER_Y), text('/', SLASH_X, COUNTER_Y)] : []),
      ];
      const below: Part<DevicePageFont> = {
        op: 'switch', role: 'running',
        arms: [
          { match: 0, parts: [font('left'), leftHalf(IDLE_WORD, KEY_WORD_Y)] },
          { match: 1, parts: [font('left'), ...RUNNING_WORDS.map((word, j) => leftHalf(word, RUNNING_WORD_Y[j] as number))] },
        ],
        then: tail,
      };
      return { list, parts: [{ op: 'chrome' }, ...padParts, below] };
    }),
  };
}

/** A page's hit page as section 417's rules give it: its pads in reading order, then the two keys. */
function pageHitParts(pads: number): HitPart[] {
  return [
    ...Array.from({ length: pads }, (_, k): HitPart => {
      const [x, y] = padPlace(k);
      return { button: [x, y, TOUCH_PAD_WIDTH] };
    }),
    'left', 'right',
  ];
}

// ---------------------------------------------------------------------------------------------------------
// The description.

/** The device modes of a configuration, ascending, each with the device's name as the inventory has it. */
export function touchDeviceModes(c: Container): number[] {
  return [...new Set(devices(c).flatMap((one) => (one.mode === undefined ? [] : [one.mode])))].sort((a, b) => a - b);
}

/**
 * What a device mode draws that is not a number, read off its pages: the title, each pad's label lines, which keys
 * its own map binds, and whether every pad selects its font. The glyph codes read are the description's, `at`
 * collecting every offset; the template then holds the rest of the mode to section 420's shape.
 */
function readDevice(c: Container, mode: number, read: ValueReader, at: Set<number>): DevicePageDevice {
  const map = characterMap(c);
  const record = modeRecords(c)?.[mode];
  if (map === undefined || record === undefined) throw new ScreenRecordError(`device mode ${mode} does not read`);
  const spelled = (one: { opcode: number; start: number; operands: Uint8Array }): string => {
    const glyphs = textGlyphs(c, one as Parameters<typeof textGlyphs>[1]);
    if (glyphs === undefined) throw new ScreenRecordError(`device mode ${mode} draws a text that does not spell`);
    const from = one.opcode === SCREEN_TEXT_INLINE ? one.start + 3 : c.blobOffsetOf(u24(one.operands, 2));
    if (from === undefined) throw new ScreenRecordError(`device mode ${mode} draws a text outside the configuration`);
    const codes = Uint8Array.from(glyphs, (_, k) => {
      at.add(from + k);
      return read(from + k);
    });
    return decode(codes, map);
  };
  let name: string | undefined;
  let selectEach = true;
  let pads = 0;
  const pages = record.pages.map((page) => {
    const program = screenProgram(c, page.program) ?? [];
    const call = program.find((one) => one.opcode === SCREEN_CALL);
    if (name === undefined && call?.targets[0] !== undefined) {
      const title = screenProgram(c, call.targets[0])?.find((one) => one.opcode === SCREEN_TEXT_INLINE || one.opcode === SCREEN_TEXT_AT);
      if (title !== undefined) name = spelled(title);
    }
    // Every text inside the pad drawn last is a line of its label, up to the switch that draws the keys' words.
    const out: string[][] = [];
    for (const one of program) {
      if (one.opcode === SCREEN_SWITCH_NARROW) break;
      if (one.opcode === SCREEN_DRAW_IMAGE) {
        const k = DEVICE_PAGE_SLOTS.findIndex(([x, y]) => one.operands[0] === x && one.operands[1] === y);
        if (k !== out.length) throw new ScreenRecordError(`device mode ${mode} draws a picture at (${one.operands[0]}, ${one.operands[1]}) where pad ${out.length + 1} goes`);
        out.push([]);
      } else if (one.opcode === SCREEN_TEXT_INLINE || one.opcode === SCREEN_TEXT_AT) {
        const pad = out.at(-1);
        const [x, y] = padPlace(out.length - 1);
        const [tx, ty] = [one.operands[0] as number, one.operands[1] as number];
        if (pad === undefined || tx < x || tx >= x + TOUCH_PAD_WIDTH || ty < y || ty >= y + TOUCH_PAD_HEIGHT) {
          throw new ScreenRecordError(`device mode ${mode} draws a text at (${tx}, ${ty}) outside its pads`);
        }
        pad.push(spelled(one));
      }
      // A pad after the first whose picture no select follows makes the page Logitech's, a select once a page.
      if (one.opcode === SCREEN_DRAW_IMAGE && out.length > 1) {
        const next = program[program.indexOf(one) + 1];
        if (next?.opcode !== SCREEN_SELECT_FONT) selectEach = false;
      }
    }
    pads += out.length;
    return out;
  });
  if (name === undefined) throw new ScreenRecordError(`device mode ${mode} draws no title`);
  const keys = record.entries.filter((one) => one.tag >= 0x80 && DEVICE_MODE_SCANS.includes(one.tag & 0x3f) && one.opcode !== 0)
    .map((one) => one.tag & 0x3f).sort((a, b) => a - b);
  // A mode whose every page holds one pad at most says nothing about the selects; it is read as Logitech's, which
  // builds the same bytes.
  return { name, pages, keys, selectEach: selectEach && pages.some((page) => page.length > 1) };
}

export interface TouchDevicePagesSpec {
  /** The devices in mode order, the setup's. */
  devices: DevicePageDevice[];
  /** Their numbering, pictures, fonts, hit pages and homes, the template engine's description of them. */
  screen: TemplateScreensSpec<DevicePageFont>;
}

export interface TouchDevicePagesPlace {
  screens: ModeRecordsPlace;
  hits: ReturnType<typeof touchHitPagesPlace>;
}

export interface TouchDevicePagesDescribed {
  spec: TouchDevicePagesSpec;
  place: TouchDevicePagesPlace;
  described: Set<number>;
  structure: Set<number>;
  regions: { from: number; to: number; what: string }[];
}

/**
 * Read off a configuration what a composer would supply for its device pages, and where their pieces sat: each
 * device's name, labels and bound keys, then every device mode against the template for it, then each page's hit
 * page. Refuses a mode that is not section 420's shape, a font two places of one role disagree on, and, at the
 * build, a page whose hit page is not the rules' page for it. `layout` is `takeApart(c)`; `read` is where every
 * value is taken from, so a caller can blind every byte the description does not read. `modes` chooses the device
 * modes, all of them by default.
 */
export function describeTouchDevicePages(
  c: Container, layout: ContainerLayout, read: ValueReader = blobReader(c), modes: readonly number[] = touchDeviceModes(c),
): TouchDevicePagesDescribed {
  const names = new Set<number>();
  const found = modes.map((mode) => readDevice(c, mode, read, names));
  const roles = [...new Set(found.flatMap(fontRoles))];
  const d: TemplateScreensDescribed<DevicePageFont> = describeTemplateScreens(c, layout, found.map(devicePageScreen), modes, roles, read);
  for (const at of names) d.described.add(at);
  // Each page's hit page: the rules' page at the index its page record's lead names. Its areas and header are this
  // builder's; the table is the hit pages builder's, `hitpages.ts`, which builds it over every page.
  const map = touchPages(c);
  if (map === undefined) throw new ScreenRecordError('the configuration has no touch map');
  new Set(d.spec.screens.flatMap((one) => one.leads)).forEach((index) => {
    const page = map.records[index];
    if (page === undefined) throw new ScreenRecordError(`a device page names hit page ${index} of a table of ${map.records.length}`);
    const first = page.start - TOUCH_AREA_LENGTH * page.areas.length;
    for (let k = first; k < page.start + page.length; k += 1) d.structure.add(k);
    d.regions.push({ from: first, to: page.start + page.length, what: `a device page's hit page ${index}` });
  });
  return {
    spec: { devices: found, screen: d.spec },
    place: { screens: d.place, hits: touchHitPagesPlace(c, layout) },
    described: d.described, structure: d.structure, regions: d.regions,
  };
}

// ---------------------------------------------------------------------------------------------------------
// The builder.

export interface BuiltTouchDevicePages {
  screens: BuiltTemplateScreens;
  /** Each page's hit page as its run, by the index its page names. */
  hits: Map<number, ContainerPiece[]>;
}

/**
 * The device pages built from a description: the screens by the template engine, each page's hit page by section
 * 417's rules. Refuses two pages of different shapes named to one hit page.
 */
export function buildTouchDevicePages(c: Container, spec: TouchDevicePagesSpec): BuiltTouchDevicePages {
  const screens = buildTemplateScreens(c, spec.screen, spec.devices.map(devicePageScreen));
  const hits = new Map<number, ContainerPiece[]>();
  const shapes = new Map<number, string>();
  spec.screen.screens.forEach((described, s) => {
    described.leads.forEach((index, p) => {
      const pads = (spec.devices[s] as DevicePageDevice).pages[p]?.length ?? 0;
      const areas = hitPageAreasOf(pageHitParts(pads), `a device page of ${pads} pads`);
      const shape = JSON.stringify(areas);
      const was = shapes.get(index);
      if (was !== undefined && was !== shape) throw new ScreenRecordError(`two device pages of other shapes are both hit page ${index}`);
      shapes.set(index, shape);
      if (was === undefined) hits.set(index, hitPageRunOf(areas));
    });
  });
  return { screens, hits };
}

/** A layout with the device pages and their hit pages swapped for the built ones, where the configuration's sat. */
export function withTouchDevicePages(layout: ContainerLayout, built: BuiltTouchDevicePages, place: TouchDevicePagesPlace): ContainerLayout {
  // The hit pages first: `withModeRecords` makes every piece afresh, so the hit pages' place, read off `layout`,
  // names pieces only `layout` holds.
  return withModeRecords(withTouchHitPages(layout, { runs: built.hits }, place.hits), built.screens, place.screens);
}

/** Describe, build and put back, and compare every byte with the configuration's. */
export function checkTouchDevicePages(c: Container, read?: ValueReader): {
  devices: number; pages: number; pads: number; lists: number; hitPages: number; described: number; structure: number;
} {
  const layout = takeApart(c);
  const d = describeTouchDevicePages(c, layout, read);
  const built = buildTouchDevicePages(c, d.spec);
  assertRebuilt(layOutContainer(withTouchDevicePages(layout, built, d.place)).bytes, c, d.regions);
  return {
    devices: d.spec.devices.length,
    pages: d.spec.devices.reduce((sum, one) => sum + one.pages.length, 0),
    pads: d.spec.devices.reduce((sum, one) => sum + one.pages.reduce((n, page) => n + page.length, 0), 0),
    lists: built.screens.lists.size, hitPages: built.hits.size, described: d.described.size, structure: d.structure.size,
  };
}

// ---------------------------------------------------------------------------------------------------------
// Numbering by role, for a device the configuration does not hold yet.

/**
 * The role of each number a device's template takes, in the order it takes them, `templateNumberSlots`' walk: a
 * number step's own, and a list or a state write by `ROLE`. A list of the device's own reached a second time is a
 * page list's copy, which runs lists of its own, so its role takes " copy". Refuses a step with no role.
 */
function slotRoles(screen: TemplateScreen<DevicePageFont>): { role: string; list: boolean }[] {
  const seen = new Set<Step>();
  return templateNumberSlots(screen).map((slot) => {
    const role = slot.kind === 'number' ? slot.role : ROLE.get(slot);
    if (role === undefined) throw new ScreenRecordError(`a device page takes a number with no role, ${slot.kind}`);
    if (slot.kind !== 'owns') return { role, list: false };
    const again = seen.has(slot);
    seen.add(slot);
    return { role: again ? `${role} copy` : role, list: true };
  });
}

/** The role of each number a device's template takes, in the order its description holds them. */
export function devicePageSlotRoles(device: DevicePageDevice): string[] {
  return slotRoles(devicePageScreen(device)).map(({ role }) => role);
}

/**
 * The shared roles' values over every device a description holds, `SHARED_ROLES`: the numbers every device mode of
 * a compile takes alike. Refuses a role two devices hold as two values.
 */
function sharedRoles(spec: TouchDevicePagesSpec): Map<string, number> {
  const roles = new Map<string, number>();
  spec.devices.forEach((device, s) => {
    const numbers = (spec.screen.screens[s] as TemplateScreensSpec['screens'][number]).numbers;
    const slots = slotRoles(devicePageScreen(device));
    if (slots.length !== numbers.length) throw new ScreenRecordError(`${device.name}'s page takes ${slots.length} numbers and its description holds ${numbers.length}`);
    slots.forEach(({ role }, k) => {
      if (!SHARED_ROLES.has(role)) return;
      const value = numbers[k] as number;
      const was = roles.get(role);
      if (was !== undefined && was !== value) throw new ScreenRecordError(`the device pages hold ${value} as their ${role} where they also hold ${was}`);
      roles.set(role, value);
    });
  });
  return roles;
}

// ---------------------------------------------------------------------------------------------------------
// A device's pages added on the composed path, `todo-compile-one.md` 4.2 and 3.2.2.8.

/** A pad of a composed device: its label laid out in lines, `touchLabelLines`, and the list of the command it sends. */
export interface ComposedPad { lines: string[]; command: number }

/** A stand in page program's length: the chrome's call, a switch of two arms, its join and its two arms. */
const STAND_IN_PAGE = 4 + 12 + 1 + 4 + 4;

/**
 * A device's pages put on the configuration as a mode of their own, built by `devicePageScreen` in our look:
 * `composeTouchDeviceScreen`'s middle, `todo-compile-one.md` 4.2 and 3.2.2.8, where the copying composer drew the
 * frame off an existing device page and bound the keys below the screen as that page binds them.
 *
 * 1. **The device pages as they are, described**, `describeTouchDevicePages`, and their shared numbering read by
 *    role, `sharedRoles`: the timer, the light lists, the value maps the keys below the screen map through, the
 *    variable the switch reads, the header and chrome programs. A mode of several pages where none is held calls
 *    the wiring's list lighting the page keys, `pageKeysOn`, and draws its counter in the paging font.
 * 2. **The device described**: its name, its pads six to a page, each a click and a call of its command (section
 *    404), the hard keys `keys` binds (section 271's map), our select before every pad, `selectEach`; its pictures
 *    the configuration's own, the background its device pages' chrome draws and each pad place's picture, which
 *    the look then points at our boxes; its fonts the device pages'.
 * 3. **Numbered**: the shared roles' values, the keys' and the pads' commands, and every list of the device's own
 *    the next free base slot 10 index in the order the template takes them.
 * 4. **Its hit pages**: the table's page of each page's shape, or one appended, `withHitPage`.
 * 5. **Made room for**: the new lists appended as built, then the mode, `appendMode`, with its own key map, page
 *    lists and copies as built and stand in programs of the built pages' shape, a chrome's call and a switch whose
 *    two arms jump to its join, so the record reads as one this builds.
 * 6. **Built and put in place**, every piece read off the grown configuration by `recordReading`.
 *
 * `mode` is the next free mode, which the caller's menu row already enters.
 */
export function withTouchDevicePage(
  start: Container, mode: number, label: string, pads: readonly ComposedPad[], keys: ReadonlyMap<number, number>,
): Container {
  // 1. The device pages as they are.
  const heldModes = touchDeviceModes(start);
  if (heldModes.length === 0) throw new ComposeError('no device page of the configuration\'s gives the pages their numbering and pictures');
  const held = describeTouchDevicePages(start, takeApart(start), blobReader(start), heldModes);
  const roles = sharedRoles(held.spec);
  const fonts = { ...held.spec.screen.fonts } as Partial<Record<DevicePageFont, number>>;

  // 2. The device.
  const pages: string[][][] = [];
  for (let first = 0; first < pads.length; first += DEVICE_PAGE_PADS) pages.push(pads.slice(first, first + DEVICE_PAGE_PADS).map((pad) => [...pad.lines]));
  if (pages.length === 0) throw new ComposeError('a device page has at least one pad');
  const unknown = [...keys.keys()].filter((scan) => !DEVICE_MODE_SCANS.includes(scan));
  if (unknown.length > 0) throw new ComposeError(`a device mode binds no key of scan ${unknown.join(', ')}`);
  const device: DevicePageDevice = { name: label, pages, keys: [...keys.keys()].sort((a, b) => a - b), selectEach: true };
  if (pages.length > 1 && !roles.has('page keys on')) {
    const variable = roles.get('page keys variable');
    if (variable === undefined) throw new ComposeError('no device page says which variable the page keys\' lights write');
    roles.set('page keys on', pageKeysOn(start, variable, [2, 0]));
  }
  if (pages.length > 1 && fonts.count === undefined) {
    const style = pagingStyle(start);
    if (style.counterFont !== style.totalFont) throw new ComposeError('the configuration draws its page numbers and its page totals in two fonts, and a device page draws both in one');
    fonts.count = style.counterFont;
  }
  // The title in the device pages' title font where it spells the name, and otherwise in another of its height
  // that does, `fontThatSpells`: a Logitech compile's title font holds only the letters of its own devices' names.
  const map = characterMap(start);
  const heldTitle = held.spec.devices[0] === undefined ? undefined : fonts[titleRole(held.spec.devices[0].name)];
  if (map === undefined || heldTitle === undefined) throw new ComposeError('no device page shows which font a title is drawn in');
  fonts[titleRole(label)] ??= fontThatSpells(start, map, label, heldTitle);
  const screen = devicePageScreen(device);

  // 3. Numbered.
  const firstList = (start.actionLists() ?? []).length;
  let nextList = firstList;
  const given = new Map<string, number>();
  const numbers = slotRoles(screen).map(({ role, list }) => {
    const shared = roles.get(role);
    if (shared !== undefined) return shared;
    const key = /^key (\d+)$/.exec(role);
    if (key !== null) return keys.get(Number(key[1])) as number;
    const command = /^command (\d+) (\d+)$/.exec(role);
    if (command !== null) return (pads[DEVICE_PAGE_PADS * Number(command[1]) + Number(command[2])] as ComposedPad).command;
    const made = given.get(role);
    if (made !== undefined) return made;
    if (!list || SHARED_ROLES.has(role)) throw new ComposeError(`a device page takes a number, its ${role}, the configuration does not say`);
    given.set(role, nextList);
    return nextList++;
  });

  // 4. The hit pages, each page's shape found in the table or appended.
  let c = start;
  const leads = pages.map((page) => {
    const wanted = hitPageAreasOf(pageHitParts(page.length), `a device page of ${page.length} pads`);
    const grown = withHitPage(c, wanted.map(({ area, code }) => [code, { ...area, code, self: 0, address: 0 }] as const));
    c = grown.container;
    return grown.lead;
  });

  // 5. Room. Built once for the lists' and the pages' bytes, which no picture changes, so a held picture stands in
  // for every one.
  const stand = held.spec.screen.screens[0]?.pictures[0];
  if (stand === undefined) throw new ComposeError('the device pages draw no picture');
  const padCount = pages.reduce((sum, page) => sum + page.length, 0);
  const specWith = (pictures: PieceTarget[], homes: Map<string, PieceTarget>): TemplateScreensSpec<DevicePageFont> => ({
    fonts: fonts as Record<DevicePageFont, number>, homes, screens: [{ mode, leads, pictures, numbers: [...numbers] }],
  });
  const first = buildTemplateScreens(c, specWith(Array<PieceTarget>(1 + padCount).fill(stand), held.spec.screen.homes), [screen]);
  const fresh = [...first.lists.keys()].filter((index) => index >= firstList).sort((a, b) => a - b);
  if (fresh.length !== nextList - firstList || fresh.some((index, k) => index !== firstList + k)) {
    throw new ComposeError('a device page\'s new lists are not the next free indices in order');
  }
  const appended = appendActionLists(c, fresh.map((index) => {
    const bytes = (first.lists.get(index) as ContainerPiece).bytes;
    return Array.from({ length: bytes[0] as number }, (_, k): [number, number] =>
      [(bytes[1 + 3 * k] as number) | ((bytes[2 + 3 * k] as number) << 8), bytes[3 + 3 * k] as number]);
  }));
  if (appended.first !== firstList) throw new ComposeError(`a device page's new lists start at ${appended.first}, not ${firstList}`);
  c = parse(appended.bytes);
  const made = first.screens[0] as BuiltScreen;
  const ownBytes = made.own.bytes;
  if (ownBytes.length !== 1 + 4 * (ownBytes[0] as number)) throw new ComposeError('a device mode\'s own key map is not in the narrow form');
  const entries = Array.from({ length: ownBytes[0] as number }, (_, k) => ({
    tag: ownBytes[1 + 4 * k] as number,
    operand: (ownBytes[2 + 4 * k] as number) | ((ownBytes[3 + 4 * k] as number) << 8),
    opcode: ownBytes[4 + 4 * k] as number,
  }));
  const running = roles.get('running');
  if (running === undefined) throw new ComposeError('no device page says which variable tells an activity is running');
  c = appendMode(c, mode, entries, made.lists.map((one) => one.bytes), (_, headAt) => ({
    // The stand in chrome returns at once; each page calls it, then switches on the running variable, whose two
    // arms jump to the join, which ends: the built page's pieces one for one, so `withModeRecords` replaces them.
    head: { length: 1, build: () => Uint8Array.of(SCREEN_RETURN) },
    pages: pages.map((_, p) => {
      const at = headAt + 1 + p * (STAND_IN_PAGE + 7);
      const join = at + 16;
      const u = (address: number): number[] => [address & 0xff, (address >> 8) & 0xff, address >> 16];
      return {
        length: STAND_IN_PAGE,
        build: () => Uint8Array.from([
          SCREEN_CALL, ...u(headAt),
          SCREEN_SWITCH_NARROW, running, 2, 0, ...u(join + 1), 1, ...u(join + 5), 0,
          SCREEN_END,
          SCREEN_JUMP, ...u(join), SCREEN_JUMP, ...u(join),
        ]),
      };
    }),
  }), { copies: made.copies, leads });

  // 6. Built over the grown configuration with every device mode it held and put in place, every piece read off it:
  // the device pages are built together, as the builder on the path builds them, because a text the new pages draw
  // that a held page draws inline is drawn by reference to that copy, the template's one inline copy (section 334),
  // and only a build of them all knows the held pages' copies.
  const layout = takeApart(c);
  const again = describeTouchDevicePages(c, layout, blobReader(c), heldModes);
  const reading = recordReading(c, layout, blobReader(c));
  const f = reading.frame(screen.name, mode);
  const extras = f.pages.flatMap((page) => {
    const call = page.program.at(-1);
    if (call?.opcode !== SCREEN_SWITCH_NARROW) throw new ComposeError('a stand in device page does not end on its switch');
    const join = call.targets[0] === undefined ? undefined : screenProgram(c, call.targets[0])?.at(-1)?.targets[0];
    if (join === undefined) throw new ComposeError('a stand in device page\'s switch does not join');
    return [join, ...call.targets].map((address, k) => reading.program(address, `${screen.name}'s stand in ${k}`).piece);
  });
  const stands = reading.placeOf(screen.name, f, extras);
  // The pictures, read off the grown configuration: the background the first held device's chrome draws, and each
  // pad place's picture as the held device pages draw it, the first page drawing that place.
  const records = modeRecords(c) ?? [];
  const firstHeld = records[heldModes[0] as number]?.pages[0];
  const chromeAt = firstHeld === undefined ? undefined : screenProgram(c, firstHeld.program)?.find((one) => one.opcode === SCREEN_CALL)?.targets[0];
  const background = chromeAt === undefined ? undefined : pictureAt(c, chromeAt, 0, 0);
  if (background === undefined) throw new ComposeError('the device pages draw no background to take');
  const padPictures = DEVICE_PAGE_SLOTS.map(([x, y]) => {
    for (const m of heldModes) {
      for (const page of records[m]?.pages ?? []) {
        const found = pictureAt(c, page.program, x, y);
        if (found !== undefined) return found;
      }
    }
    return undefined;
  });
  const pictures = [reading.targetOf(background), ...pages.flatMap((page) => page.map((_, k) => {
    const address = padPictures[k];
    if (address === undefined) throw new ComposeError(`no device page draws a pad at place ${k + 1} to take its picture`);
    return reading.targetOf(address);
  }))];
  const all: TemplateScreensSpec<DevicePageFont> = {
    ...again.spec.screen, fonts: { ...again.spec.screen.fonts, ...fonts } as Record<DevicePageFont, number>,
    screens: [...again.spec.screen.screens, ...specWith(pictures, again.spec.screen.homes).screens],
  };
  const built = buildTemplateScreens(c, all, [...again.spec.devices.map(devicePageScreen), screen]);
  // Every list the new pages build that the held ones do not is read where it sits, the new ones, so each is put
  // back in place.
  for (const index of built.lists.keys()) if (!again.place.screens.lists.has(index)) reading.list(index, `${label}'s device page`);
  const place: ModeRecordsPlace = {
    screens: [...again.place.screens.screens, stands],
    lists: new Map([...again.place.screens.lists, ...reading.lists]),
    lengths: new Map([...again.place.screens.lengths, ...reading.lengths]),
    inline: new Map([...again.place.screens.inline, ...reading.inline]),
  };
  return layOutContainer(withModeRecords(layout, built, place)).container;
}

/** The first picture the program at `address` draws at `(x, y)`, as an address. */
function pictureAt(c: Container, address: number, x: number, y: number): number | undefined {
  const one = screenProgram(c, address)?.find((i) => i.opcode === SCREEN_DRAW_IMAGE && i.operands[0] === x && i.operands[1] === y);
  return one === undefined ? undefined : u24(one.operands, 2);
}
