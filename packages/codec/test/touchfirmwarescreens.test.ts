/**
 * The Harmony One's ten firmware screens built from a description, `todo-compile-one.md` 4.4.3: what a
 * description of them carries is the configuration's numbering, and the builder generates the rest.
 *
 * **The blind control makes that a test**, as section 357's did for the Harmony 650: every byte of the
 * screens the description does not read is overwritten, in the file the description reads and the fonts
 * are spelled from and in the layout's own pieces, and the sixteen still come back byte for byte. So no
 * byte the builder writes was carried from the screens' own; the description still finds its way through
 * them, which tag is where and how long a list is, through the container's own reading.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { require_, skipUnless } from '@harmony/lab';
import {
  type ContainerPiece, ScreenRecordError, layOutContainer, parse, takeApart,
} from '../src/index.ts';
import {
  buildTouchFirmwareScreens, checkTouchFirmwareScreens, describeTouchFirmwareScreens, withTouchFirmwareScreens,
} from '../src/families/touch/firmwarescreens.ts';

/** The first offset two files differ at, or undefined where they are the same. */
function firstDifference(a: Uint8Array, b: Uint8Array): number | undefined {
  const length = Math.max(a.length, b.length);
  for (let at = 0; at < length; at += 1) if (a[at] !== b[at]) return at;
  return undefined;
}

/** The sixteen English compiles of skin 54, section 405. */
const SKIN_54 = ['harvest_one_two_devices', 'one_spare_after_sync', 'one_spare_myharmony', 'one_spare_20260830',
  'calibration_one', 'calibration_favchannels', 'calibration_favzero', 'compiled_protocols', 'compiled_protocols_2',
  'compiled_protocols_3', 'harvest_one_families_1', 'harvest_one_families_2', 'harvest_one_families_3',
  'one_friend_legacy_sync_config', 'phase7_before', 'phase7_after'] as const;

test('todo-compile-one 4.4.3 and 6.5: the ten firmware screens of the sixteen English Harmony One compiles of skin 54 are rebuilt byte for byte from a description, 196 lists among them, 18 more than before section 418',
     skipUnless(...SKIN_54), () => {
  // 178 the screens' own, section 409, and since `todo-compile-one.md` 6.5 the 18 below them that the wiring does
  // not build, section 418: 16 nothing else reachable runs (three of them, USB Connected's setters, are also called
  // by lists nothing reaches), and the off lists of channel 7 and of the page keys, which the fixed screens and the
  // tour reach too. Seven of the 18 the screens' records bind directly.
  for (const name of SKIN_54) {
    assert.deepEqual(checkTouchFirmwareScreens(parse(require_(name))), { lists: 196, described: 439 }, name);
  }
});

