/**
 * The Harmony One's activity screens built whole from a description: `todo-compile-one.md` 4.3, findings section 423,
 * every activity's **start up screen** and **working screen**, through the template engine of sections 411 to 415,
 * `screentemplate.ts`, and the hit page rules of section 417, `hitpages.ts`, as the activity menu (`activitymenu.ts`,
 * section 419) and the device pages (`devicepages.ts`, section 420) are built. Not to be confused with
 * `activityscreen.ts`, the composer that adds an activity's two screens to a configuration and since 4.3 hands them to
 * this template to be laid out, `withTouchActivityScreensRebuilt`.
 *
 * **What they are.** Starting an activity shows its start up screen, "Starting" and the activity's name over the
 * activity type's icon and "Keep the remote pointed at your system.", while its start sends; then its working screen,
 * the activity's name over its commands as pads, six to a page, a touch sending the command, with "Devices" on the
 * right key below the screen and, on an activity with favourite channels, "Favorites" on the left, section 154.
 *
 * **One shape each, measured on the fourteen of the eighteen English Harmony One compiles in the lab that hold an activity** (section 423):
 *
 * * **a start up screen's own key map**: the press of 52 keys, `STARTUP_KEYS`, each bound to a list of its own of three
 *   empty instructions, and three handlers, entering the screen starting the header timer and leaving it cancelling
 *   it, both bound straight to the timer, and its header handler running the three header programs. The 55 tags stored
 *   in one order, `STARTUP_TAGS`, which head insertion of the keys and then the handlers would give (inferred, not read);
 * * **its chrome**: "Starting" and the name centred on row 124 in the start up title's font, the full screen picture,
 *   the two queued header programs, the picture of the remote's signal at (57, 33), and the title again; **its page**
 *   the chrome's call, the activity type's icon at (57, 67) and the two lines "Keep the remote pointed at" and "your
 *   system." centred on rows 179 and 191, with an empty page list and one hit page, one area over the screen and the
 *   two edges;
 * * **a working screen's own key map**: on a screen of one page the page arrows' presses swallowed, section 275;
 *   entering it starts the header timer and calls the wiring's lists switching on light 5 (on an activity with
 *   favourites), light 7 and (on several pages) the page keys' pair 3 and 1, section 400; leaving it cancels the
 *   timer and calls the matching off lists, the page keys' on one page too; its header handler the three programs;
 * * **its chrome**, `screentemplate.ts`' `chrome`, titled with the name, with the page total and "pages" on several
 *   pages, and on 23 of the 64 activities of section 402 screen instruction 1 over the whole screen before the
 *   picture, which is unread and so described as there or not;
 * * **its pages**: "Favorites" centred on the left half and "Devices" on the right, on row 202, each in a font of its
 *   own; then each pad its picture at `DEVICE_PAGE_SLOTS[k]`, a second picture at the same place where the pad draws a
 *   picture rather than words (`one_config`'s "PlayStation 3"), and its label's lines each centred on the 81 pixel pad,
 *   section 394's placement, the pad font selected once, before the page's first label; then on several pages the
 *   page's own number ending at x 18 and "/" at 18, row 18;
 * * **its pages' lists**: the Favorites key clicks and enters the favourite channels' screen, the Devices key clicks
 *   and enters the activity's device list, each pad clicks and calls its command's list, section 404, and each page
 *   list's copy runs lists of its own, section 69;
 * * **its hit pages**, by section 417's rules: the left key on an activity with favourites, the right key, then the
 *   pads in reading order and the two edges, so the codes are 48 for the Devices key and 49 to 53 and 43 for six pads,
 *   one key along with favourites.
 *
 * **What the description carries**: per activity its name, read off the screens' titles, each pad's label as the
 * lines it is drawn in and whether it draws a picture instead, whether it has favourites, whether its chrome carries
 * instruction 1, and whether every pad selects its font (our look) or the first alone (Logitech's); and the numbering:
 * the modes, every list index (the command each pad sends and the screens each key enters among them), the timers,
 * the light lists, the header and chrome programs, the pictures (the full screen picture, the signal, each type icon
 * and each pad's), the fonts, each page's hit page index and the homes of texts drawn by reference. **What is
 * generated**: every opcode and constant, the tags and their stored order, every list's instructions, the words
 * "Starting", "Keep the remote pointed at", "your system.", "Favorites", "Devices", "pages" and the page numbers and
 * where each goes, where every label line goes, which text is inline, the records, and the hit pages' rectangles and
 * codes.
 *
 * **Our look is a choice of the same template**: the composer, `buildTouchActivityScreens`, shares one list of three
 * empty instructions among the 52 keys of a start up screen and the device pages' header lists and timer among its
 * screens, where Logitech gives each screen lists and a timer of its own holding the same instructions; both are
 * numbering, the description's. One structural difference is described, as on the device pages: our pages select the
 * pad font before every pad, `selectEach`.
 *
 * English only, skin 54 and the European skin 59; the Dutch compile is refused by its words. The Harmony One alone,
 * the touch family's; the Harmony 600, 650 and 700 draw their activities' screens with `screenrecords.ts`. An
 * activity's help screen and its own device list, the other two modes an activity enters, are not built here; the
 * device list is `devicelists.ts`', section 424. Read
 * only towards hardware: the result is pieces.
 */
