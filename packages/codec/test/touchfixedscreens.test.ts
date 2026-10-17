/**
 * The Harmony One's fixed screens past the firmware's ten built from a description, `todo-compile-one.md`
 * 4.4.4.1, findings section 411: code 9's status screen, Options, screen sensitivity's picker and five
 * confirmations, the clock's eight pickers and the seven blank screens the timers enter.
 *
 * **The blind control makes "generated" a test**, as section 409's did: every byte of the screens the
 * description does not read is overwritten, in the file the description reads and the fonts are spelled
 * from and in the layout's own pieces, and the sixteen still come back byte for byte. The description still
 * finds its way through the container itself, which tag is where and how long a list is.
 *
 * Every figure is exact, and the populations are literals in this file.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { require_, skipUnless } from '@harmony/lab';
import {
  type Container, type ContainerPiece, SCREEN_QUEUE_INSTRUCTION, ScreenRecordError, archSlot, characterMap, decode,
  handlerSets, layOutContainer, modePages, modeRecords, pageListCopies, parse, reachablePrograms, screenProgram,
  stateRecords, taggedList, takeApart, timers, valueMaps,
} from '../src/index.ts';
import { textGlyphs } from '../src/shared/spelling.ts';
import {
  TOUCH_FIXED_SCREENS, buildTouchFixedScreens, checkTouchFixedScreens, describeTouchFixedScreens,
  touchFixedScreenModes, withTouchFixedScreens,
} from '../src/families/touch/fixedscreens.ts';

/** The first offset two files differ at, or undefined where they are the same. */
function firstDifference(a: Uint8Array, b: Uint8Array): number | undefined {
  const length = Math.max(a.length, b.length);
  for (let at = 0; at < length; at += 1) if (a[at] !== b[at]) return at;
  return undefined;
}

/**
 * The sixteen English compiles of skin 54, section 405, with what each check reads: the bytes of the 23
 * screens and the bytes the description reads, which differ by compile because a text is drawn inline or by
 * reference to a copy outside the screens as the compile's other screens fall.
 */
const SKIN_54: Readonly<Record<string, { described: number; structure: number }>> = {
  harvest_one_two_devices: { described: 4001, structure: 13139 },
  one_spare_after_sync: { described: 3958, structure: 13158 },
  one_spare_myharmony: { described: 4217, structure: 13140 },
  one_spare_20260830: { described: 4217, structure: 13140 },
  calibration_one: { described: 4001, structure: 13139 },
  calibration_favchannels: { described: 4001, structure: 13139 },
  calibration_favzero: { described: 4217, structure: 13140 },
  compiled_protocols: { described: 4267, structure: 13142 },
  compiled_protocols_2: { described: 4267, structure: 13142 },
  compiled_protocols_3: { described: 4239, structure: 13141 },
  harvest_one_families_1: { described: 4001, structure: 13139 },
  harvest_one_families_2: { described: 3958, structure: 13158 },
  harvest_one_families_3: { described: 4471, structure: 13146 },
  one_friend_legacy_sync_config: { described: 4195, structure: 13139 },
  phase7_before: { described: 4001, structure: 13139 },
  phase7_after: { described: 4001, structure: 13139 },
};
const NAMES = Object.keys(SKIN_54);

/** The three Harmony One compiles beyond the sixteen: the European factory file and its programmed copy, and the Dutch one. */
const BEYOND = ['one_config', 'one_config_unprogrammed', 'one_friend_asfound_config'];

test('todo-compile-one 4.4.4.1: the 23 fixed screens past the firmware\'s ten of the sixteen English compiles of skin 54 are rebuilt byte for byte from a description, 531 lists among them',
     skipUnless(...NAMES), () => {
  assert.equal(TOUCH_FIXED_SCREENS.length, 23);
  for (const name of NAMES) {
    assert.deepEqual(checkTouchFixedScreens(parse(require_(name))), { screens: 23, lists: 531, ...SKIN_54[name] }, name);
  }
});

