/**
 * Every text of an arch 14 configuration generated from its word and its font, `todo-compile-650.md` 8.1,
 * section 358, measured against Logitech's own compiles.
 *
 * **The measurement is section 356's round trip over the whole configuration**: `takeApart` cuts each
 * compile into pieces, `describeScreenTexts` reads each text's word and font and finds what it is on its
 * screen, `buildScreenTexts` spells it, places it by its screen kind's rule and decides whether it is drawn
 * inline or by reference, `withScreenTexts` rewrites every text instruction in its program piece, and
 * `layOutContainer` lays the container out again. Byte equality says the rules produced every place, every
 * form and every reference address the compile holds.
 *
 * **The blind control makes that a test, of a narrower claim**: given the roles read off the real places,
 * the rules regenerate every place, form and address. Every byte of the texts the description does not read,
 * every opcode, terminator and reference address and the places that do not decide a role, is overwritten
 * with `0xEE` in the bytes the reader is handed; every byte of the texts in the layout's pieces; and every
 * text's place in the container the description finds its way through, which still holds the opcodes, codes
 * and addresses that find the texts, and is named as the second input. What the description reads is each
 * text's glyph codes, which is where its word comes from, the places that find a built text's role, and a
 * left out text's place.
 *
 * **The failing controls** are edits of a compile that `checkScreenTexts` refuses.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { require_, skipUnless } from '@harmony/lab';
import {
  type Container,
  type ContainerPiece,
  ScreenTextError,
  activityEntriesByName,
  buildFirmwareScreens,
  buildScreenRecords,
  buildScreenTexts,
  characterMap,
  checkScreenTexts,
  compareViews,
  decode,
  describeFirmwareScreens,
  describeScreenRecords,
  describeScreenTexts,
  describeWiring,
  glyphsReferencedBy,
  inActivityOrder,
  layOutContainer,
  modeRecords,
  parse,
  reachablePrograms,
  referencedStringAddress,
  restamped,
  screenProgram,
  screenRecordModes,
  setupView,
  takeApart,
  withFirmwareScreens,
  withScreenRecords,
  withScreenTexts,
  SCREEN_TEXT_AT,
  SCREEN_TEXT_INLINE,
} from '../src/index.ts';

/** The thirteen arch 14 compiles section 312 names. */
const THIRTEEN = ['h650_config_region', 'h650_panasonic_config', 'h600_config', 'calibration_h600',
  'h700_config', 'h700_config_2', 'h700_28_config_region',
  'h650_power_hold_compile', 'h650_power_hold_compile_2', 'h700_power_hold_compile',
  'h700_power_hold_compile_2', 'h700_power_hold_compile_3', 'h700_power_hold_compile_4'] as const;
/** Logitech's later compiles of the test record's Harmony 650. */
const LATER_650 = ['h650_start_config', 'h650_options_config', 'h650_sequence_config', 'h650_favourites_config',
  'h650_assistant_off_config', 'h650_tilt_off_config', 'h650_test_config', 'h650_test_config_clean'] as const;
/** Sections 356's and 357's 22: those, and another owner's Harmony 650, issue 36. */
const ALL = [...THIRTEEN, ...LATER_650, 'h650_issue36_config'] as const;

const containerOf = (name: string): Container => parse(require_(name));

function firstDifference(a: Uint8Array, b: Uint8Array): number | undefined {
  const length = Math.min(a.length, b.length);
  for (let i = 0; i < length; i += 1) if (a[i] !== b[i]) return i;
  return a.length === b.length ? undefined : length;
}

/** Describe, build, put back and lay out. */
function rebuilt(c: Container): Uint8Array {
  const layout = takeApart(c);
  const d = describeScreenTexts(c, layout);
  return layOutContainer(withScreenTexts(layout, buildScreenTexts(d.spec, c), d.place)).bytes;
}

const add = (counts: Map<string, number>, key: string, n = 1): void => {
  counts.set(key, (counts.get(key) ?? 0) + n);
};

/**
 * What a person sees on the screens built here, every text as its kind, its word and its place, counted.
 * `compareViews` reads the setup's own screens and not the start up screens, so this is the comparison that
 * sees a start up title's line break.
 */