import { u24 } from '../../bytes.ts';
import { type Container, parse } from '../../gspm.ts';
import { type ContainerLayout, type ContainerPiece, layOutContainer, takeApart } from '../../frame.ts';
import { ENTER_MODE, caseQueued } from '../../inventory.ts';
import { valueMaps } from '../../valuemap.ts';
import {
  SCREEN_CALL, SCREEN_DRAW_IMAGE, SCREEN_FILL, SCREEN_SELECT_FONT, SCREEN_TEXT_AT, SCREEN_TEXT_INLINE, type ScreenInstruction,
  screenProgram,
} from '../../screen.ts';
import { type ModeRecordsPlace, ScreenRecordError, assertRebuilt, withModeRecords } from '../../screenrecords.ts';
import { modeRecords, taggedList } from '../../sections.ts';
import { type ValueReader, blobReader, textGlyphs } from '../../shared/spelling.ts';
import { TOUCH_AREA_LENGTH, touchPages } from '../../tables.ts';
import { decode } from '../../text.ts';
import { type HitPart, hitPageAreasOf, hitPageRunOf, touchHitPagesPlace, withTouchHitPages } from './hitpages.ts';
import { TOUCH_PAD_HEIGHT, TOUCH_PAD_WIDTH, padLineY } from './labels.ts';
import { TITLE_JOINER, touchCharacterMap } from './screentexts.ts';
import { touchValueMapRoles } from './caseprograms.ts';
import { DEVICE_PAGE_SLOTS } from './menus.ts';
import {
  ARROWS, type BuiltTemplateScreens, CALL, CLICK, ENTER, type Entry, HEADER, LIGHT_5_OFF, LIGHT_7_OFF, LIST, PAGE_KEYS_OFF,
  type Part, SCREEN_WIDTH, SWALLOW, TAG_ENTER, TAG_HEADER, TAG_LEAVE, TIMER_CANCEL, TIMER_START, type TemplateScreen,
  type TemplateScreensDescribed, type TemplateScreensSpec, buildTemplateScreens, centred, chrome, describeTemplateScreens,
  font, leftHalf, n, named, owns, picture, press, rightHalf, RUN, text,
} from './screentemplate.ts';

// ---------------------------------------------------------------------------------------------------------
// The shape, section 423.

/**
 * A start up screen's own key map in Logitech's stored order: the press of 52 keys and three handlers, tag `0x06` on
 * entering the screen, `0x07` on leaving it and `0x2D` for its header. The same 55 tags in the same order on all 63
 * start up screens of the eighteen English compiles, and on every one of ours. Three handlers share a bucket with a key
 * (`0x06` with scan 15's `0x8F`, `0x07` with scan 14's `0x8E`, `0x2D` with scan 36's `0xA4`) and are stored before it,
 * which head insertion gives with the keys inserted first, `keyListOrderInserted`.
 */
export const STARTUP_TAGS: readonly number[] = [
  0x89, 0x88, 0x8b, 0x8a, 0x8d, 0x8c, 0x06, 0x8f, 0x07, 0x8e, 0x81, 0x83, 0x82, 0x85, 0x84, 0x87, 0x86,
  0x98, 0x99, 0x9a, 0x9b, 0x9c, 0x9d, 0x9e, 0x9f, 0x90, 0x91, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97,
  0xab, 0xa8, 0xaf, 0xae, 0xad, 0xac, 0xa3, 0xa2, 0xa1, 0xa0, 0xa7, 0xa6, 0xa5, 0x2d, 0xa4,
  0xb2, 0xb3, 0xb0, 0xb1, 0xb7, 0xb4, 0xb5,
];
/** The 52 presses of a start up screen, each bound to a list of three empty instructions. */
const STARTUP_KEYS: readonly number[] = STARTUP_TAGS.filter((tag) => tag >= 0x80);

