/**
 * The Harmony 650's pictures, `todo-compile-650.md` 9.1, section 363, measured against Logitech's own
 * compiles, and the encoder the rule pictures need, measured against every picture and glyph the corpus
 * holds.
 *
 * **Two claims, and the second rests on the first.** The encoder: a picture's bytes and a glyph's come back
 * byte for byte from their pixels by one greedy rule, on every one of the corpus's architectures that
 * stores them two bytes a pixel, which is what `CLAUDE.md`'s rail "a glyph and an encoded picture cannot be
 * re-encoded" said could not be done. The pictures: six of the nineteen a Harmony 650 compile holds are
 * drawn by rule, and built from that rule they equal Logitech's bytes wherever a compile holds them, the
 * round trip of all 22 compiles included.
 *
 * **The blind control** names each picture, then overwrites every byte of the six in the layout, and the
 * rebuild still equals each compile; its own control is that the overwritten layout, laid out without the
 * built pictures, does not. **The failing controls** are a stream the format admits and Logitech never
 * emits, a colour off by one, and the encoder's refusals.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { require_, skipUnless } from '@harmony/lab';
import {
  BITMAP_ENCODED,
  BITMAP_RAW,
  type Container,
  HARMONY_650_PICTURES,
  PictureError,
  type PictureEntry,
  bitmapPixels,
  bitmaps,
  buildPictures,
  checkPictures,
  contentKey,
  describePictures,
  encodeBitmap,
  encodeGlyph,
  glyphs,
  layOutContainer,
  namedContentEnd,
  parse,
  pictureBank,
  pictureRows,
  takeApart,
  withPictures,
} from '../src/index.ts';

/** Section 356's 22 Logitech compiles of the Harmony 600, 650 and 700. */
const COMPILES = ['h650_config_region', 'h650_panasonic_config', 'h600_config', 'calibration_h600',
  'h700_config', 'h700_config_2', 'h700_28_config_region',
  'h650_power_hold_compile', 'h650_power_hold_compile_2', 'h700_power_hold_compile',
  'h700_power_hold_compile_2', 'h700_power_hold_compile_3', 'h700_power_hold_compile_4',
  'h650_start_config', 'h650_options_config', 'h650_sequence_config', 'h650_favourites_config',
  'h650_assistant_off_config', 'h650_tilt_off_config', 'h650_test_config', 'h650_test_config_clean',
  'h650_issue36_config'] as const;
const H650 = COMPILES.filter((name) => name.startsWith('h650_'));
/** The nineteen containers the codec's corpus wide claims are made over, `edit.test.ts`'s `ALL_CONTAINERS`. */
const CORPUS = [
  'one_safemode', 'one34_region2', 'h700_gspm', 'h600_safemode_gspm', 'h650_safemode_gspm',
  'one_config', 'one_config_unprogrammed', 'h600_config', 'h700_config', 'h700_config_2',
  'h525_config', 'h525_config_2', 'arch8_config_a', 'arch8_config_b', 'arch8_config_c',
  'arch8_config_d', 'h525_safemode_ahcm', 'one_spare_before_sync', 'one_spare_after_sync',
] as const;
/** The two clean reads of arch 10 (Harmony 890 and 895), `arch10.test.ts`'s `ARCH10_CLEAN`. */
const ARCH10_CLEAN = ['h890_config', 'h895_config'] as const;
/** Every name the encoder is measured over, once each. */
const ENCODED = [...new Set<string>([...CORPUS, ...ARCH10_CLEAN, ...COMPILES])];
/** The architectures that store a picture's and a glyph's pixels two bytes each. Arch 9 packs them. */
const TWO_BYTE = new Set([8, 10, 12, 14]);

const containerOf = (name: string): Container => parse(require_(name));

function firstDifference(a: Uint8Array, b: Uint8Array): number | undefined {
  const length = Math.min(a.length, b.length);
  for (let i = 0; i < length; i += 1) if (a[i] !== b[i]) return i;
  return a.length === b.length ? undefined : length;
}

/** Every picture a container holds, the bank's and those outside it, with its stored bytes. */
function storedPictures(c: Container): { bytes: Uint8Array; rows: (number | undefined)[][] }[] {
  const bank = pictureBank(c, namedContentEnd(c)) ?? [];
  const inBank = new Set(bank.map((one) => one.address));
  return [...bank, ...bitmaps(c).filter((one) => !inBank.has(one.address))].flatMap((one) => {
    const off = c.blobOffsetOf(one.address);
    const rows = bitmapPixels(c, one);
    if (off === undefined || one.length === undefined || rows === undefined) return [];
    return [{ bytes: c.blob.subarray(off, off + one.length), rows }];
  });
}