function seenTexts(c: Container): Map<string, number> {
  const d = describeScreenTexts(c, takeApart(c));
  const map = characterMap(c);
  const seen = new Map<string, number>();
  d.spec.texts.forEach((one, k) => {
    if (one.kind === 'left out') return;
    for (const at of d.draws[k] ?? []) {
      const ins = screenProgram(c, c.flashBase + at)?.[0];
      if (ins === undefined || map === undefined) throw new Error('no text');
      const glyphs = ins.opcode === SCREEN_TEXT_INLINE ? ins.glyphs : glyphsReferencedBy(c, ins);
      add(seen, `${one.kind} | ${decode(glyphs as Uint8Array, map)} | ${ins.operands[0]},${ins.operands[1]}`);
    }
  });
  return seen;
}

/** The keys two counts disagree on, each as `a against b`. */
function seenDifferences(a: Map<string, number>, b: Map<string, number>): string[] {
  return [...new Set([...a.keys(), ...b.keys()])].filter((key) => a.get(key) !== b.get(key))
    .map((key) => `${a.get(key) ?? 0} against ${b.get(key) ?? 0}: ${key}`).sort();
}

test('on the 22 Harmony 600, 650 and 700 compiles every text on a screen built here is spelled from its word and placed by its screen\'s rule, every text\'s form follows the first copy, and the texts left out keep their codes and places, byte for byte',
     skipUnless(...ALL), () => {
  const perModel = new Map<string, number>();
  const perKind = new Map<string, number>();
  const perRole = new Map<string, number>();
  const forms = new Map<string, number>();
  let unresolved = 0;
  for (const name of ALL) {
    const c = containerOf(name);
    const layout = takeApart(c);
    const model = describeWiring(layout).model;
    const d = describeScreenTexts(c, layout);
    const built = buildScreenTexts(d.spec, c);
    const out = layOutContainer(withScreenTexts(layout, built, d.place)).bytes;
    assert.equal(firstDifference(out, c.blob), undefined, `${name} differs`);
    add(perModel, `${model} compiles`);
    unresolved += d.unresolved.size;
    // Counted per draw, a text instruction, except the roles, which count a two line title once.
    d.spec.texts.forEach((one, k) => {
      const left = one.kind === 'left out';
      const [from, to] = built.spans[k] as [number, number];
      add(perModel, `${model} ${left ? 'left out' : 'built'}`, to - from);
      add(perKind, left ? `left out: ${one.leftOut}` : one.kind, to - from);
      if (!left) add(perRole, one.role.role);
      for (let n = from; n < to; n += 1) add(forms, `${left ? 'left out' : 'built'} ${built.draws[n]?.home === undefined ? 'inline' : 'by reference'}`);
    });
  }
  assert.deepEqual(Object.fromEntries(perModel), {
    'harmony-600 compiles': 2, 'harmony-600 built': 693, 'harmony-600 left out': 2804,
    'harmony-650 compiles': 13, 'harmony-650 built': 9943, 'harmony-650 left out': 27290,
    'harmony-700 compiles': 7, 'harmony-700 built': 5434, 'harmony-700 left out': 14206,
  });
  // The texts on the screens built here, by kind and by what they are there.
  assert.deepEqual(Object.fromEntries([...perKind].filter(([key]) => !key.startsWith('left out'))), {
    'firmware': 542, 'fixed line': 403, 'corner page': 14325, 'two row list': 528, 'activity menu': 272,
  });
  assert.deepEqual(Object.fromEntries(perRole), {
    title: 1498, counter: 4218, corner: 7690, row: 221, bottom: 1564, heading: 100, fixed: 300, template: 476,
  });
  // The texts left as read, by the screen they are on.
  assert.deepEqual(Object.fromEntries([...perKind].filter(([key]) => key.startsWith('left out'))), {
    'left out: status screen': 1254, 'left out: help': 31496, 'left out: tour': 1166, 'left out: no page': 10384,
  });
  assert.deepEqual(Object.fromEntries(forms), {
    'built inline': 5183, 'built by reference': 10887, 'left out inline': 17122, 'left out by reference': 27178,
  });
  // On built screens, texts with a code the character map does not resolve keep their codes, 8.2's.
  assert.equal(unresolved, 74);
});