/** The start up screen's title, "Starting" and the name, centred on this row; its two fixed lines and theirs. */
export const STARTUP_TITLE_WORD = 'Starting';
export const STARTUP_TITLE_Y = 124;
export const STARTUP_LINES: readonly (readonly [string, number])[] = [['Keep the remote pointed at', 179], ['your system.', 191]];
/** The picture of the remote's signal, drawn by the start up screen's chrome, and the type's icon, by its page. */
export const SIGNAL_AT: readonly [number, number] = [57, 33];
export const ICON_AT: readonly [number, number] = [57, 67];

/** The words of the keys below a working screen, Logitech's English on every English compile, and their row. */
export const FAVOURITES_WORD = 'Favorites';
export const DEVICES_WORD = 'Devices';
export const KEY_WORD_Y = 202;

/** A page's own number ends where the "/" starts, both on the counter's row, section 293. */
const COUNTER_Y = 18;
const SLASH_X = 18;

/**
 * Screen instruction 1 as 23 of Logitech's 64 activities' chromes carry it, over the whole 176 by 220 screen: a black
 * fill of the whole screen, read in the firmware since section 425, which the full screen picture after it then covers.
 * It is on exactly the activities whose start up icon is one picture, 23 of 23 and 0 of 41, a correlation over 8 icons
 * and not derived: the description states it. Said "unread" until section 425.
 *
 * **Told from a background made a fill by its place**, section 425: where the full screen picture is drawn as a fill
 * of the same rectangle, `withPictureFilled`, the chrome holds this instruction once for the background, so the
 * activity carries this one where its chrome holds two whole screen backdrops, a fill and then a fill or a picture.
 */
const WHOLE_SCREEN_OPCODE = SCREEN_FILL;
const WHOLE_SCREEN: Part<never> = { op: 'constant', opcode: WHOLE_SCREEN_OPCODE, operands: [0, 0, 176, 220, 0, 0] };

/** Whether a chrome carries `WHOLE_SCREEN` before its background: two backdrops at 0, 0, the first a fill. */
function carriesWholeScreen(chrome: readonly ScreenInstruction[]): boolean {
  const backdrops = chrome.filter((one) => (one.opcode === SCREEN_FILL || one.opcode === SCREEN_DRAW_IMAGE)
    && one.operands[0] === 0 && one.operands[1] === 0);
  return backdrops.length === 2 && backdrops[0]?.opcode === WHOLE_SCREEN_OPCODE;
}

/** The key codes of a page's areas in their order, section 417's `HIT_CODES`. */
const CODES: readonly number[] = [48, 49, 50, 51, 52, 53, 43, 44];

/** What a font is for on the two screens. */
type FontPart = 'start title' | 'start lines' | 'title' | 'total' | 'count' | 'favourites' | 'devices' | 'row';

/**
 * The fonts the two screens select, by role, **a role per screen**, named by its place in the description: on a
 * Logitech compile every activity draws each part in one font, and on one an activity was composed onto, ours draws
 * its start up title in a lighter copy of the title's set, `touchActivityFonts`, and its page count in the paging
 * fonts, so two activities of one configuration may draw one part in two fonts. Not by the activity's name, since
 * nothing stops two activities sharing one. The page total in the chrome and the page's own number are roles of their
 * own for the same reason: Logitech's draw both in one font, and ours in the paging style's two.
 */
export type ActivityScreenFont = `${FontPart} ${number}`;
const role = (part: FontPart, at: number): ActivityScreenFont => `${part} ${at}`;

/**
 * One pad of a working screen: its label as the lines it is drawn in, whether it draws a picture instead, and what its
 * list runs after the click: one call of the command's list for a command, and for a sequence, which Logitech's
 * compiler writes into the pad's own list (section 327), its calls and its pauses in order.
 */
export interface ActivityPad {
  lines: string[];
  /** A second picture over the pad's own, where the pad shows a picture rather than words. */
  icon: boolean;
  /** What the pad's list runs after the click, in order: a call of a list, or a `0x7C` pause. */
  runs: ('call' | 'pause')[];
}

/** A sequence's pause in a pad's list, `0x7C` with the device and the wait as its operand, section 327. */
const PAUSE_OPCODE = 0x7c;
const PAUSE = n(PAUSE_OPCODE, 'pause');

/**
 * An activity's start up screen as a description gives it: its name, and whether "Starting" and the name are joined by
 * the title's own blank, `TITLE_JOINER`, which Logitech's compiles draw there (section 406) and a configuration
 * lettered in ours cannot tell from a space.
 */
