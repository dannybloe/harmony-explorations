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
  type Container, type ContainerPiece, ScreenRecordError, characterMap, decode, layOutContainer, modeRecords, parse,
  screenProgram, takeApart,
} from '../src/index.ts';
import { textGlyphs } from '../src/shared/spelling.ts';
import { listsBelow, namedByRecords } from './screenlists.ts';
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
 * reference to a copy outside the screens as the compile's other screens fall. Since `todo-compile-one.md` 6.5
 * the screens' bytes count the 154 lists below them, 1210 bytes on every compile, and the description reads
 * 73 bytes of those, their indices and the variables their writes name, section 418.
 */
const SKIN_54: Readonly<Record<string, { described: number; structure: number }>> = {
  harvest_one_two_devices: { described: 4074, structure: 14349 },
  one_spare_after_sync: { described: 4031, structure: 14368 },
  one_spare_myharmony: { described: 4290, structure: 14350 },
  one_spare_20260830: { described: 4290, structure: 14350 },
  calibration_one: { described: 4074, structure: 14349 },
  calibration_favchannels: { described: 4074, structure: 14349 },
  calibration_favzero: { described: 4290, structure: 14350 },
  compiled_protocols: { described: 4340, structure: 14352 },
  compiled_protocols_2: { described: 4340, structure: 14352 },
  compiled_protocols_3: { described: 4312, structure: 14351 },
  harvest_one_families_1: { described: 4074, structure: 14349 },
  harvest_one_families_2: { described: 4031, structure: 14368 },
  harvest_one_families_3: { described: 4544, structure: 14356 },
  one_friend_legacy_sync_config: { described: 4268, structure: 14349 },
  phase7_before: { described: 4074, structure: 14349 },
  phase7_after: { described: 4074, structure: 14349 },
};
const NAMES = Object.keys(SKIN_54);

/** The three Harmony One compiles beyond the sixteen: the European factory file and its programmed copy, and the Dutch one. */
const BEYOND = ['one_config', 'one_config_unprogrammed', 'one_friend_asfound_config'];

test('todo-compile-one 4.4.4.1 and 6.5: the 23 fixed screens past the firmware\'s ten of the sixteen English compiles of skin 54 are rebuilt byte for byte from a description, 685 lists among them, their own 531 and 154 below them',
     skipUnless(...NAMES), () => {
  assert.equal(TOUCH_FIXED_SCREENS.length, 23);
  // The 531 their own key maps, page lists, copies and chromes name, section 411, and since `todo-compile-one.md`
  // 6.5 the 154 below those that the wiring does not build, section 418.
  for (const name of NAMES) {
    assert.deepEqual(checkTouchFixedScreens(parse(require_(name))), { screens: 23, lists: 685, ...SKIN_54[name] }, name);
  }
});

test('todo-compile-one 4.4.4.1, rewritten by section 434: beyond the sixteen, the European compiles are refused for the Time of Day picker skin 59 does not hold and the Dutch one for its words, no longer for a Year picker offering a leap year; a build year of 2027 asks for the two screens a leap year brings, and 2030 is refused for a digit the compile\'s font set does not hold',
     skipUnless('one_config', 'one_config_unprogrammed', 'one_friend_asfound_config', 'harvest_one_two_devices'), () => {
  // Built in 2023 and in 2013, their Year pickers offer 2024 and 2012, with a Day 29 picker and a second Month
  // picker leading February to it. Section 434 builds those two, so the leap year no longer refuses them: the
  // European two hold no Time of Day picker, section 405, and the Dutch one draws no English title.
  for (const name of ['one_config', 'one_config_unprogrammed']) {
    for (const reading of [checkTouchFixedScreens, touchFixedScreenModes]) {
      assert.throws(() => reading(parse(require_(name))),
        (error: Error) => error instanceof ScreenRecordError && /holds 0 screens of the look of Time of Day, not one/.test(error.message), name);
    }
  }
  assert.throws(() => touchFixedScreenModes(parse(require_('one_friend_asfound_config'))),
    (error: Error) => error instanceof ScreenRecordError && /holds 0 screens of the look of Options, not one/.test(error.message));
  const c = parse(require_('harvest_one_two_devices'));
  const d = describeTouchFixedScreens(c, takeApart(c));
  assert.equal(d.spec.year, 2026);
  // 2027 offers 2028, so the build wants the leap year's Month picker and the Day 29 picker, which a description
  // read off a 2026 compile does not number.
  assert.throws(() => buildTouchFixedScreens(c, { ...d.spec, year: 2027 }),
    (error: Error) => error instanceof ScreenRecordError && /the description holds 23 screens, not 25/.test(error.message));
  // 2030 offers no leap year and keeps the 23; it is refused by the font set, which holds only the digits the
  // compile drew: no 9 in font 11 here.
  assert.throws(() => buildTouchFixedScreens(c, { ...d.spec, year: 2030 }),
    (error: Error) => !/screens, not/.test(error.message) && /has no glyph for '9'/.test(error.message));
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
  // 229640 bytes of screens over the sixteen, the lists below them among them since section 418, 229640 - 66584 =
  // 163056 of them written by the builder and every one blinded; the description reads 66584 bytes inside them,
  // 1168 of those the lists below's indices and variables, and 596 outside, the homes' glyph codes. 210280,
  // 65416 and 144864 before the lists below were built.
  assert.deepEqual(totals, { structure: 229640, inside: 66584, outside: 596, blinded: 163056 });
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

test('todo-compile-one 4.4.4.1 and 6.5: of the 685 lists built, the 531 the screens name are named by nothing outside them, and of the 154 below those 6 are named from outside too; the 53 left below are each named from outside or reached from a list that is, so none runs for these screens alone',
     skipUnless(...NAMES), () => {
  const found = NAMES.map((name) => {
    const c = parse(require_(name));
    const d = describeTouchFixedScreens(c, takeApart(c));
    const modes = new Set(touchFixedScreenModes(c));
    const built = new Set(buildTouchFixedScreens(c, d.spec).lists.keys());
    const own = namedByRecords(c, modes);
    const below = listsBelow(c, modes, built);
    // The screens' own lists are those their records name; every other list built is below them.
    return {
      own: [...built].filter((index) => own.has(index)).length, ...below,
      namedFromOutside: below.namedFromOutside.length,
      ownNamedFromOutside: below.namedFromOutside.filter((index) => own.has(index)).length,
    };
  });
  // Until `todo-compile-one.md` 6.5 the 531 were all the builder made and the walk found 207 lists below them,
  // 147 run by these screens alone and 60 shared, 17 of them named directly from outside. Since section 418 the
  // 154 below that the wiring does not build are built too: the 147 and 7 shared ones, the off lists of the page
  // keys, of channel 5 and of channel 7, the list turning the Remote Assistant on, which the tour reaches, and
  // the clock handlers' last two lists and the one they share, which lists nothing reaches name too (section
  // 411's blind count). Of those, 6 are named directly from outside. What is left below, 53 lists, is the
  // wiring's and named from outside, 11 directly, `touchbelowlists.test.ts`. The walk is `screenlists.ts`'.
  assert.deepEqual(found, NAMES.map(() => ({ own: 531, namedFromOutside: 6, ownNamedFromOutside: 0, below: 53, shared: 11, sharedBelow: 53 })));
});
