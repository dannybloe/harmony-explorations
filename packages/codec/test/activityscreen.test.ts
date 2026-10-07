/**
 * An arch 14 activity's start up screen, its working screen and the cases its keyed records hold, on a
 * Harmony 600, 650 or 700, built rather than copied off another activity of the configuration, section
 * NNM, `todo-compile-650.md` 6.2.10.
 *
 * The population is the thirteen Logitech compiles section 312 lists, the Harmony 700 pair counted
 * twice. The shape is sections 330 and 334's: the builder builds, every screen and case the
 * configuration holds is checked against what is built, an edit of a compile's bytes shows each check
 * refuses, and a composed activity passes the same check.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { require_, skipUnless } from '@harmony/lab';
import {
  type Container,
  activityKeyedRecords,
  activityScreenChrome,
  bitmapReference,
  bitmaps,
  caseQueued,
  checkActivityScreens,
  composeActivity,
  composeActivityDeviceList,
  composeActivityMenuRow,
  composeActivityScreen,
  contentKey,
  deviceListRows,
  deviceVariables,
  fourSlotMenus,
  modeRecords,
  nextActivityValue,
  parse,
  SCREEN_QUEUE_INSTRUCTION,
  screenProgram,
  taggedList,
  valueMaps,
} from '../src/index.ts';

/** The thirteen arch 14 compiles, as `menupage.test.ts`'s `ARCH14`. */
const ARCH14 = ['h650_config_region', 'h650_panasonic_config', 'h600_config', 'calibration_h600',
  'h700_config', 'h700_config_2', 'h700_28_config_region',
  'h650_power_hold_compile', 'h650_power_hold_compile_2', 'h700_power_hold_compile',
  'h700_power_hold_compile_2', 'h700_power_hold_compile_3', 'h700_power_hold_compile_4'] as const;

/** The two bytes at `at`, a case program's operand. */
function b16(c: Container, at: number): Uint8Array {
  return c.blob.slice(at, at + 2);
}

/** Each activity's working screen mode, through the working screen record's case for it. */
function workingModes(c: Container): number[] {
  const maps = activityKeyedRecords(c);
  const record = valueMaps(c)![maps.working]!;
  const idle = record.entries.at(-1)![0];
  return record.entries.filter(([key]) => key !== idle).map(([, target]) => caseQueued(c, target)!.operand);
}

test('section NNM: every start up screen, working screen page\'s chrome and activity keyed case of the thirteen compiles is the one built',
     skipUnless(...ARCH14), () => {
  // The calibration. Each start up screen is built whole from its activity's name and compared part for
  // part, its texts at the compiler's one inline copy; each working screen page's chrome byte for byte,
  // its middle being section 323's; each screen's key map entry for entry; and every case of the four
  // records keyed by the activity in the five byte shape, but the working screen record's idle case,
  // which queues a further record. Of the cases' operands the working screen's is checked against the
  // start sequence and the idle list's against the activity menu's route; which device list is an
  // activity's own and which entry its keypad map selects are read, `activityKeyedRecords` and 6.2.11.
  const total = { startups: 0, working: 0, workingPages: 0, cases: 0 };
  const looks = new Map<string, number>();
  for (const host of ARCH14) {
    const c = parse(require_(host));
    const chrome = activityScreenChrome(c);
    const checked = checkActivityScreens(c, chrome);
    for (const key of Object.keys(total) as (keyof typeof total)[]) total[key] += checked[key];
    looks.set(chrome.look, (looks.get(chrome.look) ?? 0) + checked.startups);
    assert.equal(chrome.startupFont, 2, `${host}: the start up font`);
  }
  // 40 activities, 35 distinct with the Harmony 700 pair counted once; 4 cases each, the working
  // screen's, two under the key under Devices and the keypad map's, plus each configuration's two idle
  // cases under the key under Devices.
  assert.deepEqual(total, { startups: 40, working: 40, workingPages: 63, cases: 40 * 4 + 13 * 2 });
  assert.deepEqual(Object.fromEntries([...looks].sort()), {
    'the colour look of 2021 and 2023': 10, 'the colour look of 2026': 25, 'the monochrome look': 5,
  });
});