test('todo-compile-one 4.4.4.1: beyond the sixteen, the European and Dutch compiles are refused for a Year picker offering a leap year, and their screens for a second Month picker and for their words; a build year of 2027 is refused for its leap year, and 2030 for a digit the compile\'s font set does not hold',
     skipUnless('one_config', 'one_config_unprogrammed', 'one_friend_asfound_config', 'harvest_one_two_devices'), () => {
  // Built in 2023 and in 2013, their Year pickers offer 2024 and 2012, and with them a Day 29 picker and a
  // second Month picker leading February to it, which is not built.
  for (const [name, leap] of [['one_config', 2024], ['one_config_unprogrammed', 2024], ['one_friend_asfound_config', 2012]] as const) {
    assert.throws(() => checkTouchFixedScreens(parse(require_(name))),
      (error: Error) => error instanceof ScreenRecordError && new RegExp(`offers ${leap}, a leap year`).test(error.message), name);
  }
  // Their screens, looked for by what they draw: the European two hold that second Month picker; the Dutch
  // one draws no English title.
  for (const name of ['one_config', 'one_config_unprogrammed']) {
    assert.throws(() => touchFixedScreenModes(parse(require_(name))),
      (error: Error) => error instanceof ScreenRecordError && /holds 2 screens of the look of Month, not one/.test(error.message), name);
  }
  assert.throws(() => touchFixedScreenModes(parse(require_('one_friend_asfound_config'))),
    (error: Error) => error instanceof ScreenRecordError && /holds 0 screens of the look of Options, not one/.test(error.message));
  const c = parse(require_('harvest_one_two_devices'));
  const d = describeTouchFixedScreens(c, takeApart(c));
  assert.equal(d.spec.year, 2026);
  assert.throws(() => buildTouchFixedScreens(c, { ...d.spec, year: 2027 }),
    (error: Error) => error instanceof ScreenRecordError && /offers 2028, a leap year/.test(error.message));
  // One build year in four offers no leap year, 2030 the next after 2026; it passes the year's check and is
  // then refused by the font set, which holds only the digits the compile drew: no 9 in font 11 here.
  assert.throws(() => buildTouchFixedScreens(c, { ...d.spec, year: 2030 }),
    (error: Error) => !/leap year/.test(error.message) && /has no glyph for '9'/.test(error.message));
});

/**
 * Per mode, the words its pages draw in their own programs, decoded through the compile's own character map:
 * enough to find the Year picker's years and the Day pickers' last days without naming any screen.
 */
function pageWords(c: Container, record: { pages: { program: number }[] }): string[] {
  const map = characterMap(c);
  if (map === undefined) return [];
  return record.pages.flatMap((page) => (screenProgram(c, page.program) ?? []).flatMap((one) => {
    const glyphs = textGlyphs(c, one);
    return glyphs === undefined ? [] : [decode(glyphs, map)];
  }));
}

test('todo-compile-one 4.4.4.1: on all nineteen Harmony One compiles the Year picker offers the build year and the year either side, its 0x79 is minus the first of them less 2000, and where those hold a leap year a Day picker of 29 days is there too',
     skipUnless(...NAMES, ...BEYOND), () => {
  for (const name of [...NAMES, ...BEYOND]) {
    const c = parse(require_(name));
    const built = Number(c.builtAt?.slice(0, 4));
    const years = new Set<string>();
    const lastDays: number[] = [];
    for (const record of modeRecords(c) ?? []) {
      const words = pageWords(c, record);
      for (const word of words) if (/^20\d\d$/.test(word)) years.add(word);
      // A clock picker binds 0x29; the Day pickers are the ones whose last number is a month's last day.
      const last = Math.max(-1, ...words.filter((word) => /^\d+$/.test(word)).map(Number));
      if (record.entries.some((one) => one.tag === 0x29) && last >= 28 && last <= 31) lastDays.push(last);
    }
    assert.deepEqual([...years].sort(), [built - 1, built, built + 1].map(String), name);
    const leap = [built - 1, built, built + 1].some((year) => year % 4 === 0);
    assert.deepEqual(lastDays.sort(), leap ? [28, 29, 30, 31] : [28, 30, 31], name);
    // The Year picker's 0x79 is minus the first year offered less 2000, the only 0x79 operand a compile holds:
    // FFE7 on the sixteen, FFEA on the two of 2023, FFF4 on the Dutch one, which the builder generates.
    const offsets = new Set((c.actionLists() ?? []).flatMap((list) => list.filter((one) => one.opcode === 0x79).map((one) => one.operand)));
    assert.deepEqual([...offsets], [(2001 - built) & 0xffff], name);
  }
});

