/**
 * The Harmony One's clock header built from a description, `todo-compile-one.md` 4.7, findings section 414: the
 * four screen programs along the top of the screen, base slot 11 entries 0 to 3, and the six lists the clock's
 * minute and hour call.
 *
 * **The blind control makes "generated" a test**, as sections 409, 411 and 412 did: every byte of the programs
 * and lists the description does not read is overwritten, in the file the description reads and the fonts are
 * spelled from and in the layout's own pieces, and the sixteen still come back byte for byte. The description
 * still finds its way through the container itself: which instruction is where, how long a list is.
 *
 * Every figure is exact, and the populations are literals in this file.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { require_, skipUnless } from '@harmony/lab';
import {
  type ContainerPiece, ScreenRecordError, archSlot, layOutContainer, modeRecords, parse, reachablePrograms,
  screenProgram, screenProgramRoots, screenUnits, stateRecords, takeApart,
} from '../src/index.ts';
import {
  CLOCK_HEADER_PICTURES, CLOCK_HEADER_PROGRAMS, buildTouchClockHeader, checkTouchClockHeader, describeTouchClockHeader,
  touchClockHeaderEntries, withTouchClockHeader,
} from '../src/families/touch/clockheader.ts';
import { TOUCH_FIXED_SCREENS, touchFixedScreenModes } from '../src/families/touch/fixedscreens.ts';

/** The first offset two files differ at, or undefined where they are the same. */
function firstDifference(a: Uint8Array, b: Uint8Array): number | undefined {
  const length = Math.max(a.length, b.length);
  for (let at = 0; at < length; at += 1) if (a[at] !== b[at]) return at;
  return undefined;
}

/** The sixteen English compiles of skin 54, section 405. */
const NAMES = [
  'harvest_one_two_devices', 'one_spare_after_sync', 'one_spare_myharmony', 'one_spare_20260830', 'calibration_one',
  'calibration_favchannels', 'calibration_favzero', 'compiled_protocols', 'compiled_protocols_2', 'compiled_protocols_3',
  'harvest_one_families_1', 'harvest_one_families_2', 'harvest_one_families_3', 'one_friend_legacy_sync_config',
  'phase7_before', 'phase7_after',
];
/** The three Harmony One compiles beyond the sixteen: the everyday One's and the European factory file, skin 59, and the Dutch one. */
const BEYOND = ['one_config', 'one_config_unprogrammed', 'one_friend_asfound_config'];

/**
 * What one check reads, the same on each of the sixteen: 3516 bytes of programs and 42 of lists; 461 bytes read
 * as values, 6 of them the glyph codes of "Sun" and "12:", the first day's and the first hour's words, which say
 * the language and the clock.
 */
const ON_THE_SIXTEEN = { programs: 4, pieces: 249, lists: 6, described: 461, structure: 3558 };

test('todo-compile-one 4.7: the clock header of the sixteen English compiles of skin 54 is rebuilt byte for byte from a description, four programs in 249 pieces and the six lists the minute and the hour call, 3558 bytes each',
     skipUnless(...NAMES), () => {
  assert.equal(CLOCK_HEADER_PROGRAMS.length, 4);
  for (const name of NAMES) assert.deepEqual(checkTouchClockHeader(parse(require_(name))), ON_THE_SIXTEEN, name);
});

test('todo-compile-one 4.7: beyond the sixteen, both European compiles rebuild on a twenty four hour clock, 21 bytes longer for twelve more hours held inline, and the Dutch compile is refused for its days',
     skipUnless(...BEYOND), () => {
  for (const name of ['one_config', 'one_config_unprogrammed']) {
    const c = parse(require_(name));
    const d = describeTouchClockHeader(c, takeApart(c));
    assert.equal(d.spec.hours, 24, name);
    // The twenty four hour words are all held inline, with the seven days.
    assert.equal(buildTouchClockHeader(c, d.spec).inline.size, 31, name);
    assert.deepEqual(checkTouchClockHeader(c), { ...ON_THE_SIXTEEN, structure: 3579 }, name);
  }
  assert.throws(() => checkTouchClockHeader(parse(require_('one_friend_asfound_config'))),
    (error: Error) => error instanceof ScreenRecordError && /draws Sunday as "zo", another language than English/.test(error.message));
});

