/**
 * An arch 14 menu page on a Harmony 600, 650 or 700, built rather than copied off the menu's own last
 * page, section 334, `todo-compile-650.md` 6.2.9: the device lists, idle, an activity's own and the two
 * row one, and the activity menu.
 *
 * The population is the thirteen Logitech compiles section 312 lists, the Harmony 700 pair counted
 * twice. The shape is section 330's: the builder builds every page from what it holds, the
 * configuration's own pages are checked against what is built, and a one byte edit shows the check
 * refuses. Then the composers' grown and opened pages are checked against the same builder.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { require_, skipUnless } from '@harmony/lab';
import {
  type Container,
  ACTIVITY_STATE_NAME,
  activityMenuSingle,
  checkFourSlotMenuPages,
  composeActivity,
  composeActivityMenuRow,
  composeDevice,
  composeDeviceScreen,
  deviceModeChrome,
  firmwareStateVariableMax,
  fourSlotMenuChrome,
  fourSlotMenus,
  modeRecords,
  parse,
  pictureReference,
  SCREEN_QUEUE_INSTRUCTION,
  screenProgram,
  stateVariables,
} from '../src/index.ts';

/** The thirteen arch 14 compiles, as `compose.test.ts`'s `ARCH14_LISTS`. */
const ARCH14 = ['h650_config_region', 'h650_panasonic_config', 'h600_config', 'calibration_h600',
  'h700_config', 'h700_config_2', 'h700_28_config_region',
  'h650_power_hold_compile', 'h650_power_hold_compile_2', 'h700_power_hold_compile',
  'h700_power_hold_compile_2', 'h700_power_hold_compile_3', 'h700_power_hold_compile_4'] as const;

const TELEVISION = [{ stated: 'G:Toshiba 32 Bit:(0x20DF10EF)(Repeat)():3', held: false }] as const;

test('section 334: every page of every menu of the thirteen compiles is the page built for it',
     skipUnless(...ARCH14), () => {
  // The calibration. Every menu page is built from its kind, its number, its menu's page count, its
  // fonts and its labels, and compared instruction for instruction, every instruction that is not a
  // text byte for byte; every text drawn by reference points at the compiler's one inline copy of it
  // and every text drawn inline is that copy. The kinds tally per menu and the pages per kind.
  const pages = new Map<string, number>();
  const menus = new Map<string, number>();
  let checked = 0;
  for (const host of ARCH14) {
    const c = parse(require_(host));
    checked += checkFourSlotMenuPages(c);
    for (const { menu, kind } of fourSlotMenus(c)) {
      menus.set(kind, (menus.get(kind) ?? 0) + 1);
      pages.set(kind, (pages.get(kind) ?? 0) + modeRecords(c)![menu]!.pages.length);
    }
  }
  assert.equal(checked, 164);
  assert.deepEqual(Object.fromEntries([...menus].sort()), {
    'activity device list': 40, 'activity menu': 13, 'idle device list': 13, 'two row device list': 13,
  });
  assert.deepEqual(Object.fromEntries([...pages].sort()), {
    'activity device list': 75, 'activity menu': 22, 'idle device list': 24, 'two row device list': 43,
  });
});