export interface ActivityStartup { kind: 'start up'; name: string; joined: boolean }

/** An activity's working screen as a description gives it: what is not a number. */
export interface ActivityWorking {
  kind: 'working';
  name: string;
  /** Per page, its pads in reading order; at least one page. */
  pages: ActivityPad[][];
  /** Whether it has favourite channels: the Favorites key on the left, light 5 lit. */
  favourites: boolean;
  /** Whether its chrome carries screen instruction 1 over the whole screen, unread, section 402. */
  wholeScreen: boolean;
  /** Whether every pad drawing a label selects the pad font, our look, or the first alone, Logitech's. */
  selectEach: boolean;
}

export type ActivityScreen = ActivityStartup | ActivityWorking;

/** The font roles a screen selects. */
function fontRoles(screen: ActivityScreen, at: number): ActivityScreenFont[] {
  const parts: FontPart[] = screen.kind === 'start up' ? ['start title', 'start lines'] : [
    'title', 'devices', ...(screen.pages.length > 1 ? ['total' as const, 'count' as const] : []),
    ...(screen.favourites ? ['favourites' as const] : []),
    ...(screen.pages.some((page) => page.some((pad) => pad.lines.length > 0)) ? ['row' as const] : []),
  ];
  return parts.map((part) => role(part, at));
}

/** The start up screen as a template screen, section 423's shape. */
function startupScreen(screen: ActivityStartup, at: number): TemplateScreen<ActivityScreenFont> {
  const title = `${STARTUP_TITLE_WORD}${screen.joined ? TITLE_JOINER : ' '}${screen.name}`;
  const across = { in: [0, SCREEN_WIDTH] as const };
  return {
    name: `Starting ${screen.name}`,
    // The keys first and the handlers after, which stores each handler before the key sharing its bucket.
    own: [
      ...STARTUP_KEYS.map((tag): Entry => [tag, owns(SWALLOW, SWALLOW, SWALLOW)]),
      [TAG_ENTER, TIMER_START], [TAG_LEAVE, TIMER_CANCEL], [TAG_HEADER, HEADER],
    ],
    ownInserted: true,
    chrome: [
      font(role('start title', at)), text(title, across, STARTUP_TITLE_Y), picture(0, 0),
      { op: 'queue', step: named(RUN, 'chrome 1') }, { op: 'queue', step: owns(named(RUN, 'chrome 2'), named(RUN, 'chrome 3')) },
      picture(SIGNAL_AT[0], SIGNAL_AT[1]), text(title, across, STARTUP_TITLE_Y), { op: 'return' },
    ],
    pages: [{
      list: [],
      parts: [
        { op: 'chrome' }, picture(ICON_AT[0], ICON_AT[1]), font(role('start lines', at)),
        ...STARTUP_LINES.map(([line, y]) => centred(line, y)),
      ],
    }],
  };
}