test('section NNM: what the working screens queue, draw and map, read off the pages rather than through the builder',
     skipUnless(...ARCH14), () => {
  // The working screen's queued program is the activity menu's, and its key under Devices maps through
  // the record the device modes map it through: each read here off a page or a record of the other kind
  // of screen, not off the builder. And which picture, by content, the working pages draw for one
  // command or none and for more, per look, which is the table `DEVICE_PAGE_LOOKS` states, written out
  // here rather than taken from the builder.
  const tally = new Map<string, number>();
  const note = (key: string): void => { tally.set(key, (tally.get(key) ?? 0) + 1); };
  for (const host of ARCH14) {
    const c = parse(require_(host));
    const look = activityScreenChrome(c).look;
    const records = modeRecords(c)!;
    const keyOf = new Map<number, string>();
    for (const one of bitmaps(c)) {
      const at = c.blobOffsetOf(one.address);
      if (at !== undefined && one.length !== undefined) keyOf.set(one.address, contentKey(c.blob.subarray(at, at + one.length)));
    }
    const queued = (program: number): number | undefined => {
      const one = screenProgram(c, program)![1]!;
      return one.opcode === SCREEN_QUEUE_INSTRUCTION ? one.operands[0]! | (one.operands[1]! << 8) : undefined;
    };
    const menu = fourSlotMenus(c).find((one) => one.kind === 'activity menu')!.menu;
    const menuQueues = new Set(records[menu]!.pages.map((page) => queued(page.program)));
    const deviceMode = records[deviceListRows(c)[0]!.mode]!;
    const deviceKey = deviceMode.entries.find((one) => one.tag === 0x99)!.operand;
    for (const mode of workingModes(c)) {
      const record = records[mode]!;
      note(`working key under Devices maps as a device mode's: ${record.entries.find((one) => one.tag === 0x99)!.operand === deviceKey}`);
      for (const page of record.pages) {
        const items = taggedList(c, page.list)!.entries.length;
        const picture = bitmapReference(screenProgram(c, page.program)![0]!);
        note(`page queues the activity menu's program: ${menuQueues.size === 1 && menuQueues.has(queued(page.program))}`);
        note(`${look}, ${items > 1 ? 'several' : 'one or none'}: ${keyOf.get(picture ?? -1)}`);
      }
    }
  }
  assert.deepEqual(Object.fromEntries([...tally].sort()), {
    'page queues the activity menu\'s program: true': 63,
    // `activitiesSingle` and `workingSeveral` per look; `calibration_h600` has no page of one command.
    'the colour look of 2021 and 2023, one or none: adc399032d1d41b0': 6,
    'the colour look of 2021 and 2023, several: 5d94a9eb5d7de1de': 22,
    'the colour look of 2026, one or none: 21bc4747e696eba8': 13,
    'the colour look of 2026, several: a0d49b45e9df025c': 12,
    'the monochrome look, one or none: fb5f49a2ee63c0f9': 2,
    'the monochrome look, several: 59a6f04d6ba0e90a': 8,
    'working key under Devices maps as a device mode\'s: true': 40,
  });
});

