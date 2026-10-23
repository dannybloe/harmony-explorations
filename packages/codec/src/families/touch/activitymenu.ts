/**
 * The Harmony One's activity menu built whole from a description: `todo-compile-one.md` 4.1, findings section 419,
 * through the template engine of sections 411 to 415, `screentemplate.ts`, and the hit page rules of section 417,
 * `hitpages.ts`.
 *
 * **What it is.** The screen a Harmony One shows when no activity runs: "My Activities" over a list of the
 * activities, three to a page, each a row a touch starts, with "Options" and "Devices" on the two keys below the
 * screen. One mode, found the way the remote reaches it, `touchActivityMenu`.
 *
 * **One shape, measured on the eighteen English Harmony One compiles in the lab** (section 419), and in its layout on
 * the Dutch nineteenth too: menus of none, one, two, three, seven and eight activities, so pages of none to three
 * rows and menus of one and three pages. No Logitech menu of two pages is in the corpus, so a later page's shape rests
 * on the later pages of menus of three:
 *
 * * **its own key map**: on a menu of one page the page arrows' presses swallowed, the rail of section 275, and on a
 *   menu of several none; entering it starts the header timer and calls the wiring's lists switching on light 5 and
 *   light 7, and on a menu of several pages first the page keys' pair, section 400; leaving it cancels the timer and
 *   calls the three lists switching the page keys, light 5 and light 7 off, on a menu of one page too; scan 34's press
 *   maps the location through a value map; and its header handler runs three base slot 11 programs;
 * * **its chrome**, the header every page calls: `screentemplate.ts`' `chrome`, titled "My Activities", with the page
 *   total and "pages" where there are several pages;
 * * **its pages**, `ACTIVITY_MENU_ROWS` rows to a page and the last page short, as many pages as that takes and at
 *   least one. A row is the row picture at (6, 38 + 54k), the activity's icon five pixels in and one down at
 *   (11, 39 + 54k) and the
 *   name left aligned at (63, 57 + 54k), the row font selected once, before the page's first name. The words of the two
 *   keys, "Options" centred on the left half and "Devices" on the right, at y 202, each in a font of its own: **on
 *   the first page before the rows and on every other page after them**. A page of a menu of several draws its own
 *   number ending at x 18 and the "/" at 18, on row 18, in the counter's font;
 * * **its pages' lists**: a row's binding clicks, selects the activity's keypad map (base slot 9) and writes 0 to the
 *   device mode marker, section 239; the keys' each click and enter a mode, "Options" the options and "Devices" the
 *   idle device list. Each page list's copy runs lists of its own, the same instructions;
 * * **its hit pages**, one per page shape, which on every menu read is one per page, by section 417's rules: the codes are positions, and **the order of a
 *   page's areas is the order it draws them in**, the two keys first on the first page and last on every other, a
 *   row being the whole width button its picture is.
 *
 * **What the description carries**: the activities' names in menu order, read off the rows (the setup's); and the
 * numbering, read off the configuration: the mode, every list index and the instructions' numbers (the timer, the
 * light lists, the value map, the three header programs and the chrome's, the two modes the keys enter, each row's
 * keypad map and the marker variable), the pictures (the full screen background and each row's picture and icon),
 * the five fonts, each page's hit page index, and the homes of texts drawn by reference to a copy elsewhere.
 * **What is generated**: every opcode and constant, the tags and their order, every list's instructions, the words
 * and where they go, which text is inline, the records, and the hit pages' rectangles and codes.
 *
 * **Our look is not a second builder**: our menu differs from Logitech's in its pictures (our row box and the
 * activity type's icon, `activitypictures.ts`) and its fonts (our letters), which are the description's, so the same
 * template builds both, decision 24 and `todo-compile-one.md` 1.2.11.2.7.
 *
 * **On the composed path**, `withTouchActivityMenuRow`: an activity's row is added by describing the menu as it
 * is, adding the row to the description and building the whole menu again, so nothing of the donor's menu is carried
 * and no row is appended to a page the way the copying composer, `composeTouchActivityRow`, appends one.
 *
 * English only, skin 54 and the European skin 59, whose menus are skin 54's word for word; the Dutch compile is
 * refused by its words. The Harmony One alone, the touch family's; the Harmony 600, 650 and 700 lay their activity
 * menus out as two rows of keys, section 316, built by `screenrecords.ts`. Read only towards hardware: the result is
 * pieces.
 */