/** The working screen as a template screen, section 423's shape. */
function workingScreen(screen: ActivityWorking, at: number): TemplateScreen<ActivityScreenFont> {
  const pages = screen.pages.length;
  if (pages === 0) throw new ScreenRecordError(`${screen.name}'s working screen has no page`);
  const own: Entry[] = [
    // A screen of one page swallows the page arrows, section 275's rail; one of several leaves them to the firmware.
    ...(pages === 1 ? ARROWS : []),
    [TAG_ENTER, owns(TIMER_START, ...(screen.favourites ? [LIST] : []), LIST, ...(pages > 1 ? [LIST] : []))],
    [TAG_LEAVE, owns(TIMER_CANCEL, ...(screen.favourites ? [LIGHT_5_OFF] : []), LIGHT_7_OFF, PAGE_KEYS_OFF)],
    [TAG_HEADER, HEADER],
  ];
  // `chrome` with screen instruction 1 before the full screen picture, where the activity carries it.
  const head = chrome<ActivityScreenFont>(screen.name, pages, { title: role('title', at), count: role('total', at) });
  const backdrop = head.findIndex((part) => part.op === 'picture');
  if (screen.wholeScreen) head.splice(backdrop, 0, WHOLE_SCREEN);
  const keys = screen.favourites ? 2 : 1;
  return {
    name: `Working ${screen.name}`,
    own,
    chrome: head,
    pages: screen.pages.map((pads, p) => {
      if (keys + pads.length > CODES.length) throw new ScreenRecordError(`${screen.name}'s page ${p + 1} holds more pads than a page has codes`);
      const list: Entry[] = [
        ...(screen.favourites ? [[press(CODES[0] as number), owns(CLICK, ENTER)] as Entry] : []),
        [press(CODES[keys - 1] as number), owns(CLICK, ENTER)],
        ...pads.map((pad, k): Entry => [press(CODES[keys + k] as number), owns(CLICK, ...pad.runs.map((one) => (one === 'call' ? LIST : PAUSE)))]),
      ];
      let selected = false;
      const padParts: Part<ActivityScreenFont>[] = pads.flatMap((pad, k) => {
        const [x, y] = DEVICE_PAGE_SLOTS[k] as readonly [number, number];
        const select = pad.lines.length > 0 && (screen.selectEach || !selected);
        if (select) selected = true;
        return [
          picture(x, y), ...(pad.icon ? [picture(x, y)] : []), ...(select ? [font(role('row', at))] : []),
          ...pad.lines.map((line, j) => text(line, { in: [x, TOUCH_PAD_WIDTH] }, padLineY(y, pad.lines.length, j))),
        ];
      });
      const counter: Part<ActivityScreenFont>[] = pages > 1
        ? [font(role('count', at)), text(String(p + 1), { endAt: SLASH_X }, COUNTER_Y), text('/', SLASH_X, COUNTER_Y)] : [];
      return {
        list,
        parts: [
          { op: 'chrome' },
          ...(screen.favourites ? [font(role('favourites', at)), leftHalf(FAVOURITES_WORD, KEY_WORD_Y)] : []),
          font(role('devices', at)), rightHalf(DEVICES_WORD, KEY_WORD_Y), ...padParts, ...counter,
        ],
      };
    }),
  };
}

/** Either screen as a template screen, `at` being its place in the description, which names its fonts' roles. */
export function activityTemplateScreen(screen: ActivityScreen, at: number): TemplateScreen<ActivityScreenFont> {
  return screen.kind === 'start up' ? startupScreen(screen, at) : workingScreen(screen, at);
}

/** A page's hit page by section 417's rules: the keys below the screen it binds, then its pads in reading order. */
function pageHitParts(screen: ActivityScreen, page: number): HitPart[] {
  if (screen.kind === 'start up') return [{ stated: [1257, 2791, 885, 2470] }];
  const pads = screen.pages[page] ?? [];
  return [
    ...(screen.favourites ? ['left' as const] : []), 'right',
    ...pads.map((_, k): HitPart => {
      const [x, y] = DEVICE_PAGE_SLOTS[k] as readonly [number, number];
      return { button: [x, y, TOUCH_PAD_WIDTH] };
    }),
  ];
}

// ---------------------------------------------------------------------------------------------------------
// The description.

/**
 * The activity screens of a configuration, ascending by mode: the working screens as the remote reaches them, the
 * modes the cases of the touch family's `working` record enter for every value but the idle one, `touchValueMapRoles`,
 * section 416; and the start up screens by their own key map, the 55 tags of `STARTUP_TAGS`, which no other screen of
 * the nineteen compiles binds. Read off the record rather than off the activities' rows, `activityScreens`, since the
 * composer lays an activity's screens out before its row is on the menu; the two agree on every compile with an
 * activity. Refuses a configuration holding other than one start up screen per working screen.
 */
export function touchActivityScreenModes(c: Container): { startups: number[]; workings: number[] } {
  const roles = touchValueMapRoles(c);
  const working = roles.records.get('working');
  const cases = working === undefined ? undefined : valueMaps(c)?.[working];
  if (cases === undefined) throw new ScreenRecordError('the configuration holds no record of the working screens');
  const workings = [...new Set(cases.entries.flatMap(([value, target]) => {
    if (value === roles.idle) return [];
    const queued = caseQueued(c, target);
    if (queued?.opcode !== ENTER_MODE) throw new ScreenRecordError(`the working screens' case for activity ${value} enters no screen`);
    return [queued.operand];
  }))].sort((a, b) => a - b);
  const startups = (modeRecords(c) ?? []).flatMap((record, mode) => (record.entries.length === STARTUP_TAGS.length
    && record.entries.every((one, k) => one.tag === STARTUP_TAGS[k]) ? [mode] : []));
  if (startups.length !== workings.length) {
    throw new ScreenRecordError(`the configuration holds ${startups.length} start up screens and ${workings.length} working screens`);
  }
  return { startups, workings };
}