test('section NNM: the activity screen check refuses a line, a key, a program, a word, a picture or a case other than the built one',
     skipUnless('h650_config_region'), () => {
  // Edits of `h650_config_region`, each where the compiler's screen is the built one, and each refused.
  // Activity 2 is TV kijken: its start up screen is mode 155 and its working screen mode 81, one page
  // holding nothing. Records 13 and 22 are the two under the key under Devices, 8 the working screen's.
  const base = require_('h650_config_region');
  const c = parse(base);
  checkActivityScreens(c, activityScreenChrome(c));
  const refused = (edit: (bytes: Uint8Array) => void): string => {
    const bytes = base.slice();
    edit(bytes);
    try {
      const edited = parse(bytes);
      checkActivityScreens(edited, activityScreenChrome(edited));
    } catch (error) {
      return (error as Error).message;
    }
    return 'not refused';
  };
  const records = modeRecords(c)!;
  const startup = screenProgram(c, records[155]!.pages[0]!.program)!;
  const working = screenProgram(c, records[81]!.pages[0]!.program)!;
  const entry = (mode: number, tag: number): number => {
    const at = c.blobOffsetOf(records[mode]!.start)!;
    const k = records[mode]!.entries.findIndex((one) => one.tag === tag);
    return at + 1 + 4 * k;
  };
  const caseAt = (map: number, key: number): number =>
    c.blobOffsetOf(valueMaps(c)![map]!.entries.find(([one]) => one === key)![1])!;
  assert.equal(activityKeyedRecords(c).devices.join(), '13,22');

  // The start up screen: a fixed line a pixel right, the title a pixel down, and a key bound.
  const system = startup.find((one) => one.operands[1] === 110)!;
  assert.match(refused((b) => { b[system.start + 1]! += 1; }), /start up screen 155: instruction 5 is not the fixed built at 28, 110/);
  const title = startup[2]!;
  assert.match(refused((b) => { b[title.start + 2]! += 1; }), /start up screen 155: instruction 2 is not the title built at 14, 5/);
  assert.match(refused((b) => { b[entry(155, 0x89) + 1] = 1; }), /start up screen 155's key map: entry 0, tag 0x89/);
  // The working screen: the queued program the first, "Devices" a pixel right, the program tag running
  // another program, and the page of no command drawing the crossed picture.
  assert.match(refused((b) => { b[working[1]!.start + 1] = 1; }), /working screen 81's page 1's queued program and top bar/);
  const word = working.at(-2)!;
  assert.match(refused((b) => { b[word.start + 1] = 41; }), /working screen 81's page 1's bottom word is not 'Devices' at 40, 114/);
  assert.match(refused((b) => { b[entry(81, 0x2d) + 1] = 1; }), /activity 2's working screen's key map: entry 1, tag 0x2d/);
  const crossed = activityScreenChrome(c).working.crossed!;
  assert.match(refused((b) => {
    b.set([crossed & 0xff, (crossed >> 8) & 0xff, crossed >> 16], working[0]!.start + 3);
  }), /working screen 81's page 1 does not draw the one item background/);
  // The cases: one record under Devices sending activity 2 to another list than the other does; both
  // sending it to activity 1's own list; the idle case of the record nothing reads entering another list
  // than the idle one; and the working screen case entering activity 1's working screen.
  assert.match(refused((b) => { b[caseAt(22, 2) + 1]! += 1; }), /record 22's case for 2 is not the built device list case/);
  const other = [...b16(c, caseAt(13, 1) + 1)];
  assert.match(refused((b) => { b.set(other, caseAt(13, 2) + 1); b.set(other, caseAt(22, 2) + 1); }),
               /activity 2's case under the key under Devices enters neither a device list of its own nor the idle one/);
  assert.match(refused((b) => { b[caseAt(22, 3) + 1]! += 1; }), /record 22's case for 3 is not the built idle device list case/);
  assert.match(refused((b) => { b.set([...b16(c, caseAt(8, 1) + 1)], caseAt(8, 2) + 1); }),
               /activity 2's working screen case does not enter the screen its start sequence ends on/);
  // The keypad map case has no control of its own: a same length edit that still reads as a case
  // selects another entry, which the reader that finds the records, `activityKeyedRecords`, refuses
  // before this check runs.
});

test('section NNM: an activity composed on a Harmony 650, 600 and 700 passes the check its compiles pass',
     skipUnless('h650_config_region', 'h600_config', 'h700_config', 'h700_28_config_region'), () => {
  // Composed with its screens, its menu row and its own device list. The composed start up screen draws
  // the fixed lines by reference to the compiler's copy, and its working screen's chrome, key map and
  // cases are the built ones, so the configuration afterwards holds one activity more under the same check.
  for (const host of ['h650_config_region', 'h600_config', 'h700_config', 'h700_28_config_region']) {
    const c = parse(require_(host));
    const before = checkActivityScreens(c, activityScreenChrome(c));
    const mode = modeRecords(c)![deviceListRows(c)[0]!.mode]!;
    const commands = mode.pages.flatMap((page) => taggedList(c, page.list)!.entries.map((one) => one.operand));
    const rows = ['Power', 'Menu', 'Home', 'Info', 'Guide'].map((label, k) => ({ label, list: commands[k]! }));
    const screen = composeActivityScreen(c, nextActivityValue(c), 'Play Audio', rows);
    const middle = parse(screen.bytes);
    const target = deviceVariables(middle).filter((one) => one.property === 'Power').at(-1)!;
    const built = composeActivity(middle, {
      label: 'Play Audio', targets: [{ variable: target.index, value: 1 }],
      screen: {
        startupMode: screen.startupMode, workingMode: screen.mode, activity: screen.activity,
        startVariable: screen.startVariable, flagVariable: screen.flagVariable, set: screen.set,
      },
    });
    const rowed = parse(composeActivityMenuRow(parse(built.bytes), built.label, built.set).bytes);
    // Before its own device list the key under Devices opens the idle list, and after it the activity's own.
    const opens = (one: Container): number[] => activityKeyedRecords(one).devices.map((map) =>
      caseQueued(one, valueMaps(one)![map]!.entries.find(([key]) => key === built.activity)![1])!.operand);
    const unlisted = checkActivityScreens(rowed, activityScreenChrome(rowed));
    assert.deepEqual(opens(rowed), [activityScreenChrome(rowed).idleList, activityScreenChrome(rowed).idleList], host);
    const ownList = composeActivityDeviceList(rowed, built.activity);
    const after = parse(ownList.bytes);
    assert.deepEqual(opens(after), [ownList.mode, ownList.mode], host);
    const listed = checkActivityScreens(after, activityScreenChrome(after));
    for (const checked of [unlisted, listed]) {
      assert.deepEqual(checked, {
        startups: before.startups + 1, working: before.working + 1, workingPages: before.workingPages + 2,
        cases: before.cases + 4,
      }, host);
    }
    // The fixed lines point at the compiler's copy, and so does the title where the configuration
    // already draws it: on `h700_config` "Play Audio Cassette"'s start up screen draws "Starting Play
    // Audio" inline as its first line. Elsewhere the title is new and drawn inline.
    const program = screenProgram(after, modeRecords(after)![screen.startupMode]!.pages[0]!.program)!;
    const title = host === 'h700_config' ? 0x04 : 0x05;
    assert.deepEqual(program.map((one) => one.opcode), [0x02, 0x10, title, 0x04, 0x04, 0x04, 0x00], host);
  }
});

test('section NNM: the start up screen is the Harmony One\'s to choose, not the 600\'s, 650\'s or 700\'s',
     skipUnless('h650_config_region'), () => {
  // Every start up screen on those remotes draws one picture, so asking for another activity's is refused
  // rather than ignored.
  const c = parse(require_('h650_config_region'));
  assert.throws(() => composeActivityScreen(c, nextActivityValue(c), 'Play Audio', [], { startupLike: 'TV kijken' }),
                /startupLike is the Harmony One's/);
});