import { u24 } from '../../bytes.ts';
import { type Container, type Instruction, parse } from '../../gspm.ts';
import { type ContainerLayout, type ContainerPiece, layOutContainer, takeApart } from '../../frame.ts';
import type { PieceTarget } from '../../statetables.ts';
import { fillTarget, picturesByContent, withBankPictures } from '../../pictures.ts';
import { renderProgram } from '../../render.ts';
import { SCREEN_CALL, SCREEN_DRAW_IMAGE, SCREEN_FILL, SCREEN_TEXT_AT, SCREEN_TEXT_INLINE, type ScreenInstruction, screenProgram } from '../../screen.ts';
import { contentKey } from '../../screencategories.ts';
import {
  type ModeRecordsPlace, ScreenRecordError, assertRebuilt, recordReading, withModeRecords,
} from '../../screenrecords.ts';
import { modePages, modeRecords, pageListCopies } from '../../sections.ts';
import { appendActionLists, ComposeError, restamped } from '../../shared/core.ts';
import type { ComposeActivityRowOptions, ComposedActivityRow } from '../../shared/menus.ts';
import { type ValueReader, blobReader, textGlyphs } from '../../shared/spelling.ts';
import { TOUCH_AREA_LENGTH, touchPages } from '../../tables.ts';
import { characterMap, decode } from '../../text.ts';
import { SCREEN_ROW_PITCH } from '../../touch.ts';
import type { WithChoices } from '../family.ts';
import { touchActivityMenu } from './activityscreen.ts';
import {
  ACTIVITY_ROW_FACE, ACTIVITY_ROW_SIZE, activityIconOf, activityRowBox, activityRowIcon, colourBehind,
} from './activitypictures.ts';
import { TOUCH_CHOICES, type TouchChoices } from './choices.ts';
import { type HitPart, hitPageAreasOf, hitPageRunOf, touchHitPagesPlace, whole, withTouchHitPages } from './hitpages.ts';
import { fontOfFace } from './labels.ts';
import { pagingStyle, withHitPage } from './menus.ts';
import { grownList, withMenuPage } from './menupages.ts';
import {
  ARROWS, type BuiltTemplateScreens, CLICK, ENTER, type Entry, HEADER, LIGHT_5_OFF, LIGHT_7_OFF, LIST, MAP, PAGE_KEYS_OFF,
  type Part, type Step, TAG_ENTER, TAG_HEADER, TAG_LEAVE, TIMER_CANCEL, TIMER_START, type TemplateScreen,
  type TemplateScreensDescribed, type TemplateScreensSpec, banded, buildTemplateScreens, chrome, describeTemplateScreens,
  font, leftHalf, named, owns, picture, press, rightHalf, templateNumberSlots, text, write,
} from './screentemplate.ts';

// ---------------------------------------------------------------------------------------------------------
// The shape, section 419.

/** Rows to a page, the last page short: 3, 3 and 1 for seven activities, 3, 3 and 2 for eight. */
export const ACTIVITY_MENU_ROWS = 3;

/** The menu's title, the chrome's, and the words on its two keys, Logitech's English on all eighteen English compiles. */
const TITLE = 'My Activities';
const LEFT_WORD = 'Options';
const RIGHT_WORD = 'Devices';
/** The keys' words' row. */
const KEY_WORD_Y = 202;

/**
 * Where a row draws: its picture's top left, its icon's a pixel in, and its name's start, for the top row; each row
 * below is `SCREEN_ROW_PITCH` lower. The picture is the whole width button of section 417, 164 by 50, so the row's hit
 * rectangle is `whole(y)`'s.
 */
const ROW_PICTURE: readonly [number, number] = [6, 38];
const ROW_ICON: readonly [number, number] = [11, 39];
const ROW_NAME: readonly [number, number] = [63, 57];

/** A page's own number ends where the "/" starts, both on the counter's row, section 293. */
const COUNTER_Y = 18;
const SLASH_X = 18;

/** The press the menu's own key map maps through the location's value map. */
const MAP_SCAN = 34;
/** The first of a hit page's content codes, `HIT_CODES[0]`: the area's place on its page gives its code, section 417. */
const FIRST_CODE = 48;

/** A row's keypad map selected, `0x1F` with `0xFF00 | entry`: `SELECT_BINDING_SET` in `inventory.ts`' terms. */
const SELECT = banded(0xff, 'set');

/** The fonts the menu selects, by role. */
export type ActivityMenuFont = 'title' | 'count' | 'left' | 'right' | 'row';

/** How many pages a menu of `rows` activities takes: at least one. */
export function activityMenuPages(rows: number): number {
  return Math.max(1, Math.ceil(rows / ACTIVITY_MENU_ROWS));
}

/** The font roles a menu of `rows` selects: the counter's only on a menu of several pages, the rows' only with a row. */
function fontRoles(rows: number): ActivityMenuFont[] {
  return ['title', 'left', 'right', ...(activityMenuPages(rows) > 1 ? ['count' as const] : []), ...(rows > 0 ? ['row' as const] : [])];
}

/**
 * Which number of the configuration's each step of the template takes, its role: a number step's own, `named`, and
 * every list step and state write by this table, since only a number step carries a role of its own. A list of the
 * menu's own is walked twice on a page, in the page list and in its copy, and the copy's takes the role with
 * " copy" after it, `activityMenuRoles`. Module local: the constant steps tagged here, the off lists among them, are
 * shared with other modules, which never see this table.
 */