/** A text's words, its glyph codes read through `read` and each offset added to `at`. */
function spelledBy(c: Container, read: ValueReader, at: Set<number>, what: string) {
  const map = touchCharacterMap(c);
  if (map === undefined) throw new ScreenRecordError('the configuration has no character map');
  return (one: ScreenInstruction): string => {
    const glyphs = textGlyphs(c, one as Parameters<typeof textGlyphs>[1]);
    if (glyphs === undefined) throw new ScreenRecordError(`${what} draws a text that does not spell`);
    const from = one.opcode === SCREEN_TEXT_INLINE ? one.start + 3 : c.blobOffsetOf(u24(one.operands, 2));
    if (from === undefined) throw new ScreenRecordError(`${what} draws a text outside the configuration`);
    const codes = Uint8Array.from(glyphs, (_, k) => {
      at.add(from + k);
      return read(from + k);
    });
    return decode(codes, map);
  };
}

const isText = (one: ScreenInstruction): boolean => one.opcode === SCREEN_TEXT_INLINE || one.opcode === SCREEN_TEXT_AT;

/** The first text the chrome a page calls draws, its title. */
function chromeTitle(c: Container, program: readonly ScreenInstruction[], what: string): ScreenInstruction {
  const call = program[0];
  const title = call?.opcode === SCREEN_CALL ? screenProgram(c, call.targets[0] as number)?.find(isText) : undefined;
  if (title === undefined) throw new ScreenRecordError(`${what} draws no title`);
  return title;
}

/** What a start up screen draws that is not a number: the name in its title, after "Starting". */
function readStartup(c: Container, mode: number, read: ValueReader, at: Set<number>): ActivityStartup {
  const what = `the start up screen, mode ${mode},`;
  const page = modeRecords(c)?.[mode]?.pages[0];
  const program = page === undefined ? undefined : screenProgram(c, page.program);
  if (program === undefined) throw new ScreenRecordError(`${what} does not read`);
  const title = spelledBy(c, read, at, what)(chromeTitle(c, program, what));
  const joiner = title.charAt(STARTUP_TITLE_WORD.length);
  if (!title.startsWith(STARTUP_TITLE_WORD) || (joiner !== ' ' && joiner !== TITLE_JOINER)) {
    throw new ScreenRecordError(`${what} is titled '${title}', not '${STARTUP_TITLE_WORD}' and a name`);
  }
  return { kind: 'start up', name: title.slice(STARTUP_TITLE_WORD.length + 1), joined: joiner === TITLE_JOINER };
}

/**
 * What a working screen draws that is not a number, read off its pages: its name, each pad's label lines and whether
 * it draws a picture instead, the Favorites key, instruction 1, and whether every labelled pad selects its font. The
 * glyph codes read are the description's, `at` collecting every offset; the template then holds the rest of the
 * screen to section 423's shape.
 */
