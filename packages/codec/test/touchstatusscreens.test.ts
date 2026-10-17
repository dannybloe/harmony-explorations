/**
 * The Harmony One's twenty nine status screens past code 9's built from a description, `todo-compile-one.md` 4.5,
 * findings section 413: the screens the event map names for every status code but 9, which section 408 found the
 * firmware never draws, built so that a configuration of ours can carry them as Logitech's does.
 *
 * **The blind control makes "generated" a test**, as sections 409, 411 and 412 did: every byte of the screens the
 * description does not read is overwritten, in the file the description reads and the fonts are spelled from and
 * in the layout's own pieces, and the sixteen still come back byte for byte. The description still finds its way
 * through the container itself, which tag is where and how long a list is, and the modes through the event map.
 *
 * Every figure is exact, and the populations are literals in this file.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { require_, skipUnless } from '@harmony/lab';
import {
  type Container, type ContainerPiece, SCREEN_SELECT_FONT, SCREEN_TEXT_AT, SCREEN_TEXT_INLINE, ScreenRecordError, assertRebuilt,
  characterMap, decode, eventMap, layOutContainer, modeRecords, parse, reachablePrograms, takeApart, withModeRecords,
} from '../src/index.ts';
import { buildTemplateScreens, describeTemplateScreens } from '../src/families/touch/screentemplate.ts';
import { speller, textGlyphs } from '../src/shared/spelling.ts';
import { listsBelow } from './screenlists.ts';
import {
  DISPLAY_TEST_CODE, STATUS_LINES, TOUCH_STATUS_SCREENS, statusScreen, buildTouchStatusScreens, checkTouchStatusScreens,
  describeTouchStatusScreens, touchStatusScreenModes, withTouchStatusScreens,
} from '../src/families/touch/statusscreens.ts';

/** The first offset two files differ at, or undefined where they are the same. */
function firstDifference(a: Uint8Array, b: Uint8Array): number | undefined {
  const length = Math.max(a.length, b.length);
  for (let at = 0; at < length; at += 1) if (a[at] !== b[at]) return at;
  return undefined;
}

/**
 * The sixteen English compiles of skin 54, section 405. Unlike the fixed screens and the tour, every one of them
 * reads the same: the screens are 3872 bytes and the description 712 on each, since no text of these screens is
 * inline on one compile and by reference on another.
 */
const SKIN_54 = [
  'harvest_one_two_devices', 'one_spare_after_sync', 'one_spare_myharmony', 'one_spare_20260830', 'calibration_one',
  'calibration_favchannels', 'calibration_favzero', 'compiled_protocols', 'compiled_protocols_2', 'compiled_protocols_3',
  'harvest_one_families_1', 'harvest_one_families_2', 'harvest_one_families_3', 'one_friend_legacy_sync_config',
  'phase7_before', 'phase7_after',
];
/** The two European compiles of skin 59, the factory file and the everyday One's, and the Dutch one. */
const EUROPEAN = ['one_config', 'one_config_unprogrammed'];
const DUTCH = 'one_friend_asfound_config';

test('todo-compile-one 4.5: the 29 status screens past code 9\'s of the sixteen English compiles of skin 54 are rebuilt byte for byte from a description, 58 lists among them',
     skipUnless(...SKIN_54), () => {
  assert.equal(STATUS_LINES.length, 30);
  assert.equal(TOUCH_STATUS_SCREENS.length, 29);
  assert.equal(TOUCH_STATUS_SCREENS.includes(`Status ${DISPLAY_TEST_CODE}`), false);
  for (const name of SKIN_54) {
    assert.deepEqual(checkTouchStatusScreens(parse(require_(name))), { screens: 29, lists: 58, described: 712, structure: 3872 }, name);
  }
});