const ROLE = new WeakMap<Step, string>();
const roled = <S extends Step>(step: S, role: string): S => {
  ROLE.set(step, role);
  return step;
};
/** An off list's state write, the third step of `[3F C0a0, 3F C0b0, write 0]` and the second of the one light form. */
const offWrite = (list: Step): Step => {
  if (list.kind !== 'owns') throw new ScreenRecordError('an off list is a list of its own');
  return list.steps[list.steps.length - 1] as Step;
};
roled(HEADER, 'header');
roled(PAGE_KEYS_OFF, 'page keys off');
roled(offWrite(PAGE_KEYS_OFF), 'page keys variable');
roled(LIGHT_5_OFF, 'light 5 off');
roled(offWrite(LIGHT_5_OFF), 'light 5 variable');
roled(LIGHT_7_OFF, 'light 7 off');
roled(offWrite(LIGHT_7_OFF), 'light 7 variable');

/** What one of a page's keys or rows is: its role's stem, and its place among the page's areas. */
interface PageItem { key: 'left' | 'right' | 'row'; row?: number; name?: string }

/** A page's areas in the order it draws them: the two keys first on the first page, last on every other. */
function pageItems(rows: readonly string[], page: number): PageItem[] {
  const mine = rows.slice(ACTIVITY_MENU_ROWS * page, ACTIVITY_MENU_ROWS * (page + 1))
    .map((name, k): PageItem => ({ key: 'row', row: ACTIVITY_MENU_ROWS * page + k, name }));
  const keys: PageItem[] = [{ key: 'left' }, { key: 'right' }];
  return page === 0 ? [...keys, ...mine] : [...mine, ...keys];
}

/**
 * The menu of `rows`, the activities' names in menu order, as a template screen: section 419's shape, every number
 * a step with its role.
 */
export function activityMenuScreen(rows: readonly string[]): TemplateScreen<ActivityMenuFont> {
  const pages = activityMenuPages(rows.length);
  const own: Entry[] = [
    // A menu of one page swallows the page arrows, section 275's rail; one of several leaves them to the firmware.
    ...(pages === 1 ? ARROWS : []),
    [TAG_ENTER, roled(owns(named(TIMER_START, 'timer'), ...(pages > 1 ? [named(LIST, 'page keys on')] : []),
      named(LIST, 'light 5 on'), named(LIST, 'light 7 on')), 'enter')],
    [TAG_LEAVE, roled(owns(named(TIMER_CANCEL, 'timer'), PAGE_KEYS_OFF, LIGHT_5_OFF, LIGHT_7_OFF), 'leave')],
    [press(MAP_SCAN), named(MAP, 'map')],
    [TAG_HEADER, HEADER],
  ];
  const keyWords: Part<ActivityMenuFont>[] = [
    font('left'), leftHalf(LEFT_WORD, KEY_WORD_Y), font('right'), rightHalf(RIGHT_WORD, KEY_WORD_Y),
  ];
  // The chrome queues a list of the menu's own, made inside `chrome`, so its role is given here.
  const head = chrome<ActivityMenuFont>(TITLE, pages, { title: 'title', count: 'count' });
  for (const part of head) if (part.op === 'queue' && part.step.kind === 'owns') roled(part.step, 'chrome list');
  return {
    name: 'Activity Menu',
    own,
    chrome: head,
    pages: Array.from({ length: pages }, (_, p) => {
      const items = pageItems(rows, p);
      const list: Entry[] = items.map((item, k) => {
        const scan = press(FIRST_CODE + k);
        if (item.key === 'left') return [scan, roled(owns(CLICK, named(ENTER, 'options')), `options ${p}`)];
        if (item.key === 'right') return [scan, roled(owns(CLICK, named(ENTER, 'devices')), `devices ${p}`)];
        const row = item.row as number;
        return [scan, roled(owns(CLICK, named(SELECT, `set ${row}`), roled(write(0), 'marker')), `row ${row}`)];
      });
      const rowParts: Part<ActivityMenuFont>[] = items.filter((item) => item.key === 'row').flatMap((item, k) => [
        picture(ROW_PICTURE[0], ROW_PICTURE[1] + SCREEN_ROW_PITCH * k),
        picture(ROW_ICON[0], ROW_ICON[1] + SCREEN_ROW_PITCH * k),
        ...(k === 0 ? [font<ActivityMenuFont>('row')] : []),
        text(item.name as string, ROW_NAME[0], ROW_NAME[1] + SCREEN_ROW_PITCH * k),
      ]);
      const counter: Part<ActivityMenuFont>[] = pages > 1
        ? [font('count'), text(String(p + 1), { endAt: SLASH_X }, COUNTER_Y), text('/', SLASH_X, COUNTER_Y)] : [];
      return { list, parts: [{ op: 'chrome' }, ...(p === 0 ? [...keyWords, ...rowParts] : [...rowParts, ...keyWords]), ...counter] };
    }),
  };
}

/** A page's hit page as section 417's rules give it, the areas in the order the page draws them. */
function pageHitParts(rows: readonly string[], page: number): HitPart[] {
  let row = 0;
  return pageItems(rows, page).map((item): HitPart => {
    if (item.key !== 'row') return item.key;
    const y = ROW_PICTURE[1] + SCREEN_ROW_PITCH * row;
    row += 1;
    return whole(y);
  });
}