test('todo-compile-one 4.7: on all nineteen compiles the four programs are base slot 11 entries 0 to 3, in three orders, and on the eighteen that describe laid out one after another in entry order and each in the order its reader reads it',
     skipUnless(...NAMES, ...BEYOND), () => {
  const orders = new Map<string, number>();
  let contiguous = 0;
  for (const name of [...NAMES, ...BEYOND]) {
    const c = parse(require_(name));
    const { entries } = touchClockHeaderEntries(c);
    assert.deepEqual([...entries].sort(), [0, 1, 2, 3], name);
    orders.set(entries.join(), (orders.get(entries.join()) ?? 0) + 1);
    if (name === 'one_friend_asfound_config') continue;
    // The pieces as the description reads them, programs taken in entry order: each starts where the one
    // before it ends, so the reader's order and the entry order are the layout's.
    const layout = takeApart(c);
    const d = describeTouchClockHeader(c, layout);
    const laid = layOutContainer(layout);
    const pieces = entries.map((entry, p) => [entry, p] as const).sort((a, b) => a[0] - b[0])
      .flatMap(([, p]) => d.place.programs[p] as ContainerPiece[]);
    pieces.slice(1).forEach((piece, k) => {
      const before = pieces[k] as ContainerPiece;
      assert.equal(laid.offsetOf(piece), (laid.offsetOf(before) as number) + before.bytes.length, `${name}: piece ${k + 1}`);
    });
    contiguous += 1;
  }
  // The gauge, the charging gauge, the sending mark and the clock, by entry.
  assert.deepEqual(Object.fromEntries(orders), { '0,1,2,3': 12, '0,1,3,2': 4, '1,0,2,3': 3 });
  assert.equal(contiguous, 18);
});

test('todo-compile-one 4.7: who runs the four agrees with what they are found to be by look: every list running any of them runs the gauge, the clock and the sending mark, or the clock and the charging gauge, and a screen program queues the sending mark alone, on all nineteen',
     skipUnless(...NAMES, ...BEYOND), () => {
  const shapes = new Map<string, number>();
  const queued = new Map<string, number>();
  for (const name of [...NAMES, ...BEYOND]) {
    const c = parse(require_(name));
    const { entries } = touchClockHeaderEntries(c);
    const roleOf = (entry: number): string => CLOCK_HEADER_PROGRAMS[entries.indexOf(entry)] as string;
    for (const body of c.actionLists() ?? []) {
      const runs = body.filter((one) => one.opcode === 0x73 && entries.includes(one.operand)).map((one) => roleOf(one.operand));
      // A list that also starts a timer, `1F EB`, is a redraw timer's own list, section 410.
      const timer = body.some((one) => one.opcode === 0x1f && one.operand >> 8 === 0xeb) ? ' and a timer' : '';
      if (runs.length > 0) shapes.set(runs.join(' ') + timer, (shapes.get(runs.join(' ') + timer) ?? 0) + 1);
    }
    for (const [, program] of reachablePrograms(c, screenProgramRoots(c))) {
      for (const one of program) {
        const operand = (one.operands[0] as number) | ((one.operands[1] as number) << 8);
        if (one.opcode === 0x11 && one.operands[2] === 0x73 && entries.includes(operand)) {
          queued.set(roleOf(operand), (queued.get(roleOf(operand)) ?? 0) + 1);
        }
      }
    }
  }
  // In those orders, over the nineteen: three in a list, as the header handler's `0x2D` lists of section 411
  // run three programs, and two, as the redraw timers' lists of section 410 run two. The screen programs that
  // queue one queue the sending mark, as many times as there are lists of three.
  assert.deepEqual(Object.fromEntries(shapes), { 'gauge clock sending': 3195, 'clock charging': 3195, 'clock charging and a timer': 318 });
  assert.deepEqual(Object.fromEntries(queued), { sending: 3195 });
});

