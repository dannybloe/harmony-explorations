/**
 * Every text of Logitech's Harmony One compiles spelled from its word, findings section 406, `todo-compile-one.md`
 * 5.1: `describeTouchScreenTexts` reads each text instruction's word, font and place, `buildTouchScreenTexts`
 * spells the word in its font and decides by the first copy rule whether it is drawn inline or by reference,
 * `withScreenTexts` writes it into the compile taken apart, and the compile is laid out again and compared byte for
 * byte. The population is the 18 English compiles; the Dutch one, `one_friend_asfound_config`, is reported on its
 * own, since its words are not English and our letters have neither its é nor its ë.
 *
 * **The blind control** hands the description bytes in which every byte of the texts it does not read is `0xEE`,
 * and a layout whose texts are `0xEE` throughout, so the opcodes, the terminators and every reference's address
 * come from the rules alone. The container the description finds its way through is the compile's own: which
 * instruction is a text, which copy a reference draws, and the fonts and character map are read off it.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { load, skipUnless } from '@harmony/lab';
import { type Container, parse } from '../src/index.ts';
import { type ContainerPiece, layOutContainer, takeApart } from '../src/frame.ts';
import { fontSets, glyphOf } from '../src/font.ts';
import { SCREEN_TEXT_AT, SCREEN_TEXT_INLINE, screenProgram } from '../src/screen.ts';
import { textGlyphs } from '../src/shared/spelling.ts';
import { characterMap } from '../src/text.ts';
import { ScreenTextError, withScreenTexts } from '../src/shared/screentexts.ts';
import {
  TITLE_JOINER, buildTouchScreenTexts, checkTouchScreenTexts, describeTouchScreenTexts, titleJoinerCode, touchCharacterMap,
} from '../src/families/touch/screentexts.ts';

/** `ONE_COMPILES` of `startupassistant.test.ts` without the Dutch `one_friend_asfound_config`. */
const ENGLISH = ['one_config', 'one_config_unprogrammed', 'one_spare_after_sync', 'one_spare_myharmony', 'one_spare_20260830',
  'calibration_one', 'calibration_favchannels', 'calibration_favzero', 'compiled_protocols', 'compiled_protocols_2',
  'compiled_protocols_3', 'harvest_one_two_devices', 'harvest_one_families_1', 'harvest_one_families_2', 'harvest_one_families_3',
  'one_friend_legacy_sync_config', 'phase7_before', 'phase7_after'] as const;
const DUTCH = 'one_friend_asfound_config';
/** The four compiles with no activity, so no start up screen. */
const WITHOUT_ACTIVITIES = new Set(['harvest_one_two_devices', 'harvest_one_families_1', 'harvest_one_families_2', 'harvest_one_families_3']);

const containerOf = (name: string): Container => parse(new Uint8Array(load(name) as Uint8Array));

function firstDifference(a: Uint8Array, b: Uint8Array): number | undefined {
  const length = Math.min(a.length, b.length);
  for (let i = 0; i < length; i += 1) if (a[i] !== b[i]) return i;
  return a.length === b.length ? undefined : length;
}

test('section 406: on the 18 English Harmony One compiles every text instruction of every screen program is spelled from its word in its font and drawn inline or by reference by the first copy rule, and each compile comes back byte for byte',
     skipUnless(...ENGLISH), () => {
  const total = { compiles: 0, inline: 0, references: 0, joined: 0, bytes: 0, unresolved: 0 };
  for (const name of ENGLISH) {
    const c = containerOf(name);
    const checked = checkTouchScreenTexts(c);
    total.compiles += 1;
    total.inline += checked.inline;
    total.references += checked.references;
    total.joined += checked.joined;
    total.bytes += checked.bytes;
    total.unresolved += checked.unresolved;
  }
  // 33907 draws, 9674 of them inline; no code goes unread, so no text keeps its codes.
  assert.deepEqual(total, { compiles: 18, inline: 9674, references: 24233, joined: 63, bytes: 279701, unresolved: 0 });
});