// ---------------------------------------------------------------------------------------------------------
// The description.

/**
 * The activities' names off the menu's rows, in menu order: on each page, the texts drawn at the name's x on the
 * rows' grid, top to bottom. Their glyph codes are the description's and `at` collects every offset read; the
 * template then holds the rest of the page to section 419's shape.
 */
function menuRowNames(c: Container, menu: number, read: ValueReader, at: Set<number>): string[] {
  const map = characterMap(c);
  const record = modeRecords(c)?.[menu];
  if (map === undefined || record === undefined) throw new ScreenRecordError(`the activity menu, mode ${menu}, does not read`);
  return record.pages.flatMap((page) => {
    const found: { y: number; name: string }[] = [];
    for (const one of screenProgram(c, page.program) ?? []) {
      if (one.opcode !== SCREEN_TEXT_INLINE && one.opcode !== SCREEN_TEXT_AT) continue;
      // A name is a text at the name's x inside a row's picture. Not at the name's y alone: our look centres every
      // label drawn on one of our boxes by its letters, `withCentredPadLabels`, which moves a name a row or two, and
      // the byte comparison after a build checks where each one is.
      const [x, y] = [one.operands[0] as number, one.operands[1] as number];
      const rank = Math.floor((y - ROW_PICTURE[1]) / SCREEN_ROW_PITCH);
      const inside = y - ROW_PICTURE[1] - SCREEN_ROW_PITCH * rank < ACTIVITY_ROW_SIZE[1];
      if (x !== ROW_NAME[0] || rank < 0 || rank >= ACTIVITY_MENU_ROWS || !inside) continue;
      const glyphs = textGlyphs(c, one);
      if (glyphs === undefined) continue;
      const from = one.opcode === SCREEN_TEXT_INLINE ? one.start + 3 : c.blobOffsetOf(u24(one.operands, 2));
      if (from === undefined) throw new ScreenRecordError('an activity menu row points outside the configuration');
      const codes = Uint8Array.from(glyphs, (_, k) => {
        at.add(from + k);
        return read(from + k);
      });
      found.push({ y, name: decode(codes, map) });
    }
    return found.sort((a, b) => a.y - b.y).map((one) => one.name);
  });
}

export interface TouchActivityMenuSpec {
  /** The activities' names, in menu order, the setup's. */
  rows: string[];
  /** The menu's numbering, pictures, fonts, hit pages and homes, the template engine's description of it. */
  screen: TemplateScreensSpec<ActivityMenuFont>;
}

export interface TouchActivityMenuPlace {
  screens: ModeRecordsPlace;
  hits: ReturnType<typeof touchHitPagesPlace>;
}

export interface TouchActivityMenuDescribed {
  spec: TouchActivityMenuSpec;
  place: TouchActivityMenuPlace;
  described: Set<number>;
  structure: Set<number>;
  regions: { from: number; to: number; what: string }[];
}

/**
 * Read off a configuration what a composer would supply for its activity menu, and where its pieces sat: the rows'
 * names, then the menu against the template for that many rows, then each page's hit page. Refuses a configuration
 * whose menu is not section 419's shape, a font two places of one role disagree on, and a page whose hit page is not
 * the rules' page for it. `layout` is `takeApart(c)`; `read` is where every value is taken from, so a caller can blind
 * every byte the description does not read.
 */
export function describeTouchActivityMenu(c: Container, layout: ContainerLayout, read: ValueReader = blobReader(c)): TouchActivityMenuDescribed {
  const menu = touchActivityMenu(c);
  if (menu === undefined) throw new ScreenRecordError('the configuration holds no activity menu');
  const names = new Set<number>();
  const rows = menuRowNames(c, menu, read, names);
  const d: TemplateScreensDescribed<ActivityMenuFont> = describeTemplateScreens(
    c, layout, [activityMenuScreen(rows)], [menu], fontRoles(rows.length), read);
  for (const at of names) d.described.add(at);
  // Each page's hit page: the rules' page at the index the page record's lead names, read by the engine. Its areas
  // and header are this builder's; the table is the hit pages builder's, `hitpages.ts`, which builds it over every
  // page and so claims it.
  const map = touchPages(c);
  if (map === undefined) throw new ScreenRecordError('the configuration has no touch map');
  const leads = (d.spec.screens[0] as TemplateScreensSpec['screens'][number]).leads;
  new Set(leads).forEach((index) => {
    const page = map.records[index];
    if (page === undefined) throw new ScreenRecordError(`the activity menu names hit page ${index} of a table of ${map.records.length}`);
    const first = page.start - TOUCH_AREA_LENGTH * page.areas.length;
    for (let k = first; k < page.start + page.length; k += 1) d.structure.add(k);
    d.regions.push({ from: first, to: page.start + page.length, what: `the activity menu's hit page ${index}` });
  });
  return {
    spec: { rows, screen: d.spec },
    place: { screens: d.place, hits: touchHitPagesPlace(c, layout) },
    described: d.described, structure: d.structure, regions: d.regions,
  };
}

// ---------------------------------------------------------------------------------------------------------
// The builder.