test('section 334: the program each kind of menu queues, the two row picture on every page, and the one activity picture by two routes',
     skipUnless(...ARCH14), () => {
  // What `fourSlotMenuChrome` locates per compile: the queued program per kind, as an index into base
  // slot 11 and against the device mode pages' own; and whether the configuration holds the picture of
  // a page of one activity. Where the working screens' route of section 316 answers, it names the same
  // picture as the look's content, which is two routes with nothing in common but the bytes. The corner
  // lists' program and the two row list's picture are set from the device chrome and from one look
  // entry by construction, so they are compared here with what every page of those menus actually
  // queues and draws, read off the page's own first two instructions rather than through the builder.
  const tally = new Map<string, number>();
  const note = (key: string): void => { tally.set(key, (tally.get(key) ?? 0) + 1); };
  for (const host of ARCH14) {
    const c = parse(require_(host));
    const device = deviceModeChrome(c);
    const menu = fourSlotMenuChrome(c, 'activity menu');
    const corners = fourSlotMenuChrome(c, 'idle device list');
    const rows = fourSlotMenuChrome(c, 'two row device list');
    note(`${menu.look}: activity menu queues ${menu.battery} where device pages queue ${device.battery}`);
    // A page opens with its background and then, where it queues one, `0x11 lo hi 0x73`.
    const opening = (kind: string): { picture: number | undefined; queued: number | undefined }[] =>
      fourSlotMenus(c).filter((one) => one.kind === kind).flatMap(({ menu }) =>
        modeRecords(c)![menu]!.pages.map((page) => {
          const program = screenProgram(c, page.program)!;
          const queue = program[1]!;
          return {
            picture: pictureReference(program[0]!),
            queued: queue.opcode === SCREEN_QUEUE_INSTRUCTION ? queue.operands[0]! | (queue.operands[1]! << 8) : undefined,
          };
        }));
    const cornerPages = [...opening('idle device list'), ...opening('activity device list')];
    note(`corner list pages queue the device pages' program: ${corners.battery === device.battery
      && cornerPages.every((page) => page.queued === device.battery)}`);
    const rowPages = opening('two row device list');
    note(`two row list pages queue nothing: ${rows.battery === undefined && rowPages.every((page) => page.queued === undefined)}, `
      + `draw one picture: ${rowPages.every((page) => page.picture === rows.one)}`);
    const working = activityMenuSingle(c);
    note(`one activity picture ${menu.one === undefined ? 'not held' : 'held'}, working screens' route `
      + `${working === undefined ? 'silent' : working === menu.one ? 'agrees' : 'disagrees'}`);
  }
  assert.deepEqual(Object.fromEntries([...tally].sort()), {
    'corner list pages queue the device pages\' program: true': 13,
    // `calibration_h600` alone holds neither: no page there draws a one command background.
    'one activity picture held, working screens\' route agrees': 12,
    'one activity picture not held, working screens\' route silent': 1,
    'the colour look of 2021 and 2023: activity menu queues 2 where device pages queue 1': 2,
    'the colour look of 2026: activity menu queues 2 where device pages queue 0': 6,
    'the colour look of 2026: activity menu queues 2 where device pages queue 1': 3,
    'the monochrome look: activity menu queues 1 where device pages queue 1': 2,
    'two row list pages queue nothing: true, draw one picture: true': 13,
  });
});

/** Page `index` of `menu`, its text drawn at `(x, y)`, any x where `x` is undefined. */
function at(c: Container, menu: number, index: number, x: number | undefined, y: number): { start: number; opcode: number } {
  const program = screenProgram(c, modeRecords(c)![menu]!.pages[index]!.program)!;
  return program.find((one) => (one.opcode === 4 || one.opcode === 5) && one.operands[1] === y
    && (x === undefined || one.operands[0] === x))!;
}