function readWorking(c: Container, mode: number, read: ValueReader, at: Set<number>): ActivityWorking {
  const what = `the working screen, mode ${mode},`;
  const record = modeRecords(c)?.[mode];
  if (record === undefined || record.pages.length === 0) throw new ScreenRecordError(`${what} does not read`);
  const spelled = spelledBy(c, read, at, what);
  let name: string | undefined;
  let wholeScreen = false;
  let favourites: boolean | undefined;
  let selects = 0;
  let labelled = 0;
  const pages = record.pages.map((page, p) => {
    const program = screenProgram(c, page.program) ?? [];
    if (name === undefined) {
      name = spelled(chromeTitle(c, program, what));
      wholeScreen = carriesWholeScreen(screenProgram(c, program[0]?.targets[0] as number) ?? []);
    }
    // The keys' words come before the first picture: "Devices", after "Favorites" where the activity has them.
    const first = program.findIndex((one) => one.opcode === SCREEN_DRAW_IMAGE);
    const words = program.slice(0, first < 0 ? program.length : first).filter(isText).length;
    if (words !== 1 && words !== 2) throw new ScreenRecordError(`${what} page ${p + 1} draws ${words} words over its keys`);
    if (favourites !== undefined && favourites !== (words === 2)) throw new ScreenRecordError(`${what} has favourites on some pages only`);
    favourites = words === 2;
    // What each pad's list runs after the click, read off the page list by the pad's code: the structure, opcodes
    // only, the values being the template engine's to read.
    const keys = favourites ? 2 : 1;
    const bound = new Map((taggedList(c, page.list)?.entries ?? []).map((one) => [one.tag, one]));
    const lists = c.actionLists() ?? [];
    const runsOf = (k: number): ('call' | 'pause')[] => {
      const binding = bound.get(press(CODES[keys + k] as number));
      const body = binding?.opcode === CALL ? lists[binding.operand] ?? [] : [];
      return body.slice(1).map((one) => {
        if (one.opcode === CALL) return 'call';
        if (one.opcode === PAUSE_OPCODE) return 'pause';
        throw new ScreenRecordError(`${what} page ${p + 1}'s pad ${k + 1} runs opcode ${one.opcode.toString(16)}`);
      });
    };
    const pads: ActivityPad[] = [];
    let selected = false;
    for (const one of first < 0 ? [] : program.slice(first)) {
      if (one.opcode === SCREEN_DRAW_IMAGE) {
        const k = DEVICE_PAGE_SLOTS.findIndex(([x, y]) => one.operands[0] === x && one.operands[1] === y);
        const pad = pads.at(-1);
        if (k === pads.length) pads.push({ lines: [], icon: false, runs: runsOf(k) });
        else if (k === pads.length - 1 && pad !== undefined && !pad.icon && pad.lines.length === 0) pad.icon = true;
        else throw new ScreenRecordError(`${what} draws a picture at (${one.operands[0]}, ${one.operands[1]}) where pad ${pads.length + 1} goes`);
        selected = false;
      } else if (one.opcode === SCREEN_SELECT_FONT) selected = true;
      else if (isText(one)) {
        const pad = pads.at(-1);
        const [x, y] = DEVICE_PAGE_SLOTS[pads.length - 1] ?? [-1, -1];
        const [tx, ty] = [one.operands[0] as number, one.operands[1] as number];
        // A text outside the pads is the page's counter, which ends the pads.
        if (pad === undefined || tx < x || tx >= x + TOUCH_PAD_WIDTH || ty < y || ty >= y + TOUCH_PAD_HEIGHT) break;
        if (pad.lines.length === 0) {
          labelled += 1;
          if (selected) selects += 1;
        }
        pad.lines.push(spelled(one));
      }
    }
    return pads;
  });
  if (name === undefined || favourites === undefined) throw new ScreenRecordError(`${what} draws no title`);
  // A screen whose labelled pads each select the font is our look; one whose first alone does is Logitech's, and a
  // screen of one labelled pad says nothing about it and is read as Logitech's, which builds the same bytes.
  return { kind: 'working', name, pages, favourites, wholeScreen, selectEach: labelled > 1 && selects === labelled };
}

export interface TouchActivityScreensSpec {
  /** The screens in mode order: each activity's start up screen and working screen. */
  screens: ActivityScreen[];
  /** Their numbering, pictures, fonts, hit pages and homes, the template engine's description of them. */
  screen: TemplateScreensSpec<ActivityScreenFont>;
}

export interface TouchActivityScreensPlace {
  screens: ModeRecordsPlace;
  hits: ReturnType<typeof touchHitPagesPlace>;
}

export interface TouchActivityScreensDescribed {
  spec: TouchActivityScreensSpec;
  place: TouchActivityScreensPlace;
  described: Set<number>;
  structure: Set<number>;
  regions: { from: number; to: number; what: string }[];
}

/**
 * Read off a configuration what a composer would supply for its activity screens, and where their pieces sat: each
 * activity's names and pads, then every screen against the template for it, then each page's hit page. Refuses a
 * screen that is not section 423's shape, a font two places of one role disagree on, and, at the build, a page whose
 * hit page is not the rules' page for it. `layout` is `takeApart(c)`; `read` is where every value is taken from, so a
 * caller can blind every byte the description does not read.
 */
export function describeTouchActivityScreens(
  c: Container, layout: ContainerLayout, read: ValueReader = blobReader(c),
): TouchActivityScreensDescribed {
  const { startups, workings } = touchActivityScreenModes(c);
  const names = new Set<number>();
  const modes = [...startups, ...workings].sort((a, b) => a - b);
  const found = modes.map((mode) => (startups.includes(mode) ? readStartup(c, mode, read, names) : readWorking(c, mode, read, names)));
  const roles = [...new Set(found.flatMap((one, k) => fontRoles(one, k)))];
  const d: TemplateScreensDescribed<ActivityScreenFont> = describeTemplateScreens(c, layout, found.map((one, k) => activityTemplateScreen(one, k)), modes, roles, read);
  for (const at of names) d.described.add(at);
  // Each page's hit page: the rules' page at the index its page record's lead names. Its areas and header are this
  // builder's; the table is the hit pages builder's, `hitpages.ts`, which builds it over every page.
  const map = touchPages(c);
  if (map === undefined) throw new ScreenRecordError('the configuration has no touch map');
  new Set(d.spec.screens.flatMap((one) => one.leads)).forEach((index) => {
    const page = map.records[index];
    if (page === undefined) throw new ScreenRecordError(`an activity screen names hit page ${index} of a table of ${map.records.length}`);
    const first = page.start - TOUCH_AREA_LENGTH * page.areas.length;
    for (let k = first; k < page.start + page.length; k += 1) d.structure.add(k);
    d.regions.push({ from: first, to: page.start + page.length, what: `an activity screen's hit page ${index}` });
  });
  return {
    spec: { screens: found, screen: d.spec },
    place: { screens: d.place, hits: touchHitPagesPlace(c, layout) },
    described: d.described, structure: d.structure, regions: d.regions,
  };
}