export interface BuiltTouchActivityMenu {
  screens: BuiltTemplateScreens;
  /** Each page's hit page as its run, by the index its page names. */
  hits: Map<number, ContainerPiece[]>;
}

/**
 * The menu built from a description: the screen by the template engine, each page's hit page by section 417's rules.
 * Refuses two pages of different shapes named to one hit page.
 */
export function buildTouchActivityMenu(c: Container, spec: TouchActivityMenuSpec): BuiltTouchActivityMenu {
  const screens = buildTemplateScreens(c, spec.screen, [activityMenuScreen(spec.rows)]);
  const leads = (spec.screen.screens[0] as TemplateScreensSpec['screens'][number]).leads;
  const hits = new Map<number, ContainerPiece[]>();
  const shapes = new Map<number, string>();
  leads.forEach((index, p) => {
    const areas = hitPageAreasOf(pageHitParts(spec.rows, p), `the activity menu's page ${p + 1}`);
    const shape = JSON.stringify(areas);
    const was = shapes.get(index);
    if (was !== undefined && was !== shape) throw new ScreenRecordError(`two pages of the activity menu of other shapes are both hit page ${index}`);
    shapes.set(index, shape);
    if (was === undefined) hits.set(index, hitPageRunOf(areas));
  });
  return { screens, hits };
}

/** A layout with the menu and its hit pages swapped for the built ones, where the configuration's sat. */
export function withTouchActivityMenu(layout: ContainerLayout, built: BuiltTouchActivityMenu, place: TouchActivityMenuPlace): ContainerLayout {
  // The hit pages first: `withModeRecords` makes every piece afresh, so the hit pages' place, read off `layout`, names
  // pieces only `layout` holds; `withTouchHitPages` keeps every piece but the runs and the table it replaces.
  return withModeRecords(withTouchHitPages(layout, { runs: built.hits }, place.hits), built.screens, place.screens);
}

/** Describe, build and put back, and compare every byte with the configuration's. */
export function checkTouchActivityMenu(c: Container, read?: ValueReader): {
  rows: number; pages: number; lists: number; hitPages: number; described: number; structure: number;
} {
  const layout = takeApart(c);
  const d = describeTouchActivityMenu(c, layout, read);
  const built = buildTouchActivityMenu(c, d.spec);
  assertRebuilt(layOutContainer(withTouchActivityMenu(layout, built, d.place)).bytes, c, d.regions);
  return {
    rows: d.spec.rows.length, pages: activityMenuPages(d.spec.rows.length), lists: built.screens.lists.size,
    hitPages: built.hits.size, described: d.described.size, structure: d.structure.size,
  };
}

// ---------------------------------------------------------------------------------------------------------
// Numbering by role, for a menu the configuration does not hold yet.

/**
 * The role of each number a template takes, in the order it takes them, `templateNumberSlots`' walk: a number
 * step's own, and a list or a state write by `ROLE`. A list of the menu's own reached a second time is a page list's
 * copy, which runs lists of its own, so its role takes " copy". Refuses a step with no role.
 */
function slotRoles(screen: TemplateScreen<ActivityMenuFont>): { role: string; list: boolean }[] {
  const seen = new Set<Step>();
  return templateNumberSlots(screen).map((slot) => {
    const role = slot.kind === 'number' ? slot.role : ROLE.get(slot);
    if (role === undefined) throw new ScreenRecordError(`the activity menu takes a number with no role, ${slot.kind}`);
    if (slot.kind !== 'owns') return { role, list: false };
    const again = seen.has(slot);
    seen.add(slot);
    return { role: again ? `${role} copy` : role, list: true };
  });
}

/**
 * The role of each number the menu of `rows` takes, in the order its description holds them: what a test names a
 * number by, rather than by a place in the walk that moves with the menu's size.
 */
export function activityMenuSlotRoles(rows: readonly string[]): string[] {
  return slotRoles(activityMenuScreen(rows)).map(({ role }) => role);
}

/**
 * Every role's value on a menu as described, the description's numbers paired with the template's walk. Refuses a
 * role held as two values, which would leave a menu numbered from it two to choose between.
 */
export function activityMenuRoles(spec: TouchActivityMenuSpec): Map<string, number> {
  const numbers = (spec.screen.screens[0] as TemplateScreensSpec['screens'][number]).numbers;
  const slots = slotRoles(activityMenuScreen(spec.rows));
  if (slots.length !== numbers.length) throw new ScreenRecordError(`the activity menu takes ${slots.length} numbers and its description holds ${numbers.length}`);
  const roles = new Map<string, number>();
  slots.forEach(({ role }, k) => {
    const value = numbers[k] as number;
    const was = roles.get(role);
    if (was !== undefined && was !== value) throw new ScreenRecordError(`the activity menu holds ${value} as its ${role} where it also holds ${was}`);
    roles.set(role, value);
  });
  return roles;
}

/**
 * The numbers the menu of `rows` takes, in its walk's order: each role's value from `roles`, and a list of the menu's
 * own that `roles` does not hold the next of `fresh`, so the lists a grown menu adds are the next free base slot 10
 * indices in the order the menu takes them. Refuses any other number `roles` does not hold.
 */