test('section 334: the menu page check refuses a word, a place, a picture or a program other than the built one',
     skipUnless('h650_config_region'), () => {
  // One byte edits of `h650_config_region`, each made where the compiler's page is the built one, and
  // each refused. Menus 57 and 61 are an activity's own device list and the idle one, 179 the two row
  // list and 102 the activity menu.
  const base = require_('h650_config_region');
  const c = parse(base);
  const refused = (edit: (bytes: Uint8Array) => void): string => {
    const bytes = base.slice();
    edit(bytes);
    try {
      checkFourSlotMenuPages(parse(bytes));
    } catch (error) {
      return (error as Error).message;
    }
    return 'passed';
  };
  const program = (menu: number, index: number) => screenProgram(c, modeRecords(c)![menu]!.pages[index]!.program)!;
  assert.match(refused((b) => { b[at(c, 102, 0, undefined, 114).start + 1]! += 1; }),
               /activity menu 102's page 1: instruction \d+ is not the bottom built at 40, 114/);
  assert.match(refused((b) => { b[program(102, 0)[1]!.start + 1] = 1; }), /activity menu 102's page 1: instruction 1 is not the queue built/);
  assert.match(refused((b) => { b[at(c, 179, 1, undefined, 35).start + 1]! += 1; }),
               /two row device list 179's page 2: instruction \d+ is not the label built/);
  const device = deviceModeChrome(c);
  assert.match(refused((b) => {
    b.set([device.crossed & 0xff, (device.crossed >> 8) & 0xff, device.crossed >> 16], program(57, 1)[0]!.start + 3);
  }), /activity device list 57's page 2: instruction 0 is not the image built/);
  // The idle list's word on an activity's own list: pointed at "Activities" and moved to its centre.
  assert.match(refused((b) => {
    const theirs = at(c, 61, 1, undefined, 114);
    const ours = at(c, 57, 1, undefined, 114);
    b.set(b.slice(theirs.start + 3, theirs.start + 6), ours.start + 3);
    b[ours.start + 1] = 35;
  }), /activity device list 57's page 2: instruction \d+ is not the bottom built at 39, 114/);
});

/** One device composed onto `c` with one command on its screen. */
function oneMoreDevice(c: Container, label: string): Container {
  const device = composeDevice(c, { label, commands: TELEVISION, power: 0 });
  return parse(composeDeviceScreen(parse(device.bytes), label, [{ label, list: device.lists[0]! }]).bytes);
}

/** One activity composed onto `c` with its menu row, as `compose.test.ts`'s `oneMoreActivity`. */
function oneMoreActivity(c: Container, label: string): Container {
  const counter = stateVariables(c).find((one) => one.label.startsWith(ACTIVITY_STATE_NAME));
  const target = stateVariables(c).find((one) =>
    one.index > firmwareStateVariableMax(c.architecture) && one.index !== counter?.index
    && (one.record?.second ?? 0) >= 1)!;
  const built = composeActivity(c, { label, targets: [{ variable: target.index, value: 1 }] });
  return parse(composeActivityMenuRow(parse(built.bytes), built.label, built.set).bytes);
}

test('section 334: grown and opened menu pages are the built pages, every menu of the result',
     skipUnless('h600_config', 'h650_config_region', 'h650_plasma_base'), () => {
  // A fifth device on `h600_config` opens a page on all five device lists, four corner lists and the
  // two row one; a sixth fills the corner pages it opened, the second place being the one whose
  // background changes. On `h650_config_region` an activity fills the menu's second page, and on
  // `h650_plasma_base` one opens a third. After each, every page of every menu is the built page; the
  // reference check is off, since a composed counter and label are drawn inline where the compiler
  // would point, the kept difference of sections 294 and 312.
  const pages = (c: Container): number => checkFourSlotMenuPages(c, { homes: false });
  const six = parse(require_('h600_config'));
  assert.equal(pages(six), 8);
  const five = oneMoreDevice(six, 'TV');
  assert.equal(pages(five), 8 + 5);
  assert.equal(pages(oneMoreDevice(five, 'PS')), 8 + 5);
  const region = parse(require_('h650_config_region'));
  assert.equal(pages(oneMoreActivity(region, 'LG kijken')), 13);
  const plasma = parse(require_('h650_plasma_base'));
  const before = pages(plasma);
  assert.equal(pages(oneMoreActivity(plasma, 'LG kijken')), before + 1);
  // The reference check bites: a composed page draws its counter inline where a copy already exists,
  // which no compiler page does, so with the check on the composed configuration is refused.
  assert.throws(() => checkFourSlotMenuPages(five), /away from the copy the compiler points at/);
  // The opened page's title and bottom word point at the compiler's own copies, as its pages do.
  const opened = five;
  for (const { menu } of fourSlotMenus(opened)) {
    const last = modeRecords(opened)![menu]!.pages.at(-1)!;
    const program = screenProgram(opened, last.program)!;
    const title = program.find((one) => one.operands[1] === 2 && one.operands[0] === 0 && (one.opcode === 4 || one.opcode === 5))!;
    const word = program.at(-2)!;
    assert.equal(title.opcode, 4, `menu ${menu}'s title points`);
    assert.equal(word.opcode, 4, `menu ${menu}'s bottom word points`);
  }
});