test('todo-compile-one 4.7: the sixteen shared pictures sit at sixteen addresses, exactly the pictures section 405 found only the clock\'s programs draw, and hold thirteen images, the full gauge stored three times and level 4 twice, on the sixteen',
     skipUnless(...NAMES), () => {
  assert.equal(CLOCK_HEADER_PICTURES, 16);
  for (const name of NAMES) {
    const c = parse(require_(name));
    const layout = takeApart(c);
    const d = describeTouchClockHeader(c, layout);
    const laid = layOutContainer(layout);
    const ours = d.spec.slots.map((one) => (laid.offsetOf(one.to) as number) + one.offset);
    assert.equal(new Set(ours).size, 16, name);
    // By content: the full gauge (level 7) is also the charged picture and an animation frame, level 4 another
    // frame, each a byte identical copy at an address of its own; the blind reviewer's count.
    const images = d.spec.slots.map((one) => Buffer.from(one.to.bytes.subarray(one.offset)).toString('hex'));
    assert.equal(new Set(images).size, 13, name);
    assert.equal(images[7], images[8], name);
    assert.equal(images[7], images[10], name);
    assert.equal(images[4], images[11], name);
    const dynamic = (screenUnits(c) ?? []).filter((unit) => unit.kind === 'picture' && unit.dynamicBy !== undefined)
      .map((unit) => (unit.ranges[0] as { start: number }).start);
    assert.deepEqual([...ours].sort((a, b) => a - b), [...dynamic].sort((a, b) => a - b), name);
  }
});

test('todo-compile-one 4.7: the clock draws 19 words inline, the seven days and twelve hours, and the sixty minutes by reference to copies outside it, 950 of the 960 held by section 411\'s clock pickers and 10 by none of them, on the sixteen',
     skipUnless(...NAMES), () => {
  const holders = new Map<string, number>();
  for (const name of NAMES) {
    const c = parse(require_(name));
    const layout = takeApart(c);
    const d = describeTouchClockHeader(c, layout);
    assert.equal(buildTouchClockHeader(c, d.spec).inline.size, 19, name);
    assert.equal(d.spec.homes.size, 60, name);
    // Which of section 411's screens draws each home inline, through every program its pages reach.
    const laid = layOutContainer(layout);
    const homes = [...d.spec.homes.values()].map((home) => (laid.offsetOf(home.to) as number) + home.offset);
    const modes = touchFixedScreenModes(c);
    for (const at of homes) {
      const held = TOUCH_FIXED_SCREENS.filter((_, s) => {
        const record = (modeRecords(c) ?? [])[modes[s] as number];
        return [...reachablePrograms(c, (record?.pages ?? []).map((page) => page.program)).values()]
          .some((program) => program.some((one) => one.opcode === 0x05 && at >= one.start && at < one.start + one.length));
      });
      const key = held.length === 0 ? 'none of them' : held.join(' and ');
      holders.set(key, (holders.get(key) ?? 0) + 1);
    }
  }
  // The ten are "10" to "19" on `harvest_one_families_3`, drawn inline by a mode of nineteen pages laid out
  // before the pickers. So where a minute's copy lives is the setup's as much as the remote's, and a home.
  assert.deepEqual(Object.fromEntries(holders), { 'Minute': 647, 'Day 28': 294, 'Day 30': 6, 'Day 31': 3, 'none of them': 10 });
});

test('todo-compile-one 4.7: the six lists the minute and the hour call are 42 bytes and called by no other action list, on all nineteen',
     skipUnless(...NAMES, ...BEYOND), () => {
  for (const name of [...NAMES, ...BEYOND]) {
    const c = parse(require_(name));
    const lists = c.actionLists() ?? [];
    const records = stateRecords(c) ?? [];
    const clock = new Set<number>();
    const walk = (index: number): void => {
      if (clock.has(index)) return;
      clock.add(index);
      for (const one of lists[index] ?? []) if (one.opcode === 0x7f) walk(one.operand);
    };
    for (const record of [records[1], records[2]]) for (const one of record?.values ?? []) if (one.opcode === 0x7f) walk(one.operand);
    assert.equal(clock.size, 6, name);
    assert.equal([...clock].reduce((sum, index) => sum + 1 + 3 * (lists[index]?.length ?? 0), 0), 42, name);
    const elsewhere = lists.flatMap((body, index) => (clock.has(index) ? [] : body.filter((one) => one.opcode === 0x7f && clock.has(one.operand))));
    assert.equal(elsewhere.length, 0, name);
  }
});