test('todo-compile-one 4.4.3: beyond the sixteen, the European factory file rebuilds, the everyday One\'s compile is refused for a leave handler calling another list, and the Dutch compile for its words',
     skipUnless('one_config', 'one_config_unprogrammed', 'one_friend_asfound_config'), () => {
  assert.deepEqual(checkTouchFirmwareScreens(parse(require_('one_config_unprogrammed'))), { lists: 196, described: 439 });
  assert.throws(() => checkTouchFirmwareScreens(parse(require_('one_config'))),
    (error: Error) => error instanceof ScreenRecordError && /USB Connected's binding of tag 0x7 is list 532, not 64/.test(error.message));
  // Its screens' words are Dutch, and English ones drawn in their place leave the texts other screens name in
  // them with nothing to point at.
  assert.throws(() => checkTouchFirmwareScreens(parse(require_('one_friend_asfound_config'))),
    (error: Error) => error instanceof ScreenRecordError && /a reference names the inside of a replaced structure/.test(error.message));
});

test('todo-compile-one 4.4.3: a blinded input rebuilds all sixteen: no byte the builder writes is taken from the screens\' own bytes',
     skipUnless(...SKIN_54), () => {
  const totals = { structure: 0, described: 0, readAddresses: 0, blinded: 0 };
  for (const name of SKIN_54) {
    const c = parse(require_(name));
    const first = describeTouchFirmwareScreens(c, takeApart(c));
    totals.structure += first.structure.size;
    totals.described += first.described.size;
    totals.readAddresses += [...first.addresses.read].filter((at) => !first.described.has(at)).length;
    // Every byte of the screens the description did not read, overwritten with a byte that differs.
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
    const d = describeTouchFirmwareScreens(c, layout, (at) => blinded[at] as number);
    assert.deepEqual([...d.described].sort((a, b) => a - b), [...first.described].sort((a, b) => a - b), `${name}: reads`);
    // The layout's own pieces blinded too, so nothing kept from them can carry a byte.
    let k = 0;
    for (const at of [...first.structure].sort((a, b) => a - b)) {
      if (first.described.has(at)) continue;
      while (k + 1 < starts.length && (starts[k + 1] as (typeof starts)[number]).at <= at) k += 1;
      const one = starts[k] as { piece: ContainerPiece; at: number };
      one.piece.bytes[at - one.at] = blinded[at] as number;
    }
    // The fonts are spelled from the blinded file, so the screens' own texts cannot spell for it.
    const out = layOutContainer(withTouchFirmwareScreens(layout, buildTouchFirmwareScreens(parse(blinded), d.spec), d.place)).bytes;
    assert.equal(firstDifference(out, c.blob), undefined, `${name} differs`);
    assert.ok([...first.described].every((at) => first.structure.has(at)), `${name}: a read outside the screens`);
  }
  // Per compile the screens are 3099 bytes, section 409, and the 18 lists below them 138 more since
  // `todo-compile-one.md` 6.5, section 418: 439 the description reads, 39 of them the addresses of thirteen
  // pictures and 400 the numbers, the fonts and the hit pages, 38 of those the indices and variables of the lists
  // below; and 2798 the builder writes, every one blinded. No address is read without being described.
  assert.deepEqual(totals, { structure: 16 * 3237, described: 16 * 439, readAddresses: 0, blinded: 16 * 2798 });
});

test('todo-compile-one 4.4.3 and 6.5: a description with one number moved, or a picture swapped, is refused by the byte comparison, and a list below moved to an index the screens do not reach by their placing',
     skipUnless('harvest_one_two_devices'), () => {
  const c = parse(require_('harvest_one_two_devices'));
  const tamper = (change: (spec: ReturnType<typeof describeTouchFirmwareScreens>['spec']) => void): void => {
    const layout = takeApart(c);
    const d = describeTouchFirmwareScreens(c, layout);
    change(d.spec);
    const out = layOutContainer(withTouchFirmwareScreens(layout, buildTouchFirmwareScreens(c, d.spec), d.place)).bytes;
    if (firstDifference(out, c.blob) !== undefined) throw new ScreenRecordError('the rebuilt file differs');
  };
  tamper(() => undefined);
  const moved = /the rebuilt file differs/;
  // Low Battery's enter handler's call of the wiring's on list, its fourth number after the list below's index,
  // its variable and the timer, one list on. Section 409's control moved its first call, which is a list below
  // since section 418, so it moves this one.
  assert.throws(() => tamper((spec) => { (spec.screens[0] as { numbers: number[] }).numbers[3]! += 1; }), moved);
  // That list below one index on: built at an index none of the screens' lists reached in the configuration,
  // so it has no place to go, and the placing refuses it.
  assert.throws(() => tamper((spec) => { (spec.screens[0] as { numbers: number[] }).numbers[0]! += 1; }),
    /is not one the configuration's records run/);
  // The charging problem screen's second picture in place of its first.
  assert.throws(() => tamper((spec) => { const p = (spec.screens[9] as { pictures: unknown[] }).pictures; p.reverse(); }), moved);
});