/**
 * Every Logitech compile of a Harmony 600, 650 or 700 in the lab: the 22, the French one, and a compile with
 * two devices and no activities, which the pass refuses at its menus as section 356 refuses it, and until
 * section 360 refused for its wiring.
 */
const FORM_RULE = [...ALL, 'h650_issue8_config', 'harvest_650_two_devices'] as const;

test('the first text to draw a run of glyph codes draws it inline and every later one points at that copy, on all 63992 text draws of the 24 Harmony 600, 650 and 700 compiles in the lab',
     skipUnless(...FORM_RULE), () => {
  let draws = 0;
  for (const name of FORM_RULE) {
    const c = containerOf(name);
    const found: { at: number; inline: boolean; key: string; target?: number }[] = [];
    const seen = new Set<number>();
    for (const [, program] of reachablePrograms(c)) {
      for (const one of program) {
        if ((one.opcode !== SCREEN_TEXT_INLINE && one.opcode !== SCREEN_TEXT_AT) || seen.has(one.start)) continue;
        seen.add(one.start);
        if (one.opcode === SCREEN_TEXT_INLINE) {
          found.push({ at: one.start, inline: true, key: [...(one.glyphs ?? [])].join(',') });
          continue;
        }
        const target = c.blobOffsetOf(referencedStringAddress(one) as number) as number;
        const run: number[] = [];
        for (let k = target; c.blob[k] !== 0; k += 1) run.push(c.blob[k] as number);
        found.push({ at: one.start, inline: false, key: run.join(','), target });
      }
    }
    found.sort((a, b) => a.at - b.at);
    const first = new Map<string, number>();
    for (const one of found) {
      const home = first.get(one.key);
      if (home === undefined) {
        assert.ok(one.inline, `${name}: the first copy at ${one.at} is drawn by reference`);
        first.set(one.key, one.at);
      } else {
        assert.ok(!one.inline, `${name}: ${one.at} is drawn inline after the copy at ${home}`);
        assert.equal(one.target, home + 3, `${name}: ${one.at} points elsewhere than the first copy`);
      }
    }
    draws += found.length;
  }
  assert.equal(draws, 63992);
});

test('a French Harmony 650 is refused at its first firmware screen, whose words break into other lines than the template\'s',
     skipUnless('h650_issue8_config'), () => {
  assert.throws(() => rebuilt(containerOf('h650_issue8_config')),
    (error: Error) => error instanceof ScreenTextError && /addActivityHere, draws 6 texts where its template has 5/.test(error.message));
});