function numberedMenu(rows: readonly string[], roles: ReadonlyMap<string, number>, fresh: () => number): number[] {
  const given = new Map<string, number>();
  return slotRoles(activityMenuScreen(rows)).map(({ role, list }) => {
    const value = roles.get(role) ?? given.get(role);
    if (value !== undefined) return value;
    if (!list) throw new ScreenRecordError(`the activity menu takes a number, its ${role}, the configuration does not say`);
    const made = fresh();
    given.set(role, made);
    return made;
  });
}

// ---------------------------------------------------------------------------------------------------------
// A row added on the composed path, `todo-compile-one.md` 4.1 and 3.2.2.7.

/** A state write's opcode is this plus its variable, section 33: the device mode marker's write, `activityMenus`. */
const STATE_WRITE = 0x80;

/**
 * The list switching the page keys' lights on that the wiring holds, `[3F C032, 3F C012, write 1]` to the variable the
 * menu's leaving list writes 0 to, section 400: a menu grown to several pages calls it as it is entered, and so does
 * a composed device's mode of several pages, `devicepages.ts`, and a device list of several, `devicelists.ts`, whose
 * pair is channels 2 and 0. Refused where the configuration holds no such list or several.
 */
export function pageKeysOn(c: Container, variable: number, channels: readonly [number, number] = [3, 1]): number {
  const lists = c.actionLists() ?? [];
  // A channel's light on is `3F C0n2`, its off `3F C0n0`, section 400.
  const want = [[0x3f, 0xc002 | (channels[0] << 4)], [0x3f, 0xc002 | (channels[1] << 4)], [STATE_WRITE + variable, 1]];
  const found = lists.flatMap((list, index) => (list.length === want.length
    && list.every((one, k) => one.opcode === want[k]?.[0] && one.operand === want[k]?.[1]) ? [index] : []));
  if (found.length !== 1) throw new ComposeError(`the configuration holds ${found.length} lists switching the page keys on, not one`);
  return found[0] as number;
}

/** How many mode pages name each hit page, over every mode. */
function hitPageNamers(c: Container): Map<number, number> {
  const out = new Map<number, number>();
  for (const record of modeRecords(c) ?? []) for (const page of record.pages) out.set(page.lead as number, (out.get(page.lead as number) ?? 0) + 1);
  return out;
}

/** A hit page's areas and codes as one string, for telling two pages apart by what they hold. */
function hitShape(areas: readonly { x: number; width: number; y: number; height: number; code: number }[]): string {
  return areas.map((a) => `${a.x},${a.width},${a.y},${a.height}:${a.code}`).join(' ');
}

/**
 * An activity's row put on the activity menu by building the whole menu again, `todo-compile-one.md` 4.1 and 3.2.2.7:
 * the touch family's `composeActivityRow` wherever the row is drawn in our pictures, which is wherever the activity's
 * type is given, the composed path among them.
 *
 * 1. **The menu as it is, described**, `describeTouchActivityMenu`, and its numbering read by role,
 *    `activityMenuRoles`: on the composed path that is the donor's own menu for the first row and the menu this built
 *    for every later one.
 * 2. **The row added to the description**: its name, its keypad map `set`, the device mode marker `marker` writes
 *    where the menu held no row to read it off, and its pictures, our row box and the type's icon, drawn against the
 *    colour behind the rows, `activitypictures.ts`. Grown to several pages, the menu calls the wiring's list switching
 *    the page keys on, `pageKeysOn`, and draws its counter in the configuration's paging font, `pagingStyle`; with no
 *    row before, its rows' font is the face every activity row of the compiles is drawn in, One15.
 * 3. **Numbered**: every number the menu held keeps its role's value, and every list of its own it did not hold
 *    takes the next free base slot 10 index in the order the menu takes them, `numberedMenu`.
 * 4. **Its hit pages**: a page whose hit page already holds what the rules give keeps it; one whose hit page no other
 *    page names has that page rebuilt where it is, keeping its index, which is how the donor's page of no row becomes
 *    the page of one and nothing is orphaned; any other takes the table's page of its shape, or a page added at the
 *    table's end, `withHitPage`. A page whose old hit page would be left named by nothing is refused.
 * 5. **Made room for**, since `withModeRecords` replaces records and adds none: the new lists appended as built, the
 *    pages it held given their lists and copies as built, and each new page added with its list and copy as built
 *    and a stand in program, `withMenuPage`.
 * 6. **Built and put in place**, the menu's pieces and its hit pages, read off the grown configuration as
 *    `recordReading` reads any record, so the stand ins are replaced like the rest.
 */