// ---------------------------------------------------------------------------------------------------------
// The builder.

export interface BuiltTouchActivityScreens {
  screens: BuiltTemplateScreens;
  /** Each page's hit page as its run, by the index its page names. */
  hits: Map<number, ContainerPiece[]>;
}

/**
 * The activity screens built from a description: the screens by the template engine, each page's hit page by section
 * 417's rules. Refuses two pages of different shapes named to one hit page.
 */
export function buildTouchActivityScreenSet(c: Container, spec: TouchActivityScreensSpec): BuiltTouchActivityScreens {
  const screens = buildTemplateScreens(c, spec.screen, spec.screens.map((one, k) => activityTemplateScreen(one, k)), touchCharacterMap(c));
  const hits = new Map<number, ContainerPiece[]>();
  const shapes = new Map<number, string>();
  spec.screen.screens.forEach((described, s) => {
    const screen = spec.screens[s] as ActivityScreen;
    described.leads.forEach((index, p) => {
      const areas = hitPageAreasOf(pageHitParts(screen, p), `${screen.name}'s ${screen.kind} page ${p + 1}`);
      const shape = JSON.stringify(areas);
      const was = shapes.get(index);
      if (was !== undefined && was !== shape) throw new ScreenRecordError(`two activity screen pages of other shapes are both hit page ${index}`);
      shapes.set(index, shape);
      if (was === undefined) hits.set(index, hitPageRunOf(areas));
    });
  });
  return { screens, hits };
}

/** A layout with the activity screens and their hit pages swapped for the built ones, where the configuration's sat. */
export function withTouchActivityScreenSet(
  layout: ContainerLayout, built: BuiltTouchActivityScreens, place: TouchActivityScreensPlace,
): ContainerLayout {
  // The hit pages first: `withModeRecords` makes every piece afresh, so the hit pages' place, read off `layout`, names
  // pieces only `layout` holds.
  return withModeRecords(withTouchHitPages(layout, { runs: built.hits }, place.hits), built.screens, place.screens);
}

/** Describe, build and put back, and compare every byte with the configuration's. */
export function checkTouchActivityScreens(c: Container, read?: ValueReader): {
  activities: number; pages: number; pads: number; lists: number; hitPages: number; described: number; structure: number;
} {
  const layout = takeApart(c);
  const d = describeTouchActivityScreens(c, layout, read);
  const built = buildTouchActivityScreenSet(c, d.spec);
  assertRebuilt(layOutContainer(withTouchActivityScreenSet(layout, built, d.place)).bytes, c, d.regions);
  const workings = d.spec.screens.filter((one): one is ActivityWorking => one.kind === 'working');
  return {
    activities: workings.length,
    pages: workings.reduce((sum, one) => sum + one.pages.length, 0),
    pads: workings.reduce((sum, one) => sum + one.pages.reduce((n, page) => n + page.length, 0), 0),
    lists: built.screens.lists.size, hitPages: built.hits.size, described: d.described.size, structure: d.structure.size,
  };
}

/**
 * The activity screens of a configuration laid out by the template: described as they stand and built again, every
 * text inline or by reference by the template's one inline copy. What the composer, `buildTouchActivityScreens`, ends
 * with, so an activity it adds is in the form the builder on the composed path rebuilds byte for byte, as the device
 * pages' composer ends with a build of every device mode, `withTouchDevicePage`. A configuration with no activity is
 * returned as it is.
 */
export function withTouchActivityScreensRebuilt(c: Container): Container {
  if (touchActivityScreenModes(c).workings.length === 0) return c;
  const layout = takeApart(c);
  const d = describeTouchActivityScreens(c, layout);
  return parse(layOutContainer(withTouchActivityScreenSet(layout, buildTouchActivityScreenSet(c, d.spec), d.place)).bytes);
}