test('with every text\'s place blinded in the container the description finds its way through, and every byte of the texts it does not read blinded in what it reads and in the layout, all 22 rebuild: given the roles read off the real places, the rules regenerate every place, form and address',
     skipUnless(...ALL), () => {
  let structure = 0;
  let read = 0;
  let placesRead = 0;
  let blindedCount = 0;
  let changed = 0;
  let unchangedInAddresses = 0;
  for (const name of ALL) {
    const c = containerOf(name);
    const first = describeScreenTexts(c, takeApart(c));
    // Where each reference's address field is, so a byte already 0xEE can be accounted for.
    const addressBytes = new Set<number>();
    for (const at of first.draws.flat()) {
      if (c.blob[at] === SCREEN_TEXT_AT) for (let k = 3; k < 6; k += 1) addressBytes.add(at + k);
    }
    // The container the description navigates: every text's place blinded, built or left out. What it still
    // holds of the texts is where they are and what they draw, the opcodes, codes, terminators and reference
    // addresses, which find each text and its copy; its fonts and character map are read off it too.
    const places = new Set<number>(first.draws.flat().flatMap((at) => [at + 1, at + 2]));
    const navigated = c.blob.slice();
    for (const at of places) navigated[at] = 0xee;
    // What the description reads: every byte of the texts it does not read blinded.
    const blinded = c.blob.slice();
    for (const at of first.structure) {
      if (first.described.has(at)) continue;
      blindedCount += 1;
      if (blinded[at] !== 0xee) changed += 1;
      else if (addressBytes.has(at)) unchangedInAddresses += 1;
      blinded[at] = 0xee;
    }
    const nav = parse(navigated);
    const layout = takeApart(nav);
    const laid = layOutContainer(layout);
    const pieces = [layout.keyTable, ...layout.body,
      ...layout.sections.flatMap((s) => (s === undefined ? [] : [...s.before, ...s.head])), ...layout.pictures];
    const starts = pieces.map((piece) => ({ piece, at: laid.offsetOf(piece) as number })).sort((a, b) => a.at - b.at);
    // The layout's pieces blinded over every byte of the texts, read or not, so nothing kept from them can
    // carry a byte.
    let k = 0;
    for (const at of [...first.structure].sort((a, b) => a - b)) {
      while (k + 1 < starts.length && (starts[k + 1] as (typeof starts)[number]).at <= at) k += 1;
      const one = starts[k] as { piece: ContainerPiece; at: number };
      one.piece.bytes[at - one.at] = 0xee;
    }
    const d = describeScreenTexts(nav, layout, (at) => blinded[at] as number);
    assert.deepEqual([...d.described].sort((a, b) => a - b), [...first.described].sort((a, b) => a - b), `${name}: reads`);
    const out = layOutContainer(withScreenTexts(layout, buildScreenTexts(d.spec, nav), d.place)).bytes;
    assert.equal(firstDifference(out, c.blob), undefined, `${name} differs`);
    structure += first.structure.size;
    read += first.described.size;
    placesRead += [...first.described].filter((at) => places.has(at)).length;
    assert.ok([...first.described].every((at) => first.structure.has(at)), `${name}: a read outside the texts`);
  }
  assert.equal(structure, 569012);
  // Read: every text's codes, a left out text's place, 44300 draws and 88600 bytes, and of a built text's place
  // what finds its role, 23218 bytes; the build places it again from the role alone.
  assert.equal(read, 363220);
  assert.equal(placesRead, 88600 + 23218);
  assert.equal(blindedCount, 205792);
  // All but these were something else first, and those are bytes of reference address fields, which the frame
  // writes whatever a piece holds there.
  assert.equal(changed, 205281);
  assert.equal(unchangedInAddresses, blindedCount - changed);
});