test('todo-compile-one 4.5: beyond the sixteen, both European compiles rebuild the same, code 9\'s screen through the same statusScreen too, and the Dutch compile is refused, its code 16 screen drawing two lines where English draws one',
     skipUnless(...EUROPEAN, DUTCH), () => {
  for (const name of EUROPEAN) {
    const c = parse(require_(name));
    assert.deepEqual(checkTouchStatusScreens(c), { screens: 29, lists: 58, described: 712, structure: 3872 }, name);
    // Code 9's screen alone, which `fixedscreens.ts` builds through `statusScreen` and cannot build on these two,
    // since it refuses their build year: the shape holds on all thirty here as well.
    const layout = takeApart(c);
    const nine = [statusScreen(DISPLAY_TEST_CODE, { title: 'title', body: 'body' })];
    const d = describeTemplateScreens(c, layout, nine, [eventMap(c)?.entries.get(DISPLAY_TEST_CODE) as number], ['title', 'body']);
    assertRebuilt(layOutContainer(withModeRecords(layout, buildTemplateScreens(c, d.spec, nine), d.place)).bytes, c, d.regions);
  }
  // Refused by the description before any word is compared: "Batterij langzaam" and "opladen" are two texts
  // where English draws the one "Battery Trickle\Charge". No language branch; other languages are out of scope.
  assert.throws(() => checkTouchStatusScreens(parse(require_(DUTCH))),
    (error: Error) => error instanceof ScreenRecordError && /Status 16's page 1, instruction 3, is not the end/.test(error.message));
});

/**
 * Per status screen of a compile, in code order: every text its page and chrome draw, with its font's spelled
 * width, decoded through the compile's own character map and font sets.
 */
function statusTexts(c: Container): { code: number; texts: { word: string; x: number; y: number; width: number; inline: boolean }[] }[] {
  const map = characterMap(c);
  if (map === undefined) throw new Error('no character map');
  const spell = speller(c);
  const records = modeRecords(c) ?? [];
  const events = eventMap(c);
  return [...(events?.entries ?? [])].sort(([a], [b]) => a - b).map(([code, mode]) => {
    const texts: { word: string; x: number; y: number; width: number; inline: boolean }[] = [];
    for (const [, program] of reachablePrograms(c, (records[mode]?.pages ?? []).map((page) => page.program))) {
      let font = -1;
      for (const one of program) {
        if (one.opcode === SCREEN_SELECT_FONT) font = one.operands[0] as number;
        if (one.opcode !== SCREEN_TEXT_AT && one.opcode !== SCREEN_TEXT_INLINE) continue;
        const word = decode(textGlyphs(c, one) as Uint8Array, map);
        texts.push({ word, x: one.operands[0] as number, y: one.operands[1] as number, width: spell(font, word).width, inline: one.opcode === SCREEN_TEXT_INLINE });
      }
    }
    return { code, texts };
  });
}

test('todo-compile-one 4.5: every line of the thirty status screens is centred on the screen rounded down and the lines sit twelve apart centred on y 168, on the sixteen, both European compiles and the Dutch one in its own words; 31 of the 54 lines past code 9\'s have an odd remainder',
     skipUnless(...SKIN_54, ...EUROPEAN, DUTCH), () => {
  for (const name of [...SKIN_54, ...EUROPEAN, DUTCH]) {
    const c = parse(require_(name));
    let lines = 0;
    let odd = 0;
    let titles = 0;
    for (const { code, texts } of statusTexts(c)) {
      const body = texts.filter((one) => one.y !== 4);
      // The title, "System Message: N", twice at 6, 4, once inline and once by reference to itself.
      assert.deepEqual(texts.filter((one) => one.y === 4).map((one) => `${one.word} ${one.x} ${one.inline}`),
        [`System Message: ${code} 6 true`, `System Message: ${code} 6 false`], `${name} code ${code}`);
      titles += 2;
      body.forEach((one, r) => {
        assert.equal(one.x, Math.floor((176 - one.width) / 2), `${name} code ${code}: ${one.word}`);
        assert.equal(one.y, 174 - 6 * body.length + 12 * r, `${name} code ${code}: ${one.word}`);
      });
      if (code === DISPLAY_TEST_CODE) continue;
      lines += body.length;
      odd += body.filter((one) => (176 - one.width) % 2 === 1).length;
      // The English words are the template's, on the eighteen English compiles.
      if (name !== DUTCH) assert.deepEqual(body.map((one) => one.word), STATUS_LINES[code], `${name} code ${code}`);
    }
    assert.equal(titles, 60, name);
    // The Dutch compile's lines are its own, 55 past code 9's with 32 odd; the English 54 and 31.
    assert.deepEqual({ lines, odd }, name === DUTCH ? { lines: 55, odd: 32 } : { lines: 54, odd: 31 }, name);
  }
});

test('todo-compile-one 4.5: a blinded input rebuilds all sixteen: no byte of the screens outside the description reaches the build',
     skipUnless(...SKIN_54), () => {
  const totals = { structure: 0, inside: 0, outside: 0, blinded: 0 };
  for (const name of SKIN_54) {
    const c = parse(require_(name));
    const first = describeTouchStatusScreens(c, takeApart(c));
    totals.structure += first.structure.size;
    // Read inside the screens: the numbering, the fonts, the hit pages, the pictures' and the home's addresses.
    // Read outside them: the glyph codes of the one home, "USB Connected", which another program holds.
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
    const d = describeTouchStatusScreens(c, layout, (at) => blinded[at] as number);
    assert.deepEqual([...d.described].sort((a, b) => a - b), [...first.described].sort((a, b) => a - b), `${name}: reads`);
    let k = 0;
    for (const at of [...first.structure].sort((a, b) => a - b)) {
      if (first.described.has(at)) continue;
      while (k + 1 < starts.length && (starts[k + 1] as (typeof starts)[number]).at <= at) k += 1;
      const one = starts[k] as { piece: ContainerPiece; at: number };
      one.piece.bytes[at - one.at] = blinded[at] as number;
    }
    const out = layOutContainer(withTouchStatusScreens(layout, buildTouchStatusScreens(parse(blinded), d.spec), d.place)).bytes;
    assert.equal(firstDifference(out, c.blob), undefined, `${name} differs`);
  }
  // 61952 bytes of screens over the sixteen, 61952 - 11184 = 50768 of them written by the builder and every one
  // blinded; the description reads 11184 bytes inside them and 208 outside, the home's thirteen glyph codes.
  assert.deepEqual(totals, { structure: 61952, inside: 11184, outside: 208, blinded: 50768 });
});

test('todo-compile-one 4.5: a description with a timer moved, a list moved, the two fonts swapped, the home dropped or two screens\' modes swapped is refused, by the builder or the byte comparison',
     skipUnless('harvest_one_two_devices'), () => {
  const c = parse(require_('harvest_one_two_devices'));
  type Spec = ReturnType<typeof describeTouchStatusScreens>['spec'];
  const tamper = (change: (spec: Spec) => void): void => {
    const layout = takeApart(c);
    const d = describeTouchStatusScreens(c, layout);
    change(d.spec);
    const out = layOutContainer(withTouchStatusScreens(layout, buildTouchStatusScreens(c, d.spec), d.place)).bytes;
    if (firstDifference(out, c.blob) !== undefined) throw new ScreenRecordError('the rebuilt file differs');
  };
  tamper(() => undefined);
  const moved = /the rebuilt file differs/;
  const at = (code: number): number => TOUCH_STATUS_SCREENS.indexOf(`Status ${code}`);
  const numbers = (spec: Spec, code: number): number[] => (spec.screens[at(code)] as { numbers: number[] }).numbers;
  // A screen's numbers in walk order: the timer its enter handler starts first, then the one its leave cancels,
  // then the header handler's list. The list moved one on is the chrome's list of the same screen, which the
  // builder refuses to build two ways before any byte is compared.
  assert.throws(() => tamper((spec) => { numbers(spec, 0)[0]! += 1; }), moved);
  assert.throws(() => tamper((spec) => { numbers(spec, 0)[2]! += 1; }), /list 179 is built two ways/);
  // The fonts the other way round: the title font holds only the glyphs the titles draw, so the speller refuses
  // the first line's capital before anything is laid out, as section 411 found for a year's digits.
  assert.throws(() => tamper((spec) => { [spec.fonts.title, spec.fonts.body] = [spec.fonts.body, spec.fonts.title]; }),
    /font 2 has no glyph for 'G'/);
  // Without its home, "USB Connected" is drawn inline on code 28's screen, and the file is eleven bytes longer.
  assert.throws(() => tamper((spec) => { spec.homes.clear(); }), moved);
  // Codes 5 and 6 the other way round: each screen's title and lines land in the other's mode.
  assert.throws(() => tamper((spec) => {
    const [five, six] = [spec.screens[at(5)], spec.screens[at(6)]] as { mode: number }[];
    [five!.mode, six!.mode] = [six!.mode, five!.mode];
  }), moved);
});

test('todo-compile-one 4.5: the event map names status code k at mode 10 + k for all thirty codes on all nineteen compiles, so the 29 are found by the event map alone',
     skipUnless(...SKIN_54, ...EUROPEAN, DUTCH), () => {
  for (const name of [...SKIN_54, ...EUROPEAN, DUTCH]) {
    const c = parse(require_(name));
    const map = eventMap(c);
    assert.deepEqual([...(map?.entries ?? [])].sort(([a], [b]) => a - b), STATUS_LINES.map((_, code) => [code, 10 + code]), name);
    assert.equal(map?.fallback, 10, name);
    assert.deepEqual(touchStatusScreenModes(c), STATUS_LINES.map((_, code) => 10 + code).filter((mode) => mode !== 10 + DISPLAY_TEST_CODE), name);
  }
});

test('todo-compile-one 4.5: the 58 lists built are named by nothing outside the 29 screens and call no list, on the sixteen and both European compiles; one text outside is drawn by reference into the screens, the European everyday One\'s "Clear"',
     skipUnless(...SKIN_54, ...EUROPEAN), () => {
  for (const name of [...SKIN_54, ...EUROPEAN]) {
    const c = parse(require_(name));
    const d = describeTouchStatusScreens(c, takeApart(c));
    const built = new Set(buildTouchStatusScreens(c, d.spec).lists.keys());
    assert.deepEqual(listsBelow(c, new Set(touchStatusScreenModes(c)), built), { namedFromOutside: [], below: 0, shared: 0, sharedBelow: 0 }, name);
  }
  // Texts drawn by reference from a program outside the 29 into one of theirs: none on the sixteen and the
  // factory file, one on the everyday One's, which `withModeRecords` points at the built copy.
  const crossing = [...SKIN_54, ...EUROPEAN].map((name) => {
    const c = parse(require_(name));
    const map = characterMap(c);
    const records = modeRecords(c) ?? [];
    const ours = reachablePrograms(c, touchStatusScreenModes(c).flatMap((mode) => (records[mode]?.pages ?? []).map((page) => page.program)));
    const extents = [...ours.values()].map((program) => {
      const last = program[program.length - 1] as { start: number; length: number };
      return [(program[0] as { start: number }).start, last.start + last.length] as const;
    });
    const words: string[] = [];
    for (const [address, program] of reachablePrograms(c)) {
      if (ours.has(address)) continue;
      for (const one of program) {
        if (one.opcode !== SCREEN_TEXT_AT) continue;
        const to = c.blobOffsetOf((one.operands[2] as number) | ((one.operands[3] as number) << 8) | ((one.operands[4] as number) << 16)) as number;
        if (extents.some(([from, end]) => to >= from && to < end)) words.push(decode(textGlyphs(c, one) as Uint8Array, map!));
      }
    }
    return words.length === 0 ? [] : [`${name}: ${words.join(', ')}`];
  }).flat();
  assert.deepEqual(crossing, ['one_config: Clear']);
});