test('todo-compile-one 4.7: a blinded input rebuilds all sixteen: no byte of the programs or lists outside the description reaches the build',
     skipUnless(...NAMES), () => {
  const totals = { structure: 0, inside: 0, outside: 0, blinded: 0 };
  for (const name of NAMES) {
    const c = parse(require_(name));
    const first = describeTouchClockHeader(c, takeApart(c));
    totals.structure += first.structure.size;
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
    const d = describeTouchClockHeader(c, layout, (at) => blinded[at] as number);
    assert.deepEqual([...d.described].sort((a, b) => a - b), [...first.described].sort((a, b) => a - b), `${name}: reads`);
    let k = 0;
    for (const at of [...first.structure].sort((a, b) => a - b)) {
      if (first.described.has(at)) continue;
      while (k + 1 < starts.length && (starts[k + 1] as (typeof starts)[number]).at <= at) k += 1;
      const one = starts[k] as { piece: ContainerPiece; at: number };
      one.piece.bytes[at - one.at] = blinded[at] as number;
    }
    const out = layOutContainer(withTouchClockHeader(layout, buildTouchClockHeader(parse(blinded), d.spec), d.place)).bytes;
    assert.equal(firstDifference(out, c.blob), undefined, `${name} differs`);
  }
  // 56928 bytes of programs and lists over the sixteen, 3558 each; the description reads 5392 of them, and 1984
  // outside them: the homes' glyph codes and the two lists' indices the state records hold. Every other byte,
  // 51536, is the builder's and blinded.
  assert.deepEqual(totals, { structure: 56928, inside: 5392, outside: 1984, blinded: 51536 });
});

test('todo-compile-one 4.7: a description with two gauge pictures swapped, a twenty four hour clock, or a counted variable moved is refused by the rebuild, the clock\'s font moved by its speller and a shared picture short by the builder; the entries order the build alone and change nothing it compares',
     skipUnless('harvest_one_two_devices'), () => {
  const c = parse(require_('harvest_one_two_devices'));
  type Spec = ReturnType<typeof describeTouchClockHeader>['spec'];
  const tamper = (change: (spec: Spec) => void): void => {
    const layout = takeApart(c);
    const d = describeTouchClockHeader(c, layout);
    change(d.spec);
    const out = layOutContainer(withTouchClockHeader(layout, buildTouchClockHeader(c, d.spec), d.place)).bytes;
    if (firstDifference(out, c.blob) !== undefined) throw new ScreenRecordError('the rebuilt file differs');
  };
  tamper(() => undefined);
  const moved = /the rebuilt file differs/;
  // The gauge's first two levels' pictures the other way round, which both gauges draw.
  assert.throws(() => tamper((spec) => { [spec.slots[0], spec.slots[1]] = [spec.slots[1]!, spec.slots[0]!]; }), moved);
  // The clock's font one down: the configuration's other fonts hold only the glyphs they draw, so this one has no
  // "S" to spell "Sun" with, and one up is no font the configuration carries.
  assert.throws(() => tamper((spec) => { spec.fonts.clock -= 1; }), /font 14 has no glyph for 'S'/);
  // A twenty four hour clock on a compile that draws twelve.
  assert.throws(() => tamper((spec) => { spec.hours = 24; }), moved);
  // The minute's first counted variable, where it is incremented, one on: the description reads the minute's
  // list, its first count, that count's list, then the variable where it is tested and where it is incremented.
  assert.throws(() => tamper((spec) => { spec.calls[0]![4]! += 1; }), moved);
  // The gauge and the charging gauge at each other's entries: the build's order moves, but the four hold no text
  // between them but the clock's, so no inline copy moves, and the table naming the entries is not rebuilt here.
  tamper((spec) => { [spec.programs[0]!.entry, spec.programs[1]!.entry] = [spec.programs[1]!.entry, spec.programs[0]!.entry]; });
  // A shared picture the description does not hold.
  assert.throws(() => tamper((spec) => { spec.slots.length = 15; }),
    (error: Error) => error instanceof ScreenRecordError && /too few pictures for the clock/.test(error.message));
});

test('todo-compile-one 4.7: the four entries the finder gives name the four programs\' starts in the configuration\'s base slot 11 table, the clock opening with its face and the other three with a switch, on the sixteen',
     skipUnless(...NAMES), () => {
  for (const name of NAMES) {
    const c = parse(require_(name));
    const table = c.pointerArray(archSlot(c.architecture as number, 11)) ?? [];
    const { addresses, entries } = touchClockHeaderEntries(c);
    assert.deepEqual(entries.map((entry) => table[entry]), addresses, name);
    assert.deepEqual(addresses.map((address) => screenProgram(c, address)?.[0]?.opcode), [0x12, 0x12, 0x12, 0x02], name);
  }
});