test('todo-compile-one 4.4.4.1: a Harmony One mode entry\'s first byte is 1 exactly where its own key map binds tag 0x29, 139 of 139, and 0 on the other 3455 of the nineteen compiles',
     skipUnless(...NAMES, ...BEYOND), () => {
  const count = { bindsAndOne: 0, bindsAndZero: 0, noneAndOne: 0, noneAndZero: 0 };
  for (const name of [...NAMES, ...BEYOND]) {
    for (const record of modeRecords(parse(require_(name))) ?? []) {
      const binds = record.entries.some((one) => one.tag === 0x29);
      const key = binds ? (record.kind === 1 ? 'bindsAndOne' : 'bindsAndZero') : (record.kind === 1 ? 'noneAndOne' : 'noneAndZero');
      count[key] += 1;
    }
  }
  // All 139 are clock pickers, seven a compile and nine where a leap year adds two; Time of Day, the clock
  // picker that binds no 0x29, is among the 3455, which is what tells the tag from being a clock picker.
  assert.deepEqual(count, { bindsAndOne: 139, bindsAndZero: 0, noneAndOne: 0, noneAndZero: 3455 });
});

test('todo-compile-one 4.4.4.1: a blinded input rebuilds all sixteen: no byte of the screens outside the description reaches the build',
     skipUnless(...NAMES), () => {
  const totals = { structure: 0, inside: 0, outside: 0, blinded: 0 };
  for (const name of NAMES) {
    const c = parse(require_(name));
    const first = describeTouchFixedScreens(c, takeApart(c));
    totals.structure += first.structure.size;
    // Read inside the screens: the numbering, the fonts, the hit pages, the pictures' and the homes' addresses.
    // Read outside them: the glyph codes of each home, a text another program holds that these draw by reference.
    for (const at of first.described) totals[first.structure.has(at) ? 'inside' : 'outside'] += 1;
    const blinded = c.blob.slice();
    for (const at of first.structure) {
      if (first.described.has(at)) continue;
      blinded[at] = (blinded[at] as number) ^ 0xff;
      totals.blinded += 1;
    }
    const layout = takeApart(c);
    const laid = layOutContainer(layout);
    const pieces = [layout.keyTable, ...layout.body,
      ...layout.sections.flatMap((s) => (s === undefined ? [] : [...s.before, ...s.head])), ...layout.pictures];
    const starts = pieces.map((piece) => ({ piece, at: laid.offsetOf(piece) as number })).sort((a, b) => a.at - b.at);
    const d = describeTouchFixedScreens(c, layout, (at) => blinded[at] as number);
    assert.deepEqual([...d.described].sort((a, b) => a - b), [...first.described].sort((a, b) => a - b), `${name}: reads`);
    let k = 0;
    for (const at of [...first.structure].sort((a, b) => a - b)) {
      if (first.described.has(at)) continue;
      while (k + 1 < starts.length && (starts[k + 1] as (typeof starts)[number]).at <= at) k += 1;
      const one = starts[k] as { piece: ContainerPiece; at: number };
      one.piece.bytes[at - one.at] = blinded[at] as number;
    }
    const out = layOutContainer(withTouchFixedScreens(layout, buildTouchFixedScreens(parse(blinded), d.spec), d.place)).bytes;
    assert.equal(firstDifference(out, c.blob), undefined, `${name} differs`);
  }
  // 210280 bytes of screens over the sixteen, 210280 - 65416 = 144864 of them written by the builder and every
  // one blinded; the description reads 65416 bytes inside them and 596 outside, the homes' glyph codes.
  assert.deepEqual(totals, { structure: 210280, inside: 65416, outside: 596, blinded: 144864 });
});