test('section 406: a Harmony One start up title joins "Starting" and the name with a blank of its own, held by the title\'s set alone and a pixel wider than the space there, which a character map reading it as a space spells wrong in 126 draws and nowhere else',
     skipUnless(...ENGLISH), () => {
  const tally = { withJoiner: 0, withoutJoiner: 0, titles: 0, titleDraws: 0, plainDiffers: 0, plainDiffersElsewhere: 0 };
  for (const name of ENGLISH) {
    const c = containerOf(name);
    const plain = characterMap(c)!;
    const joiner = titleJoinerCode(c, plain);
    if (joiner === undefined) {
      tally.withoutJoiner += 1;
      assert.ok(WITHOUT_ACTIVITIES.has(name), name);
      continue;
    }
    tally.withJoiner += 1;
    const sets = fontSets(c)!;
    const space = [...plain.codes].find(([code, ch]) => ch === ' ' && code !== joiner)![0];
    const holders = sets.flatMap((set, k) => (glyphOf(c, set, joiner) === undefined ? [] : [k]));
    assert.equal(holders.length, 1, name);
    const titleSet = sets[holders[0]!]!;
    assert.deepEqual([glyphOf(c, titleSet, joiner)!.width, glyphOf(c, titleSet, space)!.width], [4, 3], name);
    const d = describeTouchScreenTexts(c, takeApart(c));
    // Every text drawing the joiner is a start up title: "Starting", the joiner, a name, at the title's height.
    d.texts.forEach((one, k) => {
      if (!one.word.includes(TITLE_JOINER)) return;
      tally.titleDraws += 1;
      assert.equal(one.font, holders[0], name);
      assert.match(one.word, new RegExp(`^Starting${TITLE_JOINER}[^${TITLE_JOINER}]+$`, 'u'), name);
      assert.equal(one.y, 124, name);
      if (c.blob[d.draws[k]!] === SCREEN_TEXT_INLINE) tally.titles += 1;
    });
    // The control: spelled through the character map as read, the joiner comes back as the space.
    const plainBuilt = buildTouchScreenTexts(d.texts.map((one) => ({ ...one, word: one.word.replaceAll(TITLE_JOINER, ' ') })), c, plain);
    d.draws.forEach((at, k) => {
      const theirs = [...textGlyphs(c, screenProgram(c, c.flashBase + at)![0]!)!].join(',');
      if (theirs === plainBuilt.draws[k]!.codes.join(',')) return;
      tally.plainDiffers += 1;
      if (!d.texts[k]!.word.includes(TITLE_JOINER)) tally.plainDiffersElsewhere += 1;
    });
  }
  assert.deepEqual(tally, { withJoiner: 14, withoutJoiner: 4, titles: 63, titleDraws: 126, plainDiffers: 126, plainDiffersElsewhere: 0 });
});