test('checkScreenTexts passes Logitech\'s clean compile and refuses a corner label, a counter\'s slash, a firmware screen\'s line and a bottom word each moved a pixel, and a title pointed one code into its copy',
     skipUnless('h650_test_config_clean'), () => {
  const c = containerOf('h650_test_config_clean');
  assert.deepEqual(checkScreenTexts(c), { texts: 3029, bytes: 27824 });
  const d = describeScreenTexts(c, takeApart(c));
  const find = (what: string, test: (k: number) => boolean): number => {
    const k = d.spec.texts.findIndex((_, i) => test(i));
    if (k < 0) throw new Error(`no ${what}`);
    return d.draws[k]?.[0] as number;
  };
  const role = (k: number): string => d.spec.texts[k]?.role.role ?? '';
  const edited = (edit: (bytes: Uint8Array) => void): Container => {
    const bytes = c.blob.slice();
    edit(bytes);
    return parse(restamped(bytes));
  };
  const refused = (pattern: RegExp) => (error: Error) => error instanceof ScreenTextError && pattern.test(error.message);
  const nudge = (at: number, by: number) => edited((bytes) => { bytes[at] = (bytes[at] as number) + by; });
  // A right hand corner label a pixel to the right: its x is the byte after the opcode.
  const right = find('a right corner label', (k) => d.spec.texts[k]?.role.role === 'corner'
    && (d.spec.texts[k]?.role as { item: number }).item === 1);
  assert.throws(() => checkScreenTexts(nudge(right + 1, 1)), refused(/'s corner '.*' is drawn at/));
  // The page counter's slash a pixel to the left.
  const slash = find('a counter slash', (k) => role(k) === 'counter' && d.spec.texts[k]?.word === '/');
  assert.throws(() => checkScreenTexts(nudge(slash + 1, -1)), refused(/'s counter '\/' is drawn at/));
  // "Update Successful" a pixel lower: its y is the second byte after the opcode.
  const update = find('Update Successful', (k) => d.spec.texts[k]?.word === 'Update Successful');
  assert.throws(() => checkScreenTexts(nudge(update + 2, 1)), refused(/'s template 'Update Successful' is drawn at/));
  // A bottom word a pixel higher.
  const bottom = find('a bottom word', (k) => role(k) === 'bottom' && d.spec.texts[k]?.kind === 'corner page');
  assert.throws(() => checkScreenTexts(nudge(bottom + 2, -1)), refused(/'s bottom '.*' is drawn at/));
  // A reference pointed one code into its copy: it draws a run no earlier text draws, so the rule makes it
  // the first copy of that run, drawn inline.
  const pointer = find('a title by reference', (k) => role(k) === 'title' && c.blob[d.draws[k]?.[0] as number] === SCREEN_TEXT_AT
    && (d.spec.texts[k]?.word.length ?? 0) > 3);
  assert.throws(() => checkScreenTexts(nudge(pointer + 3, 1)), refused(/'s title '.*' is drawn by reference where it is built inline/));
});

test('a configuration whose firmware wiring or menus are not read is refused as one, not with a reader\'s own error: the bench file of todo-compile-650 4.2 at its wiring, and the compile with no activities at its menus',
     skipUnless('harvest_650_two_devices', 'h650_bench_4_2_base'), () => {
  // The compile with no activities was refused at its wiring here until section 360 read it; it has no
  // activity menu, which is where section 356 refuses it too.
  assert.throws(() => checkScreenTexts(containerOf('harvest_650_two_devices')),
    (error: Error) => error instanceof ScreenTextError && /menus are not read: the activity menu does not map the key under Devices/.test(error.message));
  assert.throws(() => checkScreenTexts(containerOf('h650_bench_4_2_base')),
    (error: Error) => error instanceof ScreenTextError && /wiring is not read: read at offset 7/.test(error.message));
});

test('checkScreenTexts refuses the test setup as todo-compile-650 6.2.13 composed it: a page counter drawn by reference before any copy of it is drawn inline',
     skipUnless('h650_7_1_base'), () => {
  assert.throws(() => checkScreenTexts(containerOf('h650_7_1_base')),
    (error: Error) => error instanceof ScreenTextError && /'s counter '3' is drawn by reference where it is built inline/.test(error.message));
});

/** The texts of the 7.5 file whose bytes the pass changes in length, in address order, as kind, role, word, lengths. */
const CHANGED_LENGTHS = [
  'corner page counter \'3\': 5 to 6',
  'fixed line heading \'Starting Plasma kijken\': 29 to 26',
  'corner page title \'Plasma kijken\': 17 to 6',
  'corner page corner \'Teletext\': 12 to 6',
  'corner page corner \'DVR\': 7 to 6',
  'corner page corner \'Aspect\': 10 to 6',
];

/** The 7.5 file, as `make.ts` in the lab's `work/bench-7-5/` composes it: section 356's records, then 357's screens. */
function composedSevenFive(): { composed: Container; seven: Container } {
  const composed = containerOf('h650_7_1_base');
  const setup = JSON.parse(readFileSync(new URL('../../corpus/setups/h650-test.json', import.meta.url), 'utf8')) as
    { activities: { name: string }[] };
  const names = setup.activities.map((one) => one.name);
  const layout = takeApart(composed);
  const records = describeScreenRecords(composed, layout);
  const spec = inActivityOrder(records.spec, activityEntriesByName(composed, names));
  const step = parse(layOutContainer(withScreenRecords(layout, buildScreenRecords(spec, composed), records.place)).bytes);
  const layout2 = takeApart(step);
  const fw = describeFirmwareScreens(step, layout2);
  const seven = parse(layOutContainer(withFirmwareScreens(layout2, buildFirmwareScreens(fw.spec, step), fw.place)).bytes);
  return { composed, seven };
}

test('the premise on the 7.5 file: 718 of the 811 texts drawn on screens built here were Logitech\'s bytes and 2146 more are on screens left out; where composing put a copy in front of them, five were drawn in another form than the rule gives and five pointed at another copy, and one title was broken where Logitech does not break it',
     skipUnless('h650_7_1_base', 'h650_test_config_clean', 'h650_start_config'), () => {
  const { seven } = composedSevenFive();
  const layout = takeApart(seven);
  const three = new Map(Object.entries(screenRecordModes(seven, layout)).map(([kind, mode]) => [mode, kind]));
  const startModes = (modeRecords(containerOf('h650_start_config')) ?? []).length;
  const d = describeScreenTexts(seven, layout);
  const built = buildScreenTexts(d.spec, seven);
  const who = new Map<string, number>();
  const left = new Map<string, number>();
  const differs: string[] = [];
  // Where each built draw's original sat, for a text drawn in as many lines as it is built in.
  const original = new Map<number, number>();
  d.draws.forEach((offsets, k) => {
    const [from, to] = built.spans[k] as [number, number];
    if (to - from === offsets.length) offsets.forEach((offset, n) => original.set(from + n, offset));
  });
  d.spec.texts.forEach((one, k) => {
    if (one.kind === 'left out') {
      add(left, one.leftOut as string, (d.draws[k] as number[]).length);
      return;
    }
    const mode = Number(/^mode (\d+)/.exec(one.where)?.[1]);
    const label = one.kind === 'firmware' ? 'firmware screen, section 357'
      : three.has(mode) ? `${three.get(mode)}, section 356${one.role.role === 'row' || one.role.role === 'corner' ? ', a label read as glyph codes' : ''}`
        : mode >= startModes ? 'composed' : 'Logitech\'s bytes';
    const offsets = d.draws[k] as number[];
    add(who, label, offsets.length);
    const [from, to] = built.spans[k] as [number, number];
    if (to - from !== offsets.length) {
      differs.push(`${label}: ${one.word} in ${offsets.length} lines`);
      return;
    }
    offsets.forEach((at, n) => {
      const ins = screenProgram(seven, seven.flashBase + at)?.[0];
      const b = built.draws[from + n];
      if (ins === undefined || b === undefined) throw new Error('no text');
      const inline = ins.opcode === SCREEN_TEXT_INLINE;
      const target = inline ? undefined : seven.blobOffsetOf(referencedStringAddress(ins) as number);
      const home = b.home === undefined ? undefined : (original.get(b.home) as number) + 3;
      if (inline !== (b.home === undefined)) differs.push(`${label}: ${one.word} ${inline ? 'inline' : 'by reference'}`);
      else if (!inline && target !== home) differs.push(`${label}: ${one.word} pointed at a later copy`);
      assert.equal(`${ins.operands[0]},${ins.operands[1]}`, `${b.x},${b.y}`, `${one.where} ${one.word}`);
    });
  });
  assert.equal(startModes, 377);
  assert.deepEqual(Object.fromEntries(who), {
    'firmware screen, section 357': 24,
    'idle device list, section 356': 10, 'idle device list, section 356, a label read as glyph codes': 7,
    'activity menu, section 356': 15, 'activity menu, section 356, a label read as glyph codes': 5,
    'off, section 356': 4,
    'composed': 28,
    'Logitech\'s bytes': 718,
  });
  // The texts on screens left out, by the screen: 2146 in all.
  assert.deepEqual(Object.fromEntries(left), { help: 1564, 'no page': 472, 'status screen': 57, tour: 53 });
  // Every place already followed the rules. Composing put an earlier copy of the same codes in front of ten
  // texts: five are in another form, the device page's "3", which the activity menu's "3" now precedes, and
  // four texts Plasma kijken's working screen draws inline that the activity menu or a device page drew
  // first; and five are references in the right form pointing at a later copy, the device page's "3". And the
  // composer broke Plasma kijken's start up title, 126 pixels, at 123, where Logitech draws it on one line.
  assert.deepEqual(differs, [
    'Logitech\'s bytes: 3 inline',
    'Logitech\'s bytes: 3 pointed at a later copy',
    'Logitech\'s bytes: 3 pointed at a later copy',
    'Logitech\'s bytes: 3 pointed at a later copy',
    'Logitech\'s bytes: 3 pointed at a later copy',
    'Logitech\'s bytes: 3 pointed at a later copy',
    'composed: Starting Plasma kijken in 2 lines',
    'composed: Plasma kijken inline',
    'composed: Teletext inline',
    'composed: DVR inline',
    'composed: Aspect inline',
  ]);
  // The 2 texts whose codes the character map leaves unresolved, on the Denon's pages: the first letter of
  // "JazzClub" and one character of "DTSNEO:X".
  assert.equal(d.unresolved.size, 2);
});

test('the 7.5 file with every text generated shows a person nothing Logitech\'s clean compile does not but the menu\'s order, text by text on every screen built here, and is 24 bytes shorter: five texts drawn by reference instead of inline, and one title on one line instead of two',
     skipUnless('h650_7_1_base', 'h650_test_config_clean'), () => {
  const { seven } = composedSevenFive();
  const clean = containerOf('h650_test_config_clean');
  const out = parse(rebuilt(seven));
  assert.ok(out.allChecksPass);
  assert.deepEqual(checkScreenTexts(out).texts, 2956);
  assert.deepEqual(compareViews(setupView(out), setupView(clean), { menuOrder: false }), []);
  assert.deepEqual(compareViews(setupView(out), setupView(clean)).map((one) => `${one.kind}: ${one.key}`), [
    'label: activity menu | page 1 | cell 0',
    'label: activity menu | page 1 | cell 2',
    'label: activity menu | page 2 | cell 2',
    'label: activity menu | page 3 | cell 0',
  ]);
  // Text by text on every screen built here, the start up screens included: the four menu labels in their
  // other cells, and nothing else. The 7.5 file as composed also showed Plasma kijken's start up title in two
  // lines where the clean compile has one.
  const menu = [
    '0 against 1: activity menu | Film kijken | 26,35', '0 against 1: activity menu | Kodi kijken | 24,35',
    '0 against 1: activity menu | Plasma kijken | 16,79', '0 against 1: activity menu | TV kijken | 31,79',
    '1 against 0: activity menu | Film kijken | 26,79', '1 against 0: activity menu | Kodi kijken | 24,79',
    '1 against 0: activity menu | Plasma kijken | 16,35', '1 against 0: activity menu | TV kijken | 31,35',
  ];
  assert.deepEqual(seenDifferences(seenTexts(out), seenTexts(clean)), menu);
  assert.deepEqual(seenDifferences(seenTexts(seven), seenTexts(clean)), [
    ...menu.slice(0, 5),
    '0 against 1: fixed line | Starting Plasma kijken | 1,5',
    ...menu.slice(5),
    '1 against 0: fixed line | Starting Plasma | 19,5', '1 against 0: fixed line | kijken | 47,19',
  ].sort());
  // Every text whose bytes changed length, as its words and its lengths before and after. A text inline is
  // four bytes and its codes, by reference six: the device page's "3" gains one, "Plasma kijken" loses 11,
  // "Teletext" 6, "DVR" 1 and "Aspect" 4. The five references moved to the first copy change no length. And
  // Plasma kijken's start up title, "Starting Plasma" over "kijken", both inline, 19 and 10 bytes, is
  // "Starting Plasma kijken" on one line, 26, which is how Logitech's compile draws it.
  const before = describeScreenTexts(seven, takeApart(seven));
  const after = describeScreenTexts(out, takeApart(out));
  assert.equal(after.spec.texts.length, before.spec.texts.length);
  const lengths: string[] = [];
  let total = 0;
  before.spec.texts.forEach((one, k) => {
    const [a, b] = [before.place.texts[k]?.length as number, after.place.texts[k]?.length as number];
    assert.equal(after.spec.texts[k]?.word, one.word);
    if (a !== b) lengths.push(`${one.kind} ${one.role.role} '${one.word}': ${a} to ${b}`);
    total += b - a;
  });
  assert.deepEqual(lengths, CHANGED_LENGTHS);
  assert.equal(total, -24);
  assert.equal(out.blob.length - seven.blob.length, total);
  // And the pass is idempotent: run again, it changes nothing.
  assert.equal(firstDifference(rebuilt(out), out.blob), undefined);
});