test('todo-compile-one 4.4.4.1: a description with a timer moved, two pictures swapped or two screens\' modes swapped is refused by the byte comparison',
     skipUnless('harvest_one_two_devices'), () => {
  const c = parse(require_('harvest_one_two_devices'));
  type Spec = ReturnType<typeof describeTouchFixedScreens>['spec'];
  const tamper = (change: (spec: Spec) => void): void => {
    const layout = takeApart(c);
    const d = describeTouchFixedScreens(c, layout);
    change(d.spec);
    const out = layOutContainer(withTouchFixedScreens(layout, buildTouchFixedScreens(c, d.spec), d.place)).bytes;
    if (firstDifference(out, c.blob) !== undefined) throw new ScreenRecordError('the rebuilt file differs');
  };
  tamper(() => undefined);
  const moved = /the rebuilt file differs/;
  const at = (name: string): number => TOUCH_FIXED_SCREENS.indexOf(name);
  // The status screen's first number is the timer its enter handler starts.
  assert.throws(() => tamper((spec) => { (spec.screens[at('LCD Module Failed')] as { numbers: number[] }).numbers[0]! += 1; }), moved);
  // Options' first two pictures, its two Remote Assistant rows' buttons, the other way round.
  assert.throws(() => tamper((spec) => {
    const p = (spec.screens[at('Options')] as { pictures: unknown[] }).pictures;
    [p[0], p[1]] = [p[1], p[0]];
  }), moved);
  // Two confirmations' modes the other way round: the build order moves, and with it which program holds the
  // level words "Low" and "High" inline, since the sensitivity picker between them draws both too.
  assert.throws(() => tamper((spec) => {
    const [low, high] = [spec.screens[at('Sensitivity Low')], spec.screens[at('Sensitivity High')]] as { mode: number }[];
    [low!.mode, high!.mode] = [high!.mode, low!.mode];
  }), moved);
});

/**
 * Every list a holder outside the given modes names with `0x7F`, wherever section 408's walk finds an
 * instruction: other lists, other modes' key maps, page lists and copies, base slot 9's sets, the timers, base
 * slot 13's transitions, the value maps' payloads, base slot 8's leading list and every screen program the
 * given modes' pages do not reach.
 */