test('every picture of the 32 containers on arch 8, 10, 12 and 14 that hold one comes back byte for byte from its own pixels, raw where every pixel is drawn and encoded where one is not',
     skipUnless(...ENCODED), () => {
  const seen = new Set<string>();
  const counts: Record<string, { raw: number; encoded: number }> = {};
  let measured = 0;
  let holding = 0;
  for (const name of ENCODED) {
    const c = containerOf(name);
    if (!TWO_BYTE.has(c.architecture ?? -1)) continue;
    measured += 1;
    const stored = storedPictures(c);
    if (stored.length > 0) holding += 1;
    for (const one of stored) {
      const key = `${c.architecture}:${contentKey(one.bytes)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      assert.equal(firstDifference(encodeBitmap(one.rows), one.bytes), undefined, `${name}: a picture differs`);
      const kind = one.bytes[0] === BITMAP_ENCODED ? 'encoded' : 'raw';
      assert.equal(kind === 'encoded', one.rows.some((line) => line.includes(undefined)), `${name}: the kind follows the pixels`);
      const row = counts[String(c.architecture)] ?? { raw: 0, encoded: 0 };
      row[kind] += 1;
      counts[String(c.architecture)] = row;
    }
  }
  // 40 names, three of them arch 9 (Harmony 525), whose one bit pictures this does not encode; five of the
  // 37 are safe mode containers holding glyphs and no picture.
  assert.deepEqual([ENCODED.length, measured, holding], [40, 37, 32]);
  // Distinct pictures per architecture, by their bytes.
  assert.deepEqual(counts, {
    8: { raw: 16, encoded: 20 }, 10: { raw: 14, encoded: 23 }, 12: { raw: 53, encoded: 25 }, 14: { raw: 48, encoded: 3 },
  });
});

test('every glyph of the 37 containers on arch 8, 10, 12 and 14 comes back byte for byte from its own rows by the same rule',
     skipUnless(...ENCODED), () => {
  const seen = new Set<string>();
  const counts: Record<string, number> = {};
  let holding = 0;
  let trailing = 0;
  for (const name of ENCODED) {
    const c = containerOf(name);
    if (!TWO_BYTE.has(c.architecture ?? -1)) continue;
    const sets = glyphs(c);
    if (sets !== undefined && sets.some((set) => set.some((glyph) => glyph !== undefined))) holding += 1;
    for (const set of sets ?? []) {
      for (const glyph of set) {
        if (glyph === undefined) continue;
        const off = c.blobOffsetOf(glyph.address) as number;
        const stored = c.blob.subarray(off, off + glyph.length);
        const key = `${c.architecture}:${contentKey(stored)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        assert.equal(firstDifference(encodeGlyph(glyph.width, glyph.rows), stored), undefined, `${name}: a glyph differs`);
        counts[String(c.architecture)] = (counts[String(c.architecture)] ?? 0) + 1;
        if (glyph.rows.some((line) => line[line.length - 1] === undefined)) trailing += 1;
      }
    }
  }
  assert.equal(holding, 37);
  assert.deepEqual(counts, { 8: 322, 10: 256, 12: 540, 14: 708 });
  // Every glyph has a row ending in a skip, so a stream leaving trailing skips out would differ on every one:
  // the rule's trailing skip is pinned by the glyphs as well as by the pictures.
  assert.equal(trailing, 1826);
});