test('section 406: blinded to every byte of the texts it does not read, the opcodes, terminators and reference addresses, the description still rebuilds the 18 English compiles byte for byte',
     skipUnless(...ENGLISH), () => {
  const tally = { structure: 0, read: 0, blinded: 0, changed: 0, unchangedInAddresses: 0 };
  for (const name of ENGLISH) {
    const c = containerOf(name);
    const first = describeTouchScreenTexts(c, takeApart(c));
    const addressBytes = new Set<number>();
    for (const at of first.draws) if (c.blob[at] === SCREEN_TEXT_AT) for (let k = 3; k < 6; k += 1) addressBytes.add(at + k);
    const blinded = c.blob.slice();
    for (const at of first.structure) {
      if (first.described.has(at)) continue;
      tally.blinded += 1;
      if (blinded[at] !== 0xee) tally.changed += 1;
      else if (addressBytes.has(at)) tally.unchangedInAddresses += 1;
      blinded[at] = 0xee;
    }
    // The layout's pieces blinded over every byte of the texts, read or not.
    const layout = takeApart(c);
    const laid = layOutContainer(layout);
    const pieces = [layout.keyTable, ...layout.body,
      ...layout.sections.flatMap((s) => (s === undefined ? [] : [...s.before, ...s.head])), ...layout.pictures];
    const starts = pieces.map((piece) => ({ piece, at: laid.offsetOf(piece) as number })).sort((a, b) => a.at - b.at);
    let k = 0;
    for (const at of [...first.structure].sort((a, b) => a - b)) {
      while (k + 1 < starts.length && starts[k + 1]!.at <= at) k += 1;
      const one = starts[k] as { piece: ContainerPiece; at: number };
      one.piece.bytes[at - one.at] = 0xee;
    }
    const d = describeTouchScreenTexts(c, layout, (at) => blinded[at] as number);
    assert.deepEqual([...d.described].sort((a, b) => a - b), [...first.described].sort((a, b) => a - b), `${name}: reads`);
    assert.ok([...first.described].every((at) => first.structure.has(at)), `${name}: a read outside the texts`);
    const out = layOutContainer(withScreenTexts(layout, buildTouchScreenTexts(d.texts, c), d.place)).bytes;
    assert.equal(firstDifference(out, c.blob), undefined, `${name} differs`);
    tally.structure += first.structure.size;
    tally.read += first.described.size;
  }
  // Read: every inline text's codes, a reference's copy's codes, and every place.
  // 116280 bytes blinded, all but 52 of them something else first; those 52 are bytes of a reference's address
  // field, which the frame writes whatever a piece holds there.
  assert.deepEqual(tally, { structure: 279701, read: 163421, blinded: 116280, changed: 116228, unchangedInAddresses: 52 });
});

test('section 406: checkTouchScreenTexts refuses a Harmony One compile with a reference pointed one code into its copy',
     skipUnless('calibration_one'), () => {
  const c = containerOf('calibration_one');
  const d = describeTouchScreenTexts(c, takeApart(c));
  // The first reference whose copy is longer than one code, pointed past that copy's first code.
  const at = d.draws.find((one) => c.blob[one] === SCREEN_TEXT_AT
    && (textGlyphs(c, screenProgram(c, c.flashBase + one)![0]!)?.length ?? 0) > 1)!;
  const bytes = c.blob.slice();
  const address = (bytes[at + 3]! | (bytes[at + 4]! << 8) | (bytes[at + 5]! << 16)) + 1;
  bytes[at + 3] = address & 0xff;
  bytes[at + 4] = (address >> 8) & 0xff;
  bytes[at + 5] = address >> 16;
  const edited = parse(bytes);
  assert.throws(() => checkTouchScreenTexts(edited),
    (error: Error) => error instanceof ScreenTextError && /is drawn by reference where it is built inline/.test(error.message));
});

test('section 406: the Dutch Harmony One compile comes back byte for byte too, its start up title joined after "Bezig met starten" and its é and ë spelled in Logitech\'s own letters',
     skipUnless(DUTCH), () => {
  const c = containerOf(DUTCH);
  assert.deepEqual(checkTouchScreenTexts(c), { inline: 389, references: 679, joined: 1, bytes: 10078, unresolved: 0 });
  const d = describeTouchScreenTexts(c, takeApart(c), undefined, touchCharacterMap(c));
  const titles = d.texts.filter((one) => one.word.includes(TITLE_JOINER)).map((one) => one.word.replace(TITLE_JOINER, '|'));
  assert.deepEqual(titles, ['Bezig met starten|TV kijken', 'Bezig met starten|TV kijken']);
  const accented = d.texts.filter((one) => /[éë]/u.test(one.word)).map((one) => one.word);
  assert.deepEqual(accented, ['beëindigd', 'zodat u met één druk op', 'U kunt nu met één druk de']);
});