function namedOutside(c: Container, modes: ReadonlySet<number>, own: ReadonlySet<number>): Set<number> {
  const named = new Set<number>();
  const records = modeRecords(c) ?? [];
  const theirs = new Set([...reachablePrograms(c, [...modes].flatMap((mode) => (records[mode]?.pages ?? []).map((page) => page.program))).keys()]);
  for (const [address, program] of reachablePrograms(c)) {
    if (theirs.has(address)) continue;
    for (const one of program) {
      if (one.opcode === SCREEN_QUEUE_INSTRUCTION && one.operands[2] === 0x7f) named.add((one.operands[0] as number) | ((one.operands[1] as number) << 8));
    }
  }
  for (const record of stateRecords(c) ?? []) for (const v of record.values) if (v.opcode === 0x7f) named.add(v.operand);
  for (const map of valueMaps(c) ?? []) {
    for (const address of [...map.entries.map((one) => one[1]), ...map.ranges.map((one) => one[2])]) {
      const at = c.blobOffsetOf(address);
      if (at !== undefined && c.blob[at] === 0x11 && c.blob[at + 3] === 0x7f) named.add((c.blob[at + 1] as number) | ((c.blob[at + 2] as number) << 8));
    }
  }
  const lead = c.blobOffsetOf((c.sections[archSlot(c.architecture as number, 8)] as { address: number }).address) as number;
  for (let k = 0; k < (c.blob[lead] as number); k += 1) {
    if (c.blob[lead + 3 + 3 * k] === 0x7f) named.add((c.blob[lead + 1 + 3 * k] as number) | ((c.blob[lead + 2 + 3 * k] as number) << 8));
  }
  (c.actionLists() ?? []).forEach((list, index) => {
    if (own.has(index)) return;
    for (const one of list) if (one.opcode === 0x7f) named.add(one.operand);
  });
  const pages = modePages(c);
  const copies = pageListCopies(c);
  (modeRecords(c) ?? []).forEach((record, mode) => {
    if (modes.has(mode)) return;
    const lists = [record.entries, ...record.pages.flatMap((page) => {
      const rank = pages.findIndex((one) => one.address === page.address);
      return [taggedList(c, page.list)?.entries ?? [], taggedList(c, c.flashBase + (copies[rank] as number))?.entries ?? []];
    })];
    for (const entries of lists) for (const one of entries) if (one.opcode === 0x7f) named.add(one.operand);
  });
  for (const address of handlerSets(c)?.addresses ?? []) {
    for (const one of taggedList(c, address)?.entries ?? []) if (one.opcode === 0x7f) named.add(one.operand);
  }
  for (const timer of timers(c)?.records ?? []) if (timer.instruction.opcode === 0x7f) named.add(timer.instruction.operand);
  return named;
}

test('todo-compile-one 4.4.4.1: the 531 lists built are named by nothing outside the 23 screens, and they name 207 lists below them that stay the configuration\'s, 147 run by these screens alone and 60 shared',
     skipUnless(...NAMES), () => {
  const shared: number[] = [];
  const sharedBelow: number[] = [];
  for (const name of NAMES) {
    const c = parse(require_(name));
    const d = describeTouchFixedScreens(c, takeApart(c));
    const built = new Set(buildTouchFixedScreens(c, d.spec).lists.keys());
    const modes = new Set(touchFixedScreenModes(c));
    const outside = namedOutside(c, modes, built);
    assert.deepEqual([...built].filter((index) => outside.has(index)), [], name);
    // Below them, through every call: the clock's setters and the lists the handlers share.
    const lists = c.actionLists() ?? [];
    const below = new Set<number>();
    const queue = [...built];
    while (queue.length > 0) {
      for (const one of lists[queue.shift() as number] ?? []) {
        if (one.opcode !== 0x7f || built.has(one.operand) || below.has(one.operand)) continue;
        below.add(one.operand);
        queue.push(one.operand);
      }
    }
    assert.equal(below.size, 207, name);
    // The control that the walk finds a name where there is one: of the 207, those something outside the
    // screens and every list they reach names too, the lists the handlers share with the rest.
    const reached = namedOutside(c, modes, new Set([...built, ...below]));
    shared.push([...below].filter((index) => reached.has(index)).length);
    // And through every call down from those: a list of the 207 any of them reaches runs for the rest of the
    // configuration too, so it is shared; the others run for these screens alone.
    const down = new Set([...reached].filter((index) => below.has(index)));
    const more = [...down];
    while (more.length > 0) {
      for (const one of lists[more.shift() as number] ?? []) {
        if (one.opcode !== 0x7f || !below.has(one.operand) || down.has(one.operand)) continue;
        down.add(one.operand);
        more.push(one.operand);
      }
    }
    sharedBelow.push(down.size);
  }
  assert.deepEqual(shared, NAMES.map(() => 17));
  assert.deepEqual(sharedBelow, NAMES.map(() => 60));
});