test('a stream the format admits for the same pixels, each row\'s trailing skip left out, is not the one Logitech stores',
     skipUnless(...ENCODED), () => {
  // The firmware's row break starts the next row wherever the last one stopped, section 50, so a row's
  // trailing skip draws nothing and a stream without it draws the same pixels. Which of the two a picture
  // stores is the encoder's choice, and this is the check that the data can tell the two apart: given the
  // byte equality above, a picture with a trailing skip cannot also be stored without one.
  let trailing = 0;
  let differs = 0;
  const seen = new Set<string>();
  for (const name of ENCODED) {
    const c = containerOf(name);
    if (!TWO_BYTE.has(c.architecture ?? -1)) continue;
    for (const one of storedPictures(c)) {
      if (one.bytes[0] !== BITMAP_ENCODED) continue;
      const key = `${c.architecture}:${contentKey(one.bytes)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (!one.rows.some((line) => line[line.length - 1] === undefined)) continue;
      trailing += 1;
      const shorter = withoutTrailingSkips(one.bytes);
      if (firstDifference(shorter, one.bytes) !== undefined) differs += 1;
    }
  }
  // Every one of the 71 distinct encoded pictures has a row ending undrawn, so every one has the other stream.
  assert.equal(trailing, 71);
  assert.equal(differs, trailing);
});

/**
 * An encoded picture's stream with every row's trailing skip left out, walked control byte by control
 * byte. The other stream for the same pixels, kept here because only the control wants it.
 */
function withoutTrailingSkips(bytes: Uint8Array): Uint8Array {
  const out: number[] = [...bytes.subarray(0, 5)];
  let k = 5;
  while (k < bytes.length) {
    const control = bytes[k] as number;
    const literal = (control & 0x80) === 0 ? 2 * control : 0;
    const next = bytes[k + 1 + literal];
    const trailing = control !== 0x80 && (control & 0x80) !== 0 && (next === 0x80 || next === 0x00);
    if (!trailing) out.push(...bytes.subarray(k, k + 1 + literal));
    if (control === 0x00) break;
    k += 1 + literal;
  }
  return Uint8Array.from(out);
}

test('every picture of the 13 Harmony 650 compiles is one of the nineteen named, six of them drawn by rule',
     skipUnless(...H650), () => {
  const bySource = (source: PictureEntry['source']): number => HARMONY_650_PICTURES.filter((one) => one.source === source).length;
  assert.deepEqual([bySource('rule'), bySource('artwork'), bySource('left out')], [6, 11, 2]);
  assert.equal(new Set(HARMONY_650_PICTURES.map((one) => one.key)).size, 19);
  const held = new Map<string, number>();
  const sizes: number[] = [];
  for (const name of H650) {
    const described = describePictures(takeApart(containerOf(name)));
    assert.equal(described.filter((one) => one.entry === undefined).length, 0, `${name} holds a picture no entry names`);
    sizes.push(described.length);
    for (const one of described) held.set((one.entry as PictureEntry).name, (held.get((one.entry as PictureEntry).name) ?? 0) + 1);
  }
  assert.equal(H650.length, 13);
  assert.deepEqual(sizes.sort((a, b) => a - b), [...new Array(9).fill(18), ...new Array(4).fill(19)]);
  // A configuration holds a picture only where a program draws it, sections 146 and 330, so two of the
  // nineteen are not on every compile. Every other picture is in all thirteen.
  assert.equal(held.get('device page of one item'), 5);
  assert.equal(held.get('activity menu of one'), 12);
  for (const entry of HARMONY_650_PICTURES) {
    if (entry.name === 'device page of one item' || entry.name === 'activity menu of one') continue;
    assert.equal(held.get(entry.name), 13, entry.name);
  }
});

test('the six rule pictures are Logitech\'s bytes wherever a compile of the Harmony 600, 650 or 700 holds them',
     skipUnless(...COMPILES), () => {
  const built = buildPictures();
  assert.deepEqual([...built.keys()], HARMONY_650_PICTURES.filter((one) => one.source === 'rule').map((one) => one.name));
  const perModel = new Map<string, Map<string, number>>();
  for (const name of COMPILES) {
    const model = name.startsWith('h650_') ? '650' : name.includes('700') ? '700' : '600';
    for (const one of describePictures(takeApart(containerOf(name)))) {
      if (one.entry?.source !== 'rule') continue;
      assert.equal(firstDifference(built.get(one.entry.name) as Uint8Array, one.piece.bytes), undefined, `${name}: ${one.entry.name}`);
      const row = perModel.get(model) ?? new Map<string, number>();
      row.set(one.entry.name, (row.get(one.entry.name) ?? 0) + 1);
      perModel.set(model, row);
    }
  }
  const of = (model: string): Record<string, number> => Object.fromEntries(perModel.get(model) ?? []);
  const all = (n: number): Record<string, number> => Object.fromEntries([...built.keys()].map((one) => [one, n]));
  assert.deepEqual(of('650'), all(13));
  // Seven Harmony 700 compiles: the five of 2026 share the 650's look, the two of 2021 and 2023 the top bar
  // and the red patch alone. Two Harmony 600 compiles, one of them of 2026, so the 600's look is the model's
  // and not the year's: the top bar alone. Each of the six has one content on every compile holding it, so
  // these counts are copies of one picture each; the independent evidence is the encoder above.
  assert.deepEqual(of('700'), { ...all(5), 'top bar': 7, 'corner patch, red': 7 });
  assert.deepEqual(of('600'), { 'top bar': 2 });
  // The six are 41066 bytes of a Harmony 650 compile's bank.
  assert.equal([...built.values()].reduce((sum, bytes) => sum + bytes.length, 0), 41066);
});

test('all 22 compiles of the Harmony 600, 650 and 700 rebuild byte for byte with their rule pictures built',
     skipUnless(...COMPILES), () => {
  const builtPer: Record<string, number> = {};
  for (const name of COMPILES) {
    const result = checkPictures(containerOf(name));
    builtPer[result.built.length] = (builtPer[result.built.length] ?? 0) + 1;
  }
  // 13 Harmony 650 and 5 Harmony 700 compiles with all six, two older 700s with two, two 600s with one.
  assert.deepEqual(builtPer, { 6: 18, 2: 2, 1: 2 });
});

test('with every byte of the rule pictures overwritten in the layout once they are named, all 22 still rebuild byte for byte',
     skipUnless(...COMPILES), () => {
  let blinded = 0;
  for (const name of COMPILES) {
    const c = containerOf(name);
    const layout = takeApart(c);
    const described = describePictures(layout);
    for (const one of described) {
      if (one.entry?.source !== 'rule') continue;
      one.piece.bytes = new Uint8Array(one.piece.bytes.length).fill(0xee);
      blinded += one.piece.bytes.length;
    }
    // The blinding bites: laid out as it is, the overwritten layout is not the compile.
    assert.notEqual(firstDifference(layOutContainer(layout).bytes, c.blob), undefined, `${name}: the blind control does not bite`);
    assert.equal(firstDifference(layOutContainer(withPictures(layout, described)).bytes, c.blob), undefined, `${name} differs`);
  }
  assert.equal(blinded, 18 * 41066 + 2 * (4101 + 245) + 2 * 4101);
});

test('the crossed device page differs from the one item page in 98 pixels off column 64 and row 63',
     skipUnless('h650_config_region'), () => {
  const c = containerOf('h650_config_region');
  const rowsOf = (name: string): (number | undefined)[][] => {
    const bank = pictureBank(c, namedContentEnd(c)) ?? [];
    const key = HARMONY_650_PICTURES.find((one) => one.name === name)?.key;
    const found = bank.find((one) => {
      const off = c.blobOffsetOf(one.address) as number;
      return contentKey(c.blob.subarray(off, off + (one.length as number))) === key;
    });
    return bitmapPixels(c, found as NonNullable<typeof found>) as (number | undefined)[][];
  };
  const crossed = rowsOf('device page crossed');
  const single = rowsOf('device page of one item');
  // The cross is column 64 and row 63; off them the two pictures should agree if the cross were laid over.
  let off = 0;
  let farthest = 0;
  let alongRow62 = 0;
  for (let y = 0; y < 128; y += 1) {
    for (let x = 0; x < 128; x += 1) {
      if (x === 64 || y === 63 || crossed[y]?.[x] === single[y]?.[x]) continue;
      off += 1;
      farthest = Math.max(farthest, Math.min(Math.abs(x - 64), Math.abs(y - 63)));
      if (y === 62) alongRow62 += 1;
    }
  }
  // All of them hug the cross, most along the row above its arm: a separate flattening of the same shading,
  // not a different picture, and still not the one item page with a cross drawn over it.
  assert.deepEqual([off, farthest, alongRow62], [98, 7, 59]);
});

test('a rule picture a colour off is refused at the picture it falls in, and the encoder refuses what the firmware misreads',
     skipUnless('h650_config_region'), () => {
  const wrong = HARMONY_650_PICTURES.map((one) => (one.name === 'corner patch, grey' && one.drawing?.kind === 'fill'
    ? { ...one, drawing: { ...one.drawing, colour: one.drawing.colour + 1 } } : one));
  assert.throws(() => checkPictures(containerOf('h650_config_region'), wrong),
    (error: Error) => error instanceof PictureError && /in corner patch, grey/.test(error.message));
  const wide = Array.from({ length: 2 }, () => new Array<number | undefined>(256).fill(0));
  assert.throws(() => encodeBitmap(wide), /low byte/);
  assert.throws(() => encodeBitmap([[1, 2], [3]]), /stride wide/);
  assert.throws(() => pictureRows({ kind: 'band', width: 4, height: 2, top: 1, rows: [{ inset: 0, end: 0, fill: 0 }, { inset: 0, end: 0, fill: 0 }] }),
    PictureError);
  // A raw picture is every pixel high byte first after the header.
  assert.deepEqual([...encodeBitmap([[0x1234]])], [BITMAP_RAW, 1, 0, 1, 0, 0x12, 0x34]);
});