export function withTouchActivityMenuRow(
  start: Container, label: string, set: number, menu: number, marker: Instruction,
  options: WithChoices<ComposeActivityRowOptions, TouchChoices>,
): ComposedActivityRow {
  const type = options.type;
  if (type === undefined) throw new ComposeError('the activity menu is built in our pictures, which take the activity\'s type');
  if (touchActivityMenu(start) !== menu) throw new ComposeError(`mode ${menu} is not the activity menu this builds`);
  const choices = options.choices ?? TOUCH_CHOICES;

  // 1. The menu as it is.
  const held = describeTouchActivityMenu(start, takeApart(start));
  const roles = activityMenuRoles(held.spec);
  const heldRows = held.spec.rows;
  const heldPages = activityMenuPages(heldRows.length);
  const heldLeads = (held.spec.screen.screens[0] as TemplateScreensSpec['screens'][number]).leads;

  // 2. The row added.
  const rows = [...heldRows, label];
  const pages = activityMenuPages(rows.length);
  roles.set(`set ${rows.length - 1}`, set);
  if (!roles.has('marker')) {
    if (marker.opcode < STATE_WRITE) throw new ComposeError('the device mode marker is not a state write');
    roles.set('marker', marker.opcode - STATE_WRITE);
  }
  if (pages > 1 && !roles.has('page keys on')) roles.set('page keys on', pageKeysOn(start, roles.get('page keys variable') as number));
  const fonts = { ...held.spec.screen.fonts } as Partial<Record<ActivityMenuFont, number>>;
  if (fonts.count === undefined && pages > 1) {
    const style = pagingStyle(start);
    if (style.counterFont !== style.totalFont) throw new ComposeError('the configuration draws its page numbers and its page totals in two fonts, and the menu draws both in one');
    fonts.count = style.counterFont;
  }
  if (fonts.row === undefined) fonts.row = fontOfFace(start, ACTIVITY_ROW_FACE);
  // Our pictures for the row, against the colour the menu's chrome paints behind its rows.
  const chromeAt = screenProgram(start, modeRecords(start)?.[menu]?.pages[0]?.program ?? 0)?.find((one) => one.opcode === SCREEN_CALL)?.targets[0];
  const raster = chromeAt === undefined ? undefined : renderProgram(start, chromeAt)?.raster;
  if (raster === undefined) throw new ComposeError('the activity menu calls no chrome to read its background off');
  const pixels = Array.from({ length: raster.height }, (_, y) => Array.from({ length: raster.width }, (__, x) => raster.pixels[y * raster.width + x] as number));
  const behind = colourBehind(pixels, Array.from({ length: ACTIVITY_MENU_ROWS }, (_, k) =>
    [ROW_PICTURE[0], ROW_PICTURE[1] + SCREEN_ROW_PITCH * k, ...ACTIVITY_ROW_SIZE] as const));
  const ours = {
    bg: activityRowBox(choices.activityBox, behind),
    icon: activityRowIcon(choices.activityBox, behind, activityIconOf(choices, type), choices.activityIconGrid.row),
  };
  let c = withBankPictures(start, [ours.bg, ours.icon]).container;

  // 3. Numbered: the menu's own lists it did not hold, the next free indices.
  const firstList = (c.actionLists() ?? []).length;
  let nextList = firstList;
  const numbers = numberedMenu(rows, roles, () => nextList++);

  // 4. The hit pages. A picture added to the configuration moves no page's index, so the leads read before hold.
  const namers = hitPageNamers(c);
  const replacedInPlace = new Set<number>();
  const leads: number[] = [];
  for (let p = 0; p < pages; p += 1) {
    const wanted = hitPageAreasOf(pageHitParts(rows, p), `the activity menu's page ${p + 1}`);
    const shape = hitShape(wanted.map(({ area, code }) => ({ ...area, code })));
    const table = touchPages(c);
    if (table === undefined) throw new ComposeError('the hit map stopped reading');
    const old = p < heldPages ? heldLeads[p] : undefined;
    const holds = (index: number): boolean => hitShape(table.records[index]?.areas ?? []) === shape;
    if (old !== undefined && holds(old)) {
      leads.push(old);
      continue;
    }
    const same = table.records.findIndex((_, index) => holds(index));
    const alone = old !== undefined && namers.get(old) === 1;
    if (same >= 0) {
      if (alone) throw new ComposeError(`the activity menu's page ${p + 1} would leave hit page ${old} named by nothing`);
      leads.push(same);
    } else if (alone) {
      replacedInPlace.add(old);
      leads.push(old);
    } else {
      const grown = withHitPage(c, wanted.map(({ area, code }) => [code, { ...area, code, self: 0, address: 0 }] as const));
      c = grown.container;
      leads.push(grown.lead);
    }
  }

  // 5. Room. Built once for the lists' and the pages' bytes, which no picture changes, so a held picture stands in
  // for every one.
  const pictureCount = 1 + 2 * rows.length;
  const spec = (pictures: PieceTarget[], homes: Map<string, PieceTarget>): TouchActivityMenuSpec => ({
    rows,
    screen: { fonts: fonts as Record<ActivityMenuFont, number>, homes, screens: [{ mode: menu, leads, pictures, numbers: [...numbers] }] },
  });
  const stand = held.spec.screen.screens[0]?.pictures[0];
  if (stand === undefined) throw new ComposeError('the activity menu draws no picture');
  const first = buildTemplateScreens(c, spec(Array<PieceTarget>(pictureCount).fill(stand), held.spec.screen.homes).screen, [activityMenuScreen(rows)]);
  const fresh = [...first.lists.keys()].filter((index) => index >= firstList).sort((a, b) => a - b);
  if (fresh.length !== nextList - firstList || fresh.some((index, k) => index !== firstList + k)) {
    throw new ComposeError('the activity menu\'s new lists are not the next free indices in order');
  }
  if (fresh.length > 0) {
    const appended = appendActionLists(c, fresh.map((index) => {
      const bytes = (first.lists.get(index) as ContainerPiece).bytes;
      return Array.from({ length: bytes[0] as number }, (_, k): [number, number] =>
        [(bytes[1 + 3 * k] as number) | ((bytes[2 + 3 * k] as number) << 8), bytes[3 + 3 * k] as number]);
    }));
    if (appended.first !== firstList) throw new ComposeError(`the activity menu's new lists start at ${appended.first}, not ${firstList}`);
    c = parse(appended.bytes);
  }
  const made = first.screens[0];
  if (made === undefined) throw new ComposeError('the activity menu was not built');
  const pageOf = (p: number) => {
    const page = modeRecords(c)?.[menu]?.pages[p];
    if (page === undefined) throw new ComposeError(`the activity menu's page ${p + 1} does not read`);
    return page;
  };
  for (let p = 0; p < heldPages; p += 1) {
    // The copy first, since the pool sits below the page lists and growing it moves them.
    const rank = modePages(c).findIndex((one) => one.address === pageOf(p).address);
    const copyOff = pageListCopies(c)[rank];
    if (copyOff === undefined) throw new ComposeError(`the activity menu's page ${p + 1} has no copy`);
    c = grownList(c, copyOff, made.copies[p] as Uint8Array);
    c = grownList(c, c.blobOffsetOf(pageOf(p).list) as number, (made.lists[p] as ContainerPiece).bytes);
    c.blob[c.blobOffsetOf(pageOf(p).address) as number] = leads[p] as number;
    c = parse(c.blob);
  }
  for (let p = heldPages; p < pages; p += 1) {
    c = withMenuPage(c, menu, (made.lists[p] as ContainerPiece).bytes, made.copies[p] as Uint8Array, leads[p] as number);
  }

  // 6. Built and put in place, every piece read off the grown configuration.
  const layout = takeApart(c);
  const reading = recordReading(c, layout, blobReader(c));
  const f = reading.frame('Activity Menu', menu);
  // A picture, or the fill drawn in a picture's place once the background is made one, `withPictureFilled`, which a
  // donor of ours, the empty One, holds already, `todo-compile-one.md` 8.1.2.
  const drawn = (program: readonly ScreenInstruction[]): PieceTarget[] => program
    .filter((one) => one.opcode === SCREEN_DRAW_IMAGE || one.opcode === SCREEN_FILL).map((one) => (one.opcode === SCREEN_FILL
      ? fillTarget(one.operands[2] as number, one.operands[3] as number, ((one.operands[4] as number) << 8) | (one.operands[5] as number))
      : reading.targetOf(u24(one.operands, 2))));
  const ourAt = (bytes: Uint8Array): PieceTarget => {
    const at = picturesByContent(c).get(contentKey(bytes))?.[0];
    if (at === undefined) throw new ComposeError('our row picture is not in the configuration');
    return reading.targetOf(at);
  };
  const pictures = [
    ...drawn(f.pages[0]?.chrome?.program ?? []), ...f.pages.slice(0, heldPages).flatMap((page) => drawn(page.program)),
    ourAt(ours.bg), ourAt(ours.icon),
  ];
  if (pictures.length !== pictureCount) throw new ComposeError(`the activity menu draws ${pictures.length} pictures where ${pictureCount} are wanted`);
  const built = buildTouchActivityMenu(c, spec(pictures, reading.homes()));
  for (const index of built.screens.lists.keys()) reading.list(index, 'the activity menu');
  const place: TouchActivityMenuPlace = {
    screens: { screens: [reading.placeOf('Activity Menu', f)], lists: reading.lists, lengths: reading.lengths, inline: reading.inline },
    hits: touchHitPagesPlace(c, layout),
  };
  // Only the hit pages rebuilt where they are are written here: a page this added holds its areas already, and one
  // the menu shares with another screen is left as it is.
  const hits = new Map([...built.hits].filter(([index]) => replacedInPlace.has(index)));
  const out = layOutContainer(withTouchActivityMenu(layout, { ...built, hits }, place)).container;

  const page = Math.floor((rows.length - 1) / ACTIVITY_MENU_ROWS);
  const position = pageItems(rows, page).findIndex((item) => item.row === rows.length - 1);
  const rowList = numbers[slotRoles(activityMenuScreen(rows)).findIndex(({ role }) => role === `row ${rows.length - 1}`)];
  if (rowList === undefined) throw new ComposeError('the new row takes no list');
  return {
    bytes: restamped(out.blob), menu, page, rowList, scan: FIRST_CODE + position, scans: [FIRST_CODE + position], rowLists: 1,
  };
}
